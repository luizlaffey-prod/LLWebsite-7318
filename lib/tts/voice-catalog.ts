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
    slug: 'adam',
    elevenLabsVoiceId: 'pNInz6obbfDQGcgMyIGD',
    name: 'Adam',
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
    slug: 'antoni',
    elevenLabsVoiceId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
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
    description: 'Bright female news reader.',
    languages: ['en', 'pt', 'es'],
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
    slug: 'josh',
    elevenLabsVoiceId: 'tx3xeil23wQz6dD1rZk1',
    name: 'Josh',
    description: 'Casual male, podcast feel.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'casual',
    accent: 'american',
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
    slug: 'arnold',
    elevenLabsVoiceId: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'Authoritative male, prime-time newscast.',
    languages: ['en', 'pt', 'es'],
    gender: 'male',
    style: 'authoritative',
    accent: 'american',
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
];

export const ELEVEN_LABS_MODEL = 'eleven_multilingual_v2';
export const ELEVEN_LABS_FAST_MODEL = 'eleven_flash_v2_5';
export const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
};
