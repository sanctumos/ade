/**
 * Single API client for the local ADE.
 * All requests use VITE_API_BASE (default: local backend, e.g. http://localhost:8283).
 */

const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:8283';

export function apiBase() {
  return base.replace(/\/$/, '');
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) return res.json();
  return res.text();
}

/** GET /v1/agents */
export function listAgents() {
  return apiFetch('/v1/agents');
}

/** GET /v1/agents/:id */
export function getAgent(id) {
  return apiFetch(`/v1/agents/${id}`);
}

/** POST /v1/agents */
export function createAgent(body) {
  return apiFetch('/v1/agents', { method: 'POST', body: JSON.stringify(body) });
}

/** POST /v1/agents/:id/messages (chat) */
export function sendMessage(agentId, body) {
  return apiFetch(`/v1/agents/${agentId}/messages`, { method: 'POST', body: JSON.stringify(body) });
}

/** GET /v1/models */
export function listModels() {
  return apiFetch('/v1/models');
}

/** GET /v1/tools */
export function listTools() {
  return apiFetch('/v1/tools');
}
