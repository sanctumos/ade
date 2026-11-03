(function () {
  'use strict';

  var selectedPath = null;

  function el(id) {
    return document.getElementById(id);
  }

  function setStatus(html, ok) {
    var box = el('reg-status');
    box.innerHTML = html;
    box.classList.toggle('is-ok', !!ok);
    box.classList.toggle('is-bad', ok === false);
  }

  function showEditor(show) {
    el('reg-editor').hidden = !show;
    el('reg-detail-empty').hidden = !!show;
  }

  function buildTree(keys) {
    var root = {};
    keys.forEach(function (k) {
      var parts = k.split('/');
      var node = root;
      parts.forEach(function (part, i) {
        if (!node[part]) node[part] = { __children: {}, __leaf: null };
        if (i === parts.length - 1) node[part].__leaf = k;
        node = node[part].__children;
      });
    });
    return root;
  }

  function renderNode(tree, ul, prefix) {
    Object.keys(tree)
      .sort()
      .forEach(function (name) {
        var entry = tree[name];
        var li = document.createElement('li');
        var pathSoFar = prefix ? prefix + '/' + name : name;
        var childKeys = Object.keys(entry.__children || {});
        if (entry.__leaf && childKeys.length === 0) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = pathSoFar;
          btn.dataset.path = entry.__leaf;
          if (entry.__leaf === selectedPath) btn.classList.add('is-active');
          btn.addEventListener('click', function () {
            selectKey(entry.__leaf);
          });
          li.appendChild(btn);
        } else {
          var folder = document.createElement('div');
          folder.className = 'af-reg-folder';
          folder.textContent = pathSoFar + '/';
          li.appendChild(folder);
          if (entry.__leaf) {
            var leafBtn = document.createElement('button');
            leafBtn.type = 'button';
            leafBtn.textContent = pathSoFar + ' (value)';
            leafBtn.dataset.path = entry.__leaf;
            if (entry.__leaf === selectedPath) leafBtn.classList.add('is-active');
            leafBtn.addEventListener('click', function () {
              selectKey(entry.__leaf);
            });
            li.appendChild(leafBtn);
          }
          var nested = document.createElement('ul');
          nested.className = 'af-reg-tree';
          renderNode(entry.__children, nested, pathSoFar);
          li.appendChild(nested);
        }
        ul.appendChild(li);
      });
  }

  function selectKey(path) {
    selectedPath = path;
    el('reg-detail-title').textContent = path;
    showEditor(true);
    el('reg-editor-msg').textContent = 'Loading…';
    window.ADE.apiFetch('/v1/sanctum/registry/keys/' + path)
      .then(function (row) {
        var copy = Object.assign({}, row);
        delete copy.path;
        el('reg-value').value = JSON.stringify(copy, null, 2);
        el('reg-editor-msg').textContent = '';
        refreshTreeHighlight();
      })
      .catch(function (err) {
        el('reg-editor-msg').textContent = String(err.message || err);
      });
  }

  function refreshTreeHighlight() {
    document.querySelectorAll('#reg-tree button').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.path === selectedPath);
    });
  }

  function loadTree() {
    return window.ADE.apiFetch('/v1/sanctum/registry/keys').then(function (data) {
      var keys = (data && data.keys) || [];
      var ul = el('reg-tree');
      ul.innerHTML = '';
      if (!keys.length) {
        var empty = document.createElement('li');
        empty.className = 'af-muted';
        empty.textContent = 'No keys yet.';
        ul.appendChild(empty);
        return;
      }
      renderNode(buildTree(keys), ul, '');
    });
  }

  function refreshAll() {
    setStatus('<span class="af-muted">Checking Registry…</span>');
    return Promise.all([
      window.ADE.apiFetch('/v1/sanctum/registry/health'),
      window.ADE.apiFetch('/v1/sanctum/registry/sysinfo'),
    ])
      .then(function (pair) {
        var health = pair[0];
        var info = pair[1];
        setStatus(
          '<strong>Registry</strong> ' +
            (health.service || 'ok') +
            ' · ' +
            (info.os || '?') +
            '/' +
            (info.kind || '?') +
            ' · ' +
            (info.arch || '') +
            ' · layout <code>' +
            (info.layout_root || '') +
            '</code>',
          true
        );
        return loadTree();
      })
      .catch(function (err) {
        setStatus(
          '<strong>Registry unavailable.</strong> ' +
            String(err.message || err) +
            ' Start Registry on loopback :8870 (or fix the proxy upstream). Chat can still use labeled Kernel if Letta is up.',
          false
        );
        el('reg-tree').innerHTML = '';
        showEditor(false);
        el('reg-detail-title').textContent = 'Select a key';
      });
  }

  el('reg-refresh').addEventListener('click', function () {
    refreshAll();
  });

  el('reg-create').addEventListener('submit', function (e) {
    e.preventDefault();
    var path = el('reg-new-path').value.trim().replace(/^\/+|\/+$/g, '');
    if (!path) return;
    window.ADE.apiFetch('/v1/sanctum/registry/keys/' + path, {
      method: 'PUT',
      body: JSON.stringify({ value: null }),
    })
      .then(function () {
        el('reg-new-path').value = '';
        return loadTree().then(function () {
          selectKey(path);
        });
      })
      .catch(function (err) {
        alert(String(err.message || err));
      });
  });

  el('reg-editor').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selectedPath) return;
    var parsed;
    try {
      parsed = JSON.parse(el('reg-value').value);
    } catch (err) {
      el('reg-editor-msg').textContent = 'Invalid JSON: ' + err.message;
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      el('reg-editor-msg').textContent = 'Value must be a JSON object.';
      return;
    }
    window.ADE.apiFetch('/v1/sanctum/registry/keys/' + selectedPath, {
      method: 'PUT',
      body: JSON.stringify(parsed),
    })
      .then(function () {
        el('reg-editor-msg').textContent = 'Saved.';
      })
      .catch(function (err) {
        el('reg-editor-msg').textContent = String(err.message || err);
      });
  });

  el('reg-delete').addEventListener('click', function () {
    if (!selectedPath) return;
    if (!confirm('Delete key ' + selectedPath + '?')) return;
    window.ADE.apiFetch('/v1/sanctum/registry/keys/' + selectedPath, { method: 'DELETE' })
      .then(function () {
        selectedPath = null;
        showEditor(false);
        el('reg-detail-title').textContent = 'Select a key';
        return loadTree();
      })
      .catch(function (err) {
        el('reg-editor-msg').textContent = String(err.message || err);
      });
  });

  refreshAll();
})();
