import { and, eq, isNull, like, not, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';
import {
  authenticateDevice,
  integrationErrorResponse,
  requireStationMember,
} from '@/lib/integration/authorization';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await ctx.params;

    let userId: string | null = null;
    try {
      await authenticateDevice(req, stationId);
    } catch {
      const session = await getSession();
      if (session?.user) {
        await requireStationMember(stationId, session.user.id);
        userId = session.user.id;
      } else {
        return Response.json({ error: 'unauthorized' }, { status: 401 });
      }
    }

    const baseWhere = userId
      ? and(
          eq(voiceTable.enabled, true),
          not(like(voiceTable.slug, 'el-%')),
          or(eq(voiceTable.ownerUserId, userId), isNull(voiceTable.ownerUserId))
        )
      : and(eq(voiceTable.enabled, true), not(like(voiceTable.slug, 'el-%')));

    const voices = await db
      .select({
        id: voiceTable.id,
        slug: voiceTable.slug,
        name: voiceTable.name,
        description: voiceTable.description,
        languages: voiceTable.languages,
        gender: voiceTable.gender,
        style: voiceTable.style,
        accent: voiceTable.accent,
        tierRequired: voiceTable.tierRequired,
        previewUrl: voiceTable.previewUrl,
        elevenLabsVoiceId: voiceTable.elevenLabsVoiceId,
        ownerUserId: voiceTable.ownerUserId,
        isCloned: voiceTable.isCloned,
      })
      .from(voiceTable)
      .where(baseWhere);

    return Response.json({ voices });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
