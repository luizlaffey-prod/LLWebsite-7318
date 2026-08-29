import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { AnnouncerProfileInputSchema } from '@/lib/announcers/profile';
import { db } from '@/lib/db/client';
import { stationAnnouncerProfile } from '@/lib/db/schema';
import { requireStationMember } from '@/lib/integration/authorization';
import { resolveAuthorizedVoice } from '@/lib/integration/voice-authorization';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: voiceId } = await params;
  const parsed = AnnouncerProfileInputSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 },
    );
  }

  let member;
  try {
    member = await requireStationMember(parsed.data.stationId, session.user.id, [
      'owner',
      'admin',
    ]);
    await resolveAuthorizedVoice(voiceId, member.organization.id);
  } catch {
    return NextResponse.json({ error: 'voice_or_station_not_found' }, { status: 404 });
  }

  const values = {
    personality: parsed.data.personality,
    deliveryStyle: parsed.data.deliveryStyle,
    exampleScripts: parsed.data.exampleScripts,
    signatures: parsed.data.signatures,
    editorialPreferences: parsed.data.editorialPreferences,
    avoidances: parsed.data.avoidances,
    pronunciationGuide: parsed.data.pronunciationGuide,
    humorLevel: parsed.data.humorLevel,
    energyLevel: parsed.data.energyLevel,
    reactionsEnabled: parsed.data.reactionsEnabled,
    updatedAt: new Date(),
  };
  const [profile] = await db
    .insert(stationAnnouncerProfile)
    .values({ stationId: parsed.data.stationId, voiceId, ...values })
    .onConflictDoUpdate({
      target: [stationAnnouncerProfile.stationId, stationAnnouncerProfile.voiceId],
      set: values,
    })
    .returning();

  return NextResponse.json({ profile });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id: voiceId } = await params;
  const stationId = new URL(req.url).searchParams.get('stationId');
  if (!stationId) {
    return NextResponse.json({ error: 'station_required' }, { status: 400 });
  }
  try {
    await requireStationMember(stationId, session.user.id, ['owner', 'admin']);
  } catch {
    return NextResponse.json({ error: 'station_not_found' }, { status: 404 });
  }
  await db.delete(stationAnnouncerProfile).where(
    and(
      eq(stationAnnouncerProfile.stationId, stationId),
      eq(stationAnnouncerProfile.voiceId, voiceId),
    ),
  );
  return NextResponse.json({ ok: true });
}
