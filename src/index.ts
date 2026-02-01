import { startObserver } from './reverso/observe';
import { checkAnkiConnect, verifyAnkiConfig } from './anki/ankiConnect';
import { toast } from './ui/toast';
import { BUILD_TIME } from 'virtual:build-time';

// Build mode injected by Vite
declare const __BUILD_MODE__: string;

// Global flag to detect duplicate instances
const GLOBAL_FLAG = '__reversoAnkiRunning__';

/**
 * Check if another instance of the script is already running
 */
function checkForDuplicates(): boolean {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/0911e554-b505-487e-b473-bea881253ff9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:15',message:'checkForDuplicates() called',data:{flagExists:(window as any)[GLOBAL_FLAG]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if ((window as any)[GLOBAL_FLAG]) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/0911e554-b505-487e-b473-bea881253ff9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:17',message:'Duplicate detected - exiting',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    console.error('[Reverso->Anki] ⚠️ Multiple instances detected!');
    toast.error('⚠️ Multiple Reverso->Anki scripts running! Disable all but one in Tampermonkey.');
    return true;
  }
  
  // Mark this instance as running
  (window as any)[GLOBAL_FLAG] = true;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/0911e554-b505-487e-b473-bea881253ff9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:23',message:'Flag set - proceeding',data:{flagNowSet:(window as any)[GLOBAL_FLAG]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  return false;
}

/**
 * Main entry point for the userscript
 */
async function main() {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/0911e554-b505-487e-b473-bea881253ff9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:30',message:'main() called',data:{buildMode:__BUILD_MODE__,buildTime:BUILD_TIME,readyState:document.readyState},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  console.log('[Reverso->Anki] Starting...');
  console.log(`[Reverso->Anki] Build: ${__BUILD_MODE__} at ${BUILD_TIME}`);

  // Check for duplicate instances first
  if (checkForDuplicates()) {
    return;
  }

  // Check if we're on the right page
  if (!window.location.href.includes('dictionary.reverso.net/english-definition/')) {
    console.log('[Reverso->Anki] Not on Reverso definition page, exiting');
    return;
  }

  // Check AnkiConnect
  const ankiAvailable = await checkAnkiConnect();
  if (!ankiAvailable) {
    toast.error('AnkiConnect not available. Is Anki running?');
    console.error('[Reverso->Anki] AnkiConnect not available');
    return;
  }

  // Verify configuration
  const configCheck = await verifyAnkiConfig();
  if (!configCheck.ok) {
    toast.error(`Anki config error: ${configCheck.error}`);
    console.error('[Reverso->Anki] Config error:', configCheck.error);
    return;
  }

  // Start observing and injecting buttons
  startObserver();
  
  toast.info('Reverso→Anki готов!');
  console.log('[Reverso->Anki] Ready');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
