import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import {
  ELEVEN_LABS_MODEL,
  ELEVEN_LABS_FAST_MODEL,
  VOICE_SETTINGS,
} from './voice-catalog';
import type { Emotion } from '@/lib/audio/emotions';
import type { ScriptBlock } from '@/lib/llm/script-generator';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Per-emotion overrides for ElevenLabs voice_settings. Lower stability makes
 * the voice more expressive/variable; higher stability keeps it steady. The
 * multilingual_v2 model honors these knobs — it does NOT honor inline
 * bracketed cues, so the script text must be sent clean.
 */
const EMOTION_SETTINGS: Record<Emotion, { stability: number; similarity_boost: number }> = {
  ENTHUSIASM: { stability: 0.35, similarity_boost: 0.8 },
  DRAMATIC: { stability: 0.3, similarity_boost: 0.85 },
  SERIOUSNESS: { stability: 0.65, similarity_boost: 0.75 },
  CONCERN: { stability: 0.6, similarity_boost: 0.7 },
  NEUTRAL: { stability: 0.5, similarity_boost: 0.75 },
};

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
  /** Emotion for this block — drives voice_settings tweaks. */
  emotion?: Emotion;
}

async function synthesizeBlock(
  text: string,
  opts: SynthesizeOptions
): Promise<Uint8Array> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('ELEVENLABS_API_KEY is not set', 0);

  const url = `${ELEVEN_BASE}/text-to-speech/${opts.elevenLabsVoiceId}`;
  const emotionPreset = opts.emotion ? EMOTION_SETTINGS[opts.emotion] : null;
  const voiceSettings: Record<string, number> = {
    ...VOICE_SETTINGS,
    ...(emotionPreset ?? {}),
  };
  if (typeof opts.speed === 'number') {
    // ElevenLabs accepts speed in [0.7, 1.2]; clamp our UI range [0.8, 1.5].
    voiceSettings.speed = Math.max(0.7, Math.min(1.2, opts.speed));
  }
  const body = {
    text,
    model_id: opts.fast ? ELEVEN_LABS_FAST_MODEL : ELEVEN_LABS_MODEL,
    voice_settings: voiceSettings,
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
    // Send the script text clean — multilingual_v2 would read inline cues
    // like "[seriousness]" aloud. The voice shaping comes from per-emotion
    // voice_settings instead.
    const audio = await synthesizeBlock(block.text, { ...opts, emotion: block.emotion });
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
