import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  automationSchedule,
  automationExecution,
  generatedAudio,
  deliveryLog,
  deliveryEndpoint,
} from '@/lib/db/schema';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  // Ownership check up-front so we don't leak executions across users.
  const [own] = await db
    .select({ id: automationSchedule.id })
    .from(automationSchedule)
    .where(
      and(
        eq(automationSchedule.id, id),
        eq(automationSchedule.userId, session.user.id)
      )
    )
    .limit(1);
  if (!own) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const url = new URL(req.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
  );

  const runs = await db
    .select({
      id: automationExecution.id,
      scheduledFor: automationExecution.scheduledFor,
      executedAt: automationExecution.executedAt,
      slotTime: automationExecution.slotTime,
      status: automationExecution.status,
      retryCount: automationExecution.retryCount,
      error: automationExecution.error,
      audioId: automationExecution.audioId,
      audioUrl: generatedAudio.audioUrl,
      audioTitle: generatedAudio.title,
      audioDuration: generatedAudio.durationSeconds,
    })
    .from(automationExecution)
    .leftJoin(generatedAudio, eq(generatedAudio.id, automationExecution.audioId))
    .where(eq(automationExecution.automationScheduleId, id))
    .orderBy(desc(automationExecution.scheduledFor))
    .limit(limit);

  // Pull delivery logs for the audios we just listed so the UI can show
  // per-run delivery status without N+1 queries.
  const audioIds = runs.map((r) => r.audioId).filter((x): x is string => !!x);
  const deliveryByAudio: Record<
    string,
    { status: string; endpointName: string; endpointType: string; error: string | null; at: string }[]
  > = {};
  if (audioIds.length > 0) {
    const logs = await db
      .select({
        audioId: deliveryLog.audioId,
        status: deliveryLog.status,
        error: deliveryLog.error,
        createdAt: deliveryLog.createdAt,
        endpointName: deliveryEndpoint.name,
        endpointType: deliveryEndpoint.type,
      })
      .from(deliveryLog)
      .innerJoin(
        deliveryEndpoint,
        eq(deliveryEndpoint.id, deliveryLog.deliveryEndpointId)
      )
      .where(
        sql`${deliveryLog.audioId} IN (${sql.join(
          audioIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )})`
      );
    for (const l of logs) {
      if (!l.audioId) continue;
      const entry = (deliveryByAudio[l.audioId] ??= []);
      entry.push({
        status: l.status,
        endpointName: l.endpointName,
        endpointType: l.endpointType,
        error: l.error,
        at: l.createdAt.toISOString(),
      });
    }
  }

  const items = runs.map((r) => ({
    id: r.id,
    scheduledFor: r.scheduledFor.toISOString(),
    executedAt: r.executedAt?.toISOString() ?? null,
    slotTime: r.slotTime,
    status: r.status,
    retryCount: r.retryCount,
    error: r.error,
    audio: r.audioId
      ? {
          id: r.audioId,
          url: r.audioUrl,
          title: r.audioTitle,
          durationSeconds: r.audioDuration,
        }
      : null,
    deliveries: r.audioId ? deliveryByAudio[r.audioId] ?? [] : [],
  }));

  return NextResponse.json({ runs: items });
}
