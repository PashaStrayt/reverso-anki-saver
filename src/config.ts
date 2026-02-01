/**
 * Configuration for Anki integration
 * Update these values to match your Anki setup
 */
export const config = {
  anki: {
    url: 'http://127.0.0.1:8765',
    deckName: 'Fluent English',
    modelName: 'Word+Example+Definition',
    // Map parsed card fields to your Note Type fields
    fieldMapping: {
      word: 'Word',
      definition: 'Definition',
      example: 'Example',
      back: 'Back', // Russian translation
      audio: 'Audio', // Will be empty for now, HyperTTS will fill later
    },
    tags: ['reverso', 'reverso::english-definition', 'needs_tts'],
  },
  
  ui: {
    // Maximum viewport width to enable the button (in px)
    // The target layout appears at 767px or below
    // Set to 0 to disable width checking
    maxWidthPx: 767, // Only work on mobile/tablet layout
  },
};
