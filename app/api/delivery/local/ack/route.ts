import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { deliveryEndpoint, deliveryLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  /** delivery_log row ids the client successfully wrote to the folder. */
  logIds: z.array(z.string().uuid()).min(1).max(100),
  /** Optional: per-id failure messages so the badge can surface them. */
  failed: z
    .array(
      z.object({
        logId: z.string().uuid(),
        error: z.string().max(300),
      })
    )
    .optional(),
});

/**
 * Marks the listed delivery_log rows as resolved. We re-check ownership
 * by joining through delivery_endpoint.user_id before updating so a
 * caller can't ack someone else's row by guessing IDs.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid body';
    return NextResponse.json({ error: 'bad_request', message }, { status: 400 });
  }

  const allIds = [...body.logIds, ...(body.failed?.map((f) => f.logId) ?? [])];
  if (allIds.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  // Ownership filter: only touch rows whose endpoint belongs to the caller.
  const ownedRows = await db
    .select({ id: deliveryLog.id })
    .from(deliveryLog)
    .innerJoin(
      deliveryEndpoint,
      eq(deliveryEndpoint.id, deliveryLog.deliveryEndpointId)
    )
    .where(
      and(
        inArray(deliveryLog.id, allIds),
        eq(deliveryEndpoint.userId, session.user.id),
        eq(deliveryEndpoint.type, 'local_folder')
      )
    );

  const ownedSet = new Set(ownedRows.map((r) => r.id));

  let updated = 0;
  for (const id of body.logIds) {
    if (!ownedSet.has(id)) continue;
    await db
      .update(deliveryLog)
      .set({ status: 'success' })
      .where(eq(deliveryLog.id, id));
    updated++;
  }
  for (const f of body.failed ?? []) {
    if (!ownedSet.has(f.logId)) continue;
    await db
      .update(deliveryLog)
      .set({ status: 'failed', error: f.error })
      .where(eq(deliveryLog.id, f.logId));
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
