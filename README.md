# ADE (Agent Development Environment) — Local

This repo contains a **scraped reference** of Letta’s cloud ADE (app.letta.com) and **two runnable local ADEs** that talk to your own API (Letta OSS, Sanctum, or any compatible backend). No dependency on Letta Cloud at runtime.

---

## Table of contents

- [Quick start](#quick-start)
- [Requirements](#requirements)
- [API compatibility](#api-compatibility)
- [Documentation index](#documentation-index)
- [Directory structure](#directory-structure)
- [Run the local ADE](#run-the-local-ade)
- [Scraper (reference capture)](#how-to-run-the-scraper)
- [What was scraped](#what-was-scraped)
- [Limitations & notes](#limitations--notes)
- [Troubleshooting](#troubleshooting)
- [Source & repository](#source--repository)

---

## Quick start

**You need a running backend** that exposes the API (see [API compatibility](#api-compatibility)). Then choose one:

| Option | Install | Run |
|--------|--------|-----|
| **Simple (no Node)** | Copy `ade-simple/config.example.js` → `ade-simple/config.js`, set `base` (and optional `key`). | Open `ade-simple/index.html` in a browser, or serve the `ade-simple/` folder with any web server. |
| **Full (Vite + React)** | `cd app && npm install` | `npm run dev` (from `app/` or `npm run dev` from repo root). Set `VITE_API_BASE` in `app/.env` if needed. |

Both UIs default to `http://localhost:8283` as the API base. Use **Settings** in either app to change base URL and API key without editing files (saved in the browser).

---

## Requirements

- **Backend:** A running instance that speaks the API (Letta OSS, Sanctum, or compatible). The ADE is only a frontend; it does not start or manage the backend.
- **Simple ADE:** Any browser; optional Python 3 if you use `.env` + `genconfig.py`. No Node.
- **Full ADE:** Node.js 18+ (for install and dev server). Build output is static and can be served by anything.
- **Scraper (optional):** Node.js 18+, Playwright, GitHub account (no 2FA) if you want to re-run the reference scrape.

---

## API compatibility

Both local ADEs call a **single base URL** with optional **Bearer token** (`Authorization: Bearer <key>`). They expect Letta-style endpoints; your backend may use slightly different shapes. For **full endpoint coverage** (including delete, cancel, runs, tool CRUD, MCP refresh), see [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md).

| Method + path | Purpose |
|--------------|--------|
| `GET /health` or `GET /v1/health` | Optional; dashboard “API connected”. |
| `GET /v1/agents`, `GET /v1/agents/:id` | List / get agents. |
| `POST /v1/agents`, `PATCH /v1/agents/:id`, `DELETE /v1/agents/:id` | Create, update, delete agent. |
| `GET /v1/agents/:id/messages`, `POST /v1/agents/:id/messages` | List history, send message. |
| `POST /v1/agents/:id/messages/cancel` | Cancel runs (optional). |
| `GET/PATCH /v1/agents/:id/core-memory/blocks/:label` | Get/update memory block (e.g. `persona`). |
| `GET /v1/models`, `GET /v1/models/embedding` | List LLM / embedding models. |
| `GET /v1/tools`, `GET /v1/tools/:id`, `POST/PATCH/DELETE /v1/tools` | List, get, create, update, delete tools. |
| `GET/POST /v1/mcp-servers`, `GET/PATCH/DELETE /v1/mcp-servers/:id` | MCP server CRUD. |
| `PATCH /v1/mcp-servers/:id/refresh`, `GET /v1/mcp-servers/:id/tools` | Refresh MCP tools, list tools. |
| `GET /v1/projects`, `POST /v1/projects`, `GET/PATCH/DELETE /v1/projects/:id` | Optional; Projects (full app). |
| `GET /v1/runs`, `GET /v1/runs/:id`, `GET /v1/runs/:id/messages` | Optional; run-centric history. |

If your backend uses different paths or field names, adapt the API layer in `app/src/api/client.js` or `ade-simple/app.js`.

---

## Documentation index

| Doc | Description |
|-----|-------------|
| [LETTA_API_COVERAGE.md](LETTA_API_COVERAGE.md) | Letta API endpoint list, cloud vs local, 100% client coverage. |
| [LOCAL_ARCHITECTURE.md](LOCAL_ARCHITECTURE.md) | Local-first goals, API-as-swap-point, Cloud vs OSS. |
| [DECODE.md](DECODE.md) | De-minify scraped JS (`npm run decode`), chunk index, no source maps. |
| [MANIFEST.md](MANIFEST.md) | Full list of scraped files. |
| [SCRAPE_NOTES.md](SCRAPE_NOTES.md) | Scrape tech notes, API patterns, issues. |
| [ade-simple/README.md](ade-simple/README.md) | Simple ADE: setup, config, .env, troubleshooting. |
| [app/README.md](app/README.md) | Full ADE: run, build, routes, troubleshooting. |

---

## Directory structure

```
.
├── README.md               # This file
├── LOCAL_ARCHITECTURE.md   # Local-first, API-disentanglement plan
├── DECODE.md               # De-minify strategy (npm run decode)
├── MANIFEST.md             # Full scraped file listing
├── SCRAPE_NOTES.md         # Technical notes, API patterns
├── scrape.js               # Playwright scraper (GitHub OAuth)
├── run-scrape.sh           # Run scraper with .env
├── decode.js               # Beautify scraped JS + build chunk index
├── package.json            # Scraper + decode scripts (npm run dev → app)
├── .env.example            # GITHUB_* for scraper; API_BASE_URL for reference
│
├── ade-simple/             # No-Node ADE (HTML/CSS/JS)
│   ├── config.example.js   # Copy to config.js and edit
│   ├── config.js           # Your base URL + key (gitignored)
│   ├── app.js              # API helpers
│   ├── index.html, agents.html, agent.html, chat.html, settings.html
│   ├── styles.css
│   ├── genconfig.py        # Optional: .env → config.js
│   └── README.md
│
├── app/                    # Full ADE (Vite + React)
│   ├── src/api/client.js, pages/, components/
│   ├── package.json
│   └── README.md
│
├── index.html, _next/, seo/   # Root: login-page scrape assets
└── scraped/                   # Authenticated scrape output
    ├── pages/                  # 17 HTML pages
    └── _next/                  # JS, CSS, fonts
```

---

## Run the local ADE

### Simple (no Node)

1. **Config:** `cd ade-simple && cp config.example.js config.js`. Edit `config.js`: set `base` to your API URL (e.g. `http://localhost:8283`), and `key` if your backend requires a Bearer token.
2. **Optional .env:** Create `ade-simple/.env` with `ADE_BASE=...` and `ADE_KEY=...`, then run `python3 genconfig.py` to generate `config.js`.
3. **Run:** Open `ade-simple/index.html` in a browser, or serve the `ade-simple/` folder (nginx, Apache, PHP, etc.). You can also use **Settings** in the app to set base URL and key (stored in this browser only).

See [ade-simple/README.md](ade-simple/README.md) for details and troubleshooting.

### Full (Vite + React)

1. **Install:** `cd app && npm install`
2. **Config:** Create `app/.env` with `VITE_API_BASE=http://localhost:8283` (or your backend URL). Default is already `http://localhost:8283`.
3. **Run:** `npm run dev` (from `app/` or `npm run dev` from repo root). Open the URL Vite prints (e.g. http://localhost:5173).
4. **API key:** In the app, open **Settings** and enter a Bearer token if needed (stored in localStorage).

See [app/README.md](app/README.md) for routes, build, and troubleshooting.

---

## How to run the scraper

The scraper captures app.letta.com (authenticated) as a **static reference**. You only need it if you want to refresh or inspect the scrape.

### Prerequisites

- Node.js 18+
- GitHub account (OAuth; 2FA not supported — use an account without 2FA or a PAT)

### Setup

```bash
npm install
npx playwright install chromium
# Linux: npx playwright install --with-deps chromium
```

### Run

```bash
# Option 1: env vars
GITHUB_EMAIL=your@email.com GITHUB_PASSWORD=yourpassword npm run scrape

# Option 2: .env file (create from .env.example)
./run-scrape.sh
# or
npm run scrape

# Option 3: headed (visible browser)
HEADLESS=false GITHUB_EMAIL=... GITHUB_PASSWORD=... npm run scrape:headed
```

The scraper logs in via GitHub OAuth, saves cookies to `.cookies.json`, visits dashboard/projects/chat/agents/settings, and writes HTML to `scraped/pages/` and assets to `scraped/_next/`.

### De-minify (optional)

To beautify scraped JS and build a chunk/source index (for reading the code):

```bash
npm run decode
```

Output goes to `scraped-beautified/` (gitignored). See [DECODE.md](DECODE.md).

---

## What was scraped

- **Source:** app.letta.com (Letta Agent Development Environment).  
- **Date:** March 17, 2025.  
- **Auth:** GitHub OAuth; 17 HTML pages + 77+ static assets (JS, CSS, fonts).

Main routes captured: `/` (dashboard), `/projects`, `/chat`, `/agents/new`, `/settings`, `/settings/profile`, `/settings/account`, `/settings/organization/*` (settings, members, billing, usage, api-logs, integrations, rate-limits). See [MANIFEST.md](MANIFEST.md) for the full list.

The scrape is **reference only**: static HTML + minified JS; no API data. The local ADEs in `ade-simple/` and `app/` are separate implementations that talk to your own API.

---

## Limitations & notes

1. **Scrape:** Static snapshot only; no API data. Asset URLs in HTML point to web-cdn.letta.com; for offline use you’d rewrite to local paths.
2. **Scraper:** No GitHub 2FA; cookies expire — re-run when needed.
3. **Local ADEs:** They only work with a backend that implements the expected endpoints (see [API compatibility](#api-compatibility)). CORS must allow requests from the origin where you serve the frontend.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **Dashboard shows “API: Unreachable”** | Backend not running or wrong URL. Check base URL in Settings or `config.js` / `VITE_API_BASE`. Ensure no trailing slash in base. |
| **CORS errors in browser** | Backend must allow the origin of the ADE (e.g. `file://`, or the domain where you serve the HTML). Configure CORS on the API server. |
| **401 / 403 on API calls** | Backend may require a Bearer token. Set API key in Settings (or in `config.js` / `VITE_API_KEY`). |
| **Simple ADE: “config.js 404” or blank page** | Copy `config.example.js` to `config.js` in `ade-simple/`. Or use Settings so the app uses localStorage instead. |
| **Full ADE: build or dev fails** | Run from `app/`: `npm install` then `npm run dev`. Node 18+ required. |
| **Scraper: “Expected redirect to GitHub”** | Check credentials; disable 2FA or use a different GitHub account. |

---

## Source & repository

- **Letta app (scraped):** https://app.letta.com  
- **Letta API (reference):** https://api.letta.com (not scraped; see [SCRAPE_NOTES.md](SCRAPE_NOTES.md) for patterns.)  
- **This repo:** https://github.com/sanctumos/ade  
