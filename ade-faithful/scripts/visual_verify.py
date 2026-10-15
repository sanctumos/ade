#!/usr/bin/env python3
"""Desktop + mobile screenshots of the ADE pages, served from this working tree.

Run: ADE_E2E_API_KEY=... .venv/bin/python scripts/visual_verify.py [out_dir]

The static tree is served on an ephemeral loopback port (killed on exit). API calls to
/proxy.php are forwarded to ADE_VISUAL_UPSTREAM (default: the live ade.sanctumos.org proxy),
so screenshots show real agents without deploying.
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = os.environ.get("ADE_VISUAL_UPSTREAM", "https://ade.sanctumos.org/proxy.php")
KEY = os.environ.get("ADE_E2E_API_KEY", "")
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ade-visual")
VIEWPORTS = {"desktop": (1280, 800), "mobile": (390, 844)}


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> int:
    if not KEY:
        print("ADE_E2E_API_KEY required", file=sys.stderr)
        return 2
    OUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    srv = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "-d", str(ROOT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    errors: list[str] = []
    try:
        time.sleep(0.8)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for vp_name, (w, h) in VIEWPORTS.items():
                ctx = browser.new_context(viewport={"width": w, "height": h})

                def forward(route, request):
                    q = request.url.split("proxy.php", 1)[1]
                    route.fulfill(response=route.fetch(url=UPSTREAM + q))

                ctx.route(f"{base}/proxy.php*", forward)
                page = ctx.new_page()
                page.on("pageerror", lambda e, vp=vp_name: errors.append(f"{vp}: {e}"))
                page.goto(f"{base}/settings.html")
                page.evaluate(
                    "([b,k]) => { localStorage.setItem('ade_faithful_base', b); localStorage.setItem('ade_faithful_key', k); }",
                    [f"{base}/proxy.php", KEY],
                )

                def shot(name: str, url: str, wait: str | None = None, settle: int = 1500):
                    page.goto(f"{base}/{url}", wait_until="networkidle", timeout=60000)
                    if wait:
                        page.wait_for_selector(wait, timeout=30000)
                    page.wait_for_timeout(settle)
                    path = OUT / f"{vp_name}-{name}.png"
                    page.screenshot(path=str(path))
                    print(path)

                shot("dashboard", "index.html", "#stat-agents")
                shot("agents", "agents.html", ".af-agent-card")
                agent_href = page.locator(".af-agent-card-name").first.get_attribute("href")
                shot("agent", agent_href, "#agent-avatar .af-avatar")
                chat_href = page.locator("#chat-link").get_attribute("href")
                shot("chat", chat_href, "#messages > *", settle=2500)
                steps = page.locator("#messages .chat-turn--tool-call details")
                if steps.count():
                    steps.last.evaluate("d => { d.open = true; d.scrollIntoView({block: 'center'}); }")
                    page.wait_for_timeout(400)
                    page.screenshot(path=str(OUT / f"{vp_name}-chat-step-open.png"))
                if vp_name == "mobile":
                    page.click("#nav-toggle")
                    page.wait_for_timeout(400)
                    page.screenshot(path=str(OUT / "mobile-nav-open.png"))
                ctx.close()
            browser.close()
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()
    if errors:
        print("PAGE ERRORS:", *errors, sep="\n  ")
        return 1
    print("visual capture OK", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
