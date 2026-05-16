import { NextResponse } from 'next/server';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { automationSchedule, automationExecution, user } from '@/lib/db/schema';
import { canSchedule } from '@/lib/billing/feature-gates';
import { effectiveTier } from '@/lib/billing/quota';
import { AutomationInput } from '@/lib/automations/schemas';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(automationSchedule)
    .where(eq(automationSchedule.userId, session.user.id))
    .orderBy(desc(automationSchedule.createdAt));

  // Attach the most recent execution per automation in a single round-trip
  // using DISTINCT ON (latest scheduled_for first per automation_schedule_id).
  let lastByAutomation: Record<string, {
    status: string;
    scheduledFor: string;
    executedAt: string | null;
    error: string | null;
    audioId: string | null;
  }> = {};
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const lastRuns = await db
      .selectDistinctOn([automationExecution.automationScheduleId], {
        automationScheduleId: automationExecution.automationScheduleId,
        status: automationExecution.status,
        scheduledFor: automationExecution.scheduledFor,
        executedAt: automationExecution.executedAt,
        error: automationExecution.error,
        audioId: automationExecution.audioId,
      })
      .from(automationExecution)
      .where(inArray(automationExecution.automationScheduleId, ids))
      .orderBy(
        automationExecution.automationScheduleId,
        desc(automationExecution.scheduledFor)
      );

    lastByAutomation = Object.fromEntries(
      lastRuns.map((r) => [
        r.automationScheduleId,
        {
          status: r.status,
          scheduledFor: r.scheduledFor.toISOString(),
          executedAt: r.executedAt?.toISOString() ?? null,
          error: r.error,
          audioId: r.audioId,
        },
      ])
    );
  }

  // Count delivery endpoints per user — surfaced as a single number in the UI.
  const [deliveryCount] = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM delivery_endpoint WHERE user_id = ${session.user.id} AND enabled = true`
  ).then((r) => (r.rows ?? []) as { count: number }[]);
  const deliveryEndpoints = Number(deliveryCount?.count ?? 0);

  const automations = rows.map((r) => ({
    ...r,
    lastRun: lastByAutomation[r.id] ?? null,
  }));

  return NextResponse.json({ automations, deliveryEndpoints });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  if (!canSchedule(tier)) {
    return NextResponse.json(
      { error: 'feature_not_available', requires: 'standard' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = AutomationInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(automationSchedule)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      slots: parsed.data.slots,
      durationSeconds: parsed.data.durationSeconds,
      language: parsed.data.language,
      voiceId: parsed.data.voiceId,
      speed: parsed.data.speed,
      bgTrackUrl: parsed.data.bgTrackUrl ?? null,
      duckAudio: parsed.data.duckAudio,
      includeWeather: parsed.data.includeWeather,
      weatherFormat: parsed.data.weatherFormat,
      geographicScope: parsed.data.geographicScope,
      location: parsed.data.location ?? null,
      bias: parsed.data.bias,
      timezone: parsed.data.timezone,
      enabled: parsed.data.enabled,
    })
    .returning({ id: automationSchedule.id });

  return NextResponse.json({ id: created.id });
}
