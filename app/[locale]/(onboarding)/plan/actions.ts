'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { getStripe, stripePriceForTier } from '@/lib/billing/stripe';
import { TRIAL_DAYS } from '@/lib/billing/plans';
import type { PlanTier } from '@/lib/billing/plans';
import type { Locale } from '@/i18n';

export async function startTrialCheckout(input: {
  tier: PlanTier;
  locale: Locale;
}): Promise<{ url: string } | { error: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: 'unauthorized' };
  }

  const dbUser = (
    await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)
  )[0];

  if (!dbUser) return { error: 'unauthorized' };

  const stripe = getStripe();

  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      name: dbUser.radioName ?? dbUser.name ?? undefined,
      metadata: { user_id: dbUser.id },
    });
    customerId = customer.id;
    await db
      .update(user)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(user.id, dbUser.id));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    payment_method_collection: 'always',
    line_items: [{ price: stripePriceForTier(input.tier), quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        user_id: dbUser.id,
        chosen_tier: input.tier,
        locale: input.locale,
      },
    },
    success_url: `${baseUrl}/${input.locale}/dashboard?welcome=1`,
    cancel_url: `${baseUrl}/${input.locale}/onboarding/plan?canceled=1`,
    locale:
      input.locale === 'pt' ? 'pt-BR' : input.locale === 'es' ? 'es' : 'en',
    metadata: {
      user_id: dbUser.id,
      chosen_tier: input.tier,
    },
  });

  if (!checkoutSession.url) {
    return { error: 'no_checkout_url' };
  }

  return { url: checkoutSession.url };
}
