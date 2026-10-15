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

  function pctOf(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
  }

  function segTipAttrs(label, tokens, pct, color) {
    /* Official ADE chart tooltip payload: "Label (N%)" + raw token count + color. */
    return ' data-ctx-label="' + esc(label) + ' (' + pct + '%)"' +
      ' data-ctx-value="' + esc(String(tokens)) + '"' +
      ' data-ctx-color="' + esc(color) + '"' +
      ' role="button" tabindex="0" aria-expanded="false"';
  }

  /* HMG CPH tooltip pattern: portal to body + fixed place + arrow (cph.php placeTip). */
  var ctxTipAnchor = null;

  function ensureCtxTip() {
    var tip = document.getElementById('chat-ctx-tip');
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'chat-ctx-tip';
    tip.className = 'chat-ctx-tip-bubble';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    tip.innerHTML =
      '<span class="chat-ctx-tip-swatch" aria-hidden="true"></span>' +
      '<span class="chat-ctx-tip-body">' +
        '<span class="chat-ctx-tip-label"></span>' +
        '<span class="chat-ctx-tip-value"></span>' +
      '</span>';
    document.body.appendChild(tip);
    tip._afTipHome = document.body;
    return tip;
  }

  function resetCtxTip() {
    var tip = document.getElementById('chat-ctx-tip');
    if (!tip) return;
    tip.hidden = true;
    tip.classList.remove('chat-ctx-tip-fixed', 'chat-ctx-tip-above');
    tip.style.left = '';
    tip.style.right = '';
    tip.style.top = '';
    tip.style.bottom = '';
    tip.style.removeProperty('--chat-ctx-tip-arrow-left');
    if (tip._afTipHome && tip.parentNode !== tip._afTipHome) {
      tip._afTipHome.appendChild(tip);
    }
    if (ctxTipAnchor) {
      ctxTipAnchor.setAttribute('aria-expanded', 'false');
      ctxTipAnchor = null;
    }
  }

  function fillCtxTip(seg) {
    var tip = ensureCtxTip();
    var sw = tip.querySelector('.chat-ctx-tip-swatch');
    var lab = tip.querySelector('.chat-ctx-tip-label');
    var val = tip.querySelector('.chat-ctx-tip-value');
    var color = seg.getAttribute('data-ctx-color') || 'transparent';
    if (sw) sw.style.background = color === 'transparent' ? 'var(--af-border)' : color;
    if (lab) lab.textContent = seg.getAttribute('data-ctx-label') || '';
    if (val) val.textContent = seg.getAttribute('data-ctx-value') || '';
    return tip;
  }

  function placeCtxTip(anchor, tip) {
    if (!anchor || !tip) return;
    if (!tip._afTipHome) tip._afTipHome = tip.parentNode || document.body;
    if (tip.parentNode !== document.body) document.body.appendChild(tip);
    tip.hidden = false;
    tip.classList.add('chat-ctx-tip-fixed');
    tip.classList.remove('chat-ctx-tip-above');
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.right = 'auto';
    tip.style.bottom = 'auto';
    var br = anchor.getBoundingClientRect();
    var gap = 8;
    var pad = 12;
    var tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var left = br.left;
    if (left + tw > vw - pad) left = vw - pad - tw;
    if (left < pad) left = pad;
    var openAbove = br.bottom + gap + th > vh - pad && br.top - gap - th >= pad;
    var top = openAbove ? (br.top - gap - th) : (br.bottom + gap);
    if (top < pad) top = pad;
    if (top + th > vh - pad) top = Math.max(pad, vh - pad - th);
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
    tip.classList.toggle('chat-ctx-tip-above', openAbove);
    var arrowLeft = Math.round(br.left + br.width / 2 - left - 5);
    arrowLeft = Math.max(10, Math.min(tw - 20, arrowLeft));
    tip.style.setProperty('--chat-ctx-tip-arrow-left', arrowLeft + 'px');
  }

  function openCtxTip(seg) {
    if (!seg) return;
    if (ctxTipAnchor && ctxTipAnchor !== seg) {
      ctxTipAnchor.setAttribute('aria-expanded', 'false');
    }
    var tip = fillCtxTip(seg);
    ctxTipAnchor = seg;
    seg.setAttribute('aria-expanded', 'true');
    placeCtxTip(seg, tip);
  }

  function toggleCtxTip(seg) {
    if (!seg) return;
    if (ctxTipAnchor === seg) {
      resetCtxTip();
      return;
    }
    openCtxTip(seg);
  }

  function repositionCtxTip() {
    if (!ctxTipAnchor) return;
    var tip = document.getElementById('chat-ctx-tip');
    if (tip && !tip.hidden) placeCtxTip(ctxTipAnchor, tip);
  }

  function bindCtxTip() {
    if (document.documentElement.getAttribute('data-ctx-tip-bound') === '1') return;
    document.documentElement.setAttribute('data-ctx-tip-bound', '1');
    ensureCtxTip();
    document.addEventListener('click', function (e) {
      var seg = e.target && e.target.closest ? e.target.closest('.chat-ctx-seg') : null;
      var host = document.getElementById('chat-context-bar');
      if (seg && host && host.contains(seg)) {
        e.preventDefault();
        e.stopPropagation();
        toggleCtxTip(seg);
        return;
      }
      if (!e.target.closest || (!e.target.closest('#chat-ctx-tip') && !e.target.closest('.chat-ctx-seg'))) {
        resetCtxTip();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') resetCtxTip();
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList &&
          e.target.classList.contains('chat-ctx-seg')) {
        e.preventDefault();
        toggleCtxTip(e.target);
      }
    });
    window.addEventListener('resize', repositionCtxTip);
    window.addEventListener('scroll', repositionCtxTip, true);
  }

  function renderContextBar(ctx) {
    var host = document.getElementById('chat-context-bar');
    if (!host) return;
    resetCtxTip();
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
      var pct = pctOf(s.tokens, max);
      return '<span class="chat-ctx-seg" style="width:' + w + '%;background:' + s.color + '"' +
        segTipAttrs(s.label, s.tokens, pct, s.color) + '></span>';
    }).join('');
    if (remaining > 0) {
      bars += '<span class="chat-ctx-seg chat-ctx-seg--free" style="width:' +
        ((remaining / chartMax) * 100) + '%"' +
        segTipAttrs('Remaining', remaining, pctOf(remaining, max), 'transparent') + '></span>';
    }

    host.innerHTML =
      '<div class="chat-ctx-top">' +
        '<div class="chat-ctx-title">Context window</div>' +
        '<div class="chat-ctx-stats">' +
          '<strong>' + fmtTokens(used) + '</strong> / ' + fmtTokens(max) +
          ' · <span class="chat-ctx-free">' + pctFree + '% free</span>' +
        '</div>' +
      '</div>' +
      '<div class="chat-ctx-track" role="group" aria-label="Context usage ' + pctUsed +
        '% used. Click a segment for details.">' + bars + '</div>';
    bindCtxTip();
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
    bindCtxTip();
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
