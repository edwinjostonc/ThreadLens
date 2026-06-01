const REDDIT_BASE = 'https://www.reddit.com';
const USER_AGENT = 'ThreadLens:1.0.0 (Portfolio project; educational use)';
const REQUEST_GAP_MS = 700;

let lastRequestAt = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const gap = now - lastRequestAt;
  if (gap < REQUEST_GAP_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_GAP_MS - gap));
  }
  lastRequestAt = Date.now();
}

export async function redditFetch<T = unknown>(path: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    await waitForRateLimit();

    const url = `${REDDIT_BASE}${path}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 0 },
    });

    if (response.status === 429) {
      const backoff = 2000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    if (response.status === 404) {
      throw new Error(`Reddit 404: ${path}`);
    }

    if (!response.ok) {
      if (attempt === retries - 1) {
        throw new Error(`Reddit API error ${response.status}: ${path}`);
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }

    return response.json() as T;
  }

  throw new Error(`Reddit API failed after ${retries} attempts: ${path}`);
}
