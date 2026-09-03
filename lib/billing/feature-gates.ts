import { PLANS, type PlanTier } from './plans';
import type { Voice } from '@/lib/db/schema';

export interface FeatureGateInput {
  tier: PlanTier;
}

/** Whether a tier may request a bulletin of the given length. */
export function canRequestDuration(tier: PlanTier, durationSeconds: number): boolean {
  return durationSeconds <= PLANS[tier].maxDurationSeconds;
}

/** Whether a tier may use the given voice. */
export function canUseVoice(tier: PlanTier | 'trial', voice: Pick<Voice, 'tierRequired'>): boolean {
  const order: PlanTier[] = ['starter', 'standard', 'pro'];
  const userTier: PlanTier = tier === 'trial' ? 'pro' : tier;
  const required = (voice.tierRequired === 'trial' ? 'starter' : voice.tierRequired) as PlanTier;
  return order.indexOf(userTier) >= order.indexOf(required);
}

/** Whether a tier may export to the given audio format. */
export function canUseFormat(
  tier: PlanTier,
  format: 'mp3' | 'wav' | 'broadcast'
): boolean {
  return PLANS[tier].formats.includes(format);
}

export function canSchedule(tier: PlanTier): boolean {
  return PLANS[tier].scheduling !== 'none';
}

/**
 * Whether the operator may pick specific weekdays per automation slot.
 * Standard's "automação simples" fires every day; Pro unlocks per-slot
 * day-of-week restrictions (e.g. health news only Mon/Wed/Fri).
 */
export function canUseDaysOfWeek(tier: PlanTier): boolean {
  return tier === 'pro';
}

/**
 * Maximum number of news categories the operator can include in a
 * single bulletin (manual generate or automation slot). Starter is
 * restricted to one category at a time to nudge upgrades; Standard
 * and Pro are unrestricted within the catalog.
 */
export function maxCategoriesPerBulletin(tier: PlanTier): number {
  return tier === 'starter' ? 1 : Infinity;
}

export function canCloneVoice(tier: PlanTier): boolean {
  return tier === 'pro';
}

export function canWhiteLabel(tier: PlanTier): boolean {
  return PLANS[tier].whiteLabel;
}

/**
 * Whether the operator may configure any automated delivery destination
 * (local folder sync, FTP, webhook, email, RSS feed share). Starter has
 * no automation so this is implicitly false; Standard and Pro both can,
 * but Standard is capped to a single endpoint by
 * `maxDeliveryEndpoints` while Pro is uncapped.
 */
export function canAutoDeliver(tier: PlanTier): boolean {
  return tier === 'standard' || tier === 'pro';
}

/**
 * How many simultaneous delivery destinations a tier may configure.
 * Standard ships "automação simples" with one drop target; Pro is
 * uncapped so a multi-station operator can fan out to N stations.
 */
export function maxDeliveryEndpoints(tier: PlanTier): number {
  if (tier === 'pro') return Infinity;
  if (tier === 'standard') return 1;
  return 0;
}

/**
 * Whether the operator may configure a bulletin to alternate between
 * two voices (anchor + co-anchor feel). Pro-only marketing feature —
 * gate function exists so the UI / API can promise / refuse the
 * setting consistently when the implementation lands.
 */
export function canDualVoice(tier: PlanTier): boolean {
  return tier === 'pro';
}

export class FeatureGateError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FeatureGateError';
  }
}
