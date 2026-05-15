import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import type { LlmProvider } from '../types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function createGeminiProvider(): LlmProvider {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.AURA_GEMINI_MODEL ?? 'gemini-2.5-pro';

  return {
    id: 'gemini',
    async complete({ systemPrompt, userPrompt, maxTokens, temperature }) {
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
          { timeoutMs: 60_000, retryOn: [503] }
        );
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!text) throw new Error('gemini_empty_response');
        return text;
      } catch (err) {
        if (err instanceof FetchError) {
          throw new Error(`gemini_${err.status}_${err.message}`);
        }
        throw err;
      }
    },
  };
}
