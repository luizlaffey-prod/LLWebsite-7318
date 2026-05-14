import { NextResponse } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  automationSchedule,
  automationExecution,
  type ScheduleSlot,
} from '@/lib/db/schema';
import { runAutomationSlot, nextRunAt } from '@/lib/automations/execute';
import { requireCronAuth } from '@/lib/cron/guard';

export const runtime = 'nodejs';
export const maxDuration = 300;

const LOOKAHEAD_MIN = 10;

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

  return NextResponse.json({ ran: true, count: results.length, results });
}
