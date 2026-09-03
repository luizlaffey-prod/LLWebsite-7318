import { and, eq, isNull, like, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
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
          like(voiceTable.synthesisVoiceId, 'fish:%'),
          or(eq(voiceTable.ownerUserId, userId), isNull(voiceTable.ownerUserId))
        )
      : and(
          eq(voiceTable.enabled, true),
          like(voiceTable.synthesisVoiceId, 'fish:%'),
        );

    const allVoices = await db
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
        synthesisVoiceId: voiceTable.synthesisVoiceId,
        ownerUserId: voiceTable.ownerUserId,
        isCloned: voiceTable.isCloned,
      })
      .from(voiceTable)
      .where(baseWhere);

    // Dedupe by the internal synthesis identifier.
    const bySynthesisId = new Map<string, (typeof allVoices)[number]>();
    for (const v of allVoices) {
      const existing = bySynthesisId.get(v.synthesisVoiceId);
      if (!existing) {
        bySynthesisId.set(v.synthesisVoiceId, v);
        continue;
      }
      const vOwned = userId ? v.ownerUserId === userId : false;
      const existingOwned = userId ? existing.ownerUserId === userId : false;
      if (vOwned && !existingOwned) {
        bySynthesisId.set(v.synthesisVoiceId, v);
        continue;
      }
      if (!vOwned && existingOwned) continue;
      if (!existing.previewUrl && v.previewUrl) {
        bySynthesisId.set(v.synthesisVoiceId, v);
      }
    }
    const deduped = Array.from(bySynthesisId.values());

    let defaultVoiceId: string | null = null;
    let defaultSpeed = 1.0;

    if (userId) {
      const prefs = await db
        .select({
          voiceId: voicePreference.voiceId,
          isDefault: voicePreference.isDefault,
          speed: voicePreference.speed,
        })
        .from(voicePreference)
        .where(eq(voicePreference.userId, userId));

      const defaultPref = prefs.find((p) => p.isDefault);
      if (defaultPref) {
        defaultVoiceId = defaultPref.voiceId;
        defaultSpeed = defaultPref.speed ?? 1.0;
      }
    }

    const voices = deduped
      .map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description ?? null,
        languages: v.languages,
        gender: v.gender,
        accent: v.accent ?? null,
        style: v.style ?? null,
        isDefault: defaultVoiceId === v.id,
        isMine: userId ? v.ownerUserId === userId : v.isCloned,
      }))
      .sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return Response.json({
      voices,
      defaultVoiceId,
      defaultSpeed,
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
