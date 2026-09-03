import 'server-only';
import { createHash } from 'node:crypto';
import { and, asc, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  generatedAudio,
  integrationContentRequest,
  organization,
  station,
  type IntegrationSourceReference,
} from '@/lib/db/schema';
import { resolveAuthorizedVoice } from '@/lib/integration/voice-authorization';
import { getQuota, incrementUsage } from '@/lib/billing/quota';
import {
  canRequestDuration,
  canUseVoice,
  maxCategoriesPerBulletin,
} from '@/lib/billing/feature-gates';
import {
  ContentRequestInputSchema,
  type NewsBulletinInput,
  type VoiceLinkContentInput,
} from '@/lib/integration/contracts';
import { countsAgainstBulletinQuota } from '@/lib/integration/content-quota-policy';
import { searchNews } from '@/lib/news/aggregator';
import { fetchWeatherCities } from '@/lib/news/weather';
import { generateScript } from '@/lib/llm/script-generator';
import type { ScriptBlock } from '@/lib/llm/types';
import { todayForPrompt } from '@/lib/llm/today';
import { synthesizeVoice } from '@/lib/tts/voice-synthesis';
import { audioKey, uploadAudio } from '@/lib/storage/r2';

class ContentProcessingError extends Error {
  constructor(public readonly code: string, message = code) {
    super(message);
    this.name = 'ContentProcessingError';
  }
}

export async function processContentRequest(requestId: string): Promise<void> {
  const [context] = await db
    .select({ request: integrationContentRequest, station, organization })
    .from(integrationContentRequest)
    .innerJoin(station, eq(station.id, integrationContentRequest.stationId))
    .innerJoin(organization, eq(organization.id, station.organizationId))
    .where(eq(integrationContentRequest.id, requestId))
    .limit(1);

  if (!context || context.request.status !== 'pending') return;

  const now = new Date();
  if (context.request.expiresAt <= now) {
    await db
      .update(integrationContentRequest)
      .set({ status: 'expired', completedAt: now, updatedAt: now })
      .where(
        and(
          eq(integrationContentRequest.id, requestId),
          eq(integrationContentRequest.status, 'pending')
        )
      );
    return;
  }

  const [claimed] = await db
    .update(integrationContentRequest)
    .set({ status: 'processing', startedAt: now, updatedAt: now })
    .where(
      and(
        eq(integrationContentRequest.id, requestId),
        eq(integrationContentRequest.status, 'pending')
      )
    )
    .returning({ id: integrationContentRequest.id });
  if (!claimed) return;

  let audioId: string | null = null;
  try {
    const input = ContentRequestInputSchema.parse(context.request.input);
    const billingUserId = context.organization.billingUserId;
    const quota = await getQuota(billingUserId);
    const consumesBulletinQuota = countsAgainstBulletinQuota(input.kind);
    if (consumesBulletinQuota && quota.remaining <= 0) {
      throw new ContentProcessingError('quota_exceeded');
    }
    console.info('[studio-pro-api] content quota policy', {
      requestId,
      kind: input.kind,
      consumesBulletinQuota,
      unlimitedAccount: quota.unlimited,
      bulletinQuotaUsed: quota.used,
      bulletinQuotaLimit: quota.limit,
    });
    if (!canRequestDuration(quota.tier, input.durationSeconds)) {
      throw new ContentProcessingError('duration_not_allowed');
    }
    if (
      input.kind === 'news_bulletin' &&
      input.source.mode === 'search' &&
      input.source.categories.length > maxCategoriesPerBulletin(quota.tier)
    ) {
      throw new ContentProcessingError('category_limit_exceeded');
    }

    const voiceId = input.voiceId ?? context.station.defaultVoiceId;
    if (!voiceId) throw new ContentProcessingError('no_voice_configured');

    let chosenVoice;
    try {
      chosenVoice = await resolveAuthorizedVoice(voiceId, context.organization.id);
    } catch {
      throw new ContentProcessingError('voice_not_authorized');
    }
    if (!canUseVoice(quota.tier, chosenVoice)) {
      throw new ContentProcessingError('voice_not_allowed');
    }

    const content =
      input.kind === 'voice_link'
        ? resolveVoiceLinkContent(input)
        : await resolveNewsBulletinContent(input, context.station.timezone);
    const validFrom = input.scheduledFor ? new Date(input.scheduledFor) : now;

    const [audio] = await db
      .insert(generatedAudio)
      .values({
        userId: billingUserId,
        title: content.title,
        sourceArticleUrl: content.references[0]?.url,
        sourceName: content.references[0]?.source,
        originalScript: [],
        // Record the active Fish voice when an old StudioPro configuration
        // had to be resolved through the retirement fallback.
        voiceId: chosenVoice.id,
        speed: input.speed,
        durationSeconds: input.durationSeconds,
        language: input.language,
        status: 'generating',
      })
      .returning({ id: generatedAudio.id });
    audioId = audio.id;

    await db
      .update(generatedAudio)
      .set({ originalScript: content.script, updatedAt: new Date() })
      .where(eq(generatedAudio.id, audio.id));

    const { audio: voiceBytes, durationEstimateSeconds } = await synthesizeVoice(
      content.script,
      {
        voiceId: chosenVoice.synthesisVoiceId,
        speed: input.speed,
        transitionEffects:
          input.kind === 'news_bulletin' && input.transitionEffects,
      }
    );

    // AURA no longer generates background music. Uploaded/local beds remain
    // a StudioPro playout concern; this API always returns Fish voice audio.
    const bytes = voiceBytes;

    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const uploaded = await uploadAudio(audioKey(billingUserId, audio.id), bytes);
    const completedAt = new Date();

    await db
      .update(generatedAudio)
      .set({
        audioUrl: uploaded.url,
        durationSeconds: durationEstimateSeconds,
        status: 'ready',
        updatedAt: completedAt,
      })
      .where(eq(generatedAudio.id, audio.id));

    await db
      .update(integrationContentRequest)
      .set({
        status: 'ready',
        sourceReferences: content.references,
        audioId: audio.id,
        validFrom,
        assetSha256: sha256,
        assetBytes: bytes.byteLength,
        assetContentType: 'audio/mpeg',
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(integrationContentRequest.id, requestId));

    if (consumesBulletinQuota) {
      try {
        await incrementUsage(billingUserId);
      } catch (error) {
        console.warn('[studio-pro-api] quota increment failed', requestId, error);
      }
    }
  } catch (error) {
    const completedAt = new Date();
    const code =
      error instanceof ContentProcessingError ? error.code : 'generation_failed';
    const message =
      error instanceof Error ? error.message.slice(0, 500) : 'unknown_error';

    if (audioId) {
      await db
        .update(generatedAudio)
        .set({
          status: 'failed',
          errorMessage: message,
          updatedAt: completedAt,
        })
        .where(eq(generatedAudio.id, audioId));
    }
    await db
      .update(integrationContentRequest)
      .set({
        status: 'failed',
        audioId,
        errorCode: code,
        errorMessage: message,
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(integrationContentRequest.id, requestId));
    console.error('[studio-pro-api] content request failed', requestId, code, error);
  }
}

export async function processPendingContentRequests(limit = 5) {
  const staleBefore = new Date(Date.now() - 15 * 60_000);
  await db
    .update(integrationContentRequest)
    .set({ status: 'pending', startedAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(integrationContentRequest.status, 'processing'),
        lt(integrationContentRequest.startedAt, staleBefore)
      )
    );

  const pending = await db
    .select({ id: integrationContentRequest.id })
    .from(integrationContentRequest)
    .where(eq(integrationContentRequest.status, 'pending'))
    .orderBy(asc(integrationContentRequest.createdAt))
    .limit(Math.max(1, Math.min(limit, 10)));

  const results: Array<{ id: string; processed: boolean }> = [];
  for (const row of pending) {
    await processContentRequest(row.id);
    results.push({ id: row.id, processed: true });
  }
  return results;
}

interface ResolvedContent {
  title: string;
  references: IntegrationSourceReference[];
  script: ScriptBlock[];
}

async function resolveNewsBulletinContent(
  input: NewsBulletinInput,
  timezone: string
): Promise<ResolvedContent> {
  const source = await resolveNewsSource(input);
  const weather = await resolveNewsWeather(input);
  const script = await generateScript({
    newsContent: source.newsContent,
    targetDurationSeconds: input.durationSeconds,
    language: input.language,
    today: todayForPrompt(timezone, input.language),
    weather,
  });
  return {
    title: input.title || source.title,
    references: source.references,
    script,
  };
}

function resolveVoiceLinkContent(input: VoiceLinkContentInput): ResolvedContent {
  const title = `${input.currentTrack.title} / ${input.nextTracks[0].title}`;
  const script: ScriptBlock[] = [
    { text: input.scriptText, emotion: 'NEUTRAL', duracaoSegundos: input.durationSeconds },
  ];
  return {
    title,
    references: [],
    script,
  };
}

async function resolveNewsSource(input: NewsBulletinInput): Promise<{
  title: string;
  newsContent: string;
  references: IntegrationSourceReference[];
}> {
  if (input.source.mode === 'article') {
    return {
      title: input.source.title,
      newsContent: `${input.source.title}\n\n${input.source.description}`,
      references: [
        {
          title: input.source.title,
          source: input.source.source ?? 'custom',
          url: input.source.url,
        },
      ],
    };
  }

  const bias = input.source.bias === 'mixed' ? 'center' : input.source.bias;
  const { articles } = await searchNews({
    categories: input.source.categories,
    bias,
    language: input.language,
    geographicScope: input.source.geographicScope,
    location: input.source.location,
    limit: 5,
  });
  if (articles.length === 0) {
    throw new ContentProcessingError('news_search_empty');
  }

  const references: IntegrationSourceReference[] = articles.map((item) => ({
    title: item.title,
    source: item.source,
    url: item.url,
  }));
  const newsContent = articles
    .map(
      (item, index) =>
        `# Materia ${index + 1}: ${item.title}\nFonte: ${item.source}\n${item.description}`
    )
    .join('\n\n');

  return {
    title: articles[0].title,
    newsContent,
    references,
  };
}

async function resolveNewsWeather(input: NewsBulletinInput) {
  if (!input.includeWeather || !input.weatherLocation) return undefined;
  const { snapshots, failed } = await fetchWeatherCities(
    input.weatherLocation,
    input.language
  );
  if (failed.length > 0) {
    console.warn('[studio-pro-api] weather lookup failed', failed.join(', '));
  }
  if (snapshots.length === 0) return undefined;
  return {
    location: snapshots.map((snapshot) => snapshot.location).join(', '),
    summary: snapshots
      .map(
        (snapshot) =>
          `${snapshot.location}: ${snapshot.tempC}°C, feels like ${snapshot.feelsLikeC}°C, ${snapshot.conditions}, humidity ${snapshot.humidity}%, wind ${snapshot.windKph} km/h`
      )
      .join(' | '),
    format: input.weatherFormat,
  };
}
