import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import type { LlmProvider } from '../types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function createGeminiProvider(): LlmProvider {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.AURA_GEMINI_MODEL ?? 'gemini-2.5-pro';

  return {
    id: 'gemini',
    async complete({
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
      thinkingBudget,
    }) {
      const url = `${BASE}/models/${model}:generateContent?key=${key}`;
      const payload = {
        // Gemini treats system instructions as a separate field. Falls back
        // to prepending the system prompt if the model doesn't support it.
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: temperature ?? 1.0,
          responseMimeType: 'application/json',
          maxOutputTokens: maxTokens ?? 2048,
          ...(thinkingBudget !== undefined && model.startsWith('gemini-2.5-')
            ? { thinkingConfig: { thinkingBudget } }
            : {}),
        },
      };

      try {
        const res = await fetchWithRetry(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
          {
            timeoutMs: 60_000,
            // Free-tier rate limits hit 429 frequently; back off and retry
            // rather than failing fast.
            retryOn: [429, 500, 502, 503, 504],
            failFast: [400, 401, 403, 404],
            delays: [2_000, 5_000, 10_000],
          }
        );
        const data = (await res.json()) as {
          candidates?: {
            content?: { parts?: { text?: string; thought?: boolean }[] };
            finishReason?: string;
            finishMessage?: string;
          }[];
          promptFeedback?: { blockReason?: string };
          usageMetadata?: {
            candidatesTokenCount?: number;
            thoughtsTokenCount?: number;
            totalTokenCount?: number;
          };
        };
        const candidate = data.candidates?.[0];
        const text = (candidate?.content?.parts ?? [])
          .filter((part) => part.thought !== true && part.text)
          .map((part) => part.text)
          .join('');
        if (!text) {
          const finish = candidate?.finishReason ?? 'none';
          const blocked = data.promptFeedback?.blockReason ?? 'none';
          const thoughts = data.usageMetadata?.thoughtsTokenCount ?? 0;
          const output = data.usageMetadata?.candidatesTokenCount ?? 0;
          throw new Error(
            `gemini_empty_response:finish=${finish}:blocked=${blocked}:thoughts=${thoughts}:output=${output}`,
          );
        }
        return text;
      } catch (err) {
        if (err instanceof FetchError) {
          // Surface the upstream body — for 429s Gemini includes the
          // consumer project number which is the only way to know which
          // GCP project the key is attached to.
          const body = (err.responseText ?? '').slice(0, 600);
          throw new Error(`gemini_${err.status}_${err.message} ${body}`);
        }
        throw err;
      }
    },
  };
}
