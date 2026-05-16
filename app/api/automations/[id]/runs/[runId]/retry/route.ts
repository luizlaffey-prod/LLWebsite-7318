import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { automationSchedule, automationExecution } from '@/lib/db/schema';
import { runAutomationSlot } from '@/lib/automations/execute';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; runId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id, runId } = await ctx.params;

  const [automation] = await db
    .select()
    .from(automationSchedule)
    .where(
      and(
        eq(automationSchedule.id, id),
        eq(automationSchedule.userId, session.user.id)
      )
    )
    .limit(1);
  if (!automation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const [run] = await db
    .select()
    .from(automationExecution)
    .where(
      and(
        eq(automationExecution.id, runId),
        eq(automationExecution.automationScheduleId, id)
      )
    )
    .limit(1);
  if (!run) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (run.status === 'running') {
    return NextResponse.json({ error: 'already_running' }, { status: 409 });
  }

  const slot = automation.slots.find((s) => s.time === run.slotTime);
  if (!slot) {
    return NextResponse.json({ error: 'slot_missing' }, { status: 410 });
  }

  const result = await runAutomationSlot({
    automationId: automation.id,
    scheduledFor: run.scheduledFor,
    slot,
    existingExecutionId: run.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
