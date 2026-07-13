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

  // Everything Stripe-touching is wrapped so a missing env var (secret
  // key, price id) or an upstream Stripe error surfaces as a readable
  // reason to the operator instead of a generic "try again". The
  // reason string is safe to show — it names which config is missing,
  // never a secret value.
  try {
    const [u] = await db
      .select({
        stripeCustomerId: user.stripeCustomerId,
        email: user.email,
        name: user.name,
        radioName: user.radioName,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if (!u) return { error: 'unauthorized' };

    const stripe = getStripe();
    const priceId = stripePriceForTier(tier);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // No customer yet → create the Stripe Customer up front, persist
    // its id, then run a checkout tied to it. Persisting the id here
    // (rather than only in the webhook) means the *next* plan change
    // updates the subscription in place instead of spawning a second
    // checkout.
    if (!u.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: u.email,
        name: u.radioName ?? u.name ?? undefined,
        metadata: { user_id: session.user.id },
      });
      await db
        .update(user)
        .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
        .where(eq(user.id, session.user.id));

      const checkout = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customer.id,
        payment_method_collection: 'always',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { user_id: session.user.id, chosen_tier: tier },
        },
        metadata: { user_id: session.user.id, chosen_tier: tier },
        success_url: `${baseUrl}/${locale}/settings/billing?changed=1`,
        cancel_url: `${baseUrl}/${locale}/settings/billing?canceled=1`,
      });
      if (!checkout.url) return { error: 'no_checkout_url' };
      return { url: checkout.url };
    }

    // Existing customer → update the active subscription's item.
    const subs = await stripe.subscriptions.list({
      customer: u.stripeCustomerId,
      status: 'all',
      limit: 5,
    });
    const active = subs.data.find(
      (s) => s.status === 'active' || s.status === 'trialing'
    );
    if (!active) {
      // No live subscription — run a fresh checkout so they subscribe.
      const checkout = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: u.stripeCustomerId,
        payment_method_collection: 'always',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { user_id: session.user.id, chosen_tier: tier },
        },
        metadata: { user_id: session.user.id, chosen_tier: tier },
        success_url: `${baseUrl}/${locale}/settings/billing?changed=1`,
        cancel_url: `${baseUrl}/${locale}/settings/billing?canceled=1`,
      });
      if (!checkout.url) return { error: 'no_checkout_url' };
      return { url: checkout.url };
    }
    const itemId = active.items.data[0]?.id;
    if (!itemId) return { error: 'no_subscription_item' };

    await stripe.subscriptions.update(active.id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
    });

    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'stripe_error';
    console.error('[billing/changePlan] failed:', reason);
    return { error: reason };
  }
}
