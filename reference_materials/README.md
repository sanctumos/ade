# Reference materials (Letta cloud scrape)

This folder holds **static reference captures** of Letta’s hosted ADE (`app.letta.com`) and the tooling used to refresh or inspect them. It is **not** used at runtime by Simple ADE.

| Item | Purpose |
|------|---------|
| `scraped/` | Authenticated scrape: HTML pages + `_next` assets |
| `_next/`, `seo/` | Login / marketing shell assets (older snapshot) |
| `index.html` | Scraped landing / login HTML |
| `scrape.js`, `run-scrape.sh` | Playwright scraper (GitHub OAuth) |
| `download_assets.sh` | wget helper for CDN chunks |
| `decode.js` | Beautify scraped JS → repo-root `scraped-beautified/` (gitignored) |
| `DECODE.md`, `MANIFEST.md`, `SCRAPE_NOTES.md` | Notes and inventory |

**Run scraper from repo root** (uses root `.env` and writes cookies to repo-root `.cookies.json`):

```bash
npm install && npx playwright install chromium
npm run scrape
```

Or from this folder: `./run-scrape.sh`

**Decode / chunk index:**

```bash
npm run decode
```

Output: `../scraped-beautified/` at repo root (gitignored). How it works: [DECODE.md](./DECODE.md).

The **product** in this repository is **`ade-simple/`** (no build) and **`app/`** (Vite + React). See the root [README.md](../README.md).
