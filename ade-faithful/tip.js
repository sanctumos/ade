/**
 * ADE tooltips — same pattern as HMG CPH (cph.php):
 * "?" button, bubble portals to document.body, fixed place + diamond arrow,
 * click-outside / Escape / scroll / resize.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function tipHome(tip) {
    return tip && tip._afTipHome ? tip._afTipHome : null;
  }

  function resetTip(tip) {
    if (!tip) return;
    tip.hidden = true;
    tip.classList.remove('af-tip-fixed', 'af-tip-above');
    tip.style.left = '';
    tip.style.right = '';
    tip.style.top = '';
    tip.style.bottom = '';
    tip.style.removeProperty('--af-tip-arrow-left');
    var home = tipHome(tip);
    if (home && tip.parentNode !== home) home.appendChild(tip);
  }

  function placeTip(btn, tip) {
    if (!btn || !tip) return;
    if (!tip._afTipHome) tip._afTipHome = tip.parentNode;
    if (tip.parentNode !== document.body) document.body.appendChild(tip);
    tip.hidden = false;
    tip.classList.add('af-tip-fixed');
    tip.classList.remove('af-tip-above');
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.right = 'auto';
    tip.style.bottom = 'auto';
    var br = btn.getBoundingClientRect();
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
    tip.classList.toggle('af-tip-above', openAbove);
    var arrowLeft = Math.round(br.left + br.width / 2 - left - 5);
    arrowLeft = Math.max(10, Math.min(tw - 20, arrowLeft));
    tip.style.setProperty('--af-tip-arrow-left', arrowLeft + 'px');
  }

  function closeAll(except) {
    document.querySelectorAll('.af-tip-btn[aria-expanded="true"]').forEach(function (btn) {
      if (btn === except) return;
      btn.setAttribute('aria-expanded', 'false');
      var tip = document.getElementById(btn.getAttribute('aria-controls'));
      resetTip(tip);
    });
    closeFloating();
  }

  function repositionOpen() {
    document.querySelectorAll('.af-tip-btn[aria-expanded="true"]').forEach(function (btn) {
      var tip = document.getElementById(btn.getAttribute('aria-controls'));
      if (tip && !tip.hidden) placeTip(btn, tip);
    });
    if (floatingAnchor) {
      var tip = document.getElementById('af-tip-float');
      if (tip && !tip.hidden) placeTip(floatingAnchor, tip);
    }
  }

  /**
   * Label + "?" + bubble (CPH $cphTip).
   * @param {string} label visible text
   * @param {string} tip plain-language help
   * @param {string} id stable id suffix
   */
  function markup(label, tip, id) {
    var safeId = 'af-tip-' + String(id || 'x').replace(/[^a-zA-Z0-9_-]/g, '');
    var aria = 'Explain: ' + (label || tip || 'this');
    return '<span class="af-tip">' +
      (label ? '<span class="af-tip-label">' + esc(label) + '</span>' : '') +
      '<button type="button" class="af-tip-btn" aria-expanded="false" aria-controls="' + safeId + '"' +
      ' aria-label="' + esc(aria) + '">?</button>' +
      '<span id="' + safeId + '" role="tooltip" class="af-tip-bubble" hidden>' + esc(tip) + '</span>' +
      '</span>';
  }

  /* —— Floating tip for custom anchors (context-meter segments) —— */
  var floatingAnchor = null;

  function ensureFloating() {
    var tip = document.getElementById('af-tip-float');
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'af-tip-float';
    tip.className = 'af-tip-bubble af-tip-bubble--rich';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    tip._afTipHome = document.body;
    return tip;
  }

  function closeFloating() {
    var tip = document.getElementById('af-tip-float');
    resetTip(tip);
    if (floatingAnchor) {
      floatingAnchor.setAttribute('aria-expanded', 'false');
      floatingAnchor = null;
    }
  }

  function openFloating(anchor, html) {
    if (!anchor) return;
    closeAll(null);
    var tip = ensureFloating();
    tip.innerHTML = html;
    floatingAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    placeTip(anchor, tip);
  }

  function toggleFloating(anchor, html) {
    if (floatingAnchor === anchor) {
      closeFloating();
      return;
    }
    openFloating(anchor, html);
  }

  function bind() {
    if (document.documentElement.getAttribute('data-af-tip-bound') === '1') return;
    document.documentElement.setAttribute('data-af-tip-bound', '1');
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.af-tip-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        var open = btn.getAttribute('aria-expanded') === 'true';
        closeAll(btn);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        var tip = document.getElementById(btn.getAttribute('aria-controls'));
        if (!tip) return;
        if (open) resetTip(tip);
        else placeTip(btn, tip);
        return;
      }
      if (e.target.closest && (e.target.closest('.af-tip') || e.target.closest('.af-tip-bubble') ||
          e.target.closest('.chat-ctx-seg'))) {
        return;
      }
      closeAll(null);
    });
    window.addEventListener('resize', repositionOpen);
    window.addEventListener('scroll', repositionOpen, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  window.ADE_TIP = {
    esc: esc,
    markup: markup,
    place: placeTip,
    reset: resetTip,
    closeAll: closeAll,
    openFloating: openFloating,
    closeFloating: closeFloating,
    toggleFloating: toggleFloating,
    bind: bind
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
