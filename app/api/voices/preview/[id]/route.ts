import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';
import { uploadAudio } from '@/lib/storage/r2';
import { isVoiceAvailableToUser } from '@/lib/tts/voice-clone-policy';
import { synthesizeVoice } from '@/lib/tts/voice-synthesis';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PREVIEW_SAMPLE_TEXT = 'Welcome to AURA. Your news, fresh from the wire.';

/**
 * Returns a short preview from the single active AURA voice engine. Cached
 * audio is keyed by the AURA row ID so provider identifiers never leave the
 * server-facing data model.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const [voice] = await db
    .select({
      synthesisVoiceId: voiceTable.synthesisVoiceId,
      ownerUserId: voiceTable.ownerUserId,
      enabled: voiceTable.enabled,
    })
    .from(voiceTable)
    .where(eq(voiceTable.id, id))
    .limit(1);
  if (
    !voice ||
    !isVoiceAvailableToUser(
      {
        ownerUserId: voice.ownerUserId,
        enabled: voice.enabled,
        synthesisVoiceId: voice.synthesisVoiceId,
      },
      session.user.id,
    )
  ) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }

  const cacheKey = `voice-previews/${id}.mp3`;
  const cachedUrl = guessR2PublicUrl(cacheKey);
  if (cachedUrl) {
    try {
      const head = await fetch(cachedUrl, { method: 'HEAD' });
      if (head.ok) return NextResponse.redirect(cachedUrl, 302);
    } catch {
      // Cache lookup is best effort; synthesize below.
    }
  }

  try {
    const { audio } = await synthesizeVoice(
      [
        {
          text: PREVIEW_SAMPLE_TEXT,
          duracaoSegundos: 4,
          category: 'preview',
          emotion: 'NEUTRAL',
        },
      ],
      { voiceId: voice.synthesisVoiceId, fast: true },
    );

    try {
      await uploadAudio(cacheKey, audio, 'audio/mpeg');
    } catch (error) {
      console.warn('[voice-preview] cache upload failed', error);
    }

    return new NextResponse(audio as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[voice-preview] synthesis failed', {
      voiceId: id,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'preview_failed' }, { status: 502 });
  }
}

function guessR2PublicUrl(key: string): string | null {
  const publicHost = process.env.R2_PUBLIC_HOST;
  if (!publicHost) return null;
  return `${publicHost.replace(/\/$/, '')}/${key}`;
}
