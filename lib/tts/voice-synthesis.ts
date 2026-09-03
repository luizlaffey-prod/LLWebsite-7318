import type { ScriptBlock } from '@/lib/llm/script-generator';
import { FishAudioError, synthesizeBulletin as synthesizeWithFish } from './fish-audio';
import { fishReferenceId, isFishVoiceId } from './fish-audio-contract';

export interface VoiceSynthesisOptions {
  voiceId: string;
  speed?: number;
  fast?: boolean;
  transitionEffects?: boolean;
}

export class VoiceSynthesisError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'VoiceSynthesisError';
  }
}

/**
 * Single voice-synthesis boundary for AURA.
 *
 * Legacy provider IDs remain stored for historical referential integrity, but
 * they are deliberately rejected here. This guarantees that no bulletin,
 * automation, regeneration, preview, or StudioPro request can silently fall
 * back to a retired voice provider.
 */
export async function synthesizeVoice(
  blocks: ScriptBlock[],
  opts: VoiceSynthesisOptions,
): Promise<{ audio: Uint8Array; durationEstimateSeconds: number }> {
  if (!isFishVoiceId(opts.voiceId)) {
    throw new VoiceSynthesisError('voice_provider_retired', 410);
  }

  try {
    return await synthesizeWithFish(blocks, {
      referenceId: fishReferenceId(opts.voiceId) ?? '',
      speed: opts.speed,
      fast: opts.fast,
      transitionEffects: opts.transitionEffects,
    });
  } catch (error) {
    if (error instanceof FishAudioError) {
      throw new VoiceSynthesisError(error.message, error.status);
    }
    throw error;
  }
}
