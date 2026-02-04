import type { ParseResult } from '../types';

/**
 * Parse a Reverso card element into structured data
 * Returns ParseResult with ok: false if parsing fails
 */
export function parseCard(cardElement: Element): ParseResult {
  try {
    // Find the word from the page header (not in the card itself)
    const wordEl = document.querySelector('.definition-list__blue-word');
    if (!wordEl?.textContent?.trim()) {
      console.error('[Reverso->Anki] Failed to parse: word not found in page header');
      return { ok: false, reason: 'missing_word' };
    }
    const wordElClone = wordEl.cloneNode(true) as Element;
    wordElClone.querySelectorAll('app-badge, .badge').forEach(el => el.remove());
    const word = (wordElClone.textContent ?? wordEl.textContent).trim();

    // Find the definition text (the main meaning)
    const definitionEl = cardElement.querySelector('.definition-example__mention-sentence');
    if (!definitionEl?.textContent?.trim()) {
      console.error('[Reverso->Anki] Failed to parse: definition not found', cardElement);
      return { ok: false, reason: 'missing_definition' };
    }
    const definition = definitionEl.textContent.trim();

    // Find examples
    const exampleElements = cardElement.querySelectorAll('.definition-example__example-text-block');
    const examples = Array.from(exampleElements)
      .map(el => el.textContent?.trim())
      .filter((text): text is string => !!text);

    // Find Russian translations (there can be multiple translation chips)
    const translationElements = cardElement.querySelectorAll('app-translation-chip');
    const translations = Array.from(translationElements)
      .map(el => el.textContent?.trim())
      .filter((text): text is string => !!text);
    
    // Join translations with HTML line breaks for Anki
    const translation = translations.join('<br>');

    if (!translation) {
      console.warn('[Reverso->Anki] No Russian translation found for this card', cardElement);
    }

    return {
      ok: true,
      data: {
        word,
        definition,
        examples,
        translation,
        sourceUrl: window.location.href,
      },
    };
  } catch (err) {
    console.error('[Reverso->Anki] Parse error:', err, cardElement);
    return { ok: false, reason: 'unknown' };
  }
}
