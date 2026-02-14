// Use require for better compatibility with CommonJS packages in Next.js Server Actions
const lemmatizer = require('wink-lemmatizer');

/**
 * Normalizes a word to its base lemma.
 * Try verb lemmatization first, then noun.
 * @param word The word to lemmatize.
 * @returns The base lemma.
 */
export function getLemma(word: string): string {
  if (!word) return '';
  const trimmed = word.trim().toLowerCase();

  try {
    // Determine the lemmatizer object (handle potential .default from some bundlers)
    const l = lemmatizer.default || lemmatizer;

    // Check if the expected methods exist. If not, return the original word.
    if (typeof l.verb === 'function' && typeof l.noun === 'function') {
      const asVerb = l.verb(trimmed);
      if (asVerb !== trimmed) return asVerb;

      return l.noun(trimmed);
    }
  } catch (e) {
    console.error('Lemmatization error:', e);
  }

  return trimmed;
}
