import type { ConsensusReport } from '@/types';
import { hashQuery, normalizeQuery } from '@/lib/utils';

// Hot in-memory cache: fast, resets on restart
const memoryCache = new Map<string, { report: ConsensusReport; expiresAt: number }>();
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DB_TTL_HOURS = 24;

export async function getCachedReport(query: string): Promise<ConsensusReport | null> {
  const key = hashQuery(query);

  // Check memory first — evict on access so we don't need a setInterval
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > Date.now()) return mem.report;
    memoryCache.delete(key);
  }

  // Check database
  try {
    const { prisma } = await import('@/lib/db/prisma');
    const row = await prisma.searchCache.findUnique({ where: { queryHash: key } });
    if (row && new Date(row.expiresAt) > new Date()) {
      const report = JSON.parse(row.report) as ConsensusReport;
      // Warm memory cache
      memoryCache.set(key, { report, expiresAt: Date.now() + MEMORY_TTL_MS });
      return report;
    }
  } catch {
    // DB unavailable — continue without cache
  }

  return null;
}

export async function cacheReport(query: string, report: ConsensusReport): Promise<void> {
  const key = hashQuery(query);
  const normalized = normalizeQuery(query);
  const expiresAt = new Date(Date.now() + DB_TTL_HOURS * 60 * 60 * 1000);

  // Always update memory
  memoryCache.set(key, { report, expiresAt: Date.now() + MEMORY_TTL_MS });

  // Try database
  try {
    const { prisma } = await import('@/lib/db/prisma');
    await prisma.searchCache.upsert({
      where: { queryHash: key },
      update: { report: JSON.stringify(report), expiresAt, normalizedQuery: normalized },
      create: {
        queryHash: key,
        normalizedQuery: normalized,
        report: JSON.stringify(report),
        expiresAt,
      },
    });
  } catch {
    // DB unavailable — memory cache only is fine
  }
}

