> **EOL — Sanctum ADE v0.** Not maintained. Will be removed in a future release. See [v0/README.md](../README.md). Product is **Sanctum ADE v1** (`ade-faithful/` → `public/`).

# Legacy React shell (`app/`) — archaeology only

This file documents the **EOL** Vite + React prototype under `v0/app/`. It is **not** a supported product surface.

**Current product:** [Sanctum ADE v1](../../README.md) — source in `ade-faithful/`, deploy mirror in `public/`.

Do **not** link this doc from onboarding, ship checklists, or product README except via the [v0 EOL notice](../README.md).

---

## What it was

- Typed/componentized mirror of the Letta-compatible `/v1` API client (`v0/app/src/api/client.js`).
- Parallel to the Bootstrap static tree in `v0/ade-simple/`.

API function names in [LETTA_API_COVERAGE.md](../../LETTA_API_COVERAGE.md) still describe the shared contract used by **Sanctum ADE v1**.

---

## Layout (archaeology)

- Shell + routes: `Layout.jsx`, `App.jsx`, pages under `src/pages/`
- Shared UI: `ErrorBanner`, `Loading`
- Config: `VITE_API_BASE` / `VITE_API_KEY` via `app/.env` (never commit secrets)

If you ever need to open this tree locally: `cd v0/app && npm install && npm run dev`. Prefer **Sanctum ADE v1** for all real work.
