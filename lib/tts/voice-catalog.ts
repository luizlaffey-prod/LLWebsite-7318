/**
 * Curated voice catalog owned by AURA.
 *
 * Provider-specific identifiers remain internal and are stored in the legacy
 * `eleven_labs_voice_id` column for database compatibility. New and active
 * entries must use the `fish:` namespace. Retired provider rows are disabled
 * by catalog reconciliation and kept only to preserve historical references.
 */
export interface VoiceSeed {
  slug: string;
  synthesisVoiceId: string;
  name: string;
  description: string;
  languages: string[];
  gender: 'male' | 'female' | 'neutral';
  style?: string;
  accent?: string;
  tierRequired: 'starter' | 'standard' | 'pro';
}

export const VOICE_CATALOG: VoiceSeed[] = [
  {
    slug: 'fish-default',
    synthesisVoiceId: 'fish:default',
    name: 'AURA Default',
    description: 'Default multilingual system voice.',
    languages: ['en', 'pt', 'es'],
    gender: 'neutral',
    style: 'conversational',
    tierRequired: 'starter',
  },
];
