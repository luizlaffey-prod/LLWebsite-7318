import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { uploadAudio } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PREVIEW_SAMPLE_TEXT =
  'Welcome to AURA. Your news, fresh from the wire.';
const PREVIEW_MODEL = 'eleven_multilingual_v2';

/**
 * Returns a short audible sample for the given voice. Three-layer fallback:
 *
 * 1. If we've cached a synthesised sample in R2 for this voice, redirect to
 *    the public URL there (CDN-cached, free).
 * 2. Otherwise hit ElevenLabs' voice metadata endpoint and use the
 *    preview_url it ships with each voice (many preset voices have one).
 * 3. If that's missing or fails, synthesize ~5 seconds of sample text via
 *    the TTS API and stash the bytes in R2 so future requests serve from
 *    layer 1.
 *
 * The cache key is the ElevenLabs voice id, not the AURA voice row id, so
 * the same upstream voice across multiple AURA rows shares one preview.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const [v] = await db
    .select({ elevenLabsVoiceId: voiceTable.elevenLabsVoiceId })
    .from(voiceTable)
    .where(eq(voiceTable.id, id))
    .limit(1);
  if (!v) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'tts_not_configured' }, { status: 503 });
  }

  // Layer 1: redirect to cached R2 preview if it exists.
  const cacheKey = `voice-previews/${v.elevenLabsVoiceId}.mp3`;
  const cachedUrl = guessR2PublicUrl(cacheKey);
  if (cachedUrl) {
    try {
      const head = await fetch(cachedUrl, { method: 'HEAD' });
      if (head.ok) {
        return NextResponse.redirect(cachedUrl, 302);
      }
    } catch {
      /* fall through */
    }
  }

  // Layer 2: ElevenLabs preview_url.
  let bytes: Uint8Array | null = null;
  try {
    const metaRes = await fetchWithRetry(
      `https://api.elevenlabs.io/v1/voices/${v.elevenLabsVoiceId}`,
      { headers: { 'xi-api-key': key, Accept: 'application/json' } },
      { timeoutMs: 15_000 }
    );
    const meta = (await metaRes.json()) as { preview_url?: string };
    if (meta.preview_url) {
      const audioRes = await fetchWithRetry(
        meta.preview_url,
        {},
        { timeoutMs: 30_000 }
      );
      bytes = new Uint8Array(await audioRes.arrayBuffer());
    }
  } catch (err) {
    console.warn(
      '[voice-preview] metadata/preview_url fetch failed',
      v.elevenLabsVoiceId,
      err
    );
  }

  // Layer 3: synthesize a short TTS sample.
  if (!bytes) {
    try {
      const ttsRes = await fetchWithRetry(
        `https://api.elevenlabs.io/v1/text-to-speech/${v.elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': key,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: PREVIEW_SAMPLE_TEXT,
            model_id: PREVIEW_MODEL,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
        { timeoutMs: 60_000, retryOn: [429, 500, 502, 503, 504] }
      );
      bytes = new Uint8Array(await ttsRes.arrayBuffer());
    } catch (err) {
      const status = err instanceof FetchError ? err.status : 500;
      const body =
        err instanceof FetchError ? (err.responseText ?? '').slice(0, 300) : '';
      console.warn(
        '[voice-preview] TTS synth failed',
        v.elevenLabsVoiceId,
        status,
        body
      );
      return NextResponse.json(
        {
          error: 'preview_failed',
          voiceId: v.elevenLabsVoiceId,
          upstream: status,
          message: body || (err instanceof Error ? err.message : 'unknown'),
        },
        { status: 502 }
      );
    }
  }

  // Cache the bytes for next time so we don't burn TTS credits per click.
  try {
    await uploadAudio(cacheKey, bytes, 'audio/mpeg');
  } catch (err) {
    console.warn('[voice-preview] R2 upload (cache) failed', err);
  }

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}

/**
 * Best-effort guess of the public R2 URL for a key. We don't sign HEADs from
 * the server (would need account-level auth headers), so this returns null
 * when the env vars needed to construct a public URL aren't present —
 * fallback then runs the upstream/TTS flow unconditionally.
 */
function guessR2PublicUrl(key: string): string | null {
  const publicHost = process.env.R2_PUBLIC_HOST;
  if (!publicHost) return null;
  const base = publicHost.replace(/\/$/, '');
  return `${base}/${key}`;
}
