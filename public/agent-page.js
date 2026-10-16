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

  function escHtml(s) {
    return (window.ADE_TOOLS_UI && window.ADE_TOOLS_UI.escHtml)
      ? window.ADE_TOOLS_UI.escHtml(s)
      : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escAttr(s) {
    return (window.ADE_TOOLS_UI && window.ADE_TOOLS_UI.escAttr)
      ? window.ADE_TOOLS_UI.escAttr(s)
      : String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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
    el.textContent = sel.length + ' / ' + all.length + ' attached';
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
      if (q && any && g.tagName === 'DETAILS') g.open = true;
    });
  }

  function mountAgentToolsList(tools, agentToolIds) {
    lastRegisteredTools = Array.isArray(tools) ? tools : [];
    var UI = window.ADE_TOOLS_UI;
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

    if (!UI) {
      mount.innerHTML = '<p class="af-alert af-alert-warn" style="margin:12px">tools-ui.js failed to load.</p>';
      return;
    }

    var grouped = UI.groupTools(tools, agentToolIds);
    var attachedIds = {};
    grouped.attached.forEach(function (t) { attachedIds[String(UI.toolId(t))] = true; });
    var idx = 0;
    var html = '';

    if (grouped.mcpRetired.length) {
      var retiredCount = grouped.mcpRetired.reduce(function (n, b) { return n + b.tools.length; }, 0);
      html += '<p class="af-tool-note">Names like <code>tasks.disabled.…__…</code> are from a <strong>retired MCP server id</strong>, not the attach checkbox. Prefer the live server (e.g. <code>q_vernal_tasks</code>). ' +
        retiredCount + ' tools sit under Retired below.</p>';
    }

    function rowsFor(list, skipAttached) {
      return list.filter(function (t) {
        if (!skipAttached) return true;
        return !attachedIds[String(UI.toolId(t))];
      }).map(function (t) {
        var tid = UI.toolId(t);
        var row = UI.toolRowHtml(t, {
          checkbox: true,
          cbId: 'ade-tool-cb-' + idx,
          checked: agentHasToolId(agentToolIds, tid)
        });
        idx++;
        return row;
      }).join('');
    }

    if (grouped.attached.length) {
      html += UI.detailsHtml('Attached to this agent', grouped.attached.length, rowsFor(grouped.attached, false), true);
    }
    var builtinRows = rowsFor(grouped.builtin, true);
    if (builtinRows) {
      html += UI.detailsHtml('Built-in & core', grouped.builtin.filter(function (t) { return !attachedIds[String(UI.toolId(t))]; }).length, builtinRows, grouped.builtin.length <= 24);
    }
    grouped.mcpActive.forEach(function (bucket) {
      var body = rowsFor(bucket.tools, true);
      var n = bucket.tools.filter(function (t) { return !attachedIds[String(UI.toolId(t))]; }).length;
      if (!body) return;
      html += UI.detailsHtml('MCP · ' + bucket.server, n, body, false);
    });
    var otherRows = rowsFor(grouped.other, true);
    if (otherRows) {
      html += UI.detailsHtml('Other', grouped.other.filter(function (t) { return !attachedIds[String(UI.toolId(t))]; }).length, otherRows, false);
    }
    if (grouped.mcpRetired.length) {
      var retiredParts = [];
      var retiredLeft = 0;
      grouped.mcpRetired.forEach(function (bucket) {
        var body = rowsFor(bucket.tools, true);
        var n = bucket.tools.filter(function (t) { return !attachedIds[String(UI.toolId(t))]; }).length;
        if (!body) return;
        retiredLeft += n;
        retiredParts.push(UI.detailsHtml('Retired · ' + bucket.server, n, body, false));
      });
      if (retiredParts.length) {
        html += UI.detailsHtml('Retired MCP servers', retiredLeft, retiredParts.join(''), false);
      }
    }

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
      var actions = document.createElement('div');
      actions.className = 'af-memory-actions';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'af-btn af-btn-secondary af-btn-sm';
      btn.textContent = 'Save "' + label + '"';
      var expand = document.createElement('button');
      expand.type = 'button';
      expand.className = 'af-btn af-btn-ghost af-btn-sm';
      expand.textContent = b.read_only ? 'View larger' : 'Larger editor';
      (function (blockLabel, textarea, button, expandBtn, block) {
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
        expandBtn.onclick = function () {
          if (!window.ADE_MEMORY_EDITOR) return;
          window.ADE_MEMORY_EDITOR.open({
            agentId: id,
            label: blockLabel,
            value: textarea.value,
            description: block.description,
            limit: block.limit,
            readOnly: !!block.read_only,
            onSaved: function (value) {
              textarea.value = value;
            }
          });
        };
      })(label, ta, btn, expand, b);
      actions.appendChild(btn);
      actions.appendChild(expand);
      wrap.appendChild(actions);
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
    var agentName = a.name || a.agent_name || id;
    document.getElementById('title').textContent = agentName;
    document.title = agentName + ' — Sanctum ADE';
    document.getElementById('agent-avatar').innerHTML = window.ADE.avatarHtml(agentName, 'lg');
    var model = window.ADE.agentModelLabel(a);
    document.getElementById('agent-sub').innerHTML =
      (model ? '<span class="af-badge af-badge-accent">' + escHtml(model) + '</span>' : '') +
      '<span class="af-badge af-badge-tools">' + (attachedToolIds ? attachedToolIds.length + ' tools' : '… tools') + '</span>' +
      '<span class="af-badge af-mono" title="Agent id">' + escHtml(String(id)) + '</span>';
    document.getElementById('system').value = a.system || '';
    applyLlmFieldsFromAgent(a);
    syncDangerZoneDeleteName(a);
  }).catch(function (e) { showErr(e.message); });

  /** Tool ids attached to the agent; null when unknown (then Save must not send tool_ids). */
  var attachedToolIds = null;
  function toolIdsFrom(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (t) { return t && typeof t === 'object' ? String(t.id != null ? t.id : t.tool_id) : String(t); });
  }

  Promise.all([
    window.ADE.listModels().catch(function () { return []; }),
    window.ADE.listTools().catch(function () { return []; }),
    window.ADE.listAgentTools(id).catch(function () { return null; })
  ]).then(function (arr) {
    var models = normList(arr[0]), tools = normList(arr[1]);
    var agentToolsResp = arr[2];
    window.ADE.getAgent(id).then(function (a) {
      currentAgent = a;
      if (models.length) {
        document.getElementById('model-row').classList.remove('af-hidden');
        var modelSelect = document.getElementById('model');
        var current = String(a.model || (a.llm_config && (a.llm_config.handle || a.llm_config.model)) || a.handle || '');
        var known = models.some(function (m) { return String(modelId(m)) === current; });
        modelSelect.innerHTML = '<option value="">—</option>' +
          (current && !known ? '<option value="' + escAttr(current) + '">' + escHtml(current) + ' (current — not in server list)</option>' : '') +
          models.map(function (m) {
            return '<option value="' + escAttr(String(modelId(m))) + '">' + escHtml(String(modelLabel(m))) + '</option>';
          }).join('');
        modelSelect.value = current;
      }
      if (agentToolsResp != null) {
        attachedToolIds = toolIdsFrom(normList(agentToolsResp));
      } else if (Array.isArray(a.tool_ids) && a.tool_ids.length) {
        attachedToolIds = toolIdsFrom(a.tool_ids);
      } else {
        attachedToolIds = null;
        showErr("Could not load this agent's attached tools. Save will leave tools unchanged.");
      }
      var badge = document.querySelector('#agent-sub .af-badge-tools');
      if (badge && attachedToolIds) badge.textContent = attachedToolIds.length + (attachedToolIds.length === 1 ? ' tool' : ' tools');
      mountAgentToolsList(tools, attachedToolIds || []);
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
    if (attachedToolIds) {
      var rendered = {};
      [].forEach.call(document.querySelectorAll('input[name=tool]'), function (c) { rendered[c.value] = true; });
      var offList = attachedToolIds.filter(function (t) { return !rendered[t]; });
      body.tool_ids = checked.concat(offList);
    }

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
      if (body.tool_ids) attachedToolIds = body.tool_ids.slice();
      if (lastRegisteredTools.length && attachedToolIds) {
        mountAgentToolsList(lastRegisteredTools, attachedToolIds);
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
