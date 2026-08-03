import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = {
  id: 'gemini' as const,
  complete: vi.fn(),
};

vi.mock('./provider', () => ({
  resolveProvider: () => provider,
}));

import { generateScript } from './script-generator';

describe('generateScript', () => {
  beforeEach(() => {
    provider.complete.mockReset();
  });

  it('reserves Gemini output capacity instead of allowing thinking to consume it all', async () => {
    provider.complete.mockResolvedValueOnce(
      JSON.stringify({
        blocos: [{
          texto: 'A notícia principal está confirmada.',
          emocao: 'NEUTRAL',
          duracao_segundos: 10,
          categoria: 'politics-main',
        }],
      }),
    );

    await generateScript({
      newsContent: 'Confirmed source material.',
      targetDurationSeconds: 10,
      language: 'en',
    });

    expect(provider.complete).toHaveBeenCalledWith(expect.objectContaining({
      maxTokens: 4_096,
      thinkingBudget: 512,
    }));
  });
});
