import { describe, expect, it } from 'vitest';
import {
  isAllowedVoiceSample,
  isVoiceAvailableToUser,
  VOICE_CLONE_MAX_FILE_BYTES,
} from './voice-clone-policy';

describe('voice clone policy', () => {
  it('accepts supported MP3/WAV samples within the upload limit', () => {
    expect(
      isAllowedVoiceSample({
        filename: 'presenter.mp3',
        contentType: 'audio/mpeg',
        sizeBytes: VOICE_CLONE_MAX_FILE_BYTES,
      })
    ).toBe(true);
    expect(
      isAllowedVoiceSample({
        filename: 'presenter.wav',
        contentType: 'audio/wav',
        sizeBytes: 1024,
      })
    ).toBe(true);
  });

  it('rejects oversized or disguised samples', () => {
    expect(
      isAllowedVoiceSample({
        filename: 'presenter.wav',
        contentType: 'audio/wav',
        sizeBytes: VOICE_CLONE_MAX_FILE_BYTES + 1,
      })
    ).toBe(false);
    expect(
      isAllowedVoiceSample({
        filename: 'presenter.exe',
        contentType: 'audio/mpeg',
        sizeBytes: 1024,
      })
    ).toBe(false);
  });

  it('allows global voices and the current user own voice only', () => {
    expect(isVoiceAvailableToUser({ ownerUserId: null, enabled: true, synthesisVoiceId: 'fish:default' }, 'user-a')).toBe(true);
    expect(isVoiceAvailableToUser({ ownerUserId: 'user-a', enabled: true, synthesisVoiceId: 'fish:mine' }, 'user-a')).toBe(true);
    expect(isVoiceAvailableToUser({ ownerUserId: 'user-b', enabled: true, synthesisVoiceId: 'fish:theirs' }, 'user-a')).toBe(false);
    expect(isVoiceAvailableToUser({ ownerUserId: null, enabled: false, synthesisVoiceId: 'fish:default' }, 'user-a')).toBe(false);
    expect(isVoiceAvailableToUser({ ownerUserId: null, enabled: true, synthesisVoiceId: 'retired-id' }, 'user-a')).toBe(false);
  });
});
