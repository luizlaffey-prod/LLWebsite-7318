import { NextResponse } from 'next/server';
import { eq, and, or, isNull, sql, not, like } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

export const runtime = 'nodejs';

/**
 * Bootstraps the curated ElevenLabs preset catalog (Adam, Rachel, Antoni,
 * Sarah, Domi, Elli, Josh, Sam, Arnold, Dorothy) on first read. Idempotent:
 * only runs when the voice table is empty.
 *
 * We deliberately do NOT sync the configured ElevenLabs account's personal
 * library here — "Minhas Vozes" surfaces the public preset catalog, not the
 * deployment owner's private voice collection.
 */
async function bootstrapStaticCatalogIfEmpty(): Promise<void> {
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
    await bootstrapStaticCatalogIfEmpty();
  } catch (err) {
    console.warn('[voices] bootstrap failed', err);
  }

  const quota = await getQuota(session.user.id);

  // Exclude `el-*` rows left over from the brief library-sync experiment —
  // those are the deployment account's private ElevenLabs voices, not part
  // of the curated preset catalog this page is meant to surface.
  const baseWhere = and(
    eq(voiceTable.enabled, true),
    not(like(voiceTable.slug, 'el-%')),
    or(eq(voiceTable.ownerUserId, session.user.id), isNull(voiceTable.ownerUserId))
  );

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
      elevenLabsVoiceId: voiceTable.elevenLabsVoiceId,
    })
    .from(voiceTable)
    .where(baseWhere);

  // Defense in depth: even though slug is unique, dedupe by
  // elevenLabsVoiceId in case historical rows duplicated an ID under
  // different slugs. Keep the row with a previewUrl when available.
  const byElevenId = new Map<string, (typeof allVoices)[number]>();
  for (const v of allVoices) {
    const existing = byElevenId.get(v.elevenLabsVoiceId);
    if (!existing) {
      byElevenId.set(v.elevenLabsVoiceId, v);
      continue;
    }
    if (!existing.previewUrl && v.previewUrl) {
      byElevenId.set(v.elevenLabsVoiceId, v);
    }
  }
  const deduped = Array.from(byElevenId.values());

  const prefs = await db
    .select({
      voiceId: voicePreference.voiceId,
      isDefault: voicePreference.isDefault,
      speed: voicePreference.speed,
    })
    .from(voicePreference)
    .where(eq(voicePreference.userId, session.user.id));

  const defaultPref = prefs.find((p) => p.isDefault);

  const filteredByLang = lang
    ? deduped.filter((v) => v.languages.includes(lang))
    : deduped;

  const enriched = filteredByLang
    .map((v) => ({
      ...v,
      locked: !canUseVoice(quota.tier, v),
      preferred: prefs.some((p) => p.voiceId === v.id),
      isDefault: defaultPref?.voiceId === v.id,
    }))
    .filter((v) => includeLocked || !v.locked)
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    voices: enriched,
    tier: quota.tier,
    defaultVoiceId: defaultPref?.voiceId ?? null,
    defaultSpeed: defaultPref?.speed ?? 1.0,
  });
}
