/**
 * Minimal toast notification system
 * Can be easily replaced with a library like react-toastify or notyf
 */

type ToastType = 'info' | 'success' | 'error';

const TOAST_DURATION = 3000;
let toastContainer: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'reverso-anki-toast-container';
    document.body.appendChild(toastContainer);
    
    GM_addStyle(`
      #reverso-anki-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      
      .reverso-anki-toast {
        background: white;
        color: #333;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        min-width: 250px;
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
        border-left: 4px solid #3498db;
      }
      
      .reverso-anki-toast.success {
        border-left-color: #07bc0c;
      }
      
      .reverso-anki-toast.error {
        border-left-color: #e74c3c;
      }
      
      .reverso-anki-toast.info {
        border-left-color: #3498db;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `);
  }
  return toastContainer;
}

function showToast(message: string, type: ToastType = 'info') {
  const container = ensureContainer();
  
  const toast = document.createElement('div');
  toast.className = `reverso-anki-toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, TOAST_DURATION);
}

export const toast = {
  info: (message: string) => showToast(message, 'info'),
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
};
