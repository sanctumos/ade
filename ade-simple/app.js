(function () {
  'use strict';

  (function initNavToggle() {
    function onDomReady(fn) {
      if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
    }
    onDomReady(function () {
      var t = document.getElementById('nav-toggle');
      var b = document.getElementById('nav-backdrop');
      if (t) t.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
      if (b) b.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
    });
  })();

  var STORAGE_BASE = 'ade_simple_base';
  var STORAGE_KEY = 'ade_simple_key';

  function getConfig() {
    var c = window.ADE_CONFIG || {};
    return {
      base: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_BASE)) || c.base || 'http://localhost:8283',
      key: (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || c.key || ''
    };
  }

  function setStoredBase(base) {
    if (typeof localStorage !== 'undefined') {
      if (base) localStorage.setItem(STORAGE_BASE, base); else localStorage.removeItem(STORAGE_BASE);
    }
  }
  function setStoredKey(key) {
    if (typeof localStorage !== 'undefined') {
      if (key) localStorage.setItem(STORAGE_KEY, key); else localStorage.removeItem(STORAGE_KEY);
    }
  }

  function apiBase() {
    return getConfig().base.replace(/\/$/, '');
  }

  function apiFetch(path, options) {
    options = options || {};
    var url = path.indexOf('http') === 0 ? path : apiBase() + (path.indexOf('/') === 0 ? '' : '/') + path;
    var headers = { 'Content-Type': 'application/json' };
    var key = getConfig().key;
    if (key) headers['Authorization'] = 'Bearer ' + key;
    if (options.headers) Object.assign(headers, options.headers);
    return fetch(url, Object.assign({}, options, { headers: headers })).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error('API ' + res.status + ': ' + (t || res.statusText)); });
      var ct = res.headers.get('content-type');
      if (ct && ct.indexOf('application/json') !== -1) return res.json();
      return res.text();
    });
  }

  window.ADE = {
    getConfig: getConfig,
    setStoredBase: setStoredBase,
    setStoredKey: setStoredKey,
    apiBase: apiBase,
    listAgents: function () { return apiFetch('/v1/agents'); },
    getAgent: function (id) { return apiFetch('/v1/agents/' + id); },
    createAgent: function (body) { return apiFetch('/v1/agents', { method: 'POST', body: JSON.stringify(body) }); },
    updateAgent: function (id, body) { return apiFetch('/v1/agents/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteAgent: function (id) { return apiFetch('/v1/agents/' + id, { method: 'DELETE' }); },
    cancelAgentMessages: function (agentId, body) { return apiFetch('/v1/agents/' + agentId + '/messages/cancel', { method: 'POST', body: JSON.stringify(body || {}) }); },
    sendMessage: function (agentId, body) { return apiFetch('/v1/agents/' + agentId + '/messages', { method: 'POST', body: JSON.stringify(body) }); },
    getAgentMessages: function (agentId) { return apiFetch('/v1/agents/' + agentId + '/messages'); },
    getAgentMemory: function (agentId, label) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + (label || 'persona')); },
    updateAgentMemory: function (agentId, label, body) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + (label || 'persona'), { method: 'PATCH', body: JSON.stringify(body) }); },
    listModels: function () { return apiFetch('/v1/models'); },
    listTools: function () { return apiFetch('/v1/tools'); },
    getTool: function (id) { return apiFetch('/v1/tools/' + id); },
    createTool: function (body) { return apiFetch('/v1/tools', { method: 'POST', body: JSON.stringify(body) }); },
    updateTool: function (id, body) { return apiFetch('/v1/tools/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteTool: function (id) { return apiFetch('/v1/tools/' + id, { method: 'DELETE' }); },
    upsertTool: function (body) { return apiFetch('/v1/tools', { method: 'PUT', body: JSON.stringify(body) }); },
    searchTools: function (body) { return apiFetch('/v1/tools/search', { method: 'POST', body: JSON.stringify(body || {}) }); },
    listMcpServers: function () { return apiFetch('/v1/mcp-servers'); },
    getMcpServer: function (id) { return apiFetch('/v1/mcp-servers/' + id); },
    createMcpServer: function (body) { return apiFetch('/v1/mcp-servers', { method: 'POST', body: JSON.stringify(body) }); },
    updateMcpServer: function (id, body) { return apiFetch('/v1/mcp-servers/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteMcpServer: function (id) { return apiFetch('/v1/mcp-servers/' + id, { method: 'DELETE' }); },
    refreshMcpServer: function (id, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/mcp-servers/' + id + '/refresh' + q, { method: 'PATCH' }); },
    listMcpServerTools: function (serverId) { return apiFetch('/v1/mcp-servers/' + serverId + '/tools'); },
    getMcpServerTool: function (serverId, toolId) { return apiFetch('/v1/mcp-servers/' + serverId + '/tools/' + toolId); },
    runMcpTool: function (serverId, toolId, body) { return apiFetch('/v1/mcp-servers/' + serverId + '/tools/' + toolId + '/run', { method: 'POST', body: JSON.stringify(body || {}) }); },
    listEmbeddingModels: function () { return apiFetch('/v1/models/embedding'); },
    listRuns: function (params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs' + q); },
    getRun: function (id) { return apiFetch('/v1/runs/' + id); },
    getRunMessages: function (runId, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + runId + '/messages' + q); },
    getRunUsage: function (runId) { return apiFetch('/v1/runs/' + runId + '/usage'); },
    getRunSteps: function (runId, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + runId + '/steps' + q); },
    listAgentTools: function (agentId) { return apiFetch('/v1/agents/' + agentId + '/tools'); },
    listProjects: function () { return apiFetch('/v1/projects'); },
    createProject: function (body) { return apiFetch('/v1/projects', { method: 'POST', body: JSON.stringify(body) }); },
    getProject: function (id) { return apiFetch('/v1/projects/' + id); },
    updateProject: function (id, body) { return apiFetch('/v1/projects/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteProject: function (id) { return apiFetch('/v1/projects/' + id, { method: 'DELETE' }); }
  };
})();
