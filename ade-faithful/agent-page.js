/**
 * Agent detail page — General / Tools / Memory / Archival (self-hosted Letta).
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var errorEl = document.getElementById('error');
  var currentAgent = null;

  function showErr(msg, warn) {
    errorEl.innerHTML = '<div class="af-alert ' + (warn ? 'af-alert-warn' : 'af-alert-danger') + '" role="alert">' + msg + '</div>';
  }

  document.querySelectorAll('.af-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-tab');
      document.querySelectorAll('.af-tab').forEach(function (t) {
        var on = t.getAttribute('data-tab') === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.af-tab-pane').forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-pane') === name);
      });
      if (name === 'archival') loadArchival();
    });
  });

  if (!id) {
    document.getElementById('title').textContent = 'No agent';
    document.getElementById('no-agent-hint').classList.remove('af-hidden');
    return;
  }

  document.getElementById('agent-editor').classList.remove('af-hidden');
  window.ADE.setSelectedAgentId(id);
  document.getElementById('chat-link').setAttribute(
    'href',
    'chat.html?agent=' + encodeURIComponent(id)
  );

  if (location.hash === '#tools') {
    var toolsTab = document.querySelector('.af-tab[data-tab="tools"]');
    if (toolsTab) toolsTab.click();
  } else if (location.hash === '#archival') {
    var archTab = document.querySelector('.af-tab[data-tab="archival"]');
    if (archTab) archTab.click();
  }

  function normList(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.tools)) return d.tools;
    return [];
  }
  function normBlocks(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.blocks)) return d.blocks;
    if (d && Array.isArray(d.memory_blocks)) return d.memory_blocks;
    if (d && Array.isArray(d.core_memory_blocks)) return d.core_memory_blocks;
    if (d && Array.isArray(d.block_list)) return d.block_list;
    if (d && Array.isArray(d.items)) return d.items;
    if (d && Array.isArray(d.results)) return d.results;
    if (d && (d.label || d.id != null) && (d.value !== undefined || d.content !== undefined || d.text !== undefined)) return [d];
    return [];
  }
  function normPassages(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.passages)) return d.passages;
    if (d && Array.isArray(d.items)) return d.items;
    if (d && Array.isArray(d.results)) return d.results;
    return [];
  }
  function modelId(m) { return m.handle != null ? m.handle : m.id || m.model || m.name; }
  function modelLabel(m) { return m.display_name != null ? m.display_name : m.handle || m.model || m.name || modelId(m); }
  function toolId(t) { return t.id != null ? t.id : t.tool_id || t.name; }
  function toolName(t) { return t.name != null ? t.name : t.tool_id || t.id; }

  var ADE_TOOL_GROUPS = ['builtin', 'mcp', 'other'];
  var ADE_TOOL_GROUP_LABEL = { builtin: 'Built-in & core', mcp: 'MCP & external', other: 'Other' };

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function toolGroupKey(t) {
    var raw = String((t && (t.tool_type != null ? t.tool_type : t.type)) || '').toLowerCase();
    if (!raw) return 'other';
    if (raw.indexOf('mcp') !== -1) return 'mcp';
    if (raw.indexOf('letta') !== -1 || raw.indexOf('builtin') !== -1 || raw.indexOf('core') !== -1) return 'builtin';
    return 'other';
  }

  function agentHasToolId(agentToolIds, tid) {
    var s = String(tid);
    for (var i = 0; i < agentToolIds.length; i++) {
      if (String(agentToolIds[i]) === s) return true;
    }
    return false;
  }

  var lastRegisteredTools = [];
  var toolsPanelWired = false;
  function initToolsPanelWire() {
    if (toolsPanelWired) return;
    toolsPanelWired = true;
    document.getElementById('tools-filter').addEventListener('input', applyToolsFilter);
    document.getElementById('tools-enable-visible').addEventListener('click', function () {
      document.querySelectorAll('.af-tool-row:not(.af-hidden) input[name="tool"]').forEach(function (c) { c.checked = true; });
      updateToolsCountBadge();
    });
    document.getElementById('tools-disable-visible').addEventListener('click', function () {
      document.querySelectorAll('.af-tool-row:not(.af-hidden) input[name="tool"]').forEach(function (c) { c.checked = false; });
      updateToolsCountBadge();
    });
    document.getElementById('tools-list-mount').addEventListener('change', function (e) {
      if (e.target && e.target.name === 'tool') updateToolsCountBadge();
    });
  }

  function updateToolsCountBadge() {
    var all = document.querySelectorAll('input[name="tool"]');
    var sel = document.querySelectorAll('input[name="tool"]:checked');
    var el = document.getElementById('tools-count-badge');
    if (!el) return;
    if (!all.length) { el.textContent = '0 tools'; return; }
    el.textContent = sel.length + ' / ' + all.length + ' enabled';
  }

  function applyToolsFilter() {
    var inp = document.getElementById('tools-filter');
    var q = (inp && inp.value || '').trim().toLowerCase();
    document.querySelectorAll('.af-tool-row').forEach(function (row) {
      var enc = row.getAttribute('data-ade-tool-search') || '';
      var blob = '';
      try { blob = decodeURIComponent(enc); } catch (e) { blob = ''; }
      row.classList.toggle('af-hidden', !(!q || blob.indexOf(q) !== -1));
    });
    document.querySelectorAll('[data-ade-tool-group]').forEach(function (g) {
      var any = g.querySelector('.af-tool-row:not(.af-hidden)');
      g.classList.toggle('af-hidden', !any);
    });
  }

  function mountAgentToolsList(tools, agentToolIds) {
    lastRegisteredTools = Array.isArray(tools) ? tools : [];
    var section = document.getElementById('tools-section');
    var mount = document.getElementById('tools-list-mount');
    var toolbar = document.getElementById('tools-toolbar');
    var filter = document.getElementById('tools-filter');
    var en = document.getElementById('tools-enable-visible');
    var dis = document.getElementById('tools-disable-visible');
    section.classList.remove('af-hidden');
    initToolsPanelWire();

    if (!tools.length) {
      toolbar.classList.add('af-hidden');
      filter.disabled = true;
      en.disabled = true;
      dis.disabled = true;
      mount.innerHTML = '<p class="af-muted" style="padding:12px">No tools registered yet. Connect <a href="mcp.html">MCP servers</a> or add tools via the API.</p>';
      updateToolsCountBadge();
      return;
    }

    toolbar.classList.remove('af-hidden');
    filter.disabled = false;
    en.disabled = false;
    dis.disabled = false;

    var byGroup = { builtin: [], mcp: [], other: [] };
    tools.forEach(function (t) {
      var k = toolGroupKey(t);
      if (!byGroup[k]) byGroup[k] = [];
      byGroup[k].push(t);
    });
    ADE_TOOL_GROUPS.forEach(function (gk) {
      (byGroup[gk] || []).sort(function (a, b) {
        return String(toolName(a)).toLowerCase().localeCompare(String(toolName(b)).toLowerCase());
      });
    });

    var idx = 0;
    var html = '';
    ADE_TOOL_GROUPS.forEach(function (gk) {
      var list = byGroup[gk] || [];
      if (!list.length) return;
      var gh = ADE_TOOL_GROUP_LABEL[gk] || gk;
      html += '<div data-ade-tool-group="' + escAttr(gk) + '">';
      html += '<div class="af-tool-group-header">' + escHtml(gh) + ' · ' + list.length + '</div>';
      list.forEach(function (t) {
        var tid = toolId(t);
        var nm = toolName(t);
        var typ = (t.tool_type != null ? t.tool_type : t.type) || '—';
        var desc = (t.description && String(t.description).trim()) ? String(t.description).trim() : '';
        if (desc.length > 220) desc = desc.slice(0, 217) + '…';
        var searchBlob = [nm, tid, typ, desc].join(' ').toLowerCase();
        var cbId = 'ade-tool-cb-' + idx;
        var checked = agentHasToolId(agentToolIds, tid) ? ' checked' : '';
        html += '<div class="af-tool-row" data-ade-tool-search="' + encodeURIComponent(searchBlob) + '">';
        html += '<input class="af-switch" type="checkbox" name="tool" id="' + cbId + '" value="' + escAttr(String(tid)) + '"' + checked + ' />';
        html += '<div class="af-grow"><label for="' + cbId + '" style="font-weight:500;cursor:pointer">' + escHtml(String(nm)) +
          ' <span class="af-badge">' + escHtml(String(typ)) + '</span></label>';
        if (desc) html += '<div class="af-meta" style="margin-top:4px">' + escHtml(desc) + '</div>';
        html += '<code class="af-meta" style="display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escAttr(String(tid)) + '">' + escHtml(String(tid)) + '</code>';
        html += '</div></div>';
        idx++;
      });
      html += '</div>';
    });

    mount.innerHTML = html;
    applyToolsFilter();
    updateToolsCountBadge();
  }

  function blockValue(b) {
    if (!b) return '';
    if (b.value != null && b.value !== '') return String(b.value);
    if (b.content != null && b.content !== '') return String(b.content);
    if (b.text != null && b.text !== '') return String(b.text);
    return '';
  }

  function applyLlmFieldsFromAgent(a) {
    var lc = (a && a.llm_config) || {};
    var t = document.getElementById('llm-temperature');
    var m = document.getElementById('llm-max-tokens');
    if (lc.temperature != null && lc.temperature !== '') t.value = String(lc.temperature);
    else t.value = '';
    if (lc.max_tokens != null && lc.max_tokens !== '') m.value = String(lc.max_tokens);
    else m.value = '';
  }

  function renderMemoryBlocks(blocks) {
    var host = document.getElementById('memory-blocks');
    host.innerHTML = '';
    if (!blocks.length) {
      host.innerHTML = '<p class="af-muted">No blocks from the API.</p>';
      return;
    }
    blocks.forEach(function (b) {
      var label = b.label || (b.id != null ? String(b.id) : '');
      if (!label) return;
      var wrap = document.createElement('div');
      wrap.className = 'af-card af-memory-card';
      var h = document.createElement('h3');
      h.style.cssText = 'margin:0 0 8px;font-size:14px';
      h.textContent = label;
      wrap.appendChild(h);
      var meta = [];
      if (b.description) meta.push(b.description);
      if (b.limit != null) meta.push('limit ' + b.limit + ' chars');
      if (meta.length) {
        var p = document.createElement('p');
        p.className = 'af-meta af-mb';
        p.textContent = meta.join(' · ');
        wrap.appendChild(p);
      }
      var ta = document.createElement('textarea');
      ta.className = 'af-input af-input-wide';
      ta.rows = Math.min(14, Math.max(6, Math.ceil(blockValue(b).length / 80) + 2));
      ta.value = blockValue(b);
      wrap.appendChild(ta);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'af-btn af-btn-secondary af-btn-sm af-mt';
      btn.textContent = 'Save "' + label + '"';
      (function (blockLabel, textarea, button) {
        button.onclick = function () {
          button.disabled = true;
          errorEl.innerHTML = '';
          window.ADE.updateAgentMemory(id, blockLabel, { value: textarea.value }).then(function () {
            button.disabled = false;
          }).catch(function (e) {
            showErr(e.message);
            button.disabled = false;
          });
        };
      })(label, ta, btn);
      wrap.appendChild(btn);
      host.appendChild(wrap);
    });
  }

  function loadMemoryBlocks() {
    var host = document.getElementById('memory-blocks');
    host.textContent = 'Loading blocks…';
    window.ADE.listAgentMemoryBlocks(id, { limit: '50' }).then(function (d) {
      renderMemoryBlocks(normBlocks(d));
    }).catch(function (e) {
      var msg = (e && e.message) ? String(e.message) : 'Request failed';
      host.innerHTML = '<div class="af-alert af-alert-warn" role="alert">Could not list memory blocks: ' +
        escHtml(msg) +
        '. Confirm the server exposes <code>GET /v1/agents/{id}/core-memory/blocks</code>.</div>';
    });
  }

  function passageId(p) {
    return p.id != null ? p.id : p.memory_id || p.passage_id || '';
  }
  function passageText(p) {
    if (p.text != null) return String(p.text);
    if (p.content != null) return String(p.content);
    if (p.value != null) return String(p.value);
    return '';
  }

  function renderArchival(passages) {
    var host = document.getElementById('archival-list');
    if (!passages.length) {
      host.innerHTML = '<p class="af-muted">No archival passages yet.</p>';
      return;
    }
    host.innerHTML = passages.map(function (p) {
      var pid = passageId(p);
      var tx = passageText(p);
      var preview = tx.length > 400 ? tx.slice(0, 397) + '…' : tx;
      return '<div class="af-card"><div class="af-spread"><div class="af-grow">' +
        '<pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:13px">' + escHtml(preview) + '</pre>' +
        (pid ? '<div class="af-meta af-mt">' + escHtml(String(pid)) + '</div>' : '') +
        '</div>' +
        (pid ? '<button type="button" class="af-btn af-btn-sm af-btn-danger" data-arch-del="' + escAttr(String(pid)) + '">Delete</button>' : '') +
        '</div></div>';
    }).join('');
    host.querySelectorAll('[data-arch-del]').forEach(function (btn) {
      btn.onclick = function () {
        var mid = btn.getAttribute('data-arch-del');
        if (!confirm('Delete this archival passage?')) return;
        btn.disabled = true;
        window.ADE.deleteArchivalMemory(id, mid).then(loadArchival).catch(function (e) {
          showErr(e.message);
          btn.disabled = false;
        });
      };
    });
  }

  var archivalLoaded = false;
  function loadArchival() {
    var host = document.getElementById('archival-list');
    host.textContent = 'Loading archival…';
    window.ADE.listArchivalMemory(id, { limit: '50', ascending: 'false' }).then(function (d) {
      archivalLoaded = true;
      renderArchival(normPassages(d));
    }).catch(function (e) {
      host.innerHTML = '<div class="af-alert af-alert-warn" role="alert">Archival memory unavailable: ' +
        escHtml((e && e.message) || 'error') +
        '. Needs <code>GET /v1/agents/{id}/archival-memory</code>.</div>';
    });
  }

  document.getElementById('archival-add').onsubmit = function (e) {
    e.preventDefault();
    var text = document.getElementById('archival-text').value.trim();
    if (!text) return;
    var btn = document.getElementById('archival-add-btn');
    btn.disabled = true;
    errorEl.innerHTML = '';
    window.ADE.createArchivalMemory(id, { text: text }).then(function () {
      document.getElementById('archival-text').value = '';
      return loadArchival();
    }).catch(function (err) { showErr(err.message); }).finally(function () { btn.disabled = false; });
  };

  function syncDangerZoneDeleteName(a) {
    var disp = document.getElementById('delete-agent-name-display');
    var input = document.getElementById('delete-agent-confirm-input');
    var btn = document.getElementById('delete-agent-confirm-btn');
    if (!disp || !input || !btn) return;
    var nm = '';
    if (a) {
      if (a.name != null && String(a.name).trim() !== '') nm = String(a.name).trim();
      else if (a.agent_name != null && String(a.agent_name).trim() !== '') nm = String(a.agent_name).trim();
    }
    if (!nm) nm = String(id || '').trim() || '—';
    disp.textContent = nm;
    input.value = '';
    btn.disabled = true;
  }

  window.ADE.getAgent(id).then(function (a) {
    currentAgent = a;
    document.getElementById('title').textContent = a.name || a.agent_name || id;
    document.getElementById('system').value = a.system || '';
    applyLlmFieldsFromAgent(a);
    syncDangerZoneDeleteName(a);
  }).catch(function (e) { showErr(e.message); });

  Promise.all([window.ADE.listModels().catch(function () { return []; }), window.ADE.listTools().catch(function () { return []; })]).then(function (arr) {
    var models = normList(arr[0]), tools = normList(arr[1]);
    window.ADE.getAgent(id).then(function (a) {
      currentAgent = a;
      if (models.length) {
        document.getElementById('model-row').classList.remove('af-hidden');
        var modelSelect = document.getElementById('model');
        modelSelect.innerHTML = '<option value="">—</option>' + models.map(function (m) {
          return '<option value="' + escAttr(String(modelId(m))) + '">' + escHtml(String(modelLabel(m))) + '</option>';
        }).join('');
        modelSelect.value = a.model || (a.llm_config && a.llm_config.model) || a.handle || '';
      }
      var agentToolIds = a.tool_ids || a.tools || [];
      if (!Array.isArray(agentToolIds)) agentToolIds = [];
      mountAgentToolsList(tools, agentToolIds);
      applyLlmFieldsFromAgent(a);
      syncDangerZoneDeleteName(a);
    });
  });

  loadMemoryBlocks();

  function setSaveConfigDisabled(disabled) {
    document.querySelectorAll('.ade-save-config').forEach(function (b) { b.disabled = !!disabled; });
  }

  function saveAgentConfiguration() {
    var body = {};
    var modelVal = document.getElementById('model').value;
    if (!document.getElementById('model-row').classList.contains('af-hidden') && modelVal) body.model = modelVal;
    body.system = document.getElementById('system').value;
    var checked = [].map.call(document.querySelectorAll('input[name=tool]:checked'), function (c) { return c.value; });
    body.tool_ids = checked;

    var llm = Object.assign({}, (currentAgent && currentAgent.llm_config) || {});
    var tv = document.getElementById('llm-temperature').value.trim();
    var mv = document.getElementById('llm-max-tokens').value.trim();
    if (tv !== '') llm.temperature = parseFloat(tv, 10);
    else delete llm.temperature;
    if (mv !== '') llm.max_tokens = parseInt(mv, 10);
    else delete llm.max_tokens;
    if (Object.keys(llm).length) body.llm_config = llm;

    setSaveConfigDisabled(true);
    errorEl.innerHTML = '';
    window.ADE.updateAgent(id, body).then(function (updated) {
      currentAgent = Object.assign({}, currentAgent || {}, updated);
      applyLlmFieldsFromAgent(currentAgent);
      var synced = (updated && (updated.tool_ids || updated.tools)) || checked;
      if (!Array.isArray(synced)) synced = checked;
      if (lastRegisteredTools.length) {
        mountAgentToolsList(lastRegisteredTools, synced);
      }
      setSaveConfigDisabled(false);
    }).catch(function (e) {
      showErr(e.message);
      setSaveConfigDisabled(false);
    });
  }

  document.querySelectorAll('.ade-save-config').forEach(function (btn) {
    btn.addEventListener('click', saveAgentConfiguration);
  });

  (function setupDangerZoneDelete() {
    var input = document.getElementById('delete-agent-confirm-input');
    var btn = document.getElementById('delete-agent-confirm-btn');
    var disp = document.getElementById('delete-agent-name-display');
    var toggle = document.getElementById('danger-zone-toggle');
    var body = document.getElementById('danger-zone-body');
    if (!input || !btn || !disp) return;
    function refreshDeleteBtn() {
      var expected = disp.textContent.trim();
      btn.disabled = !expected || input.value.trim() !== expected;
    }
    input.addEventListener('input', refreshDeleteBtn);
    btn.addEventListener('click', function () {
      var expected = disp.textContent.trim();
      if (!expected || input.value.trim() !== expected) return;
      if (!confirm('Final step: permanently delete agent "' + expected + '"? This cannot be undone.')) return;
      btn.disabled = true;
      errorEl.innerHTML = '';
      window.ADE.deleteAgent(id).then(function () { location.href = 'agents.html'; }).catch(function (e) {
        showErr(e.message);
        refreshDeleteBtn();
      });
    });
    if (body && toggle) {
      toggle.addEventListener('click', function () {
        var open = body.classList.toggle('af-hidden') === false;
        toggle.textContent = open ? 'Hide delete options' : 'Show delete options';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  })();
})();
