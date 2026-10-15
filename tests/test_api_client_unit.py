"""Lightweight unit checks for streaming helpers (run in browser via Playwright evaluate)."""
from __future__ import annotations

import os

import pytest

BASE = os.environ.get("ADE_SMOKE_BASE", "http://127.0.0.1:5055").rstrip("/")


def test_ade_client_exposes_stream_and_archival(page):
    page.goto(f"{BASE}/index.html", wait_until="domcontentloaded")
    api = page.evaluate(
        """() => {
          const a = window.ADE || {};
          return {
            hasStream: typeof a.sendMessageStream === 'function',
            hasPrefer: typeof a.sendMessagePreferStream === 'function',
            hasArchList: typeof a.listArchivalMemory === 'function',
            hasArchCreate: typeof a.createArchivalMemory === 'function',
            hasArchDel: typeof a.deleteArchivalMemory === 'function',
            hasArchSearch: typeof a.searchArchivalMemory === 'function',
          };
        }"""
    )
    assert api["hasStream"] and api["hasPrefer"]
    assert api["hasArchList"] and api["hasArchCreate"] and api["hasArchDel"] and api["hasArchSearch"]
