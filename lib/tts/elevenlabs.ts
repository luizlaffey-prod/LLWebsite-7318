import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import {
  ELEVEN_LABS_MODEL,
  ELEVEN_LABS_FAST_MODEL,
  VOICE_SETTINGS,
} from './voice-catalog';
import { concatMp3Bytes } from '@/lib/audio/server-mix';
import type { Emotion } from '@/lib/audio/emotions';
import type { ScriptBlock } from '@/lib/llm/script-generator';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Per-emotion overrides for ElevenLabs voice_settings. Lower stability makes
 * the voice more expressive/variable; higher stability keeps it steady.
 * Used as a fallback shaping when the configured model doesn't interpret
 * inline tags (e.g. multilingual_v2). v3 honors tags directly.
 */
const EMOTION_SETTINGS: Record<Emotion, { stability: number; similarity_boost: number }> = {
  ENTHUSIASM: { stability: 0.35, similarity_boost: 0.8 },
  DRAMATIC: { stability: 0.3, similarity_boost: 0.85 },
  SERIOUSNESS: { stability: 0.65, similarity_boost: 0.75 },
  CONCERN: { stability: 0.6, similarity_boost: 0.7 },
  NEUTRAL: { stability: 0.5, similarity_boost: 0.75 },
};

/**
 * v3 audio tags — read by the model as performance directions, not spoken
 * aloud. Mapped from our 5 emotions to v3's recognised vocabulary. NEUTRAL
 * gets no tag so the line plays plain.
 */
const EMOTION_V3_TAG: Record<Emotion, string | null> = {
  ENTHUSIASM: '[excited]',
  DRAMATIC: '[dramatic]',
  SERIOUSNESS: '[serious]',
  CONCERN: '[concerned]',
  NEUTRAL: null,
};

function isV3Model(modelId: string): boolean {
  return modelId.startsWith('eleven_v3');
}

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
  /**
   * When true, insert a short transition sting between consecutive
   * blocks whose `category` differs. Falls back silently to a plain
   * concat if the sting can't be loaded (no key, network issue).
   */
  transitionEffects?: boolean;
}

async function synthesizeBlock(
  text: string,
  opts: SynthesizeOptions
): Promise<Uint8Array> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('ELEVENLABS_API_KEY is not set', 0);

  const url = `${ELEVEN_BASE}/text-to-speech/${opts.elevenLabsVoiceId}`;
  const modelId = opts.fast ? ELEVEN_LABS_FAST_MODEL : ELEVEN_LABS_MODEL;
  const emotionPreset = opts.emotion ? EMOTION_SETTINGS[opts.emotion] : null;
  const voiceSettings: Record<string, number> = {
    ...VOICE_SETTINGS,
    ...(emotionPreset ?? {}),
  };
  if (typeof opts.speed === 'number') {
    // ElevenLabs accepts speed in [0.7, 1.2]; clamp our UI range [0.8, 1.5].
    voiceSettings.speed = Math.max(0.7, Math.min(1.2, opts.speed));
  }

  // v3 reads inline audio tags as performance directions; older models would
  // read them aloud, so we prepend the tag only when the active model is v3.
  let finalText = text;
  if (opts.emotion && isV3Model(modelId)) {
    const tag = EMOTION_V3_TAG[opts.emotion];
    if (tag) finalText = `${tag} ${text}`;
  }

  const body = {
    text: finalText,
    model_id: modelId,
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
      const body = (err.responseText ?? '').slice(0, 400);
      throw new ElevenLabsError(
        err.status === 429
          ? 'rate_limited'
          : err.status === 401
            ? 'invalid_api_key'
            : `elevenlabs_${err.status} model=${opts.fast ? ELEVEN_LABS_FAST_MODEL : ELEVEN_LABS_MODEL} voice=${opts.elevenLabsVoiceId} ${body}`,
        err.status
      );
    }
    throw err;
  }
}

/**
 * Synthesizes each block separately (so emotion can vary per block) and
 * returns one properly-muxed MP3. We used to byte-concat the per-block
 * MP3s — browsers played that fine but desktop players reported wrong
 * duration and WhatsApp refused the file as malformed, because only the
 * first chunk's Xing/LAME header was present. concatMp3Bytes routes
 * everything through ffmpeg to produce a single CBR file with a correct
 * container.
 */
export async function synthesizeBulletin(
  blocks: ScriptBlock[],
  opts: SynthesizeOptions
): Promise<{ audio: Uint8Array; durationEstimateSeconds: number }> {
  const chunks: Uint8Array[] = [];
  let durationEstimate = 0;

  // Lazy-load the sting once if transition effects are requested.
  // null when the toggle is off; resolved (or stays null) on first
  // category change.
  let stingBytes: Uint8Array | null | undefined = opts.transitionEffects
    ? undefined
    : null;
  let previousCategory: string | undefined;

  for (const block of blocks) {
    if (!block.text.trim()) continue;

    // Insert a sting between consecutive blocks whose category
    // differs (skipping the first block — no transition needed before
    // it). Same-category blocks remain seamless.
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
        // Sting is ~0.8s; counted toward total duration so the
        // self-correcting script loop knows about it.
        durationEstimate += 1;
      }
    }

    // Send the script text clean — multilingual_v2 would read inline cues
    // like "[seriousness]" aloud. The voice shaping comes from per-emotion
    // voice_settings instead.
    const audio = await synthesizeBlock(block.text, { ...opts, emotion: block.emotion });
    chunks.push(audio);
    durationEstimate += block.duracaoSegundos;
    if (block.category) previousCategory = block.category;
  }

  const merged = await concatMp3Bytes(chunks);
  return { audio: merged, durationEstimateSeconds: durationEstimate };
}
