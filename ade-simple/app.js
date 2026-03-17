(function () {
  'use strict';

  var STORAGE_BASE = 'ade_simple_base';
  var STORAGE_KEY = 'ade_simple_key';

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

  function apiFetch(path, options) {
    options = options || {};
    var url = path.indexOf('http') === 0 ? path : apiBase() + (path.indexOf('/') === 0 ? '' : '/') + path;
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

  window.ADE = {
    getConfig: getConfig,
    setStoredBase: setStoredBase,
    setStoredKey: setStoredKey,
    apiBase: apiBase,
    listAgents: function () { return apiFetch('/v1/agents'); },
    getAgent: function (id) { return apiFetch('/v1/agents/' + id); },
    createAgent: function (body) { return apiFetch('/v1/agents', { method: 'POST', body: JSON.stringify(body) }); },
    sendMessage: function (agentId, body) { return apiFetch('/v1/agents/' + agentId + '/messages', { method: 'POST', body: JSON.stringify(body) }); },
    getAgentMessages: function (agentId) { return apiFetch('/v1/agents/' + agentId + '/messages'); },
    getAgentMemory: function (agentId, label) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + (label || 'persona')); },
    updateAgentMemory: function (agentId, label, body) { return apiFetch('/v1/agents/' + agentId + '/core-memory/blocks/' + (label || 'persona'), { method: 'PATCH', body: JSON.stringify(body) }); }
  };
})();
