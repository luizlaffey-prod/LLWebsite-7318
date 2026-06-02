import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import {
  automationExecution,
  automationSchedule,
  generatedAudio,
  user,
} from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXECUTIONS_LIMIT = 200;

/**
 * Operator-facing detail page for a single automation: schedule
 * config + owner + the last EXECUTIONS_LIMIT executions joined to
 * their generated audio rows (when one was produced before the
 * failure). Used to debug "automation only fired once" type reports
 * — the operator can see which slots were attempted, when they
 * fired, whether they were retried, and the exact upstream error.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const [automation] = await db
    .select({
      id: automationSchedule.id,
      name: automationSchedule.name,
      enabled: automationSchedule.enabled,
      language: automationSchedule.language,
      timezone: automationSchedule.timezone,
      bias: automationSchedule.bias,
      geographicScope: automationSchedule.geographicScope,
      location: automationSchedule.location,
      weatherCity: automationSchedule.weatherCity,
      includeWeather: automationSchedule.includeWeather,
      durationSeconds: automationSchedule.durationSeconds,
      slots: automationSchedule.slots,
      voiceId: automationSchedule.voiceId,
      speed: automationSchedule.speed,
      bgTrackUrl: automationSchedule.bgTrackUrl,
      duckAudio: automationSchedule.duckAudio,
      transitionEffects: automationSchedule.transitionEffects,
      createdAt: automationSchedule.createdAt,
      userId: automationSchedule.userId,
      userEmail: user.email,
      userName: user.name,
      radioName: user.radioName,
      plan: user.plan,
    })
    .from(automationSchedule)
    .leftJoin(user, eq(automationSchedule.userId, user.id))
    .where(eq(automationSchedule.id, id))
    .limit(1);

  if (!automation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const executions = await db
    .select({
      id: automationExecution.id,
      scheduledFor: automationExecution.scheduledFor,
      slotTime: automationExecution.slotTime,
      status: automationExecution.status,
      executedAt: automationExecution.executedAt,
      retryCount: automationExecution.retryCount,
      error: automationExecution.error,
      audioId: automationExecution.audioId,
      audioTitle: generatedAudio.title,
      audioStatus: generatedAudio.status,
      audioErrorMessage: generatedAudio.errorMessage,
      audioDuration: generatedAudio.durationSeconds,
    })
    .from(automationExecution)
    .leftJoin(
      generatedAudio,
      eq(automationExecution.audioId, generatedAudio.id)
    )
    .where(eq(automationExecution.automationScheduleId, id))
    .orderBy(desc(automationExecution.scheduledFor))
    .limit(EXECUTIONS_LIMIT);

  return NextResponse.json({ automation, executions });
}
