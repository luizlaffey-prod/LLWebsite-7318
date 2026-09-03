export const VOICE_CLONE_MAX_FILES = 5;
export const VOICE_CLONE_MAX_FILE_BYTES = 11 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set(['mp3', 'wav']);

export interface VoiceSampleDescriptor {
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export function isAllowedVoiceSample(
  sample: Pick<VoiceSampleDescriptor, 'filename' | 'contentType' | 'sizeBytes'>
): boolean {
  const extension = sample.filename.split('.').pop()?.toLowerCase() ?? '';
  return (
    sample.sizeBytes > 0 &&
    sample.sizeBytes <= VOICE_CLONE_MAX_FILE_BYTES &&
    ALLOWED_AUDIO_TYPES.has(sample.contentType.toLowerCase()) &&
    ALLOWED_AUDIO_EXTENSIONS.has(extension)
  );
}

export function isVoiceAvailableToUser(
  voice: {
    ownerUserId: string | null;
    enabled: boolean;
    synthesisVoiceId: string;
  },
  userId: string
): boolean {
  return (
    voice.enabled &&
    voice.synthesisVoiceId.startsWith('fish:') &&
    (!voice.ownerUserId || voice.ownerUserId === userId)
  );
}
