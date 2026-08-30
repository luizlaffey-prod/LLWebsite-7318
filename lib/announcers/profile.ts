import { z } from 'zod';

export const HumorLevelSchema = z.enum(['subtle', 'balanced', 'free']);
export const EnergyLevelSchema = z.enum(['calm', 'balanced', 'high']);

export const AnnouncerProfileInputSchema = z.object({
  stationId: z.string().uuid(),
  personality: z.string().trim().max(3_000).default(''),
  deliveryStyle: z.string().trim().max(2_500).default(''),
  exampleScripts: z.string().trim().max(8_000).default(''),
  signatures: z.string().trim().max(1_500).default(''),
  editorialPreferences: z.string().trim().max(2_500).default(''),
  avoidances: z.string().trim().max(2_500).default(''),
  pronunciationGuide: z.string().trim().max(2_500).default(''),
  humorLevel: HumorLevelSchema.default('balanced'),
  energyLevel: EnergyLevelSchema.default('balanced'),
  reactionsEnabled: z.boolean().default(true),
});

export type AnnouncerProfileInput = z.infer<typeof AnnouncerProfileInputSchema>;

export interface AnnouncerEditorialProfile extends AnnouncerProfileInput {
  voiceId: string;
  /** Catalog identity derived by AURA. It is never supplied by StudioPro. */
  announcerName?: string;
}

interface LegacyStructuredPersonality {
  essencia?: unknown;
  presencaEntrega?: unknown;
  assinaturasSlogans?: unknown;
  interessesEditoriais?: unknown;
  oQueEvitar?: unknown;
  humorLevel?: unknown;
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Reads the five-pillar JSON used by the previous My Voices modal. This keeps
 * existing profiles useful until the user saves them in the station-scoped
 * table. Plain catalog descriptions are intentionally not treated as a
 * station personality.
 */
export function legacyAnnouncerProfile(
  description: string | null | undefined,
  stationId: string,
  voiceId: string,
  announcerName?: string,
): AnnouncerEditorialProfile | null {
  if (!description?.trim().startsWith('{')) return null;
  try {
    const legacy = JSON.parse(description) as LegacyStructuredPersonality;
    const humor = HumorLevelSchema.safeParse(legacy.humorLevel);
    const profile: AnnouncerEditorialProfile = {
      stationId,
      voiceId,
      announcerName,
      personality: optionalString(legacy.essencia),
      deliveryStyle: optionalString(legacy.presencaEntrega),
      exampleScripts: '',
      signatures: optionalString(legacy.assinaturasSlogans),
      editorialPreferences: optionalString(legacy.interessesEditoriais),
      avoidances: optionalString(legacy.oQueEvitar),
      pronunciationGuide: '',
      humorLevel: humor.success ? humor.data : 'balanced',
      energyLevel: 'balanced',
      reactionsEnabled: true,
    };
    return hasAnnouncerPersonality(profile) ? profile : null;
  } catch {
    return null;
  }
}

export function hasAnnouncerPersonality(
  profile: AnnouncerEditorialProfile | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.personality
      || profile.deliveryStyle
      || profile.exampleScripts
      || profile.signatures
      || profile.editorialPreferences
      || profile.avoidances
      || profile.pronunciationGuide,
  );
}

function humorInstruction(level: AnnouncerEditorialProfile['humorLevel']): string {
  if (level === 'free') {
    return 'Humor is free and spontaneous when it fits the moment, while still respecting every avoidance and the factual rules.';
  }
  if (level === 'subtle') {
    return 'Humor must stay subtle and occasional; never force a joke or turn the link into a comedy bit.';
  }
  return 'Humor is balanced and controlled: light personality is welcome, but clarity and musical context come first.';
}

export function announcerProfilePrompt(
  profile: AnnouncerEditorialProfile | null | undefined,
): string {
  if (!profile) {
    return 'No station-specific announcer profile is configured. Use the requested generic tone.';
  }
  return [
    'The station-specific announcer profile below is authoritative. Incorporate it throughout the link instead of falling back to generic radio copy.',
    profile.announcerName
      ? `On-air identity: the announcer is ${JSON.stringify(profile.announcerName)}. This name is a stable identity anchor, not a disposable catchphrase.`
      : '',
    profile.personality ? `Personality and essence: ${JSON.stringify(profile.personality)}.` : '',
    profile.deliveryStyle ? `Presence and delivery: ${JSON.stringify(profile.deliveryStyle)}.` : '',
    humorInstruction(profile.humorLevel),
    `Energy: ${profile.energyLevel}.`,
    profile.reactionsEnabled
      ? 'Expressive vocal reactions are allowed when they genuinely fit; do not force them.'
      : 'Do not use performance tags or non-verbal reactions.',
    profile.signatures
      ? `Authorized signatures, catchphrases, and station slogans: ${JSON.stringify(profile.signatures)}. Treat them as a rotating repertoire: use a fresh fitting choice often enough to establish identity, but never mechanically force the same one into consecutive links. The announcer name and station name may repeat naturally; only catchphrases, slogans, openings, and sign-offs are subject to repertoire rotation.`
      : '',
    profile.editorialPreferences
      ? `Editorial interests and preferred angles: ${JSON.stringify(profile.editorialPreferences)}.`
      : '',
    profile.avoidances ? `Strictly avoid: ${JSON.stringify(profile.avoidances)}.` : '',
    profile.pronunciationGuide
      ? `Pronunciation guide: ${JSON.stringify(profile.pronunciationGuide)}.`
      : '',
    profile.exampleScripts
      ? `Style examples: imitate their voice, rhythm, and attitude, but never copy their factual claims: ${JSON.stringify(profile.exampleScripts)}.`
      : '',
  ].filter(Boolean).join('\n');
}
