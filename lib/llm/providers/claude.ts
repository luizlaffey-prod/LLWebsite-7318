import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider } from '../types';

export function createClaudeProvider(): LlmProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const model = process.env.AURA_CLAUDE_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey: key });

  return {
    id: 'claude',
    async complete({ systemPrompt, userPrompt }) {
      const msg = await client.messages.create({
        model,
        max_tokens: 2048,
        temperature: 1.0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      return msg.content
        .filter((part): part is Anthropic.TextBlock => part.type === 'text')
        .map((p) => p.text)
        .join('');
    },
  };
}
