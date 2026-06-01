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

export function getSentencesContaining(text: string, entity: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const entityLower = entity.toLowerCase();
  return sentences.filter((s) => s.toLowerCase().includes(entityLower));
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
