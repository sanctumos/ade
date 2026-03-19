# ade-faithful — Letta ADE UI (static, no Node)

Faithful **non-Node** port of the original Letta cloud ADE: same **architecture** as [`ade-simple/`](../ade-simple/) (`config.js` + `app.js` + static HTML), with **chrome and information architecture** aligned to the cloud app (sidebar: Dashboard → Projects → Chat → Agents → Tools → MCP → Settings).

## How it differs from `ade-simple/`

| | **ade-simple** | **ade-faithful** (this folder) |
|--|----------------|--------------------------------|
| Runtime | Static files, no build | Same |
| API | `window.ADE` in `app.js` | Same API surface (copy; storage keys are `ade_faithful_*` so both UIs can coexist in one browser) |
| Visual | Bootstrap + custom theme | **Letta-style shell** (`shell.css`: zinc-like tokens, brand block). Hybrid pages still use Bootstrap + `ade-base.css` for forms/lists until a full parity pass. |
| Reference | — | Compare with `reference_materials/scraped/` |

## Setup

1. `cp config.example.js config.js` and set `base` / `key`, **or** use **Settings** (localStorage overrides).
2. Open `index.html` or serve this directory over HTTP.

### Local Flask (same-origin API proxy)

From this folder:

```bash
pip install flask requests   # once
python3 temp_flask_server.py
```

- Serves the UI at **`http://127.0.0.1:5055/`**
- Proxies **`/api/*`** to **`ADE_FLASK_UPSTREAM`** (default `https://sanctum.zero1.network:8443`)

In **Settings** (or `config.js`), set API base to:

`http://127.0.0.1:5055/api`

so calls become same-origin (`/api/v1/...`) and avoid CORS. Override upstream with env `ADE_FLASK_UPSTREAM`; port with `ADE_FLASK_PORT`.

> The old `ade-simple/temp_flask_server.py` is retired — use this file only.

Optional: same as ade-simple, `python3 genconfig.py` from this folder with `ADE_BASE` / `ADE_KEY` in `.env`.

## Files

| File | Role |
|------|------|
| `shell.css` | Letta-inspired layout (sidebar, nav, dashboard grid, forms primitives) |
| `ade-base.css` | Shared list/card utilities (from ade-simple) for Bootstrap pages |
| `bootstrap-ade.css` | Bootstrap overrides for dark ADE |
| `app.js` | `window.ADE` API client (parity with ade-simple) |
| `config.example.js` | → `config.js` |

## Parity roadmap

- [ ] Replace Bootstrap blocks on agents / MCP / agent / chat with pure `shell.css` components where possible.
- [ ] Match typography and spacing to `reference_materials/scraped/pages/*.html` (measure / extract tokens).
- [ ] Optional: vendor a subset of Letta CDN CSS locally for pixel-closer match (license permitting).

## Related

- [Root README](../README.md) · [ade-simple README](../ade-simple/README.md) · [LETTA_API_COVERAGE.md](../LETTA_API_COVERAGE.md)
