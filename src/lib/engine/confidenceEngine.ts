import type { Entity, ConfidenceResult, ConfidenceLevel } from '@/types';

function getSentimentConsistency(entities: Entity[]): number {
  if (entities.length === 0) return 0;
  const top = entities[0];
  if (top.totalMentions === 0) return 0;
  // How consistently positive or negative the top entity is
  const dominant = Math.max(top.positiveCount, top.negativeCount);
  return dominant / top.totalMentions;
}

export function calculateConfidence(
  threadCount: number,
  commentCount: number,
  entities: Entity[],
): ConfidenceResult {
  const sentimentConsistency = getSentimentConsistency(entities);

  let level: ConfidenceLevel;
  let reason: string;

  if (threadCount >= 8 && commentCount >= 80 && sentimentConsistency >= 0.60) {
    level = 'high';
    reason = `${threadCount} threads · ${commentCount} comments · strong agreement`;
  } else if (threadCount >= 4 && commentCount >= 30) {
    level = 'medium';
    reason = `${threadCount} threads · ${commentCount} comments · moderate data`;
  } else {
    level = 'low';
    reason = `${threadCount} threads · ${commentCount} comments · limited data`;
  }

  return {
    level,
    reason,
    threadCount,
    commentCount,
    sentimentConsistency,
  };
}
