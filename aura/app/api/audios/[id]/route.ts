import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { generatedAudio, voice as voiceTable } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const [row] = await db
    .select({
      id: generatedAudio.id,
      title: generatedAudio.title,
      sourceName: generatedAudio.sourceName,
      sourceArticleUrl: generatedAudio.sourceArticleUrl,
      originalScript: generatedAudio.originalScript,
      editedScript: generatedAudio.editedScript,
      voiceId: generatedAudio.voiceId,
      voiceName: voiceTable.name,
      speed: generatedAudio.speed,
      audioUrl: generatedAudio.audioUrl,
      durationSeconds: generatedAudio.durationSeconds,
      language: generatedAudio.language,
      status: generatedAudio.status,
      createdAt: generatedAudio.createdAt,
    })
    .from(generatedAudio)
    .leftJoin(voiceTable, eq(generatedAudio.voiceId, voiceTable.id))
    .where(and(eq(generatedAudio.id, id), eq(generatedAudio.userId, session.user.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ audio: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const result = await db
    .delete(generatedAudio)
    .where(and(eq(generatedAudio.id, id), eq(generatedAudio.userId, session.user.id)))
    .returning({ id: generatedAudio.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
