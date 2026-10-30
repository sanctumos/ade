/**
 * Overlay editor for custom Letta tools (Python source).
 * Built-in and MCP tools stay view/attach-only.
 */
(function () {
  'use strict';

  var DEFAULT_SOURCE =
    'def hello_world(name: str) -> str:\n' +
    '    """Greet someone.\n' +
    '\n' +
    '    Args:\n' +
    '        name (str): Who to greet.\n' +
    '\n' +
    '    Returns:\n' +
    '        str: A greeting.\n' +
    '    """\n' +
    '    return f"Hello, {name}!"\n';

  var root = null;
  var titleEl = null;
  var descEl = null;
  var codeEl = null;
  var pipEl = null;
  var errEl = null;
  var saveBtn = null;
  var delBtn = null;
  var session = null;
  var lastFocus = null;

  function parsePip(text) {
    var rows = [];
    String(text || '').split(/\n/).forEach(function (line) {
      var s = line.trim();
      if (!s || s.charAt(0) === '#') return;
      var m = s.match(/^([A-Za-z0-9_.-]+)\s*==\s*(.+)$/);
      if (m) rows.push({ name: m[1], version: m[2].trim() });
      else rows.push({ name: s });
    });
    return rows;
  }

  function formatPip(list) {
    if (!Array.isArray(list) || !list.length) return '';
    return list.map(function (p) {
      if (!p) return '';
      if (typeof p === 'string') return p;
      return p.version ? (p.name + '==' + p.version) : String(p.name || '');
    }).filter(Boolean).join('\n');
  }

  function close(force) {
    if (!root || !session) return;
    if (!force && codeEl.value !== session.initialCode) {
      if (!window.confirm('Discard unsaved tool changes?')) return;
    }
    root.hidden = true;
    root.classList.remove('is-open');
    document.body.classList.remove('af-memedit-open');
    session = null;
    if (errEl) errEl.textContent = '';
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus(); } catch (e) { /* detached */ }
    }
    lastFocus = null;
  }

  function save() {
    if (!session || !window.ADE) return;
    var source = (codeEl.value || '').trim();
    if (!source) {
      errEl.textContent = 'Source code is required.';
      return;
    }
    saveBtn.disabled = true;
    errEl.textContent = '';
    var body = {
      source_code: source,
      source_type: 'python'
    };
    var desc = (descEl.value || '').trim();
    if (desc) body.description = desc;
    var pip = parsePip(pipEl.value);
    if (pip.length) body.pip_requirements = pip;
    var req = session.toolId
      ? window.ADE.updateTool(session.toolId, body)
      : window.ADE.createTool(body);
    req.then(function (tool) {
      var cb = session.onSaved;
      saveBtn.disabled = false;
      close(true);
      if (typeof cb === 'function') cb(tool);
    }).catch(function (e) {
      errEl.textContent = (e && e.message) ? String(e.message) : 'Could not save this tool.';
      saveBtn.disabled = false;
    });
  }

  function removeTool() {
    if (!session || !session.toolId || !window.ADE) return;
    if (!window.confirm('Delete this custom tool from the server? Agents using it will lose the attachment.')) return;
    delBtn.disabled = true;
    errEl.textContent = '';
    window.ADE.deleteTool(session.toolId).then(function () {
      var cb = session.onDeleted;
      delBtn.disabled = false;
      close(true);
      if (typeof cb === 'function') cb();
    }).catch(function (e) {
      errEl.textContent = (e && e.message) ? String(e.message) : 'Could not delete this tool.';
      delBtn.disabled = false;
    });
  }

  function ensure() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'af-memedit af-tooledit';
    root.hidden = true;
    root.innerHTML =
      '<div class="af-memedit-dialog" role="dialog" aria-modal="true" aria-labelledby="af-tooledit-title">' +
        '<div class="af-memedit-head">' +
          '<div class="af-memedit-titles">' +
            '<h2 id="af-tooledit-title">Custom tool</h2>' +
            '<p class="af-memedit-desc">Python on your Letta server. The function name becomes the tool name. Schema is generated from the docstring.</p>' +
          '</div>' +
          '<button type="button" class="af-btn af-btn-ghost af-btn-sm" data-tooledit="close">Close</button>' +
        '</div>' +
        '<div class="af-memedit-body">' +
          '<div class="af-tooledit-fields">' +
            '<div class="af-field">' +
              '<label class="af-label" for="af-tooledit-desc">Description</label>' +
              '<input type="text" class="af-input" id="af-tooledit-desc" autocomplete="off" placeholder="What this tool does" />' +
            '</div>' +
            '<div class="af-field" style="flex:1;display:flex;flex-direction:column;min-height:0">' +
              '<label class="af-label" for="af-tooledit-code">Source</label>' +
              '<textarea class="af-input af-tooledit-code" id="af-tooledit-code" spellcheck="false"></textarea>' +
            '</div>' +
            '<div class="af-field">' +
              '<label class="af-label" for="af-tooledit-pip">Pip packages (optional, one per line)</label>' +
              '<textarea class="af-input" id="af-tooledit-pip" rows="2" placeholder="requests&#10;httpx==0.27.0"></textarea>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="af-memedit-foot">' +
          '<p class="af-memedit-err" id="af-tooledit-err" role="alert"></p>' +
          '<div class="af-memedit-actions">' +
            '<button type="button" class="af-btn af-btn-danger af-btn-sm" data-tooledit="delete" hidden>Delete</button>' +
            '<button type="button" class="af-btn af-btn-ghost" data-tooledit="cancel">Cancel</button>' +
            '<button type="button" class="af-btn af-btn-primary" data-tooledit="save">Save tool</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    titleEl = root.querySelector('#af-tooledit-title');
    descEl = root.querySelector('#af-tooledit-desc');
    codeEl = root.querySelector('#af-tooledit-code');
    pipEl = root.querySelector('#af-tooledit-pip');
    errEl = root.querySelector('#af-tooledit-err');
    saveBtn = root.querySelector('[data-tooledit="save"]');
    delBtn = root.querySelector('[data-tooledit="delete"]');
    root.querySelector('[data-tooledit="close"]').addEventListener('click', function () { close(false); });
    root.querySelector('[data-tooledit="cancel"]').addEventListener('click', function () { close(false); });
    saveBtn.addEventListener('click', save);
    delBtn.addEventListener('click', removeTool);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      }
    });
  }

  function open(opts) {
    opts = opts || {};
    ensure();
    lastFocus = document.activeElement;
    session = {
      toolId: opts.toolId || null,
      initialCode: opts.source_code != null ? String(opts.source_code) : DEFAULT_SOURCE,
      onSaved: opts.onSaved,
      onDeleted: opts.onDeleted
    };
    titleEl.textContent = opts.name ? String(opts.name) : (opts.toolId ? 'Edit tool' : 'New custom tool');
    descEl.value = opts.description != null ? String(opts.description) : '';
    codeEl.value = session.initialCode;
    pipEl.value = formatPip(opts.pip_requirements);
    errEl.textContent = '';
    delBtn.hidden = !session.toolId;
    saveBtn.disabled = false;
    delBtn.disabled = false;
    root.hidden = false;
    root.classList.add('is-open', 'is-fullscreen');
    if (root.parentNode !== document.body) document.body.appendChild(root);
    document.body.classList.add('af-memedit-open');
    codeEl.focus();
  }

  window.ADE_TOOL_EDITOR = {
    open: open,
    close: function () { close(true); },
    DEFAULT_SOURCE: DEFAULT_SOURCE
  };
})();
