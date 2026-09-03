import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user, voice as voiceTable } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canCloneVoice } from '@/lib/billing/feature-gates';
import { deleteObject, downloadObject } from '@/lib/storage/r2';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import {
  isAllowedVoiceSample,
  VOICE_CLONE_MAX_FILE_BYTES,
  VOICE_CLONE_MAX_FILES,
} from '@/lib/tts/voice-clone-policy';
import {
  findReusableFishModel,
  parseFishModelId,
} from '@/lib/tts/fish-audio-contract';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SLUG_RE = /^[a-z0-9-]+$/;

const Sample = z.object({
  key: z.string().min(1).max(300),
  filename: z.string().min(1).max(120),
  contentType: z.string().min(1).max(80),
  sizeBytes: z.number().int().positive().max(VOICE_CLONE_MAX_FILE_BYTES),
});

const Input = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional(),
  language: z.enum(['en', 'pt', 'es']).default('en'),
  gender: z.enum(['male', 'female', 'neutral']).default('neutral'),
  accent: z.string().trim().max(60).optional(),
  consent: z.literal(true),
  samples: z.array(Sample).min(1).max(VOICE_CLONE_MAX_FILES),
});

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
  if (!canCloneVoice(effectiveTier(u?.plan))) {
    return NextResponse.json(
      { error: 'feature_not_available', message: 'Voice cloning requires the Pro plan.' },
      { status: 403 }
    );
  }

  const fishKey = process.env.FISHAUDIO_API_KEY || process.env.FISH_API_KEY;
  if (!fishKey) {
    return NextResponse.json(
      { error: 'voice_engine_not_configured', message: 'Voice synthesis is not configured.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  const samplePrefix = `voice-clones/${session.user.id}/`;
  if (
    !parsed.success ||
    parsed.data.samples.some(
      (sample) =>
        !sample.key.startsWith(samplePrefix) || !isAllowedVoiceSample(sample)
    )
  ) {
    return NextResponse.json(
      { error: 'invalid_input', message: 'Upload 1-5 valid MP3/WAV samples and confirm consent.' },
      { status: 400 }
    );
  }

  const samples = parsed.data.samples;
  let voiceId: string | undefined;
  let recoveredExistingModel = false;
  const providerTitle = `${session.user.id.slice(0, 6)}-${parsed.data.name}`;

  try {
    const out = new FormData();
    out.set('type', 'tts');
    out.set('title', providerTitle);
    if (parsed.data.description) out.set('description', parsed.data.description);
    out.set('visibility', 'private');
    out.set('train_mode', 'fast');

    try {
      for (const sample of samples) {
        const bytes = await downloadObject(sample.key);
        if (bytes.byteLength !== sample.sizeBytes || bytes.byteLength > VOICE_CLONE_MAX_FILE_BYTES) {
          return NextResponse.json(
            { error: 'invalid_sample', message: 'An uploaded sample is incomplete or too large.' },
            { status: 400 }
          );
        }
        const audioBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(audioBuffer).set(bytes);
        out.append(
          'voices',
          new Blob([audioBuffer], { type: sample.contentType }),
          sample.filename
        );
      }
    } catch (err) {
      console.error('[voice-clone] sample download failed', err);
      return NextResponse.json(
        { error: 'sample_unavailable', message: 'An uploaded sample could not be read. Please upload it again.' },
        { status: 502 }
      );
    }

    try {
      const reusable = await findRecentFishModel(fishKey, providerTitle);
      if (reusable) {
        voiceId = `fish:${reusable.id}`;
        recoveredExistingModel = true;
        console.info('[voice-clone] recovered recent voice model', {
          title: providerTitle,
          modelIdSuffix: reusable.id.slice(-6),
        });
      } else {
        const res = await fetchWithRetry(
          'https://api.fish.audio/model',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${fishKey}` },
            body: out,
          },
          { timeoutMs: 90_000 }
        );
        const data: unknown = await res.json();
        const fishModelId = parseFishModelId(data);
        if (!fishModelId) {
          console.error('[voice-clone] missing model ID', {
            payloadType: Array.isArray(data) ? 'array' : typeof data,
            payloadKeys:
              data && typeof data === 'object' ? Object.keys(data).slice(0, 20) : [],
          });
          throw new Error('voice_engine_missing_voice_id');
        }
        voiceId = `fish:${fishModelId}`;
      }
    } catch (err) {
      console.error('[voice-clone] voice engine response failed', err);
      const errMsg = err instanceof FetchError ? err.responseText || err.message : (err instanceof Error ? err.message : 'Voice engine returned an invalid response.');
      return NextResponse.json(
        { error: 'clone_failed', message: `Voice engine error: ${errMsg}` },
        { status: 502 }
      );
    }

    if (voiceId) {
      const [existing] = await db
        .select({ id: voiceTable.id })
        .from(voiceTable)
        .where(
          and(
            eq(voiceTable.ownerUserId, session.user.id),
            eq(voiceTable.synthesisVoiceId, voiceId)
          )
        )
        .limit(1);
      if (existing) {
        return NextResponse.json({
          voice: { id: existing.id },
          recoveredExistingModel: true,
        });
      }
    }

    if (!voiceId) {
      console.error('[voice-clone] voice engine completed without a model ID');
      return NextResponse.json(
        { error: 'clone_failed', message: 'Voice engine returned an invalid response.' },
        { status: 502 }
      );
    }

    const baseSlug = parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const slug = `clone-${session.user.id.slice(0, 6)}-${SLUG_RE.test(baseSlug) ? baseSlug : 'voice'}-${Date.now().toString(36)}`;

    try {
      const [created] = await db
        .insert(voiceTable)
        .values({
          slug,
          synthesisVoiceId: voiceId,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          languages: [parsed.data.language],
          gender: parsed.data.gender,
          accent: parsed.data.accent ?? null,
          tierRequired: 'pro',
          isCloned: true,
          ownerUserId: session.user.id,
          enabled: true,
        })
        .returning({ id: voiceTable.id });

      return NextResponse.json({ voice: { id: created.id }, recoveredExistingModel });
    } catch (err) {
      console.error('[voice-clone] database insert failed', err);
      return NextResponse.json(
        { error: 'persistence_failed', message: 'The cloned voice could not be saved. Please try again.' },
        { status: 500 }
      );
    }
  } finally {
    await Promise.allSettled(samples.map((sample) => deleteObject(sample.key)));
  }
}

async function findRecentFishModel(
  apiKey: string,
  title: string
): Promise<{ id: string; title: string } | null> {
  try {
    const url = new URL('https://api.fish.audio/model');
    url.searchParams.set('self', 'true');
    url.searchParams.set('page_size', '10');
    url.searchParams.set('page_number', '1');
    url.searchParams.set('sort_by', 'created_at');
    url.searchParams.set('title', title);

    const res = await fetchWithRetry(
      url,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      },
      {
        timeoutMs: 20_000,
        delays: [1000],
      }
    );
    const payload: unknown = await res.json();
    return findReusableFishModel(payload, title);
  } catch (err) {
    // Recovery is best-effort. A listing failure must not prevent a
    // legitimate new clone from being created.
    console.warn('[voice-clone] orphan lookup failed', {
      status: err instanceof FetchError ? err.status : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
