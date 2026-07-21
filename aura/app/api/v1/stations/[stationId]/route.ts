import { and, eq, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { station, voice } from '@/lib/db/schema';
import {
  integrationErrorResponse,
  requireStationMember,
  IntegrationHttpError,
} from '@/lib/integration/authorization';

export const runtime = 'nodejs';

const StationUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  defaultLanguage: z.enum(['en', 'pt', 'es']).optional(),
  // The station's default AURA voice for integrated generation. Must be a
  // voice the caller can use: a global catalog voice or one they cloned.
  defaultVoiceId: z.string().uuid().nullable().optional(),
});

/** Fetch the station (owner/admin/operator/viewer). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { stationId } = await ctx.params;
    const member = await requireStationMember(stationId, session.user.id);
    return Response.json({ station: member.station });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

/**
 * Update station settings (owner/admin only). Primarily used by the Studio
 * Pro panel to set the default voice required before integrated generation.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { stationId } = await ctx.params;
    await requireStationMember(stationId, session.user.id, ['owner', 'admin']);

    const body = await req.json().catch(() => ({}));
    const parsed = StationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Validate the voice belongs to the catalog or to this user before
    // pinning it — never let a station point at someone else's cloned voice.
    if (parsed.data.defaultVoiceId) {
      const [v] = await db
        .select({ id: voice.id })
        .from(voice)
        .where(
          and(
            eq(voice.id, parsed.data.defaultVoiceId),
            eq(voice.enabled, true),
            or(isNull(voice.ownerUserId), eq(voice.ownerUserId, session.user.id))
          )
        )
        .limit(1);
      if (!v) {
        throw new IntegrationHttpError(400, 'invalid_default_voice');
      }
    }

    const update: Partial<typeof station.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.timezone !== undefined) update.timezone = parsed.data.timezone;
    if (parsed.data.defaultLanguage !== undefined)
      update.defaultLanguage = parsed.data.defaultLanguage;
    if (parsed.data.defaultVoiceId !== undefined)
      update.defaultVoiceId = parsed.data.defaultVoiceId;

    const [updated] = await db
      .update(station)
      .set(update)
      .where(eq(station.id, stationId))
      .returning();

    return Response.json({ station: updated });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
