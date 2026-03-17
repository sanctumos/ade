# ADE Simple — no Node, no build

Plain HTML, CSS, and JS. Point at your Letta (or compatible) API and go.

## Setup

1. **Copy config:** `cp config.example.js config.js`
2. **Edit config.js:** set `base` to your API URL (e.g. `http://localhost:8283`), and `key` if your backend needs a Bearer token.
3. **Or use Settings:** open `settings.html` in the app and enter base URL + key; they’re saved in this browser (localStorage) and override `config.js`.

## Run

- **From disk:** Open `index.html` in a browser. (If your API is on another origin, CORS must allow it.)
- **From a server:** Put this folder in your web root (nginx, Apache, PHP, anything). No Node required.

## Files

| File | Purpose |
|------|--------|
| `config.example.js` | Template; copy to `config.js` and edit. |
| `config.js` | Your base URL + key (gitignored). |
| `app.js` | API helpers; reads config or localStorage. |
| `index.html` | Dashboard. |
| `agents.html` | List and create agents. |
| `agent.html` | One agent: memory (persona), link to Chat. |
| `chat.html` | Pick agent, send messages. `?agent=id` preselects. |
| `settings.html` | Set base URL and key in this browser. |

## Optional: config from .env

If you prefer a `.env` file, run once:

```bash
python3 genconfig.py
```

This reads `.env` (e.g. `ADE_BASE=http://localhost:8283`, `ADE_KEY=optional`) and writes `config.js`. No Node required.
