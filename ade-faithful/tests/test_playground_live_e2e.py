"""Live E2E against the real Letta server — ONLY on an agent tagged `ade-playground`.

Env: ADE_E2E_API_KEY, ADE_PLAYGROUND_AGENT_ID (and optionally ADE_E2E_UPSTREAM).
The local tree is served by the smoke server; /proxy.php calls are forwarded to the live proxy.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request

import pytest

BASE = os.environ.get("ADE_SMOKE_BASE", "http://127.0.0.1:5055").rstrip("/")
UPSTREAM = os.environ.get("ADE_E2E_UPSTREAM", "https://ade.sanctumos.org/proxy.php")
KEY = os.environ.get("ADE_E2E_API_KEY", "")
AGENT_ID = os.environ.get("ADE_PLAYGROUND_AGENT_ID", "")

pytestmark = pytest.mark.skipif(not (KEY and AGENT_ID), reason="set ADE_E2E_API_KEY + ADE_PLAYGROUND_AGENT_ID")


def api(path: str):
    req = urllib.request.Request(
        UPSTREAM + "?path=" + urllib.parse.quote(path, safe=""),
        headers={"Authorization": "Bearer " + KEY},
    )
    return json.load(urllib.request.urlopen(req, timeout=60))


@pytest.fixture(scope="module")
def playground():
    agent = api(f"/v1/agents/{AGENT_ID}?include=agent.tags")
    if "ade-playground" not in (agent.get("tags") or []):
        pytest.fail(f"refusing to run live writes: {agent.get('name')} is not tagged ade-playground")
    return agent


def _tool_ids() -> list[str]:
    return sorted(t["id"] for t in api(f"/v1/agents/{AGENT_ID}/tools?limit=1000"))


def _boot(page):
    def forward(route, request):
        q = request.url.split("proxy.php", 1)[1]
        route.fulfill(response=route.fetch(url=UPSTREAM + q))

    page.route("**/proxy.php*", forward)
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    page.evaluate(
        "([b,k]) => { localStorage.setItem('ade_faithful_base', b); localStorage.setItem('ade_faithful_key', k); }",
        [f"{BASE}/proxy.php", KEY],
    )


def test_live_save_preserves_tools_and_model(page, playground):
    before_tools = _tool_ids()
    before_model = (playground.get("llm_config") or {}).get("handle") or playground.get("model")
    assert len(before_tools) > 10, "playground needs >10 tools to exercise pagination"
    _boot(page)
    page.goto(f"{BASE}/agent.html?id={AGENT_ID}", wait_until="networkidle")
    page.wait_for_function("() => !document.querySelector('#agent-sub .af-badge-tools').textContent.includes('…')")
    assert page.locator("#agent-sub .af-badge-tools").inner_text() == f"{len(before_tools)} tools"
    with page.expect_response(lambda r: "proxy.php" in r.url and r.request.method == "PATCH") as resp:
        page.locator('[data-pane="general"] .ade-save-config').click()
    assert resp.value.ok, resp.value.text()
    assert _tool_ids() == before_tools
    after = api(f"/v1/agents/{AGENT_ID}?include=agent.tags")
    assert ((after.get("llm_config") or {}).get("handle") or after.get("model")) == before_model
    assert after.get("llm_config") == playground.get("llm_config")
    assert after.get("system") == playground.get("system")
    assert sorted(after.get("tags") or []) == sorted(playground.get("tags") or [])


def test_live_chat_round_trip(page, playground):
    _boot(page)
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/chat.html?agent={AGENT_ID}", wait_until="networkidle")
    page.wait_for_function("() => document.getElementById('chat-agent-name').textContent === 'ADE Playground'")
    before = page.locator("#messages .chat-turn--assistant").count()
    page.fill("#input", "Reply with exactly one word: pong")
    page.press("#input", "Enter")
    page.wait_for_function(
        f"() => document.querySelectorAll('#messages .chat-turn--assistant').length > {before} "
        "&& !document.querySelector('#messages .chat-shimmer') && !document.getElementById('send-btn').disabled",
        timeout=120000,
    )
    last = page.locator("#messages .chat-turn--assistant").last.inner_text()
    assert last.strip(), "empty assistant reply"
    assert not errors, errors
