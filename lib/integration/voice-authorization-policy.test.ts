import { describe, expect, it } from 'vitest';
import { isVoiceAuthorized } from './voice-authorization-policy';

describe('voice authorization provider retirement', () => {
  it('authorizes an enabled global active-engine voice', () => {
    expect(
      isVoiceAuthorized(
        { ownerUserId: null, enabled: true, synthesisVoiceId: 'fish:default' },
        false,
      ),
    ).toBe(true);
  });

  it('rejects a retired-provider voice even when it remains enabled historically', () => {
    expect(
      isVoiceAuthorized(
        { ownerUserId: null, enabled: true, synthesisVoiceId: 'legacy-id' },
        false,
      ),
    ).toBe(false);
  });

  it('keeps ownership and enabled checks for active-engine clones', () => {
    expect(
      isVoiceAuthorized(
        { ownerUserId: 'owner', enabled: true, synthesisVoiceId: 'fish:clone' },
        true,
      ),
    ).toBe(true);
    expect(
      isVoiceAuthorized(
        { ownerUserId: 'owner', enabled: true, synthesisVoiceId: 'fish:clone' },
        false,
      ),
    ).toBe(false);
    expect(
      isVoiceAuthorized(
        { ownerUserId: null, enabled: false, synthesisVoiceId: 'fish:default' },
        false,
      ),
    ).toBe(false);
  });
});
