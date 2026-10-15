"""Mocked-API E2E: agent Save keeps tools, chat lanes render, Enter sends.

Every /proxy.php call is fulfilled in Playwright — no real Letta agent is read or written.
"""
from __future__ import annotations

import json
import os
from urllib.parse import parse_qs, urlparse

import pytest

BASE = os.environ.get("ADE_SMOKE_BASE", "http://127.0.0.1:5055").rstrip("/")
AGENT_ID = "agent-test-1"
AGENT = {
    "id": AGENT_ID,
    "name": "Test Agent",
    "system": "be helpful",
    "llm_config": {"handle": "openai-proxy/legacy-model", "model": "legacy-model", "temperature": 0.5},
    "tools": [],
    "tool_ids": [],
}
# Like the real server: agent tools page at 10 by default, the directory at 50.
DIRECTORY = [{"id": f"tool-{i:03d}", "name": f"tool_{i:03d}"} for i in range(60)]
AGENT_TOOLS = [DIRECTORY[i] for i in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 55, 58)] + [{"id": "tool-zz", "name": "offlist"}]
REMINDER = "<system-reminder>\nYou are a sleeptime agent.\n" + ("transcript " * 50)


class MockLetta:
    def __init__(self, agent_tools_ok: bool = True):
        self.agent_tools_ok = agent_tools_ok
        self.patches: list[dict] = []
        self.posts: list[dict] = []
        self.stream_runs: list[str] = []
        self.active_runs: list[dict] = []
        self.active_polls = 0
        self.messages = [
            {"id": "m1", "message_type": "user_message", "content": REMINDER},
            {"id": "m2", "message_type": "user_message", "content": "hello there"},
            {"id": "m3", "message_type": "reasoning_message", "reasoning": "thinking about it", "source": "reasoner_model"},
            {
                "id": "m3b",
                "message_type": "tool_call_message",
                "tool_call": {"name": "memory", "arguments": "{}", "tool_call_id": "call-1"},
                "tool_calls": [{"name": "memory", "arguments": "{}", "tool_call_id": "call-1"}],
            },
            {
                "id": "m3c",
                "message_type": "tool_return_message",
                "tool_call_id": "call-1",
                "status": "success",
                "tool_return": {"ok": True},
            },
            {"id": "m4", "message_type": "assistant_message", "content": "**Hi** back"},
        ]
        self.blocks = [
            {
                "id": "block-persona",
                "label": "persona",
                "value": "I am a test agent.",
                "limit": 2000,
                "description": "Persona block",
                "read_only": False,
            },
            {
                "id": "block-human",
                "label": "human",
                "value": "Tester",
                "limit": 2000,
                "read_only": False,
            },
            {
                "id": "block-broca",
                "label": "system_recent_context",
                "value": "Attached by Broca mid-stream.",
                "limit": 5000,
                "read_only": True,
            },
        ]
        self.context = {
            "context_window_size_max": 32000,
            "context_window_size_current": 4800,
            "num_tokens_system": 120,
            "num_tokens_functions_definitions": 800,
            "num_tokens_external_memory_summary": 40,
            "num_tokens_core_memory": 900,
            "num_tokens_summary_memory": 0,
            "num_tokens_messages": 2940,
            "num_messages": 6,
            "system_prompt": "be helpful",
            "core_memory": "<memory_blocks/>",
            "external_memory_summary": "",
            "summary_memory": None,
            "functions_definitions": [],
            "messages": [],
        }

    def handle(self, route, request):
        full = parse_qs(urlparse(request.url).query).get("path", [""])[0]
        path, _, inner_q = full.partition("?")
        limit = parse_qs(inner_q).get("limit", [None])[0]
        method = request.method
        if path.rstrip("/") == "/v1/agents" and method == "GET":
            return self._json(route, [AGENT])
        if path == f"/v1/agents/{AGENT_ID}" and method == "GET":
            return self._json(route, AGENT)
        if path == f"/v1/agents/{AGENT_ID}" and method == "PATCH":
            body = json.loads(request.post_data or "{}")
            self.patches.append(body)
            return self._json(route, {**AGENT, **body})
        if path == f"/v1/agents/{AGENT_ID}/tools":
            if not self.agent_tools_ok:
                return route.fulfill(status=500, body="boom")
            return self._json(route, AGENT_TOOLS[: int(limit or 10)])
        if path.rstrip("/") == "/v1/tools":
            return self._json(route, DIRECTORY[: int(limit or 50)])
        if path.rstrip("/") == "/v1/models":
            return self._json(route, [{"handle": "openai-proxy/other-model"}])
        if path.rstrip("/") == "/v1/runs/active" and method == "GET":
            self.active_polls += 1
            return self._json(route, list(self.active_runs))
        if path.startswith("/v1/runs/") and path.endswith("/stream") and method == "POST":
            run_id = path[len("/v1/runs/") : -len("/stream")]
            self.stream_runs.append(run_id)
            self.active_runs = [r for r in self.active_runs if r.get("id") != run_id]
            self.messages.append(
                {"id": "ext-user", "message_type": "user_message", "content": "from broca"}
            )
            self.messages.append(
                {"id": "ext-asst", "message_type": "assistant_message", "content": "external pong"}
            )
            sse = (
                'data: {"message_type":"assistant_message","content":"external pong"}\n\n'
                "data: [DONE]\n\n"
            )
            return route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body=sse)
        if path == f"/v1/agents/{AGENT_ID}/messages" and method == "GET":
            return self._json(route, self.messages)
        if path == f"/v1/agents/{AGENT_ID}/messages" and method == "POST":
            body = json.loads(request.post_data or "{}")
            self.posts.append(body)
            self.messages.append({"id": "u9", "message_type": "user_message", "content": body.get("input", "")})
            self.messages.append({"id": "a9", "message_type": "assistant_message", "content": "pong"})
            sse = 'data: {"message_type":"assistant_message","content":"pong"}\n\ndata: [DONE]\n\n'
            return route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body=sse)
        if path.rstrip("/") in (
            f"/v1/agents/{AGENT_ID}/core-memory/blocks",
            f"/v1/agents/{AGENT_ID}/core-memory/blocks/",
        ) and method == "GET":
            return self._json(route, self.blocks)
        if path == f"/v1/agents/{AGENT_ID}/context" and method == "GET":
            return self._json(route, self.context)
        return self._json(route, [])

    @staticmethod
    def _json(route, data):
        return route.fulfill(status=200, headers={"content-type": "application/json"}, body=json.dumps(data))


def _boot(page, mock: MockLetta):
    page.route("**/proxy.php*", mock.handle)
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    page.evaluate(
        "([b]) => { localStorage.setItem('ade_faithful_base', b); localStorage.setItem('ade_faithful_key', 'test-key'); }",
        [f"{BASE}/proxy.php"],
    )


def _wait_tools_mounted(page):
    page.wait_for_selector("input[name=tool]", state="attached", timeout=15000)
    page.wait_for_function("() => !document.querySelector('#agent-sub .af-badge-tools').textContent.includes('…')")


def test_save_keeps_attached_tools_and_current_model(page):
    mock = MockLetta()
    _boot(page, mock)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/agent.html?id={AGENT_ID}", wait_until="networkidle")
    _wait_tools_mounted(page)
    assert page.locator("#model").input_value() == "openai-proxy/legacy-model"
    assert page.locator("#agent-sub .af-badge-tools").inner_text() == "15 tools"
    assert page.locator("input[name=tool]").count() == 60, "directory truncated"
    assert page.locator("input[name=tool][value=tool-058]").is_checked()
    assert not page.locator("input[name=tool][value=tool-020]").is_checked()
    page.locator('[data-pane="general"] .ade-save-config').click()
    page.wait_for_function("() => true")
    page.wait_for_timeout(500)
    assert mock.patches, "Save did not PATCH"
    assert sorted(mock.patches[-1]["tool_ids"]) == sorted(t["id"] for t in AGENT_TOOLS), mock.patches[-1]
    assert mock.patches[-1]["model"] == "openai-proxy/legacy-model"
    assert not errors, errors


def test_save_omits_tools_when_agent_tools_unavailable(page):
    mock = MockLetta(agent_tools_ok=False)
    _boot(page, mock)
    page.goto(f"{BASE}/agent.html?id={AGENT_ID}", wait_until="networkidle")
    page.wait_for_selector("input[name=tool]", state="attached", timeout=15000)
    page.wait_for_timeout(300)
    page.locator('[data-pane="general"] .ade-save-config').click()
    page.wait_for_timeout(500)
    assert mock.patches, "Save did not PATCH"
    assert "tool_ids" not in mock.patches[-1], mock.patches[-1]


def test_chat_lanes_and_enter_to_send(page):
    mock = MockLetta()
    _boot(page, mock)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/chat.html?agent={AGENT_ID}", wait_until="networkidle")
    page.wait_for_selector("#messages .chat-row--assistant", timeout=15000)

    assert page.locator("#chat-agent-name").inner_text() == "Test Agent"
    internal = page.locator("#messages .chat-turn--internal")
    assert internal.count() == 1
    assert not internal.locator("details").evaluate("d => d.open")
    user_text = page.locator("#messages .chat-turn--user").all_inner_texts()
    assert user_text == ["hello there"], user_text
    assert page.locator("#messages .chat-turn--reasoning.chat-step").count() == 1
    assert page.locator("#messages .chat-row--assistant .af-avatar").count() == 1
    # Tool return is merged into the call card; no standalone tool-return row.
    call_card = page.locator("#messages .chat-turn--tool-call")
    assert call_card.locator(".chat-tool-meta").count() == 2, "call meta + merged result meta"
    assert call_card.locator(".chat-tool-status--ok").count() == 1, "success status pill on merged result"
    assert page.locator("#messages .chat-turn--tool-return").count() == 0, "standalone tool return not folded in"
    # Hover toolbar on message rows.
    assert page.locator("#messages .chat-row--user .chat-msg-toolbar").count() == 1
    assert page.locator("#messages .chat-row--assistant .chat-msg-toolbar").count() >= 1

    page.fill("#input", "ping")
    page.press("#input", "Enter")
    page.wait_for_function(
        "() => [...document.querySelectorAll('#messages .chat-turn--assistant')].some(e => e.innerText.includes('pong'))",
        timeout=15000,
    )
    assert mock.posts and mock.posts[0]["input"] == "ping"
    assert page.locator("#input").input_value() == ""
    assert not errors, errors


def test_shift_enter_does_not_send(page):
    mock = MockLetta()
    _boot(page, mock)
    page.goto(f"{BASE}/chat.html?agent={AGENT_ID}", wait_until="networkidle")
    page.wait_for_selector("#messages .chat-row--assistant", timeout=15000)
    page.fill("#input", "line one")
    page.press("#input", "Shift+Enter")
    page.wait_for_timeout(300)
    assert not mock.posts
    assert "\n" in page.locator("#input").input_value()


def test_chat_hitches_external_active_run(page):
    """Broca-style: an outside client starts a run; chat polls /runs/active and hitch-streams it."""
    mock = MockLetta()
    _boot(page, mock)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/chat.html?agent={AGENT_ID}", wait_until="networkidle")
    page.wait_for_selector("#messages .chat-row--assistant", timeout=15000)
    # Wait for prime poll so a pre-existing run would be ignored; then introduce a NEW run.
    page.wait_for_timeout(100)
    deadline = page.evaluate("() => Date.now()") + 8000
    while mock.active_polls < 1:
        page.wait_for_timeout(100)
        if page.evaluate("() => Date.now()") > deadline:
            break
    assert mock.active_polls >= 1, "chat sync never primed /runs/active"

    mock.active_runs = [{
        "id": "run-ext-1",
        "status": "running",
        "agent_id": AGENT_ID,
        "created_at": "2099-01-01T00:00:00Z",
    }]
    page.wait_for_function(
        "() => [...document.querySelectorAll('#messages .chat-turn--assistant')]"
        ".some(e => e.innerText.includes('external pong'))",
        timeout=15000,
    )
    assert mock.stream_runs == ["run-ext-1"], mock.stream_runs
    # History reconcile after hitch is async — wait for the paired user row.
    page.wait_for_function(
        "() => [...document.querySelectorAll('#messages .chat-turn--user')]"
        ".some(e => e.innerText.includes('from broca'))",
        timeout=10000,
    )
    assert not errors, errors


def test_chat_ignores_stale_active_runs_present_at_open(page):
    """Zombie 'active' runs already on the agent must not hitch-loop / blink the chat."""
    mock = MockLetta()
    mock.active_runs = [
        {"id": f"run-old-{i}", "status": "running", "agent_id": AGENT_ID,
         "created_at": "2020-01-01T00:00:00Z"}
        for i in range(5)
    ]
    _boot(page, mock)
    page.goto(f"{BASE}/chat.html?agent={AGENT_ID}", wait_until="networkidle")
    page.wait_for_selector("#messages .chat-row--assistant", timeout=15000)
    page.wait_for_timeout(3500)
    assert mock.stream_runs == [], mock.stream_runs
    assert page.locator("#messages .chat-shimmer").count() == 0


def test_chat_context_bar_and_memory_panel(page):
    """Context usage bar + collapsible core-memory sidebar (Broca attach/detach surface)."""
    mock = MockLetta()
    _boot(page, mock)
    page.evaluate("() => localStorage.removeItem('af-chat-memory-open')")
    page.goto(f"{BASE}/chat.html?agent={AGENT_ID}", wait_until="networkidle")
    page.wait_for_selector("#chat-context-bar .chat-ctx-track", timeout=15000)
    bar = page.locator("#chat-context-bar").inner_text().lower()
    assert "context window" in bar
    assert "85% free" in bar or "free" in bar
    assert page.locator("#chat-context-bar .chat-ctx-seg").count() >= 3
    # Legend removed — segment details use shared ADE_TIP floating bubble (CPH pattern).
    assert page.locator("#chat-context-bar .chat-ctx-legend").count() == 0
    assert page.locator("#chat-context-bar .af-tip-btn").count() >= 1
    msg_seg = page.locator('#chat-context-bar .chat-ctx-seg[data-ctx-label*="Messages"]')
    assert msg_seg.count() == 1
    msg_seg.click()
    tip = page.locator("#af-tip-float")
    tip.wait_for(state="visible", timeout=3000)
    assert "af-tip-fixed" in (tip.get_attribute("class") or "")
    tip_text = tip.inner_text()
    assert "Messages" in tip_text
    assert "%" in tip_text
    # Click outside closes (CPH pattern).
    page.locator(".chat-header-name").click()
    assert tip.is_hidden()
    # "?" tip on Memory blocks (shared ADE_TIP / CPH pattern).
    page.locator(".chat-memory-title .af-tip-btn").click()
    mem_tip = page.locator("#af-tip-chat-memory")
    mem_tip.wait_for(state="visible", timeout=3000)
    assert "af-tip-fixed" in (mem_tip.get_attribute("class") or "")
    assert "Broca" in mem_tip.inner_text()
    assert page.locator("#chat-memory-panel").is_visible()
    assert page.locator("#chat-memory-count").inner_text() == "3"
    assert page.locator('.chat-memory-card[data-label="persona"]').count() == 1
    assert page.locator('.chat-memory-card[data-label="system_recent_context"]').count() == 1
    # Live attach: Broca adds a block; bump refreshes the panel (same path as the 4s poll).
    mock.blocks.append(
        {
            "id": "block-new",
            "label": "broca_ephemeral",
            "value": "just attached",
            "limit": 1000,
            "read_only": False,
        }
    )
    page.evaluate("() => window.ADE_CHAT_SIDECAR.bump()")
    page.wait_for_function(
        "() => document.getElementById('chat-memory-count').textContent === '4'",
        timeout=8000,
    )
    # Panel is on the right of the chat (official ADE placement).
    assert page.evaluate(
        """() => {
          const ws = document.querySelector('.chat-workspace');
          const panel = document.getElementById('chat-memory-panel');
          const body = document.querySelector('.chat-body');
          return ws && panel && body && panel.previousElementSibling === body;
        }"""
    )
    # No header hamburger for memory — collapse lives on the panel (like left nav).
    assert page.locator("#chat-memory-toggle").count() == 0
    assert page.locator("#chat-memory-collapse").count() == 1
    wide = page.evaluate(
        "() => document.getElementById('chat-memory-panel').getBoundingClientRect().width"
    )
    page.locator("#chat-memory-collapse").click()
    assert page.locator("html").get_attribute("data-chat-memory") == "closed"
    assert page.evaluate("() => localStorage.getItem('af-chat-memory-open')") == "0"
    # Collapses to an icon rail (still visible), not display:none.
    assert page.locator("#chat-memory-panel").is_visible()
    page.wait_for_function(
        "() => document.getElementById('chat-memory-panel').getBoundingClientRect().width < 80",
        timeout=3000,
    )
    narrow = page.evaluate(
        "() => document.getElementById('chat-memory-panel').getBoundingClientRect().width"
    )
    assert narrow < 80 and narrow < wide
    page.locator("#chat-memory-collapse").click()
    assert page.locator("html").get_attribute("data-chat-memory") == "open"
    page.wait_for_function(
        "() => document.getElementById('chat-memory-panel').getBoundingClientRect().width > 200",
        timeout=3000,
    )
    # Toggle again (must not double-bind / no-op).
    page.locator("#chat-memory-collapse").click()
    assert page.locator("html").get_attribute("data-chat-memory") == "closed"
    page.wait_for_function(
        "() => document.getElementById('chat-memory-panel').getBoundingClientRect().width < 80",
        timeout=3000,
    )
