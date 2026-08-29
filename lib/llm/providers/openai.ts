import { FetchError, fetchWithRetry } from '@/lib/utils/retry';
import type { LlmProvider } from '../types';

const BASE = 'https://api.openai.com/v1/responses';

interface OpenAIResponsePayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

function responseText(payload: OpenAIResponsePayload): string {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

export function createOpenAIProvider(): LlmProvider {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const model = process.env.AURA_OPENAI_MODEL ?? 'gpt-5-mini';

  return {
    id: 'openai',
    async complete({ systemPrompt, userPrompt, maxTokens }) {
      try {
        const response = await fetchWithRetry(
          BASE,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              instructions: systemPrompt,
              input: userPrompt,
              max_output_tokens: maxTokens ?? 2048,
              store: false,
              text: { format: { type: 'json_object' } },
            }),
          },
          {
            timeoutMs: 60_000,
            retryOn: [429, 500, 502, 503, 504],
            failFast: [400, 401, 403, 404],
            delays: [1_000, 3_000, 7_000],
          }
        );
        const payload = (await response.json()) as OpenAIResponsePayload;
        const text = responseText(payload);
        if (!text) throw new Error('openai_empty_response');
        return text;
      } catch (error) {
        if (error instanceof FetchError) {
          const body = (error.responseText ?? '').slice(0, 600);
          throw new Error(`openai_${error.status}_${error.message} ${body}`);
        }
        throw error;
      }
    },
  };
}
