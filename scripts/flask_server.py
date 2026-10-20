#!/usr/bin/env python3
"""
Local static server for Sanctum ADE v1 (public/) + same-origin API proxy (incl. SSE).

Serves repo-root public/ on http://127.0.0.1:5055/.

Proxy: /api/<path> → UPSTREAM_BASE/<path> (SSE passed through).

Usage:
  # from repo root
  pip install -r requirements.txt
  python3 scripts/flask_server.py

Env:
  ADE_FLASK_UPSTREAM — API base to proxy (default: http://127.0.0.1:8283)
  ADE_FLASK_PORT     — listen port (default: 5055)
"""
from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, Response, request, send_from_directory
import requests

ROOT = Path(__file__).resolve().parent.parent / "public"
UPSTREAM_BASE = os.environ.get("ADE_FLASK_UPSTREAM", "http://127.0.0.1:8283").rstrip("/")
PORT = int(os.environ.get("ADE_FLASK_PORT", "5055"))

LETTA_SDK_UA = "letta-client/1.0.0"
STAINLESS_HEADER = "X-Stainless-Package-Version"


def is_letta_stream_request(accept: str | None, body: bytes | str | None) -> bool:
    """True when ADE is asking Letta for SSE (Accept or streaming=true body)."""
    if accept and "text/event-stream" in accept.lower():
        return True
    if not body:
        return False
    text = body.decode("utf-8", "replace") if isinstance(body, (bytes, bytearray)) else str(body)
    return '"streaming":true' in text.replace(" ", "")


def build_upstream_headers(incoming_headers, body: bytes | str | None) -> dict[str, str]:
    """Copy auth/content headers; mark stream calls as Letta SDK v1.0+."""
    headers: dict[str, str] = {}
    auth = incoming_headers.get("Authorization")
    if auth:
        headers["Authorization"] = auth
    content_type = incoming_headers.get("Content-Type")
    if content_type:
        headers["Content-Type"] = content_type
    accept = incoming_headers.get("Accept")
    if accept:
        headers["Accept"] = accept
    stainless = incoming_headers.get(STAINLESS_HEADER) or ""
    if is_letta_stream_request(accept, body):
        headers["User-Agent"] = LETTA_SDK_UA
        headers[STAINLESS_HEADER] = stainless or "1.0.0"
    elif stainless:
        headers[STAINLESS_HEADER] = stainless
    return headers


app = Flask(__name__, static_folder=str(ROOT), static_url_path="")


@app.get("/")
def root():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:path>")
def static_files(path: str):
    return send_from_directory(ROOT, path)


@app.route("/api/<path:path>", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def api_proxy(path: str):
    url = f"{UPSTREAM_BASE}/{path}"
    query = request.query_string.decode("utf-8")
    if query:
        url = f"{url}?{query}"

    if request.method == "OPTIONS":
        return Response(
            "",
            status=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Stainless-Package-Version",
                "Access-Control-Max-Age": "86400",
            },
        )

    body = request.get_data()
    headers = build_upstream_headers(request.headers, body)

    upstream = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=body,
        allow_redirects=True,
        timeout=(30, 600),
        stream=True,
    )

    ct = (upstream.headers.get("Content-Type") or "").lower()
    passthrough = {}
    for k, v in upstream.headers.items():
        lk = k.lower()
        if lk in {
            "content-type",
            "content-disposition",
            "cache-control",
            "etag",
            "x-accel-buffering",
        }:
            passthrough[k] = v

    if "text/event-stream" in ct or "stream" in ct:
        passthrough.setdefault("Cache-Control", "no-cache")
        passthrough.setdefault("X-Accel-Buffering", "no")

        def generate():
            try:
                for chunk in upstream.iter_content(chunk_size=1024):
                    if chunk:
                        yield chunk
            finally:
                upstream.close()

        return Response(generate(), status=upstream.status_code, headers=passthrough)

    body = upstream.content
    upstream.close()
    return Response(body, status=upstream.status_code, headers=passthrough)


if __name__ == "__main__":
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/")
    print(f"API proxy: /api/* -> {UPSTREAM_BASE}/*")
    print("Set ADE config base to http://127.0.0.1:%d/api (Settings or config.js)" % PORT)
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)
