/**
 * Shared helpers for tool lists (agent Tools tab + Tools directory).
 * Letta names MCP tools as "{server}__{tool}". "disabled" in a name is usually
 * part of a retired MCP server id, not the attach toggle.
 */
(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function toolId(t) {
    return t && (t.id != null ? t.id : t.tool_id || t.name);
  }
  function toolRawName(t) {
    return t && (t.name != null ? String(t.name) : String(t.tool_id || t.id || ''));
  }
  function toolType(t) {
    return (t && (t.tool_type != null ? t.tool_type : t.type)) || '';
  }

  /** True when this MCP server name looks intentionally retired. */
  function isRetiredServer(server) {
    var s = String(server || '');
    return /\.disabled\b/i.test(s) || /^disabled[._-]/i.test(s) || /\bdisabled\.\d{8}/i.test(s);
  }

  /**
   * Split Letta MCP names: server__tool.
   * Built-in / custom tools usually have no "__".
   */
  function parseToolName(raw) {
    var name = String(raw == null ? '' : raw);
    var idx = name.indexOf('__');
    if (idx > 0) {
      var server = name.slice(0, idx);
      var short = name.slice(idx + 2) || name;
      return {
        raw: name,
        server: server,
        short: short,
        kind: 'mcp',
        retired: isRetiredServer(server)
      };
    }
    var typ = '';
    return {
      raw: name,
      server: '',
      short: name,
      kind: 'other',
      retired: false
    };
  }

  function classifyTool(t) {
    var parsed = parseToolName(toolRawName(t));
    var typ = String(toolType(t)).toLowerCase();
    if (parsed.kind === 'mcp' || typ.indexOf('mcp') !== -1) {
      parsed.kind = 'mcp';
      if (!parsed.server && typ.indexOf('mcp') !== -1) parsed.server = 'MCP';
      parsed.retired = isRetiredServer(parsed.server);
      return parsed;
    }
    if (typ.indexOf('letta') !== -1 || typ.indexOf('builtin') !== -1 || typ.indexOf('core') !== -1 || typ.indexOf('base') !== -1) {
      parsed.kind = 'builtin';
      return parsed;
    }
    parsed.kind = 'other';
    return parsed;
  }

  function sortByShort(a, b) {
    return String(a._ui.short).toLowerCase().localeCompare(String(b._ui.short).toLowerCase());
  }

  /**
   * Group tools for display.
   * Returns { attached, builtin, mcpActive: [{server, tools, retired}], mcpRetired: [...], other }
   * attached is only filled when agentToolIds is provided.
   */
  function groupTools(tools, agentToolIds) {
    var attachedSet = {};
    (agentToolIds || []).forEach(function (id) { attachedSet[String(id)] = true; });
    var hasAgent = Array.isArray(agentToolIds);

    var attached = [];
    var builtin = [];
    var other = [];
    var mcpMap = {};

    (tools || []).forEach(function (t) {
      var ui = classifyTool(t);
      t._ui = ui;
      var tid = String(toolId(t));
      if (hasAgent && attachedSet[tid]) attached.push(t);
      if (ui.kind === 'mcp') {
        var key = ui.server || 'MCP';
        if (!mcpMap[key]) mcpMap[key] = [];
        mcpMap[key].push(t);
      } else if (ui.kind === 'builtin') {
        builtin.push(t);
      } else {
        other.push(t);
      }
    });

    attached.sort(sortByShort);
    builtin.sort(sortByShort);
    other.sort(sortByShort);

    var mcpActive = [];
    var mcpRetired = [];
    Object.keys(mcpMap).sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    }).forEach(function (server) {
      var list = mcpMap[server];
      list.sort(sortByShort);
      var bucket = { server: server, tools: list, retired: isRetiredServer(server) };
      if (bucket.retired) mcpRetired.push(bucket);
      else mcpActive.push(bucket);
    });

    return {
      attached: attached,
      builtin: builtin,
      other: other,
      mcpActive: mcpActive,
      mcpRetired: mcpRetired,
      total: (tools || []).length
    };
  }

  function toolRowHtml(t, opts) {
    opts = opts || {};
    var ui = t._ui || classifyTool(t);
    var tid = toolId(t);
    var desc = (t.description && String(t.description).trim()) ? String(t.description).trim() : '';
    if (desc.length > 180) desc = desc.slice(0, 177) + '…';
    var typ = toolType(t) || '—';
    var searchBlob = [ui.short, ui.server, ui.raw, tid, typ, desc].join(' ').toLowerCase();
    var html = '';
    if (opts.checkbox) {
      var cbId = opts.cbId || ('ade-tool-cb-' + escAttr(String(tid)));
      var checked = opts.checked ? ' checked' : '';
      html += '<div class="af-tool-row" data-ade-tool-search="' + encodeURIComponent(searchBlob) + '" data-tool-id="' + escAttr(String(tid)) + '">';
      html += '<input class="af-switch" type="checkbox" name="tool" id="' + cbId + '" value="' + escAttr(String(tid)) + '"' + checked + ' />';
      html += '<div class="af-grow"><label for="' + cbId + '" class="af-tool-name" title="' + escAttr(ui.raw) + '">' + escHtml(ui.short) + '</label>';
    } else {
      html += '<div class="af-tool-row" data-ade-tool-search="' + encodeURIComponent(searchBlob) + '">';
      html += '<div class="af-grow"><div class="af-tool-name" title="' + escAttr(ui.raw) + '">' + escHtml(ui.short) + '</div>';
    }
    html += '<div class="af-tool-meta">';
    if (ui.server) html += '<span class="af-badge">' + escHtml(ui.server) + '</span>';
    if (ui.retired) html += '<span class="af-badge af-badge-warn">retired server</span>';
    html += '<span class="af-badge">' + escHtml(String(typ)) + '</span>';
    html += '</div>';
    if (desc) html += '<div class="af-meta af-tool-desc">' + escHtml(desc) + '</div>';
    html += '</div></div>';
    return html;
  }

  function detailsHtml(title, count, bodyHtml, open) {
    return '<details class="af-tool-server" data-ade-tool-group' + (open ? ' open' : '') + '>' +
      '<summary class="af-tool-group-header">' + escHtml(title) + ' · ' + count + '</summary>' +
      '<div class="af-tool-server-body">' + bodyHtml + '</div></details>';
  }

  window.ADE_TOOLS_UI = {
    escHtml: escHtml,
    escAttr: escAttr,
    toolId: toolId,
    toolRawName: toolRawName,
    toolType: toolType,
    parseToolName: parseToolName,
    classifyTool: classifyTool,
    isRetiredServer: isRetiredServer,
    groupTools: groupTools,
    toolRowHtml: toolRowHtml,
    detailsHtml: detailsHtml
  };
})();
