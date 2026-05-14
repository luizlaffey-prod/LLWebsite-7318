import { NextResponse } from 'next/server';
import { eq, and, or, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const lang = url.searchParams.get('lang');

  const quota = await getQuota(session.user.id);

  const voices = await db
    .select({
      id: voiceTable.id,
      slug: voiceTable.slug,
      name: voiceTable.name,
      description: voiceTable.description,
      languages: voiceTable.languages,
      gender: voiceTable.gender,
      style: voiceTable.style,
      accent: voiceTable.accent,
      tierRequired: voiceTable.tierRequired,
      previewUrl: voiceTable.previewUrl,
    })
    .from(voiceTable)
    .where(
      and(
        eq(voiceTable.enabled, true),
        or(eq(voiceTable.ownerUserId, session.user.id), isNull(voiceTable.ownerUserId))
      )
    );

  const filtered = (lang ? voices.filter((v) => v.languages.includes(lang)) : voices).filter(
    (v) => canUseVoice(quota.tier, v)
  );
  return NextResponse.json({ voices: filtered, tier: quota.tier });
}
