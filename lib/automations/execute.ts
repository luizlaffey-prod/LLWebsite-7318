import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  automationExecution,
  automationSchedule,
  generatedAudio,
  voice as voiceTable,
  type ScheduleSlot,
} from '@/lib/db/schema';
import { searchNews } from '@/lib/news/aggregator';
import { fetchWeather } from '@/lib/news/weather';
import { generateScript } from '@/lib/llm/script-generator';
import { synthesizeBulletin } from '@/lib/tts/elevenlabs';
import { uploadAudio, audioKey } from '@/lib/storage/r2';
import { incrementUsage } from '@/lib/billing/quota';
import { dispatchAudioToEndpoints } from '@/lib/delivery/dispatch';

export interface RunResult {
  ok: boolean;
  audioId?: string;
  audioUrl?: string;
  error?: string;
}

/**
 * Runs a single automation slot: search news for the slot's categories,
 * optionally pull weather, ask Claude for an emotional script, synthesize
 * audio via ElevenLabs, upload to R2, and record the execution.
 *
 * Caller provides the scheduledFor timestamp (UTC instant when the run
 * was due) and the slot definition so the same routine works for both
 * the cron dispatcher and "Run now" manual triggers.
 */
export async function runAutomationSlot(input: {
  automationId: string;
  scheduledFor: Date;
  slot: ScheduleSlot;
  /**
   * If provided, the existing execution row is updated in place — used for
   * retries (manual and automatic). The row's retryCount is incremented and
   * any prior error cleared as we re-enter the running state.
   */
  existingExecutionId?: string;
}): Promise<RunResult> {
  const { automationId, scheduledFor, slot, existingExecutionId } = input;

  const [automation] = await db
    .select()
    .from(automationSchedule)
    .where(eq(automationSchedule.id, automationId))
    .limit(1);
  if (!automation) return { ok: false, error: 'automation_not_found' };

  let execRowId: string;
  if (existingExecutionId) {
    const [prior] = await db
      .select({ id: automationExecution.id, retryCount: automationExecution.retryCount })
      .from(automationExecution)
      .where(eq(automationExecution.id, existingExecutionId))
      .limit(1);
    if (!prior) return { ok: false, error: 'execution_not_found' };
    await db
      .update(automationExecution)
      .set({
        status: 'running',
        error: null,
        retryCount: prior.retryCount + 1,
      })
      .where(eq(automationExecution.id, prior.id));
    execRowId = prior.id;
  } else {
    const [execRow] = await db
      .insert(automationExecution)
      .values({
        automationScheduleId: automation.id,
        scheduledFor,
        slotTime: slot.time,
        status: 'running',
      })
      .returning({ id: automationExecution.id });
    execRowId = execRow.id;
  }

  try {
    // 1) Pull news for the slot's categories.
    const bias = automation.bias === 'mixed' ? 'center' : automation.bias;
    const { articles } = await searchNews({
      categories: slot.categories,
      bias,
      language: automation.language,
      geographicScope: automation.geographicScope,
      location: automation.location ?? undefined,
      limit: 6,
    });

    const headline = articles[0];
    if (!headline) {
      throw new Error('no_articles_found');
    }

    // 2) Build content (top article + supporting bullets).
    const newsContent = articles
      .slice(0, 4)
      .map((a, i) => `${i + 1}. ${a.title} — ${a.description}`)
      .join('\n\n');

    // 3) Optional weather.
    let weatherForPrompt:
      | { location: string; summary: string; format: 'separate' | 'integrated' }
      | undefined;
    if (automation.includeWeather && automation.location) {
      const w = await fetchWeather(automation.location, automation.language);
      if (w) {
        weatherForPrompt = {
          location: w.location,
          summary: `${w.tempC}°C, feels like ${w.feelsLikeC}°C, ${w.conditions}, humidity ${w.humidity}%, wind ${w.windKph} km/h`,
          format: automation.weatherFormat ?? 'separate',
        };
      }
    }

    // 4) Voice.
    if (!automation.voiceId) throw new Error('no_voice_configured');
    const [chosenVoice] = await db
      .select()
      .from(voiceTable)
      .where(eq(voiceTable.id, automation.voiceId))
      .limit(1);
    if (!chosenVoice) throw new Error('voice_not_found');

    // 5) Persist a generatedAudio row immediately so it shows up in /audios.
    const [audio] = await db
      .insert(generatedAudio)
      .values({
        userId: automation.userId,
        title: `${automation.name} — ${slot.time}`,
        sourceName: headline.source,
        sourceArticleUrl: headline.url,
        originalScript: [],
        voiceId: automation.voiceId,
        speed: automation.speed,
        bgTrackUrl: automation.bgTrackUrl,
        durationSeconds: automation.durationSeconds,
        language: automation.language,
        status: 'generating',
      })
      .returning({ id: generatedAudio.id });

    // 6) Claude script.
    const blocks = await generateScript({
      newsContent,
      targetDurationSeconds: automation.durationSeconds,
      language: automation.language,
      weather: weatherForPrompt,
    });

    await db
      .update(generatedAudio)
      .set({ originalScript: blocks, updatedAt: new Date() })
      .where(eq(generatedAudio.id, audio.id));

    // 7) ElevenLabs synth.
    const { audio: voiceBytes, durationEstimateSeconds } = await synthesizeBulletin(blocks, {
      elevenLabsVoiceId: chosenVoice.elevenLabsVoiceId,
      speed: automation.speed,
    });

    // 7b) Optional server-side mix with the automation's background track.
    // We fall back to voice-only on any mix failure so a broken bg URL or
    // ffmpeg hiccup doesn't lose the bulletin.
    let finalBytes: Uint8Array = voiceBytes;
    if (automation.bgTrackUrl) {
      try {
        const { mixVoiceAndBackgroundServerSide } = await import(
          '@/lib/audio/server-mix'
        );
        finalBytes = await mixVoiceAndBackgroundServerSide({
          voiceBytes,
          bgUrl: automation.bgTrackUrl,
          duck: automation.duckAudio,
        });
      } catch (err) {
        console.warn(
          '[automation] bg mix failed, falling back to voice-only',
          automation.bgTrackUrl,
          err
        );
      }
    }

    // 8) Upload to R2.
    const key = audioKey(automation.userId, audio.id);
    const uploaded = await uploadAudio(key, finalBytes);

    await db
      .update(generatedAudio)
      .set({
        audioUrl: uploaded.url,
        durationSeconds: durationEstimateSeconds,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(generatedAudio.id, audio.id));

    // 9) Mark execution succeeded.
    await db
      .update(automationExecution)
      .set({ status: 'succeeded', audioId: audio.id, executedAt: new Date() })
      .where(eq(automationExecution.id, execRowId));

    // 10) Charge quota.
    try {
      await incrementUsage(automation.userId);
    } catch (err) {
      console.warn('[automation] quota increment failed', err);
    }

    // 11) Push to any configured delivery endpoints (FTP/HTTP/email).
    try {
      await dispatchAudioToEndpoints({
        userId: automation.userId,
        audioId: audio.id,
      });
    } catch (err) {
      console.warn('[automation] delivery dispatch failed', err);
    }

    return { ok: true, audioId: audio.id, audioUrl: uploaded.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[automation] run failed', automationId, slot.time, message);
    await db
      .update(automationExecution)
      .set({ status: 'failed', error: message, executedAt: new Date() })
      .where(eq(automationExecution.id, execRowId));
    return { ok: false, error: message };
  }
}

/**
 * Returns the next UTC Date matching the slot's HH:mm in the schedule's
 * configured timezone. If today's slot has already passed, returns
 * tomorrow's instant.
 *
 * Uses Intl.DateTimeFormat for timezone arithmetic — works in Node without
 * extra deps. The offset can be off by 1 minute on DST boundaries, which
 * we accept for now.
 */
export function nextRunAt(
  slotTime: string,
  timezone: string,
  reference: Date = new Date()
): Date {
  const [hStr, mStr] = slotTime.split(':');
  const h = Number(hStr);
  const m = Number(mStr);

  // Get current wall-clock time in the target timezone.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(reference);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const tzYear = get('year');
  const tzMonth = get('month');
  const tzDay = get('day');
  const tzHour = get('hour');
  const tzMinute = get('minute');

  // Naive guess: today at HH:mm in tz, interpreted as UTC.
  let candidate = Date.UTC(tzYear, tzMonth - 1, tzDay, h, m);

  // If the slot has already passed in the local tz, jump a day.
  const tzNowMinutes = tzHour * 60 + tzMinute;
  const slotMinutes = h * 60 + m;
  if (slotMinutes <= tzNowMinutes) {
    candidate += 24 * 60 * 60 * 1000;
  }

  // Adjust for the timezone offset: candidate was built as if HH:mm were UTC,
  // but it's actually local-tz time. Subtract the tz offset from UTC.
  // Compute offset by formatting the candidate instant.
  const candidateDate = new Date(candidate);
  const candidateInTz = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(candidateDate);
  const candidateTzHour = Number(
    candidateInTz.find((p) => p.type === 'hour')?.value ?? '0'
  );
  const candidateTzMinute = Number(
    candidateInTz.find((p) => p.type === 'minute')?.value ?? '0'
  );
  const tzMinutesActual = candidateTzHour * 60 + candidateTzMinute;
  const offsetMin = tzMinutesActual - (h * 60 + m);
  return new Date(candidate - offsetMin * 60_000);
}
