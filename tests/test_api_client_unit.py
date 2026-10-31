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
            hasExport: typeof a.exportAgent === 'function',
            hasImport: typeof a.importAgent === 'function',
            hasDownloadAf: typeof a.downloadAf === 'function',
            hasCreateTool: typeof a.createTool === 'function',
            hasCancel: typeof a.cancelAgentMessages === 'function',
            hasAbort: typeof a.isAbortError === 'function',
            hasTransport: typeof a.isStreamTransportError === 'function',
            failedFetch: a.isStreamTransportError && a.isStreamTransportError(new TypeError('Failed to fetch')),
            abortNotTransport: a.isStreamTransportError && !a.isStreamTransportError(Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' })),
          };
        }"""
    )
    assert api["hasStream"] and api["hasPrefer"]
    assert api["hasCancel"] and api["hasAbort"]
    assert api["hasTransport"] and api["failedFetch"] and api["abortNotTransport"]
    assert api["hasArchList"] and api["hasArchCreate"] and api["hasArchDel"] and api["hasArchSearch"]
    assert api["hasExport"] and api["hasImport"] and api["hasDownloadAf"] and api["hasCreateTool"]
