import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { uploadAudio } from '@/lib/storage/r2';
import { mixVoiceAndBackgroundServerSide } from '@/lib/audio/server-mix';
import { fetchWithRetry } from '@/lib/utils/retry';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Server-side mix endpoint. Accepts either:
 *   - JSON: { voiceUrl, bgUrl }  — for AI-bg regenerate paths
 *   - FormData: voiceUrl + bgFile (and/or bgUrl)
 *      — when the user uploaded their own bg in the browser. We take
 *        the bytes directly and avoid the upload-to-R2 round trip.
 *
 * Why this exists: client-side Web Audio (decodeAudioData) chokes on
 * large WAVs / weird codecs even when the file plays fine in an
 * <audio> element. Server-side ffmpeg handles every common format.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  let voiceUrl = '';
  let bgUrl = '';
  let bgBytes: Uint8Array | undefined;
  let bgFilename: string | undefined;

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      voiceUrl = String(form.get('voiceUrl') ?? '');
      bgUrl = String(form.get('bgUrl') ?? '');
      const bgFile = form.get('bgFile');
      if (bgFile instanceof File && bgFile.size > 0) {
        bgBytes = new Uint8Array(await bgFile.arrayBuffer());
        bgFilename = bgFile.name;
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as {
        voiceUrl?: string;
        bgUrl?: string;
      };
      voiceUrl = body.voiceUrl ?? '';
      bgUrl = body.bgUrl ?? '';
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'bad_request', message: err instanceof Error ? err.message : '' },
      { status: 400 }
    );
  }

  if (!voiceUrl) {
    return NextResponse.json({ error: 'voiceUrl_required' }, { status: 400 });
  }
  if (!bgUrl && !bgBytes) {
    return NextResponse.json(
      { error: 'bg_required', message: 'Provide bgUrl or bgFile' },
      { status: 400 }
    );
  }

  try {
    const voiceRes = await fetchWithRetry(
      voiceUrl,
      {},
      { timeoutMs: 60_000 }
    );
    const voiceBytes = new Uint8Array(await voiceRes.arrayBuffer());

    const mixedBytes = await mixVoiceAndBackgroundServerSide({
      voiceBytes,
      bgBytes,
      bgUrl: bgUrl || undefined,
      bgFilename,
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
