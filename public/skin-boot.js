/**
 * Apply Sanctum Skin Lab preference before paint (FOUC guard).
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
})();
