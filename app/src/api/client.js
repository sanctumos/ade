/**
 * Single API client for the local ADE.
 * All requests use VITE_API_BASE (default: local backend, e.g. http://localhost:8283).
 * API key: VITE_API_KEY env or localStorage 'ade_api_key'.
 */

const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:8283';
const STORAGE_KEY = 'ade_api_key';

function getApiKey() {
  return import.meta.env.VITE_API_KEY ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) ?? '';
}

export function setApiKeyInStorage(key) {
  if (typeof localStorage !== 'undefined') {
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  }
}

export function getApiKeyFromStorage() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
}

export function apiBase() {
  return base.replace(/\/$/, '');
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const apiKey = getApiKey();
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) return res.json();
  return res.text();
}

/** GET health (try common paths) */
export async function apiHealth() {
  try {
    const res = await fetch(`${apiBase()}/health`, { method: 'GET' });
    if (res.ok) return { ok: true };
    const res2 = await fetch(`${apiBase()}/v1/health`, { method: 'GET' });
    if (res2.ok) return { ok: true };
  } catch (_) {}
  return { ok: false };
}

/** GET /v1/agents */
export function listAgents() {
  return apiFetch('/v1/agents/');
}

/** GET /v1/agents/:id */
export function getAgent(id) {
  return apiFetch(`/v1/agents/${id}`);
}

/** POST /v1/agents */
export function createAgent(body) {
  return apiFetch('/v1/agents/', { method: 'POST', body: JSON.stringify(body) });
}

/** PATCH /v1/agents/:id */
export function updateAgent(id, body) {
  return apiFetch(`/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /v1/agents/:id */
export function deleteAgent(id) {
  return apiFetch(`/v1/agents/${id}`, { method: 'DELETE' });
}

/** POST /v1/agents/:id/messages/cancel */
export function cancelAgentMessages(agentId, body = {}) {
  return apiFetch(`/v1/agents/${agentId}/messages/cancel`, { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/agents/:id/messages (history, if supported) */
export function getAgentMessages(agentId) {
  return apiFetch(`/v1/agents/${agentId}/messages`);
}

/** POST /v1/agents/:id/messages (chat) */
export function sendMessage(agentId, body) {
  return apiFetch(`/v1/agents/${agentId}/messages`, { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/agents/:id/core-memory/blocks/:label */
export function getAgentMemory(agentId, label = 'persona') {
  return apiFetch(`/v1/agents/${agentId}/core-memory/blocks/${label}`);
}

/** PATCH /v1/agents/:id/core-memory/blocks/:label */
export function updateAgentMemory(agentId, label, body) {
  return apiFetch(`/v1/agents/${agentId}/core-memory/blocks/${label}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** GET /v1/models */
export function listModels() {
  return apiFetch('/v1/models/');
}

/** GET /v1/tools */
export function listTools(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch('/v1/tools/' + (q ? '?' + q : ''));
}

/** GET /v1/tools/:id */
export function getTool(id) {
  return apiFetch(`/v1/tools/${id}`);
}

/** POST /v1/tools */
export function createTool(body) {
  return apiFetch('/v1/tools/', { method: 'POST', body: JSON.stringify(body) });
}

/** PATCH /v1/tools/:id */
export function updateTool(id, body) {
  return apiFetch(`/v1/tools/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /v1/tools/:id */
export function deleteTool(id) {
  return apiFetch(`/v1/tools/${id}`, { method: 'DELETE' });
}

/** PUT /v1/tools (upsert) */
export function upsertTool(body) {
  return apiFetch('/v1/tools/', { method: 'PUT', body: JSON.stringify(body) });
}

/** POST /v1/tools/search (semantic search; cloud / embed_tools) */
export function searchTools(body = {}) {
  return apiFetch('/v1/tools/search', { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/mcp-servers */
export function listMcpServers() {
  return apiFetch('/v1/mcp-servers/');
}

/** POST /v1/mcp-servers */
export function createMcpServer(body) {
  return apiFetch('/v1/mcp-servers/', { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/mcp-servers/:id */
export function getMcpServer(id) {
  return apiFetch(`/v1/mcp-servers/${id}`);
}

/** PATCH /v1/mcp-servers/:id */
export function updateMcpServer(id, body) {
  return apiFetch(`/v1/mcp-servers/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /v1/mcp-servers/:id */
export function deleteMcpServer(id) {
  return apiFetch(`/v1/mcp-servers/${id}`, { method: 'DELETE' });
}

/** PATCH /v1/mcp-servers/:id/refresh */
export function refreshMcpServer(id, params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/v1/mcp-servers/${id}/refresh` + (q ? '?' + q : ''), { method: 'PATCH' });
}

/** GET /v1/mcp-servers/:id/tools */
export function listMcpServerTools(serverId) {
  return apiFetch(`/v1/mcp-servers/${serverId}/tools`);
}

/** GET /v1/mcp-servers/:serverId/tools/:toolId */
export function getMcpServerTool(serverId, toolId) {
  return apiFetch(`/v1/mcp-servers/${serverId}/tools/${toolId}`);
}

/** POST /v1/mcp-servers/:serverId/tools/:toolId/run */
export function runMcpTool(serverId, toolId, body = {}) {
  return apiFetch(`/v1/mcp-servers/${serverId}/tools/${toolId}/run`, { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/models/embedding */
export function listEmbeddingModels() {
  return apiFetch('/v1/models/embedding/');
}

/** GET /v1/runs */
export function listRuns(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch('/v1/runs/' + (q ? '?' + q : ''));
}

/** GET /v1/runs/:id */
export function getRun(id) {
  return apiFetch(`/v1/runs/${id}`);
}

/** GET /v1/runs/:id/messages */
export function getRunMessages(runId, params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/v1/runs/${runId}/messages` + (q ? '?' + q : ''));
}

/** GET /v1/runs/:id/usage */
export function getRunUsage(runId) {
  return apiFetch(`/v1/runs/${runId}/usage`);
}

/** GET /v1/runs/:id/steps */
export function getRunSteps(runId, params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/v1/runs/${runId}/steps` + (q ? '?' + q : ''));
}

/** GET /v1/agents/:id/tools */
export function listAgentTools(agentId) {
  return apiFetch(`/v1/agents/${agentId}/tools`);
}

/** GET /v1/projects (optional; some backends) */
export function listProjects() {
  return apiFetch('/v1/projects/');
}

/** POST /v1/projects */
export function createProject(body) {
  return apiFetch('/v1/projects/', { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/projects/:id */
export function getProject(id) {
  return apiFetch(`/v1/projects/${id}`);
}

/** PATCH /v1/projects/:id */
export function updateProject(id, body) {
  return apiFetch(`/v1/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /v1/projects/:id */
export function deleteProject(id) {
  return apiFetch(`/v1/projects/${id}`, { method: 'DELETE' });
}
