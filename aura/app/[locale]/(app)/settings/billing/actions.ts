'use server';

import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { getStripe, stripePriceForTier } from '@/lib/billing/stripe';
import type { PlanTier } from '@/lib/billing/plans';
import type { Locale } from '@/i18n';

export async function openBillingPortal(locale: Locale): Promise<
  { url: string } | { error: string }
> {
  const session = await getSession();
  if (!session?.user) return { error: 'unauthorized' };

  const [u] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!u?.stripeCustomerId) return { error: 'no_stripe_customer' };

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const portal = await stripe.billingPortal.sessions.create({
    customer: u.stripeCustomerId,
    return_url: `${baseUrl}/${locale}/settings/billing`,
  });
  return { url: portal.url };
}

export async function changePlan(
  tier: PlanTier,
  locale: Locale
): Promise<{ url: string } | { ok: true } | { error: string }> {
  const session = await getSession();
  if (!session?.user) return { error: 'unauthorized' };

  const [u] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // No customer yet → run them through a fresh checkout.
  if (!u?.stripeCustomerId) {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: stripePriceForTier(tier), quantity: 1 }],
      subscription_data: { metadata: { user_id: session.user.id, chosen_tier: tier } },
      metadata: { user_id: session.user.id, chosen_tier: tier },
      success_url: `${baseUrl}/${locale}/settings/billing?changed=1`,
      cancel_url: `${baseUrl}/${locale}/settings/billing?canceled=1`,
    });
    if (!checkout.url) return { error: 'no_checkout_url' };
    return { url: checkout.url };
  }

  // Existing customer → update the active subscription's item to the new price.
  const subs = await stripe.subscriptions.list({
    customer: u.stripeCustomerId,
    status: 'all',
    limit: 5,
  });
  const active = subs.data.find((s) => s.status === 'active' || s.status === 'trialing');
  if (!active) {
    // Fall back to portal so the user can re-subscribe.
    const portal = await stripe.billingPortal.sessions.create({
      customer: u.stripeCustomerId,
      return_url: `${baseUrl}/${locale}/settings/billing`,
    });
    return { url: portal.url };
  }
  const itemId = active.items.data[0]?.id;
  if (!itemId) return { error: 'no_subscription_item' };

  await stripe.subscriptions.update(active.id, {
    items: [{ id: itemId, price: stripePriceForTier(tier) }],
    proration_behavior: 'create_prorations',
  });

  return { ok: true };
}
