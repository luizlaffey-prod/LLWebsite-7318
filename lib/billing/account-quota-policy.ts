import { PLANS, TRIAL_BULLETINS_PER_DAY, type PlanTier } from './plans';

export const UNLIMITED_QUOTA_LIMIT = Number.MAX_SAFE_INTEGER;

export interface BulletinQuotaPolicy {
  limit: number;
  unlimited: boolean;
}

export function emailInList(
  raw: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return (raw ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

/**
 * Explicitly allowlisted product-owner/reference accounts do not consume a
 * commercial bulletin allowance. Customer plans retain their configured
 * limits.
 */
export function bulletinQuotaPolicy(input: {
  tier: PlanTier;
  isTrial: boolean;
  isUnmetered: boolean;
}): BulletinQuotaPolicy {
  if (input.isUnmetered) {
    return { limit: UNLIMITED_QUOTA_LIMIT, unlimited: true };
  }
  return {
    limit: input.isTrial
      ? TRIAL_BULLETINS_PER_DAY
      : PLANS[input.tier].bulletinsPerDay,
    unlimited: false,
  };
}
