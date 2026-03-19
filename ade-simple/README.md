# ADE Simple — no Node, no build

Plain HTML, CSS, and JS. Point at your Letta (or compatible) API and go. No install beyond editing one config file (or using the in-app Settings). **Responsive and PWA-ready**: mobile breakpoint at 768px with hamburger nav, touch-friendly tap targets, and safe-area insets for notched devices.

---

## Prerequisites

- A **running API** that implements the endpoints the ADE expects (see [API compatibility](#api-compatibility) in the root [README](../README.md)).
- A browser. Optional: Python 3 if you use the `.env` → `config.js` generator.

---

## Setup

### Option A: config.js (recommended)

1. Copy the example:  
   `cp config.example.js config.js`
2. Edit `config.js`: set `base` to your API URL (e.g. `http://localhost:8283`) and `key` if your backend requires a Bearer token.

```javascript
window.ADE_CONFIG = {
  base: 'http://localhost:8283',
  key: ''
};
```

### Option B: Settings (no file edit)

Open `settings.html` in the app, enter the API base URL and optional API key, and click **Save in this browser**. Values are stored in localStorage and override `config.js` for that browser.

### Option C: .env + generator

If you prefer a `.env` file:

1. Create `ade-simple/.env`:

```bash
ADE_BASE=http://localhost:8283
ADE_KEY=
```

2. Run once:

```bash
cd ade-simple
python3 genconfig.py
```

This writes `config.js`. No Node required.

---

## Responsive & PWA-ready

- **Breakpoint 768px:** Below this width the sidebar becomes an overlay; a **hamburger (≡)** at the top of the main area opens it. Tapping the dimmed backdrop or a nav link closes the menu.
- **Touch targets:** Buttons, links, and inputs use at least 44px height for reliable tap on phones and tablets.
- **Safe areas:** Padding respects `env(safe-area-inset-*)` so content isn’t hidden by notches or home indicators when installed as a PWA or full-screen.
- To ship as a **PWA**, add a `manifest.json` (name, icons, start_url, display: standalone) and a service worker; the layout and nav are already mobile-friendly.

---

## Run

- **From disk:** Open `index.html` in a browser. If your API is on another origin (e.g. different host or port), the API must send CORS headers allowing your origin (or `file://` if you open the file directly).
- **From a server:** Put this folder in your web root (nginx, Apache, PHP, etc.). No Node required. Then open e.g. `http://localhost/ade-simple/` (or whatever path you use).

---

## Files

| File | Purpose |
|------|--------|
| `config.example.js` | Template; copy to `config.js` and edit. |
| `config.js` | Your base URL + key (gitignored). |
| `app.js` | API helpers; reads `window.ADE_CONFIG` or localStorage (from Settings). **Sidebar + backdrop** live here as `ADE_NAV_SHELL_HTML` (single source of truth); each page uses `<div class="layout" data-ade-nav="…">` + `<span id="ade-nav-inject"></span>` before `<main>`. **Active agent** dropdown in the sidebar is shared app-wide; choice is stored in `localStorage` (`ade_simple_agent_id`). Chat uses that agent; opening `agent.html?id=…` syncs the sidebar to that agent. `?agent=` on `chat.html` still overrides once and is then saved. |
| `index.html` | Dashboard: API status, links to Agents and Chat. |
| `agents.html` | List agents, create new. |
| `agent.html` | One agent: model, system prompt, tools, memory (persona). Query: `?id=<agent_id>`. |
| `tools.html` | List all tools. Attach when creating or editing agents. |
| `mcp.html` | Register MCP servers (Streamable HTTP). Their tools appear in Tools. |
| `chat.html` | Chat with the **sidebar** active agent. Query: `?agent=<agent_id>` preselects once (saved to localStorage). Loads **marked** + **DOMPurify** from jsDelivr for markdown; see `chat.css` / `chat-markdown.js`. |
| `settings.html` | Set base URL and API key in this browser. |
| `styles.css` | Shared styles. |
| `chat.css` | Chat-only: markdown prose, reasoning / tool-call / tool-return lanes (aligned with Letta `message_type`s). |
| `chat-markdown.js` | Safe markdown HTML (`ADE_CHAT.parseMarkdown`) and JSON pretty-print for tool arguments. |
| `genconfig.py` | Optional: reads `.env`, writes `config.js`. |

---

## Chat rendering (Letta-style)

History is rendered by `message_type`, similar to [Letta message types](https://docs.letta.com/guides/core-concepts/messages/message-types/):

| Type | UI |
|------|-----|
| `user_message` | Right-aligned bubble; markdown. Internal JSON (`login`, `system_alert`) is hidden. |
| `assistant_message` | Assistant bubble; markdown. |
| `reasoning_message` | Purple-accent lane; `reasoning` text as markdown; optional `source` badge. |
| `hidden_reasoning_message` | Muted lane; `state` or optional `hidden_reasoning`. |
| `tool_call_message` | Green-accent monospace lane; tool name, `tool_call_id`, pretty-printed `arguments` JSON. |
| `tool_return_message` | Blue-accent lane; `status`, return body (JSON → `pre`, else markdown); optional stdout/stderr. |
| `approval_request_message` / `approval_response_message` | Amber “human in the loop” styling. |

If the CDN scripts fail (offline), chat falls back to escaped plaintext with line breaks.

---

## API compatibility

The app calls:

- `GET /v1/agents`, `POST /v1/agents`, `GET /v1/agents/:id`
- `POST /v1/agents/:id/messages` (send message), optionally `GET /v1/agents/:id/messages`
- `GET /v1/agents/:id/core-memory/blocks/persona`, `PATCH ...` (memory)

See the root [README — API compatibility](../README.md#api-compatibility) for the full list and response shapes.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **Blank page or “config.js 404”** | Create `config.js` from `config.example.js`, or open Settings and save base URL + key so the app uses localStorage. |
| **“API: Unreachable” on dashboard** | Backend not running or wrong URL. Check Settings (or `config.js`). No trailing slash in base URL. |
| **CORS errors in console** | The API must allow requests from the origin of the page (your server or `file://`). Configure CORS on the backend. |
| **401 / 403 on requests** | Set the API key in Settings or in `config.js` (`key`). |
| **Chat has no markdown / plain only** | `marked` or `DOMPurify` failed to load (network, CSP, or offline). Allow jsDelivr or vendor the two `.min.js` files next to `chat.html` and point `<script src="...">` locally. |
| **genconfig.py: “No such file”** | Run `python3 genconfig.py` from inside the `ade-simple/` directory (where `.env` and `config.example.js` live). |

---

## Optional: config from .env

If you use Option C (`.env` + `genconfig.py`), run:

```bash
python3 genconfig.py
```

after changing `.env`. This overwrites `config.js`. No Node required.
