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
    complete.mockResolvedValue('{"texto":"Rachel Anderson presents Next Song."}');
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
      announcerName: 'Rachel Anderson',
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
      'Rachel Anderson presents Next Song.',
    );

    expect(complete).toHaveBeenCalledOnce();
    const request = complete.mock.calls[0][0];
    expect(request.systemPrompt).toContain('Natural e bem-humorado');
    expect(request.systemPrompt).toContain('A melhor na web');
    expect(request.systemPrompt).toContain('Rachel Anderson');
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
      recentScripts: ['Welcome back to the best music in town tonight. Next Song is coming.'],
    });
    complete
      .mockResolvedValueOnce('{"texto":"Welcome back to the best music in town tonight. Next Song is coming."}')
      .mockResolvedValueOnce('{"texto":"First Artist set the pace; Next Song by Next Artist takes it from here."}');

    await expect(generateVoiceLinkDraft(input)).resolves.toBe(
      'First Artist set the pace; Next Song by Next Artist takes it from here.',
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

  it('uses the announcer identity and the full verified research dossier', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'First Song', artist: 'First Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'en',
      voiceId: '22222222-2222-4222-8222-222222222222',
      factMode: 'verified',
      verifiedFact: {
        text: 'The primary fact mentions an early demo.',
        alternatives: ['The final arrangement was recorded with a live rhythm section.'],
        sources: [{ title: 'Session notes', url: 'https://example.com/session' }],
      },
    });
    const profile: AnnouncerEditorialProfile = {
      stationId: '11111111-1111-4111-8111-111111111111',
      voiceId: '22222222-2222-4222-8222-222222222222',
      announcerName: 'Rachel Anderson',
      personality: 'Curious and vivid',
      deliveryStyle: 'Close conversation',
      exampleScripts: '',
      signatures: 'The best on the web',
      editorialPreferences: 'Studio stories',
      avoidances: 'No invented facts',
      pronunciationGuide: '',
      humorLevel: 'balanced',
      energyLevel: 'balanced',
      reactionsEnabled: true,
    };
    complete.mockResolvedValue(
      '{"texto":"I am Rachel Anderson. The final arrangement was recorded with a live rhythm section. Next Song by Next Artist is ready."}',
    );

    await generateVoiceLinkDraft(input, input.verifiedFact, profile);

    const request = complete.mock.calls[0][0];
    expect(request.userPrompt).toContain('VERIFIED MUSIC RESEARCH DOSSIER');
    expect(request.userPrompt).toContain('final arrangement');
    expect(request.userPrompt).toContain('Rachel Anderson');
    expect(request.validate).toBeTypeOf('function');
  });

  it('does not send the pre-break song into an after-commercial prompt', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      eventPosition: 'after-commercial',
      currentTrack: { title: 'Forbidden Old Song', artist: 'Old Artist' },
      nextTracks: [{ title: 'Fresh Start', artist: 'Next Artist' }],
      language: 'en',
    });
    complete.mockResolvedValue(
      '{"texto":"We are back, and Fresh Start by Next Artist is next."}',
    );

    await generateVoiceLinkDraft(input);

    expect(complete.mock.calls[0][0].userPrompt).not.toContain('Forbidden Old Song');
    expect(complete.mock.calls[0][0].userPrompt).toContain(
      'commercial break has just ended',
    );
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
