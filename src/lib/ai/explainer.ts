import type { Entity, RedditThread } from '@/types';
import { generateTemplateSummary } from '@/lib/engine/reportGenerator';

async function callGroq(prompt: string, maxTokens = 300): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    const json = await response.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

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

  const aiSummary = await callGroq(prompt, 220);
  if (!aiSummary || aiSummary.length < 40) {
    return generateTemplateSummary(query, entities, threads.length, commentCount);
  }

  return aiSummary;
}
