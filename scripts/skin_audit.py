#!/usr/bin/env python3
"""Contrast + screenshot audit of every ADE page under every skin.

Run: .venv/bin/python scripts/skin_audit.py [out_dir]

All /proxy.php calls are mocked (fixture agent, tools, messages covering every chat lane),
so no Letta server is touched. Prints elements whose text contrast is under WCAG AA
(4.5:1 normal text, 3:1 for >=18.66px bold / >=24px) and saves desktop + mobile shots.
"""
from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ade-skin-audit")
SKINS = ["hey", "ledger", "brutalist", "obsidian"]
VIEWPORTS = {"desktop": (1280, 900), "mobile": (390, 844)}
AID = "agent-audit-1"
AGENT = {
    "id": AID,
    "name": "Audit Agent",
    "system": "You are helpful.",
    "llm_config": {"handle": "openai-proxy/model-x", "model": "model-x", "temperature": 0.7},
    "tools": [],
    "tool_ids": [],
}
TOOLS = [{"id": f"tool-{i}", "name": f"tool_{i}", "description": "Does a thing", "tool_type": "custom"} for i in range(4)]
MESSAGES = [
    {"id": "m1", "message_type": "user_message", "content": "Please check memory and run a tool.", "date": "2026-10-15T16:00:00Z"},
    {"id": "m2", "message_type": "reasoning_message", "reasoning": "I should call the memory tool first.", "source": "reasoner_model"},
    {"id": "m2b", "message_type": "hidden_reasoning_message", "state": "redacted"},
    {"id": "m3", "message_type": "tool_call_message",
     "tool_call": {"name": "memory", "arguments": "{\"q\": \"x\"}", "tool_call_id": "c1"}},
    {"id": "m4", "message_type": "tool_return_message", "tool_call_id": "c1", "status": "success", "tool_return": "{\"ok\": true}"},
    {"id": "m5", "message_type": "tool_call_message",
     "tool_call": {"name": "web_fetch", "arguments": "{}", "tool_call_id": "c2"}},
    {"id": "m6", "message_type": "tool_return_message", "tool_call_id": "c2", "status": "error", "tool_return": "Timeout"},
    {"id": "m7", "message_type": "approval_request_message",
     "tool_call": {"name": "delete_file", "arguments": "{}", "tool_call_id": "c3"}},
    {"id": "m8", "message_type": "assistant_message", "date": "2026-10-15T16:01:00Z",
     "content": "Here is **bold**, a [link](https://example.com), `inline code`, and:\n\n"
                "```python\nprint('hi')\n```\n\n> a quote\n\n| a | b |\n|---|---|\n| 1 | 2 |"},
    {"id": "m9", "message_type": "system_message", "content": "System note."},
]


def handle(route, request):
    full = parse_qs(urlparse(request.url).query).get("path", [""])[0]
    path = full.partition("?")[0].rstrip("/")
    m = request.method
    data: object = []
    if path == "/v1/agents" and m == "GET":
        data = [AGENT, {**AGENT, "id": "agent-2", "name": "Second Agent"}]
    elif path == f"/v1/agents/{AID}":
        data = AGENT
    elif path == f"/v1/agents/{AID}/tools":
        data = TOOLS[:2]
    elif path == "/v1/tools":
        data = TOOLS
    elif path == "/v1/models":
        data = [{"handle": "openai-proxy/model-x"}]
    elif path == f"/v1/agents/{AID}/messages":
        data = MESSAGES
    elif path.endswith("/core-memory/blocks"):
        data = [{"label": "persona", "value": "I am an audit agent.", "limit": 5000},
                {"label": "human", "value": "Mark", "limit": 5000}]
    elif path.endswith("/archival-memory"):
        data = [{"id": "p1", "text": "An archival passage.", "created_at": "2026-10-01T00:00:00Z"}]
    elif path == "/v1/mcp-servers":
        data = [{"id": "mcp-1", "server_name": "demo", "server_type": "sse", "server_url": "http://x/sse"}]
    route.fulfill(status=200, headers={"content-type": "application/json"}, body=json.dumps(data))


CONTRAST_JS = r"""
() => {
  function parse(c) {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s));
    return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1};
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function blend(top, bot) {
    const a = top.a;
    return {r: top.r * a + bot.r * (1 - a), g: top.g * a + bot.g * (1 - a), b: top.b * a + bot.b * (1 - a), a: 1};
  }
  function bgOf(el) {
    const stack = [];
    let n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      let bg = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
        const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(s => s && s.a > 0);
        if (stops.length) {
          const n2 = stops.length;
          bg = stops.reduce((acc, s) => ({r: acc.r + s.r / n2, g: acc.g + s.g / n2, b: acc.b + s.b / n2, a: Math.max(acc.a, s.a)}), {r: 0, g: 0, b: 0, a: 0});
        }
      }
      if (bg && bg.a > 0) stack.push(bg);
      if (bg && bg.a >= 1) break;
      n = n.parentElement;
    }
    let base = {r: 255, g: 255, b: 255, a: 1};
    const root = parse(getComputedStyle(document.body).backgroundColor);
    if (root && root.a >= 1 && (!stack.length || stack[stack.length - 1].a < 1)) base = root;
    for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base);
    return base;
  }
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const text = t.textContent.trim();
    if (!text) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    let op = 1, a = el;
    while (a) { op *= parseFloat(getComputedStyle(a).opacity); a = a.parentElement; }
    if (op < 0.05) continue;
    const fg0 = parse(cs.color); if (!fg0) continue;
    const bg = bgOf(el);
    const fg = blend({...fg0, a: fg0.a * op}, bg);
    const l1 = lum(fg), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).join('.') : '';
      out.push({sel: el.tagName.toLowerCase() + cls, text: text.slice(0, 40), ratio: Math.round(ratio * 100) / 100,
                need, fg: cs.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`});
    }
  }
  return out;
}
"""

PAGES = [
    ("dashboard", "index.html", "#stat-agents"),
    ("agents", "agents.html", ".af-agent-card"),
    ("agent", f"agent.html?id={AID}", "#agent-avatar .af-avatar"),
    ("chat", f"chat.html?agent={AID}", "#messages > *"),
    ("tools", "tools.html", None),
    ("mcp", "mcp.html", None),
    ("settings", "settings.html", ".af-skin-card"),
]


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "-d", str(ROOT)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    report: dict[str, list] = {}
    try:
        time.sleep(0.8)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for skin in SKINS:
                for vp, (w, h) in VIEWPORTS.items():
                    ctx = browser.new_context(viewport={"width": w, "height": h})
                    ctx.route(f"{base}/proxy.php*", handle)
                    page = ctx.new_page()
                    page.goto(f"{base}/settings.html")
                    page.evaluate("([b, s]) => { localStorage.setItem('ade_faithful_base', b);"
                                  " localStorage.setItem('ade_faithful_key', 'k');"
                                  " localStorage.setItem('ade_faithful_agent_id', 'agent-audit-1');"
                                  " localStorage.setItem('af-skin-comp', s); }", [f"{base}/proxy.php", skin])
                    for name, url, wait in PAGES:
                        page.goto(f"{base}/{url}", wait_until="networkidle")
                        if wait:
                            page.wait_for_selector(wait, timeout=15000)
                        if name == "chat":
                            page.evaluate("() => document.querySelectorAll('#messages details').forEach(d => d.open = true)")
                        page.wait_for_timeout(500)
                        page.screenshot(path=str(OUT / f"{skin}-{vp}-{name}.png"), full_page=True)
                        if vp == "desktop":
                            bad = page.evaluate(CONTRAST_JS)
                            if bad:
                                report[f"{skin}/{name}"] = bad
                    ctx.close()
            browser.close()
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()
    total = 0
    for key, rows in report.items():
        print(f"\n== {key} ({len(rows)} low-contrast)")
        for r in rows:
            total += 1
            print(f"  {r['ratio']:>5} < {r['need']}  {r['sel'][:60]:60} fg={r['fg']} bg={r['bg']}  \"{r['text']}\"")
    print(f"\nTOTAL low-contrast elements: {total}  (screens in {OUT})")
    (OUT / "report.json").write_text(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
