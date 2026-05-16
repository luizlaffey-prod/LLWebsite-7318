import { NextResponse } from 'next/server';
import { eq, and, or, isNull, sql, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

export const runtime = 'nodejs';

interface ElevenLabsLibraryVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: Record<string, string>;
  description?: string;
  category?: string;
}

/**
 * Pulls the deployment's ElevenLabs voice library (the voices that actually
 * exist in the configured account) and mirrors each entry into the `voice`
 * table. This replaces the old static catalog as the source of truth: voices
 * that aren't in the live library can't show up here, so we never display
 * dead IDs and never get duplicates from stale seeds.
 *
 * Returns the set of elevenLabsVoiceIds that are currently in the library.
 * Empty array means "no key configured or fetch failed" — caller falls back
 * to the static seeded catalog.
 */
async function syncElevenLabsLibrary(): Promise<Set<string>> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Set();

  let library: ElevenLabsLibraryVoice[];
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[voices] ElevenLabs /v1/voices fetch failed', res.status);
      return new Set();
    }
    const data = (await res.json()) as { voices?: ElevenLabsLibraryVoice[] };
    library = data.voices ?? [];
  } catch (err) {
    console.warn('[voices] ElevenLabs library fetch threw', err);
    return new Set();
  }

  const liveIds = new Set<string>();
  for (const v of library) {
    if (!v.voice_id || !v.name) continue;
    const slug = `el-${v.voice_id.slice(0, 12).toLowerCase()}`;
    const labels = v.labels ?? {};
    const rawGender = (labels.gender ?? '').toLowerCase();
    const gender: 'male' | 'female' | 'neutral' =
      rawGender === 'male' ? 'male' : rawGender === 'female' ? 'female' : 'neutral';
    const accent = labels.accent ?? undefined;
    const description =
      v.description?.trim() ||
      labels.description?.trim() ||
      labels['use case']?.trim() ||
      labels['use_case']?.trim() ||
      [labels.age, labels.gender, labels.accent].filter(Boolean).join(' · ') ||
      'ElevenLabs voice.';

    try {
      await db
        .insert(voiceTable)
        .values({
          slug,
          elevenLabsVoiceId: v.voice_id,
          name: v.name,
          description,
          // multilingual_v2 covers all three; per-language gating happens
          // in the script generator, not here.
          languages: ['en', 'pt', 'es'],
          gender,
          accent,
          tierRequired: 'starter',
          enabled: true,
          previewUrl: v.preview_url ?? null,
          isCloned: v.category === 'cloned',
        })
        .onConflictDoUpdate({
          target: voiceTable.slug,
          set: {
            elevenLabsVoiceId: v.voice_id,
            name: v.name,
            description,
            gender,
            accent,
            previewUrl: v.preview_url ?? null,
            enabled: true,
          },
        });
      liveIds.add(v.voice_id);
    } catch (err) {
      console.warn('[voices] upsert failed for', v.voice_id, err);
    }
  }

  return liveIds;
}

/**
 * Static-catalog fallback: only runs when no ElevenLabs key is configured.
 * Idempotent: only seeds when the voice table is empty.
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

  // Prefer live sync; fall back to the seeded catalog only when ElevenLabs
  // is not configured or unreachable.
  let liveIds: Set<string>;
  try {
    liveIds = await syncElevenLabsLibrary();
  } catch (err) {
    console.warn('[voices] library sync failed', err);
    liveIds = new Set();
  }
  if (liveIds.size === 0) {
    try {
      await bootstrapStaticCatalogIfEmpty();
    } catch (err) {
      console.warn('[voices] bootstrap failed', err);
    }
  }

  const quota = await getQuota(session.user.id);

  const baseWhere = and(
    eq(voiceTable.enabled, true),
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
    .where(
      liveIds.size > 0
        ? and(baseWhere, inArray(voiceTable.elevenLabsVoiceId, Array.from(liveIds)))
        : baseWhere
    );

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
