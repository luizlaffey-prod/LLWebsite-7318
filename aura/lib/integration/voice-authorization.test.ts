import { describe, expect, it } from 'vitest';
import { isVoiceAuthorized } from './voice-authorization-policy';

describe('Studio Pro voice authorization', () => {
  it('allows a global catalog voice regardless of org membership', () => {
    expect(isVoiceAuthorized({ ownerUserId: null, enabled: true }, false)).toBe(true);
    expect(isVoiceAuthorized({ ownerUserId: null, enabled: true }, true)).toBe(true);
  });

  it('allows an owned voice only when the owner is a member of the org', () => {
    expect(isVoiceAuthorized({ ownerUserId: 'user-a', enabled: true }, true)).toBe(true);
  });

  it('DENIES a voice owned by a user outside the organization (cross-account)', () => {
    // The core guarantee: org B cannot use org A's private cloned voice.
    expect(isVoiceAuthorized({ ownerUserId: 'user-in-org-a', enabled: true }, false)).toBe(
      false
    );
  });

  it('denies a disabled voice even when owned by an org member', () => {
    expect(isVoiceAuthorized({ ownerUserId: 'user-a', enabled: false }, true)).toBe(false);
  });

  it('denies a disabled global voice', () => {
    expect(isVoiceAuthorized({ ownerUserId: null, enabled: false }, true)).toBe(false);
  });
});
