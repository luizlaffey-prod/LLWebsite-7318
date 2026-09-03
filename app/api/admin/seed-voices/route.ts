import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { voice } from '@/lib/db/schema';
import { VOICE_CATALOG } from '@/lib/tts/voice-catalog';
import { getSession } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const upserts = await runSeed();
    return NextResponse.json({ ok: true, upserted: upserts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'MIGRATE_SECRET not configured' }, { status: 500 });
  }
  if (req.headers.get('x-migrate-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const upserts = await runSeed();
    return NextResponse.json({ ok: true, upserted: upserts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function runSeed() {
  let upserts = 0;
  for (const seed of VOICE_CATALOG) {
    await db
      .insert(voice)
      .values({
        slug: seed.slug,
        synthesisVoiceId: seed.synthesisVoiceId,
        name: seed.name,
        description: seed.description ?? null,
        languages: seed.languages,
        gender: seed.gender,
        style: seed.style ?? null,
        accent: seed.accent ?? null,
        tierRequired: seed.tierRequired,
        enabled: true,
      })
      .onConflictDoUpdate({
        target: voice.slug,
        set: {
          synthesisVoiceId: sql`excluded.eleven_labs_voice_id`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          languages: sql`excluded.languages`,
          gender: sql`excluded.gender`,
          style: sql`excluded.style`,
          accent: sql`excluded.accent`,
          tierRequired: sql`excluded.tier_required`,
        },
      });
    upserts++;
  }
  return upserts;
}
