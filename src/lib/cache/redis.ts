import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Redis unavailable — fail silently
  }
}

export async function redisIncr(key: string, ttlSeconds: number): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds);
    return count;
  } catch {
    return 0;
  }
}

export async function redisTrendingIncr(query: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.zincrby('tl:trending', 1, query.toLowerCase().trim());
  } catch {}
}

export async function redisTrendingTop(limit = 8): Promise<string[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    const results = await redis.zrange('tl:trending', 0, limit - 1, { rev: true });
    return results as string[];
  } catch {
    return [];
  }
}
