import { NextResponse } from 'next/server';
import { redisTrendingTop, redisIncr } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const count = await redisIncr(`tl:rl:trending:${ip}`, 60);
  if (count > 30) {
    return NextResponse.json({ trending: [] }, { status: 429 });
  }

  const trending = await redisTrendingTop(8);
  return NextResponse.json({ trending });
}
