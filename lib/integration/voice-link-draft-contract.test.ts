import { describe, expect, it } from 'vitest';
import {
  buildVoiceLinkDraftEnvelope,
  estimateVoiceLinkDurationSeconds,
} from './voice-link-draft-contract';

describe('StudioPro voice-link draft contract', () => {
  it('returns the structured camelCase envelope expected by the desktop client', () => {
    expect(buildVoiceLinkDraftEnvelope('One two three four five.')).toEqual({
      draft: {
        scriptText: 'One two three four five.',
        estimatedDurationSeconds: 3,
        verifiedFact: null,
        verifiedFactIncluded: false,
        usedFactText: null,
      },
    });
  });

  it('reports an included verified fact without changing its sources', () => {
    const verifiedFact = {
      text: 'The session was recorded in New York.',
      sources: [{ title: 'Session notes', url: 'https://example.com/session' }],
    };

    expect(buildVoiceLinkDraftEnvelope(
      `Welcome back. ${verifiedFact.text} Here is the next song.`,
      verifiedFact,
    ).draft).toMatchObject({
      verifiedFact,
      verifiedFactIncluded: true,
      usedFactText: verifiedFact.text,
    });
  });

  it('keeps the duration estimate aligned with StudioPro', () => {
    expect(estimateVoiceLinkDurationSeconds('')).toBe(0);
    expect(estimateVoiceLinkDurationSeconds('uma frase com cinco palavras')).toBe(3);
  });
});
