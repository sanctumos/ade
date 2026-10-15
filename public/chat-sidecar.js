/**
 * Chat sidecar: core-memory block panel + context-window usage bar.
 * Mirrors the official Letta ADE CoreMemorySidebar + ContextWindowPreview.
 */
(function () {
  'use strict';

  var STORAGE_MEM = 'af-chat-memory-open';
  var SEGMENTS = [
    { key: 'system', label: 'System', color: '#3f5ff9', fields: ['num_tokens_system', 'num_tokens_tool_usage_rules'] },
    { key: 'tools', label: 'Tools', color: '#6ba5b3', fields: ['num_tokens_functions_definitions'] },
    { key: 'external', label: 'External', color: '#36a373', fields: ['num_tokens_external_memory_summary', 'num_tokens_directories'] },
    { key: 'memory', label: 'Memory', color: '#fce054', fields: ['num_tokens_core_memory', 'num_tokens_memory_filesystem'] },
    { key: 'summary', label: 'Summary', color: '#ff8c00', fields: ['num_tokens_summary_memory'] },
    { key: 'messages', label: 'Messages', color: '#9d37f9', fields: ['num_tokens_messages'] }
  ];

  var state = {
    agentId: null,
    blockTimer: null,
    contextTimer: null,
    blocksFp: '',
    contextFp: '',
    contextBusy: false,
    blocksBusy: false,
    blocksQueued: false,
    contextQueued: false,
    openBlock: null
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtTokens(n) {
    n = Math.round(Number(n) || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 10000) return Math.round(n / 1000) + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function sumFields(ctx, fields) {
    var t = 0;
    for (var i = 0; i < fields.length; i++) t += Number(ctx[fields[i]]) || 0;
    return t;
  }
  function normBlocks(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.blocks)) return d.blocks;
    if (d && Array.isArray(d.memory_blocks)) return d.memory_blocks;
    if (d && Array.isArray(d.core_memory_blocks)) return d.core_memory_blocks;
    if (d && Array.isArray(d.data)) return d.data;
    return [];
  }
  function blockValue(b) {
    if (b.value != null) return String(b.value);
    if (b.content != null) return String(b.content);
    if (b.text != null) return String(b.text);
    return '';
  }
  function blocksFingerprint(blocks) {
    return blocks.map(function (b) {
      var v = blockValue(b);
      return [b.id || '', b.label || '', b.limit || '', v.length, b.read_only ? 1 : 0].join(':');
    }).join('|');
  }
  function contextFingerprint(ctx) {
    if (!ctx) return '';
    return [
      ctx.context_window_size_max,
      ctx.context_window_size_current,
      ctx.num_tokens_system, ctx.num_tokens_tool_usage_rules,
      ctx.num_tokens_functions_definitions,
      ctx.num_tokens_external_memory_summary, ctx.num_tokens_directories,
      ctx.num_tokens_core_memory, ctx.num_tokens_memory_filesystem,
      ctx.num_tokens_summary_memory, ctx.num_tokens_messages
    ].join(':');
  }

  /* Same glyphs as app.js sidebar collapse, mirrored for a right-hand panel. */
  var ICON_COLLAPSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/><path d="M15 4v16"/></svg>';
  var ICON_EXPAND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/><path d="M9 4v16"/></svg>';

  function isMemoryOpen() {
    try { return localStorage.getItem(STORAGE_MEM) !== '0'; } catch (e) { return true; }
  }
  function setMemoryOpen(open) {
    open = !!open;
    try {
      if (open) localStorage.setItem(STORAGE_MEM, '1');
      else localStorage.setItem(STORAGE_MEM, '0');
    } catch (e) { /* ignore */ }
    document.documentElement.setAttribute('data-chat-memory', open ? 'open' : 'closed');
    var btn = document.getElementById('chat-memory-collapse');
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('title', open ? 'Collapse memory panel' : 'Expand memory panel');
      btn.setAttribute('aria-label', open ? 'Collapse memory panel' : 'Expand memory panel');
      btn.innerHTML = open ? ICON_COLLAPSE : ICON_EXPAND;
    }
    var panel = document.getElementById('chat-memory-panel');
    if (panel) {
      panel.removeAttribute('hidden');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
  }

  function renderContextBar(ctx) {
    var host = document.getElementById('chat-context-bar');
    if (!host) return;
    if (!ctx) {
      host.innerHTML = '<div class="chat-ctx-empty">Context usage unavailable</div>';
      return;
    }
    var max = Number(ctx.context_window_size_max) || 0;
    var segs = SEGMENTS.map(function (s) {
      return { key: s.key, label: s.label, color: s.color, tokens: sumFields(ctx, s.fields) };
    });
    var used = segs.reduce(function (a, s) { return a + s.tokens; }, 0);
    if (!max) max = Number(ctx.context_window_size_current) || used || 1;
    var remaining = Math.max(0, max - used);
    var chartMax = Math.max(max, used) || 1;
    var pctUsed = Math.min(100, Math.round((used / max) * 1000) / 10);
    var pctFree = Math.max(0, Math.round(((max - used) / max) * 1000) / 10);

    var bars = segs.filter(function (s) { return s.tokens > 0; }).map(function (s) {
      var w = (s.tokens / chartMax) * 100;
      return '<span class="chat-ctx-seg" style="width:' + w + '%;background:' + s.color + '" title="' +
        esc(s.label) + ': ' + fmtTokens(s.tokens) + ' tokens"></span>';
    }).join('');
    if (remaining > 0) {
      bars += '<span class="chat-ctx-seg chat-ctx-seg--free" style="width:' + ((remaining / chartMax) * 100) +
        '%" title="Free: ' + fmtTokens(remaining) + ' tokens"></span>';
    }

    var legend = segs.filter(function (s) { return s.tokens > 0; }).map(function (s) {
      return '<li><span class="chat-ctx-swatch" style="background:' + s.color + '"></span>' +
        esc(s.label) + ' <em>' + fmtTokens(s.tokens) + '</em></li>';
    }).join('');

    host.innerHTML =
      '<div class="chat-ctx-top">' +
        '<div class="chat-ctx-title">Context window</div>' +
        '<div class="chat-ctx-stats">' +
          '<strong>' + fmtTokens(used) + '</strong> / ' + fmtTokens(max) +
          ' · <span class="chat-ctx-free">' + pctFree + '% free</span>' +
        '</div>' +
      '</div>' +
      '<div class="chat-ctx-track" role="img" aria-label="Context usage ' + pctUsed + '% used">' + bars + '</div>' +
      '<ul class="chat-ctx-legend">' + legend + '</ul>';
  }

  function renderMemoryBlocks(blocks) {
    var host = document.getElementById('chat-memory-list');
    var countEl = document.getElementById('chat-memory-count');
    if (!host) return;
    if (countEl) countEl.textContent = String(blocks.length);
    if (!blocks.length) {
      host.innerHTML = '<p class="chat-memory-empty">No memory blocks attached.</p>';
      return;
    }
    host.innerHTML = blocks.map(function (b) {
      var label = b.label || String(b.id || 'block');
      var val = blockValue(b);
      var limit = Number(b.limit) || 0;
      var chars = val.length;
      var fill = limit > 0 ? Math.min(100, Math.round((chars / limit) * 1000) / 10) : 0;
      var open = state.openBlock === label;
      var ro = !!b.read_only;
      var desc = b.description ? '<p class="chat-memory-desc">' + esc(b.description) + '</p>' : '';
      return '<details class="chat-memory-card' + (ro ? ' is-readonly' : '') + '"' +
        (open ? ' open' : '') + ' data-label="' + esc(label) + '">' +
        '<summary>' +
          '<span class="chat-memory-label">' + esc(label) + (ro ? ' <em>read-only</em>' : '') + '</span>' +
          '<span class="chat-memory-meter" title="' + chars + ' / ' + (limit || '∞') + ' chars">' +
            '<span class="chat-memory-meter-fill" style="width:' + fill + '%"></span>' +
          '</span>' +
          '<span class="chat-memory-chars">' + fmtTokens(chars) + (limit ? ' / ' + fmtTokens(limit) : '') + '</span>' +
        '</summary>' +
        desc +
        '<pre class="chat-memory-value">' + esc(val || '(empty)') + '</pre>' +
        '</details>';
    }).join('');

    host.querySelectorAll('details.chat-memory-card').forEach(function (el) {
      el.addEventListener('toggle', function () {
        if (el.open) state.openBlock = el.getAttribute('data-label');
        else if (state.openBlock === el.getAttribute('data-label')) state.openBlock = null;
      });
    });
  }

  function refreshBlocks() {
    if (!state.agentId || document.hidden) return;
    if (state.blocksBusy) {
      state.blocksQueued = true;
      return;
    }
    state.blocksBusy = true;
    window.ADE.listAgentMemoryBlocks(state.agentId, { limit: '100' }).then(function (d) {
      state.blocksBusy = false;
      if (!state.agentId) return;
      var blocks = normBlocks(d);
      var fp = blocksFingerprint(blocks);
      if (fp !== state.blocksFp) {
        state.blocksFp = fp;
        renderMemoryBlocks(blocks);
      }
      if (state.blocksQueued) {
        state.blocksQueued = false;
        refreshBlocks();
      }
    }).catch(function () {
      state.blocksBusy = false;
      var host = document.getElementById('chat-memory-list');
      if (host && !host.querySelector('.chat-memory-card')) {
        host.innerHTML = '<p class="chat-memory-empty">Could not load memory blocks.</p>';
      }
      if (state.blocksQueued) {
        state.blocksQueued = false;
        refreshBlocks();
      }
    });
  }

  function refreshContext() {
    if (!state.agentId || document.hidden) return;
    if (state.contextBusy) {
      state.contextQueued = true;
      return;
    }
    state.contextBusy = true;
    window.ADE.getAgentContext(state.agentId).then(function (ctx) {
      state.contextBusy = false;
      if (!state.agentId) return;
      var fp = contextFingerprint(ctx);
      if (fp !== state.contextFp) {
        state.contextFp = fp;
        renderContextBar(ctx);
      }
      if (state.contextQueued) {
        state.contextQueued = false;
        refreshContext();
      }
    }).catch(function () {
      state.contextBusy = false;
      if (!state.contextFp) renderContextBar(null);
      if (state.contextQueued) {
        state.contextQueued = false;
        refreshContext();
      }
    });
  }

  function clearTimers() {
    if (state.blockTimer) { clearInterval(state.blockTimer); state.blockTimer = null; }
    if (state.contextTimer) { clearInterval(state.contextTimer); state.contextTimer = null; }
  }

  function scheduleTimers() {
    clearTimers();
    if (!state.agentId) return;
    /* Blocks: frequent — Broca attaches/detaches mid-stream. */
    state.blockTimer = setInterval(refreshBlocks, 4000);
    /* Context overview is heavier (~400KB on busy agents); slower poll + event refresh. */
    state.contextTimer = setInterval(refreshContext, 12000);
  }

  var uiBound = false;
  function bindUi() {
    if (uiBound) return;
    uiBound = true;
    setMemoryOpen(isMemoryOpen());
    var btn = document.getElementById('chat-memory-collapse');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setMemoryOpen(!isMemoryOpen());
      });
    }
  }

  function startForAgent(agentId) {
    state.agentId = agentId || null;
    state.blocksFp = '';
    state.contextFp = '';
    state.openBlock = null;
    clearTimers();
    var bar = document.getElementById('chat-context-bar');
    var list = document.getElementById('chat-memory-list');
    var countEl = document.getElementById('chat-memory-count');
    if (!agentId) {
      if (bar) bar.innerHTML = '<div class="chat-ctx-empty">Select an agent to see context usage</div>';
      if (list) list.innerHTML = '<p class="chat-memory-empty">Select an agent.</p>';
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (bar) bar.innerHTML = '<div class="chat-ctx-empty">Loading context…</div>';
    if (list) list.innerHTML = '<p class="chat-memory-empty">Loading blocks…</p>';
    refreshBlocks();
    refreshContext();
    scheduleTimers();
  }

  function bump() {
    /* Call after send / hitch / stream finish so bar catches mid-turn attaches. */
    refreshBlocks();
    refreshContext();
  }

  /* Bind once — dual DOMContentLoaded + readyState paths double-toggle (looks broken). */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUi);
  } else {
    bindUi();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimers();
      return;
    }
    if (!state.agentId) return;
    bump();
    scheduleTimers();
  });

  window.ADE_CHAT_SIDECAR = {
    startForAgent: startForAgent,
    stop: function () { state.agentId = null; clearTimers(); },
    bump: bump,
    setMemoryOpen: setMemoryOpen,
    isMemoryOpen: isMemoryOpen
  };
})();
