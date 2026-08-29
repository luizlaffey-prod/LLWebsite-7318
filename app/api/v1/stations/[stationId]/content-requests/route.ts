import { after } from 'next/server';
import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { integrationContentRequest } from '@/lib/db/schema';
import {
  ContentRequestInputSchema,
  contentRequestResource,
  requestFingerprint,
} from '@/lib/integration/contracts';
import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { processContentRequest } from '@/lib/integration/content-requests';
import { shouldResumeQuotaFailedRequest } from '@/lib/integration/content-quota-policy';
import { requireStudioFeature } from '@/lib/integration/licensing';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function resumeQuotaFailedRequest(
  request: typeof integrationContentRequest.$inferSelect
): Promise<typeof integrationContentRequest.$inferSelect | null> {
  if (!shouldResumeQuotaFailedRequest(request.status, request.errorCode)) {
    return null;
  }
  const now = new Date();
  const [resumed] = await db
    .update(integrationContentRequest)
    .set({
      status: 'pending',
      startedAt: null,
      completedAt: null,
      audioId: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(integrationContentRequest.id, request.id),
        eq(integrationContentRequest.status, 'failed'),
        eq(integrationContentRequest.errorCode, 'quota_exceeded')
      )
    )
    .returning();
  if (!resumed) return null;
  after(async () => {
    await processContentRequest(resumed.id);
  });
  return resumed;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await ctx.params;
    const auth = await authenticateDevice(
      req,
      stationId,
      'station:content:request'
    );
    await requireStudioFeature(auth.organization.id, 'aura_content');
    const idempotencyKey = req.headers.get('idempotency-key')?.trim();
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return Response.json(
        { error: 'invalid_idempotency_key' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ContentRequestInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const hash = requestFingerprint(parsed.data);
    const [existing] = await db
      .select()
      .from(integrationContentRequest)
      .where(
        and(
          eq(integrationContentRequest.stationId, stationId),
          eq(integrationContentRequest.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    if (existing) {
      if (existing.requestHash !== hash) {
        return Response.json(
          { error: 'idempotency_key_reused_with_different_payload' },
          { status: 409 }
        );
      }
      const resumed = await resumeQuotaFailedRequest(existing);
      if (resumed) {
        return Response.json(
          {
            request: contentRequestResource(resumed),
            idempotentReplay: true,
            resumedAfterQuota: true,
          },
          { status: 202 }
        );
      }
      return Response.json(
        { request: contentRequestResource(existing), idempotentReplay: true },
        { status: existing.status === 'ready' ? 200 : 202 }
      );
    }

    const scheduledFor = parsed.data.scheduledFor
      ? new Date(parsed.data.scheduledFor)
      : null;
    const expiryBase = scheduledFor ?? new Date();
    const expiresAt = new Date(
      expiryBase.getTime() + parsed.data.validForSeconds * 1000
    );
    const [created] = await db
      .insert(integrationContentRequest)
      .values({
        stationId,
        requestedByDeviceId: auth.device.id,
        idempotencyKey,
        requestHash: hash,
        kind: parsed.data.kind,
        input: parsed.data,
        scheduledFor,
        expiresAt,
      })
      .onConflictDoNothing({
        target: [
          integrationContentRequest.stationId,
          integrationContentRequest.idempotencyKey,
        ],
      })
      .returning();

    if (!created) {
      const [raced] = await db
        .select()
        .from(integrationContentRequest)
        .where(
          and(
            eq(integrationContentRequest.stationId, stationId),
            eq(integrationContentRequest.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      if (!raced) {
        return Response.json({ error: 'idempotency_conflict' }, { status: 409 });
      }
      if (raced.requestHash !== hash) {
        return Response.json(
          { error: 'idempotency_key_reused_with_different_payload' },
          { status: 409 }
        );
      }
      const resumed = await resumeQuotaFailedRequest(raced);
      if (resumed) {
        return Response.json(
          {
            request: contentRequestResource(resumed),
            idempotentReplay: true,
            resumedAfterQuota: true,
          },
          { status: 202 }
        );
      }
      return Response.json(
        { request: contentRequestResource(raced), idempotentReplay: true },
        { status: raced.status === 'ready' ? 200 : 202 }
      );
    }

    after(async () => {
      await processContentRequest(created.id);
    });

    return Response.json(
      { request: contentRequestResource(created), idempotentReplay: false },
      {
        status: 202,
        headers: {
          Location: `/api/v1/stations/${stationId}/content-requests/${created.id}`,
        },
      }
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await ctx.params;
    await authenticateDevice(req, stationId, 'station:read');
    const url = new URL(req.url);
    const requestedLimit = Number(url.searchParams.get('limit') ?? '50');
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.trunc(requestedLimit), 100))
      : 50;
    const updatedAfterRaw = url.searchParams.get('updatedAfter');
    const updatedAfter = updatedAfterRaw ? new Date(updatedAfterRaw) : null;
    if (updatedAfter && Number.isNaN(updatedAfter.getTime())) {
      return Response.json({ error: 'invalid_updated_after' }, { status: 400 });
    }

    const where = [eq(integrationContentRequest.stationId, stationId)];
    if (updatedAfter) {
      where.push(gt(integrationContentRequest.updatedAt, updatedAfter));
    }
    const rows = await db
      .select()
      .from(integrationContentRequest)
      .where(and(...where))
      .orderBy(asc(integrationContentRequest.updatedAt))
      .limit(limit);

    return Response.json({
      requests: rows.map(contentRequestResource),
      nextUpdatedAfter:
        rows.at(-1)?.updatedAt.toISOString() ?? updatedAfter?.toISOString() ?? null,
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
