/**
 * Development loader for hot-reload
 * Fetches and executes the latest version of the main script from dev server
 */

const DEV_SERVER_URL = 'http://127.0.0.1:7744';
const SCRIPT_PATH = '/dev.reverso-anki-saver.user.js';

console.log('[DEV LOADER] Loading script from:', DEV_SERVER_URL + SCRIPT_PATH);

GM_xmlhttpRequest({
  method: 'GET',
  url: DEV_SERVER_URL + SCRIPT_PATH,
  nocache: true,
  onload: function(response) {
    try {
      const scriptCode = response.responseText;
      
      // Extract timestamp for debugging
      const buildTimeMatch = scriptCode.match(/"(2026-[^"]+)"/);
      const buildTime = buildTimeMatch ? buildTimeMatch[1] : 'unknown';
      
      console.log('[DEV LOADER] Script loaded successfully');
      console.log('[DEV LOADER] Build time:', buildTime);
      
      // Remove userscript metadata header
      const cleanCode = scriptCode.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n/g, '');
      
      console.log('[DEV LOADER] Code length:', cleanCode.length);
      
      // Execute the script (eval runs in this scope where GM_* functions are available)
      eval(cleanCode);
      console.log('[DEV LOADER] Script executed successfully');
      
    } catch (err) {
      console.error('[DEV LOADER] Processing error:', err);
      showError((err as Error).message);
    }
  },
  onerror: function(err) {
    const message = 'Failed to load script from dev server';
    console.error('[DEV LOADER]', message, err);
    console.error('[DEV LOADER] Make sure "yarn dev" is running!');
    showError(message + '. Check console for details.');
  }
});

function showError(message: string) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 999999;
    font-family: monospace;
    font-size: 14px;
    max-width: 400px;
  `;
  errorDiv.textContent = `DEV LOADER ERROR: ${message}`;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => errorDiv.remove(), 10000);
}
