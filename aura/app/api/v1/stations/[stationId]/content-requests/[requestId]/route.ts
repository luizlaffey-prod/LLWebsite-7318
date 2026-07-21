import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { integrationContentRequest } from '@/lib/db/schema';
import { contentRequestResource } from '@/lib/integration/contracts';
import {
  assertUuidParam,
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ stationId: string; requestId: string }> }
) {
  try {
    const { stationId, requestId } = await ctx.params;
    assertUuidParam(requestId, 'invalid_content_request_id');
    await authenticateDevice(req, stationId, 'station:read');
    const [row] = await db
      .select()
      .from(integrationContentRequest)
      .where(
        and(
          eq(integrationContentRequest.id, requestId),
          eq(integrationContentRequest.stationId, stationId)
        )
      )
      .limit(1);
    if (!row) {
      return Response.json({ error: 'content_request_not_found' }, { status: 404 });
    }
    return Response.json({ request: contentRequestResource(row) });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
