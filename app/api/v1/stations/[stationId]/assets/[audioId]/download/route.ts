import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generatedAudio, integrationContentRequest } from '@/lib/db/schema';
import {
  assertUuidParam,
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { requireUsableStudioEntitlement } from '@/lib/integration/licensing';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ stationId: string; audioId: string }> }
) {
  try {
    const { stationId, audioId } = await ctx.params;
    assertUuidParam(audioId, 'invalid_audio_id');
    const auth = await authenticateDevice(req, stationId, 'station:assets:read');
    await requireUsableStudioEntitlement(auth.organization.id);

    const [row] = await db
      .select({
        audioUrl: generatedAudio.audioUrl,
        title: generatedAudio.title,
        contentType: integrationContentRequest.assetContentType,
        sha256: integrationContentRequest.assetSha256,
        bytes: integrationContentRequest.assetBytes,
      })
      .from(integrationContentRequest)
      .innerJoin(
        generatedAudio,
        eq(generatedAudio.id, integrationContentRequest.audioId)
      )
      .where(
        and(
          eq(integrationContentRequest.stationId, stationId),
          eq(integrationContentRequest.audioId, audioId),
          eq(integrationContentRequest.status, 'ready'),
          eq(generatedAudio.status, 'ready')
        )
      )
      .limit(1);

    if (!row) return new Response('asset_not_found', { status: 404 });
    if (!row.audioUrl) return new Response('asset_not_ready', { status: 425 });

    const upstream = await fetch(row.audioUrl);
    if (!upstream.ok || !upstream.body) {
      return new Response(`upstream_${upstream.status}`, { status: 502 });
    }
    const filename = `${sanitizeFilename(row.title)}.mp3`;
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': row.contentType || 'audio/mpeg',
        ...(row.bytes ? { 'Content-Length': String(row.bytes) } : {}),
        ...(row.sha256
          ? {
              ETag: `"sha256-${row.sha256}"`,
              'X-Content-SHA256': row.sha256,
            }
          : {}),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

function sanitizeFilename(raw: string): string {
  return (
    raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'aura-bulletin'
  );
}
