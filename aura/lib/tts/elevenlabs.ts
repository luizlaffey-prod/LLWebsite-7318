import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import {
  ELEVEN_LABS_MODEL,
  ELEVEN_LABS_FAST_MODEL,
  VOICE_SETTINGS,
} from './voice-catalog';
import type { ScriptBlock } from '@/lib/llm/script-generator';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

export class ElevenLabsError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

export interface SynthesizeOptions {
  elevenLabsVoiceId: string;
  speed?: number;
  /** Use Flash model (cheaper, faster) for previews/regenerations. */
  fast?: boolean;
}

async function synthesizeBlock(
  text: string,
  opts: SynthesizeOptions
): Promise<Uint8Array> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('ELEVENLABS_API_KEY is not set', 0);

  const url = `${ELEVEN_BASE}/text-to-speech/${opts.elevenLabsVoiceId}`;
  const body = {
    text,
    model_id: opts.fast ? ELEVEN_LABS_FAST_MODEL : ELEVEN_LABS_MODEL,
    voice_settings: VOICE_SETTINGS,
  };

  try {
    const res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
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
      throw new ElevenLabsError(
        err.status === 429
          ? 'rate_limited'
          : err.status === 401
            ? 'invalid_api_key'
            : `elevenlabs_${err.status}`,
        err.status
      );
    }
    throw err;
  }
}

/**
 * Synthesizes each block separately (so emotion can vary per block) and
 * returns the concatenated MP3 bytes. Browsers and ffmpeg both concat MP3
 * frames without re-encoding, so this is safe for delivery.
 */
export async function synthesizeBulletin(
  blocks: ScriptBlock[],
  opts: SynthesizeOptions
): Promise<{ audio: Uint8Array; durationEstimateSeconds: number }> {
  const chunks: Uint8Array[] = [];
  let durationEstimate = 0;

  for (const block of blocks) {
    if (!block.text.trim()) continue;
    // Prefix the text with an emotion-shaping cue. ElevenLabs honors
    // bracketed cues for the multilingual_v2 model.
    const cued = `[${block.emotion.toLowerCase()}] ${block.text}`;
    const audio = await synthesizeBlock(cued, opts);
    chunks.push(audio);
    durationEstimate += block.duracaoSegundos;
  }

  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  return { audio: merged, durationEstimateSeconds: durationEstimate };
}
