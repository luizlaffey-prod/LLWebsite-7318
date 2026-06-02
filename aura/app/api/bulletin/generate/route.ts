import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { generatedAudio, voice as voiceTable, user } from '@/lib/db/schema';
import { generateScript } from '@/lib/llm/script-generator';
import { todayForPrompt } from '@/lib/llm/today';
import { synthesizeBulletin, ElevenLabsError } from '@/lib/tts/elevenlabs';
import { fetchWeatherCities } from '@/lib/news/weather';
import { uploadAudio, audioKey } from '@/lib/storage/r2';
import { getQuota, incrementUsage } from '@/lib/billing/quota';
import { canRequestDuration, canUseVoice } from '@/lib/billing/feature-gates';
import { recordOverage } from '@/lib/billing/overage';

export const runtime = 'nodejs';
export const maxDuration = 120;

const Input = z.object({
  searchId: z.string().uuid().optional(),
  article: z.object({
    title: z.string(),
    description: z.string(),
    source: z.string().optional(),
    url: z.string().url().optional(),
  }),
  voiceId: z.string().uuid(),
  speed: z.number().min(0.8).max(1.5).default(1.0),
  bgTrackUrl: z.string().url().optional(),
  durationSeconds: z.number().int().min(15).max(600),
  language: z.enum(['en', 'pt', 'es']),
  includeWeather: z.boolean().default(false),
  weatherFormat: z.enum(['separate', 'integrated']).default('separate'),
  weatherLocation: z.string().optional(),
  // Optional topic-transition sting toggle. Defaults to false on
  // manual gen so the existing "I just want voice" flow doesn't
  // change behaviour; the news UI surfaces the toggle alongside
  // weather so users can opt in.
  transitionEffects: z.boolean().default(false),
  acceptOverage: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.issues }, { status: 400 });
  }

  // Quota gate
  const quota = await getQuota(session.user.id);
  const [u] = await db
    .select({ plan: user.plan, timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const isTrial = u?.plan === 'trial';
  const stationTimezone = u?.timezone ?? 'UTC';
  let usingOverage = false;

  if (quota.remaining <= 0) {
    // Trial users cannot buy overage — they must upgrade.
    const overageAvailable = !isTrial;
    if (!parsed.data.acceptOverage || !overageAvailable) {
      return NextResponse.json(
        {
          error: 'quota_exceeded',
          quota,
          overageAvailable,
          overagePriceCents: 50,
          isTrial,
        },
        { status: 402 }
      );
    }
    usingOverage = true;
  }

  // Duration gate (tier-specific max)
  if (!canRequestDuration(quota.tier, parsed.data.durationSeconds)) {
    return NextResponse.json(
      { error: 'duration_not_allowed', tier: quota.tier, requested: parsed.data.durationSeconds },
      { status: 403 }
    );
  }

  // Verify the voice exists and is accessible
  const [chosenVoice] = await db
    .select()
    .from(voiceTable)
    .where(eq(voiceTable.id, parsed.data.voiceId))
    .limit(1);
  if (!chosenVoice) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }

  // Voice tier gate
  if (!canUseVoice(quota.tier, chosenVoice)) {
    return NextResponse.json(
      { error: 'voice_not_allowed', tier: quota.tier, requires: chosenVoice.tierRequired },
      { status: 403 }
    );
  }

  // Optional weather
  let weatherForPrompt:
    | { location: string; summary: string; format: 'separate' | 'integrated' }
    | undefined;
  if (parsed.data.includeWeather && parsed.data.weatherLocation) {
    const { snapshots, failed } = await fetchWeatherCities(
      parsed.data.weatherLocation,
      parsed.data.language
    );
    if (snapshots.length > 0) {
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
        format: parsed.data.weatherFormat,
      };
    }
    if (failed.length > 0) {
      console.warn(
        '[bulletin] weather lookup failed for',
        failed.join(', '),
        '— bulletin will ship without weather'
      );
    }
  }

  // 1. Create the placeholder DB row immediately so the UI can poll/stream.
  const [created] = await db
    .insert(generatedAudio)
    .values({
      userId: session.user.id,
      newsSearchId: parsed.data.searchId,
      title: parsed.data.article.title,
      sourceArticleUrl: parsed.data.article.url,
      sourceName: parsed.data.article.source,
      originalScript: [],
      voiceId: parsed.data.voiceId,
      speed: parsed.data.speed,
      bgTrackUrl: parsed.data.bgTrackUrl,
      durationSeconds: parsed.data.durationSeconds,
      language: parsed.data.language,
      status: 'generating',
    })
    .returning({ id: generatedAudio.id });

  const audioId = created.id;

  try {
    // 2. Generate the script with Claude.
    const script = await generateScript({
      newsContent: `${parsed.data.article.title}\n\n${parsed.data.article.description}`,
      targetDurationSeconds: parsed.data.durationSeconds,
      language: parsed.data.language,
      today: todayForPrompt(stationTimezone, parsed.data.language),
      weather: weatherForPrompt,
    });

    await db
      .update(generatedAudio)
      .set({ originalScript: script, updatedAt: new Date() })
      .where(eq(generatedAudio.id, audioId));

    // 3. Synthesize each block then concatenate.
    const { audio, durationEstimateSeconds } = await synthesizeBulletin(script, {
      elevenLabsVoiceId: chosenVoice.elevenLabsVoiceId,
      speed: parsed.data.speed,
      transitionEffects: parsed.data.transitionEffects,
    });

    // 4. Upload to R2.
    const key = audioKey(session.user.id, audioId);
    const uploaded = await uploadAudio(key, audio);

    // 5. Persist result.
    await db
      .update(generatedAudio)
      .set({
        audioUrl: uploaded.url,
        durationSeconds: durationEstimateSeconds,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(generatedAudio.id, audioId));

    // 6. Increment usage (or record overage charge).
    if (usingOverage) {
      await recordOverage(session.user.id);
    } else {
      await incrementUsage(session.user.id);
    }

    return NextResponse.json({
      audioId,
      audioUrl: uploaded.url,
      script,
      durationSeconds: durationEstimateSeconds,
    });
  } catch (err) {
    const message =
      err instanceof ElevenLabsError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown_error';

    await db
      .update(generatedAudio)
      .set({ status: 'failed', errorMessage: message, updatedAt: new Date() })
      .where(eq(generatedAudio.id, audioId));

    console.error('[bulletin/generate] failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message, audioId },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const [row] = await db
    .select()
    .from(generatedAudio)
    .where(eq(generatedAudio.id, id))
    .limit(1);
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ audio: row });
}
