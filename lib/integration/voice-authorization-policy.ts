export interface VoiceAuthzFacts {
  ownerUserId: string | null;
  enabled: boolean;
}

export function isVoiceAuthorized(
  voice: VoiceAuthzFacts,
  ownerIsOrgMember: boolean
): boolean {
  if (!voice.enabled) return false;
  if (voice.ownerUserId === null) return true;
  return ownerIsOrgMember;
}
