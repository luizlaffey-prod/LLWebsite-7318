export interface VoiceAuthzFacts {
  ownerUserId: string | null;
  enabled: boolean;
  synthesisVoiceId: string;
}

export type VoiceAuthorizationFailureCode =
  | 'voice_provider_retired'
  | 'voice_not_authorized';

export function voiceAuthorizationFailureCode(
  voice: VoiceAuthzFacts,
  ownerIsOrgMember: boolean
): VoiceAuthorizationFailureCode | null {
  if (!voice.synthesisVoiceId.startsWith('fish:')) return 'voice_provider_retired';
  if (!voice.enabled) return 'voice_not_authorized';
  if (voice.ownerUserId === null) return null;
  return ownerIsOrgMember ? null : 'voice_not_authorized';
}

export function isVoiceAuthorized(
  voice: VoiceAuthzFacts,
  ownerIsOrgMember: boolean
): boolean {
  return voiceAuthorizationFailureCode(voice, ownerIsOrgMember) === null;
}
