import { and, eq } from 'drizzle-orm';
import {
  EnergyLevelSchema,
  HumorLevelSchema,
  legacyAnnouncerProfile,
  type AnnouncerEditorialProfile,
} from '@/lib/announcers/profile';
import { VoiceLinkDraftInputSchema } from '@/lib/integration/contracts';
import {
  authenticateDevice,
  integrationErrorResponse,
} from '@/lib/integration/authorization';
import { db } from '@/lib/db/client';
import {
  stationAnnouncerProfile,
  voice as voiceTable,
} from '@/lib/db/schema';
import { requireStudioFeature } from '@/lib/integration/licensing';
import { buildVoiceLinkDraftEnvelope } from '@/lib/integration/voice-link-draft-contract';
import { generateVoiceLinkDraft } from '@/lib/llm/voice-link-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function loadAnnouncerProfile(
  stationId: string,
  voiceId: string | null,
): Promise<AnnouncerEditorialProfile | null> {
  if (!voiceId) return null;

  const [stored] = await db
    .select()
    .from(stationAnnouncerProfile)
    .where(
      and(
        eq(stationAnnouncerProfile.stationId, stationId),
        eq(stationAnnouncerProfile.voiceId, voiceId),
      ),
    )
    .limit(1);

  if (stored) {
    const humor = HumorLevelSchema.safeParse(stored.humorLevel);
    const energy = EnergyLevelSchema.safeParse(stored.energyLevel);
    return {
      stationId,
      voiceId,
      personality: stored.personality,
      deliveryStyle: stored.deliveryStyle,
      exampleScripts: stored.exampleScripts,
      signatures: stored.signatures,
      editorialPreferences: stored.editorialPreferences,
      avoidances: stored.avoidances,
      pronunciationGuide: stored.pronunciationGuide,
      humorLevel: humor.success ? humor.data : 'balanced',
      energyLevel: energy.success ? energy.data : 'balanced',
      reactionsEnabled: stored.reactionsEnabled,
    };
  }

  const [selectedVoice] = await db
    .select({ description: voiceTable.description })
    .from(voiceTable)
    .where(eq(voiceTable.id, voiceId))
    .limit(1);
  return legacyAnnouncerProfile(selectedVoice?.description, stationId, voiceId);
}

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

    const selectedVoiceId = parsed.data.voiceId ?? auth.station.defaultVoiceId;
    const announcerProfile = await loadAnnouncerProfile(
      stationId,
      selectedVoiceId ?? null,
    );
    console.info('[studio-pro-api] voice link editorial profile', {
      stationId,
      voiceId: selectedVoiceId ?? null,
      profileApplied: Boolean(announcerProfile),
      humorLevel: announcerProfile?.humorLevel ?? null,
      signaturesConfigured: Boolean(announcerProfile?.signatures),
      editorialConfigured: Boolean(announcerProfile?.editorialPreferences),
      avoidancesConfigured: Boolean(announcerProfile?.avoidances),
    });

    const scriptText = await generateVoiceLinkDraft(
      parsed.data,
      parsed.data.verifiedFact,
      announcerProfile,
    );
    return Response.json(
      buildVoiceLinkDraftEnvelope(scriptText, parsed.data.verifiedFact),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
