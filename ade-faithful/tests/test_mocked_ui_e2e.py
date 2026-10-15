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
        if path == f"/v1/agents/{AGENT_ID}/messages" and method == "GET":
            return self._json(route, self.messages)
        if path == f"/v1/agents/{AGENT_ID}/messages" and method == "POST":
            body = json.loads(request.post_data or "{}")
            self.posts.append(body)
            self.messages.append({"id": "u9", "message_type": "user_message", "content": body.get("input", "")})
            self.messages.append({"id": "a9", "message_type": "assistant_message", "content": "pong"})
            sse = 'data: {"message_type":"assistant_message","content":"pong"}\n\ndata: [DONE]\n\n'
            return route.fulfill(status=200, headers={"content-type": "text/event-stream"}, body=sse)
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
