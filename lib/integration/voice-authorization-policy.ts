export interface VoiceAuthzFacts {
  ownerUserId: string | null;
  enabled: boolean;
  synthesisVoiceId: string;
}

export function isVoiceAuthorized(
  voice: VoiceAuthzFacts,
  ownerIsOrgMember: boolean
): boolean {
  if (!voice.enabled) return false;
  if (!voice.synthesisVoiceId.startsWith('fish:')) return false;
  if (voice.ownerUserId === null) return true;
  return ownerIsOrgMember;
}
