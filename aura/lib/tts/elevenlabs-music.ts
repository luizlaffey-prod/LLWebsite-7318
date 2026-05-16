import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import type { Emotion } from '@/lib/audio/emotions';
import { ElevenLabsError } from './elevenlabs';

const MUSIC_ENDPOINT = 'https://api.elevenlabs.io/v1/music';
const MIN_MS = 10_000;
const MAX_MS = 300_000;

export interface MusicGenerationInput {
  durationSeconds: number;
  emotions: Emotion[];
  language: 'en' | 'pt' | 'es';
}

export interface MusicGenerationOutput {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * Synthesizes an instrumental background bed from a derived prompt. The
 * resulting MP3 is meant to be mixed under the spoken bulletin, so the prompt
 * leans heavily on "no vocals, instrumental, broadcast bed, low intensity".
 */
export async function generateBulletinMusic(
  input: MusicGenerationInput
): Promise<MusicGenerationOutput> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('ELEVENLABS_API_KEY is not set', 0);

  const clampedMs = Math.min(
    MAX_MS,
    Math.max(MIN_MS, Math.round(input.durationSeconds * 1000))
  );

  const prompt = buildMusicPrompt(input);

  try {
    const res = await fetchWithRetry(
      MUSIC_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          prompt,
          music_length_ms: clampedMs,
        }),
      },
      {
        timeoutMs: 180_000,
        retryOn: [429, 500, 502, 503, 504],
        failFast: [400, 401, 403, 404],
        delays: [3_000, 7_000, 15_000],
      }
    );
    const contentType = res.headers.get('content-type') ?? 'unknown';
    const bytes = new Uint8Array(await res.arrayBuffer());
    // First 4 bytes of an MP3 frame start with 0xFFFB / 0xFFF3 / 0xFFFA, or
    // 'ID3' for tagged files. Anything else (JSON, WAV 'RIFF', etc.) means
    // the upload is going to confuse the browser decoder downstream.
    const header = Array.from(bytes.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const asciiHead = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 16));
    console.log('[music] elevenlabs response', {
      contentType,
      bytes: bytes.length,
      headerHex: header,
      asciiHead,
    });
    if (bytes.length < 1024) {
      throw new ElevenLabsError(
        `music_too_small: ${bytes.length} bytes, contentType=${contentType}, head="${asciiHead}"`,
        0
      );
    }
    // Some ElevenLabs deployments return a JSON envelope instead of raw
    // audio. Detect the common case ("{" first byte) and surface it instead
    // of silently uploading garbage.
    if (asciiHead.trimStart().startsWith('{')) {
      throw new ElevenLabsError(
        `music_json_envelope: contentType=${contentType}, head="${asciiHead}"`,
        0
      );
    }
    return { bytes, contentType: contentType.split(';')[0] || 'audio/mpeg' };
  } catch (err) {
    if (err instanceof FetchError) {
      const body = (err.responseText ?? '').slice(0, 400);
      throw new ElevenLabsError(
        err.status === 401
          ? 'invalid_api_key'
          : err.status === 429
            ? 'rate_limited'
            : `music_${err.status} ${body}`,
        err.status
      );
    }
    throw err;
  }
}

function buildMusicPrompt({ emotions, durationSeconds, language }: MusicGenerationInput): string {
  const dominant = pickDominantEmotion(emotions);
  const moodPhrase: Record<Emotion, string> = {
    ENTHUSIASM: 'uplifting, bright, optimistic',
    SERIOUSNESS: 'serious, measured, news anchor tension',
    CONCERN: 'somber, restrained, low intensity',
    NEUTRAL: 'neutral broadcast bed, soft pulse',
    DRAMATIC: 'cinematic, building tension, restrained percussion',
  };
  const localeFlavor =
    language === 'pt'
      ? 'subtle Brazilian rhythm influence'
      : language === 'es'
        ? 'subtle Latin rhythm influence'
        : 'modern American broadcast feel';

  return [
    `Instrumental radio news background bed, ${moodPhrase[dominant]}.`,
    `No vocals, no lyrics, no spoken words.`,
    `${localeFlavor}.`,
    `Soft synths, low strings, gentle percussion. Mix sits below speech.`,
    `Duration ~${durationSeconds} seconds. Loop-friendly tail.`,
  ].join(' ');
}

function pickDominantEmotion(emotions: Emotion[]): Emotion {
  if (emotions.length === 0) return 'NEUTRAL';
  const counts = new Map<Emotion, number>();
  for (const e of emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  let best: Emotion = 'NEUTRAL';
  let bestCount = -1;
  for (const [e, c] of counts) {
    if (c > bestCount) {
      best = e;
      bestCount = c;
    }
  }
  return best;
}
