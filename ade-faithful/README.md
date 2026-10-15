# Sanctum ADE v1 (source)

Static HTML/CSS/JS Agent Development Environment for **Sanctum**. Talks to a **Letta-compatible** self-hosted `/v1` API. No Cloud, no Node build.

Deploy mirror: repo-root **`public/`** (run `scripts/mirror_public.sh` after edits).

## Setup

1. `cp config.example.js config.js` and set `base` / `key`, **or** use **Settings** (localStorage overrides).
2. Open `index.html` or serve this directory / `public/` over HTTP.

### Local Flask (same-origin API proxy)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
ADE_FLASK_UPSTREAM=http://127.0.0.1:8283 .venv/bin/python temp_flask_server.py
```

- UI at **`http://127.0.0.1:5055/`**
- Proxies **`/api/*`** to **`ADE_FLASK_UPSTREAM`** (default Letta-compatible server on `:8283`)
- Passes through **SSE** for `streaming=true` message sends

In **Settings**, set API base to `http://127.0.0.1:5055/api`.

### Smoke

```bash
./scripts/smoke_test.sh
```

Uses Playwright in `.venv` (see `ade-faithful-verify` Cursor rule).

## Files

| File | Role |
|------|------|
| `shell.css` / `skins/` | Sanctum ADE chrome + skins |
| `tip.js` | Shared CPH-style tooltips |
| `app.js` | `window.ADE` API client (stream + archival + CRUD) |
| `chat-sidecar.js` | Context meter + memory panel |
| `vendor/` | marked + DOMPurify (no CDN) |
| `config.example.js` | → `config.js` |

## License

Same as the repo root: **code** [AGPL-3.0](../LICENSE-AGPLv3), **docs** [CC-BY-SA-4.0](../LICENSE-CC-BY-SA). See [LICENSE](../LICENSE). Vendored files under `vendor/` keep their upstream licenses.

## Related

- [Root README](../README.md) · [LETTA_API_COVERAGE.md](../LETTA_API_COVERAGE.md) · [v0 EOL](../v0/README.md)
