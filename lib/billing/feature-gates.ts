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
export function canUseVoice(tier: PlanTier, voice: Pick<Voice, 'tierRequired'>): boolean {
  const order: PlanTier[] = ['starter', 'standard', 'pro'];
  // Voices should never require the trial tier; if they do, treat as Starter.
  const required = (voice.tierRequired === 'trial' ? 'starter' : voice.tierRequired) as PlanTier;
  return order.indexOf(tier) >= order.indexOf(required);
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

export function canCloneVoice(tier: PlanTier): boolean {
  return tier === 'pro';
}

export function canWhiteLabel(tier: PlanTier): boolean {
  return PLANS[tier].whiteLabel;
}

export function canAutoDeliver(tier: PlanTier): boolean {
  return PLANS[tier].delivery.includes('api') || PLANS[tier].delivery.includes('ftp');
}

export class FeatureGateError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FeatureGateError';
  }
}
