import { NextResponse } from 'next/server';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

export const runtime = 'nodejs';

/**
 * Bootstraps the voice catalog on first read. Idempotent: only runs when the
 * voice table is empty (count = 0). Avoids the operator having to hit the
 * /api/admin/seed-voices endpoint manually on a fresh database.
 */
async function bootstrapVoiceCatalogIfEmpty(): Promise<void> {
  const rows = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM voice`
  );
  const count = Number(rows.rows?.[0]?.count ?? 0);
  if (count > 0) return;

  console.log(`[voices] table is empty — seeding ${VOICE_CATALOG.length} voices`);
  for (const seed of VOICE_CATALOG) {
    await db
      .insert(voiceTable)
      .values({
        slug: seed.slug,
        elevenLabsVoiceId: seed.elevenLabsVoiceId,
        name: seed.name,
        description: seed.description,
        languages: seed.languages,
        gender: seed.gender,
        style: seed.style,
        accent: seed.accent,
        tierRequired: seed.tierRequired,
        enabled: true,
      })
      .onConflictDoNothing({ target: voiceTable.slug });
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const lang = url.searchParams.get('lang');
  const includeLocked = url.searchParams.get('includeLocked') === '1';

  try {
    await bootstrapVoiceCatalogIfEmpty();
  } catch (err) {
    console.warn('[voices] bootstrap failed', err);
  }

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
