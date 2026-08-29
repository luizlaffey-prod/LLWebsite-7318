import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceLinkDraftInputSchema } from '@/lib/integration/contracts';
import type { AnnouncerEditorialProfile } from '@/lib/announcers/profile';
import { resolveProvider } from './provider';
import {
  generateVoiceLinkDraft,
  voiceLinkRepetitionScore,
} from './voice-link-generator';

vi.mock('./provider', () => ({
  resolveProvider: vi.fn(),
}));

const complete = vi.fn();

describe('voice-link editorial generation', () => {
  beforeEach(() => {
    complete.mockReset();
    complete.mockResolvedValue('{"texto":"Locu��o personalizada."}');
    vi.mocked(resolveProvider).mockReturnValue({
      id: 'gemini',
      complete,
    });
  });

  it('sends the complete selected-announcer profile and recent links to the LLM', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'First Song', artist: 'First Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'pt',
      voiceId: '22222222-2222-4222-8222-222222222222',
      recentScripts: ['Uma abertura que j� foi usada.'],
    });
    const profile: AnnouncerEditorialProfile = {
      stationId: '11111111-1111-4111-8111-111111111111',
      voiceId: '22222222-2222-4222-8222-222222222222',
      personality: 'Natural e bem-humorado',
      deliveryStyle: 'Conversa pr�xima',
      exampleScripts: 'Exemplo autorizado',
      signatures: 'A melhor na web',
      editorialPreferences: 'Bastidores da m�sica',
      avoidances: 'N�o inventar fatos',
      pronunciationGuide: '',
      humorLevel: 'free',
      energyLevel: 'balanced',
      reactionsEnabled: true,
    };

    await expect(generateVoiceLinkDraft(input, null, profile)).resolves.toBe(
      'Locu��o personalizada.',
    );

    expect(complete).toHaveBeenCalledOnce();
    const request = complete.mock.calls[0][0];
    expect(request.systemPrompt).toContain('Natural e bem-humorado');
    expect(request.systemPrompt).toContain('A melhor na web');
    expect(request.systemPrompt).toContain('Bastidores da m�sica');
    expect(request.systemPrompt).toContain('N�o inventar fatos');
    expect(request.systemPrompt).toContain('Humor is free and spontaneous');
    expect(request.userPrompt).toContain('Uma abertura que j� foi usada.');
  });

  it('retries once when the first draft repeats a recent opening', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'First Song', artist: 'First Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'en',
      recentScripts: ['Welcome back to the best music in town tonight.'],
    });
    complete
      .mockResolvedValueOnce('{"texto":"Welcome back to the best music in town tonight."}')
      .mockResolvedValueOnce('{"texto":"First Artist just set the pace; Next Artist takes it from here."}');

    await expect(generateVoiceLinkDraft(input)).resolves.toBe(
      'First Artist just set the pace; Next Artist takes it from here.',
    );
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0].userPrompt).toContain('first draft was rejected');
  });

  it('does not force a quoted slogan into every fallback link', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'First Song', artist: 'First Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'en',
      customInstruction: 'Use this station slogan naturally: "Always here for you".',
    });
    complete.mockRejectedValueOnce(new Error('provider unavailable'));

    const script = await generateVoiceLinkDraft(input);
    expect(script).not.toContain('Always here for you');
    expect(script).toContain('Next Song');
  });

  it('detects exact, opening, and distinctive phrase repetition', () => {
    const recent = ['Welcome back to the best music in town tonight.'];
    expect(voiceLinkRepetitionScore(recent[0], recent)).toBe(1);
    expect(voiceLinkRepetitionScore(
      'Welcome back to the best music in town with another track.', recent,
    )).toBeGreaterThanOrEqual(0.5);
    expect(voiceLinkRepetitionScore(
      'First Artist hands the night to Next Artist.', recent,
    )).toBe(0);
  });
});
