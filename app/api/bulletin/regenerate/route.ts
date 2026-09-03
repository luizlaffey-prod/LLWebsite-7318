import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { generatedAudio } from '@/lib/db/schema';
import { synthesizeVoice } from '@/lib/tts/voice-synthesis';
import { uploadAudio, audioKey } from '@/lib/storage/r2';
import { EMOTIONS, type Emotion } from '@/lib/audio/emotions';
import { resolveFishVoiceForUser } from '@/lib/tts/voice-resolution';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BlockSchema = z.object({
  text: z.string().min(1),
  emotion: z.enum(EMOTIONS as readonly [Emotion, ...Emotion[]]),
  duracaoSegundos: z.number().min(1).max(30),
});

const Input = z.object({
  audioId: z.string().uuid(),
  blocks: z.array(BlockSchema).min(1),
  transitionEffects: z.boolean().default(false),
});

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

  const [row] = await db
    .select()
    .from(generatedAudio)
    .where(eq(generatedAudio.id, parsed.data.audioId))
    .limit(1);
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!row.voiceId) {
    return NextResponse.json({ error: 'no_voice' }, { status: 400 });
  }
  const chosenVoice = await resolveFishVoiceForUser(row.voiceId, session.user.id);
  if (!chosenVoice) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }

  await db
    .update(generatedAudio)
    .set({
      voiceId: chosenVoice.id,
      editedScript: parsed.data.blocks,
      status: 'generating',
      updatedAt: new Date(),
    })
    .where(eq(generatedAudio.id, row.id));

  try {
    const { audio, durationEstimateSeconds } = await synthesizeVoice(
      parsed.data.blocks,
      {
        voiceId: chosenVoice.synthesisVoiceId,
        speed: row.speed,
        fast: true, // regenerations use Flash model to keep cost down
        transitionEffects: parsed.data.transitionEffects,
      }
    );
    const key = audioKey(session.user.id, row.id);
    const uploaded = await uploadAudio(key, audio);

    await db
      .update(generatedAudio)
      .set({
        audioUrl: uploaded.url,
        durationSeconds: durationEstimateSeconds,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(generatedAudio.id, row.id));

    return NextResponse.json({
      audioUrl: uploaded.url,
      durationSeconds: durationEstimateSeconds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    await db
      .update(generatedAudio)
      .set({ status: 'failed', errorMessage: message })
      .where(eq(generatedAudio.id, row.id));
    return NextResponse.json({ error: 'regeneration_failed', message }, { status: 500 });
  }
}
