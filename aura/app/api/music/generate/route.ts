import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { generateBulletinMusic } from '@/lib/tts/elevenlabs-music';
import { ElevenLabsError } from '@/lib/tts/elevenlabs';
import { uploadAudio } from '@/lib/storage/r2';
import { mixVoiceAndBackgroundServerSide } from '@/lib/audio/server-mix';
import { fetchWithRetry } from '@/lib/utils/retry';
import { canUseAIBackgroundTrack } from '@/lib/billing/feature-gates';
import {
  getMusicQuota,
  incrementMusicUsage,
  recordMusicOverage,
  MUSIC_TRACK_OVERAGE_CENTS,
} from '@/lib/billing/music-quota';
import { EMOTIONS, type Emotion } from '@/lib/audio/emotions';

export const runtime = 'nodejs';
export const maxDuration = 180;

const Input = z.object({
  durationSeconds: z.number().int().min(15).max(300),
  emotions: z.array(z.enum(EMOTIONS)).default([]),
  language: z.enum(['en', 'pt', 'es']),
  acceptOverage: z.boolean().default(false),
  // When provided, the route also fetches the voice from R2 and runs
  // the ffmpeg mix server-side, returning a `mixedUrl` the client can
  // play directly. Bypasses the browser's decodeAudioData path —
  // which has been the source of "Não foi possível mixar" errors
  // because R2 doesn't always serve CORS headers and decodeAudioData
  // is picky about formats (the very same MP3 that <audio> happily
  // plays).
  voiceUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const quota = await getMusicQuota(session.user.id);

  // Tier gate — locked on Starter/Standard.
  if (!canUseAIBackgroundTrack(quota.tier)) {
    return NextResponse.json(
      { error: 'tier_locked', tier: quota.tier, requires: 'pro' },
      { status: 403 }
    );
  }

  let usingOverage = false;
  if (quota.remaining <= 0) {
    if (!parsed.data.acceptOverage) {
      return NextResponse.json(
        {
          error: 'quota_exceeded',
          quota,
          overagePriceCents: MUSIC_TRACK_OVERAGE_CENTS,
        },
        { status: 402 }
      );
    }
    usingOverage = true;
  }

  let audio: Uint8Array;
  let audioContentType: string;
  try {
    const out = await generateBulletinMusic({
      durationSeconds: parsed.data.durationSeconds,
      emotions: parsed.data.emotions as Emotion[],
      language: parsed.data.language,
    });
    audio = out.bytes;
    audioContentType = out.contentType;
  } catch (err) {
    const message =
      err instanceof ElevenLabsError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown_error';
    console.warn('[music] generation failed', message);
    return NextResponse.json({ error: 'music_failed', message }, { status: 502 });
  }

  const trackId = crypto.randomUUID();
  // Extension from content-type so the URL hints at the right decoder.
  const ext =
    audioContentType.includes('wav')
      ? 'wav'
      : audioContentType.includes('ogg')
        ? 'ogg'
        : 'mp3';
  const key = `audio/${session.user.id}/music-${trackId}.${ext}`;
  const { url } = await uploadAudio(key, audio, audioContentType);

  if (usingOverage) {
    await recordMusicOverage(session.user.id);
  } else {
    await incrementMusicUsage(session.user.id);
  }

  // Optional server-side mix. Skipped when the caller didn't pass a
  // voiceUrl, or when the fetch/mix throws — in either case the
  // client can still play the voice-only audio and fall back to its
  // own client-side mix attempt.
  let mixedUrl: string | undefined;
  if (parsed.data.voiceUrl) {
    try {
      const voiceRes = await fetchWithRetry(
        parsed.data.voiceUrl,
        {},
        { timeoutMs: 60_000 }
      );
      const voiceBytes = new Uint8Array(await voiceRes.arrayBuffer());
      const mixedBytes = await mixVoiceAndBackgroundServerSide({
        voiceBytes,
        bgUrl: url,
      });
      const mixedKey = `audio/${session.user.id}/mix-${trackId}.mp3`;
      const { url: r2MixedUrl } = await uploadAudio(
        mixedKey,
        mixedBytes,
        'audio/mpeg'
      );
      mixedUrl = r2MixedUrl;
    } catch (err) {
      console.warn(
        '[music] server-side mix failed; client may retry locally',
        err instanceof Error ? err.message : err
      );
    }
  }

  return NextResponse.json({
    musicUrl: url,
    mixedUrl,
    overage: usingOverage,
    overagePriceCents: usingOverage ? MUSIC_TRACK_OVERAGE_CENTS : 0,
  });
}
