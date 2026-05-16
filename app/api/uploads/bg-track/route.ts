import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { uploadAudio } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — generous bed but caps abuse.
const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
]);

/**
 * Accepts a user-uploaded background track and stores it under their R2
 * prefix. Returns a public URL the automation editor saves into
 * automation.bgTrackUrl so the cron worker can fetch it server-side at
 * generation time.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'too_large', maxBytes: MAX_BYTES },
      { status: 413 }
    );
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'unsupported_type', got: file.type },
      { status: 415 }
    );
  }

  const ext =
    file.type.includes('wav')
      ? 'wav'
      : file.type.includes('ogg')
        ? 'ogg'
        : file.type.includes('aac') || file.type.includes('mp4')
          ? 'm4a'
          : 'mp3';
  const trackId = crypto.randomUUID();
  const key = `bg-tracks/${session.user.id}/${trackId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { url } = await uploadAudio(key, bytes, file.type || 'audio/mpeg');

  return NextResponse.json({
    url,
    bytes: bytes.length,
    filename: file.name,
  });
}
