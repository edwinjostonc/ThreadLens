import type { RedditComment } from '@/types';

const BOT_NAMES = new Set([
  'automoderator',
  'automod',
  'redditbot',
  'bot',
  'modbot',
  'repostbot',
  'remindmebot',
]);

const SPAM_PATTERNS = [
  /^https?:\/\//i,
  /\bdm me\b/i,
  /\bjoin our discord\b/i,
  /\bcheck my profile\b/i,
];

function isBot(comment: RedditComment): boolean {
  return BOT_NAMES.has(comment.author.toLowerCase());
}

function isSpam(comment: RedditComment): boolean {
  if (comment.text.length < 15) return true;
  if (comment.text.length > 8000) return true;
  if (comment.score < -10) return true;
  return SPAM_PATTERNS.some((p) => p.test(comment.text));
}

function fixMojibake(text: string): string {
  return text
    .replace(/â€"/g, '—').replace(/â€™/g, "'").replace(/â€œ/g, '"')
    .replace(/â€/g, '"').replace(/Â·/g, '·').replace(/â€¦/g, '...')
    .replace(/â€˜/g, "'").replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è')
    .replace(/Ã /g, 'à').replace(/Ã¼/g, 'ü').replace(/Ã¶/g, 'ö');
}

function cleanText(text: string): string {
  return fixMojibake(text)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\*{1,2}(.+?)\*{1,2}/g, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
    .replace(/^#+\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanComments(comments: RedditComment[]): RedditComment[] {
  const seen = new Set<string>();

  return comments
    .filter((c) => !isBot(c) && !isSpam(c))
    .map((c) => ({ ...c, text: cleanText(c.text) }))
    .filter((c) => c.text.length >= 15)
    .filter((c) => {
      // Deduplicate by first 60 chars (catches copy-paste duplicates)
      const key = c.text.substring(0, 60).toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
