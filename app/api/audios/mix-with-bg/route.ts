import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { uploadAudio } from '@/lib/storage/r2';
import { mixVoiceAndBackgroundServerSide } from '@/lib/audio/server-mix';
import { fetchWithRetry } from '@/lib/utils/retry';

export const runtime = 'nodejs';
export const maxDuration = 120;

const Input = z.object({
  voiceUrl: z.string().url(),
  bgUrl: z.string().url(),
});

/**
 * Server-side mix endpoint for the bulletin drawer's regenerate
 * path (and any future caller that already has both a voice URL
 * and a bg URL on R2). Fetches both from server-side — no CORS
 * shenanigans, no browser decodeAudioData failures — runs the
 * ffmpeg mix with the same interactive ducking the automation
 * path uses, uploads the result, and returns its URL.
 *
 * Tier gate: any authenticated user. The bg material is whatever
 * was already authorized upstream (e.g. a Pro user's AI-generated
 * music). This endpoint just composites.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const voiceRes = await fetchWithRetry(
      parsed.data.voiceUrl,
      {},
      { timeoutMs: 60_000 }
    );
    const voiceBytes = new Uint8Array(await voiceRes.arrayBuffer());

    const mixedBytes = await mixVoiceAndBackgroundServerSide({
      voiceBytes,
      bgUrl: parsed.data.bgUrl,
    });

    const trackId = crypto.randomUUID();
    const key = `audio/${session.user.id}/mix-${trackId}.mp3`;
    const { url } = await uploadAudio(key, mixedBytes, 'audio/mpeg');

    return NextResponse.json({ mixedUrl: url });
  } catch (err) {
    console.warn(
      '[mix-with-bg] failed',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: 'mix_failed', message: err instanceof Error ? err.message : '' },
      { status: 502 }
    );
  }
}
