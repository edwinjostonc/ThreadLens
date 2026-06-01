# ThreadLens

**Understand Reddit without reading Reddit.**

ThreadLens analyzes thousands of Reddit discussions to extract what the community actually thinks — backed by real data, not AI hallucinations.

🔗 **Live:** https://thread-lens-gilt.vercel.app

---

## What it does

Type any question. ThreadLens searches Reddit, extracts community opinions, scores consensus across 5 dimensions, and returns ranked recommendations with confidence levels and source links.

- Filter by **date range** — see what Reddit thought in 2022 vs 2024
- Filter by **subreddit** — scope to r/MechanicalKeyboards, r/personalfinance, etc.
- Every recommendation is backed by real Reddit threads you can click through

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, GSAP |
| Backend | Next.js API Routes (serverless) |
| AI/LLM | Groq API — Llama 3.3 70B |
| Search | Serper API (Google, site:reddit.com scoped) |
| Cache | Upstash Redis (L2) + SQLite/Prisma (L3) |
| Deployment | Vercel |

---

## How the consensus engine works

1. **Query expansion** — Groq generates 4 diverse search variations
2. **Single-pass search** — Serper fetches Reddit threads + extracts snippets in one pass
3. **Entity extraction** — Groq identifies specific products/brands mentioned by the community
4. **Sentiment analysis** — Each mention scored positive/negative using NLP
5. **Consensus scoring** — 5-dimension weighted algorithm:
   - 35% mention frequency
   - 30% positive sentiment ratio
   - 20% thread spread (unique threads)
   - 10% subreddit diversity (cross-community consensus)
   - 5% specificity (entities with both pros & cons)
6. **AI summary** — Groq generates a 2-3 sentence executive summary from the data

---

## Local setup

```bash
git clone https://github.com/edwinjostonc/ThreadLens
cd ThreadLens
pnpm install

cp .env.example .env.local
# Fill in SERPER_API_KEY, GROQ_API_KEY, DATABASE_URL

pnpm db:push
pnpm dev
```

Open http://localhost:3000

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SERPER_API_KEY` | Yes | [serper.dev](https://serper.dev) — Reddit search |
| `GROQ_API_KEY` | No | [console.groq.com](https://console.groq.com) — AI features |
| `DATABASE_URL` | Yes | SQLite path (`file:./prisma/dev.db` locally, `file:/tmp/threadlens.db` on Vercel) |
| `UPSTASH_REDIS_REST_URL` | No | [upstash.com](https://upstash.com) — persistent cache on Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |
