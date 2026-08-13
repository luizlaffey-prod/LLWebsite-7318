import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { automationSchedule, voice as voiceTable } from '@/lib/db/schema';
import { AutomationInput } from '@/lib/automations/schemas';
import { z } from 'zod';
import { isVoiceAvailableToUser } from '@/lib/tts/voice-clone-policy';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const [row] = await db
    .select()
    .from(automationSchedule)
    .where(
      and(
        eq(automationSchedule.id, id),
        eq(automationSchedule.userId, session.user.id)
      )
    )
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ automation: row });
}

const PatchInput = AutomationInput.partial().extend({
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  if (parsed.data.voiceId) {
    const [chosenVoice] = await db
      .select()
      .from(voiceTable)
      .where(eq(voiceTable.id, parsed.data.voiceId))
      .limit(1);
    if (!chosenVoice || !isVoiceAvailableToUser(chosenVoice, session.user.id)) {
      return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }

  const result = await db
    .update(automationSchedule)
    .set(updates)
    .where(
      and(
        eq(automationSchedule.id, id),
        eq(automationSchedule.userId, session.user.id)
      )
    )
    .returning({ id: automationSchedule.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const result = await db
    .delete(automationSchedule)
    .where(
      and(
        eq(automationSchedule.id, id),
        eq(automationSchedule.userId, session.user.id)
      )
    )
    .returning({ id: automationSchedule.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
