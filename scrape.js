#!/usr/bin/env node
/**
 * Letta ADE Authenticated Frontend Scraper
 * Uses Playwright to log in and scrape all authenticated routes.
 * Requires: LETTA_EMAIL, LETTA_PASSWORD (env vars or .env file)
 */

import { chromium } from 'playwright';
import { createWriteStream, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if present
try {
  const env = readFileSync(join(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (_) {}
const OUTPUT_DIR = join(__dirname, 'scraped');
const COOKIES_FILE = join(__dirname, '.cookies.json');
const BASE_URL = 'https://app.letta.com';
const CDN_URL = 'https://web-cdn.letta.com';

// Routes to scrape (discovered from Next.js app structure + docs)
const AUTHENTICATED_ROUTES = [
  '/',
  '/dashboard',
  '/agents',
  '/agents/new',
  '/settings',
  '/settings/profile',
  '/settings/organization',
  '/settings/api-keys',
  '/settings/billing',
];

// Track discovered routes for dynamic scraping
const discoveredRoutes = new Set();
const assetUrls = new Set();

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

async function savePage(page, route, slug) {
  const html = await page.content();
  const safeSlug = slug || route.replace(/\//g, '_').replace(/^_/, '') || 'index';
  const outPath = join(OUTPUT_DIR, 'pages', `${safeSlug}.html`);
  ensureDir(dirname(outPath));
  createWriteStream(outPath, { flags: 'w' }).write(html);
  console.log(`  Saved: ${outPath}`);
}

async function login(page, email, password) {
  console.log('Navigating to login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Letta uses progressive disclosure: email first, then password appears after Continue
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  if ((await emailInput.count()) === 0) {
    throw new Error('Login form not found - page structure may have changed');
  }

  await emailInput.clear();
  await emailInput.fill(email);
  await page.waitForTimeout(800);

  // Letta keeps password field in DOM but hidden - use React-compatible value setter
  const passwordFilled = await page.evaluate((pwd) => {
    const pw = document.querySelector('input[type="password"]');
    if (!pw) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(pw, pwd);
    pw.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, password);
  if (!passwordFilled) {
    throw new Error('Password field not found in DOM');
  }
  await page.waitForTimeout(1000);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  await submitBtn.waitFor({ state: 'visible', timeout: 5000 });

  try {
    await Promise.all([
      page.waitForURL(url => !url.pathname.includes('/login') && !url.pathname.includes('/signup'), { timeout: 60000 }),
      submitBtn.click()
    ]);
    console.log('Login successful');
  } catch (err) {
    const screenshotPath = join(__dirname, 'login-failure.png');
    await page.screenshot({ path: screenshotPath }).catch(() => {});
    await page.waitForTimeout(2000);
    const errMsg = await page.locator('[role="alert"], .text-red-500, [data-state="error"], [data-testid="error"], [class*="error"], [class*="alert"]').first().textContent().catch(() => '');
    const currentUrl = page.url();
    throw new Error(`Login failed. Check LETTA_EMAIL and LETTA_PASSWORD. URL: ${currentUrl}. ${errMsg ? `Server: ${errMsg}` : ''}. Screenshot: ${screenshotPath}`);
  }
  return page;
}

async function discoverRoutes(page) {
  const links = await page.locator('a[href^="/"]').evaluateAll(els =>
    els.map(a => a.getAttribute('href')).filter(Boolean)
  );
  for (const href of links) {
    const path = href.split('?')[0];
    if (path.startsWith('/') && !path.startsWith('//')) {
      discoveredRoutes.add(path);
    }
  }
}

async function scrapeRoute(page, route, context) {
  try {
    const url = `${BASE_URL}${route}`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (response && response.status() >= 400) {
      console.log(`  Skip ${route}: ${response.status()}`);
      return;
    }
    await page.waitForTimeout(2000);
    const slug = route.replace(/\//g, '_').replace(/^_/, '') || 'index';
    await savePage(page, route, slug);
    await discoverRoutes(page);
  } catch (err) {
    console.log(`  Error ${route}: ${err.message}`);
  }
}

async function downloadAsset(url, baseDir) {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const localPath = join(baseDir, pathname.replace(/^\//, ''));
    const dir = dirname(localPath);
    ensureDir(dir);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Letta ADE Scraper)' } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(localPath, buf);
      return true;
    }
  } catch (_) {}
  return false;
}

async function main() {
  const email = process.env.LETTA_EMAIL;
  const password = process.env.LETTA_PASSWORD;

  if (!email || !password) {
    console.error('Please set LETTA_EMAIL and LETTA_PASSWORD environment variables.');
    console.error('Example: LETTA_EMAIL=you@example.com LETTA_PASSWORD=secret node scrape.js');
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);
  ensureDir(join(OUTPUT_DIR, 'pages'));
  ensureDir(join(OUTPUT_DIR, '_next'));

  // Prefer full Chromium over headless-shell (avoids libglib dependency in minimal envs)
  const cacheDir = join(process.env.HOME || '/root', '.cache/ms-playwright');
  const chromiumDirs = ['chromium-1208', 'chromium-1207', 'chromium-1206'];
  let chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (!chromiumPath) {
    for (const d of chromiumDirs) {
      const p = join(cacheDir, d, 'chrome-linux64/chrome');
      if (existsSync(p)) { chromiumPath = p; break; }
    }
  }
  const launchOpts = {
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
  if (chromiumPath) launchOpts.executablePath = chromiumPath;
  const browser = await chromium.launch(launchOpts);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
  });

  // Intercept network to collect asset URLs
  context.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith(BASE_URL) || url.startsWith(CDN_URL)) {
      assetUrls.add(url);
    }
    await route.continue();
  });

  const page = await context.newPage();

  try {
    let loggedIn = false;
    if (existsSync(COOKIES_FILE)) {
      try {
        const cookies = JSON.parse(readFileSync(COOKIES_FILE, 'utf8'));
        await context.addCookies(cookies);
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        if (!page.url().includes('/login') && !page.url().includes('/signup')) {
          loggedIn = true;
          console.log('Using saved cookies - already authenticated');
        }
      } catch (_) {}
    }
    if (!loggedIn) {
      await login(page, email, password);
    }

    // Save cookies for future runs
    const cookies = await context.cookies();
    writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved to .cookies.json');

    // Scrape known routes
    const allRoutes = [...new Set([...AUTHENTICATED_ROUTES])];
    for (const route of allRoutes) {
      console.log(`Scraping ${route}...`);
      await scrapeRoute(page, route, context);
    }

    // Scrape agent detail pages if we have agents
    const agentLinks = await page.locator('a[href*="/agents/"]').evaluateAll(els =>
      els.map(a => a.getAttribute('href')).filter(Boolean)
    );
    const agentIds = [...new Set(agentLinks.map(h => {
      const m = h.match(/\/agents\/([a-f0-9-]+)/);
      return m ? m[1] : null;
    }).filter(Boolean))];
    for (const id of agentIds.slice(0, 5)) {
      await scrapeRoute(page, `/agents/${id}`, context);
    }

    // Scrape any discovered routes
    const extra = [...discoveredRoutes].filter(r => !allRoutes.includes(r) && r.length > 1);
    for (const route of extra.slice(0, 20)) {
      console.log(`Scraping discovered ${route}...`);
      await scrapeRoute(page, route, context);
    }

    // Download assets
    console.log('\nDownloading assets...');
    const assets = [...assetUrls].filter(u => {
      const p = new URL(u).pathname;
      return p.includes('_next') || p.includes('.css') || p.includes('.js') || p.includes('seo');
    });
    let downloaded = 0;
    for (const url of assets) {
      if (await downloadAsset(url, OUTPUT_DIR)) downloaded++;
    }
    console.log(`Downloaded ${downloaded} assets`);

  } finally {
    await browser.close();
  }

  console.log('\nScrape complete. Output saved to:', OUTPUT_DIR);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
