// Copy to config.js on the server, or use Settings (localStorage overrides).
// Same-origin proxy: set base to this site's /proxy.php (PATH_INFO → Letta).
window.ADE_CONFIG = {
  base: '',  // filled at runtime by detect in app, or Settings
  key: ''
};
