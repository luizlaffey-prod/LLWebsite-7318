import { NextResponse } from 'next/server';
import { eq, and, or, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
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
  const includeLocked = url.searchParams.get('includeLocked') === '1';

  const quota = await getQuota(session.user.id);

  const allVoices = await db
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

  const prefs = await db
    .select({ voiceId: voicePreference.voiceId, isDefault: voicePreference.isDefault, speed: voicePreference.speed })
    .from(voicePreference)
    .where(eq(voicePreference.userId, session.user.id));

  const defaultPref = prefs.find((p) => p.isDefault);

  const filteredByLang = lang
    ? allVoices.filter((v) => v.languages.includes(lang))
    : allVoices;

  const enriched = filteredByLang
    .map((v) => ({
      ...v,
      locked: !canUseVoice(quota.tier, v),
      preferred: prefs.some((p) => p.voiceId === v.id),
      isDefault: defaultPref?.voiceId === v.id,
    }))
    .filter((v) => includeLocked || !v.locked);

  return NextResponse.json({
    voices: enriched,
    tier: quota.tier,
    defaultVoiceId: defaultPref?.voiceId ?? null,
    defaultSpeed: defaultPref?.speed ?? 1.0,
  });
}
