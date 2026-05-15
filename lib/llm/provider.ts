import type { LlmProvider } from './types';
import { createClaudeProvider } from './providers/claude';
import { createGeminiProvider } from './providers/gemini';

/**
 * Resolves the active LLM provider. `LLM_PROVIDER=gemini|claude` overrides
 * auto-detect, which otherwise prefers Claude when ANTHROPIC_API_KEY is set
 * and falls back to Gemini.
 */
export function resolveProvider(): LlmProvider {
  const explicit = (process.env.LLM_PROVIDER ?? '').toLowerCase();
  if (explicit === 'gemini') return createGeminiProvider();
  if (explicit === 'claude') return createClaudeProvider();
  if (process.env.ANTHROPIC_API_KEY) return createClaudeProvider();
  if (process.env.GEMINI_API_KEY) return createGeminiProvider();
  throw new Error(
    'No LLM provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.'
  );
}
