import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
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
  parseElevenLabsCloneError,
  VOICE_CLONE_MAX_FILE_BYTES,
  VOICE_CLONE_MAX_FILES,
} from '@/lib/tts/voice-clone-policy';

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

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'tts_not_configured', message: 'ElevenLabs is not configured.' },
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
  let elevenVoiceId: string | undefined;
  try {
    const out = new FormData();
    out.set('name', `${session.user.id.slice(0, 6)}-${parsed.data.name}`);
    if (parsed.data.description) out.set('description', parsed.data.description);
    out.set(
      'labels',
      JSON.stringify({
        language: parsed.data.language,
        gender: parsed.data.gender,
        ...(parsed.data.accent ? { accent: parsed.data.accent } : {}),
      })
    );

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
          'files',
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
      const res = await fetchWithRetry(
        'https://api.elevenlabs.io/v1/voices/add',
        {
          method: 'POST',
          headers: { 'xi-api-key': apiKey },
          body: out,
        },
        { timeoutMs: 90_000 }
      );
      const data = (await res.json()) as {
        voice_id?: string;
        requires_verification?: boolean;
      };
      if (!data.voice_id) throw new Error('elevenlabs_missing_voice_id');
      elevenVoiceId = data.voice_id;

      if (data.requires_verification) {
        await deleteElevenLabsVoice(apiKey, elevenVoiceId);
        elevenVoiceId = undefined;
        return NextResponse.json(
          {
            error: 'voice_verification_required',
            message: 'ElevenLabs requires verification for this voice. Complete verification in ElevenLabs and try again.',
          },
          { status: 422 }
        );
      }
    } catch (err) {
      if (err instanceof FetchError) {
        const details = parseElevenLabsCloneError(err.status, err.responseText);
        return NextResponse.json(details, { status: err.status || 502 });
      }
      console.error('[voice-clone] ElevenLabs response failed', err);
      return NextResponse.json(
        { error: 'clone_failed', message: 'ElevenLabs returned an invalid response.' },
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
          elevenLabsVoiceId: elevenVoiceId,
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

      return NextResponse.json({ voice: { id: created.id } });
    } catch (err) {
      console.error('[voice-clone] database insert failed', err);
      if (elevenVoiceId) await deleteElevenLabsVoice(apiKey, elevenVoiceId);
      return NextResponse.json(
        { error: 'persistence_failed', message: 'The cloned voice could not be saved. Please try again.' },
        { status: 500 }
      );
    }
  } finally {
    await Promise.allSettled(samples.map((sample) => deleteObject(sample.key)));
  }
}

async function deleteElevenLabsVoice(apiKey: string, voiceId: string): Promise<void> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) {
      console.error('[voice-clone] orphan cleanup failed', voiceId, res.status);
    }
  } catch (err) {
    console.error('[voice-clone] orphan cleanup failed', voiceId, err);
  }
}
