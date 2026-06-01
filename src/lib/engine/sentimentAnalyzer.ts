import Sentiment from 'sentiment';

const analyzer = new Sentiment();

const NEGATION_WORDS = new Set([
  'not', "n't", 'never', 'no', 'neither', 'nor', 'nobody', 'nothing', 'nowhere',
  'hardly', 'barely', 'scarcely', 'without', 'cannot', "can't", "won't", "don't",
  "doesn't", "didn't", "isn't", "wasn't", "aren't", "weren't", "wouldn't",
  "shouldn't", "couldn't", "haven't", "hasn't", "hadn't",
]);

/**
 * Detect negation within a sliding window before a token.
 * Returns true if a negation word appears in the preceding `window` tokens.
 */
function hasNegationBefore(tokens: string[], index: number, window = 3): boolean {
  const start = Math.max(0, index - window);
  for (let i = start; i < index; i++) {
    if (NEGATION_WORDS.has(tokens[i].toLowerCase())) return true;
  }
  return false;
}

export interface SentimentResult {
  score: number;
  comparative: number;
  positive: boolean;
  negative: boolean;
  neutral: boolean;
  tokens: string[];
}

export function analyzeSentiment(text: string): SentimentResult {
  const result = analyzer.analyze(text);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);

  // Negation adjustment: flip contribution of positive/negative tokens
  // when preceded by a negation word within 3 tokens
  let negationAdjustment = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (hasNegationBefore(tokens, i)) {
      // Check if this token had sentiment value — if positive, subtract 4; if negative, add 4
      const mockPos = analyzer.analyze(tok);
      if (mockPos.score > 0) negationAdjustment -= mockPos.score * 2;
      if (mockPos.score < 0) negationAdjustment += Math.abs(mockPos.score) * 2;
    }
  }

  const adjustedScore = result.score + negationAdjustment;

  return {
    score: adjustedScore,
    comparative: tokens.length > 0 ? adjustedScore / tokens.length : 0,
    positive: adjustedScore > 0,
    negative: adjustedScore < 0,
    neutral: adjustedScore === 0,
    tokens: [...(result.positive ?? []), ...(result.negative ?? [])],
  };
}

/**
 * Returns sentences containing the entity using word-boundary matching.
 * Prevents false positives like "Alps" matching "scalps" or "palps".
 */
export function getSentencesContaining(text: string, entity: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  // Use word-boundary regex for precise matching; fall back to includes for
  // multi-word entities where boundary anchors are already implicit.
  let matchFn: (s: string) => boolean;
  try {
    const escaped = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    matchFn = (s) => regex.test(s);
  } catch {
    const lower = entity.toLowerCase();
    matchFn = (s) => s.toLowerCase().includes(lower);
  }

  return sentences.filter(matchFn);
}

export function classifySentences(sentences: string[]): {
  positive: string[];
  negative: string[];
  neutral: string[];
} {
  const positive: string[] = [];
  const negative: string[] = [];
  const neutral: string[] = [];

  for (const s of sentences) {
    const result = analyzer.analyze(s);
    if (result.score > 0) positive.push(s);
    else if (result.score < 0) negative.push(s);
    else neutral.push(s);
  }

  return { positive, negative, neutral };
}
