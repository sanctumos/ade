# Local-First ADE Architecture

**Goal:** Rebuild an Agent Development Environment that runs **entirely locally** and talks **primarily to the local API** (Letta OSS, Sanctum, or equivalent). This ADE is for the self-hosted / OSS stack. Letta Cloud has its own ADE at app.letta.com; as Cloud drifts from OSS, that’s fine—the Cloud ADE serves Cloud. This one serves the local API.

---

## Principles

1. **Primary backend: local API** — This client is built to interface with a local or self-hosted backend (e.g. Letta OSS on localhost, or a Sanctum API). That is the default and main target.
2. **Run entirely locally** — Frontend (and typically the backend) run on the user’s machine or private host. No requirement to use app.letta.com for the UI.
3. **Cloud drift is expected** — Letta Cloud and OSS will diverge. We don’t chase Cloud here. The Cloud ADE remains at app.letta.com for Cloud users. This codebase follows the **local/OSS API**; if we ever add optional Cloud support, it’s secondary (e.g. for dev/testing), not the primary path.

---

## Current State (Scraped Frontend)

- The contents of `scraped/` are a **static snapshot** of app.letta.com: HTML shells + minified Next.js bundles.
- Those bundles contain **hardcoded references** to:
  - **App host:** e.g. `https://app.letta.com`, `NEXT_PUBLIC_CURRENT_HOST`
  - **API:** Likely baked into shared chunks (base URL for agents, chat, memory, etc.)
- **Implications:**
  - The scraped JS cannot be “configured” without patching minified code (fragile).
  - To **run locally** and **disentangle** from Letta Cloud we need either a **proxy** (short-term) or a **rebuilt client** (recommended).

---

## Paths to a Local, API-Agnostic ADE

### Option A: Rebuild a thin local client (recommended)

- Build a **new minimal frontend** (e.g. React/Vite or Next) that:
  - Recreates the key flows: **dashboard → projects → agents → chat** (and optionally settings).
  - Uses a **single API client** that reads its base URL from **build-time or runtime config** (e.g. `VITE_API_BASE` / `NEXT_PUBLIC_API_BASE` or a small runtime config endpoint).
- **API base URL** is the only place that knows “cloud vs OSS vs Sanctum”. All requests go through this base.
- Benefits: Full control, works offline/local, easy to adapt when OSS/cloud APIs diverge; no dependency on scraped minified code.

### Option B: Proxy in front of scraped static site (short-term)

- Serve the scraped HTML/JS as-is from a local static server.
- Run a **local reverse proxy** that:
  - Serves the static files.
  - Intercepts requests to `https://api.letta.com` and forwards them to a configurable backend (e.g. local Letta OSS or a Sanctum API).
- The browser still “thinks” it’s talking to api.letta.com; the proxy swaps the backend.
- Benefits: No rebuild; can test against local OSS quickly. Drawbacks: Tied to scraped assets and their request shapes; brittle as Letta changes their client.

### Option C: Patch scraped JS (not recommended)

- Search-and-replace in minified bundles to replace `api.letta.com` with a placeholder and inject base URL at runtime. Fragile with bundling and updates; only consider for one-off experiments.

---

## Recommended: Single API Base Config

For the **rebuilt local client** (Option A), standardize on one configurable base. **Default and primary:** local API.

| Env / config       | Purpose |
|--------------------|--------|
| `API_BASE_URL` or `NEXT_PUBLIC_API_BASE` | Base URL for all REST calls. **Default:** local backend (e.g. `http://localhost:8283` for Letta OSS or your Sanctum API). |
| Optional: `APP_HOST` | Only if the client needs to build absolute URLs (e.g. invite links). Default to same origin when running locally. |

- **Primary: local / OSS** — `API_BASE_URL=http://localhost:8283` (or your Letta OSS / Sanctum URL). Auth: API key or local auth as the backend expects.
- **Optional: Cloud** — If we ever support talking to Letta Cloud from this client (e.g. for dev), set `API_BASE_URL=https://api.letta.com`. Not the main use case; Cloud has its own ADE.

As the local/OSS API evolves (or we switch to a Sanctum backend), we adapt the API client layer here; we don’t track Cloud’s drift.

---

## What “Run Entirely Locally” Means

- **Frontend:** Served from localhost (e.g. `npm run dev` or static server). No dependency on app.letta.com for HTML/JS.
- **Backend:** **Primary:** Letta OSS or Sanctum (or equivalent) running locally (Docker / native). `API_BASE_URL` points at it by default. The Cloud ADE (app.letta.com) stays the interface for Letta Cloud; we don’t replicate that here.
- **Auth:** Whatever the local API expects (e.g. API key, local session).

---

## Next Steps

1. **Short-term:** Use the scrape as **reference only** (layout, routes, copy). Optionally run an **API proxy** (Option B) to point the scraped app at a local backend for quick validation.
2. **Medium-term:** Implement **Option A** — minimal local ADE that talks **primarily to the local API** (default `API_BASE_URL` = local backend), matching the key flows from the scrape (dashboard, projects, agents, chat).
3. **When OSS (or our backend) evolves:** Adapt the API client layer here. We don’t track Cloud; the Cloud ADE handles Cloud.
