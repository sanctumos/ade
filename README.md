# Letta ADE Scrape

Scraped frontend source from **app.letta.com** (Letta Agent Development Environment) for reverse engineering reference. Private use in building a minimal ADE for the Sanctum fork.

**Scrape date:** March 17, 2025  
**Authentication:** GitHub OAuth (all pages captured with authenticated session)

---

## What Was Scraped

### Summary

| Category | Count |
|----------|-------|
| **HTML Pages** | 17 |
| **Static Assets** | 77 (JS, CSS, fonts) |
| **Total Files** | 92+ |

### Pages Captured

All pages were captured via authenticated GitHub OAuth session.

#### Main Application

| File | Route | Description |
|------|-------|-------------|
| `index.html` | `/` | Main dashboard (projects overview) - landing after login |
| `projects.html` | `/projects` | Projects main dashboard - project list and creation |
| `chat.html` | `/chat` | Chat interface for conversing with agents |
| `agents_new.html` | `/agents/new` | Create new agent form and configuration |

#### Settings (Profile & Account)

| File | Route | Description |
|------|-------|-------------|
| `settings.html` | `/settings` | Settings hub / navigation |
| `settings_profile.html` | `/settings/profile` | User profile settings |
| `settings_account.html` | `/settings/account` | Account settings |

#### Settings (Organization)

| File | Route | Description |
|------|-------|-------------|
| `settings_organization.html` | `/settings/organization` | Organization overview |
| `settings_organization_settings.html` | `/settings/organization/settings` | Organization general settings |
| `settings_organization_members.html` | `/settings/organization/members` | Team members management |
| `settings_organization_members_invite-rules.html` | `/settings/organization/members/invite-rules` | Invite rules configuration |
| `settings_organization_projects.html` | `/settings/organization/projects` | Organization projects |
| `settings_organization_billing.html` | `/settings/organization/billing` | Billing and subscription |
| `settings_organization_usage.html` | `/settings/organization/usage` | Usage metrics and quotas |
| `settings_organization_api-logs.html` | `/settings/organization/api-logs` | API request logs |
| `settings_organization_integrations.html` | `/settings/organization/integrations` | Third-party integrations |
| `settings_organization_rate-limits.html` | `/settings/organization/rate-limits` | Rate limit configuration |

### Static Assets (77 files)

- **CSS:** 14 stylesheets in `scraped/_next/static/css/`
- **JavaScript:** 48 chunks (webpack, polyfills, main-app, route-specific bundles)
- **Fonts:** 1 woff2 font in `scraped/_next/static/media/`
- **SEO:** favicon.svg in `scraped/seo/`
- **CDN:** Cloudflare email-decode script in `scraped/cdn-cgi/`

See **MANIFEST.md** for the complete file listing.

---

## Local-first & API disentanglement

The goal is to **run an ADE entirely locally** that **primarily interfaces with the local API** (Letta OSS, Sanctum, or equivalent). The scrape is reference; a rebuilt local client will default to that local backend. Letta Cloud has its own ADE at app.letta.com—as Cloud drifts from OSS, that’s fine; this ADE serves the local stack.

- **Architecture:** [LOCAL_ARCHITECTURE.md](LOCAL_ARCHITECTURE.md) — primary = local API, options (rebuild vs proxy), and `API_BASE_URL` defaulting to local.
- **Config:** `.env.example` documents scraper credentials (`GITHUB_EMAIL`, `GITHUB_PASSWORD`) and the future `API_BASE_URL` for the local client (default: local backend).
- **De-minify first:** [DECODE.md](DECODE.md) — run `npm run decode` to beautify scraped JS and build a chunk/source index in `scraped-beautified/` (gitignored). Use that to read the code and find API/config references before rebuilding.
- **Run the local ADE:**  
  - **Simple (no Node):** [ade-simple/](ade-simple/) — plain HTML/CSS/JS. Copy `config.example.js` to `config.js`, set base URL and key, then open `index.html` or serve the folder. Optional: `python3 genconfig.py` to generate `config.js` from a `.env` file.  
  - **Full (Vite + React):** `cd app && npm install && npm run dev`. Set `VITE_API_BASE` in `app/.env` (default `http://localhost:8283`).

---

## Directory Structure

```
.
├── README.md             # This file
├── LOCAL_ARCHITECTURE.md # Local-first, API-disentanglement plan
├── DECODE.md             # De-minify / de-obfuscate strategy (npm run decode)
├── MANIFEST.md           # Full scraped file listing
├── SCRAPE_NOTES.md       # Technical notes, API patterns, issues
├── scrape.js             # Playwright scraper (GitHub OAuth)
├── decode.js             # Beautify scraped JS + build chunk index
├── ade-simple/           # No-Node ADE: HTML/CSS/JS + config.js (or .env → genconfig.py)
├── app/                  # Local ADE frontend (Vite + React)
│   ├── src/
│   │   ├── api/client.js # Single API client (VITE_API_BASE)
│   │   ├── pages/       # Dashboard, Projects, Agents, Chat
│   │   └── components/
│   └── package.json
├── run-scrape.sh       # Helper to run scraper with .env
├── package.json
├── index.html          # Login page HTML (unauthenticated)
├── _next/              # Static assets (login page)
├── seo/                # Favicons, manifest (root level)
└── scraped/            # Authenticated scrape output
    ├── pages/          # 17 HTML pages (dashboard, chat, agents, settings)
    ├── _next/          # Static assets (JS, CSS, fonts)
    ├── seo/            # Favicon
    └── cdn-cgi/        # Cloudflare scripts
```

---

## How to Run the Scraper

### Prerequisites

- Node.js 18+
- GitHub account (OAuth is the only supported auth method)

### Setup

```bash
# Install dependencies
npm install
npx playwright install chromium

# Linux: install browser dependencies (libglib, etc.)
npx playwright install --with-deps chromium
```

### Running the Scrape

**Option 1: Environment variables**

```bash
GITHUB_EMAIL=your@email.com GITHUB_PASSWORD=yourpassword npm run scrape
```

**Option 2: .env file**

Create `.env` (gitignored):

```
GITHUB_EMAIL=your@email.com
GITHUB_PASSWORD=yourpassword
```

Then run:

```bash
./run-scrape.sh
# or
npm run scrape
```

**Option 3: Headed mode (visible browser)**

```bash
HEADLESS=false GITHUB_EMAIL=... GITHUB_PASSWORD=... npm run scrape:headed
```

### What the Scraper Does

1. Navigates to Letta GitHub OAuth init (`/auth/github/init`)
2. Logs in to GitHub with your credentials
3. Authorizes the Letta app (first time only)
4. Saves session cookies to `.cookies.json` (gitignored) for reuse
5. Visits all authenticated routes: dashboard, projects, chat, agents/new, settings/*
6. Saves HTML to `scraped/pages/`
7. Downloads JS, CSS, and assets to `scraped/_next/`

### GitHub 2FA

The scraper does **not** support GitHub 2FA. If your account has 2FA enabled, use a personal access token or a secondary account without 2FA.

---

## What Each Page Contains

- **Projects** (`projects.html`): Project list, create project, project cards
- **Chat** (`chat.html`): Chat UI, message input, agent selection
- **Agents/New** (`agents_new.html`): Agent creation form, model selection, instructions
- **Settings hub** (`settings.html`): Navigation to profile, account, organization
- **Profile** (`settings_profile.html`): Name, avatar, preferences
- **Account** (`settings_account.html`): Email, password, connected accounts
- **Organization** (all `settings_organization_*.html`): Team management, billing, usage, API logs, integrations, rate limits, invite rules

All pages are Next.js React apps. The HTML is the initial shell; most content is rendered client-side via the JS chunks.

---

## Limitations & Notes

1. **Static snapshot only:** HTML captures the DOM at scrape time. Dynamic content (API responses, real-time data) is not captured. The pages require the JS bundles to hydrate and function.

2. **Asset URLs:** HTML references `web-cdn.letta.com` for assets. For fully offline use, you would need to rewrite paths to local `scraped/_next/`.

3. **No API data:** Chat history, agent configs, project data come from `api.letta.com`. These are not in the scrape.

4. **OAuth only:** Letta signup/login is OAuth-only (Google/GitHub). Email/password requires an existing account.

5. **Agent detail pages:** Individual agent pages (`/agents/{id}`) are only scraped if links were discovered during the run (up to 10). Your org may have different agents.

6. **Session expiry:** Cookies in `.cookies.json` expire. Re-run the scraper when sessions expire.

---

## Source

- **App:** https://app.letta.com
- **CDN:** https://web-cdn.letta.com
- **API:** https://api.letta.com (not scraped)

---

## Repository

https://github.com/sanctumos/ade
