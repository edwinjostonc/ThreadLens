import { NextResponse } from 'next/server';
import { redisTrendingTop } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trending = await redisTrendingTop(8);
  return NextResponse.json({ trending });
}
