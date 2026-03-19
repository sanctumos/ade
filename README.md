# Simple ADE

**Simple ADE** is a **local Agent Development Environment**: lightweight frontends that talk to **your** API (Letta OSS, Sanctum, or any compatible backend). Nothing here depends on Letta Cloud at runtime.

This repository is **product-first**: `ade-simple/` (static HTML/JS) and `app/` (Vite + React). Older **scraped snapshots** of `app.letta.com` live under [`reference_materials/`](reference_materials/) for comparison and research only.

---

## Quick start

**You need a running backend** that exposes a Letta-style HTTP API. Then pick one UI:

| Option | Setup | Run |
|--------|--------|-----|
| **Simple** (no Node) | Copy `ade-simple/config.example.js` → `ade-simple/config.js`, set `base` (+ optional `key`). | Open `ade-simple/index.html` or serve the `ade-simple/` folder. |
| **Full** (React) | `cd app && npm install` | `npm run dev` from `app/` or `npm run dev` from repo root. Optional: `app/.env` with `VITE_API_BASE`. |

Defaults target `http://localhost:8283`. Use **Settings** in either UI to set base URL and API key (browser storage).

---

## Requirements

- **Backend** implementing the expected routes (see [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md)).
- **Simple ADE:** any modern browser; optional Python for `genconfig.py`.
- **Full ADE:** Node.js 18+.

---

## Repository layout

```
.
├── README.md                 # This file
├── LETTA_API_COVERAGE.md     # API endpoints the clients use
├── LOCAL_ARCHITECTURE.md     # Design notes
├── ade-simple/               # Static ADE (primary “simple” experience)
├── app/                      # Vite + React ADE
├── package.json              # Root scripts (includes optional scrape/decode)
└── reference_materials/      # Letta cloud scrape + scraper (not used at runtime)
    ├── README.md
    ├── scraped/, _next/, seo/, index.html
    ├── scrape.js, decode.js, …
    └── DECODE.md, MANIFEST.md, SCRAPE_NOTES.md
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md) | Endpoint list and client coverage |
| [LOCAL_ARCHITECTURE.md](LOCAL_ARCHITECTURE.md) | Local-first / API-swap goals |
| [ade-simple/README.md](ade-simple/README.md) | Static app: config, CORS, troubleshooting |
| [app/README.md](app/README.md) | React app: routes, build |
| [reference_materials/README.md](reference_materials/README.md) | What the scrape is and how to re-run it |

---

## Optional: scrape & decode (reference only)

To refresh or inspect the **Letta cloud** ADE capture:

```bash
npm install
npx playwright install chromium
npm run scrape          # see reference_materials/ for output paths
npm run decode          # → scraped-beautified/ (gitignored)
```

Credentials: `GITHUB_EMAIL`, `GITHUB_PASSWORD` in repo-root `.env` (see `.env.example`). Details: [reference_materials/README.md](reference_materials/README.md).

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **API unreachable** | Backend up? Base URL in Settings / `config.js` / `VITE_API_BASE` (no trailing slash). |
| **CORS** | Allow your frontend origin on the API. |
| **401 / 403** | Set Bearer token in Settings. |

---

## Links

- **This repo:** https://github.com/sanctumos/ade  
- **Letta (cloud app, reference only):** https://app.letta.com  
