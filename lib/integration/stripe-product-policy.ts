import type Stripe from 'stripe';

export type StudioStripePlan = 'studio_pro' | 'enterprise';

export function studioStripePlan(
  subscription: Stripe.Subscription
): StudioStripePlan | null {
  const priceId = subscription.items.data[0]?.price.id;
  const metadataPlan = subscription.metadata?.studio_pro_plan;
  const proPrice = process.env.STRIPE_PRICE_STUDIO_PRO;
  const enterprisePrice = process.env.STRIPE_PRICE_STUDIO_ENTERPRISE;

  if (priceId && enterprisePrice && priceId === enterprisePrice) {
    return 'enterprise';
  }
  if (priceId && proPrice && priceId === proPrice) return 'studio_pro';
  if (metadataPlan === 'enterprise' || metadataPlan === 'studio_pro') {
    return metadataPlan;
  }
  return null;
}

export function isStudioProStripeSubscription(
  subscription: Stripe.Subscription
): boolean {
  return studioStripePlan(subscription) !== null;
}

export function boundedStudioMetadataInt(
  subscription: Stripe.Subscription,
  key: string,
  fallback: number,
  min: number,
  max: number
) {
  const value = Number(subscription.metadata?.[key]);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
