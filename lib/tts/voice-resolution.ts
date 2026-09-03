import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { voice as voiceTable, type Voice } from '@/lib/db/schema';
import { isVoiceAvailableToUser } from './voice-clone-policy';

/**
 * Resolves only the exact voice requested by the user. A missing, disabled,
 * unauthorized, or retired-provider voice fails closed so a different on-air
 * identity can never be substituted silently.
 */
export async function resolveFishVoiceForUser(
  requestedVoiceId: string,
  userId: string,
): Promise<Voice | null> {
  const [requested] = await db
    .select()
    .from(voiceTable)
    .where(eq(voiceTable.id, requestedVoiceId))
    .limit(1);

  return requested && isVoiceAvailableToUser(requested, userId)
    ? requested
    : null;
}
