import type { Entity, RedditThread } from '@/types';
import { clamp } from '@/lib/utils';

/**
 * Consensus Score (0–100):
 * 30% mention frequency   — how often mentioned vs. top entity
 * 25% positive sentiment  — ratio of positive mentions
 * 20% thread spread       — how many threads mention this entity
 * 15% comment upvotes     — normalized upvote weight
 * 10% recency             — normalized avg mention timestamp
 */
function scoreEntity(
  entity: Entity,
  maxMentions: number,
  totalThreads: number,
  maxUpvotes: number,
  oldestTimestamp: number,
  newestTimestamp: number,
): number {
  const mentionRatio = maxMentions > 0 ? entity.totalMentions / maxMentions : 0;
  const sentimentRatio = entity.sentimentRatio;
  const threadRatio = totalThreads > 0 ? entity.supportingThreadIds.length / totalThreads : 0;
  const upvoteRatio = maxUpvotes > 0 ? clamp(entity.totalUpvotes / maxUpvotes, 0, 1) : 0;

  const avgTimestamp =
    entity.mentions.length > 0
      ? entity.mentions.reduce((sum, m) => sum + m.createdAt, 0) / entity.mentions.length
      : oldestTimestamp;
  const timeRange = newestTimestamp - oldestTimestamp || 1;
  const recencyScore = clamp((avgTimestamp - oldestTimestamp) / timeRange, 0, 1);

  const raw =
    mentionRatio * 30 +
    sentimentRatio * 25 +
    threadRatio * 20 +
    upvoteRatio * 15 +
    recencyScore * 10;

  return Math.round(clamp(raw, 0, 100));
}

export function scoreConsensus(entities: Entity[], threads: RedditThread[]): Entity[] {
  if (entities.length === 0) return [];

  const maxMentions = Math.max(...entities.map((e) => e.totalMentions));
  const maxUpvotes = Math.max(...entities.map((e) => e.totalUpvotes), 1);
  const totalThreads = threads.length;

  const allTimestamps = entities.flatMap((e) => e.mentions.map((m) => m.createdAt));
  const oldestTimestamp = allTimestamps.length > 0 ? Math.min(...allTimestamps) : 0;
  const newestTimestamp = allTimestamps.length > 0 ? Math.max(...allTimestamps) : 1;

  return entities
    .map((entity) => ({
      ...entity,
      consensusScore: scoreEntity(
        entity,
        maxMentions,
        totalThreads,
        maxUpvotes,
        oldestTimestamp,
        newestTimestamp,
      ),
    }))
    .sort((a, b) => b.consensusScore - a.consensusScore);
}
