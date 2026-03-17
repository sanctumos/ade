# Sanctum ADE

Scraped frontend source from app.letta.com for reverse engineering reference. Private use in building a minimal ADE for the Sanctum fork.

## Contents

- **index.html** - Login page HTML shell
- **_next/** - Next.js static assets (CSS, JS chunks)
- **seo/** - Favicons, manifest, og-image
- **scraped/** - Authenticated pages (dashboard, agents, settings) - run scraper to populate
- **SCRAPE_NOTES.md** - Scrape details and API patterns
- **MANIFEST.md** - Full file listing

## Authenticated Scraping

Uses **GitHub OAuth** (not email/password). To scrape all authenticated routes:

```bash
# Install dependencies (first time)
npm install
npx playwright install chromium
npx playwright install --with-deps chromium   # Linux: installs libglib etc.

# Run with your GitHub credentials (for OAuth flow)
GITHUB_EMAIL=your@email.com GITHUB_PASSWORD=yourpassword npm run scrape
```

The scraper will:
1. Navigate to Letta GitHub OAuth init
2. Log in to GitHub with your credentials
3. Authorize the Letta app
4. Save session cookies to `.cookies.json` (gitignored)
5. Visit dashboard, agents, chat, memory editor, settings, and agent detail pages
6. Save HTML to `scraped/pages/`
7. Download JS, CSS, and assets to `scraped/`

## Source

- app.letta.com (Letta Agent Development Environment)
- web-cdn.letta.com (static CDN)

Scraped 2025-03-17.