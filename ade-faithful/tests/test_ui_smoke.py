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
