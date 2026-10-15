# Sanctum ADE (self-hosted Letta)

**Product target:** a **self-hosted-only** Agent Development Environment. Static HTML/CSS/JS that talks to **your** Letta OSS / Sanctum Letta server. **Letta is the server** — this UI never replaces it and never talks to Letta Cloud.

**Out of scope:** org/billing/members/usage, Cloud OAuth, `app.letta.com`, and chasing Cloud API drift. Cloud scrape under `reference_materials/` is **historical scrap only**, not a design or feature mandate.

- **`ade-faithful/`** — **ship target** (static, no Node). Shell + agents / chat / memory / tools / MCP / settings against self-hosted `/v1/*`.
- **`ade-simple/`** — earlier Bootstrap twin (same API surface; keep for now).

The **`app/`** folder is a **legacy React prototype**—not the product. Maintainer notes: [docs/dev-react-shell.md](docs/dev-react-shell.md).

---

## Quick start

**You need a running backend** that exposes a Letta-style HTTP API.

1. Pick **`ade-simple/`** or **`ade-faithful/`**; copy `config.example.js` → `config.js`, set `base` (and optional `key`), **or** use **Settings** (localStorage).
2. Open `index.html` in that folder or serve it over HTTP.

Default API base: `http://localhost:8283`.

---

## API compatibility

Simple ADE expects a **single base URL** and optional **Bearer** token. Typical paths include `GET/POST /v1/agents`, agent messages, core memory blocks, tools, MCP servers, and models; projects and runs are optional. If your backend differs, change **`ade-simple/app.js`** / **`ade-faithful/app.js`** (and the legacy **`app/src/api/client.js`** only if you still maintain parity there).

**Full endpoint table:** [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md).

---

## Requirements

- **Backend** implementing the expected routes (see [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md)).
- **Browser**; optional Python 3 for `ade-simple/genconfig.py`. No Node required for the product UI.

---

## Repository layout

```
.
├── README.md                 # This file
├── docs/
│   └── dev-react-shell.md    # Legacy app/ — dev-only notes
├── LETTA_API_COVERAGE.md     # API endpoints the client uses
├── LOCAL_ARCHITECTURE.md     # Local-first design notes
├── ade-simple/               # Simple ADE (Bootstrap UI)
├── ade-faithful/             # Same static arch.; Letta-like shell — see ade-faithful/README.md
├── app/                      # Legacy Vite/React shell — see docs/dev-react-shell.md
├── package.json              # Optional scrape/decode + legacy dev script
└── reference_materials/      # Letta cloud scrape (reference only)
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md) | Endpoint list and client coverage |
| [LOCAL_ARCHITECTURE.md](LOCAL_ARCHITECTURE.md) | Local-first / API-swap goals |
| [ade-simple/README.md](ade-simple/README.md) | Static app: config, CORS, troubleshooting |
| [ade-faithful/README.md](ade-faithful/README.md) | Letta-faithful static UI (no Node) |
| [docs/dev-react-shell.md](docs/dev-react-shell.md) | Legacy `app/` tree — maintainer notes only |
| [reference_materials/README.md](reference_materials/README.md) | Scrape assets & tooling |

---

## Optional: scrape & decode (reference only)

```bash
npm install
npx playwright install chromium
npm run scrape          # see reference_materials/
npm run decode          # → scraped-beautified/ (gitignored)
```

Credentials: repo-root `.env` (see `.env.example`).

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **API unreachable** | Backend up? Base URL in Settings or `config.js` (no trailing slash). |
| **CORS** | Allow your frontend origin on the API. |
| **401 / 403** | Set Bearer token in Settings. |

---

## Links

- **This repo:** https://github.com/sanctumos/ade  
- **Letta (cloud app, reference only):** https://app.letta.com  
