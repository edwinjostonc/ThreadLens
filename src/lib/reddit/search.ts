import type { RedditThread, RedditComment } from '@/types';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface SearchOptions {
  dateRange?: DateRange;
  subreddit?: string; // e.g. "MechanicalKeyboards"
}

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

function toGoogleDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

async function callSerper(query: string, num = 10, options?: SearchOptions): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const siteScope = options?.subreddit
    ? `site:reddit.com/r/${options.subreddit}`
    : 'site:reddit.com';
  const body: Record<string, unknown> = { q: `${siteScope} ${query}`, num };
  const dr = options?.dateRange;
  if (dr?.from && dr?.to) {
    body.tbs = `cdr:1,cd_min:${toGoogleDate(dr.from)},cd_max:${toGoogleDate(dr.to)}`;
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

/**
 * Single-pass: search Serper for all query variations and extract snippets
 * in the same call. Avoids a second Serper round-trip and captures all
 * available snippet text regardless of whether the thread appears in the
 * final top-N list.
 */
export async function searchAndExtract(
  queries: string[],
  options?: SearchOptions,
): Promise<{ threads: RedditThread[]; comments: RedditComment[] }> {
  const allThreads: RedditThread[] = [];
  const allComments: RedditComment[] = [];
  const seenThreadIds = new Set<string>();
  const seenTexts = new Set<string>();

  function addSnippet(text: string, threadId: string) {
    const dedupeKey = text.substring(0, 60).toLowerCase().replace(/\s+/g, ' ');
    if (seenTexts.has(dedupeKey)) return;
    seenTexts.add(dedupeKey);
    const comments = snippetToComments(text, threadId, allComments.length);
    allComments.push(...comments);
  }

  for (const query of queries) {
    const results = await callSerper(query, 10, options);
    for (const result of results) {
      const thread = parseThreadFromUrl(result);
      if (!thread) continue;

      if (!seenThreadIds.has(thread.id)) {
        seenThreadIds.add(thread.id);
        allThreads.push(thread);
      }

      // Extract all snippets immediately — no thread ID filter
      if (result.snippet) addSnippet(result.snippet, thread.id);
      for (const sitelink of result.sitelinks ?? []) {
        if (sitelink.snippet) addSnippet(sitelink.snippet, thread.id);
        else if (sitelink.title && sitelink.title.length > 20) addSnippet(sitelink.title, thread.id);
      }
    }
  }

  return { threads: allThreads, comments: allComments };
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

// Kept for compatibility
export async function searchReddit(query: string, limit = 10, options?: SearchOptions): Promise<RedditThread[]> {
  const results = await callSerper(query, limit, options);
  return results.map(parseThreadFromUrl).filter((t): t is RedditThread => t !== null);
}

export async function fetchSnippetComments(threads: RedditThread[], queries: string[], options?: SearchOptions): Promise<RedditComment[]> {
  const { comments } = await searchAndExtract(queries, options);
  return comments;
}
