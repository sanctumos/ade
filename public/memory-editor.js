/**
 * Larger editor for a core-memory block.
 * Inline cards stay for short edits. This window is for longer ones, with full screen.
 */
(function () {
  'use strict';

  var root = null;
  var dialog = null;
  var titleEl = null;
  var descEl = null;
  var countEl = null;
  var ta = null;
  var saveBtn = null;
  var fsBtn = null;
  var errEl = null;
  var session = null;
  var lastFocus = null;

  function fmtCount(n, limit) {
    var s = String(n) + ' characters';
    if (limit) s += ' / ' + limit + ' limit';
    return s;
  }

  function updateCount() {
    if (!countEl || !ta || !session) return;
    var n = ta.value.length;
    countEl.textContent = fmtCount(n, session.limit);
    countEl.classList.toggle('is-over', !!(session.limit && n > session.limit));
  }

  function setFullscreen(on) {
    if (!root || !fsBtn) return;
    root.classList.toggle('is-fullscreen', on);
    fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    fsBtn.textContent = on ? 'Exit full screen' : 'Full screen';
  }

  function close(force) {
    if (!root || !session) return;
    if (!force && !session.readOnly && ta.value !== session.initial) {
      if (!window.confirm('Discard unsaved changes to “' + session.label + '”?')) return;
    }
    root.hidden = true;
    document.body.classList.remove('af-memedit-open');
    setFullscreen(false);
    session = null;
    if (errEl) errEl.textContent = '';
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus(); } catch (e) { /* detached */ }
    }
    lastFocus = null;
  }

  function save() {
    if (!session || session.readOnly || !window.ADE) return;
    saveBtn.disabled = true;
    errEl.textContent = '';
    var value = ta.value;
    window.ADE.updateAgentMemory(session.agentId, session.label, { value: value }).then(function () {
      var cb = session.onSaved;
      session.initial = value;
      saveBtn.disabled = false;
      if (typeof cb === 'function') cb(value);
      close(true);
    }).catch(function (e) {
      errEl.textContent = (e && e.message) ? String(e.message) : 'Could not save this block.';
      saveBtn.disabled = false;
    });
  }

  function ensure() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'af-memedit';
    root.hidden = true;
    root.innerHTML =
      '<div class="af-memedit-dialog" role="dialog" aria-modal="true" aria-labelledby="af-memedit-title">' +
        '<header class="af-memedit-head">' +
          '<div class="af-memedit-titles">' +
            '<h2 id="af-memedit-title"></h2>' +
            '<p class="af-memedit-desc" hidden></p>' +
          '</div>' +
          '<button type="button" class="af-btn af-btn-ghost af-btn-sm" data-memedit="close">Close</button>' +
        '</header>' +
        '<div class="af-memedit-body">' +
          '<textarea class="af-input af-memedit-text" spellcheck="true" aria-label="Memory block text"></textarea>' +
        '</div>' +
        '<footer class="af-memedit-foot">' +
          '<span class="af-memedit-count"></span>' +
          '<span class="af-memedit-err" role="alert"></span>' +
          '<div class="af-memedit-actions">' +
            '<button type="button" class="af-btn af-btn-secondary af-btn-sm" data-memedit="fs">Full screen</button>' +
            '<button type="button" class="af-btn af-btn-primary af-btn-sm" data-memedit="save">Save block</button>' +
          '</div>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(root);
    dialog = root.querySelector('.af-memedit-dialog');
    titleEl = root.querySelector('#af-memedit-title');
    descEl = root.querySelector('.af-memedit-desc');
    countEl = root.querySelector('.af-memedit-count');
    ta = root.querySelector('.af-memedit-text');
    saveBtn = root.querySelector('[data-memedit="save"]');
    fsBtn = root.querySelector('[data-memedit="fs"]');
    errEl = root.querySelector('.af-memedit-err');

    root.addEventListener('click', function (e) {
      if (e.target === root) close(false);
    });
    root.querySelector('[data-memedit="close"]').addEventListener('click', function () { close(false); });
    fsBtn.addEventListener('click', function () {
      setFullscreen(!root.classList.contains('is-fullscreen'));
      ta.focus();
    });
    saveBtn.addEventListener('click', save);
    ta.addEventListener('input', updateCount);
    document.addEventListener('keydown', function (e) {
      if (!session || root.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });
  }

  function open(opts) {
    ensure();
    opts = opts || {};
    lastFocus = document.activeElement;
    session = {
      agentId: opts.agentId,
      label: String(opts.label || 'block'),
      initial: opts.value != null ? String(opts.value) : '',
      readOnly: !!opts.readOnly,
      limit: Number(opts.limit) || 0,
      onSaved: opts.onSaved
    };
    titleEl.textContent = session.label;
    if (opts.description) {
      descEl.hidden = false;
      descEl.textContent = String(opts.description);
    } else {
      descEl.hidden = true;
      descEl.textContent = '';
    }
    ta.value = session.initial;
    ta.readOnly = session.readOnly;
    saveBtn.hidden = session.readOnly;
    errEl.textContent = '';
    setFullscreen(!!opts.fullscreen);
    updateCount();
    root.hidden = false;
    document.body.classList.add('af-memedit-open');
    ta.focus();
    var len = ta.value.length;
    try { ta.setSelectionRange(len, len); } catch (e) { /* readonly some browsers */ }
  }

  window.ADE_MEMORY_EDITOR = { open: open, close: function () { close(true); } };
})();
