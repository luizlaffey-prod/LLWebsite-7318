import { describe, expect, it } from 'vitest';
import {
  bulletinQuotaPolicy,
  emailInList,
  UNLIMITED_QUOTA_LIMIT,
} from './account-quota-policy';

describe('bulletinQuotaPolicy', () => {
  it('keeps the product operator unlimited', () => {
    expect(
      bulletinQuotaPolicy({
        tier: 'pro',
        isTrial: false,
        isUnmetered: true,
      })
    ).toEqual({ limit: UNLIMITED_QUOTA_LIMIT, unlimited: true });
  });

  it('preserves the tighter trial allowance for customers', () => {
    const policy = bulletinQuotaPolicy({
      tier: 'pro',
      isTrial: true,
      isUnmetered: false,
    });
    expect(policy.unlimited).toBe(false);
    expect(policy.limit).toBeGreaterThan(0);
    expect(policy.limit).toBeLessThan(UNLIMITED_QUOTA_LIMIT);
  });

  it('preserves the configured paid-plan allowance for customers', () => {
    const policy = bulletinQuotaPolicy({
      tier: 'standard',
      isTrial: false,
      isUnmetered: false,
    });
    expect(policy.unlimited).toBe(false);
    expect(policy.limit).toBeGreaterThan(0);
    expect(policy.limit).toBeLessThan(UNLIMITED_QUOTA_LIMIT);
  });

  it('matches only explicitly listed generation accounts', () => {
    const configured = 'owner@example.com, reference@example.com';
    expect(emailInList(configured, 'OWNER@example.com')).toBe(true);
    expect(emailInList(configured, 'customer@example.com')).toBe(false);
    expect(emailInList(undefined, 'owner@example.com')).toBe(false);
  });
});
