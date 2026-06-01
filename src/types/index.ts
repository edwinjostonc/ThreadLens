export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface RedditThread {
  id: string;
  title: string;
  url: string;
  permalink: string;
  score: number;
  subreddit: string;
  createdAt: number;
  commentCount: number;
}

export interface RedditComment {
  id: string;
  threadId: string;
  text: string;
  score: number;
  author: string;
  createdAt: number;
}

export interface EntityMention {
  commentId: string;
  threadId: string;
  sentence: string;
  sentimentScore: number;
  commentScore: number;
  createdAt: number;
}

export interface Entity {
  name: string;
  aliases: string[];
  mentions: EntityMention[];
  totalMentions: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  supportingThreadIds: string[];
  pros: string[];
  cons: string[];
  consensusScore: number;
  sentimentRatio: number;
  totalUpvotes: number;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  reason: string;
  threadCount: number;
  commentCount: number;
  sentimentConsistency: number;
}

export interface ConsensusReport {
  query: string;
  executiveSummary: string;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  totalThreads: number;
  totalComments: number;
  entities: Entity[];
  disagreements: string[];
  commonPraises: string[];
  commonComplaints: string[];
  sourceThreads: RedditThread[];
  generatedAt: number;
  processingTimeMs: number;
}

export interface AnalyzeResponse {
  success: boolean;
  report?: ConsensusReport;
  error?: string;
  cached?: boolean;
}

