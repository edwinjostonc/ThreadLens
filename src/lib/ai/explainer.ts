import type { Entity, RedditThread } from '@/types';
import { generateTemplateSummary } from '@/lib/engine/reportGenerator';
import { callGroq } from '@/lib/ai/groq';

export async function generateExecutiveSummary(
  query: string,
  entities: Entity[],
  threads: RedditThread[],
  commentCount: number,
): Promise<string> {
  const top3 = entities.slice(0, 3);

  if (top3.length === 0) {
    return generateTemplateSummary(query, entities, threads.length, commentCount);
  }

  const entityLines = top3.map((e) => {
    const pros = e.pros.slice(0, 2).join('; ') || 'none noted';
    const cons = e.cons.slice(0, 1).join('; ') || 'none noted';
    return `- ${e.name}: score ${e.consensusScore}/100, ${Math.round(e.sentimentRatio * 100)}% positive (${e.totalMentions} mentions)\n  Praised for: ${pros}\n  Criticized for: ${cons}`;
  }).join('\n');

  const prompt = `You are summarizing Reddit community consensus data for a user making a decision.

User query: "${query}"
Data: ${threads.length} Reddit threads, ${commentCount} comments analyzed

Top recommendations (by consensus score):
${entityLines}

Write a 2-3 sentence executive summary that:
1. Names the top recommendation and its score
2. Explains WHY the community likes it (use the actual pros)
3. Mentions the runner-up if the gap is close OR notes a key trade-off
4. Feels like advice from a knowledgeable friend, not a robot

Rules:
- Start with the recommendation, NOT with "Based on" or "According to"
- Use plain language, be specific and direct
- Do NOT use markdown bold or asterisks
- Max 3 sentences

Write only the summary:`;

  const aiSummary = await callGroq(prompt, { maxTokens: 220 });
  if (!aiSummary || aiSummary.length < 40) {
    return generateTemplateSummary(query, entities, threads.length, commentCount);
  }

  return aiSummary;
}
