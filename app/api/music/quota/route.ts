import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { getMusicQuota, MUSIC_TRACK_OVERAGE_CENTS } from '@/lib/billing/music-quota';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const quota = await getMusicQuota(session.user.id);
  return NextResponse.json({
    tier: quota.tier,
    used: quota.used,
    limit: quota.limit,
    remaining: quota.remaining,
    overagePriceCents: MUSIC_TRACK_OVERAGE_CENTS,
  });
}
