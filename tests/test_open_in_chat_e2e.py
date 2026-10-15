"""E2E: Agents → agent detail → Open in Chat lands on chat with agent selected."""
from __future__ import annotations

import os

import pytest

BASE = os.environ.get("ADE_SMOKE_BASE", "http://127.0.0.1:5055").rstrip("/")
API_BASE = os.environ.get("ADE_E2E_API_BASE", "")  # e.g. https://ade.sanctumos.org/proxy.php
API_KEY = os.environ.get("ADE_E2E_API_KEY", "")


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "viewport": {"width": 1280, "height": 800}}


def _seed_auth(page):
    if not API_BASE or not API_KEY:
        pytest.skip("Set ADE_E2E_API_BASE + ADE_E2E_API_KEY for live Open-in-Chat E2E")
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    page.evaluate(
        """([base, key]) => {
          localStorage.setItem('ade_faithful_base', base);
          localStorage.setItem('ade_faithful_key', key);
        }""",
        [API_BASE, API_KEY],
    )


def test_agent_page_js_parses(page):
    """Regression: curly quotes previously SyntaxError'd the whole agent-page.js."""
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(f"{BASE}/agent.html?id=missing-but-js-must-load", wait_until="networkidle")
    page.wait_for_timeout(500)
    bad = [e for e in errs if "SyntaxError" in e or "Unexpected token" in e]
    assert not bad, bad
    # Even without a real agent, chat link wiring runs only when id present —
    # here id=missing… so editor hidden; still no parse errors.
    assert page.locator("#chat-link").count() == 1


def test_open_in_chat_navigates_with_agent(page):
    _seed_auth(page)
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    page.goto(f"{BASE}/agents.html", wait_until="networkidle")
    page.wait_for_selector('a[href*="agent.html?id="]', timeout=30000)
    playground = os.environ.get("ADE_PLAYGROUND_AGENT_ID", "")
    sel = f'a[href*="agent.html?id={playground}"]' if playground else 'a[href*="agent.html?id="]'
    first = page.locator(sel).first
    agent_href = first.get_attribute("href") or ""
    assert "agent.html?id=" in agent_href
    first.click()
    page.wait_for_url("**/agent.html?id=**", timeout=15000)
    page.wait_for_timeout(800)

    assert not any("SyntaxError" in e for e in page_errors), page_errors

    chat = page.locator("#chat-link")
    href = chat.get_attribute("href") or ""
    assert "chat.html" in href, f"Open in Chat still broken href={href!r}"
    assert href != "#", "Open in Chat href left as #"
    assert "agent=" in href, f"expected ?agent= in href, got {href!r}"

    chat.click()
    page.wait_for_url("**/chat.html**", timeout=15000)
    page.wait_for_timeout(1500)

    assert "chat.html" in page.url
    sel = page.locator("#ade-agent-select")
    assert sel.count() == 1
    value = sel.input_value()
    assert value, "active agent select empty after Open in Chat"
    # agent id from link should match select
    from urllib.parse import parse_qs, urlparse

    q = parse_qs(urlparse(page.url).query)
    if "agent" in q:
        assert value == q["agent"][0]

    # Chat chrome present (composer + thread)
    assert page.locator("#messages").count() == 1
    assert page.locator("#send-form").count() == 1
    assert page.locator("#input").count() == 1
