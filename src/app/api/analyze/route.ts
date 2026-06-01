import { NextResponse } from 'next/server';
import { z } from 'zod';
import { expandQuery } from '@/lib/engine/queryExpander';
import { searchReddit, fetchSnippetComments, deduplicateThreads, selectTopThreads } from '@/lib/reddit/search';
import type { DateRange } from '@/lib/reddit/search';
import { cleanComments } from '@/lib/engine/dataCleaner';
import { extractEntities } from '@/lib/engine/entityExtractor';
import { scoreConsensus } from '@/lib/engine/consensusScorer';
import { calculateConfidence } from '@/lib/engine/confidenceEngine';
import { detectDisagreements, extractCommonPraises, extractCommonComplaints } from '@/lib/engine/reportGenerator';
import { generateExecutiveSummary } from '@/lib/ai/explainer';
import { getCachedReport, cacheReport } from '@/lib/cache/searchCache';
import type { ConsensusReport } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const querySchema = z.string().min(2).max(200).trim();

// Simple in-memory rate limiter: max 8 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    // Prune expired entries to prevent unbounded Map growth
    if (rateLimitMap.size > 500) {
      for (const [k, v] of rateLimitMap) {
        if (v.resetAt < now) rateLimitMap.delete(k);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 8) return false;
  entry.count++;
  return true;
}

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');

  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Query must be 2–200 characters.' }, { status: 400 });
  }

  const query = parsed.data;

  // Parse optional date range
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const dateRange: DateRange | undefined =
    dateFrom && dateTo && dateRe.test(dateFrom) && dateRe.test(dateTo) && dateFrom <= dateTo
      ? { from: dateFrom, to: dateTo }
      : undefined;

  const startTime = Date.now();

  // Check cache
  const cached = await getCachedReport(query, dateRange);
  if (cached) {
    return NextResponse.json({ success: true, report: cached, cached: true });
  }

  try {
    // 1. Expand query into variations
    const queries = await expandQuery(query);

    // 2. Search via Serper (site:reddit.com) for all query variations
    const allThreads = [];
    for (const q of queries) {
      const results = await searchReddit(q, 10, dateRange);
      allThreads.push(...results);
    }

    // 3. Deduplicate + rank + select top threads
    const uniqueThreads = deduplicateThreads(allThreads);
    const topThreads = selectTopThreads(uniqueThreads, 6);

    if (topThreads.length === 0) {
      return NextResponse.json({
        success: true,
        report: buildEmptyReport(query, startTime),
      });
    }

    // 4. Extract snippet-based comments from Serper results
    const allComments = await fetchSnippetComments(topThreads, queries, dateRange);

    // 5. Clean data
    const cleanedComments = cleanComments(allComments);

    // 6. Extract entities + score consensus
    const rawEntities = await extractEntities(cleanedComments, query);
    const scoredEntities = scoreConsensus(rawEntities, topThreads);

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
      generatedAt: Date.now(),
      processingTimeMs: Date.now() - startTime,
    };

    // Cache result
    await cacheReport(query, report, dateRange);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[ThreadLens] Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Reddit may be temporarily unavailable. Please try again.' },
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
    generatedAt: Date.now(),
    processingTimeMs: Date.now() - startTime,
  };
}
