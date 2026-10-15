/**
 * Markdown + safe HTML for ade-simple chat (Letta-style rendering).
 * Requires (optional): vendor/marked.min.js + vendor/purify.min.js — if missing, falls back to escaped plaintext with line breaks.
 */
(function (global) {
  'use strict';

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseMarkdown(text) {
    if (text == null) return '';
    var t = String(text);
    if (!t.trim()) return '';
    try {
      if (typeof global.marked !== 'undefined' && typeof global.marked.setOptions === 'function') {
        global.marked.setOptions({ breaks: true, gfm: true, headerIds: false });
      }
      if (typeof global.marked === 'undefined' || typeof global.DOMPurify === 'undefined') {
        return '<p class="chat-md chat-md--plain">' + escHtml(t).replace(/\n/g, '<br>') + '</p>';
      }
      var raw = global.marked.parse(t);
      return global.DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    } catch (e) {
      return '<pre class="chat-md-fallback">' + escHtml(t) + '</pre>';
    }
  }

  /** Pretty-print JSON string for tool arguments; fallback to escaped raw. */
  function formatJsonMaybe(s) {
    if (s == null || s === '') return '';
    var str = String(s);
    try {
      var o = JSON.parse(str);
      return escHtml(JSON.stringify(o, null, 2));
    } catch (e) {
      return escHtml(str);
    }
  }

  global.ADE_CHAT = {
    escHtml: escHtml,
    parseMarkdown: parseMarkdown,
    formatJsonMaybe: formatJsonMaybe
  };
})(typeof window !== 'undefined' ? window : this);
