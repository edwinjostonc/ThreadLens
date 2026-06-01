const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_RETRIES = 2;

export interface GroqOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function callGroq(
  prompt: string,
  options: GroqOptions = {},
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const { maxTokens = 300, temperature = 0.3 } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }),
      });

      // Rate limited — wait and retry
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }

      if (!response.ok) return null;

      const json = await response.json();
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      if (attempt === MAX_RETRIES) return null;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  return null;
}
