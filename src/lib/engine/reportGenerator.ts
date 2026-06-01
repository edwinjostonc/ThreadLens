import type { Entity } from '@/types';

export function detectDisagreements(entities: Entity[]): string[] {
  const disagreements: string[] = [];

  for (const entity of entities.slice(0, 5)) {
    if (entity.totalMentions < 2) continue;

    const posRatio = entity.sentimentRatio;
    const negRatio = entity.negativeCount / entity.totalMentions;

    // Polarizing: significant positive AND negative sentiment
    if (posRatio > 0.3 && negRatio > 0.3) {
      disagreements.push(
        `Opinions on ${entity.name} are divided (${Math.round(posRatio * 100)}% positive, ${Math.round(negRatio * 100)}% negative)`,
      );
    }
  }

  // Compare top two entities if they have conflicting dominance
  if (entities.length >= 2) {
    const [first, second] = entities;
    if (
      Math.abs(first.consensusScore - second.consensusScore) < 15 &&
      first.totalMentions > 3 &&
      second.totalMentions > 3
    ) {
      disagreements.push(
        `Community is split between ${first.name} and ${second.name} — both frequently recommended`,
      );
    }
  }

  return disagreements.slice(0, 4);
}

export function extractCommonPraises(entities: Entity[]): string[] {
  const all = entities.flatMap((e) => e.pros);
  const seen = new Set<string>();
  return all.filter((s) => {
    const key = s.substring(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

export function extractCommonComplaints(entities: Entity[]): string[] {
  const all = entities.flatMap((e) => e.cons);
  const seen = new Set<string>();
  return all.filter((s) => {
    const key = s.substring(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

export function generateTemplateSummary(
  query: string,
  entities: Entity[],
  threadCount: number,
  commentCount: number,
): string {
  if (entities.length === 0) {
    return `Analysis of ${threadCount} Reddit threads and ${commentCount} comments found no clear consensus on "${query}". The community discussions exist but no specific recommendations emerged with sufficient agreement.`;
  }

  const top = entities[0];
  const posPercent = Math.round(top.sentimentRatio * 100);
  const hasSecond = entities.length >= 2;

  let summary = `Based on ${threadCount} Reddit threads and ${commentCount} comments, `;
  summary += `Reddit users most commonly recommend ${top.name} for "${query}" `;
  summary += `with a consensus score of ${top.consensusScore}/100. `;
  summary += `${posPercent}% of mentions are positive`;

  if (hasSecond) {
    summary += `, with ${entities[1].name} as a notable alternative`;
  }

  summary += '.';

  if (top.pros.length > 0) {
    summary += ` Community frequently praises its ${top.pros[0].substring(0, 80).toLowerCase()}.`;
  }

  if (top.cons.length > 0) {
    summary += ` Main concern: ${top.cons[0].substring(0, 80).toLowerCase()}.`;
  }

  return summary;
}
