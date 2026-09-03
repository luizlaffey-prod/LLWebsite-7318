import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { presignPutUrl } from '@/lib/storage/r2';

export const runtime = 'nodejs';

// Generous ceiling that covers practical bed tracks (a few minutes
// of 16-bit stereo WAV is the worst case). Tightens abuse without
// nicking real uploads.
const MAX_BYTES = 50 * 1024 * 1024;

const Input = z.object({
  filename: z.string().min(1).max(120),
  contentType: z.string().min(1).max(80),
  sizeBytes: z.number().int().min(1).max(MAX_BYTES),
});

/**
 * Hands the browser a short-lived presigned PUT URL it can use to
 * upload a background-track file directly to R2 — no proxy through
 * our serverless function, so we sidestep Vercel's 4.5 MB request
 * body limit that was killing WAV uploads.
 *
 * Returns both the upload URL (signed, ~5 min TTL) and the public
 * URL the file will be reachable at after upload. The mix endpoint
 * then takes that public URL and performs the server-side mix.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }
  if (parsed.data.sizeBytes > MAX_BYTES) {
    return NextResponse.json(
      { error: 'too_large', maxBytes: MAX_BYTES },
      { status: 413 }
    );
  }

  // Derive the storage key. Strip any path components from the
  // client filename and replace risky characters; the timestamp
  // suffix guarantees uniqueness even when the same operator
  // uploads two beds with the same name.
  const baseName =
    parsed.data.filename
      .split(/[/\\]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'upload';
  const trackId = crypto.randomUUID();
  const key = `bg-tracks/${session.user.id}/${trackId}-${baseName}`;

  try {
    const { uploadUrl, publicUrl } = presignPutUrl(key, 300);
    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error('[bg-presign] failed', err);
    return NextResponse.json(
      { error: 'presign_failed', message: err instanceof Error ? err.message : '' },
      { status: 500 }
    );
  }
}
