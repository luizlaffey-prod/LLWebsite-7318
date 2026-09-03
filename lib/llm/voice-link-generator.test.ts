import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceLinkDraftInputSchema } from '@/lib/integration/contracts';
import type { AnnouncerEditorialProfile } from '@/lib/announcers/profile';
import { resolveProvider } from './provider';
import {
  generateVoiceLinkDraft,
  voiceLinkEditorialMetrics,
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
      '{"texto":"I am Rachel Anderson. The best on the web. The final arrangement was recorded with a live rhythm section. Next Song by Next Artist is ready."}',
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

  it('requires announcer identity and a fresh authorized signature after commercials', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      eventPosition: 'after-commercial',
      currentTrack: { title: 'Forbidden Old Song', artist: 'Old Artist' },
      nextTracks: [{ title: 'Fresh Start', artist: 'Next Artist' }],
      language: 'en',
      recentScripts: ['Rachel Anderson was with you before the break.'],
    });
    const profile: AnnouncerEditorialProfile = {
      stationId: '11111111-1111-4111-8111-111111111111',
      voiceId: '22222222-2222-4222-8222-222222222222',
      announcerName: 'Rachel Anderson',
      personality: 'Warm and vivid',
      deliveryStyle: 'Close conversation',
      exampleScripts: '',
      signatures: 'The best on the web | Music lives here',
      editorialPreferences: 'Studio stories',
      avoidances: 'No invented facts',
      pronunciationGuide: '',
      humorLevel: 'balanced',
      energyLevel: 'balanced',
      reactionsEnabled: true,
    };
    complete.mockResolvedValue(
      '{"texto":"I am Rachel Anderson. The best on the web. Fresh Start by Next Artist is ready."}',
    );

    await generateVoiceLinkDraft(input, null, profile);

    const request = complete.mock.calls[0][0];
    expect(request.userPrompt).not.toContain('Forbidden Old Song');
    expect(request.userPrompt).toContain('fresh-return');
    expect(request.validate).toBeTypeOf('function');
    expect(() => request.validate('{"texto":"Fresh Start by Next Artist is ready."}')).toThrow();
  });

  it('rejects a repeated announcer name and falls back to one self-identification', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'First Song', artist: 'First Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'en',
    });
    const profile: AnnouncerEditorialProfile = {
      stationId: '11111111-1111-4111-8111-111111111111',
      voiceId: '22222222-2222-4222-8222-222222222222',
      announcerName: 'Tony T',
      personality: 'Witty New York energy',
      deliveryStyle: 'Natural conversation',
      exampleScripts: '',
      signatures: '',
      editorialPreferences: 'Music culture',
      avoidances: 'No repeated self-introductions',
      pronunciationGuide: '',
      humorLevel: 'balanced',
      energyLevel: 'balanced',
      reactionsEnabled: true,
    };
    complete.mockResolvedValue(
      '{"texto":"I\'m Tony T, I\'m Tony T, and Next Song by Next Artist is ready."}',
    );

    const script = await generateVoiceLinkDraft(input, null, profile);
    expect(script.match(/Tony T/gu)).toHaveLength(1);
    expect(script).toContain('Next Song');

    const request = complete.mock.calls[0][0];
    expect(request.userPrompt).toContain('exactly once');
    expect(() => request.validate(
      '{"texto":"Tony T here. I\'m Tony T. Next Song is ready."}',
    )).toThrow('voice_link_repeated_announcer_identity');
  });

  it('does not duplicate identity when a fallback signature already names the announcer', async () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      eventPosition: 'after-commercial',
      currentTrack: { title: 'Old Song', artist: 'Old Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'en',
      recentScripts: [],
    });
    const profile: AnnouncerEditorialProfile = {
      stationId: '11111111-1111-4111-8111-111111111111',
      voiceId: '22222222-2222-4222-8222-222222222222',
      announcerName: 'Rachel Anderson',
      personality: 'Warm and vivid',
      deliveryStyle: 'Natural conversation',
      exampleScripts: '',
      signatures: "I'm Rachel Anderson. | You're with Rachel Anderson.",
      editorialPreferences: 'Music culture',
      avoidances: 'No repeated self-introductions',
      pronunciationGuide: '',
      humorLevel: 'balanced',
      energyLevel: 'balanced',
      reactionsEnabled: true,
    };
    complete.mockRejectedValueOnce(new Error('provider unavailable'));

    const script = await generateVoiceLinkDraft(input, null, profile);

    expect(script.match(/Rachel Anderson/gu)).toHaveLength(1);
    expect(script).toContain('Next Song');
    expect(script).not.toContain('Old Song');
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

  it('measures identity, slogan, verified depth, and basic now-next separately', () => {
    const input = VoiceLinkDraftInputSchema.parse({
      mode: 'between_songs',
      currentTrack: { title: 'First Song', artist: 'First Artist' },
      nextTracks: [{ title: 'Next Song', artist: 'Next Artist' }],
      language: 'en',
    });
    const profile = {
      stationId: '11111111-1111-4111-8111-111111111111',
      voiceId: '22222222-2222-4222-8222-222222222222',
      announcerName: 'Rachel Anderson',
      personality: 'Vivid', deliveryStyle: 'Natural', exampleScripts: '',
      signatures: 'The best on the web', editorialPreferences: '', avoidances: '',
      pronunciationGuide: '', humorLevel: 'balanced' as const,
      energyLevel: 'balanced' as const, reactionsEnabled: true,
    };
    const fact = { text: 'The final arrangement used a live rhythm section.', sources: [] };
    const metrics = voiceLinkEditorialMetrics(
      'First Song set the mood. I am Rachel Anderson, the best on the web. The final arrangement used a live rhythm section. Next Song is ready.',
      input,
      profile,
      fact,
    );
    expect(metrics).toMatchObject({
      editorialDepth: true,
      verifiedFactUsed: true,
      sloganUsed: true,
      selfIdentified: true,
      personalityProfileApplied: true,
    });
  });

  it('keeps personality, identity, and varied editorial modes across 20 multi-host links', async () => {
    const hosts = [
      ['Rachel Anderson', 'Warm and curious', 'The best on the web'],
      ['Tony T', 'Witty New York energy', 'Music lives here'],
      ['Alexis Cole', 'Elegant and playful', 'Your soundtrack, your night'],
      ['Mike Stone', 'Direct and soulful', 'Stay close to the music'],
    ] as const;
    const modes = new Set<string>();

    for (let index = 0; index < 20; index += 1) {
      const [name, personality, signature] = hosts[index % hosts.length]!;
      const input = VoiceLinkDraftInputSchema.parse({
        mode: 'between_songs',
        currentTrack: { title: `Current ${index}`, artist: `Artist ${index}` },
        nextTracks: [{ title: `Next ${index}`, artist: `Next Artist ${index}` }],
        language: 'en',
        recentScripts: Array.from({ length: index % 4 }, (_, recent) => `Unique prior link ${index}-${recent}`),
      });
      const profile: AnnouncerEditorialProfile = {
        stationId: '11111111-1111-4111-8111-111111111111',
        voiceId: '22222222-2222-4222-8222-222222222222',
        announcerName: name,
        personality,
        deliveryStyle: 'Natural conversation',
        exampleScripts: '', signatures: signature,
        editorialPreferences: 'Music culture', avoidances: 'No invented facts',
        pronunciationGuide: '', humorLevel: 'balanced', energyLevel: 'balanced',
        reactionsEnabled: true,
      };
      complete.mockResolvedValueOnce(
        JSON.stringify({ texto: `Current ${index} set the mood. I'm ${name}. ${signature}. Next ${index} is ready.` }),
      );
      await generateVoiceLinkDraft(input, null, profile);
      const request = complete.mock.calls.at(-1)![0];
      expect(request.systemPrompt).toContain(personality);
      modes.add(request.userPrompt.match(/Editorial mode: ([^.]+)/u)?.[1] ?? 'missing');
    }

    expect(complete).toHaveBeenCalledTimes(20);
    expect(modes.size).toBe(4);
  });
});
