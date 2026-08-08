/**
 * Pure authorization policy for Studio Pro voice access — no server-only, no
 * DB imports, so it is unit-testable in isolation. The DB-backed
 * `resolveAuthorizedVoice` (in ./voice-authorization) gathers the facts and
 * applies this predicate.
 */

/** Minimal shape the authorization decision depends on. */
export interface VoiceAuthzFacts {
  ownerUserId: string | null;
  enabled: boolean;
}

/**
 * A voice is usable by an organization only when it is a global catalog voice
 * (`ownerUserId === null`) or is owned by a member of that organization
 * (`ownerIsOrgMember`). This is what prevents cross-account access: a device
 * paired to org A must never synthesize with a private cloned voice owned by
 * a user in org B.
 */
export function isVoiceAuthorized(
  voice: VoiceAuthzFacts,
  ownerIsOrgMember: boolean
): boolean {
  if (!voice.enabled) return false;
  if (voice.ownerUserId === null) return true;
  return ownerIsOrgMember;
}
