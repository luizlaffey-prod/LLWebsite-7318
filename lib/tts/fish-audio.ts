import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { concatMp3Bytes } from '@/lib/audio/server-mix';
import type { Emotion } from '@/lib/audio/emotions';
import type { ScriptBlock } from '@/lib/llm/script-generator';

const FISH_BASE = 'https://api.fish.audio/v1';

export class FishAudioError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'FishAudioError';
  }
}

export interface FishSynthesizeOptions {
  referenceId: string;
  speed?: number;
  fast?: boolean;
  emotion?: Emotion;
  transitionEffects?: boolean;
}

async function synthesizeBlock(
  text: string,
  opts: FishSynthesizeOptions
): Promise<Uint8Array> {
  const key = process.env.FISHAUDIO_API_KEY || process.env.FISH_API_KEY;
  if (!key) throw new FishAudioError('FISHAUDIO_API_KEY or FISH_API_KEY is not set', 0);

  const url = `${FISH_BASE}/tts`;
  const model = opts.fast
    ? (process.env.AURA_FISHAUDIO_FAST_MODEL ?? 's2.1-pro-free')
    : (process.env.AURA_FISHAUDIO_MODEL ?? 's2.1-pro');

  const body: Record<string, any> = {
    text,
    format: 'mp3',
  };
  if (opts.referenceId && opts.referenceId !== 'default') {
    body.reference_id = opts.referenceId;
  }

  if (typeof opts.speed === 'number') {
    // Fish Audio accepts speed in [0.5, 2.0]
    body.prosody = {
      speed: Math.max(0.5, Math.min(2.0, opts.speed)),
    };
  }

  try {
    const res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          model: model,
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify(body),
      },
      { timeoutMs: 120_000 }
    );

    const buf = new Uint8Array(await res.arrayBuffer());
    return buf;
  } catch (err) {
    if (err instanceof FetchError) {
      const bodyText = (err.responseText ?? '').slice(0, 400);
      throw new FishAudioError(
        err.status === 429
          ? 'rate_limited'
          : err.status === 401
            ? 'invalid_api_key'
            : `fishaudio_${err.status} model=${model} voice=${opts.referenceId} ${bodyText}`,
        err.status
      );
    }
    throw err;
  }
}

export async function synthesizeBulletin(
  blocks: ScriptBlock[],
  opts: FishSynthesizeOptions
): Promise<{ audio: Uint8Array; durationEstimateSeconds: number }> {
  const chunks: Uint8Array[] = [];
  let durationEstimate = 0;
  let stingBytes: Uint8Array | null | undefined = opts.transitionEffects
    ? undefined
    : null;
  let previousCategory: string | undefined;

  for (const block of blocks) {
    if (!block.text.trim()) continue;

    if (
      opts.transitionEffects &&
      previousCategory &&
      block.category &&
      block.category !== previousCategory
    ) {
      if (stingBytes === undefined) {
        const { getTransitionStingBytes } = await import('@/lib/audio/sting');
        stingBytes = await getTransitionStingBytes();
      }
      if (stingBytes) {
        chunks.push(stingBytes);
        durationEstimate += 1.2;
      }
    }

    const audio = await synthesizeBlock(block.text, opts);
    chunks.push(audio);
    durationEstimate += block.duracaoSegundos;
    if (block.category) previousCategory = block.category;
  }

  const merged = await concatMp3Bytes(chunks);
  return {
    audio: merged,
    durationEstimateSeconds: Math.round(durationEstimate),
  };
}
