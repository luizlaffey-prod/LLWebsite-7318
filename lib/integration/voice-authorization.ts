import 'server-only';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { organizationMember, voice as voiceTable, type Voice } from '@/lib/db/schema';
import { IntegrationHttpError } from '@/lib/integration/authorization';
import { isVoiceAuthorized } from '@/lib/integration/voice-authorization-policy';

export { isVoiceAuthorized } from '@/lib/integration/voice-authorization-policy';
export type { VoiceAuthzFacts } from '@/lib/integration/voice-authorization-policy';

export async function resolveAuthorizedVoice(
  voiceId: string,
  organizationId: string
): Promise<Voice> {
  const [voice] = await db
    .select()
    .from(voiceTable)
    .where(
      or(
        eq(voiceTable.id, voiceId),
        eq(voiceTable.slug, voiceId),
        eq(voiceTable.elevenLabsVoiceId, voiceId)
      )
    )
    .limit(1);

  if (!voice) {
    throw new IntegrationHttpError(403, 'voice_not_authorized');
  }

  let ownerIsOrgMember = false;
  if (voice.ownerUserId) {
    const [member] = await db
      .select({ userId: organizationMember.userId })
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.userId, voice.ownerUserId),
          eq(organizationMember.organizationId, organizationId)
        )
      )
      .limit(1);
    ownerIsOrgMember = Boolean(member);
  }

  if (!isVoiceAuthorized(voice, ownerIsOrgMember)) {
    throw new IntegrationHttpError(403, 'voice_not_authorized');
  }
  return voice;
}
