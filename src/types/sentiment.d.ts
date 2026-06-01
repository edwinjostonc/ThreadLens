declare module 'sentiment' {
  interface SentimentResult {
    score: number;
    comparative: number;
    calculation: Array<Record<string, number>>;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  interface Options {
    language?: string;
    extras?: Record<string, number>;
  }

  class Sentiment {
    analyze(text: string, options?: Options): SentimentResult;
  }

  export = Sentiment;
}
