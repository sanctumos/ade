"""Unit-ish: ADE sendChatPreferBroca prefers Registry Broca; 409 stays honest."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
REG_ROOT = Path(__file__).resolve().parents[2] / "sanctumos" / "registry"
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(REG_ROOT))


class _MockBroca(BaseHTTPRequestHandler):
    api_key = "ade-wire-key"
    outbox: dict = {}

    def log_message(self, *args):  # noqa: A003
        return

    def _auth(self) -> bool:
        a = self.headers.get("Authorization", "")
        return (a.startswith("Bearer ") and a[7:].strip() == self.api_key) or (
            self.headers.get("X-API-Key", "").strip() == self.api_key
        )

    def _json(self, status: int, obj: dict) -> None:
        raw = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self) -> None:  # noqa: N802
        if not self._auth():
            self._json(401, {"error": "unauthorized"})
            return
        n = int(self.headers.get("Content-Length") or 0)
        data = json.loads(self.rfile.read(n).decode() or "{}")
        idem = str(data.get("idempotency_key") or "k")
        self.outbox[idem] = {
            "idempotency_key": idem,
            "text": "broca-reply:" + str(data.get("text") or ""),
        }
        self._json(202, {"status": "queued", "idempotency_key": idem})

    def do_GET(self) -> None:  # noqa: N802
        if not self._auth():
            self._json(401, {"error": "unauthorized"})
            return
        q = parse_qs(urlparse(self.path).query)
        key = (q.get("idempotency_key") or [""])[0]
        row = self.outbox.get(key)
        if not row:
            self._json(404, {"error": "not_found"})
            return
        self._json(200, row)


@unittest.skipUnless(REG_ROOT.is_dir(), "registry checkout missing")
class ChatBrocaWireTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        os.environ["SANCTUM_REGISTRY_QUIET"] = "1"
        cls._td = tempfile.TemporaryDirectory()
        os.environ["SANCTUM_REGISTRY_HIVE"] = str(Path(cls._td.name) / "hive")
        from sanctum_registry.server import make_server

        cls._broca = ThreadingHTTPServer(("127.0.0.1", 0), _MockBroca)
        cls._bport = cls._broca.server_address[1]
        threading.Thread(target=cls._broca.serve_forever, daemon=True).start()
        os.environ["SANCTUM_REGISTRY_BROCA_API_KEY"] = _MockBroca.api_key

        cls._reg = make_server("127.0.0.1", 0)
        cls._rport = cls._reg.server_address[1]
        threading.Thread(target=cls._reg.serve_forever, daemon=True).start()

        # seed athena broca + letta main
        for path, val in (
            ("agents/athena/broca/port", cls._bport),
            ("agents/athena/broca/actual", "running"),
            ("agents/athena/broca/desired", "running"),
            ("agents/athena/letta/main", "agent-letta-athena"),
        ):
            conn = HTTPConnection("127.0.0.1", cls._rport, timeout=5)
            body = json.dumps({"value": val}).encode()
            conn.request(
                "PUT",
                f"/v1/sanctum/registry/keys/{path}",
                body,
                {"Content-Type": "application/json", "Content-Length": str(len(body))},
            )
            assert conn.getresponse().status == 200
            conn.close()

        os.environ["ADE_FLASK_REGISTRY_UPSTREAM"] = f"http://127.0.0.1:{cls._rport}"
        os.environ["ADE_FLASK_UPSTREAM"] = "http://127.0.0.1:9"
        import flask_server as fs

        fs.REGISTRY_UPSTREAM = os.environ["ADE_FLASK_REGISTRY_UPSTREAM"]
        cls._app = fs.app

    @classmethod
    def tearDownClass(cls) -> None:
        cls._reg.shutdown()
        cls._reg.server_close()
        cls._broca.shutdown()
        cls._broca.server_close()
        cls._td.cleanup()
        os.environ.pop("SANCTUM_REGISTRY_BROCA_API_KEY", None)

    def test_proxy_chat_tunnel_wait(self) -> None:
        from werkzeug.serving import make_server

        srv = make_server("127.0.0.1", 0, self._app, threaded=True)
        port = srv.server_port
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            conn = HTTPConnection("127.0.0.1", port, timeout=15)
            body = json.dumps(
                {
                    "text": "hello wire",
                    "idempotency_key": "wire-1",
                    "wait_seconds": 5,
                }
            ).encode()
            conn.request(
                "POST",
                "/api/v1/sanctum/registry/agents/athena/chat/messages",
                body,
                {"Content-Type": "application/json", "Content-Length": str(len(body))},
            )
            resp = conn.getresponse()
            raw = resp.read().decode()
            data = json.loads(raw)
            self.assertEqual(resp.status, 200, msg=raw)
            self.assertEqual(data.get("text"), "broca-reply:hello wire")
            conn.close()
        finally:
            srv.shutdown()

    def test_missing_uid_409_via_proxy(self) -> None:
        from werkzeug.serving import make_server

        srv = make_server("127.0.0.1", 0, self._app, threaded=True)
        port = srv.server_port
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            conn = HTTPConnection("127.0.0.1", port, timeout=10)
            body = json.dumps({"text": "nope"}).encode()
            conn.request(
                "POST",
                "/api/v1/sanctum/registry/agents/nobody/chat/messages",
                body,
                {"Content-Type": "application/json", "Content-Length": str(len(body))},
            )
            resp = conn.getresponse()
            data = json.loads(resp.read().decode())
            self.assertEqual(resp.status, 409)
            self.assertEqual(data.get("error"), "broca_not_installed")
            conn.close()
        finally:
            srv.shutdown()


if __name__ == "__main__":
    unittest.main()
