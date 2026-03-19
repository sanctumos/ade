(function () {
  'use strict';

  /** Single source of truth for sidebar + mobile backdrop (injected before <main>). */
  var ADE_NAV_SHELL_HTML =
    '<button type="button" class="sidebar-backdrop" id="nav-backdrop" aria-label="Close menu"></button>' +
    '<aside class="sidebar">' +
    '<h2>ADE (Local)</h2>' +
    '<nav>' +
    '<a href="index.html">Dashboard</a>' +
    '<a href="agents.html">Agents</a>' +
    '<a href="tools.html">Tools</a>' +
    '<a href="mcp.html">MCP</a>' +
    '<a href="chat.html">Chat</a>' +
    '<a href="settings.html">Settings</a>' +
    '</nav>' +
    '<div class="sidebar-agent">' +
    '<label class="sidebar-agent-label" for="ade-agent-select">Active agent</label>' +
    '<select id="ade-agent-select" class="sidebar-agent-select" aria-label="Active agent">' +
    '<option value="">Loading…</option>' +
    '</select>' +
    '</div>' +
    '<p class="api-badge">API: <span id="api-base-display">…</span></p>' +
    '</aside>';

  var ADE_ACTIVE_NAV_HREF = {
    dashboard: 'index.html',
    agents: 'agents.html',
    tools: 'tools.html',
    mcp: 'mcp.html',
    chat: 'chat.html',
    settings: 'settings.html'
  };

  function injectAdeShell() {
    var layout = document.querySelector('.layout[data-ade-nav]');
    var mount = document.getElementById('ade-nav-inject');
    if (!layout || !mount) return;
    mount.insertAdjacentHTML('beforebegin', ADE_NAV_SHELL_HTML);
    mount.remove();
    var active = (layout.getAttribute('data-ade-nav') || '').trim();
    var href = ADE_ACTIVE_NAV_HREF[active];
    if (href) {
      var link = layout.querySelector('.sidebar nav a[href="' + href + '"]');
      if (link) link.classList.add('active');
    }
  }

  var STORAGE_BASE = 'ade_simple_base';
  var STORAGE_KEY = 'ade_simple_key';
  var STORAGE_AGENT = 'ade_simple_agent_id';
  var pendingAgentId = null;

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

  function bindNavToggle() {
    var t = document.getElementById('nav-toggle');
    var b = document.getElementById('nav-backdrop');
    if (t) t.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    if (b) b.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  }

  function fillApiBaseDisplay() {
    var el = document.getElementById('api-base-display');
    if (el) el.textContent = apiBase();
  }

  injectAdeShell();
  bindNavToggle();
  fillApiBaseDisplay();

  function normAgentsResponse(d) {
    return Array.isArray(d) ? d : (d && d.data) ? d.data : (d && d.agents) ? d.agents : [];
  }
  function rowAgentId(a) {
    return String(a.id != null ? a.id : a.agent_id);
  }
  function rowAgentName(a) {
    return a.name != null ? a.name : a.agent_name || rowAgentId(a);
  }
  function escOptLabel(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function pickResolvedAgentId(agents, opts) {
    opts = opts || {};
    var ids = agents.map(rowAgentId);
    function resolve(id) {
      if (id == null || id === '') return '';
      var s = String(id);
      return ids.indexOf(s) !== -1 ? s : '';
    }
    var url = '';
    try {
      url = new URLSearchParams(location.search).get('agent') || '';
    } catch (e) {}
    var stored = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_AGENT)) || '';
    var prefer = opts.preferId != null && opts.preferId !== '' ? String(opts.preferId) : '';
    var chain = [prefer, pendingAgentId, url, stored];
    for (var i = 0; i < chain.length; i++) {
      var hit = resolve(chain[i]);
      if (hit) return hit;
    }
    return agents.length ? rowAgentId(agents[0]) : '';
  }

  function bindAgentSelectOnce(sel) {
    if (sel.getAttribute('data-ade-bound')) return;
    sel.setAttribute('data-ade-bound', '1');
    sel.addEventListener('change', function () {
      var v = sel.value;
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_AGENT, v);
      document.dispatchEvent(new CustomEvent('ade-agentchange', { detail: { id: v } }));
    });
  }

  function getSelectedAgentId() {
    var sel = document.getElementById('ade-agent-select');
    if (sel && sel.value) return sel.value;
    if (typeof localStorage !== 'undefined') return localStorage.getItem(STORAGE_AGENT) || '';
    return '';
  }

  function setSelectedAgentId(id, opts) {
    opts = opts || {};
    if (id == null || id === '') return;
    id = String(id);
    var sel = document.getElementById('ade-agent-select');
    var ready = sel && sel.getAttribute('data-ade-populated') === '1' && sel.options.length;
    if (ready) {
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === id) {
          if (sel.value !== id) {
            sel.value = id;
            if (!opts.skipPersist && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_AGENT, id);
            if (!opts.skipEvent) document.dispatchEvent(new CustomEvent('ade-agentchange', { detail: { id: id } }));
          } else if (!opts.skipPersist && typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_AGENT, id);
          }
          return;
        }
      }
    }
    pendingAgentId = id;
    if (!opts.skipPersist && typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_AGENT, id);
  }

  function refreshAgentSelect(opts) {
    opts = opts || {};
    var sel = document.getElementById('ade-agent-select');
    if (!sel) return Promise.resolve('');
    return window.ADE.listAgents().then(function (d) {
      var agents = normAgentsResponse(d);
      if (!agents.length) {
        sel.innerHTML = '<option value="">No agents</option>';
        sel.setAttribute('data-ade-populated', '1');
        pendingAgentId = null;
        if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_AGENT);
        document.dispatchEvent(new CustomEvent('ade-agentselectready', { detail: { id: '', agents: [] } }));
        return '';
      }
      sel.innerHTML = agents.map(function (a) {
        return '<option value="' + escOptLabel(rowAgentId(a)) + '">' + escOptLabel(rowAgentName(a)) + '</option>';
      }).join('');
      sel.setAttribute('data-ade-populated', '1');
      bindAgentSelectOnce(sel);
      var chosen = pickResolvedAgentId(agents, opts);
      pendingAgentId = null;
      sel.value = chosen;
      if (typeof localStorage !== 'undefined' && chosen) localStorage.setItem(STORAGE_AGENT, chosen);
      document.dispatchEvent(new CustomEvent('ade-agentselectready', { detail: { id: chosen, agents: agents } }));
      return chosen;
    }).catch(function () {
      sel.innerHTML = '<option value="">Could not load agents</option>';
      sel.setAttribute('data-ade-populated', '1');
      document.dispatchEvent(new CustomEvent('ade-agentselectready', { detail: { id: '', agents: [], error: true } }));
      return '';
    });
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
    fillApiBaseDisplay: fillApiBaseDisplay,
    getSelectedAgentId: getSelectedAgentId,
    setSelectedAgentId: setSelectedAgentId,
    refreshAgentSelect: refreshAgentSelect,
    listAgents: function () { return apiFetch('/v1/agents/'); },
    getAgent: function (id) { return apiFetch('/v1/agents/' + id); },
    createAgent: function (body) { return apiFetch('/v1/agents/', { method: 'POST', body: JSON.stringify(body) }); },
    updateAgent: function (id, body) { return apiFetch('/v1/agents/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteAgent: function (id) { return apiFetch('/v1/agents/' + id, { method: 'DELETE' }); },
    cancelAgentMessages: function (agentId, body) { return apiFetch('/v1/agents/' + agentId + '/messages/cancel', { method: 'POST', body: JSON.stringify(body || {}) }); },
    sendMessage: function (agentId, body) { return apiFetch('/v1/agents/' + agentId + '/messages', { method: 'POST', body: JSON.stringify(body) }); },
    getAgentMessages: function (agentId, params) {
      var q = '';
      if (params && Object.keys(params).length) q = '?' + new URLSearchParams(params).toString();
      return apiFetch('/v1/agents/' + agentId + '/messages' + q);
    },
    getAgentMemory: function (agentId, label) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + (label || 'persona')); },
    updateAgentMemory: function (agentId, label, body) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + (label || 'persona'), { method: 'PATCH', body: JSON.stringify(body) }); },
    listModels: function () { return apiFetch('/v1/models/'); },
    listTools: function () { return apiFetch('/v1/tools/'); },
    getTool: function (id) { return apiFetch('/v1/tools/' + id); },
    createTool: function (body) { return apiFetch('/v1/tools/', { method: 'POST', body: JSON.stringify(body) }); },
    updateTool: function (id, body) { return apiFetch('/v1/tools/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteTool: function (id) { return apiFetch('/v1/tools/' + id, { method: 'DELETE' }); },
    upsertTool: function (body) { return apiFetch('/v1/tools/', { method: 'PUT', body: JSON.stringify(body) }); },
    searchTools: function (body) { return apiFetch('/v1/tools/search', { method: 'POST', body: JSON.stringify(body || {}) }); },
    listMcpServers: function () { return apiFetch('/v1/mcp-servers/'); },
    getMcpServer: function (id) { return apiFetch('/v1/mcp-servers/' + id); },
    createMcpServer: function (body) { return apiFetch('/v1/mcp-servers/', { method: 'POST', body: JSON.stringify(body) }); },
    updateMcpServer: function (id, body) { return apiFetch('/v1/mcp-servers/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteMcpServer: function (id) { return apiFetch('/v1/mcp-servers/' + id, { method: 'DELETE' }); },
    refreshMcpServer: function (id, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/mcp-servers/' + id + '/refresh' + q, { method: 'PATCH' }); },
    listMcpServerTools: function (serverId) { return apiFetch('/v1/mcp-servers/' + serverId + '/tools'); },
    getMcpServerTool: function (serverId, toolId) { return apiFetch('/v1/mcp-servers/' + serverId + '/tools/' + toolId); },
    runMcpTool: function (serverId, toolId, body) { return apiFetch('/v1/mcp-servers/' + serverId + '/tools/' + toolId + '/run', { method: 'POST', body: JSON.stringify(body || {}) }); },
    listEmbeddingModels: function () { return apiFetch('/v1/models/embedding/'); },
    listRuns: function (params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + q); },
    getRun: function (id) { return apiFetch('/v1/runs/' + id); },
    getRunMessages: function (runId, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + runId + '/messages' + q); },
    getRunUsage: function (runId) { return apiFetch('/v1/runs/' + runId + '/usage'); },
    getRunSteps: function (runId, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + runId + '/steps' + q); },
    listAgentTools: function (agentId) { return apiFetch('/v1/agents/' + agentId + '/tools'); },
    listProjects: function () { return apiFetch('/v1/projects/'); },
    createProject: function (body) { return apiFetch('/v1/projects/', { method: 'POST', body: JSON.stringify(body) }); },
    getProject: function (id) { return apiFetch('/v1/projects/' + id); },
    updateProject: function (id, body) { return apiFetch('/v1/projects/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
    deleteProject: function (id) { return apiFetch('/v1/projects/' + id, { method: 'DELETE' }); }
  };

  refreshAgentSelect();
})();
