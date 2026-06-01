import type { Entity, RedditThread } from '@/types';
import { clamp } from '@/lib/utils';

/**
 * Consensus Score (0–100):
 * 35% mention frequency     — how often mentioned vs. top entity
 * 30% positive sentiment    — ratio of positive mentions
 * 20% thread spread         — unique threads mentioning this entity
 * 10% subreddit diversity   — cross-community consensus (unique subreddits)
 *  5% specificity           — entity has both pros AND cons = real discussion
 *
 * Removed from v1:
 * - upvoteRatio: all snippets have hardcoded score=10, so it just duplicated frequency
 * - recencyScore: all timestamps are 0 (Serper doesn't provide them), always scored 0
 */
function scoreEntity(
  entity: Entity,
  maxMentions: number,
  totalThreads: number,
  allSubreddits: Set<string>,
  threadSubredditMap: Map<string, string>,
): number {
  const mentionRatio = maxMentions > 0 ? entity.totalMentions / maxMentions : 0;

  const sentimentRatio = entity.sentimentRatio;

  const threadRatio = totalThreads > 0
    ? entity.supportingThreadIds.length / totalThreads
    : 0;

  // Subreddit diversity: unique subreddits this entity appears in vs total subreddits seen
  const entitySubreddits = new Set(
    entity.supportingThreadIds
      .map((id) => threadSubredditMap.get(id))
      .filter((s): s is string => Boolean(s)),
  );
  const subredditDiversity = allSubreddits.size > 0
    ? entitySubreddits.size / allSubreddits.size
    : 0;

  // Specificity: has both praised AND criticized = genuine community discussion
  const hasPros = entity.pros.length > 0;
  const hasCons = entity.cons.length > 0;
  const specificity = hasPros && hasCons ? 1.0 : hasPros || hasCons ? 0.5 : 0;

  const raw =
    mentionRatio * 35 +
    sentimentRatio * 30 +
    threadRatio * 20 +
    subredditDiversity * 10 +
    specificity * 5;

  return Math.round(clamp(raw, 0, 100));
}

export function scoreConsensus(entities: Entity[], threads: RedditThread[]): Entity[] {
  if (entities.length === 0) return [];

  const maxMentions = Math.max(...entities.map((e) => e.totalMentions));

  const threadSubredditMap = new Map<string, string>(
    threads.map((t) => [t.id, t.subreddit]),
  );
  const allSubreddits = new Set(threads.map((t) => t.subreddit));

  return entities
    .map((entity) => ({
      ...entity,
      consensusScore: scoreEntity(
        entity,
        maxMentions,
        threads.length,
        allSubreddits,
        threadSubredditMap,
      ),
    }))
    .sort((a, b) => b.consensusScore - a.consensusScore);
}
