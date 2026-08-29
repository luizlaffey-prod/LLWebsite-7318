import { NextResponse } from 'next/server';
import { eq, and, or, isNull, not, like, notInArray, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

export const runtime = 'nodejs';

/**
 * Reconciles the DB's voice table against the curated VOICE_CATALOG so the
 * UI always matches the code. Two passes:
 *
 *   1. UPSERT every catalog row by slug — picks up new voices, refreshed
 *      names/descriptions, and corrected elevenLabsVoiceIds.
 *   2. Disable any global voice rows (ownerUserId IS NULL) whose slug is
 *      no longer in the catalog. Soft-delete (enabled=false) keeps history
 *      and lets us re-enable later by re-adding to the catalog.
 *
 * We deliberately do NOT sync the configured ElevenLabs account's personal
 * library here — "Minhas Vozes" surfaces the public preset catalog, not the
 * deployment owner's private voice collection.
 */
async function reconcileCatalog(): Promise<void> {
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
      .onConflictDoUpdate({
        target: voiceTable.slug,
        set: {
          elevenLabsVoiceId: seed.elevenLabsVoiceId,
          languages: seed.languages,
          gender: seed.gender,
          tierRequired: seed.tierRequired,
          enabled: true,
          name: sql`COALESCE(${voiceTable.name}, excluded.name)`,
          description: sql`COALESCE(${voiceTable.description}, excluded.description)`,
          style: sql`COALESCE(${voiceTable.style}, excluded.style)`,
          accent: sql`COALESCE(${voiceTable.accent}, excluded.accent)`,
        },
      });
  }

  // Retire any global rows that are no longer in the catalog. We only
  // touch ownerUserId IS NULL rows so we never disable a user's cloned
  // voice.
  const catalogSlugs = VOICE_CATALOG.map((v) => v.slug);
  await db
    .update(voiceTable)
    .set({ enabled: false })
    .where(
      and(
        isNull(voiceTable.ownerUserId),
        notInArray(voiceTable.slug, catalogSlugs)
      )
    );
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
    await reconcileCatalog();
  } catch (err) {
    console.warn('[voices] catalog reconcile failed', err);
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
      ownerUserId: voiceTable.ownerUserId,
      isCloned: voiceTable.isCloned,
    })
    .from(voiceTable)
    .where(baseWhere);

  // Dedupe by elevenLabsVoiceId. Priority order:
  //   1. The user's own row (owned by session.user.id) — never let a
  //      global catalog row hide a voice the user explicitly cloned.
  //   2. A row with a populated previewUrl — UI plays nicer when the
  //      preview is cached.
  //   3. Otherwise first-seen wins.
  const byElevenId = new Map<string, (typeof allVoices)[number]>();
  for (const v of allVoices) {
    const existing = byElevenId.get(v.elevenLabsVoiceId);
    if (!existing) {
      byElevenId.set(v.elevenLabsVoiceId, v);
      continue;
    }
    const vOwned = v.ownerUserId === session.user.id;
    const existingOwned = existing.ownerUserId === session.user.id;
    if (vOwned && !existingOwned) {
      byElevenId.set(v.elevenLabsVoiceId, v);
      continue;
    }
    if (!vOwned && existingOwned) continue;
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
      isMine: v.ownerUserId === session.user.id,
    }))
    .filter((v) => includeLocked || !v.locked)
    // Pin the user's own (cloned) voices to the top so they don't get
    // lost in an alphabetic mix with the catalog. Tie-break by name.
    .sort((a, b) => {
      if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const fishKey = process.env.FISHAUDIO_API_KEY || process.env.FISH_API_KEY;
  const activeProvider = process.env.AURA_ACTIVE_TTS_PROVIDER ?? (fishKey ? 'fishaudio' : 'elevenlabs');

  return NextResponse.json({
    voices: enriched,
    tier: quota.tier,
    activeProvider,
    defaultVoiceId: defaultPref?.voiceId ?? null,
    defaultSpeed: defaultPref?.speed ?? 1.0,
  });
}
