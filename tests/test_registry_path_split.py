"""ADE proxy path-split: /v1/sanctum/registry/* → Registry, else Letta."""

from __future__ import annotations

import json
import os
import sys
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

# Point at sibling registry package for live R0 process
REG_ROOT = Path(__file__).resolve().parents[2] / "sanctumos" / "registry"
if REG_ROOT.is_dir() and str(REG_ROOT) not in sys.path:
    sys.path.insert(0, str(REG_ROOT))

from flask_server import app, select_upstream  # noqa: E402


class SelectUpstreamUnit(unittest.TestCase):
    def test_registry_prefix(self) -> None:
        _, is_reg = select_upstream("v1/sanctum/registry/health")
        self.assertTrue(is_reg)
        _, is_reg2 = select_upstream("v1/sanctum/registry/docs/quickstart")
        self.assertTrue(is_reg2)

    def test_letta_paths(self) -> None:
        _, is_reg = select_upstream("v1/agents")
        self.assertFalse(is_reg)
        _, is_reg2 = select_upstream("v1/tools")
        self.assertFalse(is_reg2)


@unittest.skipUnless(REG_ROOT.is_dir(), "sanctumos/registry checkout missing")
class FlaskRegistryProxyLive(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        os.environ["SANCTUM_REGISTRY_QUIET"] = "1"
        from sanctum_registry.server import make_server

        cls._reg = make_server("127.0.0.1", 0)
        cls._reg_port = cls._reg.server_address[1]
        os.environ["ADE_FLASK_REGISTRY_UPSTREAM"] = f"http://127.0.0.1:{cls._reg_port}"
        # reload module constants — select_upstream uses module-level REGISTRY_UPSTREAM
        import flask_server as fs

        fs.REGISTRY_UPSTREAM = os.environ["ADE_FLASK_REGISTRY_UPSTREAM"]
        cls._thread = threading.Thread(target=cls._reg.serve_forever, daemon=True)
        cls._thread.start()
        cls._client = app.test_client()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._reg.shutdown()
        cls._reg.server_close()

    def test_health_through_flask(self) -> None:
        resp = self._client.get("/api/v1/sanctum/registry/health")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data.get("service"), "sanctum-registry")

    def test_missing_registry_honest_502(self) -> None:
        import flask_server as fs

        old = fs.REGISTRY_UPSTREAM
        fs.REGISTRY_UPSTREAM = "http://127.0.0.1:1"  # nothing listening
        try:
            resp = self._client.get("/api/v1/sanctum/registry/health")
            self.assertEqual(resp.status_code, 502)
            data = json.loads(resp.data)
            self.assertEqual(data.get("service"), "sanctum-registry")
        finally:
            fs.REGISTRY_UPSTREAM = old


if __name__ == "__main__":
    unittest.main()
