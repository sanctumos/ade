(function () {
  'use strict';

  /**
   * ade-faithful: self-hosted Letta ADE (static HTML/CSS/JS, no Node, no Cloud).
   * Storage keys are namespaced so ade-simple and ade-faithful can coexist in one browser.
   */
  var ADE_NAV_SHELL_HTML =
    '<button type="button" class="af-backdrop" id="nav-backdrop" aria-label="Close menu"></button>' +
    '<aside class="af-sidebar">' +
    '<div class="af-brand"><span class="af-brand-mark">Letta</span><span class="af-brand-sub">ADE · self-hosted</span></div>' +
    '<nav class="af-nav">' +
    '<a class="af-nav-link" href="index.html">Dashboard</a>' +
    '<a class="af-nav-link" href="projects.html">Projects</a>' +
    '<a class="af-nav-link" href="chat.html">Chat</a>' +
    '<a class="af-nav-link" href="agents.html">Agents</a>' +
    '<a class="af-nav-link" href="tools.html">Tools</a>' +
    '<a class="af-nav-link" href="mcp.html">MCP</a>' +
    '<a class="af-nav-link" href="settings.html">Settings</a>' +
    '</nav>' +
    '<div class="af-sidebar-agent">' +
    '<label class="af-sidebar-label" for="ade-agent-select">Active agent</label>' +
    '<select id="ade-agent-select" class="af-select af-select-agent" aria-label="Active agent">' +
    '<option value="">Loading…</option>' +
    '</select>' +
    '</div>' +
    '<p class="af-api-badge">API <span id="api-base-display">…</span></p>' +
    '</aside>';

  var ADE_ACTIVE_NAV_HREF = {
    dashboard: 'index.html',
    projects: 'projects.html',
    chat: 'chat.html',
    agents: 'agents.html',
    tools: 'tools.html',
    mcp: 'mcp.html',
    settings: 'settings.html'
  };

  function injectAdeShell() {
    var layout = document.querySelector('.af-layout[data-ade-nav]') || document.querySelector('.layout[data-ade-nav]');
    var mount = document.getElementById('ade-nav-inject');
    if (!layout || !mount) return;
    mount.insertAdjacentHTML('beforebegin', ADE_NAV_SHELL_HTML);
    mount.remove();
    var active = (layout.getAttribute('data-ade-nav') || '').trim();
    var href = ADE_ACTIVE_NAV_HREF[active];
    if (href) {
      var link = layout.querySelector('.af-sidebar .af-nav-link[href="' + href + '"]');
      if (link) link.classList.add('is-active');
    }
  }

  var STORAGE_BASE = 'ade_faithful_base';
  var STORAGE_KEY = 'ade_faithful_key';
  var STORAGE_AGENT = 'ade_faithful_agent_id';
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
      var qs = new URLSearchParams(location.search);
      /* chat.html?agent=… and agent.html?id=… both count as selection hints */
      url = qs.get('agent') || qs.get('id') || '';
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

  /**
   * Letta POST /messages requires `input` (string shortcut) and/or `messages` ([]).
   * Legacy `message` is mapped to `input` so older callers keep working.
   */
  function normalizeAgentSendBody(body) {
    if (body == null || typeof body !== 'object') body = {};
    var out = Object.assign({}, body);
    var hasMessages = Array.isArray(out.messages);
    var hasInput = Object.prototype.hasOwnProperty.call(out, 'input');
    if (hasMessages || hasInput) {
      if (out.message !== undefined) delete out.message;
      return out;
    }
    if (out.message !== undefined) {
      out.input = out.message;
      delete out.message;
      return out;
    }
    return out;
  }

  /** Build request URL. Bases ending in proxy.php use ?path= (multihost PHP, no PATH_INFO). */
  function apiUrl(path) {
    if (path.indexOf('http') === 0) return path;
    var p = path.indexOf('/') === 0 ? path : '/' + path;
    var base = apiBase();
    if (/proxy\.php\/?$/i.test(base) || /proxy\.php$/i.test(base)) {
      var sep = base.indexOf('?') >= 0 ? '&' : '?';
      return base.replace(/\/$/, '') + sep + 'path=' + encodeURIComponent(p);
    }
    return base + p;
  }

  function apiFetch(path, options) {
    options = options || {};
    var url = apiUrl(path);
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

  /**
   * POST /v1/agents/:id/messages with streaming=true (SSE).
   * handlers: { onEvent(obj), onDone(), onError(err) }
   * Falls back to non-stream sendMessage if the server rejects streaming.
   */
  function sendMessageStream(agentId, body, handlers) {
    handlers = handlers || {};
    var payload = normalizeAgentSendBody(Object.assign({}, body || {}, {
      streaming: true,
      stream_tokens: body && body.stream_tokens === false ? false : true,
      include_pings: true
    }));
    var url = apiUrl('/v1/agents/' + agentId + '/messages');
    var headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
    var key = getConfig().key;
    if (key) headers.Authorization = 'Bearer ' + key;

    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(payload) }).then(function (res) {
      var ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!res.ok) {
        return res.text().then(function (t) {
          var err = new Error('API ' + res.status + ': ' + (t || res.statusText));
          if (handlers.onError) handlers.onError(err);
          throw err;
        });
      }
      /* Some servers ignore streaming and return JSON — treat as one-shot done. */
      if (ct.indexOf('application/json') !== -1) {
        return res.json().then(function (data) {
          if (handlers.onEvent) handlers.onEvent({ message_type: '_json_response', data: data });
          if (handlers.onDone) handlers.onDone(data);
          return data;
        });
      }
      if (!res.body || !res.body.getReader) {
        return res.text().then(function (t) {
          if (handlers.onDone) handlers.onDone(t);
          return t;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      function emitSseBlock(block) {
        var lines = block.split('\n');
        var dataLines = [];
        var eventName = '';
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('event:') === 0) eventName = line.slice(6).trim();
          else if (line.indexOf('data:') === 0) dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        if (!dataLines.length) return;
        var raw = dataLines.join('\n');
        if (raw === '[DONE]') return;
        try {
          var obj = JSON.parse(raw);
          if (eventName && obj && typeof obj === 'object' && !obj.event) obj._sse_event = eventName;
          if (handlers.onEvent) handlers.onEvent(obj);
        } catch (e) {
          if (handlers.onEvent) handlers.onEvent({ message_type: '_raw', content: raw, _sse_event: eventName });
        }
      }
      function pump() {
        return reader.read().then(function (result) {
          if (result.done) {
            if (buffer.trim()) emitSseBlock(buffer);
            if (handlers.onDone) handlers.onDone();
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (var j = 0; j < parts.length; j++) {
            if (parts[j].trim()) emitSseBlock(parts[j]);
          }
          return pump();
        });
      }
      return pump().catch(function (err) {
        if (handlers.onError) handlers.onError(err);
        throw err;
      });
    });
  }

  /**
   * Send with streaming preferred; on stream failure, fall back to non-stream.
   * handlers same as sendMessageStream; also called for fallback JSON via onEvent(_json_response).
   */
  function sendMessagePreferStream(agentId, body, handlers) {
    handlers = handlers || {};
    var streamStarted = false;
    var wrapped = {
      onEvent: function (obj) {
        streamStarted = true;
        if (handlers.onEvent) handlers.onEvent(obj);
      },
      onDone: handlers.onDone,
      onError: handlers.onError
    };
    return sendMessageStream(agentId, body, wrapped).catch(function (err) {
      var msg = (err && err.message) ? String(err.message) : '';
      /* Only fall back if the server rejected streaming before any events (not mid-stream). */
      if (streamStarted) throw err;
      if (!/^API (400|404|405|415|422|501)\b/.test(msg)) throw err;
      return apiFetch('/v1/agents/' + agentId + '/messages', {
        method: 'POST',
        body: JSON.stringify(normalizeAgentSendBody(body))
      }).then(function (data) {
        if (handlers.onEvent) handlers.onEvent({ message_type: '_json_response', data: data });
        if (handlers.onDone) handlers.onDone(data);
        return data;
      });
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
    sendMessage: function (agentId, body) { return apiFetch('/v1/agents/' + agentId + '/messages', { method: 'POST', body: JSON.stringify(normalizeAgentSendBody(body)) }); },
    sendMessageStream: sendMessageStream,
    sendMessagePreferStream: sendMessagePreferStream,
    getAgentMessages: function (agentId, params) {
      var q = '';
      if (params && Object.keys(params).length) q = '?' + new URLSearchParams(params).toString();
      return apiFetch('/v1/agents/' + agentId + '/messages' + q);
    },
    getAgentMemory: function (agentId, label) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + encodeURIComponent(label || 'persona')); },
    updateAgentMemory: function (agentId, label, body) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + encodeURIComponent(label || 'persona'), { method: 'PATCH', body: JSON.stringify(body) }); },
    /** GET /v1/agents/:id/core-memory/blocks — all memory blocks (persona, human, …) */
    listAgentMemoryBlocks: function (agentId, params) {
      var q = '';
      if (params && Object.keys(params).length) q = '?' + new URLSearchParams(params).toString();
      var primary = '/v1/agents/' + agentId + '/core-memory/blocks' + q;
      var fallback = '/v1/agents/' + agentId + '/core-memory/blocks/' + q;
      return apiFetch(primary).catch(function (e) {
        var m = (e && e.message) ? String(e.message) : '';
        if (m.indexOf('API 404') !== -1) return apiFetch(fallback);
        throw e;
      });
    },
    listArchivalMemory: function (agentId, params) {
      var q = '';
      if (params && Object.keys(params).length) q = '?' + new URLSearchParams(params).toString();
      return apiFetch('/v1/agents/' + agentId + '/archival-memory' + q);
    },
    createArchivalMemory: function (agentId, body) {
      return apiFetch('/v1/agents/' + agentId + '/archival-memory', { method: 'POST', body: JSON.stringify(body || {}) });
    },
    deleteArchivalMemory: function (agentId, memoryId) {
      return apiFetch('/v1/agents/' + agentId + '/archival-memory/' + encodeURIComponent(memoryId), { method: 'DELETE' });
    },
    searchArchivalMemory: function (agentId, body) {
      return apiFetch('/v1/agents/' + agentId + '/archival-memory/search', { method: 'POST', body: JSON.stringify(body || {}) });
    },
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
