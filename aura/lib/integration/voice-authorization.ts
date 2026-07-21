import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { organizationMember, voice as voiceTable, type Voice } from '@/lib/db/schema';
import { IntegrationHttpError } from '@/lib/integration/authorization';
import { isVoiceAuthorized } from '@/lib/integration/voice-authorization-policy';

export { isVoiceAuthorized } from '@/lib/integration/voice-authorization-policy';
export type { VoiceAuthzFacts } from '@/lib/integration/voice-authorization-policy';

/**
 * Central authorization for which voice a Studio Pro station may use.
 *
 * The rule: a voice is usable by an organization only when it is a **global
 * catalog voice** (`ownerUserId IS NULL`) or is **owned by a member of that
 * organization**. This prevents cross-account access — e.g. a device paired
 * to org A must never be able to synthesize with a private cloned voice
 * owned by a user in org B, whether the id arrives via bootstrap, the
 * station PATCH, or a device-supplied content request.
 *
 * The decision itself lives in the pure `isVoiceAuthorized` predicate
 * (./voice-authorization-policy) so it is unit-testable without a database;
 * `resolveAuthorizedVoice` only gathers the two facts it needs (the voice row
 * and whether its owner belongs to the org) and applies the predicate.
 */

/**
 * Resolves a voice id to its row *iff* the organization is authorized to use
 * it, otherwise throws `IntegrationHttpError(403, 'voice_not_authorized')`.
 *
 * A missing/disabled voice and a cross-account voice both raise the **same**
 * 403 so callers can't use the endpoint to enumerate which voice ids exist.
 */
export async function resolveAuthorizedVoice(
  voiceId: string,
  organizationId: string
): Promise<Voice> {
  const [voice] = await db
    .select()
    .from(voiceTable)
    .where(eq(voiceTable.id, voiceId))
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
