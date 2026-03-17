#!/usr/bin/env node
/**
 * Letta ADE Authenticated Frontend Scraper
 * Uses Playwright with GitHub OAuth (not email/password).
 * Requires: GITHUB_EMAIL (or GITHUB_USERNAME), GITHUB_PASSWORD (env vars or .env file)
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
const GITHUB_LOGIN_URL = 'https://github.com/login';

// Routes to scrape: dashboard, agents, chat, memory editor, settings
const AUTHENTICATED_ROUTES = [
  '/',
  '/dashboard',
  '/agents',
  '/agents/new',
  '/chat',
  '/memory',
  '/memory-editor',
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

/**
 * Login via GitHub OAuth flow.
 * 1. Navigate to Letta GitHub OAuth init
 * 2. Redirect to GitHub login
 * 3. Fill GitHub credentials and submit
 * 4. Handle GitHub app authorization if prompted
 * 5. Redirect back to Letta with session
 */
async function loginWithGitHub(page, githubEmail, githubPassword) {
  console.log('Starting GitHub OAuth flow...');
  // Letta GitHub OAuth init - redirect to dashboard after auth
  await page.goto(`${BASE_URL}/auth/github/init?redirect=%2Fdashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  // If we're already on Letta dashboard, we had valid cookies
  if (currentUrl.includes('app.letta.com') && !currentUrl.includes('/login') && !currentUrl.includes('/auth/')) {
    console.log('Already authenticated (cookies valid)');
    return page;
  }

  // Must be on GitHub now
  if (!currentUrl.includes('github.com')) {
    const screenshotPath = join(__dirname, 'oauth-failure.png');
    await page.screenshot({ path: screenshotPath }).catch(() => {});
    throw new Error(
      `Expected redirect to GitHub. Current URL: ${currentUrl}. Screenshot: ${screenshotPath}`
    );
  }

  // GitHub login page
  console.log('On GitHub login page, entering credentials...');
  const loginField = page.locator('input[name="login"], input#login_field').first();
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.clear();
  await loginField.fill(githubEmail);

  const passwordField = page.locator('input[name="password"], input#password').first();
  await passwordField.waitFor({ state: 'visible', timeout: 5000 });
  await passwordField.clear();
  await passwordField.fill(githubPassword);

  const signInBtn = page.locator('input[type="submit"][value="Sign in"], button[type="submit"]:has-text("Sign in")').first();
  await signInBtn.waitFor({ state: 'visible', timeout: 5000 });
  await signInBtn.click();

  // Wait for either: redirect back to Letta, or GitHub authorize page, or error
  await page.waitForTimeout(3000);

  // If GitHub shows "Authorize" page (OAuth app authorization)
  if (page.url().includes('github.com') && (await page.locator('button:has-text("Authorize"), input[value="Authorize"]').count()) > 0) {
    console.log('Authorizing Letta app on GitHub...');
    await page.locator('button:has-text("Authorize"), input[value="Authorize"]').first().click();
    await page.waitForTimeout(3000);
  }

  // Wait for redirect back to Letta (or check if already there)
  const finalUrl = page.url();
  if (finalUrl.includes('app.letta.com') && !finalUrl.includes('/login') && !finalUrl.includes('/signup') && !finalUrl.includes('/auth/')) {
    console.log('GitHub OAuth successful - back on Letta');
    return page;
  }
  if (finalUrl.includes('github.com/sessions/two-factor')) {
    throw new Error(
      'GitHub 2FA detected. This scraper does not support 2FA. Use a personal access token or disable 2FA for this account.'
    );
  }
  try {
    await page.waitForURL(
      (url) => url.includes('app.letta.com') && !url.includes('/login') && !url.includes('/auth/'),
      { timeout: 30000 }
    );
    console.log('GitHub OAuth successful - back on Letta');
  } catch (err) {
    const screenshotPath = join(__dirname, 'oauth-failure.png');
    await page.screenshot({ path: screenshotPath }).catch(() => {});
    const errText = await page.locator('[role="alert"], .flash-error, .error, #js-flash-container').first().textContent().catch(() => '');
    throw new Error(
      `GitHub OAuth failed. URL: ${page.url()}. ${errText ? `Error: ${errText}` : ''}. Screenshot: ${screenshotPath}`
    );
  }

  return page;
}

async function discoverRoutes(page) {
  const links = await page.locator('a[href^="/"]').evaluateAll((els) =>
    els.map((a) => a.getAttribute('href')).filter(Boolean)
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
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Letta ADE Scraper)' },
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(localPath, buf);
      return true;
    }
  } catch (_) {}
  return false;
}

async function main() {
  const githubEmail = process.env.GITHUB_EMAIL || process.env.GITHUB_USERNAME;
  const githubPassword = process.env.GITHUB_PASSWORD;

  if (!githubEmail || !githubPassword) {
    console.error('Please set GITHUB_EMAIL (or GITHUB_USERNAME) and GITHUB_PASSWORD environment variables.');
    console.error('Example: GITHUB_EMAIL=you@example.com GITHUB_PASSWORD=secret node scrape.js');
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);
  ensureDir(join(OUTPUT_DIR, 'pages'));
  ensureDir(join(OUTPUT_DIR, '_next'));

  const cacheDir = join(process.env.HOME || '/root', '.cache/ms-playwright');
  const chromiumDirs = ['chromium-1208', 'chromium-1207', 'chromium-1206'];
  let chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (!chromiumPath) {
    for (const d of chromiumDirs) {
      const p = join(cacheDir, d, 'chrome-linux64/chrome');
      if (existsSync(p)) {
        chromiumPath = p;
        break;
      }
    }
  }
  const launchOpts = {
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
  if (chromiumPath) launchOpts.executablePath = chromiumPath;
  const browser = await chromium.launch(launchOpts);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  });

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
        await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
        if (
          !page.url().includes('/login') &&
          !page.url().includes('/signup') &&
          !page.url().includes('/auth/')
        ) {
          loggedIn = true;
          console.log('Using saved cookies - already authenticated');
        }
      } catch (_) {}
    }
    if (!loggedIn) {
      await loginWithGitHub(page, githubEmail, githubPassword);
    }

    const cookies = await context.cookies();
    writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved to .cookies.json');

    const allRoutes = [...new Set([...AUTHENTICATED_ROUTES])];
    for (const route of allRoutes) {
      console.log(`Scraping ${route}...`);
      await scrapeRoute(page, route, context);
    }

    const agentLinks = await page
      .locator('a[href*="/agents/"]')
      .evaluateAll((els) =>
        els.map((a) => a.getAttribute('href')).filter(Boolean)
      );
    const agentIds = [
      ...new Set(
        agentLinks
          .map((h) => {
            const m = h.match(/\/agents\/([a-f0-9-]+)/);
            return m ? m[1] : null;
          })
          .filter(Boolean)
      ),
    ];
    for (const id of agentIds.slice(0, 10)) {
      await scrapeRoute(page, `/agents/${id}`, context);
    }

    const extra = [...discoveredRoutes].filter(
      (r) => !allRoutes.includes(r) && r.length > 1
    );
    for (const route of extra.slice(0, 30)) {
      console.log(`Scraping discovered ${route}...`);
      await scrapeRoute(page, route, context);
    }

    console.log('\nDownloading assets...');
    const assets = [...assetUrls].filter((u) => {
      const p = new URL(u).pathname;
      return (
        p.includes('_next') ||
        p.includes('.css') ||
        p.includes('.js') ||
        p.includes('seo')
      );
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
