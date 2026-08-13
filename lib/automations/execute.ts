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
import { fetchWeatherCities } from '@/lib/news/weather';
import { generateScript } from '@/lib/llm/script-generator';
import { todayForPrompt } from '@/lib/llm/today';
import { synthesizeBulletin } from '@/lib/tts/elevenlabs';
import { isVoiceAvailableToUser } from '@/lib/tts/voice-clone-policy';
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

  let execRowId: string;  if (existingExecutionId) {
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

  // Tracked outside the try block so the catch can flip its status
  // when something later in the chain blows up — otherwise the row
  // stays at 'generating' forever and shows as a stuck card in
  // /audios.
  let audioRowId: string | null = null;

  try {
    // 1) Pull news for the slot's categories (unless slot is
    //    weather-only — empty categories array means "skip news,
    //    just give me the weather block").
    const bias = automation.bias === 'mixed' ? 'center' : automation.bias;
    // The DB enum still includes legacy 'state'/'city' values for rows
    // written before the UI dropped them. Coerce to 'country' at the edge
    // so the news aggregator's narrower type holds.
    const scope =
      automation.geographicScope === 'global' ||
      automation.geographicScope === 'country'
        ? automation.geographicScope
        : ('country' as const);

    let shuffled: Awaited<ReturnType<typeof searchNews>>['articles'] = [];
    let headline: (typeof shuffled)[number] | null = null;
    let newsContent = '';

    const weatherOnlySlot = slot.categories.length === 0;
    if (!weatherOnlySlot) {
      const { articles } = await searchNews({
        categories: slot.categories,
        bias,
        language: automation.language,
        geographicScope: scope,
        location: automation.location ?? undefined,
        // Pull a wider pool than we'll actually read so each automation
        // run lands on different stories — without this, the same
        // automation firing at 9am every weekday would always pick the
        // most recent article first, which feels stale on day two.
        limit: 20,
      });

      if (articles.length === 0 && !automation.includeWeather) {
        // News-only slot with empty results → nothing to read. If
        // weather is enabled the run can still ship as weather-only
        // (gentler degradation than 100% failure).
        throw new Error('no_articles_found');
      }
      // Shuffle so successive runs pick a different rotation. The
      // aggregator already sorted by recency / source quality; the
      // shuffle introduces variety without throwing out signal.
      shuffled = shuffleInPlace(articles.slice());

      if (shuffled.length > 0) {
        // 2) Build content (4 stories Claude can weave into the
        // bulletin). Include the per-article published date so the
        // LLM can phrase temporal references ("today", "yesterday",
        // "earlier this week") accurately rather than guessing.
        const cats = slot.categories.join(', ');
        newsContent = [
          `All articles below should be about: ${cats}. Discard any that are clearly off-topic (e.g. sports in an economy bulletin) instead of forcing them in.`,
          '',
          ...shuffled.slice(0, 4).map((a, i) => {
            const dateTag = a.publishedAt
              ? ` [published ${a.publishedAt.slice(0, 10)}]`
              : '';
            return `${i + 1}. ${a.title}${dateTag} — ${a.description}`;
          }),
        ].join('\n');
      }
    }

    // 3) Optional weather.
    let weatherForPrompt:
      | { location: string; summary: string; format: 'separate' | 'integrated' }
      | undefined;
    // Prefer the dedicated weatherCity; fall back to the news-scope
    // location. Global automations with no news location still ship
    // weather when the operator typed a city in the dedicated field.
    const weatherCity =
      automation.weatherCity?.trim() ||
      automation.location?.trim() ||
      null;
    if (automation.includeWeather && weatherCity) {
      const { snapshots, failed } = await fetchWeatherCities(
        weatherCity,
        automation.language
      );
      if (snapshots.length > 0) {
        // Multiple cities? Concatenate with a separator the LLM can
        // recognize so each city stays distinguishable in the script.
        const summary = snapshots
          .map(
            (w) =>
              `${w.location}: ${w.tempC}°C, feels like ${w.feelsLikeC}°C, ${w.conditions}, humidity ${w.humidity}%, wind ${w.windKph} km/h`
          )
          .join(' | ');
        const location =
          snapshots.length === 1
            ? snapshots[0].location
            : snapshots.map((w) => w.location).join(', ');
        weatherForPrompt = {
          location,
          summary,
          format: automation.weatherFormat ?? 'separate',
        };
      }
      if (failed.length > 0) {
        // Don't crash the run, but log so the operator notices: the
        // city they typed couldn't be resolved by OpenWeather.
        console.warn(
          '[automation] weather lookup failed for',
          failed.join(', ')
        );
      }
    }

    // 4) Voice.
    if (!automation.voiceId) throw new Error('no_voice_configured');
    const [chosenVoice] = await db
      .select()
      .from(voiceTable)
      .where(eq(voiceTable.id, automation.voiceId))
      .limit(1);
    if (!chosenVoice || !isVoiceAvailableToUser(chosenVoice, automation.userId)) {
      throw new Error('voice_not_found');
    }

    // After potentially shuffling, headline is still null for
    // weather-only slots — that's intentional, the sourceName /
    // sourceArticleUrl columns are nullable.
    headline = shuffled[0] ?? null;

    // Bail out before persisting if there's nothing to read AT ALL
    // (no articles, no weather). The throw lands in the catch below
    // and the execution row records the reason.
    if (!headline && !weatherForPrompt) {
      throw new Error('nothing_to_read');
    }

    // 5) Persist a generatedAudio row immediately so it shows up in /audios.
    const [audio] = await db
      .insert(generatedAudio)
      .values({
        userId: automation.userId,
        title: `${automation.name} — ${slot.time}`,
        sourceName: headline?.source ?? null,
        sourceArticleUrl: headline?.url ?? null,
        originalScript: [],
        voiceId: automation.voiceId,
        speed: automation.speed,
        bgTrackUrl: automation.bgTrackUrl,
        durationSeconds: automation.durationSeconds,
        language: automation.language,
        status: 'generating',
      })
      .returning({ id: generatedAudio.id });
    audioRowId = audio.id;

    // 6) Claude script. Pass today's date rendered in the station's
    //    timezone so the model doesn't hallucinate the date from its
    //    training cutoff — tester reported a bulletin opened "Today,
    //    first of July" on June 2nd, classic LLM date drift.
    const blocks = await generateScript({
      newsContent,
      targetDurationSeconds: automation.durationSeconds,
      language: automation.language,
      today: todayForPrompt(automation.timezone, automation.language),
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
      transitionEffects: automation.transitionEffects,
    });

    // 7b) Optional server-side mix with the automation's background track.
    // We fall back to voice-only on any mix failure so a broken bg URL or
    // ffmpeg hiccup doesn't lose the bulletin. We DO capture the error
    // onto the audio row's errorMessage column so the operator notices
    // "bg failed but voice survived" instead of silently shipping a
    // mono voice when they configured background music.
    let finalBytes: Uint8Array = voiceBytes;
    let bgMixError: string | null = null;
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
        const msg = err instanceof Error ? err.message : 'unknown';
        bgMixError = `bg_mix_failed: ${msg.slice(0, 300)}`;
        console.error(
          '[automation] bg mix failed',
          automation.bgTrackUrl,
          err
        );
      }
    } else {
      console.log('[automation] no bgTrackUrl configured for', automation.id);
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
        // bgMixError, when set, means the bulletin shipped voice-only
        // even though a background track was configured. The audio is
        // still usable so status='ready' — the message is a warning
        // pointing the operator at the failed bg leg.
        errorMessage: bgMixError,
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
    // Mirror the failure onto the audio row when one was already
    // created. Without this the row sits at status='generating'
    // forever — the /audios card shows a permanent "generating"
    // spinner with no way to retry or delete the dead row.
    if (audioRowId) {
      await db
        .update(generatedAudio)
        .set({
          status: 'failed',
          errorMessage: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(generatedAudio.id, audioRowId));
    }
    return { ok: false, error: message };
  }
}

/**
 * Returns the JS Date.getDay() weekday number (0=Sun..6=Sat) for the
 * given instant evaluated in `timezone`. Used by the cron tick filter
 * so a slot configured for "only Mon/Wed/Fri" knows what day it is in
 * the schedule's local time, not UTC.
 */
export function weekdayInTimezone(reference: Date, timezone: string): number {
  // Intl.DateTimeFormat with `weekday: 'short'` returns "Mon", "Tue",
  // etc. in en-US — stable enough to map to a number cheaply.
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(reference);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
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
  return computeSlotInstant(slotTime, timezone, reference, /* alwaysFuture */ true);
}

/**
 * Returns the slot's instant on the current local day in `timezone` —
 * even when that instant is already in the past relative to `reference`.
 * Used by the cron tick-window comparison so a slot whose configured time
 * passed seconds before the cron actually fired still gets picked up.
 * Pair with a tolerance window (Math.abs(now - due) < window).
 */
export function slotInstantToday(
  slotTime: string,
  timezone: string,
  reference: Date = new Date()
): Date {
  return computeSlotInstant(slotTime, timezone, reference, /* alwaysFuture */ false);
}

function computeSlotInstant(
  slotTime: string,
  timezone: string,
  reference: Date,
  alwaysFuture: boolean
): Date {
  const [hStr, mStr] = slotTime.split(':');
  const h = Number(hStr);
  const m = Number(mStr);

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

  let candidate = Date.UTC(tzYear, tzMonth - 1, tzDay, h, m);

  if (alwaysFuture) {
    const tzNowMinutes = tzHour * 60 + tzMinute;
    const slotMinutes = h * 60 + m;
    if (slotMinutes <= tzNowMinutes) {
      candidate += 24 * 60 * 60 * 1000;
    }
  }

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

/**
 * Fisher–Yates shuffle. Mutates and returns the array so callers can
 * chain. Used to randomise article selection inside automations so a
 * recurring slot doesn't always pick the same most-recent story.
 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
