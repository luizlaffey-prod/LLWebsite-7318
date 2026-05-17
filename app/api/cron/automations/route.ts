import { NextResponse } from 'next/server';
import { and, desc, eq, gte, lt, lte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  automationSchedule,
  automationExecution,
  generatedAudio,
  type ScheduleSlot,
} from '@/lib/db/schema';
import { runAutomationSlot, nextRunAt } from '@/lib/automations/execute';
import { requireCronAuth } from '@/lib/cron/guard';

export const runtime = 'nodejs';
export const maxDuration = 300;

const LOOKAHEAD_MIN = 10;
const RETRY_LOOKBACK_MIN = 60;
const MAX_RETRIES = 3;
const MIN_RETRY_INTERVAL_MIN = 10;
// Anything still RUNNING this long after its scheduled instant was
// almost certainly killed by the platform mid-flight (function
// timeout, OOM, deploy rollover). The catch block in runAutomationSlot
// can't fire when the process is hard-killed, so the row stays in
// 'running' forever. This sweep flips those to 'failed' so the UI
// stops showing a phantom spinner and the retry pass can pick them up.
const STALE_RUNNING_MIN = 15;

/**
 * Vercel cron: runs every 10 minutes. For each enabled automation,
 * computes the next run instant of every slot in the schedule's timezone.
 * Triggers slots whose next instant falls within the next LOOKAHEAD_MIN
 * minutes — deduplicated against the automation_execution log.
 */
export async function GET(req: Request) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  const now = new Date();
  const horizon = new Date(now.getTime() + LOOKAHEAD_MIN * 60_000);

  const active = await db
    .select()
    .from(automationSchedule)
    .where(eq(automationSchedule.enabled, true));

  const results: { automationId: string; slot: string; ok: boolean; note: string }[] = [];

  for (const automation of active) {
    for (const slot of automation.slots as ScheduleSlot[]) {
      try {
        const due = nextRunAt(slot.time, automation.timezone, now);
        if (due > horizon) continue; // not in this 10-min window

        // Dedup: was this exact slot+instant already executed?
        const existing = await db
          .select({ id: automationExecution.id })
          .from(automationExecution)
          .where(
            and(
              eq(automationExecution.automationScheduleId, automation.id),
              eq(automationExecution.slotTime, slot.time),
              gte(automationExecution.scheduledFor, new Date(due.getTime() - 60_000)),
              lte(automationExecution.scheduledFor, new Date(due.getTime() + 60_000))
            )
          )
          .limit(1);
        if (existing.length > 0) {
          results.push({
            automationId: automation.id,
            slot: slot.time,
            ok: true,
            note: 'already_executed',
          });
          continue;
        }

        const result = await runAutomationSlot({
          automationId: automation.id,
          scheduledFor: due,
          slot,
        });
        results.push({
          automationId: automation.id,
          slot: slot.time,
          ok: result.ok,
          note: result.ok ? 'dispatched' : (result.error ?? 'failed'),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        results.push({
          automationId: automation.id,
          slot: slot.time,
          ok: false,
          note: message,
        });
      }
    }
  }

  // Stale-RUNNING sweep: any execution still 'running' more than
  // STALE_RUNNING_MIN minutes after its scheduledFor was almost
  // certainly killed mid-flight by the platform. Flip to 'failed' so
  // the UI badge resolves and the retry pass below can take a swing
  // at it. We do the audio-row mirror in the same statement so the
  // operator's /audios page also clears the stuck "generating" card.
  const staleCutoff = new Date(now.getTime() - STALE_RUNNING_MIN * 60_000);
  await db
    .update(automationExecution)
    .set({
      status: 'failed',
      error: 'timed_out_or_killed',
      executedAt: now,
    })
    .where(
      and(
        eq(automationExecution.status, 'running'),
        lte(automationExecution.scheduledFor, staleCutoff)
      )
    );
  await db
    .update(generatedAudio)
    .set({
      status: 'failed',
      errorMessage: 'timed_out_or_killed',
      updatedAt: now,
    })
    .where(
      and(
        eq(generatedAudio.status, 'generating'),
        lte(generatedAudio.updatedAt, staleCutoff)
      )
    );

  // Auto-retry pass: pick failed executions from the last RETRY_LOOKBACK_MIN
  // minutes whose retryCount is still under MAX_RETRIES and whose scheduled
  // instant is at least MIN_RETRY_INTERVAL_MIN old (so we don't hammer right
  // after the failure). Each retry runs against the same execution row so
  // retryCount keeps climbing instead of producing parallel artifacts.
  const retryFloor = new Date(now.getTime() - RETRY_LOOKBACK_MIN * 60_000);
  const retryCeiling = new Date(now.getTime() - MIN_RETRY_INTERVAL_MIN * 60_000);
  const failed = await db
    .select({
      id: automationExecution.id,
      automationScheduleId: automationExecution.automationScheduleId,
      scheduledFor: automationExecution.scheduledFor,
      slotTime: automationExecution.slotTime,
      retryCount: automationExecution.retryCount,
    })
    .from(automationExecution)
    .where(
      and(
        eq(automationExecution.status, 'failed'),
        gte(automationExecution.scheduledFor, retryFloor),
        lte(automationExecution.scheduledFor, retryCeiling),
        lt(automationExecution.retryCount, MAX_RETRIES)
      )
    )
    .orderBy(desc(automationExecution.scheduledFor))
    .limit(20);

  const retries: { runId: string; ok: boolean; note: string }[] = [];
  for (const f of failed) {
    const [auto] = await db
      .select({
        slots: automationSchedule.slots,
        enabled: automationSchedule.enabled,
      })
      .from(automationSchedule)
      .where(eq(automationSchedule.id, f.automationScheduleId))
      .limit(1);
    if (!auto?.enabled) continue;
    const slot = (auto.slots as ScheduleSlot[]).find((s) => s.time === f.slotTime);
    if (!slot) continue;
    const result = await runAutomationSlot({
      automationId: f.automationScheduleId,
      scheduledFor: f.scheduledFor,
      slot,
      existingExecutionId: f.id,
    });
    retries.push({
      runId: f.id,
      ok: result.ok,
      note: result.ok ? 'retry_ok' : (result.error ?? 'retry_failed'),
    });
  }

  return NextResponse.json({
    ran: true,
    count: results.length,
    results,
    retries,
  });
}
