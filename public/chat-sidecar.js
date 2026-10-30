/**
 * Chat sidecar: core-memory + archival panel + context-window usage bar.
 * Classic ADE: CoreMemorySidebar / ArchivalMemoriesPanel tabs in the same right-hand zone.
 */
(function () {
  'use strict';

  var STORAGE_MEM = 'af-chat-memory-open';
  var STORAGE_TAB = 'af-chat-memory-tab';
  var ARCHIVAL_PAGE = 20;
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
    archivalTimer: null,
    blocksFp: '',
    contextFp: '',
    archivalFp: '',
    contextBusy: false,
    blocksBusy: false,
    archivalBusy: false,
    blocksQueued: false,
    contextQueued: false,
    archivalQueued: false,
    blocks: [],
    passages: [],
    memTab: 'core',
    archivalSearch: '',
    archivalSearchTimer: null,
    archivalAfter: null,
    archivalHasMore: false
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
      return [b.id || '', b.label || '', b.limit || '', v, b.read_only ? 1 : 0].join(':');
    }).join('|');
  }
  function snippet(val) {
    var t = String(val || '').replace(/\s+/g, ' ').trim();
    if (!t) return '(empty)';
    return t.length > 160 ? t.slice(0, 157) + '…' : t;
  }
  function normPassages(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.passages)) return d.passages;
    if (d && Array.isArray(d.items)) return d.items;
    if (d && Array.isArray(d.results)) return d.results;
    return [];
  }
  function passageId(p) {
    return p && (p.id != null ? p.id : p.memory_id || p.passage_id || '');
  }
  function passageText(p) {
    if (!p) return '';
    if (p.text != null) return String(p.text);
    if (p.content != null) return String(p.content);
    if (p.value != null) return String(p.value);
    return '';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  }
  function passagesFingerprint(passages) {
    return passages.map(function (p) {
      return [passageId(p), passageText(p), p.created_at || ''].join(':');
    }).join('|');
  }
  function openMemoryEditor(label) {
    var block = null;
    var i;
    for (i = 0; i < state.blocks.length; i++) {
      if ((state.blocks[i].label || String(state.blocks[i].id || 'block')) === label) {
        block = state.blocks[i];
        break;
      }
    }
    if (!block || !window.ADE_MEMORY_EDITOR || !state.agentId) return;
    window.ADE_MEMORY_EDITOR.open({
      agentId: state.agentId,
      label: label,
      value: blockValue(block),
      description: block.description,
      limit: block.limit,
      readOnly: !!block.read_only,
      onSaved: function () {
        state.blocksFp = '';
        refreshBlocks();
      }
    });
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

  function isArchivalTab() {
    return state.memTab === 'archival';
  }

  function setMemTab(tab) {
    tab = tab === 'archival' ? 'archival' : 'core';
    state.memTab = tab;
    try { localStorage.setItem(STORAGE_TAB, tab); } catch (e) { /* ignore */ }
    document.querySelectorAll('.chat-memory-tab').forEach(function (btn) {
      var on = btn.getAttribute('data-mem-tab') === tab;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.chat-memory-pane').forEach(function (pane) {
      var on = pane.getAttribute('data-mem-pane') === tab;
      pane.classList.toggle('is-active', on);
      if (on) pane.removeAttribute('hidden');
      else pane.setAttribute('hidden', '');
    });
    var kind = document.getElementById('chat-memory-sub-kind');
    var countEl = document.getElementById('chat-memory-count');
    if (tab === 'archival') {
      if (kind) kind.textContent = 'passages';
      if (countEl) countEl.textContent = String(state.passages.length);
      refreshArchival(false);
    } else {
      if (kind) kind.textContent = 'attached · live';
      if (countEl) countEl.textContent = String(state.blocks.length);
    }
    scheduleTimers();
  }

  function pctOf(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
  }

  function segTipAttrs(label, tokens, pct, color) {
    return ' data-ctx-label="' + esc(label) + ' (' + pct + '%)"' +
      ' data-ctx-value="' + esc(String(tokens)) + '"' +
      ' data-ctx-color="' + esc(color) + '"' +
      ' role="button" tabindex="0" aria-expanded="false"';
  }

  function segRichHtml(seg) {
    var color = seg.getAttribute('data-ctx-color') || 'transparent';
    var bg = color === 'transparent' ? 'var(--af-border)' : color;
    return '<span class="af-tip-swatch" style="background:' + esc(bg) + '" aria-hidden="true"></span>' +
      '<span class="af-tip-rich-body">' +
        '<span class="af-tip-rich-label">' + esc(seg.getAttribute('data-ctx-label') || '') + '</span>' +
        '<span class="af-tip-rich-value">' + esc(seg.getAttribute('data-ctx-value') || '') + '</span>' +
      '</span>';
  }

  function bindCtxSegTips() {
    if (document.documentElement.getAttribute('data-ctx-seg-tip-bound') === '1') return;
    document.documentElement.setAttribute('data-ctx-seg-tip-bound', '1');
    document.addEventListener('click', function (e) {
      var seg = e.target && e.target.closest ? e.target.closest('.chat-ctx-seg') : null;
      var host = document.getElementById('chat-context-bar');
      if (!seg || !host || !host.contains(seg) || !window.ADE_TIP) return;
      e.preventDefault();
      e.stopPropagation();
      window.ADE_TIP.toggleFloating(seg, segRichHtml(seg));
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key !== 'Enter' && e.key !== ' ') || !e.target || !e.target.classList ||
          !e.target.classList.contains('chat-ctx-seg') || !window.ADE_TIP) return;
      e.preventDefault();
      window.ADE_TIP.toggleFloating(e.target, segRichHtml(e.target));
    });
  }

  function renderContextBar(ctx) {
    var host = document.getElementById('chat-context-bar');
    if (!host) return;
    if (window.ADE_TIP) window.ADE_TIP.closeFloating();
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

    var titleHtml = window.ADE_TIP
      ? window.ADE_TIP.markup(
        'Context window',
        'How full the model’s context is right now. Click a colored segment for that slice’s tokens and share of the window.',
        'chat-context'
      )
      : 'Context window';

    var editHref = state.agentId
      ? 'agent.html?id=' + encodeURIComponent(state.agentId) + '#cfg-context'
      : 'agents.html';
    host.innerHTML =
      '<div class="chat-ctx-top">' +
        '<div class="chat-ctx-title">' + titleHtml + '</div>' +
        '<div class="chat-ctx-stats">' +
          '<strong>' + fmtTokens(used) + '</strong> / ' + fmtTokens(max) +
          ' · <span class="chat-ctx-free">' + pctFree + '% free</span>' +
          ' · <a class="chat-ctx-edit" href="' + editHref + '">Change window size</a>' +
        '</div>' +
      '</div>' +
      '<div class="chat-ctx-track" role="group" aria-label="Context usage ' + pctUsed +
        '% used. Click a segment for details.">' + bars + '</div>';
    bindCtxSegTips();
  }

  function renderMemoryBlocks(blocks) {
    var host = document.getElementById('chat-memory-list');
    var countEl = document.getElementById('chat-memory-count');
    if (!host) return;
    if (countEl && !isArchivalTab()) countEl.textContent = String(blocks.length);
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
      var ro = !!b.read_only;
      var desc = b.description ? '<p class="chat-memory-desc">' + esc(b.description) + '</p>' : '';
      return '<article class="chat-memory-card' + (ro ? ' is-readonly' : '') + '" data-label="' + esc(label) + '" tabindex="0">' +
        '<div class="chat-memory-card-head">' +
          '<span class="chat-memory-label">' + esc(label) + (ro ? ' <em>read-only</em>' : '') + '</span>' +
          '<button type="button" class="af-btn af-btn-secondary af-btn-sm" data-mem-expand="' + esc(label) + '">' +
            (ro ? 'View' : 'Edit') +
          '</button>' +
        '</div>' +
        '<span class="chat-memory-meter" title="' + chars + ' / ' + (limit || '∞') + ' chars">' +
          '<span class="chat-memory-meter-fill" style="width:' + fill + '%"></span>' +
        '</span>' +
        '<span class="chat-memory-chars">' + fmtTokens(chars) + (limit ? ' / ' + fmtTokens(limit) : '') + '</span>' +
        desc +
        '<p class="chat-memory-snippet">' + esc(snippet(val)) + '</p>' +
      '</article>';
    }).join('');

    state.blocks = blocks;
    host.querySelectorAll('[data-mem-expand]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openMemoryEditor(btn.getAttribute('data-mem-expand'));
      });
    });
    host.querySelectorAll('.chat-memory-card').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-mem-expand]')) return;
        openMemoryEditor(el.getAttribute('data-label'));
      });
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openMemoryEditor(el.getAttribute('data-label'));
      });
    });
  }

  function openArchivalViewer(pid) {
    var passage = null;
    var i;
    for (i = 0; i < state.passages.length; i++) {
      if (String(passageId(state.passages[i])) === String(pid)) {
        passage = state.passages[i];
        break;
      }
    }
    if (!passage || !window.ADE_MEMORY_EDITOR) return;
    var when = fmtDate(passage.created_at);
    window.ADE_MEMORY_EDITOR.open({
      agentId: state.agentId,
      label: when ? 'Archival · ' + when : 'Archival passage',
      value: passageText(passage),
      description: pid ? 'Passage ' + pid : '',
      readOnly: true
    });
  }

  function setArchivalAddOpen(open) {
    var form = document.getElementById('chat-archival-add');
    if (!form) return;
    if (open) {
      form.removeAttribute('hidden');
      var ta = document.getElementById('chat-archival-text');
      if (ta) ta.focus();
    } else {
      form.setAttribute('hidden', '');
    }
  }

  function renderArchival(passages) {
    var host = document.getElementById('chat-archival-list');
    var countEl = document.getElementById('chat-memory-count');
    if (!host) return;
    state.passages = passages;
    if (countEl && isArchivalTab()) countEl.textContent = String(passages.length);
    if (!passages.length) {
      host.innerHTML = '<p class="chat-memory-empty">' +
        (state.archivalSearch ? 'No passages match that search.' : 'No archival passages yet.') +
        '</p>';
      return;
    }
    host.innerHTML = passages.map(function (p) {
      var pid = String(passageId(p) || '');
      var tx = passageText(p);
      var when = fmtDate(p.created_at);
      return '<article class="chat-memory-card chat-archival-card" data-arch-id="' + esc(pid) + '" tabindex="0">' +
        '<div class="chat-memory-card-head">' +
          '<span class="chat-memory-label">' + esc(when || (pid ? pid.slice(0, 12) : 'Passage')) + '</span>' +
          '<span>' +
            '<button type="button" class="af-btn af-btn-secondary af-btn-sm" data-arch-view="' + esc(pid) + '">View</button> ' +
            (pid ? '<button type="button" class="af-btn af-btn-sm af-btn-danger" data-arch-del="' + esc(pid) + '">Delete</button>' : '') +
          '</span>' +
        '</div>' +
        (pid ? '<p class="chat-archival-meta">' + esc(pid) + '</p>' : '') +
        '<p class="chat-memory-snippet">' + esc(snippet(tx)) + '</p>' +
      '</article>';
    }).join('') + (state.archivalHasMore
      ? '<button type="button" class="af-btn af-btn-secondary" id="chat-archival-more">Load more</button>'
      : '');

    host.querySelectorAll('[data-arch-view]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openArchivalViewer(btn.getAttribute('data-arch-view'));
      });
    });
    host.querySelectorAll('[data-arch-del]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var mid = btn.getAttribute('data-arch-del');
        if (!mid || !state.agentId) return;
        if (!window.confirm('Delete this archival passage?')) return;
        btn.disabled = true;
        window.ADE.deleteArchivalMemory(state.agentId, mid).then(function () {
          refreshArchival(true);
        }).catch(function () {
          btn.disabled = false;
        });
      });
    });
    host.querySelectorAll('.chat-archival-card').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        openArchivalViewer(el.getAttribute('data-arch-id'));
      });
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        openArchivalViewer(el.getAttribute('data-arch-id'));
      });
    });
    var more = document.getElementById('chat-archival-more');
    if (more) {
      more.addEventListener('click', function () {
        more.disabled = true;
        refreshArchival(false, { append: true });
      });
    }
  }

  function refreshArchival(force, opts) {
    if (!state.agentId || document.hidden) return;
    if (!isArchivalTab() && !force) return;
    opts = opts || {};
    if (state.archivalBusy) {
      state.archivalQueued = true;
      return;
    }
    state.archivalBusy = true;
    var params = { limit: String(ARCHIVAL_PAGE), ascending: 'false' };
    if (state.archivalSearch) params.search = state.archivalSearch;
    if (opts.append && state.archivalAfter) params.after = state.archivalAfter;
    window.ADE.listArchivalMemory(state.agentId, params).then(function (d) {
      state.archivalBusy = false;
      if (!state.agentId) return;
      var page = normPassages(d);
      var passages = opts.append ? state.passages.concat(page) : page;
      state.archivalHasMore = page.length >= ARCHIVAL_PAGE;
      var last = page.length ? passageId(page[page.length - 1]) : null;
      state.archivalAfter = last ? String(last) : null;
      var fp = passagesFingerprint(passages) + '|' + state.archivalSearch + '|' + (state.archivalHasMore ? 1 : 0);
      if (force || fp !== state.archivalFp) {
        state.archivalFp = fp;
        renderArchival(passages);
      }
      if (state.archivalQueued) {
        state.archivalQueued = false;
        refreshArchival(false);
      }
    }).catch(function () {
      state.archivalBusy = false;
      var host = document.getElementById('chat-archival-list');
      if (host && !host.querySelector('.chat-archival-card')) {
        host.innerHTML = '<p class="chat-memory-empty">Could not load archival memory.</p>';
      }
      if (state.archivalQueued) {
        state.archivalQueued = false;
        refreshArchival(false);
      }
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
    if (state.archivalTimer) { clearInterval(state.archivalTimer); state.archivalTimer = null; }
  }

  function scheduleTimers() {
    clearTimers();
    if (!state.agentId) return;
    /* Blocks: frequent — Broca attaches/detaches mid-stream. */
    state.blockTimer = setInterval(refreshBlocks, 4000);
    /* Context overview is heavier (~400KB on busy agents); slower poll + event refresh. */
    state.contextTimer = setInterval(refreshContext, 12000);
    /* Original ADE ArchivalMemoriesPanel refetchInterval is 10s while that tab is open. */
    if (isArchivalTab()) state.archivalTimer = setInterval(function () { refreshArchival(false); }, 10000);
  }

  var uiBound = false;
  function bindUi() {
    if (uiBound) return;
    uiBound = true;
    setMemoryOpen(isMemoryOpen());
    bindCtxSegTips();
    var btn = document.getElementById('chat-memory-collapse');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setMemoryOpen(!isMemoryOpen());
      });
    }
    document.querySelectorAll('.chat-memory-tab').forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function (e) {
        e.preventDefault();
        setMemTab(tabBtn.getAttribute('data-mem-tab'));
      });
    });
    var search = document.getElementById('chat-archival-search');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.trim();
        if (state.archivalSearchTimer) clearTimeout(state.archivalSearchTimer);
        state.archivalSearchTimer = setTimeout(function () {
          state.archivalSearch = q;
          state.archivalFp = '';
          state.archivalAfter = null;
          refreshArchival(true);
        }, 500);
      });
    }
    var addOpen = document.getElementById('chat-archival-add-open');
    if (addOpen) {
      addOpen.addEventListener('click', function (e) {
        e.preventDefault();
        var form = document.getElementById('chat-archival-add');
        setArchivalAddOpen(!(form && !form.hidden));
      });
    }
    var addCancel = document.getElementById('chat-archival-add-cancel');
    if (addCancel) {
      addCancel.addEventListener('click', function (e) {
        e.preventDefault();
        setArchivalAddOpen(false);
      });
    }
    var addForm = document.getElementById('chat-archival-add');
    if (addForm) {
      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!state.agentId) return;
        var ta = document.getElementById('chat-archival-text');
        var text = ta ? ta.value.trim() : '';
        if (!text) return;
        var saveBtn = document.getElementById('chat-archival-add-btn');
        if (saveBtn) saveBtn.disabled = true;
        window.ADE.createArchivalMemory(state.agentId, { text: text }).then(function () {
          if (ta) ta.value = '';
          setArchivalAddOpen(false);
          state.archivalFp = '';
          refreshArchival(true);
        }).catch(function () { /* leave form open */ }).finally(function () {
          if (saveBtn) saveBtn.disabled = false;
        });
      });
    }
    var savedTab = 'core';
    try { savedTab = localStorage.getItem(STORAGE_TAB) || 'core'; } catch (e) { savedTab = 'core'; }
    setMemTab(savedTab);
  }

  function startForAgent(agentId) {
    state.agentId = agentId || null;
    state.blocksFp = '';
    state.contextFp = '';
    state.archivalFp = '';
    state.archivalAfter = null;
    state.passages = [];
    clearTimers();
    var bar = document.getElementById('chat-context-bar');
    var list = document.getElementById('chat-memory-list');
    var arch = document.getElementById('chat-archival-list');
    var countEl = document.getElementById('chat-memory-count');
    if (!agentId) {
      if (bar) bar.innerHTML = '<div class="chat-ctx-empty">Select an agent to see context usage</div>';
      if (list) list.innerHTML = '<p class="chat-memory-empty">Select an agent.</p>';
      if (arch) arch.innerHTML = '<p class="chat-memory-empty">Select an agent.</p>';
      if (countEl) countEl.textContent = '0';
      return;
    }
    if (bar) bar.innerHTML = '<div class="chat-ctx-empty">Loading context…</div>';
    if (list) list.innerHTML = '<p class="chat-memory-empty">Loading blocks…</p>';
    if (arch && isArchivalTab()) arch.innerHTML = '<p class="chat-memory-empty">Loading archival…</p>';
    refreshBlocks();
    refreshContext();
    if (isArchivalTab()) refreshArchival(true);
    scheduleTimers();
  }

  function bump() {
    /* Call after send / hitch / stream finish so bar catches mid-turn attaches. */
    refreshBlocks();
    refreshContext();
    if (isArchivalTab()) refreshArchival(false);
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
    isMemoryOpen: isMemoryOpen,
    setMemTab: setMemTab
  };
})();
