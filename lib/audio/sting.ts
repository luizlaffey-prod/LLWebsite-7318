import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { uploadAudio } from '@/lib/storage/r2';

const SFX_ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';
const R2_KEY = 'system/sting-default.mp3';
const STING_DURATION_S = 0.8;
const STING_PROMPT =
  'a soft, warm radio broadcast whoosh transition sting, 0.8 seconds, gentle airy sweep, no music, no voice, mellow';

// Module-level cache so warm Vercel instances reuse the bytes across
// invocations without re-fetching. Cold starts pay the R2 fetch (or
// the one-time ElevenLabs generation) once.
let cachedBytes: Uint8Array | null = null;

/**
 * Returns the MP3 bytes of the AURA topic-transition sting. Generation
 * happens at most once across the whole deployment lifetime: first
 * caller hits ElevenLabs Sound Effects, uploads the result to R2 at
 * `system/sting-default.mp3`, and every subsequent caller (across any
 * function instance) pulls from there.
 *
 * Returns null when ELEVENLABS_API_KEY is not set OR when both R2 and
 * ElevenLabs fail — callers should skip transition insertion silently
 * rather than fail the whole bulletin.
 */
export async function getTransitionStingBytes(): Promise<Uint8Array | null> {
  if (cachedBytes) return cachedBytes;

  // Try R2 first — cheap, no API cost, available across all instances
  // once any deploy has uploaded the asset.
  const r2Url = guessR2PublicUrl(R2_KEY);
  if (r2Url) {
    try {
      const res = await fetch(r2Url);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        cachedBytes = buf;
        return buf;
      }
    } catch {
      // fall through to generation
    }
  }

  // Fall back to generating via ElevenLabs SFX.
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.warn(
      '[sting] No cached sting in R2 and ELEVENLABS_API_KEY is not set'
    );
    return null;
  }

  let bytes: Uint8Array;
  try {
    const res = await fetchWithRetry(
      SFX_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: STING_PROMPT,
          duration_seconds: STING_DURATION_S,
          // Slight bias toward "prompt accuracy" over creative variation
          // so we get a sting that actually sounds like a broadcast sting.
          prompt_influence: 0.7,
        }),
      },
      { timeoutMs: 60_000 }
    );
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    const status = err instanceof FetchError ? err.status : 'unknown';
    console.warn('[sting] ElevenLabs SFX generation failed', status, err);
    return null;
  }

  // Persist to R2 so the next cold start (and every other deploy
  // instance) reuses this exact file. Best-effort: if upload fails the
  // caller still gets the bytes we just generated.
  try {
    await uploadAudio(R2_KEY, bytes, 'audio/mpeg');
  } catch (err) {
    console.warn('[sting] R2 upload failed; sting will regenerate next call', err);
  }

  cachedBytes = bytes;
  return bytes;
}

function guessR2PublicUrl(key: string): string | null {
  const publicHost = process.env.R2_PUBLIC_HOST;
  if (!publicHost) return null;
  const base = publicHost.replace(/\/$/, '');
  return `${base}/${key}`;
}
