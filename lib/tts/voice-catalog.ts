/**
 * Curated ElevenLabs voice catalog seeded into the `voice` table. These IDs
 * are ElevenLabs preset voices; the `tierRequired` controls which plan can
 * use them (Starter → 1 per language, Standard → 3 per language, Pro → all).
 */
export interface VoiceSeed {
  slug: string;
  elevenLabsVoiceId: string;
  name: string;
  description: string;
  languages: string[];
  gender: 'male' | 'female' | 'neutral';
  style?: string;
  accent?: string;
  tierRequired: 'starter' | 'standard' | 'pro';
}

export const VOICE_CATALOG: VoiceSeed[] = [
  // EN
  {
    slug: 'brian',
    elevenLabsVoiceId: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    description: 'Deep American male, default narrator.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'narrative',
    accent: 'american',
    tierRequired: 'starter',
  },
  {
    slug: 'rachel',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Warm, professional female anchor.',
    languages: ['en', 'pt', 'es'],
    gender: 'female',
    style: 'anchor',
    accent: 'american',
    tierRequired: 'starter',
  },
  {
    slug: 'will',
    elevenLabsVoiceId: 'bIHbv24MWmeRgasZH58o',
    name: 'Will',
    description: 'Friendly male, conversational tone.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'conversational',
    accent: 'american',
    tierRequired: 'standard',
  },
  {
    slug: 'sarah',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    description: 'Bright female news reader (English only).',
    // PT/ES dropped on beta-tester feedback: Sarah's multilingual_v2
    // render picks up a strong "R de interior" caipira accent in
    // Portuguese that doesn't suit a news anchor. Rachel handles PT
    // significantly better at the same tier.
    languages: ['en'],
    gender: 'female',
    style: 'reader',
    accent: 'american',
    tierRequired: 'standard',
  },
  {
    slug: 'domi',
    elevenLabsVoiceId: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    description: 'Confident female, news-room energy.',
    languages: ['en', 'pt', 'es'],
    gender: 'female',
    style: 'energetic',
    accent: 'american',
    tierRequired: 'standard',
  },
  {
    slug: 'elli',
    elevenLabsVoiceId: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Young, expressive female.',
    languages: ['en', 'pt', 'es'],
    gender: 'female',
    style: 'expressive',
    accent: 'american',
    tierRequired: 'pro',
  },
  {
    slug: 'charlie',
    elevenLabsVoiceId: 'IKne3meq5aSn9XLyUdCD',
    name: 'Charlie',
    description: 'Casual male, podcast feel.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'casual',
    accent: 'australian',
    tierRequired: 'pro',
  },
  {
    slug: 'sam',
    elevenLabsVoiceId: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'Neutral male, measured pace.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'measured',
    accent: 'american',
    tierRequired: 'pro',
  },
  {
    slug: 'daniel',
    elevenLabsVoiceId: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    description: 'Authoritative male, prime-time newscast.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'authoritative',
    accent: 'british',
    tierRequired: 'pro',
  },
  {
    slug: 'dorothy',
    elevenLabsVoiceId: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    description: 'British female, mature tone.',
    languages: ['en', 'pt', 'es'],
    gender: 'female',
    style: 'mature',
    accent: 'british',
    tierRequired: 'pro',
  },
  {
    slug: 'fish-default',
    elevenLabsVoiceId: 'fish:default',
    name: 'Fish Default',
    description: 'Default neural system voice from Fish Audio.',
    languages: ['en', 'pt', 'es'],
    gender: 'neutral',
    style: 'conversational',
    tierRequired: 'starter',
  },
];

// We default to multilingual_v2 because it preserves the distinct timbre of
// each preset voice (Adam vs Josh vs Sam, etc.) and respects per-emotion
// voice_settings shaping. v3 supports inline [emotion] audio tags but tends
// to homogenize voice character on classic preset IDs that weren't trained
// for v3 — opt in per-deploy via AURA_TTS_MODEL=eleven_v3 when you have
// v3-native voices configured.
export const ELEVEN_LABS_MODEL = process.env.AURA_TTS_MODEL ?? 'eleven_multilingual_v2';
export const ELEVEN_LABS_FAST_MODEL =
  process.env.AURA_TTS_FAST_MODEL ?? 'eleven_flash_v2_5';
export const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
};
