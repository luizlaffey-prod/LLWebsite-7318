import { NextResponse } from 'next/server';
import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user, subscription as subscriptionTable } from '@/lib/db/schema';
import { getStripe, stripePriceForTier } from '@/lib/billing/stripe';
import { TRIAL_DOWNGRADE_TO } from '@/lib/billing/plans';
import { requireCronAuth } from '@/lib/cron/guard';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Hourly cron: finds users whose trial just expired and downgrades their
 * Stripe subscription to the default downgrade tier (Starter).
 */
export async function GET(req: Request) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  const stripe = getStripe();
  const now = new Date();

  const expired = await db
    .select({
      id: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      downgradesTo: user.downgradesTo,
    })
    .from(user)
    .where(
      and(eq(user.plan, 'trial'), isNotNull(user.trialEndsAt), lte(user.trialEndsAt, now))
    );

  const results: { userId: string; ok: boolean; note: string }[] = [];

  for (const u of expired) {
    const targetTier = (u.downgradesTo ?? TRIAL_DOWNGRADE_TO) as 'starter' | 'standard' | 'pro';

    try {
      if (!u.stripeCustomerId) {
        await db
          .update(user)
          .set({ plan: targetTier, subscriptionStatus: 'active', updatedAt: new Date() })
          .where(eq(user.id, u.id));
        results.push({ userId: u.id, ok: true, note: 'no_stripe_customer_local_downgrade' });
        continue;
      }

      // Find the active subscription
      const subs = await stripe.subscriptions.list({
        customer: u.stripeCustomerId,
        status: 'all',
        limit: 5,
      });
      const active = subs.data.find(
        (s) => s.status === 'trialing' || s.status === 'active'
      );

      if (!active) {
        await db
          .update(user)
          .set({ plan: targetTier, updatedAt: new Date() })
          .where(eq(user.id, u.id));
        results.push({ userId: u.id, ok: true, note: 'no_active_subscription_local_downgrade' });
        continue;
      }

      const itemId = active.items.data[0]?.id;
      if (!itemId) {
        results.push({ userId: u.id, ok: false, note: 'no_subscription_item' });
        continue;
      }

      await stripe.subscriptions.update(active.id, {
        items: [{ id: itemId, price: stripePriceForTier(targetTier) }],
        proration_behavior: 'none',
        trial_end: 'now',
      });

      await db
        .update(user)
        .set({ plan: targetTier, subscriptionStatus: 'active', updatedAt: new Date() })
        .where(eq(user.id, u.id));

      // Reflect on subscription row too
      await db
        .update(subscriptionTable)
        .set({ tier: targetTier, status: 'active', updatedAt: new Date() })
        .where(eq(subscriptionTable.externalId, active.id));

      results.push({ userId: u.id, ok: true, note: 'downgraded_to_' + targetTier });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('[cron/trial-downgrade] failed', u.id, message);
      results.push({ userId: u.id, ok: false, note: message });
    }
  }

  return NextResponse.json({ ran: true, count: expired.length, results });
}
