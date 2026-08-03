import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithRetry = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/retry', () => ({
  fetchWithRetry,
  FetchError: class FetchError extends Error {},
}));

import { createGeminiProvider } from './gemini';

describe('Gemini provider', () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.AURA_GEMINI_MODEL = 'gemini-2.5-pro';
  });

  it('sends the requested thinking budget and returns every visible text part', async () => {
    fetchWithRetry.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: 'internal reasoning' },
                { text: '{"texto":"' },
                { text: 'Locução pronta."}' },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      }),
    });

    const provider = createGeminiProvider();
    const result = await provider.complete({
      systemPrompt: 'system',
      userPrompt: 'user',
      maxTokens: 512,
      temperature: 0.4,
      thinkingBudget: 128,
    });

    expect(result).toBe('{"texto":"Locução pronta."}');
    const [, request] = fetchWithRetry.mock.calls[0];
    const payload = JSON.parse(String(request.body));
    expect(payload.generationConfig).toMatchObject({
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 128 },
    });
  });

  it('reports why a successful Gemini response contained no visible text', async () => {
    fetchWithRetry.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({
        candidates: [{ finishReason: 'MAX_TOKENS' }],
        usageMetadata: {
          candidatesTokenCount: 0,
          thoughtsTokenCount: 300,
        },
      }),
    });

    const provider = createGeminiProvider();

    await expect(
      provider.complete({
        systemPrompt: 'system',
        userPrompt: 'user',
        maxTokens: 300,
      }),
    ).rejects.toThrow(
      'gemini_empty_response:finish=MAX_TOKENS:blocked=none:thoughts=300:output=0',
    );
  });
});
