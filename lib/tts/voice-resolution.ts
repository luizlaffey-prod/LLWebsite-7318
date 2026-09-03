import 'server-only';
import { and, eq, isNull, like, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { voice as voiceTable, type Voice } from '@/lib/db/schema';
import { isVoiceAvailableToUser } from './voice-clone-policy';

/**
 * Resolves a user's requested voice without ever falling back to a retired
 * provider. A stale legacy selection is transparently replaced by a Fish
 * voice so existing schedules keep running while the additive migration
 * updates their stored foreign keys.
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

  if (requested && isVoiceAvailableToUser(requested, userId)) return requested;
  if (!requested || requested.synthesisVoiceId.startsWith('fish:')) return null;

  const [fallback] = await db
    .select()
    .from(voiceTable)
    .where(
      and(
        eq(voiceTable.enabled, true),
        like(voiceTable.synthesisVoiceId, 'fish:%'),
        or(isNull(voiceTable.ownerUserId), eq(voiceTable.ownerUserId, userId)),
      ),
    )
    .orderBy(voiceTable.ownerUserId, voiceTable.createdAt)
    .limit(1);

  return fallback && isVoiceAvailableToUser(fallback, userId) ? fallback : null;
}

export async function resolveGlobalFishFallback(): Promise<Voice | null> {
  const [fallback] = await db
    .select()
    .from(voiceTable)
    .where(
      and(
        eq(voiceTable.enabled, true),
        like(voiceTable.synthesisVoiceId, 'fish:%'),
        isNull(voiceTable.ownerUserId),
      ),
    )
    .orderBy(voiceTable.createdAt)
    .limit(1);
  return fallback ?? null;
}
