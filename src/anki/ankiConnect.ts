import { config } from '../config';
import type { AnkiConnectResponse, ParsedCard } from '../types';

/**
 * AnkiConnect client using GM_xmlhttpRequest to bypass CORS
 */

export function ankiRequest<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'POST',
      url: config.anki.url,
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        action,
        version: 6,
        params,
      }),
      onload: (response) => {
        try {
          const data: AnkiConnectResponse<T> = JSON.parse(response.responseText);
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.result);
          }
        } catch (err) {
          reject(new Error('Failed to parse AnkiConnect response'));
        }
      },
      onerror: () => {
        reject(new Error('Failed to connect to AnkiConnect. Is Anki running?'));
      },
      ontimeout: () => {
        reject(new Error('AnkiConnect request timed out'));
      },
    });
  });
}

/**
 * Check if AnkiConnect is available
 */
export async function checkAnkiConnect(): Promise<boolean> {
  try {
    await ankiRequest<number>('version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify deck and model exist
 */
export async function verifyAnkiConfig(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Check deck
    const deckNames = await ankiRequest<string[]>('deckNames');
    if (!deckNames.includes(config.anki.deckName)) {
      return { ok: false, error: `Deck "${config.anki.deckName}" not found` };
    }

    // Check model
    const modelNames = await ankiRequest<string[]>('modelNames');
    if (!modelNames.includes(config.anki.modelName)) {
      return { ok: false, error: `Note Type "${config.anki.modelName}" not found` };
    }

    // Check model fields
    const modelFieldNames = await ankiRequest<string[]>('modelFieldNames', {
      modelName: config.anki.modelName,
    });
    
    const mappedFields = Object.values(config.anki.fieldMapping);
    const missingFields = mappedFields.filter(field => !modelFieldNames.includes(field));
    
    if (missingFields.length > 0) {
      return { 
        ok: false, 
        error: `Fields not found in Note Type: ${missingFields.join(', ')}` 
      };
    }

    return { ok: true };
  } catch (err) {
    return { 
      ok: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Add a note to Anki
 */
export async function addNoteToAnki(card: ParsedCard): Promise<number> {
  const fields: Record<string, string> = {};
  
  // Map parsed card to configured fields
  const mapping = config.anki.fieldMapping;
  
  // Fill fields based on mapping
  fields[mapping.word] = card.word;
  fields[mapping.definition] = card.definition;
  
  // Combine examples with line breaks
  fields[mapping.example] = card.examples.length > 0 
    ? card.examples.join('<br><br>')
    : '';
  
  // Add Russian translation
  fields[mapping.back] = card.translation;
  
  // Audio field - empty for now (HyperTTS will fill it later)
  fields[mapping.audio] = '';
  
  const noteId = await ankiRequest<number>('addNote', {
    note: {
      deckName: config.anki.deckName,
      modelName: config.anki.modelName,
      fields,
      tags: config.anki.tags,
    },
  });

  return noteId;
}

/**
 * Check if a note with the same word already exists
 */
export async function checkDuplicate(word: string): Promise<boolean> {
  try {
    const noteIds = await ankiRequest<number[]>('findNotes', {
      query: `"deck:${config.anki.deckName}" "${word}"`,
    });
    return noteIds.length > 0;
  } catch {
    // If search fails, proceed anyway
    return false;
  }
}

function escapeQueryValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

function buildWordQuery(word: string): string {
  const safeWord = escapeQueryValue(word);
  return `"deck:${config.anki.deckName}" "note:${config.anki.modelName}" "Word:${safeWord}"`;
}

export async function findCardIdsByWord(word: string): Promise<number[]> {
  const query = buildWordQuery(word);
  return ankiRequest<number[]>('findCards', { query });
}

export async function markWordAgain(word: string): Promise<number> {
  const cardIds = await findCardIdsByWord(word);
  if (cardIds.length === 0) {
    return 0;
  }

  const answers = Array.from(new Set(cardIds)).map((cardId) => ({
    cardId,
    ease: 1, // Again
  }));

  await ankiRequest('answerCards', { answers });
  return answers.length;
}
