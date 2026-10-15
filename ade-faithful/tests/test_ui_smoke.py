"""Playwright smoke for ade-faithful (static, no CDN Bootstrap)."""
from __future__ import annotations

import os
import re

import pytest

BASE = os.environ.get("ADE_SMOKE_BASE", "http://127.0.0.1:5055").rstrip("/")

PAGES = [
    "index.html",
    "agents.html",
    "chat.html",
    "tools.html",
    "mcp.html",
    "settings.html",
]


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "viewport": {"width": 1280, "height": 800}}


@pytest.mark.parametrize("page_name", PAGES)
def test_page_loads_no_cdn_bootstrap(page, page_name):
    failed = []

    def on_request(req):
        url = req.url
        if "cdn.jsdelivr.net" in url or "cdnjs.cloudflare.com" in url:
            failed.append(url)

    page.on("request", on_request)
    page.goto(f"{BASE}/{page_name}", wait_until="domcontentloaded", timeout=30000)
    assert page.locator(".af-sidebar").count() >= 1
    links = page.eval_on_selector_all("link[rel=stylesheet]", "els => els.map(e => e.href)")
    assert not any("bootstrap" in (h or "").lower() for h in links)
    assert not any("cdn.jsdelivr" in (h or "").lower() for h in links)
    assert not failed, f"CDN requests forbidden: {failed}"


def test_settings_and_shell_brand(page):
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    brand = page.locator(".af-brand-sub").inner_text()
    assert "self-hosted" in brand.lower()
    page.fill("#base", "http://127.0.0.1:5055/api")
    page.click("button[type=submit]")


def test_af_tips_cph_pattern(page):
    """Shared ADE_TIP "?" bubbles portal to body like HMG CPH."""
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    assert page.evaluate("() => typeof window.ADE_TIP === 'object' && !!window.ADE_TIP.markup")
    assert page.locator(".af-tip-btn").count() >= 3
    assert page.locator("#af-tip-settings-base").count() == 1
    btn = page.locator('button.af-tip-btn[aria-controls="af-tip-settings-base"]')
    btn.click()
    tip = page.locator("#af-tip-settings-base")
    tip.wait_for(state="visible", timeout=3000)
    assert tip.evaluate("e => e.parentElement === document.body")
    assert "af-tip-fixed" in (tip.get_attribute("class") or "")
    assert "Letta" in tip.inner_text() or "proxy" in tip.inner_text().lower()
    page.locator("h1").click()
    assert tip.is_hidden()
    # Sidebar tip after shell inject
    page.locator('button.af-tip-btn[aria-controls="af-tip-sidebar-agent"]').click()
    side = page.locator("#af-tip-sidebar-agent")
    side.wait_for(state="visible", timeout=3000)
    assert "af-tip-fixed" in (side.get_attribute("class") or "")


def test_skin_picker_applies_data_skin_comp(page):
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    assert page.locator("html").get_attribute("data-skin-comp") in {
        "hey",
        "ledger",
        "brutalist",
        "obsidian",
    }
    assert page.locator("#ade-skin-select").count() == 0, "skin lives under Settings only"
    page.locator('.af-skin-card[data-slug="obsidian"]').click()
    assert page.locator("html").get_attribute("data-skin-comp") == "obsidian"
    page.goto(f"{BASE}/chat.html", wait_until="domcontentloaded")
    assert page.locator("html").get_attribute("data-skin-comp") == "obsidian"
    assert page.locator("#ade-skin-select").count() == 0
    page.goto(f"{BASE}/settings.html", wait_until="domcontentloaded")
    page.locator('.af-skin-card[data-slug="hey"]').click()
    assert page.locator("html").get_attribute("data-skin-comp") == "hey"


def test_sidebar_collapse_persists(page):
    page.goto(f"{BASE}/index.html", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('af-sidebar-collapsed')")
    page.reload(wait_until="domcontentloaded")
    assert page.locator("html").get_attribute("data-sidebar-collapsed") in (None, "")
    btn = page.locator("#sidebar-collapse")
    assert btn.count() == 1
    assert btn.is_visible()
    btn.click()
    assert page.locator("html").get_attribute("data-sidebar-collapsed") == "1"
    assert page.evaluate("() => localStorage.getItem('af-sidebar-collapsed')") == "1"
    page.wait_for_function(
        "() => document.querySelector('.af-sidebar').getBoundingClientRect().width < 80",
        timeout=3000,
    )
    page.goto(f"{BASE}/chat.html", wait_until="domcontentloaded")
    assert page.locator("html").get_attribute("data-sidebar-collapsed") == "1"
    page.locator("#sidebar-collapse").click()
    page.wait_for_function(
        "() => !document.documentElement.getAttribute('data-sidebar-collapsed')",
        timeout=3000,
    )
    assert page.evaluate("() => localStorage.getItem('af-sidebar-collapsed')") in (None, "")
