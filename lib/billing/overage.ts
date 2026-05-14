import { eq } from 'drizzle-orm';
import { getStripe } from './stripe';
import { OVERAGE_PRICE_CENTS } from './plans';
import { db } from '@/lib/db/client';
import { usagePeriod, user } from '@/lib/db/schema';
import { and, gte } from 'drizzle-orm';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * Registers a single overage bulletin for the given user. Charges $0.50
 * via Stripe (one-time invoice item attached to the customer) and bumps
 * the local usage_period.overage counters. Returns the new overage state.
 */
export async function recordOverage(userId: string): Promise<{
  ok: true;
  count: number;
  amountCents: number;
}> {
  const [u] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u?.stripeCustomerId) throw new Error('no_stripe_customer');

  const stripe = getStripe();

  await stripe.invoiceItems.create({
    customer: u.stripeCustomerId,
    amount: OVERAGE_PRICE_CENTS,
    currency: 'usd',
    description: 'AURA bulletin overage',
    metadata: { user_id: userId, type: 'bulletin_overage' },
  });

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);

  const existing = (
    await db
      .select()
      .from(usagePeriod)
      .where(and(eq(usagePeriod.userId, userId), gte(usagePeriod.periodStart, today)))
      .limit(1)
  )[0];

  let nextCount: number;
  let nextAmount: number;

  if (existing) {
    nextCount = existing.overageCount + 1;
    nextAmount = existing.overageAmountCents + OVERAGE_PRICE_CENTS;
    await db
      .update(usagePeriod)
      .set({ overageCount: nextCount, overageAmountCents: nextAmount })
      .where(eq(usagePeriod.id, existing.id));
  } else {
    nextCount = 1;
    nextAmount = OVERAGE_PRICE_CENTS;
    await db.insert(usagePeriod).values({
      userId,
      periodStart: today,
      periodEnd: tomorrow,
      bulletinsUsed: 0,
      bulletinsLimit: 0,
      overageCount: 1,
      overageAmountCents: OVERAGE_PRICE_CENTS,
    });
  }

  return { ok: true, count: nextCount, amountCents: nextAmount };
}
