import type { RedditComment, Entity, EntityMention } from '@/types';
import { analyzeSentiment, getSentencesContaining, classifySentences } from './sentimentAnalyzer';
import { callGroq } from '@/lib/ai/groq';

function groqChat(prompt: string, maxTokens = 300, temperature = 0.2): Promise<string | null> {
  return callGroq(prompt, { maxTokens, temperature });
}

async function extractEntityNamesWithGroq(comments: RedditComment[], query: string): Promise<string[] | null> {
  const text = comments.map((c) => `• ${c.text}`).join('\n').substring(0, 4000);

  const prompt = `You are analyzing Reddit community opinions about: "${query}"

Reddit snippets:
${text}

Task: Extract ONLY the specific products, brands, services, or named options that Redditors are actually recommending or discussing.

Rules:
1. Return SPECIFIC names only — full product names as mentioned (e.g. "Keychron Q1 Pro" not "Keychron")
2. NEVER return generic category words (e.g. "keyboard", "protein", "whey", "laptop", "phone")
3. NEVER return adjectives alone (e.g. "best", "good", "cheap")
4. NEVER return company names alone unless that IS the full product (e.g. "Apple" is wrong, "Apple MacBook Air M2" is right)
5. Only include items that have at least one opinion/sentiment attached to them in the snippets
6. Maximum 6 entities. Rank by how frequently mentioned.

Return ONLY a valid JSON array. No explanation. No markdown.
Example output: ["Keychron Q1 Pro", "Logitech MX Keys", "GMMK Pro"]`;

  const content = await groqChat(prompt, 250, 0.1);
  if (!content) return null;

  try {
    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 2)
      .map((s) => s.trim())
      .slice(0, 6);
  } catch {
    return null;
  }
}

async function filterRelevantComments(comments: RedditComment[], query: string): Promise<RedditComment[]> {
  if (comments.length === 0) return [];

  const text = comments.map((c, i) => `[${i}] ${c.text.substring(0, 150)}`).join('\n');

  const prompt = `Query: "${query}"

Snippets:
${text}

Which snippet indices are RELEVANT to the query above? A snippet is relevant if it:
- Mentions a specific product/option/service related to the query
- Contains an opinion, recommendation, or comparison
- Is NOT just asking a question with no useful content

Return ONLY a JSON array of the relevant indices (numbers). No explanation.
Example: [0, 2, 4, 5]`;

  const content = await groqChat(prompt, 150, 0.1);

  if (!content) return comments; // fallback: keep all

  try {
    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return comments;
    const indices: number[] = JSON.parse(match[0]);
    if (!Array.isArray(indices)) return comments;
    return indices
      .filter((i) => typeof i === 'number' && i >= 0 && i < comments.length)
      .map((i) => comments[i]);
  } catch {
    return comments;
  }
}

function buildEntityFromName(name: string, comments: RedditComment[], aliases: string[] = []): Entity | null {
  const mentions: EntityMention[] = [];
  const supportingThreadIds = new Set<string>();
  const searchTerms = [name, ...aliases];

  for (const comment of comments) {
    const sentences: string[] = [];
    for (const term of searchTerms) {
      sentences.push(...getSentencesContaining(comment.text, term));
    }
    if (sentences.length === 0) continue;

    for (const sentence of [...new Set(sentences)]) {
      const sentiment = analyzeSentiment(sentence);
      mentions.push({
        commentId: comment.id,
        threadId: comment.threadId,
        sentence: sentence.substring(0, 300),
        sentimentScore: sentiment.score,
        commentScore: comment.score,
        createdAt: comment.createdAt,
      });
      supportingThreadIds.add(comment.threadId);
    }
  }

  if (mentions.length < 1) return null;

  const positiveCount = mentions.filter((m) => m.sentimentScore > 0).length;
  const negativeCount = mentions.filter((m) => m.sentimentScore < 0).length;
  const neutralCount = mentions.filter((m) => m.sentimentScore === 0).length;

  const { positive: proSentences, negative: conSentences } = classifySentences(
    mentions.map((m) => m.sentence),
  );

  const uniquePros = [...new Set(proSentences)]
    .filter((s) => s.length > 20 && s.length < 280)
    .slice(0, 5);
  const uniqueCons = [...new Set(conSentences)]
    .filter((s) => s.length > 20 && s.length < 280)
    .slice(0, 5);

  const totalUpvotes = mentions.reduce((sum, m) => sum + Math.max(0, m.commentScore), 0);

  return {
    name,
    aliases,
    mentions,
    totalMentions: mentions.length,
    positiveCount,
    negativeCount,
    neutralCount,
    supportingThreadIds: [...supportingThreadIds],
    pros: uniquePros,
    cons: uniqueCons,
    consensusScore: 0,
    sentimentRatio: mentions.length > 0 ? positiveCount / mentions.length : 0,
    totalUpvotes,
  };
}

// Fallback: naive capitalized noun phrase extraction
const STOPWORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
  'it', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'used',
  'also', 'just', 'very', 'really', 'actually', 'basically', 'literally',
  'reddit', 'subreddit', 'post', 'comment', 'thread', 'op', 'edit', 'update',
  'best', 'good', 'great', 'nice', 'bad', 'cheap', 'expensive',
]);

function extractCandidates(text: string): string[] {
  const candidates: string[] = [];
  const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 5);
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z0-9']/g, '');
      if (word.length < 2 || !/^[A-Z]/.test(word) || STOPWORDS.has(word.toLowerCase())) continue;
      candidates.push(word);
      if (i + 1 < words.length) {
        const next = words[i + 1].replace(/[^a-zA-Z0-9']/g, '');
        if (/^[A-Z]/.test(next) && next.length > 1) {
          candidates.push(`${word} ${next}`);
          if (i + 2 < words.length) {
            const next2 = words[i + 2].replace(/[^a-zA-Z0-9']/g, '');
            if (/^[A-Z]/.test(next2) && next2.length > 1) {
              candidates.push(`${word} ${next} ${next2}`);
            }
          }
        }
      }
    }
  }
  return candidates;
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function fallbackExtract(comments: RedditComment[], minMentions = 2): Entity[] {
  const allText = comments.map((c) => c.text).join('\n\n');
  const freq = new Map<string, number>();
  for (const c of extractCandidates(allText)) {
    const k = normalizeKey(c);
    if (k.length >= 3) freq.set(c, (freq.get(c) ?? 0) + 1);
  }

  const groups = new Map<string, string[]>();
  for (const [name, count] of freq) {
    if (count < minMentions) continue;
    const k = normalizeKey(name);
    let matched = false;
    for (const [gk, variants] of groups) {
      if (levenshtein(k, gk) <= 1 || k.includes(gk) || gk.includes(k)) {
        variants.push(name);
        matched = true;
        break;
      }
    }
    if (!matched) groups.set(k, [name]);
  }

  const entities: Entity[] = [];
  for (const [, variants] of groups) {
    const canonical = variants.reduce((best, v) =>
      (freq.get(v) ?? 0) > (freq.get(best) ?? 0) ? v : best);
    const entity = buildEntityFromName(canonical, comments, variants.filter((v) => v !== canonical));
    if (entity && entity.mentions.length >= minMentions) entities.push(entity);
  }
  return entities;
}

export async function extractEntities(comments: RedditComment[], query: string): Promise<Entity[]> {
  if (comments.length === 0) return [];

  // Step 1: filter to relevant snippets
  const relevant = await filterRelevantComments(comments, query);
  const pool = relevant.length >= 3 ? relevant : comments;

  // Step 2: Groq entity name extraction (70B model)
  const groqNames = await extractEntityNamesWithGroq(pool, query);

  if (groqNames && groqNames.length > 0) {
    // Deduplicate by lowercase key — "keychron q1" and "Keychron Q1" are the same entity
    const seen = new Map<string, string>(); // lowercase → canonical name
    const deduped: string[] = [];
    for (const name of groqNames) {
      const key = name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, name);
        deduped.push(name);
      }
    }

    const entities: Entity[] = [];
    for (const name of deduped) {
      const entity = buildEntityFromName(name, pool);
      if (entity && entity.mentions.length >= 2) entities.push(entity);
    }
    if (entities.length > 0) return entities;
  }

  // Step 3: Fallback — regex extraction
  return fallbackExtract(pool);
}
