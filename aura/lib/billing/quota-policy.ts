import {
  PLANS,
  TRIAL_BULLETINS_PER_DAY,
  TRIAL_TIER,
  type PlanTier,
} from './plans';

/** Effective tier for feature gates. Trial accounts receive Pro features. */
export function effectiveTier(plan: string | null | undefined): PlanTier {
  if (plan === 'trial') return TRIAL_TIER;
  if (plan === 'starter' || plan === 'standard' || plan === 'pro') return plan;
  return 'starter';
}

export interface QuotaSnapshot {
  tier: PlanTier;
  used: number;
  limit: number;
  remaining: number;
  /**
   * Explicitly unmetered operator accounts are not billed against the
   * customer generation allowance. The normal plan figures remain available
   * in the snapshot for diagnostics, but are not enforced or incremented.
   */
  unlimited: boolean;
}

export function quotaSnapshotForAccount(input: {
  plan: string | null | undefined;
  used: number;
  unlimited: boolean;
}): QuotaSnapshot {
  const tier = effectiveTier(input.plan);
  const limit =
    input.plan === 'trial'
      ? TRIAL_BULLETINS_PER_DAY
      : PLANS[tier].bulletinsPerDay;

  return {
    tier,
    used: input.used,
    limit,
    remaining: Math.max(0, limit - input.used),
    unlimited: input.unlimited,
  };
}
