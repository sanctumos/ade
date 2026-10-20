"""Letta 0.16+ treats streaming=true as SDK v1.0+ only (stainless header or letta-client UA)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from flask_server import (  # noqa: E402
    LETTA_SDK_UA,
    STAINLESS_HEADER,
    build_upstream_headers,
    is_letta_stream_request,
)

BASE = os.environ.get("ADE_SMOKE_BASE", "http://127.0.0.1:5055").rstrip("/")


def test_stream_detection():
    assert is_letta_stream_request("text/event-stream", b"{}")
    assert is_letta_stream_request("application/json", b'{"streaming": true, "input": "hi"}')
    assert not is_letta_stream_request("application/json", b'{"input": "hi"}')
    assert not is_letta_stream_request(None, None)


def test_stream_upstream_looks_like_sdk_v1():
    headers = build_upstream_headers(
        {"Authorization": "Bearer k", "Content-Type": "application/json", "Accept": "text/event-stream"},
        b'{"streaming":true}',
    )
    assert headers["User-Agent"] == LETTA_SDK_UA
    assert headers[STAINLESS_HEADER] == "1.0.0"
    assert headers["Authorization"] == "Bearer k"


def test_non_stream_does_not_inject_sdk_identity():
    headers = build_upstream_headers(
        {"Authorization": "Bearer k", "Content-Type": "application/json", "Accept": "application/json"},
        b'{"name": "x"}',
    )
    assert "User-Agent" not in headers
    assert STAINLESS_HEADER not in headers


def test_proxy_php_injects_sdk_identity_on_stream():
    text = (ROOT / "public" / "proxy.php").read_text(encoding="utf-8")
    assert "letta-client/1.0.0" in text
    assert "X-Stainless-Package-Version" in text


def test_ade_js_sends_stainless_on_sse_only(page):
    page.goto(f"{BASE}/index.html", wait_until="domcontentloaded")
    src = page.evaluate("() => window.ADE && typeof window.ADE.sendMessageStream")
    assert src == "function"
    app_js = (ROOT / "public" / "app.js").read_text(encoding="utf-8")
    assert "X-Stainless-Package-Version" in app_js
    sse_idx = app_js.index("function sseFetch")
    api_idx = app_js.index("function apiFetch")
    sse_chunk = app_js[sse_idx : sse_idx + 800]
    api_chunk = app_js[api_idx : api_idx + 500]
    assert "LETTA_SDK_V1_HEADERS" in sse_chunk
    assert "LETTA_SDK_V1_HEADERS" not in api_chunk
