import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { integrationContentRequest, stationEvent } from '@/lib/db/schema';
import {
  payloadFingerprint,
  StationEventCreateSchema,
} from '@/lib/integration/contracts';
import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await ctx.params;
    const auth = await authenticateDevice(req, stationId, 'station:events:write');
    const body = await req.json().catch(() => ({}));
    const parsed = StationEventCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const requestWhere = parsed.data.contentRequestId
      ? and(
          eq(integrationContentRequest.id, parsed.data.contentRequestId),
          eq(integrationContentRequest.stationId, stationId)
        )
      : and(
          eq(integrationContentRequest.audioId, parsed.data.audioId!),
          eq(integrationContentRequest.stationId, stationId)
        );
    const [content] = await db
      .select({
        id: integrationContentRequest.id,
        audioId: integrationContentRequest.audioId,
      })
      .from(integrationContentRequest)
      .where(requestWhere)
      .limit(1);
    if (!content || (parsed.data.audioId && content.audioId !== parsed.data.audioId)) {
      return Response.json({ error: 'asset_not_found' }, { status: 404 });
    }

    const resolvedAudioId = parsed.data.audioId ?? content.audioId;
    const eventInput = {
      type: parsed.data.type,
      contentRequestId: content.id,
      audioId: resolvedAudioId,
      occurredAt: new Date(parsed.data.occurredAt).toISOString(),
      payload: parsed.data.payload,
    };
    const [existing] = await db
      .select()
      .from(stationEvent)
      .where(
        and(
          eq(stationEvent.deviceId, auth.device.id),
          eq(stationEvent.idempotencyKey, parsed.data.idempotencyKey)
        )
      )
      .limit(1);
    if (existing) {
      if (eventFingerprint(existing) !== payloadFingerprint(eventInput)) {
        return Response.json(
          { error: 'idempotency_key_reused_with_different_payload' },
          { status: 409 }
        );
      }
      return Response.json({ event: eventResource(existing), idempotentReplay: true });
    }

    const [created] = await db
      .insert(stationEvent)
      .values({
        stationId,
        deviceId: auth.device.id,
        contentRequestId: content.id,
        audioId: resolvedAudioId,
        type: parsed.data.type,
        idempotencyKey: parsed.data.idempotencyKey,
        occurredAt: new Date(parsed.data.occurredAt),
        payload: parsed.data.payload,
      })
      .onConflictDoNothing({
        target: [stationEvent.deviceId, stationEvent.idempotencyKey],
      })
      .returning();

    if (!created) {
      const [raced] = await db
        .select()
        .from(stationEvent)
        .where(
          and(
            eq(stationEvent.deviceId, auth.device.id),
            eq(stationEvent.idempotencyKey, parsed.data.idempotencyKey)
          )
        )
        .limit(1);
      if (!raced || eventFingerprint(raced) !== payloadFingerprint(eventInput)) {
        return Response.json(
          { error: 'idempotency_key_reused_with_different_payload' },
          { status: 409 }
        );
      }
      return Response.json({ event: eventResource(raced), idempotentReplay: true });
    }

    return Response.json(
      { event: eventResource(created), idempotentReplay: false },
      { status: 201 }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

function eventFingerprint(row: typeof stationEvent.$inferSelect): string {
  return payloadFingerprint({
    type: row.type,
    contentRequestId: row.contentRequestId,
    audioId: row.audioId,
    occurredAt: row.occurredAt.toISOString(),
    payload: row.payload,
  });
}

function eventResource(row: typeof stationEvent.$inferSelect) {
  return {
    id: row.id,
    stationId: row.stationId,
    deviceId: row.deviceId,
    contentRequestId: row.contentRequestId,
    audioId: row.audioId,
    type: row.type,
    idempotencyKey: row.idempotencyKey,
    occurredAt: row.occurredAt.toISOString(),
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}
