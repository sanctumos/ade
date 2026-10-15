/**
 * Apply Sanctum Skin Lab preference + sidebar collapse before paint (FOUC guard).
 * Mirrors Tasks/CRM/Docket data-skin-comp; ADE stores locally (no user DB).
 */
(function () {
  var KEY = 'af-skin-comp';
  var ALLOWED = { hey: 1, ledger: 1, brutalist: 1, obsidian: 1 };
  var slug = 'hey';
  try {
    var stored = localStorage.getItem(KEY);
    if (stored && ALLOWED[stored]) slug = stored;
  } catch (e) { /* private mode */ }
  document.documentElement.setAttribute('data-skin-comp', slug);
  try {
    if (localStorage.getItem('af-sidebar-collapsed') === '1') {
      document.documentElement.setAttribute('data-sidebar-collapsed', '1');
    }
  } catch (e2) { /* private mode */ }
  try {
    /* Default open; only force closed when user previously hid the panel. */
    var mem = localStorage.getItem('af-chat-memory-open');
    document.documentElement.setAttribute('data-chat-memory', mem === '0' ? 'closed' : 'open');
  } catch (e3) {
    document.documentElement.setAttribute('data-chat-memory', 'open');
  }
})();
