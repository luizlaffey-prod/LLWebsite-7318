import { describe, expect, it } from 'vitest';
import { getTrustedOrigins } from './trusted-origins';

describe('getTrustedOrigins', () => {
  it('trusts the stable Vercel branch URL and deployment URL', () => {
    expect(
      getTrustedOrigins({
        BETTER_AUTH_URL: 'https://www.aurapress.app',
        VERCEL_BRANCH_URL:
          'aura-git-codex-aura-ai-voice-link-aura-audio.vercel.app',
        VERCEL_URL: 'aura-kaj904ude-aura-audio.vercel.app',
      }),
    ).toEqual([
      'https://www.aurapress.app',
      'https://aura-kaj904ude-aura-audio.vercel.app',
      'https://aura-git-codex-aura-ai-voice-link-aura-audio.vercel.app',
    ]);
  });

  it('normalizes, deduplicates, and ignores invalid values', () => {
    expect(
      getTrustedOrigins({
        BETTER_AUTH_URL: 'https://www.aurapress.app/',
        NEXT_PUBLIC_APP_URL: 'https://www.aurapress.app/path',
        VERCEL_BRANCH_URL: 'not a valid host',
      }),
    ).toEqual(['https://www.aurapress.app']);
  });
});
