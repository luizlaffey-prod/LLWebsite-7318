import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { generateBulletinMusic } from '@/lib/tts/elevenlabs-music';
import { ElevenLabsError } from '@/lib/tts/elevenlabs';
import { uploadAudio } from '@/lib/storage/r2';
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
  try {
    audio = await generateBulletinMusic({
      durationSeconds: parsed.data.durationSeconds,
      emotions: parsed.data.emotions as Emotion[],
      language: parsed.data.language,
    });
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
  const key = `audio/${session.user.id}/music-${trackId}.mp3`;
  const { url } = await uploadAudio(key, audio);

  if (usingOverage) {
    await recordMusicOverage(session.user.id);
  } else {
    await incrementMusicUsage(session.user.id);
  }

  return NextResponse.json({
    musicUrl: url,
    overage: usingOverage,
    overagePriceCents: usingOverage ? MUSIC_TRACK_OVERAGE_CENTS : 0,
  });
}
