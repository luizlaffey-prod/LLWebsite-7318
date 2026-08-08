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
  factMode: 'off' as const,
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

  it('retries when an explicitly requested slogan is missing', async () => {
    provider.complete
      .mockResolvedValueOnce(
        '{"texto":"Você ouviu Aurora Urbana. Agora vem Ecos do Sul."}',
      )
      .mockResolvedValueOnce(
        '{"texto":"Você ouviu Aurora Urbana. Radio Collection, the best on the web. Agora vem Ecos do Sul."}',
      );

    const result = await generateVoiceLinkDraft({
      ...input,
      maxDurationSeconds: 15,
      customInstruction:
        'Use exatamente o slogan: “Radio Collection, the best on the web”.',
    });

    expect(result.scriptText).toContain(
      'Radio Collection, the best on the web',
    );
    expect(provider.complete).toHaveBeenCalledTimes(2);
    expect(provider.complete.mock.calls[1]?.[0].userPrompt).toContain(
      'Radio Collection, the best on the web',
    );
  });

  it('uses a compact fallback when a required slogan is omitted twice', async () => {
    provider.complete.mockResolvedValue(
      '{"texto":"Você ouviu Aurora Urbana. Agora vem Ecos do Sul."}',
    );

    const result = await generateVoiceLinkDraft({
      ...input,
      maxDurationSeconds: 15,
      customInstruction:
        'Use exatamente o slogan: "Radio Collection, the best on the web".',
    });

    expect(result.scriptText).toContain(
      'Radio Collection, the best on the web',
    );
    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(15);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('uses a compact fallback when both model drafts exceed the limit', async () => {
    const oversized = `{"texto":"${Array.from(
      { length: 36 },
      () => 'word',
    ).join(' ')}"}`;
    provider.complete.mockResolvedValue(oversized);

    const result = await generateVoiceLinkDraft({
      mode: 'between_songs',
      currentTrack: { title: 'SD Boom', artist: 'Teste' },
      nextTracks: [{ title: 'Waiting', artist: 'Teste' }],
      language: 'en',
      tone: 'energetic',
      maxDurationSeconds: 15,
      factMode: 'off',
      customInstruction:
        'Use exactly the slogan: "Radio Collection, the best on the web".',
    });

    expect(result.scriptText).toBe(
      'SD Boom by Teste. Radio Collection, the best on the web. Next, Waiting by Teste.',
    );
    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(15);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('announces only the title when the artist is missing', async () => {
    const oversized = `{"texto":"${Array.from(
      { length: 36 },
      () => 'word',
    ).join(' ')}"}`;
    provider.complete.mockResolvedValue(oversized);

    const result = await generateVoiceLinkDraft({
      mode: 'between_songs',
      currentTrack: { title: 'Nothing Is Gonna Change My Love for You' },
      nextTracks: [{ title: 'Slave to Love', artist: 'Bryan Ferry' }],
      language: 'en',
      tone: 'warm',
      maxDurationSeconds: 10,
      factMode: 'off',
    });

    expect(result.scriptText).toBe(
      'Nothing Is Gonna Change My Love for You. Next, Slave to Love by Bryan Ferry.',
    );
    expect(result.scriptText).not.toMatch(/unknown|missing|not provided/iu);
    expect(provider.complete.mock.calls[0]?.[0].systemPrompt).toContain(
      'mention only that song title',
    );
  });

  it('fits long track titles and an unquoted labeled slogan into ten seconds', async () => {
    const oversized = `{"texto":"${Array.from(
      { length: 30 },
      () => 'word',
    ).join(' ')}"}`;
    provider.complete.mockResolvedValue(oversized);

    const result = await generateVoiceLinkDraft({
      mode: 'between_songs',
      currentTrack: {
        title: 'What Goes Around Comes Around Interlude',
        artist: 'Teste',
      },
      nextTracks: [
        {
          title: 'How do you get water in stranded deep',
          artist: 'Teste',
        },
      ],
      language: 'en',
      tone: 'energetic',
      maxDurationSeconds: 10,
      factMode: 'off',
      customInstruction: 'Slogan: Radio Collection, the best on the web',
    });

    expect(result.scriptText).toContain(
      'Radio Collection, the best on the web',
    );
    expect(result.scriptText).toContain(
      'How do you get water in stranded deep',
    );
    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(10);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('fails closed when the compact fallback also exceeds the limit', async () => {
    const oversized = `{"texto":"${Array.from(
      { length: 30 },
      () => 'palavra',
    ).join(' ')}"}`;
    provider.complete.mockResolvedValue(oversized);

    await expect(
      generateVoiceLinkDraft({
        ...input,
        currentTrack: {
          title: Array.from({ length: 20 }, () => 'música').join(' '),
          artist: Array.from({ length: 10 }, () => 'artista').join(' '),
        },
        nextTracks: [
          {
            title: Array.from({ length: 20 }, () => 'próxima').join(' '),
            artist: Array.from({ length: 10 }, () => 'cantor').join(' '),
          },
        ],
        maxDurationSeconds: 4,
      }),
    ).rejects.toThrow('voice_link_draft_too_long');
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('starts with the required slogan and includes only the supplied verified fact', async () => {
    const fact = {
      text: 'The song was written for the 1985 film Vision Quest.',
      sources: [{
        title: 'Official soundtrack notes',
        url: 'https://example.com/source',
      }],
    };
    provider.complete.mockResolvedValueOnce(
      '{"texto":"Radio Collection, the best on the web. Crazy for You by Madonna. The song was written for the 1985 film Vision Quest. Next, Slave to Love by Bryan Ferry."}',
    );

    const result = await generateVoiceLinkDraft({
      mode: 'between_songs',
      currentTrack: { title: 'Crazy for You', artist: 'Madonna' },
      nextTracks: [{ title: 'Slave to Love', artist: 'Bryan Ferry' }],
      language: 'en',
      tone: 'warm',
      maxDurationSeconds: 20,
      factMode: 'verified',
      customInstruction:
        'Start with the slogan: "Radio Collection, the best on the web".',
    }, fact);

    expect(result.scriptText.startsWith(
      'Radio Collection, the best on the web.',
    )).toBe(true);
    expect(result.verifiedFactIncluded).toBe(true);
    expect(result.verifiedFact?.sources).toEqual(fact.sources);
    expect(provider.complete.mock.calls[0]?.[0].userPrompt).toContain(
      fact.text,
    );
  });

  it('drops the fact but keeps the link when verified trivia cannot fit', async () => {
    const oversized = `{"texto":"${Array.from(
      { length: 60 },
      () => 'word',
    ).join(' ')}"}`;
    provider.complete.mockResolvedValue(oversized);

    const result = await generateVoiceLinkDraft({
      ...input,
      maxDurationSeconds: 8,
      factMode: 'verified',
    }, {
      text: 'This deliberately long verified sentence cannot fit inside the very short configured voice link duration.',
      sources: [{ title: 'Source', url: 'https://example.com/source' }],
    });

    expect(result.estimatedDurationSeconds).toBeLessThanOrEqual(8);
    expect(result.verifiedFactIncluded).toBe(false);
    expect(result.scriptText).not.toContain('deliberately long');
  });
});
