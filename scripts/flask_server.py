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

    headers = {}
    if request.headers.get("Authorization"):
        headers["Authorization"] = request.headers["Authorization"]
    if request.headers.get("Content-Type"):
        headers["Content-Type"] = request.headers["Content-Type"]
    if request.headers.get("Accept"):
        headers["Accept"] = request.headers["Accept"]

    if request.method == "OPTIONS":
        return Response(
            "",
            status=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
                "Access-Control-Max-Age": "86400",
            },
        )

    upstream = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=request.get_data(),
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
