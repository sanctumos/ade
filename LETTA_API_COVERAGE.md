# Letta API coverage — self-hosted only

**Product:** Sanctum ADE — **`ade-faithful/`** (ship) and **`ade-simple/`** (twin). Static UIs against **self-hosted Letta OSS / Sanctum**. Cloud is out of scope; `reference_materials/` is scrap only.

This document maps the [Letta API](https://docs.letta.com/api) and marks **Cloud-only** rows so we **do not** build them. Client coverage = what **`ade-faithful/app.js`** implements for self-hosted.

**References:** [Agents](https://docs.letta.com/api/resources/agents), [Tools](https://docs.letta.com/api/resources/tools), [MCP Servers](https://docs.letta.com/api/resources/mcp_servers/), [Models](https://docs.letta.com/api/resources/models/), [Runs](https://docs.letta.com/api/resources/runs/).

---

## 1. Cloud-only vs local

| Area | Cloud-only | Local / OSS-friendly |
|------|------------|----------------------|
| **Agents** | `project_id` defaulting to org, `identity_id`, `managed_group`, `template_id`, `pending_approval` (approval UI), `last_stop_reason` filters | CRUD, `name`, `model`, `system`, `tool_ids`, memory blocks |
| **Messages** | `conversation_id` (multi-convo), `group_id`, streaming with Letta-specific events | POST (send), GET (history by agent), cancel (optional) |
| **Runs** | Callbacks, usage/billing, `insufficient_credits` | List/get runs and run messages (if backend exposes them) |
| **Tools** | Server tools (Letta sandbox), `project_id`, `POST /v1/tools/search` (embed_tools) | List, get, create/update/delete (custom tools); MCP tools |
| **MCP** | — | List, get, create, update, delete, refresh, list tools |
| **Models** | `tier`, `provider_category: "byok"` | List LLMs (and optionally embeddings) |
| **Projects** | Org-scoped, billing | Optional list/create/get/update/delete |
| **Org / billing** | Billing, members, usage, rate limits, API logs, integrations | **Not used** by Simple ADE |

---

## 2. Endpoint list and ADE coverage

### Health

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/health` or `/v1/health` | Liveness | ✅ `apiHealth()` | Optional |

### Agents

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/agents` | List agents | ✅ `listAgents()` | Query: project_id, tags, limit, etc. (local often ignores) |
| GET | `/v1/agents/:id` | Get agent | ✅ `getAgent(id)` | |
| POST | `/v1/agents` | Create agent | ✅ `createAgent(body)` | body: name, model, system, tool_ids, … |
| PATCH | `/v1/agents/:id` | Update agent | ✅ `updateAgent(id, body)` | |
| DELETE | `/v1/agents/:id` | Delete agent | ✅ `deleteAgent(id)` | |

### Agent messages (chat)

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/agents/:id/messages` | List messages (history) | ✅ `getAgentMessages(agentId)` | Optional for chat; query: limit, order, before, after, conversation_id |
| POST | `/v1/agents/:id/messages` | Send message | ✅ `sendMessage` / `sendMessageStream` / `sendMessagePreferStream` | **`input`** / **`messages`**; legacy **`message`** → `input`. Stream: `streaming=true` (+ `stream_tokens`, `include_pings`) → SSE |
| POST | `/v1/agents/:id/messages/cancel` | Cancel runs | ✅ `cancelAgentMessages(agentId, body?)` | body: { run_ids?: string[] }; needs Redis on server |

### Agent core memory

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/agents/:id/core-memory/blocks` | List blocks | ✅ `listAgentMemoryBlocks(agentId, params?)` (404 → tries `/blocks/` fallback) | `persona`, `human`, etc. |
| GET | `/v1/agents/:id/core-memory/blocks/:label` | Get block | ✅ `getAgentMemory(agentId, label)` | label e.g. `persona` |
| PATCH | `/v1/agents/:id/core-memory/blocks/:label` | Update block | ✅ `updateAgentMemory(agentId, label, body)` | body: `value` (Letta) / `content` (some servers) |

### Archival memory (self-hosted)

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/agents/:id/archival-memory` | List passages | ✅ `listArchivalMemory` | Query: limit, after, before, search, ascending |
| POST | `/v1/agents/:id/archival-memory` | Insert passage | ✅ `createArchivalMemory` | body: `{ text }` |
| DELETE | `/v1/agents/:id/archival-memory/:memory_id` | Delete passage | ✅ `deleteArchivalMemory` | |
| POST | `/v1/agents/:id/archival-memory/search` | Semantic search | ✅ `searchArchivalMemory` | Optional UI later |

### Tools

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/tools` | List tools | ✅ `listTools(params?)` | Query: tool_ids, search, limit, etc. |
| GET | `/v1/tools/:id` | Get tool | ✅ `getTool(id)` | |
| POST | `/v1/tools` | Create tool | ✅ `createTool(body)` | Server/custom tools (source_code, etc.) |
| PATCH | `/v1/tools/:id` | Update tool | ✅ `updateTool(id, body)` | |
| DELETE | `/v1/tools/:id` | Delete tool | ✅ `deleteTool(id)` | |
| PUT | `/v1/tools` | Upsert tool | ✅ `upsertTool(body)` | Create or update by schema |
| POST | `/v1/tools/search` | Semantic search | ✅ `searchTools(body)` | **Cloud**: requires embed_tools |

### MCP servers

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/mcp-servers` | List MCP servers | ✅ `listMcpServers()` | |
| GET | `/v1/mcp-servers/:id` | Get MCP server | ✅ `getMcpServer(id)` | |
| POST | `/v1/mcp-servers` | Create MCP server | ✅ `createMcpServer(body)` | config: stdio | sse | streamable_http |
| PATCH | `/v1/mcp-servers/:id` | Update MCP server | ✅ `updateMcpServer(id, body)` | |
| DELETE | `/v1/mcp-servers/:id` | Delete MCP server | ✅ `deleteMcpServer(id)` | |
| PATCH | `/v1/mcp-servers/:id/refresh` | Refresh tools | ✅ `refreshMcpServer(id)` | Sync tools from server |
| GET | `/v1/mcp-servers/:id/tools` | List MCP server tools | ✅ `listMcpServerTools(serverId)` | |
| GET | `/v1/mcp-servers/:id/tools/:toolId` | Get MCP tool | ✅ `getMcpServerTool(serverId, toolId)` | Optional |
| POST | `/v1/mcp-servers/:id/tools/:toolId/run` | Run MCP tool | ✅ `runMcpTool(serverId, toolId, body)` | Optional; test run |

### Models

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/models` | List LLM models | ✅ `listModels()` | Query: provider_type, provider_category |
| GET | `/v1/models/embedding` | List embedding models | ✅ `listEmbeddingModels()` | Optional |

### Runs (execution sessions)

Many backends expose messages via **agents** rather than **runs**. Runs are first-class in Cloud; local OSS may not implement them.

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/runs` | List runs | ✅ `listRuns(params?)` | Query: agent_id, conversation_id, status, limit |
| GET | `/v1/runs/:id` | Get run | ✅ `getRun(id)` | |
| GET | `/v1/runs/:id/messages` | List run messages | ✅ `getRunMessages(runId)` | |
| POST | `/v1/runs/:id/stream` | Stream run | — | SSE; optional for local |
| GET | `/v1/runs/:id/usage` | Run usage (tokens) | ✅ `getRunUsage(runId)` | Optional |
| GET | `/v1/runs/:id/steps` | List run steps | ✅ `getRunSteps(runId)` | Optional |

### Projects (optional)

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/projects` | List projects | ✅ `listProjects()` | |
| GET | `/v1/projects/:id` | Get project | ✅ `getProject(id)` | |
| POST | `/v1/projects` | Create project | ✅ `createProject(body)` | |
| PATCH | `/v1/projects/:id` | Update project | ✅ `updateProject(id, body)` | |
| DELETE | `/v1/projects/:id` | Delete project | ✅ `deleteProject(id)` | |

### Agent tools (attached tools per agent)

| Method | Path | Purpose | In client | Notes |
|--------|------|---------|-----------|--------|
| GET | `/v1/agents/:id/tools` | List tools attached to agent | ✅ `listAgentTools(agentId)` | Optional; we use agent.tool_ids |

---

## 3. Summary

- **Fully covered for local use (client helpers):** Agents (CRUD + memory), agent messages (list, send, cancel), tools (list, get, create, update, delete, upsert, search), MCP (full CRUD + refresh + list tools), models (+ embedding list), projects (full CRUD), runs (list, get, messages, usage, steps).
- **Cloud-only (we don’t rely on):** Org, billing, members, usage dashboards, rate limits, API logs, BYOK provider_category, tool embedding search (optional in client).
- **Optional / backend-dependent:** Runs (some backends only expose agent messages), streaming (POST messages with `streaming: true`), run stream endpoint, agent-specific tools list.

---

## 4. Response shapes

Backends may return:

- **Arrays:** `[...]` or `{ data: [...] }` or `{ agents: [...] }`, `{ tools: [...] }`, `{ mcp_servers: [...] }`, etc.
- **Single resource:** `{ id, name, ... }` or wrapped.

Clients normalize in the API helpers or UI (e.g. `Array.isArray(d) ? d : d?.data ?? d?.agents ?? []`). Keep **`ade-simple/app.js`** and **`app/src/api/client.js`** aligned when changing request/response handling.
