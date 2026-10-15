"""JS coverage via Chromium CDP precise coverage. Enable with ADE_JS_COVERAGE=1.

Writes a per-file byte-coverage table for our own scripts (vendor/ excluded) at session end.
Inline <script> blocks are reported under their HTML page.
"""
from __future__ import annotations

import os
from collections import defaultdict
from urllib.parse import urlparse

import pytest

ENABLED = os.environ.get("ADE_JS_COVERAGE") == "1"
_covered: dict[str, set[int]] = defaultdict(set)
_lengths: dict[str, int] = {}


def _key(url: str) -> str | None:
    u = urlparse(url)
    if u.scheme not in ("http", "https") or u.hostname not in ("127.0.0.1", "localhost"):
        return None
    path = u.path.lstrip("/") or "index.html"
    if path.startswith("vendor/") or path in ("config.js",):
        return None
    if not (path.endswith(".js") or path.endswith(".html")):
        return None
    return path


def _absorb(result: dict, sources: dict[str, str]) -> None:
    for script in result.get("result", []):
        key = _key(script.get("url", ""))
        if not key:
            continue
        sid = script["scriptId"]
        src = sources.get(sid)
        if src is None:
            continue
        n = len(src)
        counts = [None] * n
        for fn in script.get("functions", []):
            for r in fn.get("ranges", []):
                s, e, c = r["startOffset"], min(r["endOffset"], n), r["count"]
                for i in range(s, e):
                    counts[i] = c
        ukey = f"{key}#{sid}" if key.endswith(".html") else key
        if key.endswith(".html"):
            ukey = f"{key} (inline {len(src)}b)"
        _lengths[ukey] = n
        _covered[ukey].update(i for i, c in enumerate(counts) if c and not src[i].isspace())
        _lengths[ukey] = sum(1 for ch in src if not ch.isspace())


@pytest.fixture(autouse=True)
def _js_coverage(request):
    if not ENABLED or "page" not in request.fixturenames:
        yield
        return
    page = request.getfixturevalue("page")
    cdp = page.context.new_cdp_session(page)
    sources: dict[str, str] = {}

    def on_parsed(ev):
        if _key(ev.get("url", "")):
            try:
                sources[ev["scriptId"]] = cdp.send("Debugger.getScriptSource", {"scriptId": ev["scriptId"]})["scriptSource"]
            except Exception:
                pass

    cdp.on("Debugger.scriptParsed", on_parsed)
    cdp.send("Debugger.enable")
    cdp.send("Profiler.enable")
    cdp.send("Profiler.startPreciseCoverage", {"callCount": True, "detailed": True})
    yield
    try:
        _absorb(cdp.send("Profiler.takePreciseCoverage"), sources)
    except Exception:
        pass


def pytest_sessionfinish(session, exitstatus):
    if not ENABLED or not _lengths:
        return
    rows = []
    tot_c = tot_n = 0
    for k in sorted(_lengths):
        n = _lengths[k]
        c = len(_covered[k])
        tot_c += c
        tot_n += n
        rows.append(f"  {100 * c / n:5.1f}%  {k}")
    print("\nJS coverage (non-whitespace bytes executed):")
    print("\n".join(rows))
    print(f"  TOTAL {100 * tot_c / max(tot_n, 1):.1f}%")
