import type Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isStudioProStripeSubscription } from './stripe-product-policy';

beforeAll(() => {
  process.env.STRIPE_PRICE_PRO = 'price_aura_pro';
  process.env.STRIPE_PRICE_STUDIO_PRO = 'price_studio_pro';
  process.env.STRIPE_PRICE_STUDIO_ENTERPRISE = 'price_studio_enterprise';
});

afterAll(() => {
  delete process.env.STRIPE_PRICE_PRO;
  delete process.env.STRIPE_PRICE_STUDIO_PRO;
  delete process.env.STRIPE_PRICE_STUDIO_ENTERPRISE;
});

describe('Studio Pro Stripe classification', () => {
  it('does not grant desktop rights for the existing AURA Pro price', () => {
    expect(isStudioProStripeSubscription(subscription('price_aura_pro'))).toBe(
      false
    );
  });

  it('recognizes only configured Studio Pro desktop prices', () => {
    expect(isStudioProStripeSubscription(subscription('price_studio_pro'))).toBe(
      true
    );
    expect(
      isStudioProStripeSubscription(subscription('price_studio_enterprise'))
    ).toBe(true);
  });

  it('supports an explicit server-managed Studio Pro plan metadata override', () => {
    expect(
      isStudioProStripeSubscription(
        subscription('price_custom', { studio_pro_plan: 'studio_pro' })
      )
    ).toBe(true);
  });
});

function subscription(
  priceId: string,
  metadata: Record<string, string> = {}
): Stripe.Subscription {
  return {
    metadata,
    items: { data: [{ price: { id: priceId } }] },
  } as unknown as Stripe.Subscription;
}
