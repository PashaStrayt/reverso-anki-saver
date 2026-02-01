/**
 * Parsed card data from Reverso
 */
export interface ParsedCard {
  word: string;
  definition: string;
  examples: string[];
  translation: string; // Russian translation
  sourceUrl: string;
}

/**
 * Result of parsing operation
 */
export type ParseResult =
  | { ok: true; data: ParsedCard }
  | { ok: false; reason: 'missing_word' | 'missing_definition' | 'layout_changed' | 'unknown' };

/**
 * AnkiConnect API response
 */
export interface AnkiConnectResponse<T = unknown> {
  result: T;
  error: string | null;
}
