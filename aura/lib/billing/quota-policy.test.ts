import { describe, expect, it } from 'vitest';
import {
  effectiveTier,
  quotaSnapshotForAccount,
} from './quota-policy';

describe('quota policy', () => {
  it('keeps the regular Pro daily allowance enforceable', () => {
    expect(
      quotaSnapshotForAccount({
        plan: 'pro',
        used: 20,
        unlimited: false,
      })
    ).toEqual({
      tier: 'pro',
      used: 20,
      limit: 20,
      remaining: 0,
      unlimited: false,
    });
  });

  it('marks an explicitly allowlisted account as unlimited', () => {
    expect(
      quotaSnapshotForAccount({
        plan: 'pro',
        used: 20,
        unlimited: true,
      })
    ).toEqual({
      tier: 'pro',
      used: 20,
      limit: 20,
      remaining: 0,
      unlimited: true,
    });
  });

  it('retains the trial volume cap and Pro feature tier', () => {
    const quota = quotaSnapshotForAccount({
      plan: 'trial',
      used: 3,
      unlimited: false,
    });

    expect(effectiveTier('trial')).toBe('pro');
    expect(quota).toMatchObject({
      tier: 'pro',
      used: 3,
      limit: 10,
      remaining: 7,
      unlimited: false,
    });
  });
});
