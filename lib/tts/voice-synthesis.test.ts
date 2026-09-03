import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  synthesize: vi.fn(),
}));

vi.mock('./fish-audio', () => ({
  FishAudioError: class FishAudioError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
    }
  },
  synthesizeBulletin: mocks.synthesize,
}));

import { synthesizeVoice, VoiceSynthesisError } from './voice-synthesis';

const blocks = [
  {
    text: 'Hello',
    duracaoSegundos: 2,
    category: 'voice',
    emotion: 'NEUTRAL' as const,
  },
];

describe('single voice synthesis engine', () => {
  beforeEach(() => {
    mocks.synthesize.mockReset();
    mocks.synthesize.mockResolvedValue({
      audio: new Uint8Array([1, 2, 3]),
      durationEstimateSeconds: 2,
    });
  });

  it('rejects retired-provider IDs without an upstream call', async () => {
    await expect(
      synthesizeVoice(blocks, { voiceId: 'legacy-provider-id' }),
    ).rejects.toEqual(expect.objectContaining({
      name: 'VoiceSynthesisError',
      message: 'voice_provider_retired',
      status: 410,
    } satisfies Partial<VoiceSynthesisError>));
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });

  it('routes an active voice through the sole synthesis engine', async () => {
    await synthesizeVoice(blocks, {
      voiceId: 'fish:model-123',
      speed: 1.1,
      fast: true,
    });

    expect(mocks.synthesize).toHaveBeenCalledWith(
      blocks,
      expect.objectContaining({
        referenceId: 'model-123',
        speed: 1.1,
        fast: true,
      }),
    );
  });
});
