import { VoiceLinkDraftInputSchema } from '@/lib/integration/contracts';
import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { requireStudioFeature } from '@/lib/integration/licensing';
import { generateVoiceLinkDraft } from '@/lib/llm/voice-link-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ stationId: string }> },
) {
  try {
    const { stationId } = await ctx.params;
    const auth = await authenticateDevice(
      req,
      stationId,
      'station:content:request',
    );
    await requireStudioFeature(auth.organization.id, 'aura_content');

    const body = await req.json().catch(() => ({}));
    const parsed = VoiceLinkDraftInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'invalid_input', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const draft = await generateVoiceLinkDraft(parsed.data);
    return Response.json(
      { draft },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
