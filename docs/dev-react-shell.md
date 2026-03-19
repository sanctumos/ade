# Legacy React shell (`app/`) — developer notes

The **`app/`** tree is a **transitional** Vite + React prototype. It is **not** the supported product surface; **`ade-simple/`** is. This shell exists today mainly so there is a **typed, componentized mirror** of the API layer and some UX experiments. **Plan:** re-implement or fold what matters into the next real UI, then **delete or drastically shrink** this package.

Do **not** add user-facing documentation (setup tours, route maps, build guides) for this stack—document **forward** (contracts, parity, migration) only.

---

## API contract (keep in sync)

- **Canonical runtime client for users:** `ade-simple/app.js` (`window.ADE` helpers).
- **Legacy mirror:** `app/src/api/client.js` — same paths, methods, and request shapes. When you change how the backend is called, update **both** until `app/` goes away.

Function names in [LETTA_API_COVERAGE.md](../LETTA_API_COVERAGE.md) (`listAgents`, `updateAgent`, `listAgentMemoryBlocks`, etc.) describe the shared contract.

---

## Layout (for migration / archaeology)

| Area | Path | Worth preserving when reimplementing |
|------|------|----------------------------------------|
| API helpers | `src/api/client.js` | Single place for `apiFetch`, auth header, message body normalization |
| Routing | `src/pages/*.jsx` | Flow coverage: agents, agent detail (tools + memory), chat, MCP, tools directory |
| Env | `VITE_API_BASE`, `VITE_API_KEY` | Pattern: configurable base + optional Bearer (simple uses `config.js` / localStorage) |

---

## Running it (maintainers only)

If you need this shell for a quick comparison: `cd app && npm install && npm run dev`, with `app/.env` setting `VITE_API_BASE`. Prefer **ade-simple** when debugging API or CORS issues so you stay aligned with what we ship.

---

## Related

- Product docs: [ade-simple/README.md](../ade-simple/README.md), root [README.md](../README.md).
- API map: [LETTA_API_COVERAGE.md](../LETTA_API_COVERAGE.md).
