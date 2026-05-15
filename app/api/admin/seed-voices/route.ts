import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { voice } from '@/lib/db/schema';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'MIGRATE_SECRET not configured' }, { status: 500 });
  }
  if (req.headers.get('x-migrate-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    let upserts = 0;
    for (const seed of VOICE_CATALOG) {
      await db
        .insert(voice)
        .values({
          slug: seed.slug,
          elevenLabsVoiceId: seed.elevenLabsVoiceId,
          name: seed.name,
          description: seed.description,
          languages: seed.languages,
          gender: seed.gender,
          style: seed.style,
          accent: seed.accent,
          tierRequired: seed.tierRequired,
          enabled: true,
        })
        .onConflictDoUpdate({
          target: voice.slug,
          set: {
            elevenLabsVoiceId: seed.elevenLabsVoiceId,
            name: seed.name,
            description: seed.description,
            languages: seed.languages,
            gender: seed.gender,
            style: seed.style,
            accent: seed.accent,
            tierRequired: seed.tierRequired,
          },
        });
      upserts++;
    }
    return NextResponse.json({ ok: true, upserted: upserts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
