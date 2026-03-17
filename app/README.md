# ADE (Local) — Frontend

Minimal Agent Development Environment that runs locally and talks to your **local API** (Letta OSS, Sanctum, or compatible backend).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the port Vite prints).

## Configure

- **API base:** Create `app/.env` with `VITE_API_BASE=http://localhost:8283` (or your backend URL). Default is `http://localhost:8283`.
- **API key:** In the app, go to **Settings** and enter a Bearer token if your backend requires it. Stored in localStorage.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — API health, agent count, links |
| `/projects` | List/create projects (if backend has `/v1/projects`) |
| `/projects/:id` | Project detail, agents in project |
| `/agents` | List agents, create new |
| `/agents/:id` | Agent detail, memory (persona) block, “Open in Chat” |
| `/chat` | Chat with an agent; `?agent=id` pre-selects agent |
| `/settings` | API base (read-only from env), API key (localStorage) |

## Build

```bash
npm run build
npm run preview   # serve dist/
```
