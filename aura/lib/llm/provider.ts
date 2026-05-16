import type { LlmProvider } from './types';
import { createClaudeProvider } from './providers/claude';
import { createGeminiProvider } from './providers/gemini';

/**
 * Wraps a primary provider with a secondary failover. If the primary throws,
 * we log the error and retry the same prompt on the secondary. Used to keep
 * generation working when one provider is rate-limited (e.g. Gemini 429).
 */
function withFallback(primary: LlmProvider, secondary: LlmProvider): LlmProvider {
  return {
    id: primary.id,
    async complete(input) {
      let primaryErr: unknown;
      try {
        return await primary.complete(input);
      } catch (err) {
        primaryErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[llm] primary provider ${primary.id} failed (${msg}); failing over to ${secondary.id}`
        );
      }
      try {
        return await secondary.complete(input);
      } catch (err) {
        const primaryMsg =
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        const secondaryMsg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `both LLM providers failed: ${primary.id}=${primaryMsg} | ${secondary.id}=${secondaryMsg}`
        );
      }
    },
  };
}

/**
 * Resolves the active LLM provider. `LLM_PROVIDER=gemini|claude` forces a
 * specific primary (still with the other as failover when both keys exist).
 * With no override: Claude preferred, Gemini as backup, both directions.
 */
export function resolveProvider(): LlmProvider {
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const explicit = (process.env.LLM_PROVIDER ?? '').toLowerCase();

  if (explicit === 'gemini') {
    const gemini = createGeminiProvider();
    return hasClaude ? withFallback(gemini, createClaudeProvider()) : gemini;
  }
  if (explicit === 'claude') {
    const claude = createClaudeProvider();
    return hasGemini ? withFallback(claude, createGeminiProvider()) : claude;
  }
  if (hasClaude && hasGemini) {
    return withFallback(createClaudeProvider(), createGeminiProvider());
  }
  if (hasClaude) return createClaudeProvider();
  if (hasGemini) return createGeminiProvider();
  throw new Error(
    'No LLM provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.'
  );
}
