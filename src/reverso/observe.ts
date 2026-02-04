import {
  addNoteToAnki,
  checkDuplicate,
  findCardIdsByWord,
  markWordAgain,
} from "../anki/ankiConnect";
import { config } from "../config";
import { toast } from "../ui/toast";
import { parseCard } from "./parseCard";

const BUTTON_CLASS = "reverso-anki-button";
const BADGE_CLASS = "reverso-anki-badge";
const AGAIN_BUTTON_CLASS = "reverso-anki-again-button";
const BUTTON_INJECTED_ATTR = "data-anki-button-injected";

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
  const button = document.createElement("button");
  button.className = BUTTON_CLASS;
  button.textContent = "+ Add to Anki";

  GM_addStyle(`
    .${BUTTON_CLASS} {
      display: inline-block;
      margin: 12px 0 0 20px;
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
async function handleAddToAnki(
  button: HTMLButtonElement,
  cardElement: Element
) {
  // Check viewport width
  if (!isViewportSupported()) {
    toast.error("⚠️ Wrong layout. Resize window to 767px or less.");
    console.warn(
      `[Reverso->Anki] Viewport width ${window.innerWidth}px exceeds maximum ${config.ui.maxWidthPx}px`
    );
    return;
  }

  // Disable button during processing
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Saving...";

  toast.info("Saving to Anki...");

  try {
    // Parse card
    const parseResult = parseCard(cardElement);

    if (!parseResult.ok) {
      const reasons = {
        missing_word: "Could not find word in card",
        missing_definition: "Could not find definition in card",
        layout_changed: "Card layout has changed",
        unknown: "Unknown parsing error",
      };

      toast.error(`Parse failed: ${reasons[parseResult.reason]}`);
      console.error(
        "[Reverso->Anki] Parse failed:",
        parseResult.reason,
        cardElement
      );
      return;
    }

    const { data: card } = parseResult;

    // Check for duplicates (but add anyway - might be a different meaning)
    const isDuplicate = await checkDuplicate(card.word);

    // Add to Anki
    await addNoteToAnki(card);

    if (isDuplicate) {
      toast.success(
        `"${card.word}" added to Anki (duplicate word, different meaning)`
      );
      button.textContent = "✓ Added (duplicate)";
    } else {
      toast.success(`"${card.word}" added to Anki!`);
      button.textContent = "✓ Added";
    }
    button.classList.add("success");

    // Update badge to "In Anki" for the main word if this matches current page word
    const currentWord = getCurrentWord();
    if (currentWord && card.word.toLowerCase() === currentWord.toLowerCase()) {
      addWordStatusBadge(true);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    toast.error(`Failed: ${message}`);
    console.error("[Reverso->Anki] Add failed:", err);
    button.disabled = false;
    button.textContent = originalText;
  }
}

/**
 * Handle "Mark as again" click for the current word
 */
async function handleMarkAsAgain(button: HTMLButtonElement) {
  const currentWord = getCurrentWord();
  if (!currentWord) {
    toast.error("Could not determine the current word");
    return;
  }

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Marking...";

  toast.info(`Marking "${currentWord}" as again...`);

  try {
    const answeredCount = await markWordAgain(currentWord);

    if (answeredCount === 0) {
      toast.error(`"${currentWord}" not found in Anki`);
      button.disabled = false;
      button.textContent = originalText;
      return;
    }

    const suffix = answeredCount > 1 ? ` (${answeredCount} cards)` : "";
    toast.success(`"${currentWord}" marked as again${suffix}`);
    button.textContent = "✓ Marked as again";
    button.classList.add("success");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    toast.error(`Failed: ${message}`);
    console.error("[Reverso->Anki] Mark as again failed:", err);
    button.disabled = false;
    button.textContent = originalText;
    button.classList.add("error");
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

  button.addEventListener("click", () => {
    handleAddToAnki(button, cardElement);
  });

  // Insert button after the actions block (on a new line)
  const actionsBlock = cardElement.querySelector(
    ".definition-example__actions"
  );
  if (actionsBlock) {
    // Insert after the actions block
    actionsBlock.insertAdjacentElement("afterend", button);
  } else {
    // Fallback: append to the card itself
    cardElement.appendChild(button);
    console.warn(
      "[Reverso->Anki] Could not find actions block, button appended to card",
      cardElement
    );
  }

  cardElement.setAttribute(BUTTON_INJECTED_ATTR, "true");
}

/**
 * Find all card elements and inject buttons
 */
function processCards() {
  // Select all definition cards on the page
  // Each app-definition-example is one card
  const cards = document.querySelectorAll("app-definition-example");

  cards.forEach((card) => {
    injectButton(card);
  });

  console.log(`[Reverso->Anki] Processed ${cards.length} cards`);
}

/**
 * Get the current word/phrase from the page
 */
function getCurrentWord(): string | null {
  // Try to get from URL first
  const match = window.location.pathname.match(/\/english-definition\/([^/]+)/);
  if (match) {
    return decodeURIComponent(match[1]).replace(/[+_]/g, " ");
  }

  // Fallback: try to get from blue word element
  const blueWord = document.querySelector(".definition-list__blue-word");
  if (blueWord) {
    return blueWord.textContent?.trim() || null;
  }

  return null;
}

/**
 * Check if word already exists in Anki
 */
async function checkWordInAnki(word: string): Promise<boolean> {
  try {
    // Search for cards with this word in the Word field
    const cardIds = await findCardIdsByWord(word);
    return cardIds.length > 0;
  } catch (error) {
    console.error("[Reverso->Anki] Error checking word in Anki:", error);
    return false;
  }
}

/**
 * Add badge next to the word
 */
function addWordStatusBadge(inAnki: boolean) {
  const blueWord = document.querySelector(".definition-list__blue-word");
  if (!blueWord) {
    return;
  }

  // Check if badge exists as the NEXT sibling of current blue word
  const existingBadge = blueWord.nextElementSibling;
  const isBadge = existingBadge?.classList.contains(BADGE_CLASS);
  const existingAgainButton = isBadge
    ? existingBadge?.nextElementSibling
    : null;
  const isAgainButton =
    existingAgainButton?.classList.contains(AGAIN_BUTTON_CLASS);

  // Remove any orphaned badges/buttons (from old words)
  const allBadges = document.querySelectorAll(`.${BADGE_CLASS}`);
  allBadges.forEach((badge) => {
    if (badge !== existingBadge) {
      badge.remove();
    }
  });

  const allAgainButtons = document.querySelectorAll(`.${AGAIN_BUTTON_CLASS}`);
  allAgainButtons.forEach((button) => {
    if (button !== existingAgainButton) {
      button.remove();
    }
  });

  const hasCorrectStatus = isBadge
    ? inAnki
      ? existingBadge?.classList.contains("in-anki")
      : existingBadge?.classList.contains("not-in-anki")
    : false;

  if (hasCorrectStatus && isAgainButton) {
    console.log(
      `[Reverso->Anki] Badge and button already exist: ${
        inAnki ? "In Anki" : "Not in Anki"
      }`
    );
    return;
  }

  // Status changed or controls missing, remove old elements
  existingBadge?.remove();
  if (isAgainButton) {
    existingAgainButton?.remove();
  }

  const badge = document.createElement("span");
  badge.className = BADGE_CLASS;

  if (inAnki) {
    badge.textContent = "✓ In Anki";
    badge.classList.add("in-anki");
  } else {
    badge.textContent = "✗ Not in Anki";
    badge.classList.add("not-in-anki");
  }

  const againButton = document.createElement("button");
  againButton.className = AGAIN_BUTTON_CLASS;
  againButton.textContent = "Mark as again";
  againButton.disabled = !inAnki;
  againButton.addEventListener("click", () => {
    handleMarkAsAgain(againButton);
  });

  GM_addStyle(`
    .${BADGE_CLASS} {
      display: inline-flex;
      align-items: center;
      height: 32px;
      margin-left: 12px;
      padding: 0 10px;
      border-radius: 12px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      font-family: Roboto, sans-serif;
      vertical-align: middle;
      white-space: nowrap;
    }
    
    .${BADGE_CLASS}.in-anki {
      background-color: #4caf50;
    }
    
    .${BADGE_CLASS}.not-in-anki {
      background-color: #f44336;
    }

    .${AGAIN_BUTTON_CLASS} {
      display: inline-flex;
      align-items: center;
      height: 32px;
      margin-left: 8px;
      padding: 0 12px;
      border-radius: 12px;
      background-color: #f5c26b;
      color: #3c2a00;
      font-size: 12px;
      font-weight: 600;
      font-family: Roboto, sans-serif;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .${AGAIN_BUTTON_CLASS}:hover {
      background-color: #f0b548;
    }

    .${AGAIN_BUTTON_CLASS}:active {
      transform: translateY(0);
    }

    .${AGAIN_BUTTON_CLASS}:disabled {
      background-color: #d8d8d8;
      color: #777;
      cursor: not-allowed;
      opacity: 0.8;
    }

    .${AGAIN_BUTTON_CLASS}.success {
      background-color: #31a960;
      color: white;
    }

    .${AGAIN_BUTTON_CLASS}.error {
      background-color: #e45c45;
      color: white;
    }
  `);

  blueWord.insertAdjacentElement("afterend", badge);
  badge.insertAdjacentElement("afterend", againButton);
  console.log(
    `[Reverso->Anki] Added badge and button: ${
      inAnki ? "In Anki" : "Not in Anki"
    }`
  );
}

/**
 * Check current word and show badge
 */
async function checkAndMarkExistingWord() {
  // Reset recreation counter for new word
  badgeRecreationAttempts = 0;

  const word = getCurrentWord();
  if (!word) {
    console.log("[Reverso->Anki] Could not extract current word");
    return;
  }

  console.log("[Reverso->Anki] Checking if word exists in Anki:", word);

  const exists = await checkWordInAnki(word);
  addWordStatusBadge(exists);
}

/**
 * Track the current word to detect navigation
 */
let currentTrackedWord: string | null = null;

/**
 * Track badge recreation attempts to prevent infinite loops
 */
let badgeRecreationAttempts = 0;
const MAX_BADGE_RECREATION_ATTEMPTS = 3;

/**
 * Start observing the page for cards
 */
export function startObserver() {
  // Check if current word already exists in Anki
  checkAndMarkExistingWord();
  currentTrackedWord = getCurrentWord();

  // Initial injection
  processCards();

  // Watch for dynamic changes (SPA navigation, lazy loading, etc.)
  const observer = new MutationObserver((mutations) => {
    // Check if badge was removed by DOM update and recreate it
    const badgeExists = !!document.querySelector(`.${BADGE_CLASS}`);
    const againButtonExists = !!document.querySelector(
      `.${AGAIN_BUTTON_CLASS}`
    );
    const removedStatusControls = mutations.some((m) => {
      return Array.from(m.removedNodes).some((node) => {
        if (node instanceof HTMLElement) {
          return (
            node.classList?.contains(BADGE_CLASS) ||
            node.classList?.contains(AGAIN_BUTTON_CLASS) ||
            node.querySelector?.(`.${BADGE_CLASS}`) ||
            node.querySelector?.(`.${AGAIN_BUTTON_CLASS}`)
          );
        }
        return false;
      });
    });

    if (removedStatusControls && (!badgeExists || !againButtonExists)) {
      // Recreate badge after a delay (to let Angular/React finish its update)
      if (badgeRecreationAttempts < MAX_BADGE_RECREATION_ATTEMPTS) {
        badgeRecreationAttempts++;
        setTimeout(async () => {
          const word = getCurrentWord();
          if (word === currentTrackedWord) {
            const exists = await checkWordInAnki(word || "");
            addWordStatusBadge(exists);
          }
        }, 300); // Wait for Angular/React to finish updating
      }
    }

    // Check if the blue word has changed (SPA navigation to a new word)
    const newWord = getCurrentWord();

    if (newWord && newWord !== currentTrackedWord) {
      console.log(
        "[Reverso->Anki] Word changed from",
        currentTrackedWord,
        "to",
        newWord
      );
      currentTrackedWord = newWord;
      // Re-check badge status for the new word
      checkAndMarkExistingWord();
    }

    // Filter out mutations caused by our own elements (buttons, badges, toasts)
    const relevantMutation = mutations.some((mutation) => {
      // Ignore mutations in our button/badge/toast containers
      const target = mutation.target as HTMLElement;

      // Check if mutation is inside our elements
      if (
        target.classList?.contains(BUTTON_CLASS) ||
        target.classList?.contains(BADGE_CLASS) ||
        target.classList?.contains(AGAIN_BUTTON_CLASS) ||
        target.closest(".reverso-anki-toast-container")
      ) {
        return false;
      }

      // Check if added nodes are our elements
      if (mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (
              node.classList?.contains(BUTTON_CLASS) ||
              node.classList?.contains(BADGE_CLASS) ||
              node.classList?.contains(AGAIN_BUTTON_CLASS) ||
              node.classList?.contains("reverso-anki-toast-container")
            ) {
              return false;
            }
          }
        }
      }

      return true;
    });

    // Only process if there are relevant mutations
    if (relevantMutation) {
      processCards();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("[Reverso->Anki] Observer started");
}
