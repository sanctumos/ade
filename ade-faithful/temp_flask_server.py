#!/usr/bin/env python3
"""
Local static server for ade-faithful/ + optional same-origin API proxy.

Serves this directory on http://127.0.0.1:5055/ so the ADE can use http origins
(not file://) and you can point config at the proxy to avoid CORS.

Proxy: requests to /api/<path> forward to UPSTREAM_BASE/<path>.

Usage:
  cd ade-faithful
  pip install flask requests   # once
  python3 temp_flask_server.py

Env:
  ADE_FLASK_UPSTREAM — API base to proxy (default: https://sanctum.zero1.network:8443)
  ADE_FLASK_PORT     — listen port (default: 5055)
"""
from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, Response, request, send_from_directory
import requests

ROOT = Path(__file__).resolve().parent
UPSTREAM_BASE = os.environ.get("ADE_FLASK_UPSTREAM", "https://sanctum.zero1.network:8443").rstrip("/")
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

    if request.method == "OPTIONS":
        # Let browser preflight succeed when using the proxy as API base.
        return Response(
            "",
            status=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
                "Access-Control-Max-Age": "86400",
            },
        )

    upstream = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=request.get_data(),
        allow_redirects=True,
        timeout=60,
    )

    passthrough = {}
    for k, v in upstream.headers.items():
        lk = k.lower()
        if lk in {"content-type", "content-disposition", "cache-control", "etag"}:
            passthrough[k] = v

    return Response(upstream.content, status=upstream.status_code, headers=passthrough)


if __name__ == "__main__":
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/")
    print(f"API proxy: /api/* -> {UPSTREAM_BASE}/*")
    print("Set ADE config base to http://127.0.0.1:%d/api (Settings or config.js)" % PORT)
    app.run(host="127.0.0.1", port=PORT, debug=False)
