import type { RedditThread, RedditComment } from '@/types';

interface SerperSitelink {
  title: string;
  link: string;
  snippet?: string;
}

interface SerperOrganic {
  title: string;
  link: string;
  snippet?: string;
  sitelinks?: SerperSitelink[];
}

interface SerperResponse {
  organic?: SerperOrganic[];
}

async function callSerper(query: string, num = 10): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: `site:reddit.com ${query}`, num }),
    });

    if (!response.ok) return [];
    const data: SerperResponse = await response.json();
    return data.organic ?? [];
  } catch {
    return [];
  }
}

function parseThreadFromUrl(result: SerperOrganic): RedditThread | null {
  const match = result.link?.match(/reddit\.com\/r\/([^/]+)\/comments\/([a-z0-9]+)/i);
  if (!match) return null;
  return {
    id: match[2],
    title: result.title.replace(/\s*:\s*r\/\w+\s*$/, '').replace(/\s*[-|]\s*Reddit\s*$/, '').trim(),
    url: result.link,
    permalink: result.link,
    score: 100,
    subreddit: match[1],
    createdAt: 0,
    commentCount: 20,
  };
}

function snippetToComments(snippet: string, threadId: string, baseIdx: number): RedditComment[] {
  const cleaned = snippet
    .trim()
    .replace(/^\d+\s+votes?,\s*\d+\s+comments?\.\s*/i, '')
    .trim();

  if (cleaned.length < 20) return [];

  // Split on sentence boundaries to get multiple data points from one snippet
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  if (sentences.length <= 1) {
    return [{
      id: `serper_${threadId}_${baseIdx}`,
      threadId,
      text: cleaned,
      score: 10,
      author: 'reddit_user',
      createdAt: 0,
    }];
  }

  return sentences.map((sentence, i) => ({
    id: `serper_${threadId}_${baseIdx}_${i}`,
    threadId,
    text: sentence,
    score: 10,
    author: 'reddit_user',
    createdAt: 0,
  }));
}

export async function searchReddit(query: string, limit = 10): Promise<RedditThread[]> {
  const results = await callSerper(query, limit);
  return results
    .map(parseThreadFromUrl)
    .filter((t): t is RedditThread => t !== null);
}

export async function fetchSnippetComments(threads: RedditThread[], queries: string[]): Promise<RedditComment[]> {
  const allComments: RedditComment[] = [];
  const seenThreadIds = new Set(threads.map((t) => t.id));
  const seenTexts = new Set<string>();

  function addSnippet(text: string, threadId: string) {
    const dedupeKey = text.substring(0, 60).toLowerCase().replace(/\s+/g, ' ');
    if (seenTexts.has(dedupeKey)) return;
    seenTexts.add(dedupeKey);
    const comments = snippetToComments(text, threadId, allComments.length);
    allComments.push(...comments);
  }

  for (const query of queries) {
    const results = await callSerper(query, 10);
    for (const result of results) {
      const thread = parseThreadFromUrl(result);
      if (!thread || !seenThreadIds.has(thread.id)) continue;

      if (result.snippet) addSnippet(result.snippet, thread.id);

      // Also extract sitelink snippets
      for (const sitelink of result.sitelinks ?? []) {
        if (sitelink.snippet) addSnippet(sitelink.snippet, thread.id);
        else if (sitelink.title && sitelink.title.length > 20) addSnippet(sitelink.title, thread.id);
      }
    }
  }

  return allComments;
}

// Kept for API compatibility — returns empty since Reddit blocks unauthenticated fetches
export async function fetchThreadComments(): Promise<RedditComment[]> {
  return [];
}

export function deduplicateThreads(threads: RedditThread[]): RedditThread[] {
  const seen = new Set<string>();
  return threads.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export function selectTopThreads(threads: RedditThread[], topN = 6): RedditThread[] {
  return threads.slice(0, topN);
}
