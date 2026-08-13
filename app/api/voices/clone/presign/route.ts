import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { effectiveTier } from '@/lib/billing/quota';
import { canCloneVoice } from '@/lib/billing/feature-gates';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { deleteObject, presignPutUrl } from '@/lib/storage/r2';
import {
  isAllowedVoiceSample,
  VOICE_CLONE_MAX_FILES,
  VoiceSampleDescriptor,
} from '@/lib/tts/voice-clone-policy';

export const runtime = 'nodejs';

const SampleInput = z.object({
  filename: z.string().min(1).max(120),
  contentType: z.string().min(1).max(80),
  sizeBytes: z.number().int().positive(),
});

const PresignInput = z.object({
  samples: z.array(SampleInput).min(1).max(VOICE_CLONE_MAX_FILES),
});

const CleanupInput = z.object({
  keys: z.array(z.string().min(1)).min(1).max(VOICE_CLONE_MAX_FILES),
});

async function requireCloneAccess() {
  const session = await getSession();
  if (!session?.user) return { error: 'unauthorized' as const, status: 401 };

  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!canCloneVoice(effectiveTier(u?.plan))) {
    return { error: 'feature_not_available' as const, status: 403 };
  }
  return { session };
}

export async function POST(req: Request) {
  const access = await requireCloneAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PresignInput.safeParse(body);
  if (!parsed.success || parsed.data.samples.some((sample) => !isAllowedVoiceSample(sample))) {
    return NextResponse.json(
      { error: 'invalid_samples', message: 'Upload 1-5 MP3/WAV files up to 11MB each.' },
      { status: 400 }
    );
  }

  try {
    const uploads = parsed.data.samples.map((sample) => {
      const filename = sanitizeFilename(sample.filename);
      const key = `voice-clones/${access.session.user.id}/${crypto.randomUUID()}-${filename}`;
      const { uploadUrl } = presignPutUrl(key, 300);
      const descriptor: VoiceSampleDescriptor = { key, ...sample, filename };
      return { uploadUrl, ...descriptor };
    });
    return NextResponse.json({ uploads });
  } catch (err) {
    console.error('[voice-clone-presign] failed', err);
    return NextResponse.json(
      { error: 'storage_not_configured', message: 'Voice sample storage is not configured.' },
      { status: 503 }
    );
  }
}

export async function DELETE(req: Request) {
  const access = await requireCloneAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CleanupInput.safeParse(body);
  const prefix = `voice-clones/${access.session.user.id}/`;
  if (!parsed.success || parsed.data.keys.some((key) => !key.startsWith(prefix))) {
    return NextResponse.json({ error: 'invalid_keys' }, { status: 400 });
  }

  await Promise.allSettled(parsed.data.keys.map((key) => deleteObject(key)));
  return NextResponse.json({ ok: true });
}

function sanitizeFilename(filename: string): string {
  return (
    filename
      .split(/[/\\]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'sample.mp3'
  );
}
