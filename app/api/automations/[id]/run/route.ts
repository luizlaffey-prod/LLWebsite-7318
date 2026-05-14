import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { automationSchedule } from '@/lib/db/schema';
import { runAutomationSlot } from '@/lib/automations/execute';

export const runtime = 'nodejs';
export const maxDuration = 180;

const Input = z.object({ slotIndex: z.number().int().min(0).default(0) });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

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

  const slot = automation.slots[parsed.data.slotIndex];
  if (!slot) {
    return NextResponse.json({ error: 'slot_not_found' }, { status: 404 });
  }

  const result = await runAutomationSlot({
    automationId: automation.id,
    scheduledFor: new Date(),
    slot,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
