# ADE (Local) — Full frontend

Vite + React ADE that runs locally and talks to your **local API** (Letta OSS, Sanctum, or compatible backend). More routes and UI than the simple HTML version; requires Node for install and dev.

---

## Prerequisites

- **Node.js 18+**
- A **running API** that implements the endpoints the ADE expects. See the root [README — API compatibility](../README.md#api-compatibility).

---

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (e.g. http://localhost:5173). From the repo root you can run `npm run dev` (it runs `cd app && npm run dev`).

---

## Configure

- **API base:** Create `app/.env` with:
  ```bash
  VITE_API_BASE=http://localhost:8283
  ```
  Default is `http://localhost:8283`. Rebuild or restart dev after changing.

- **API key:** In the app, open **Settings** and enter a Bearer token if your backend requires it. Stored in localStorage (no rebuild needed).

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — API health, agent count, links to Projects / Agents / Chat. |
| `/projects` | List projects (if backend has `/v1/projects`), create new. |
| `/projects/:id` | Project detail, agents in project. |
| `/agents` | List agents, create new. |
| `/agents/:id` | Agent detail: raw JSON, memory (persona) block, “Open in Chat”. |
| `/chat` | Chat with an agent; `?agent=id` pre-selects. |
| `/settings` | Shows API base (from env), set API key (localStorage). |

---

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host (nginx, Apache, etc.) or run:

```bash
npm run preview
```

to serve `dist/` locally. No Node required at runtime for the built app.

---

## API compatibility

Same as the root README: `GET/POST /v1/agents`, messages, memory blocks, optional projects and health. See [README — API compatibility](../README.md#api-compatibility).

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **“API: Unreachable”** | Backend not running or wrong URL. Set `VITE_API_BASE` in `app/.env` and restart dev. |
| **CORS errors** | Backend must allow the origin of the dev server (e.g. http://localhost:5173). |
| **401 / 403** | Set API key in **Settings** in the app. |
| **npm run dev fails** | Run from inside `app/`: `cd app && npm install && npm run dev`. Ensure Node 18+. |
| **Build fails** | Run `npm run build` from `app/`. If Rollup/native module errors, try on another OS/Node version (e.g. Linux or macOS). |
