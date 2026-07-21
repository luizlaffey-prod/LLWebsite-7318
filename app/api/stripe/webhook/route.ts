import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getStripe } from '@/lib/billing/stripe';
import { db } from '@/lib/db/client';
import { user, subscription as subscriptionTable } from '@/lib/db/schema';
import { TRIAL_DAYS, TRIAL_TIER, TRIAL_DOWNGRADE_TO } from '@/lib/billing/plans';
import type { PlanTier } from '@/lib/billing/plans';
import { sendWelcomeEmail } from '@/lib/email/send';
import type { Locale } from '@/i18n';
import {
  isStudioProStripeSubscription,
  syncStudioEntitlementsFromStripe,
} from '@/lib/integration/stripe-entitlements';

export const runtime = 'nodejs';

function planFromPrice(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_STANDARD) return 'standard';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return null;
}

function subscriptionStatusOf(sub: Stripe.Subscription) {
  if (sub.status === 'trialing') return 'trialing' as const;
  if (sub.status === 'active') return 'active' as const;
  if (sub.status === 'past_due') return 'past_due' as const;
  if (sub.status === 'canceled' || sub.status === 'incomplete_expired')
    return 'canceled' as const;
  if (sub.status === 'unpaid') return 'unpaid' as const;
  return 'active' as const;
}

async function upsertSubscription(sub: Stripe.Subscription) {
  if (isStudioProStripeSubscription(sub)) {
    await syncStudioEntitlementsFromStripe(sub);
    return;
  }

  const stripeUserId = sub.metadata?.user_id;
  if (!stripeUserId) {
    console.warn('[stripe-webhook] subscription missing user_id metadata', sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const tier = planFromPrice(priceId) ?? TRIAL_TIER;
  const status = subscriptionStatusOf(sub);
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;
  const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
  const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

  const existing = (
    await db
      .select()
      .from(subscriptionTable)
      .where(eq(subscriptionTable.externalId, sub.id))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(subscriptionTable)
      .set({
        tier,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAt,
        canceledAt,
        trialEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionTable.id, existing.id));
  } else {
    await db.insert(subscriptionTable).values({
      userId: stripeUserId,
      provider: 'stripe',
      tier,
      status,
      externalId: sub.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAt,
      canceledAt,
      trialEnd,
    });
  }

  // Persist the Stripe customer id as a safety net — the checkout
  // flow already saves it, but recording it here too keeps the row
  // consistent even if a subscription was created out-of-band.
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;

  await db
    .update(user)
    .set({
      plan: status === 'trialing' ? 'trial' : tier,
      trialEndsAt: trialEnd,
      downgradesTo: status === 'trialing' ? TRIAL_DOWNGRADE_TO : null,
      subscriptionStatus: status,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, stripeUserId));
}

async function handleCheckoutCompleted(event: Stripe.CheckoutSessionCompletedEvent) {
  const sessionObj = event.data.object;
  const userId = sessionObj.metadata?.user_id;
  if (!userId) return;

  const dbUser = (
    await db.select().from(user).where(eq(user.id, userId)).limit(1)
  )[0];
  if (!dbUser) return;

  // Welcome email — non-blocking, log only on failure.
  try {
    await sendWelcomeEmail({
      to: dbUser.email,
      radioName: dbUser.radioName ?? dbUser.name ?? '',
      locale: (dbUser.locale ?? 'en') as Locale,
      trialDays: TRIAL_DAYS,
    });
  } catch (err) {
    console.error('[stripe-webhook] welcome email failed', err);
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'missing signature or secret' },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.trial_will_end':
      case 'customer.subscription.deleted':
        await upsertSubscription(event.data.object);
        break;
      default:
        // ignore other events for now
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
