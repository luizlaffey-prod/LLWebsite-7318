import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { generatedAudio, voice as voiceTable } from '@/lib/db/schema';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const langFilter = url.searchParams.get('language');
  const voiceFilter = url.searchParams.get('voiceId');

  const where = [eq(generatedAudio.userId, session.user.id)];
  if (langFilter === 'en' || langFilter === 'pt' || langFilter === 'es') {
    where.push(eq(generatedAudio.language, langFilter));
  }
  if (voiceFilter) {
    where.push(eq(generatedAudio.voiceId, voiceFilter));
  }

  const offset = (page - 1) * PAGE_SIZE;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: generatedAudio.id,
        title: generatedAudio.title,
        sourceName: generatedAudio.sourceName,
        audioUrl: generatedAudio.audioUrl,
        durationSeconds: generatedAudio.durationSeconds,
        language: generatedAudio.language,
        status: generatedAudio.status,
        createdAt: generatedAudio.createdAt,
        voiceName: voiceTable.name,
        voiceId: generatedAudio.voiceId,
      })
      .from(generatedAudio)
      .leftJoin(voiceTable, eq(generatedAudio.voiceId, voiceTable.id))
      .where(and(...where))
      .orderBy(desc(generatedAudio.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedAudio)
      .where(and(...where)),
  ]);

  return NextResponse.json({
    audios: rows,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    },
  });
}
