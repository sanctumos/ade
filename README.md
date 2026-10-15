# Sanctum ADE v1

**Sanctum ADE** is Sanctum’s Agent Development Environment — a static HTML/CSS/JS client for **your** self-hosted agent server (Letta-compatible `/v1` API). This is **our fork / our product**, not the Letta Cloud ADE, and it is no longer tracking Letta’s hosted app.

**Version:** **1** (current ship)

| Path | Role |
|------|------|
| **`ade-faithful/`** | Source tree (edit here) |
| **`public/`** | Deploy mirror (`scripts/mirror_public.sh`) |

**Out of scope:** Letta Cloud org/billing/OAuth, `app.letta.com`, and Cloud-only API surface. Scrapes under `reference_materials/` are historical reference only.

**Backend:** Talks to a Letta-compatible HTTP API (Sanctum / self-hosted Letta OSS). “Letta” in code and docs means that **API contract**, not Letta’s product branding.

---

## Quick start

1. Copy `ade-faithful/config.example.js` → `ade-faithful/config.js`, set `base` (and optional `key`), **or** use in-app **Settings** (localStorage).
2. Open `ade-faithful/index.html` or serve `public/` over HTTP (production).

Default API base: `http://localhost:8283`.

---

## API compatibility

Sanctum ADE expects a **single base URL** and optional **Bearer** token. Typical paths: `GET/POST /v1/agents`, agent messages, core memory blocks, tools, MCP servers, models; projects and runs as available.

**Endpoint table:** [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md).

---

## Requirements

- A backend implementing the expected `/v1` routes
- A browser (no Node required for the product UI)

---

## Repository layout

```
.
├── README.md                 # Sanctum ADE v1 (this file)
├── LICENSE                   # Dual-notice (AGPL-3.0 code + CC-BY-SA-4.0 docs)
├── LICENSE-AGPLv3
├── LICENSE-CC-BY-SA
├── ade-faithful/             # v1 source
├── public/                   # v1 deploy mirror
├── LETTA_API_COVERAGE.md     # /v1 API coverage (Letta-compatible)
├── LOCAL_ARCHITECTURE.md     # Local-first design notes
├── v0/                       # EOL trees — see v0/README.md
├── package.json              # Optional scrape tooling only
└── reference_materials/      # Historical cloud scrape (reference only)
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [ade-faithful/README.md](ade-faithful/README.md) | v1 setup, Flask proxy, smoke tests |
| [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md) | Endpoint list and client coverage |
| [LOCAL_ARCHITECTURE.md](LOCAL_ARCHITECTURE.md) | Local-first / API-swap goals |
| [v0/README.md](v0/README.md) | EOL notice only — legacy trees, will be removed |
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

## License

Dual license (same pattern as other Sanctum products):

| Material | License |
|----------|---------|
| **Software code** (JS, CSS, HTML, Python, scripts, config templates, tests, `public/` mirror) | [AGPL-3.0](LICENSE-AGPLv3) |
| **Documentation & other content** (Markdown, project images, etc.) | [CC-BY-SA-4.0](LICENSE-CC-BY-SA) |

See [LICENSE](LICENSE) for the dual-notice and third-party carve-outs (vendored libs, npm deps, `reference_materials/` scrapes).

---

## Links

- **This repo:** https://github.com/sanctumos/ade
