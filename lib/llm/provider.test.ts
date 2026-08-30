import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClaudeProvider } from './providers/claude';
import { createGeminiProvider } from './providers/gemini';
import { createOpenAIProvider } from './providers/openai';
import { resolveProvider } from './provider';

vi.mock('./providers/claude', () => ({ createClaudeProvider: vi.fn() }));
vi.mock('./providers/gemini', () => ({ createGeminiProvider: vi.fn() }));
vi.mock('./providers/openai', () => ({ createOpenAIProvider: vi.fn() }));

const originalEnv = { ...process.env };
const input = { systemPrompt: 'system', userPrompt: 'user' };

function provider(id: 'openai' | 'claude' | 'gemini', complete: () => Promise<string>) {
  return { id, complete: vi.fn(complete) };
}

describe('LLM provider policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.LLM_PROVIDER;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers OpenAI and falls back to Claude then Gemini', async () => {
    process.env.OPENAI_API_KEY = 'configured';
    process.env.ANTHROPIC_API_KEY = 'configured';
    process.env.GEMINI_API_KEY = 'configured';
    const openai = provider('openai', async () => { throw new Error('openai down'); });
    const claude = provider('claude', async () => 'claude result');
    const gemini = provider('gemini', async () => 'gemini result');
    vi.mocked(createOpenAIProvider).mockReturnValue(openai);
    vi.mocked(createClaudeProvider).mockReturnValue(claude);
    vi.mocked(createGeminiProvider).mockReturnValue(gemini);

    const selected = resolveProvider();
    await expect(selected.complete(input)).resolves.toBe('claude result');
    expect(selected.id).toBe('openai');
    expect(openai.complete).toHaveBeenCalledOnce();
    expect(claude.complete).toHaveBeenCalledOnce();
    expect(gemini.complete).not.toHaveBeenCalled();
  });

  it('falls through when provider output fails domain validation', async () => {
    process.env.OPENAI_API_KEY = 'configured';
    process.env.GEMINI_API_KEY = 'configured';
    const openai = provider('openai', async () => '{"texto":"truncated');
    const gemini = provider('gemini', async () => '{"texto":"valid"}');
    vi.mocked(createOpenAIProvider).mockReturnValue(openai);
    vi.mocked(createGeminiProvider).mockReturnValue(gemini);

    const selected = resolveProvider();
    await expect(selected.complete({
      ...input,
      validate(result) {
        JSON.parse(result);
      },
    })).resolves.toBe('{"texto":"valid"}');
    expect(openai.complete).toHaveBeenCalledOnce();
    expect(gemini.complete).toHaveBeenCalledOnce();
  });

  it('honors an explicit configured primary without disabling fallbacks', async () => {
    process.env.OPENAI_API_KEY = 'configured';
    process.env.GEMINI_API_KEY = 'configured';
    process.env.LLM_PROVIDER = 'gemini';
    const openai = provider('openai', async () => 'openai result');
    const gemini = provider('gemini', async () => 'gemini result');
    vi.mocked(createOpenAIProvider).mockReturnValue(openai);
    vi.mocked(createGeminiProvider).mockReturnValue(gemini);

    const selected = resolveProvider();
    await expect(selected.complete(input)).resolves.toBe('gemini result');
    expect(selected.id).toBe('gemini');
    expect(openai.complete).not.toHaveBeenCalled();
  });
});
