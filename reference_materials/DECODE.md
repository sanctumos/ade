# De-minify & De-obfuscate Strategy

> **Location:** This doc lives in `reference_materials/` beside the scrape. Run `npm run decode` from the **repo root**; output goes to repo-root `scraped-beautified/` (gitignored).

**Goal:** Make the scraped JS readable and navigable so we can use it as a reference for rebuilding the local ADE. Focus on **de-minify first**, then **light de-obfuscation** (indexing, not full name restoration).

---

## What We Can Do (No Source Maps)

The scraped chunks are **minified** (single-letter vars, no newlines) and **bundled** (webpack). There are **no `.map` files** in the scrape, so we cannot restore original variable or function names automatically.

| Step | What it does | Result |
|------|----------------|--------|
| **Beautify** | Run js-beautify on every `.js` file | Readable indentation and line breaks; `e`, `t`, `r` stay. |
| **Chunk index** | Map chunk paths → route (from path) + source-file hints (from Sentry strings) | Know which file is “chat page” vs “settings/organization”. |
| **String index** | Extract API-related and env strings (`api.letta.com`, `/v1/`, `NEXT_PUBLIC_*`, `localhost:8283`) | Find where backend URLs and config live. |

---

## What We Don’t Do

- **Full de-obfuscation** — Restoring original identifiers would require source maps or manual reverse engineering; out of scope.
- **Run the beautified code** — Beautify is for reading only. The original `reference_materials/scraped/` stays the canonical copy for any proxy/serve; beautified output is in a separate dir.

---

## Output Layout

```
scraped-beautified/          # Created by npm run decode
├── _next/
│   └── static/
│       ├── css/             # unchanged copy
│       └── chunks/          # beautified .js (mirror of reference scrape)
├── DECODE_INDEX.md          # Chunk → route + source files + notable strings
└── (optional) decode-index.json
```

Original `reference_materials/scraped/` is **never modified**. All beautified JS and the index live under `scraped-beautified/`.

---

## How to Run

```bash
npm run decode
```

- Reads from `reference_materials/scraped/` and `reference_materials/_next/` (if present).
- Writes beautified JS and CSS (passthrough) to `scraped-beautified/`.
- Writes `DECODE_INDEX.md` (and optionally `decode-index.json`) with chunk → route, source-file hints, and API/env strings.

---

## Using the Index

- **Find a route:** Open `DECODE_INDEX.md`, find the route (e.g. `(logged-in)/(chat)/chat/page-*.js`), then open that file in `scraped-beautified/`.
- **Find API usage:** Search the index for “api.letta.com”, “/v1/”, “NEXT_PUBLIC”, or “localhost:8283” to see which chunks contain backend/config references.
- **Find component names:** Sentry left `data-sentry-source-file="ComponentName.tsx"` in the bundles; the index lists these so we can map chunks to original file names.

This gives us a **readable reference** and a **map** before we rebuild the local client; we don’t need to fully de-obfuscate the minified code.
