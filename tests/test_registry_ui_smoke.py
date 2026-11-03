"""Design smoke: Registry editor page (desktop + mobile)."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REG_ROOT = Path(__file__).resolve().parents[2] / "sanctumos" / "registry"
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(REG_ROOT))

from playwright.sync_api import sync_playwright  # noqa: E402


@unittest.skipUnless(REG_ROOT.is_dir(), "registry checkout missing")
class RegistryUiSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        os.environ["SANCTUM_REGISTRY_QUIET"] = "1"
        cls._tmpdir = tempfile.TemporaryDirectory()
        os.environ["SANCTUM_REGISTRY_HIVE"] = str(Path(cls._tmpdir.name) / "hive")
        from sanctum_registry.server import make_server

        cls._reg = make_server("127.0.0.1", 0)
        cls._reg_port = cls._reg.server_address[1]
        threading.Thread(target=cls._reg.serve_forever, daemon=True).start()

        # seed a key
        conn = HTTPConnection("127.0.0.1", cls._reg_port, timeout=5)
        body = json.dumps({"value": "running"}).encode()
        conn.request(
            "PUT",
            "/v1/sanctum/registry/keys/agents/athena/broca/desired",
            body=body,
            headers={"Content-Type": "application/json", "Content-Length": str(len(body))},
        )
        self_resp = conn.getresponse()
        self_resp.read()
        conn.close()
        assert self_resp.status == 200

        os.environ["ADE_FLASK_REGISTRY_UPSTREAM"] = f"http://127.0.0.1:{cls._reg_port}"
        os.environ["ADE_FLASK_UPSTREAM"] = "http://127.0.0.1:9"  # unused
        import flask_server as fs

        fs.REGISTRY_UPSTREAM = os.environ["ADE_FLASK_REGISTRY_UPSTREAM"]
        cls._app = fs.app
        cls._artifacts = ROOT / "build" / "registry-ui-smoke"
        cls._artifacts.mkdir(parents=True, exist_ok=True)

    @classmethod
    def tearDownClass(cls) -> None:
        cls._reg.shutdown()
        cls._reg.server_close()
        cls._tmpdir.cleanup()

    def test_registry_page_screenshots(self) -> None:
        from werkzeug.serving import make_server

        srv = make_server("127.0.0.1", 0, self._app, threaded=True)
        port = srv.server_port
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{port}"
        try:
            cfg_js = (
                f"window.ADE_CONFIG = {{ base: '{base}/api', key: '' }};\n"
            )

            def _route_config(route):
                route.fulfill(status=200, content_type="application/javascript", body=cfg_js)

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context()
                context.clear_cookies()
                page = context.new_page()
                page.route("**/config.js", _route_config)
                page.add_init_script(
                    "try { localStorage.removeItem('ade_faithful_base'); "
                    "localStorage.removeItem('ade_faithful_key'); } catch (e) {}"
                )
                page.set_viewport_size({"width": 1280, "height": 800})
                page.goto(f"{base}/registry.html", wait_until="networkidle")
                page.wait_for_selector("#reg-status.is-ok", timeout=15000)
                page.wait_for_selector("#reg-tree button", timeout=10000)
                page.locator("#reg-tree button").first.click()
                page.wait_for_selector("#reg-editor:not([hidden])")
                desk = self._artifacts / "registry-desktop.png"
                page.screenshot(path=str(desk), full_page=True)

                page.set_viewport_size({"width": 390, "height": 844})
                page.goto(f"{base}/registry.html", wait_until="networkidle")
                page.wait_for_selector("#reg-status.is-ok", timeout=15000)
                mob = self._artifacts / "registry-mobile.png"
                page.screenshot(path=str(mob), full_page=True)
                context.close()
                browser.close()
        finally:
            srv.shutdown()

        self.assertTrue(desk.is_file() and desk.stat().st_size > 1000)
        self.assertTrue(mob.is_file() and mob.stat().st_size > 1000)


if __name__ == "__main__":
    unittest.main()
