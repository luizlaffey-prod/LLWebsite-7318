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
  voice: { ownerUserId: string | null; enabled: boolean },
  userId: string
): boolean {
  return voice.enabled && (!voice.ownerUserId || voice.ownerUserId === userId);
}

export type VoiceCloneErrorCode =
  | 'invalid_api_key'
  | 'quota_exceeded'
  | 'voice_limit_reached'
  | 'missing_permissions'
  | 'invalid_sample'
  | 'clone_failed';

export function parseElevenLabsCloneError(
  status: number,
  responseText: string | undefined
): { error: VoiceCloneErrorCode; message: string } {
  let upstreamStatus = '';
  let upstreamMessage = '';
  try {
    const parsed = JSON.parse(responseText ?? '') as {
      detail?: { status?: string; message?: string } | string;
    };
    if (typeof parsed.detail === 'string') {
      upstreamMessage = parsed.detail;
    } else {
      upstreamStatus = parsed.detail?.status ?? '';
      upstreamMessage = parsed.detail?.message ?? '';
    }
  } catch {
    // Some upstream/proxy failures are not JSON. Use the HTTP status below.
  }

  const normalized = upstreamStatus.toLowerCase();
  if (status === 401 || normalized.includes('invalid_api_key')) {
    return { error: 'invalid_api_key', message: 'The ElevenLabs API key is invalid.' };
  }
  if (status === 429 || normalized.includes('quota')) {
    return { error: 'quota_exceeded', message: 'The ElevenLabs quota is exhausted.' };
  }
  if (normalized.includes('voice_limit') || normalized.includes('voice_slots')) {
    return {
      error: 'voice_limit_reached',
      message: 'The ElevenLabs voice limit was reached. Delete an unused cloned voice and try again.',
    };
  }
  if (status === 403 || normalized.includes('permission')) {
    return {
      error: 'missing_permissions',
      message: 'This ElevenLabs API key cannot create cloned voices.',
    };
  }
  if (status === 400 || status === 413 || status === 422) {
    return {
      error: 'invalid_sample',
      message: upstreamMessage.slice(0, 240) || 'ElevenLabs rejected the audio sample.',
    };
  }
  return {
    error: 'clone_failed',
    message: upstreamMessage.slice(0, 240) || 'ElevenLabs could not clone this voice.',
  };
}
