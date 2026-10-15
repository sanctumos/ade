(function () {
  'use strict';

  /**
   * Sanctum ADE v1: static HTML/CSS/JS against a Letta-compatible /v1 API.
   * Storage keys remain ade_faithful_* for continuity.
   */
  function svgIcon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }
  var ICONS = {
    dashboard: svgIcon('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    chat: svgIcon('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    agents: svgIcon('<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9.5 16h5"/>'),
    tools: svgIcon('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
    mcp: svgIcon('<path d="M12 2v6M12 16v6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6"/><circle cx="12" cy="12" r="3"/>'),
    settings: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    send: svgIcon('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
    trash: svgIcon('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    sliders: svgIcon('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
    plus: svgIcon('<path d="M12 5v14M5 12h14"/>'),
    chevron: svgIcon('<path d="m6 9 6 6 6-6"/>'),
    arrow: svgIcon('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    panelCollapse: svgIcon('<path d="M15 18l-6-6 6-6"/><path d="M9 4v16"/>'),
    panelExpand: svgIcon('<path d="M9 18l6-6-6-6"/><path d="M15 4v16"/>')
  };

  function navLink(href, key, label) {
    return '<a class="af-nav-link" href="' + href + '" title="' + label + '">' +
      ICONS[key] + '<span>' + label + '</span></a>';
  }

  var ADE_NAV_SHELL_HTML =
    '<button type="button" class="af-backdrop" id="nav-backdrop" aria-label="Close menu"></button>' +
    '<aside class="af-sidebar" id="af-sidebar">' +
    '<div class="af-brand">' +
    '<span class="af-brand-logo" aria-hidden="true">S</span>' +
    '<span class="af-brand-text"><span class="af-brand-mark">Sanctum ADE</span><span class="af-brand-sub">v1 · self-hosted</span></span>' +
    '<button type="button" class="af-sidebar-collapse" id="sidebar-collapse" aria-controls="af-sidebar" aria-expanded="true" title="Collapse sidebar" aria-label="Collapse sidebar">' +
    ICONS.panelCollapse +
    '</button>' +
    '</div>' +
    '<nav class="af-nav">' +
    '<div class="af-nav-section">Workspace</div>' +
    navLink('index.html', 'dashboard', 'Dashboard') +
    navLink('chat.html', 'chat', 'Chat') +
    navLink('agents.html', 'agents', 'Agents') +
    '<div class="af-nav-section" style="margin-top:14px">Server</div>' +
    navLink('tools.html', 'tools', 'Tools') +
    navLink('mcp.html', 'mcp', 'MCP') +
    navLink('settings.html', 'settings', 'Settings') +
    '</nav>' +
    '<div class="af-sidebar-agent">' +
    '<label class="af-sidebar-label" for="ade-agent-select">' +
    (window.ADE_TIP
      ? window.ADE_TIP.markup(
        'Active agent',
        'Which agent Chat and Configure use. Switch here anytime — it is saved in this browser.',
        'sidebar-agent'
      )
      : 'Active agent') +
    '</label>' +
    '<select id="ade-agent-select" class="af-select af-select-agent" aria-label="Active agent">' +
    '<option value="">Loading…</option>' +
    '</select>' +
    '<p class="af-api-badge">' +
    '<span class="af-dot" id="api-status-dot"></span>' +
    (window.ADE_TIP
      ? window.ADE_TIP.markup(
        'API',
        'Base URL for your self-hosted Letta server. Change it under Settings if the green/red status looks wrong.',
        'sidebar-api'
      )
      : '<span class="af-api-badge-text">API</span>') +
    ' <span class="af-api-badge-text" id="api-base-display">…</span></p>' +
    '</div>' +
    '</aside>';

  /** Stable hue + initials so each agent gets a recognizable avatar. */
  function avatarHue(name) {
    var s = String(name || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }
  function avatarInitials(name) {
    var parts = String(name || '?').replace(/[_\-.]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
  }
  function avatarHtml(name, size) {
    var cls = 'af-avatar' + (size ? ' af-avatar-' + size : '');
    var esc = String(avatarInitials(name)).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return '<span class="' + cls + '" style="--h:' + avatarHue(name) + '" aria-hidden="true">' + esc + '</span>';
  }
  function agentModelLabel(a) {
    if (!a) return '';
    var lc = a.llm_config || {};
    return String(lc.handle || a.model || lc.model || '');
  }
  function setApiStatus(ok) {
    var dot = document.getElementById('api-status-dot');
    if (!dot) return;
    dot.classList.toggle('is-ok', !!ok);
    dot.classList.toggle('is-bad', !ok);
  }

  var ADE_ACTIVE_NAV_HREF = {
    dashboard: 'index.html',
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
  var STORAGE_SKIN = 'af-skin-comp';
  var STORAGE_SIDEBAR = 'af-sidebar-collapsed';
  var SKIN_SLUGS = ['hey', 'ledger', 'brutalist', 'obsidian'];
  var SKIN_LABELS = {
    hey: 'HEY Bold',
    ledger: 'Ledger & Ink',
    brutalist: 'Brutalist Signal',
    obsidian: 'Obsidian Focus'
  };
  var pendingAgentId = null;

  function getSidebarCollapsed() {
    try {
      return localStorage.getItem(STORAGE_SIDEBAR) === '1';
    } catch (e) {
      return document.documentElement.getAttribute('data-sidebar-collapsed') === '1';
    }
  }
  function setSidebarCollapsed(collapsed) {
    collapsed = !!collapsed;
    try {
      if (collapsed) localStorage.setItem(STORAGE_SIDEBAR, '1');
      else localStorage.removeItem(STORAGE_SIDEBAR);
    } catch (e) { /* ignore */ }
    if (collapsed) document.documentElement.setAttribute('data-sidebar-collapsed', '1');
    else document.documentElement.removeAttribute('data-sidebar-collapsed');
    var btn = document.getElementById('sidebar-collapse');
    if (btn) {
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      btn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      btn.innerHTML = collapsed ? ICONS.panelExpand : ICONS.panelCollapse;
    }
    return collapsed;
  }
  function bindSidebarCollapse() {
    var btn = document.getElementById('sidebar-collapse');
    if (!btn) return;
    setSidebarCollapsed(getSidebarCollapsed());
    btn.addEventListener('click', function () {
      setSidebarCollapsed(!getSidebarCollapsed());
    });
  }

  function normalizeSkinSlug(slug) {
    var s = String(slug || '').toLowerCase().trim();
    return SKIN_SLUGS.indexOf(s) >= 0 ? s : 'hey';
  }
  function getSkin() {
    try {
      return normalizeSkinSlug(localStorage.getItem(STORAGE_SKIN));
    } catch (e) {
      return 'hey';
    }
  }
  function setSkin(slug) {
    slug = normalizeSkinSlug(slug);
    try { localStorage.setItem(STORAGE_SKIN, slug); } catch (e) { /* ignore */ }
    document.documentElement.setAttribute('data-skin-comp', slug);
    document.querySelectorAll('.af-skin-card').forEach(function (card) {
      card.classList.toggle('is-active', card.getAttribute('data-slug') === slug);
      var input = card.querySelector('input[type=radio]');
      if (input) input.checked = card.getAttribute('data-slug') === slug;
    });
    return slug;
  }

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
  [].forEach.call(document.querySelectorAll('[data-af-icon]'), function (el) {
    var svg = ICONS[el.getAttribute('data-af-icon')];
    if (svg) el.innerHTML = svg;
  });
  bindNavToggle();
  bindSidebarCollapse();
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
      setApiStatus(true);
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
      setApiStatus(false);
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
   * Consume an SSE (or JSON one-shot) Response. Shared by message send + run hitch.
   * handlers: { onEvent(obj), onDone(data?), onError(err) }
   */
  function consumeSseResponse(res, handlers) {
    handlers = handlers || {};
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
  }

  function sseFetch(url, payload, handlers, fetchOpts) {
    handlers = handlers || {};
    var headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
    var key = getConfig().key;
    if (key) headers.Authorization = 'Bearer ' + key;
    var init = Object.assign({ method: 'POST', headers: headers, body: JSON.stringify(payload || {}) }, fetchOpts || {});
    return fetch(url, init).then(function (res) {
      return consumeSseResponse(res, handlers);
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
    return sseFetch(apiUrl('/v1/agents/' + agentId + '/messages'), payload, handlers);
  }

  /**
   * Hitch onto an in-flight run (e.g. Broca-started). POST /v1/runs/:id/stream.
   * body: RetrieveStreamRequest — starting_after, include_pings, poll_interval, batch_size.
   */
  function streamRun(runId, body, handlers, fetchOpts) {
    var payload = Object.assign({ include_pings: true, starting_after: 0 }, body || {});
    return sseFetch(apiUrl('/v1/runs/' + encodeURIComponent(runId) + '/stream'), payload, handlers || {}, fetchOpts);
  }

  /** GET /v1/runs/active — optional agent_id / background query params. */
  function listActiveRuns(params) {
    var q = '';
    if (params && Object.keys(params).length) q = '?' + new URLSearchParams(params).toString();
    return apiFetch('/v1/runs/active' + q).then(function (d) {
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      if (d && Array.isArray(d.runs)) return d.runs;
      return [];
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

  /**
   * Whole collection in one request. Letta list endpoints default to small pages (agent tools: 10,
   * tools: 50) and the `after` cursor repeats rows on this server, so ask for a big page and grow it
   * if it comes back full.
   */
  function listAll(path, limit) {
    limit = limit || 1000;
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return apiFetch(path + sep + 'limit=' + limit).then(function (d) {
      var rows = Array.isArray(d) ? d : (d && Array.isArray(d.data)) ? d.data : null;
      if (!rows) return d;
      if (rows.length >= limit && limit < 25000) return listAll(path, limit * 5);
      var seen = {};
      return rows.filter(function (r) {
        var k = r && r.id != null ? String(r.id) : null;
        if (k === null) return true;
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
    });
  }

  window.ADE = {
    icons: ICONS,
    listAll: listAll,
    avatarHtml: avatarHtml,
    agentModelLabel: agentModelLabel,
    getConfig: getConfig,
    setStoredBase: setStoredBase,
    setStoredKey: setStoredKey,
    apiBase: apiBase,
    fillApiBaseDisplay: fillApiBaseDisplay,
    SKIN_SLUGS: SKIN_SLUGS,
    SKIN_LABELS: SKIN_LABELS,
    getSkin: getSkin,
    setSkin: setSkin,
    getSidebarCollapsed: getSidebarCollapsed,
    setSidebarCollapsed: setSidebarCollapsed,
    getSelectedAgentId: getSelectedAgentId,
    setSelectedAgentId: setSelectedAgentId,
    refreshAgentSelect: refreshAgentSelect,
    listAgents: function () { return listAll('/v1/agents/'); },
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
    /** GET /v1/agents/:id/context — ContextWindowOverview (token breakdown for the bar) */
    getAgentContext: function (agentId, params) {
      var q = '';
      if (params && Object.keys(params).length) q = '?' + new URLSearchParams(params).toString();
      return apiFetch('/v1/agents/' + agentId + '/context' + q);
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
    listTools: function () { return listAll('/v1/tools/'); },
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
    listActiveRuns: listActiveRuns,
    getRun: function (id) { return apiFetch('/v1/runs/' + id); },
    getRunMessages: function (runId, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + runId + '/messages' + q); },
    streamRun: streamRun,
    getRunUsage: function (runId) { return apiFetch('/v1/runs/' + runId + '/usage'); },
    getRunSteps: function (runId, params) { var q = params ? '?' + new URLSearchParams(params).toString() : ''; return apiFetch('/v1/runs/' + runId + '/steps' + q); },
    listAgentTools: function (agentId) { return listAll('/v1/agents/' + agentId + '/tools'); }
  };

  refreshAgentSelect();
})();
