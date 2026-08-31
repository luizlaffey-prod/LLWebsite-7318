import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveProvider } from './provider';
import { askAuraAssistant } from './aura-assistant';

vi.mock('./provider', () => ({ resolveProvider: vi.fn() }));

const complete = vi.fn();

describe('AURA Assistant provider-neutral generation', () => {
  beforeEach(() => {
    complete.mockReset();
    complete.mockResolvedValue('{"reply":"Abra Settings e verifique a conexão."}');
    vi.mocked(resolveProvider).mockReturnValue({ id: 'openai', complete });
  });

  it('preserves recent conversation, locale, tier and branded identity', async () => {
    await expect(askAuraAssistant({
      locale: 'pt',
      tier: 'pro',
      radioName: 'My Collection Radio',
      messages: [
        { role: 'user', content: 'O boletim não chegou.' },
        { role: 'assistant', content: 'Vamos verificar o destino.' },
        { role: 'user', content: 'Onde olho?' },
      ],
    })).resolves.toBe('Abra Settings e verifique a conexão.');

    const request = complete.mock.calls[0][0];
    expect(request.systemPrompt).toContain('AURA Assistant');
    expect(request.systemPrompt).toContain('Brazilian Portuguese');
    expect(request.systemPrompt).toContain('My Collection Radio');
    expect(request.userPrompt).toContain('Operator: O boletim não chegou.');
    expect(request.userPrompt).toContain('AURA Assistant: Vamos verificar o destino.');
    expect(request.validate).toBeTypeOf('function');
  });
});
