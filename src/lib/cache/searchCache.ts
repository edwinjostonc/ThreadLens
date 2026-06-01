import type { ConsensusReport } from '@/types';
import { hashQuery, normalizeQuery } from '@/lib/utils';
import { redisGet, redisSet } from '@/lib/cache/redis';

export interface DateRange { from: string; to: string; }

// L1: in-process memory (fast, resets on cold start)
const memoryCache = new Map<string, { report: ConsensusReport; expiresAt: number }>();
const MEMORY_TTL_MS = 5 * 60 * 1000;   // 5 minutes
const DB_TTL_SECONDS = 24 * 60 * 60;   // 24 hours

function buildKey(query: string, dateRange?: DateRange): string {
  return dateRange ? `${query}|${dateRange.from}|${dateRange.to}` : query;
}

export async function getCachedReport(query: string, dateRange?: DateRange): Promise<ConsensusReport | null> {
  const key = hashQuery(buildKey(query, dateRange));
  const redisKey = `tl:report:${key}`;

  // L1: memory
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > Date.now()) return mem.report;
    memoryCache.delete(key);
  }

  // L2: Redis
  const cached = await redisGet<ConsensusReport>(redisKey);
  if (cached) {
    memoryCache.set(key, { report: cached, expiresAt: Date.now() + MEMORY_TTL_MS });
    return cached;
  }

  // L3: SQLite (local dev fallback)
  try {
    const { prisma } = await import('@/lib/db/prisma');
    const row = await prisma.searchCache.findUnique({ where: { queryHash: key } });
    if (row && new Date(row.expiresAt) > new Date()) {
      const report = JSON.parse(row.report) as ConsensusReport;
      memoryCache.set(key, { report, expiresAt: Date.now() + MEMORY_TTL_MS });
      return report;
    }
  } catch {
    // DB unavailable
  }

  return null;
}

export async function cacheReport(query: string, report: ConsensusReport, dateRange?: DateRange): Promise<void> {
  const key = hashQuery(buildKey(query, dateRange));
  const redisKey = `tl:report:${key}`;
  const normalized = normalizeQuery(query);

  // L1: memory
  memoryCache.set(key, { report, expiresAt: Date.now() + MEMORY_TTL_MS });

  // L2: Redis (primary on Vercel)
  await redisSet(redisKey, report, DB_TTL_SECONDS);

  // L3: SQLite (local dev)
  try {
    const expiresAt = new Date(Date.now() + DB_TTL_SECONDS * 1000);
    const { prisma } = await import('@/lib/db/prisma');
    await prisma.searchCache.upsert({
      where: { queryHash: key },
      update: { report: JSON.stringify(report), expiresAt, normalizedQuery: normalized },
      create: { queryHash: key, normalizedQuery: normalized, report: JSON.stringify(report), expiresAt },
    });
  } catch {
    // DB unavailable — Redis cache is sufficient
  }
}
