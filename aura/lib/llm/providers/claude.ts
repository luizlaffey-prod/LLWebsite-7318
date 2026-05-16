import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider } from '../types';

const RATE_LIMIT_DELAYS_MS = [2_000, 5_000, 10_000];

export function createClaudeProvider(): LlmProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const model = process.env.AURA_CLAUDE_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey: key });

  return {
    id: 'claude',
    async complete({ systemPrompt, userPrompt, maxTokens, temperature }) {
      for (let attempt = 0; attempt <= RATE_LIMIT_DELAYS_MS.length; attempt++) {
        try {
          const msg = await client.messages.create({
            model,
            max_tokens: maxTokens ?? 2048,
            temperature: temperature ?? 1.0,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });
          return msg.content
            .filter((part): part is Anthropic.TextBlock => part.type === 'text')
            .map((p) => p.text)
            .join('');
        } catch (err) {
          const status =
            err instanceof Anthropic.APIError ? err.status : undefined;
          const retriable = status === 429 || status === 529 || (status ?? 0) >= 500;
          if (retriable && attempt < RATE_LIMIT_DELAYS_MS.length) {
            await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAYS_MS[attempt]));
            continue;
          }
          if (err instanceof Anthropic.APIError) {
            throw new Error(`claude_${err.status}_${err.message}`);
          }
          throw err;
        }
      }
      throw new Error('claude_exhausted_retries');
    },
  };
}
