import { NextResponse } from 'next/server';
import { z } from 'zod';
import { expandQuery } from '@/lib/engine/queryExpander';
import { searchAndExtract, deduplicateThreads, selectTopThreads } from '@/lib/reddit/search';
import type { SearchOptions } from '@/lib/reddit/search';
import { cleanComments } from '@/lib/engine/dataCleaner';
import { extractEntities } from '@/lib/engine/entityExtractor';
import { scoreConsensus } from '@/lib/engine/consensusScorer';
import { calculateConfidence } from '@/lib/engine/confidenceEngine';
import { detectDisagreements, extractCommonPraises, extractCommonComplaints } from '@/lib/engine/reportGenerator';
import { generateExecutiveSummary } from '@/lib/ai/explainer';
import { getCachedReport, cacheReport } from '@/lib/cache/searchCache';
import { redisTrendingIncr } from '@/lib/cache/redis';
import type { ConsensusReport } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const querySchema = z.string().min(2).max(200).trim();

import { redisIncr } from '@/lib/cache/redis';

// In-memory fallback rate limiter (used when Redis is unavailable)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitLocal(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    // Evict: remove oldest entries when at capacity
    if (rateLimitMap.size >= 500) {
      let evicted = 0;
      for (const [k, v] of rateLimitMap) {
        if (v.resetAt < now) { rateLimitMap.delete(k); evicted++; }
        if (evicted >= 100) break;
      }
      // If still full (all entries are current), evict the oldest by resetAt
      if (rateLimitMap.size >= 500) {
        const oldest = [...rateLimitMap.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)[0];
        if (oldest) rateLimitMap.delete(oldest[0]);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 8) return false;
  entry.count++;
  return true;
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const count = await redisIncr(`tl:rl:${ip}`, 60);
  if (count === 0) return checkRateLimitLocal(ip); // Redis unavailable
  return count <= 8;
}

// Deduplication: if same query is already in-flight, reuse the promise
const pendingRequests = new Map<string, Promise<ConsensusReport>>();

export async function GET(request: Request) {
  // x-real-ip is set by reverse proxies (nginx/Vercel edge); more reliable than x-forwarded-for
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  if (!await checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');

  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Query must be 2–200 characters.' }, { status: 400 });
  }

  const query = parsed.data;

  // Parse optional date range — regex guards format, Date.parse guards validity
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDate = (d: string) => dateRe.test(d) && !isNaN(Date.parse(d));
  const dateRange =
    dateFrom && dateTo && isValidDate(dateFrom) && isValidDate(dateTo) && dateFrom <= dateTo
      ? { from: dateFrom, to: dateTo }
      : undefined;

  // Parse optional subreddit filter (alphanumeric + underscore, max 50 chars)
  const rawSubreddit = searchParams.get('subreddit');
  const subreddit =
    rawSubreddit && /^[a-zA-Z0-9_]{1,50}$/.test(rawSubreddit)
      ? rawSubreddit
      : undefined;

  const searchOptions: SearchOptions = { dateRange, subreddit };

  const startTime = Date.now();
  const cacheKey = subreddit ? `${query}|r/${subreddit}` : query;

  // Check cache
  const cached = await getCachedReport(cacheKey, dateRange);
  if (cached) {
    return NextResponse.json({ success: true, report: cached, cached: true });
  }

  // Deduplication: reuse in-flight analysis for identical concurrent requests
  const dedupKey = `${cacheKey}|${dateRange?.from ?? ''}|${dateRange?.to ?? ''}`;
  const existing = pendingRequests.get(dedupKey);
  if (existing) {
    const report = await existing;
    return NextResponse.json({ success: true, report, cached: false });
  }

  let resolvePending!: (r: ConsensusReport) => void;
  const pendingPromise = new Promise<ConsensusReport>((resolve) => { resolvePending = resolve; });
  pendingRequests.set(dedupKey, pendingPromise);

  try {
    // 1. Expand query into variations
    const queries = await expandQuery(query);

    // 2. Single-pass: search + extract snippets across all query variations
    const { threads: allThreads, comments: rawComments } = await searchAndExtract(queries, searchOptions);

    // 3. Deduplicate + select top display threads
    const uniqueThreads = deduplicateThreads(allThreads);
    const topThreads = selectTopThreads(uniqueThreads, 6);

    if (topThreads.length === 0) {
      return NextResponse.json({
        success: true,
        report: buildEmptyReport(query, startTime),
      });
    }

    // 4. Use all collected comments (from all threads, not just top-N)
    const allComments = rawComments;

    // 5. Clean data
    const cleanedComments = cleanComments(allComments);

    // 6. Extract entities + score consensus
    const rawEntities = await extractEntities(cleanedComments, query);
    const scoredEntities = scoreConsensus(rawEntities, uniqueThreads);

    // 7. Confidence + disagreements
    const confidence = calculateConfidence(topThreads.length, cleanedComments.length, scoredEntities);
    const disagreements = detectDisagreements(scoredEntities);
    const commonPraises = extractCommonPraises(scoredEntities);
    const commonComplaints = extractCommonComplaints(scoredEntities);

    // 8. AI executive summary
    const executiveSummary = await generateExecutiveSummary(
      query,
      scoredEntities,
      topThreads,
      cleanedComments.length,
    );

    // Related queries — the other expansions (excluding the original)
    const relatedQueries = queries.filter((q) => q.toLowerCase() !== query.toLowerCase()).slice(0, 4);

    const report: ConsensusReport = {
      query,
      executiveSummary,
      confidence: confidence.level,
      confidenceReason: confidence.reason,
      totalThreads: topThreads.length,
      totalComments: cleanedComments.length,
      entities: scoredEntities.slice(0, 8),
      disagreements,
      commonPraises,
      commonComplaints,
      sourceThreads: topThreads,
      relatedQueries,
      generatedAt: Date.now(),
      processingTimeMs: Date.now() - startTime,
    };

    // Cache + log trending (fire-and-forget)
    await cacheReport(cacheKey, report, dateRange);
    redisTrendingIncr(query).catch(() => {});
    resolvePending(report);
    pendingRequests.delete(dedupKey);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    pendingRequests.delete(dedupKey);
    console.error('[ThreadLens] Analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Analysis failed. Reddit may be temporarily unavailable. Please try again.' },
      { status: 500 },
    );
  }
}

function buildEmptyReport(query: string, startTime: number): ConsensusReport {
  return {
    query,
    executiveSummary: `No Reddit discussions found for "${query}". Try a different search term or check back later.`,
    confidence: 'low',
    confidenceReason: '0 threads · 0 comments · no data',
    totalThreads: 0,
    totalComments: 0,
    entities: [],
    disagreements: [],
    commonPraises: [],
    commonComplaints: [],
    sourceThreads: [],
    relatedQueries: [],
    generatedAt: Date.now(),
    processingTimeMs: Date.now() - startTime,
  };
}
