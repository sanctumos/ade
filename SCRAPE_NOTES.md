# Letta ADE Frontend Scrape Notes

**Source:** app.letta.com  
**Date:** March 17, 2025  
**Purpose:** Reverse engineering for Sanctum fork - private use, minimal frontend reference.

## What Was Fetched

### Structure
- **Framework:** Next.js (evident from `_next/static`, `data-sentry-source-file="layout.tsx"`)
- **CDN:** web-cdn.letta.com serves static assets
- **Entry:** app.letta.com serves HTML shell

### Assets Downloaded
- **CSS:** 6 stylesheets (~17MB total with _next)
- **JS:** 40+ chunks (webpack, polyfills, main-app, app routes, vendor chunks)
- **SEO:** favicons, apple-touch-icon, og-image, site.webmanifest

### Routes Captured (login page)
- `/` - Login page
- `/signup` - Sign up
- `/auth/google/init`, `/auth/github/init` - OAuth
- `/forgot-password`, `/login/sso` - Auth flows

### API Patterns (from docs.letta.com)
- **Base:** `https://api.letta.com` (cloud) or self-hosted URL
- **Auth:** `Authorization: Bearer <api_key>`
- **Headers:** `Content-Type: application/json`

Key endpoints:
- `GET/POST /v1/agents/` - Agent CRUD
- `GET/POST /v1/agents/{id}/messages` - Chat
- `GET/PATCH /v1/agents/{id}/core-memory/blocks/{label}` - Memory
- `GET /v1/models/`, `GET /v1/tools/` - Config

## File Layout

```
_next/static/
  css/          - 6 CSS bundles
  chunks/       - JS bundles (webpack, polyfills, app routes)
seo/            - Favicons, manifest, og-image
index.html      - Main HTML shell (login page)
```

## Authenticated Scraping (Playwright)

A Playwright scraper (`scrape.js`) handles authenticated routes:

- **Auth:** Email/password login; cookies saved to `.cookies.json` for reuse
- **Routes:** `/`, `/dashboard`, `/agents`, `/agents/new`, `/settings/*`, agent detail pages
- **Output:** `scraped/pages/*.html`, `scraped/_next/` (assets)
- **Run:** `LETTA_EMAIL=... LETTA_PASSWORD=... npm run scrape`

## Issues Encountered

1. **Login-only capture:** Only the login page was fetched. Authenticated routes (dashboard, agent list, chat) require session; those chunks would load on navigation.
2. **Dynamic chunks:** Next.js loads route-specific chunks on demand. Full dashboard would need authenticated session + browser to capture.
3. **API calls:** Network patterns require runtime inspection; not captured in static scrape.
4. **Signup:** Letta signup is OAuth-only (Google/GitHub); email/password requires existing account.

## Usage

For local reference: serve `index.html` and `_next/` with a static server. Asset URLs in index.html point to web-cdn.letta.com - for fully offline use, rewrite paths to local `_next/` and `seo/`.
