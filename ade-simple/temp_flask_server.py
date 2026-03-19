from flask import Flask, Response, request, send_from_directory
import requests

app = Flask(__name__, static_folder=".", static_url_path="")
UPSTREAM_BASE = "https://sanctum.zero1.network:8443"


@app.get("/")
def root():
    return send_from_directory(".", "index.html")


@app.get("/<path:path>")
def static_files(path: str):
    return send_from_directory(".", path)


@app.route("/api/<path:path>", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def api_proxy(path: str):
    # Local same-origin proxy for browser testing (avoids CORS preflight failures).
    url = f"{UPSTREAM_BASE}/{path}"
    query = request.query_string.decode("utf-8")
    if query:
        url = f"{url}?{query}"

    headers = {}
    if request.headers.get("Authorization"):
        headers["Authorization"] = request.headers["Authorization"]
    if request.headers.get("Content-Type"):
        headers["Content-Type"] = request.headers["Content-Type"]

    upstream = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=request.get_data(),
        allow_redirects=True,
        timeout=30,
    )

    passthrough = {}
    for k, v in upstream.headers.items():
        lk = k.lower()
        if lk in {"content-type", "content-disposition", "cache-control", "etag"}:
            passthrough[k] = v

    return Response(upstream.content, status=upstream.status_code, headers=passthrough)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5055, debug=False)
