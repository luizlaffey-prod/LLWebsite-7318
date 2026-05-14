import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user, voice as voiceTable } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canCloneVoice } from '@/lib/billing/feature-gates';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SLUG_RE = /^[a-z0-9-]+$/;

const Meta = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  language: z.enum(['en', 'pt', 'es']).default('en'),
  gender: z.enum(['male', 'female', 'neutral']).default('neutral'),
  accent: z.string().max(60).optional(),
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
  const tier = effectiveTier(u?.plan);
  if (!canCloneVoice(tier)) {
    return NextResponse.json(
      { error: 'feature_not_available', requires: 'pro' },
      { status: 403 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'tts_not_configured' }, { status: 503 });
  }

  const form = await req.formData();
  const meta = Meta.safeParse({
    name: form.get('name'),
    description: form.get('description') ?? undefined,
    language: form.get('language') ?? 'en',
    gender: form.get('gender') ?? 'neutral',
    accent: form.get('accent') ?? undefined,
  });
  if (!meta.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const files = form.getAll('samples');
  if (files.length === 0) {
    return NextResponse.json({ error: 'no_samples' }, { status: 400 });
  }

  // Forward to ElevenLabs Add Voice (Instant Voice Clone).
  const out = new FormData();
  out.set('name', `${session.user.id.slice(0, 6)}-${meta.data.name}`);
  if (meta.data.description) out.set('description', meta.data.description);
  for (const f of files) {
    if (f instanceof File) {
      if (f.size > 11 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'sample_too_large', message: 'Each sample must be ≤ 11MB.' },
          { status: 413 }
        );
      }
      out.append('files', f, f.name || 'sample.mp3');
    }
  }

  let elevenVoiceId: string;
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
    const data = (await res.json()) as { voice_id?: string };
    if (!data.voice_id) throw new Error('elevenlabs_missing_voice_id');
    elevenVoiceId = data.voice_id;
  } catch (err) {
    const status = err instanceof FetchError ? err.status : 500;
    return NextResponse.json(
      { error: 'clone_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: status || 500 }
    );
  }

  const baseSlug = meta.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const slug = `clone-${session.user.id.slice(0, 6)}-${SLUG_RE.test(baseSlug) ? baseSlug : 'voice'}-${Date.now().toString(36)}`;

  const [created] = await db
    .insert(voiceTable)
    .values({
      slug,
      elevenLabsVoiceId: elevenVoiceId,
      name: meta.data.name,
      description: meta.data.description ?? null,
      languages: [meta.data.language],
      gender: meta.data.gender,
      accent: meta.data.accent ?? null,
      tierRequired: 'pro',
      isCloned: true,
      ownerUserId: session.user.id,
      enabled: true,
    })
    .returning({ id: voiceTable.id });

  return NextResponse.json({ voice: { id: created.id, elevenLabsVoiceId: elevenVoiceId } });
}
