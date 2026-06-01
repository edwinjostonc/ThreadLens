import Sentiment from 'sentiment';

const analyzer = new Sentiment();

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
  return {
    score: result.score,
    comparative: result.comparative,
    positive: result.score > 0,
    negative: result.score < 0,
    neutral: result.score === 0,
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
