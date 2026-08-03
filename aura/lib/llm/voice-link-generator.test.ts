import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = vi.hoisted(() => ({
  complete: vi.fn(),
}));

vi.mock('./provider', () => ({
  resolveProvider: () => provider,
}));

import {
  estimateVoiceLinkDurationSeconds,
  generateVoiceLinkDraft,
} from './voice-link-generator';

const input = {
  mode: 'between_songs' as const,
  currentTrack: { title: 'Luz do Mar', artist: 'Aurora Urbana' },
  nextTracks: [{ title: 'Céu em Movimento', artist: 'Ecos do Sul' }],
  language: 'pt' as const,
  tone: 'natural' as const,
  maxDurationSeconds: 8,
};

describe('voice link generator', () => {
  beforeEach(() => {
    provider.complete.mockReset();
  });

  it('estimates spoken duration from word count', () => {
    expect(estimateVoiceLinkDurationSeconds('uma frase com cinco palavras')).toBe(3);
  });

  it('returns a draft that fits the requested duration', async () => {
    provider.complete.mockResolvedValueOnce(
      '{"texto":"Você ouviu Aurora Urbana. Agora vem Ecos do Sul."}',
    );

    const result = await generateVoiceLinkDraft(input);

    expect(result.scriptText).toContain('Aurora Urbana');
    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(8);
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 512,
        thinkingBudget: 128,
      }),
    );
  });

  it('asks for one shorter revision when the first draft is too long', async () => {
    provider.complete
      .mockResolvedValueOnce(
        `{"texto":"${Array.from({ length: 30 }, () => 'palavra').join(' ')}"}`,
      )
      .mockResolvedValueOnce('{"texto":"Aurora Urbana, e agora Ecos do Sul."}');

    const result = await generateVoiceLinkDraft({
      ...input,
      maxDurationSeconds: 5,
    });

    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(5);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('fails closed when both drafts exceed the limit', async () => {
    const oversized = `{"texto":"${Array.from(
      { length: 30 },
      () => 'palavra',
    ).join(' ')}"}`;
    provider.complete.mockResolvedValue(oversized);

    await expect(
      generateVoiceLinkDraft({ ...input, maxDurationSeconds: 5 }),
    ).rejects.toThrow('voice_link_draft_too_long');
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });
});
