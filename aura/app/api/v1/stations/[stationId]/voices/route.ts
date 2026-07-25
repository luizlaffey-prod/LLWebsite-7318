import { and, eq, isNull, like, not, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { requireStudioFeature } from '@/lib/integration/licensing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await ctx.params;
    const auth = await authenticateDevice(req, stationId, 'station:read');
    await requireStudioFeature(auth.organization.id, 'aura_content');

    const billingUserId = auth.organization.billingUserId;
    const quota = await getQuota(billingUserId);
    const rows = await db
      .select({
        id: voiceTable.id,
        name: voiceTable.name,
        description: voiceTable.description,
        languages: voiceTable.languages,
        gender: voiceTable.gender,
        accent: voiceTable.accent,
        style: voiceTable.style,
        tierRequired: voiceTable.tierRequired,
        ownerUserId: voiceTable.ownerUserId,
        elevenLabsVoiceId: voiceTable.elevenLabsVoiceId,
      })
      .from(voiceTable)
      .where(
        and(
          eq(voiceTable.enabled, true),
          not(like(voiceTable.slug, 'el-%')),
          or(isNull(voiceTable.ownerUserId), eq(voiceTable.ownerUserId, billingUserId))
        )
      );

    const [preference] = await db
      .select({
        voiceId: voicePreference.voiceId,
        speed: voicePreference.speed,
      })
      .from(voicePreference)
      .where(
        and(
          eq(voicePreference.userId, billingUserId),
          eq(voicePreference.isDefault, true)
        )
      )
      .limit(1);
    const defaultVoiceId = auth.station.defaultVoiceId ?? preference?.voiceId ?? null;

    const byProviderId = new Map<string, (typeof rows)[number]>();
    for (const row of rows.filter((voice) => canUseVoice(quota.tier, voice))) {
      const current = byProviderId.get(row.elevenLabsVoiceId);
      if (!current || row.ownerUserId === billingUserId) {
        byProviderId.set(row.elevenLabsVoiceId, row);
      }
    }

    const voices = [...byProviderId.values()]
      .map(({ tierRequired: _tierRequired, ownerUserId, elevenLabsVoiceId: _providerId, ...voice }) => ({
        ...voice,
        isDefault: voice.id === defaultVoiceId,
        isMine: ownerUserId === billingUserId,
      }))
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
        if (left.isMine !== right.isMine) return left.isMine ? -1 : 1;
        return left.name.localeCompare(right.name);
      });

    return Response.json({
      voices,
      defaultVoiceId,
      defaultSpeed: preference?.speed ?? 1,
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
