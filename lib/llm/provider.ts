import type { LlmProvider } from './types';
import { createGeminiProvider } from './providers/gemini';
import { createOpenAIProvider } from './providers/openai';

type ProviderId = LlmProvider['id'];

function withFallbacks(providers: LlmProvider[]): LlmProvider {
  const [primary] = providers;
  if (!primary) {
    throw new Error(
      'No LLM provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.'
    );
  }
  return {
    id: primary.id,
    async complete(input) {
      const failures: string[] = [];
      for (const provider of providers) {
        try {
          const result = await provider.complete(input);
          input.validate?.(result);
          console.info('[llm] completion provider', {
            primary: primary.id,
            used: provider.id,
            fallback: provider.id !== primary.id,
          });
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${provider.id}=${message}`);
          console.warn(`[llm] provider ${provider.id} failed (${message})`);
        }
      }
      throw new Error(`all LLM providers failed: ${failures.join(' | ')}`);
    },
  };
}

function configuredProviders(): Partial<Record<ProviderId, LlmProvider | null>> {
  return {
    openai: process.env.OPENAI_API_KEY ? createOpenAIProvider() : null,
    gemini: process.env.GEMINI_API_KEY ? createGeminiProvider() : null,
  };
}

/**
 * OpenAI is the production-first provider for AURA editorial generation. The
 * other configured providers remain controlled fallbacks. LLM_PROVIDER may
 * explicitly choose any configured provider as primary without disabling the
 * remaining safety chain.
 */
export function resolveProvider(): LlmProvider {
  const providers = configuredProviders();
  const explicit = (process.env.LLM_PROVIDER ?? '').trim().toLowerCase() as ProviderId;
  // Claude is intentionally absent from the active production chain. Keeping
  // an old ANTHROPIC_API_KEY configured must not silently spend it.
  const defaultOrder: ProviderId[] = ['openai', 'gemini'];
  const order = defaultOrder.includes(explicit)
    ? [explicit, ...defaultOrder.filter((id) => id !== explicit)]
    : defaultOrder;
  return withFallbacks(
    order.flatMap((id) => providers[id] ? [providers[id]!] : [])
  );
}
