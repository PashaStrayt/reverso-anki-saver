import { config } from '../config';
import { parseCard } from './parseCard';
import { addNoteToAnki, checkDuplicate } from '../anki/ankiConnect';
import { toast } from '../ui/toast';

const BUTTON_CLASS = 'reverso-anki-button';
const BUTTON_INJECTED_ATTR = 'data-anki-button-injected';

/**
 * Check if current viewport width is within supported range
 */
function isViewportSupported(): boolean {
  const maxWidth = config.ui.maxWidthPx;
  if (maxWidth === 0) {
    return true; // No restriction
  }
  return window.innerWidth <= maxWidth;
}

/**
 * Create "Add to Anki" button
 * Styled to match Reverso's translation chips
 */
function createButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = BUTTON_CLASS;
  button.textContent = '+ Add to Anki';
  
  GM_addStyle(`
    .${BUTTON_CLASS} {
      display: inline-block;
      margin-top: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      white-space: nowrap;
      background-color: #56a8f0;
      color: #151515;
      font-size: 13px;
      line-height: 18px;
      border: none;
      cursor: pointer;
      font-family: Roboto, sans-serif;
      font-weight: 500;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    
    .${BUTTON_CLASS}:hover {
      background-color: #2a8bdf;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
      transform: translateY(-1px);
    }
    
    .${BUTTON_CLASS}:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    }
    
    .${BUTTON_CLASS}:disabled {
      background-color: #cecece;
      cursor: not-allowed;
      opacity: 0.6;
      box-shadow: none;
      transform: none;
    }
    
    .${BUTTON_CLASS}.success {
      background-color: #31a960;
      color: white;
    }
    
    .${BUTTON_CLASS}.error {
      background-color: #e45c45;
      color: white;
    }
  `);
  
  return button;
}

/**
 * Handle button click: parse card and add to Anki
 */
async function handleAddToAnki(button: HTMLButtonElement, cardElement: Element) {
  // Check viewport width
  if (!isViewportSupported()) {
    toast.error('⚠️ Wrong layout. Resize window to 767px or less.');
    console.warn(
      `[Reverso->Anki] Viewport width ${window.innerWidth}px exceeds maximum ${config.ui.maxWidthPx}px`
    );
    return;
  }

  // Disable button during processing
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Saving...';
  
  toast.info('Saving to Anki...');

  try {
    // Parse card
    const parseResult = parseCard(cardElement);
    
    if (!parseResult.ok) {
      const reasons = {
        missing_word: 'Could not find word in card',
        missing_definition: 'Could not find definition in card',
        layout_changed: 'Card layout has changed',
        unknown: 'Unknown parsing error',
      };
      
      toast.error(`Parse failed: ${reasons[parseResult.reason]}`);
      console.error('[Reverso->Anki] Parse failed:', parseResult.reason, cardElement);
      return;
    }

    const { data: card } = parseResult;

    // Check for duplicates (but add anyway - might be a different meaning)
    const isDuplicate = await checkDuplicate(card.word);
    
    // Add to Anki
    await addNoteToAnki(card);
    
    if (isDuplicate) {
      toast.success(`"${card.word}" added to Anki (duplicate word, different meaning)`);
      button.textContent = '✓ Added (duplicate)';
    } else {
      toast.success(`"${card.word}" added to Anki!`);
      button.textContent = '✓ Added';
    }
    button.classList.add('success');
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    toast.error(`Failed: ${message}`);
    console.error('[Reverso->Anki] Add failed:', err);
    button.disabled = false;
    button.textContent = originalText;
  }
}

/**
 * Inject button into a card element (idempotent)
 */
function injectButton(cardElement: Element) {
  // Skip if already injected
  if (cardElement.hasAttribute(BUTTON_INJECTED_ATTR)) {
    return;
  }

  const button = createButton();
  
  button.addEventListener('click', () => {
    handleAddToAnki(button, cardElement);
  });

  // Insert button after the actions block (on a new line)
  const actionsBlock = cardElement.querySelector('.definition-example__actions');
  if (actionsBlock) {
    // Insert after the actions block
    actionsBlock.insertAdjacentElement('afterend', button);
  } else {
    // Fallback: append to the card itself
    cardElement.appendChild(button);
    console.warn('[Reverso->Anki] Could not find actions block, button appended to card', cardElement);
  }

  cardElement.setAttribute(BUTTON_INJECTED_ATTR, 'true');
}

/**
 * Find all card elements and inject buttons
 */
function processCards() {
  // Select all definition cards on the page
  // Each app-definition-example is one card
  const cards = document.querySelectorAll('app-definition-example');
  
  cards.forEach(card => {
    injectButton(card);
  });

  console.log(`[Reverso->Anki] Processed ${cards.length} cards`);
}

/**
 * Start observing the page for cards
 */
export function startObserver() {
  // Initial injection
  processCards();

  // Watch for dynamic changes (SPA navigation, lazy loading, etc.)
  const observer = new MutationObserver(() => {
    processCards();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('[Reverso->Anki] Observer started');
}
