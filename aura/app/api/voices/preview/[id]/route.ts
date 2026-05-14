import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';

export const runtime = 'nodejs';

/**
 * Streams a 5–8s ElevenLabs sample for the given AURA voice id. Caches
 * aggressively at the edge — voice samples are static per voice.
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

  try {
    // Pull the voice's metadata to get preview_url (signed by ElevenLabs).
    const metaRes = await fetchWithRetry(
      `https://api.elevenlabs.io/v1/voices/${v.elevenLabsVoiceId}`,
      { headers: { 'xi-api-key': key, Accept: 'application/json' } },
      { timeoutMs: 15_000 }
    );
    const meta = (await metaRes.json()) as { preview_url?: string };
    if (!meta.preview_url) {
      return NextResponse.json({ error: 'no_preview' }, { status: 404 });
    }
    const audioRes = await fetchWithRetry(meta.preview_url, {}, { timeoutMs: 30_000 });
    const buf = new Uint8Array(await audioRes.arrayBuffer());
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err) {
    const status = err instanceof FetchError ? err.status || 500 : 500;
    return NextResponse.json({ error: 'preview_failed' }, { status });
  }
}
