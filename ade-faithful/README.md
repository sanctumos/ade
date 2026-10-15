# ade-faithful — self-hosted Letta ADE (static, no Node)

**Self-hosted Letta only.** Static HTML/CSS/JS (`config.js` + `app.js` + pages) that calls **your** Letta OSS/Sanctum API. No Cloud, no org console, no Node build.

Folder name is historical; product intent is **OSS ADE**, not a pixel clone of `app.letta.com`.

## How it differs from `ade-simple/`

| | **ade-simple** | **ade-faithful** (this folder) |
|--|----------------|--------------------------------|
| Runtime | Static files, no build | Same |
| Backend | Self-hosted Letta `/v1` | Same |
| API | `window.ADE` in `app.js` | Same surface (storage keys `ade_faithful_*`) |
| Visual | Bootstrap + theme | `shell.css` shell; some pages still hybrid Bootstrap until cleaned up |
| Cloud | Never | Never |

## Setup

1. `cp config.example.js config.js` and set `base` / `key`, **or** use **Settings** (localStorage overrides).
2. Open `index.html` or serve this directory over HTTP.

### Local Flask (same-origin API proxy)

From this folder:

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
ADE_FLASK_UPSTREAM=http://127.0.0.1:8283 .venv/bin/python temp_flask_server.py
```

- Serves the UI at **`http://127.0.0.1:5055/`**
- Proxies **`/api/*`** to **`ADE_FLASK_UPSTREAM`** (default **`http://127.0.0.1:8283`** — self-hosted Letta)
- Passes through **SSE** for `streaming=true` message sends

In **Settings** (or `config.js`), set API base to `http://127.0.0.1:5055/api`.

### Smoke

```bash
./scripts/smoke_test.sh
```

Uses Playwright in `.venv` (see `ade-faithful-verify` Cursor rule).

## Files

| File | Role |
|------|------|
| `shell.css` | Letta-inspired layout (sidebar, nav, dashboard grid, forms primitives) |
| `ade-base.css` | Shared list/card utilities (from ade-simple) for Bootstrap pages |
| `bootstrap-ade.css` | Bootstrap overrides for dark ADE |
| `app.js` | `window.ADE` API client (stream + archival + CRUD) |
| `vendor/` | marked + DOMPurify (no CDN) |
| `config.example.js` | → `config.js` |

## Build roadmap (self-hosted)

- [x] Drop Bootstrap CDN; pure `shell.css` on agents / chat / MCP / tools / agent.
- [x] Vendor marked/DOMPurify (`vendor/`) — no CDN.
- [x] Streaming send (`streaming=true` SSE) with non-stream fallback.
- [x] Archival memory list / add / delete on agent detail.
- [x] Playwright smoke (`./scripts/smoke_test.sh`).
- [ ] Optional: semantic archival search UI; richer stream lane rendering mid-token.

## Related

- [Root README](../README.md) · [ade-simple README](../ade-simple/README.md) · [LETTA_API_COVERAGE.md](../LETTA_API_COVERAGE.md)
