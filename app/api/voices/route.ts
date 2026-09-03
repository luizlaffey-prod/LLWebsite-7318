import { NextResponse } from 'next/server';
import { eq, and, or, isNull, like, notInArray, inArray, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  organization,
  organizationMember,
  station,
  stationAnnouncerProfile,
  voice as voiceTable,
  voicePreference,
} from '@/lib/db/schema';
import {
  EnergyLevelSchema,
  HumorLevelSchema,
  legacyAnnouncerProfile,
} from '@/lib/announcers/profile';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

export const runtime = 'nodejs';

/**
 * Reconciles the DB's voice table against the curated VOICE_CATALOG so the
 * UI always matches the code. Two passes:
 *
 *   1. UPSERT every catalog row by slug — picks up new voices, refreshed
 *      names/descriptions, and corrected internal synthesis identifiers.
 *   2. Disable any global voice rows (ownerUserId IS NULL) whose slug is
 *      no longer in the catalog. Soft-delete (enabled=false) keeps history
 *      and lets us re-enable later by re-adding to the catalog.
 *
 * Provider-managed personal libraries are never imported implicitly. Only
 * AURA's catalog and voices cloned by the signed-in user are surfaced.
 */
async function reconcileCatalog(): Promise<void> {
  for (const seed of VOICE_CATALOG) {
    await db
      .insert(voiceTable)
      .values({
        slug: seed.slug,
        synthesisVoiceId: seed.synthesisVoiceId,
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
          synthesisVoiceId: seed.synthesisVoiceId,
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
  const requestedStationId = url.searchParams.get('stationId');

  const stations = await db
    .select({ id: station.id, name: station.name })
    .from(organizationMember)
    .innerJoin(organization, eq(organization.id, organizationMember.organizationId))
    .innerJoin(station, eq(station.organizationId, organization.id))
    .where(
      and(
        eq(organizationMember.userId, session.user.id),
        inArray(organizationMember.role, ['owner', 'admin']),
      ),
    )
    .orderBy(station.name);
  const activeStation = requestedStationId
    ? stations.find((item) => item.id === requestedStationId)
    : stations[0];
  if (requestedStationId && !activeStation) {
    return NextResponse.json({ error: 'station_not_found' }, { status: 404 });
  }

  try {
    await reconcileCatalog();
  } catch (err) {
    console.warn('[voices] catalog reconcile failed', err);
  }

  const quota = await getQuota(session.user.id);

  // Only the active voice namespace is selectable. Legacy rows stay in the
  // database for generated-audio history and old foreign-key references.
  const baseWhere = and(
    eq(voiceTable.enabled, true),
    like(voiceTable.synthesisVoiceId, 'fish:%'),
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
      synthesisVoiceId: voiceTable.synthesisVoiceId,
      ownerUserId: voiceTable.ownerUserId,
      isCloned: voiceTable.isCloned,
    })
    .from(voiceTable)
    .where(baseWhere);

  // Dedupe by internal synthesis identifier. Priority order:
  //   1. The user's own row (owned by session.user.id) — never let a
  //      global catalog row hide a voice the user explicitly cloned.
  //   2. A row with a populated previewUrl — UI plays nicer when the
  //      preview is cached.
  //   3. Otherwise first-seen wins.
  const bySynthesisId = new Map<string, (typeof allVoices)[number]>();
  for (const v of allVoices) {
    const existing = bySynthesisId.get(v.synthesisVoiceId);
    if (!existing) {
      bySynthesisId.set(v.synthesisVoiceId, v);
      continue;
    }
    const vOwned = v.ownerUserId === session.user.id;
    const existingOwned = existing.ownerUserId === session.user.id;
    if (vOwned && !existingOwned) {
      bySynthesisId.set(v.synthesisVoiceId, v);
      continue;
    }
    if (!vOwned && existingOwned) continue;
    if (!existing.previewUrl && v.previewUrl) {
      bySynthesisId.set(v.synthesisVoiceId, v);
    }
  }
  const deduped = Array.from(bySynthesisId.values());

  const prefs = await db
    .select({
      voiceId: voicePreference.voiceId,
      isDefault: voicePreference.isDefault,
      speed: voicePreference.speed,
    })
    .from(voicePreference)
    .where(eq(voicePreference.userId, session.user.id));

  const defaultPref = prefs.find((p) => p.isDefault);

  const storedProfiles = activeStation && deduped.length
    ? await db
        .select()
        .from(stationAnnouncerProfile)
        .where(
          and(
            eq(stationAnnouncerProfile.stationId, activeStation.id),
            inArray(stationAnnouncerProfile.voiceId, deduped.map((voice) => voice.id)),
          ),
        )
    : [];
  const profilesByVoice = new Map(storedProfiles.map((profile) => [profile.voiceId, profile]));

  const filteredByLang = lang
    ? deduped.filter((v) => v.languages.includes(lang))
    : deduped;

  const enriched = filteredByLang
    .map((voice) => {
      const { synthesisVoiceId, ...v } = voice;
      void synthesisVoiceId;
      return {
        ...v,
        locked: !canUseVoice(quota.tier, v),
        preferred: prefs.some((p) => p.voiceId === v.id),
        isDefault: defaultPref?.voiceId === v.id,
        isMine: v.ownerUserId === session.user.id,
        announcerProfile: (() => {
          if (!activeStation) return null;
          const stored = profilesByVoice.get(v.id);
          if (!stored) {
            return legacyAnnouncerProfile(v.description, activeStation.id, v.id);
          }
          const humor = HumorLevelSchema.safeParse(stored.humorLevel);
          const energy = EnergyLevelSchema.safeParse(stored.energyLevel);
          return {
            stationId: activeStation.id,
            voiceId: v.id,
            personality: stored.personality,
            deliveryStyle: stored.deliveryStyle,
            exampleScripts: stored.exampleScripts,
            signatures: stored.signatures,
            editorialPreferences: stored.editorialPreferences,
            avoidances: stored.avoidances,
            pronunciationGuide: stored.pronunciationGuide,
            humorLevel: humor.success ? humor.data : 'balanced',
            energyLevel: energy.success ? energy.data : 'balanced',
            reactionsEnabled: stored.reactionsEnabled,
          };
        })(),
      };
    })
    .filter((v) => includeLocked || !v.locked)
    // Pin the user's own (cloned) voices to the top so they don't get
    // lost in an alphabetic mix with the catalog. Tie-break by name.
    .sort((a, b) => {
      if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({
    voices: enriched,
    tier: quota.tier,
    activeStationId: activeStation?.id ?? null,
    stations,
    defaultVoiceId: defaultPref?.voiceId ?? null,
    defaultSpeed: defaultPref?.speed ?? 1.0,
  });
}
