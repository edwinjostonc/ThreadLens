import { callGroq } from '@/lib/ai/groq';

function expandQueryBasic(query: string): string[] {
  const q = query.trim();
  return [...new Set([q, `${q} recommendation`, `best ${q}`, `${q} review`])];
}

export async function expandQuery(query: string): Promise<string[]> {
  const prompt = `Generate 4 diverse Reddit search queries to find community opinions about: "${query}"

Rules:
- Each query must be 3-6 words
- Cover different angles: recommendations, comparisons, reviews, worth-it questions
- Write like a Reddit user searching for opinions
- Queries should maximize result diversity (don't repeat the same intent)

Return ONLY a JSON array of strings. No explanation.
Example: ["best mechanical keyboard reddit", "mechanical keyboard vs membrane worth it", "keychron vs logitech recommendation", "mechanical keyboard beginner buy 2024"]`;

  const content = await callGroq(prompt, { maxTokens: 200, temperature: 0.4 });
  if (content) {
    try {
      const match = content.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          const queries = parsed
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim())
            .slice(0, 4);
          if (queries.length >= 2) {
            // Ensure original query is always included
            if (!queries.some((q) => q.toLowerCase().includes(query.toLowerCase().substring(0, 8)))) {
              queries.unshift(query.trim());
            }
            return queries.slice(0, 4);
          }
        }
      }
    } catch {
      // fall through
    }
  }

  return expandQueryBasic(query);
}
