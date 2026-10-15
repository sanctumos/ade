# Sanctum ADE — local-first architecture

**Goal:** Sanctum ADE v1 runs **entirely on your stack** and talks to a **local / self-hosted Letta-compatible API**. This is Sanctum’s product. Letta Cloud has (or had) its own ADE; we do not ship or track that.

---

## Principles

1. **Primary backend: local API** — Default target is Sanctum / self-hosted Letta OSS (or equivalent) on your host.
2. **Run entirely locally** — Frontend and typically the backend run on your machine or private VPS. No dependency on `app.letta.com`.
3. **Cloud drift is expected** — We follow the **local `/v1` contract**. We do not chase Letta Cloud UI or Cloud-only endpoints.

---

## Product layout (v1)

| Path | Role |
|------|------|
| `public/` | Product UI (edit and deploy here) |
| `scripts/` | Local Flask proxy, smoke, visual verify |
| `tests/` | Playwright smoke |

Config: one **API base URL** + optional **Bearer** (`public/config.js` or Settings / localStorage). All REST/SSE goes through that base.

---

## Historical scrap (`reference_materials/`)

Static snapshot of an older hosted ADE. Useful for UX archaeology only — **not** a feature checklist and **not** runnable as the product.

---

## EOL (`v0/`)

Pre-v1 trees (`ade-simple/`, React `app/`, `ade-faithful/`) live under **`v0/`**. EOL — will be removed later. See [v0/README.md](v0/README.md).

---

## Evolution

1. Keep shipping **`public/`**.
2. Ignore Cloud-only surface.
3. When the self-hosted `/v1` API evolves, adapt **`public/app.js`**.
