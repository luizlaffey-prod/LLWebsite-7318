import Stripe from 'stripe';
import { PLANS, type PlanTier } from './plans';

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
}

export function stripePriceForTier(tier: PlanTier): string {
  const envVar = PLANS[tier].stripePriceEnvVar;
  const id = process.env[envVar];
  if (!id) {
    throw new Error(`${envVar} is not set`);
  }
  return id;
}
