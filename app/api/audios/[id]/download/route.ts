import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { generatedAudio } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Streams the audio from R2 back to the browser with an `attachment` header,
 * bypassing cross-origin fetch restrictions in places where the user just
 * wants a normal browser download (no File System Access folder configured).
 *
 * Always validated against session ownership; we never proxy arbitrary URLs.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return new Response('unauthorized', { status: 401 });
  }
  const { id } = await ctx.params;

  const [row] = await db
    .select({
      audioUrl: generatedAudio.audioUrl,
      title: generatedAudio.title,
      userId: generatedAudio.userId,
    })
    .from(generatedAudio)
    .where(and(eq(generatedAudio.id, id), eq(generatedAudio.userId, session.user.id)))
    .limit(1);

  if (!row) return new Response('not_found', { status: 404 });
  if (!row.audioUrl) return new Response('not_ready', { status: 425 });

  const upstream = await fetch(row.audioUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response(`upstream_${upstream.status}`, { status: 502 });
  }

  const filename = sanitizeFilename(row.title) + '.mp3';

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
      ...(upstream.headers.get('content-length')
        ? { 'Content-Length': upstream.headers.get('content-length')! }
        : {}),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}

function sanitizeFilename(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${date}_${slug || 'bulletin'}`;
}
