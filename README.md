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

To scrape all authenticated routes (dashboard, agent list, chat, memory editor, settings):

```bash
# Install dependencies (first time)
npm install
npx playwright install chromium
npx playwright install-deps chromium   # Linux: installs libglib etc.

# Run with your Letta credentials
LETTA_EMAIL=your@email.com LETTA_PASSWORD=yourpassword npm run scrape
```

The scraper will:
1. Log in to app.letta.com
2. Save session cookies to `.cookies.json` (gitignored)
3. Visit dashboard, agents, settings, and agent detail pages
4. Save HTML to `scraped/pages/`
5. Download JS, CSS, and assets to `scraped/`

**Note:** Letta signup uses Google/GitHub OAuth. For email/password login you need an existing account.

## Source

- app.letta.com (Letta Agent Development Environment)
- web-cdn.letta.com (static CDN)

Scraped 2025-03-17.