import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { organization, studioEntitlement } from '@/lib/db/schema';
import {
  DEFAULT_STUDIO_FEATURES,
  STUDIO_PAYMENT_GRACE_DAYS,
} from '@/lib/integration/license-policy';
import {
  boundedStudioMetadataInt,
  studioStripePlan,
} from '@/lib/integration/stripe-product-policy';

export { isStudioProStripeSubscription } from '@/lib/integration/stripe-product-policy';

const ENTERPRISE_FEATURES = [
  ...DEFAULT_STUDIO_FEATURES,
  'remote_control',
  'advanced_analytics',
] as const;

export async function syncStudioEntitlementsFromStripe(
  subscription: Stripe.Subscription,
  now = new Date()
): Promise<number> {
  const config = studioProductConfig(subscription);
  const billingUserId = subscription.metadata?.user_id;
  if (!config || !billingUserId) return 0;

  const organizations = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.billingUserId, billingUserId));
  if (organizations.length === 0) return 0;

  for (const org of organizations) {
    const [existing] = await db
      .select({
        status: studioEntitlement.status,
        graceUntil: studioEntitlement.graceUntil,
      })
      .from(studioEntitlement)
      .where(eq(studioEntitlement.organizationId, org.id))
      .limit(1);
    const state = stripeEntitlementState(subscription, existing, now);
    await db
      .insert(studioEntitlement)
      .values({
        organizationId: org.id,
        status: state.status,
        planCode: config.planCode,
        source: 'stripe',
        sourceReference: subscription.id,
        features: [...config.features],
        maxStations: config.maxStations,
        maxDevicesPerStation: config.maxDevicesPerStation,
        maxConcurrentOutputs: config.maxConcurrentOutputs,
        validUntil: state.validUntil,
        graceUntil: state.graceUntil,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studioEntitlement.organizationId,
        set: {
          status: state.status,
          planCode: config.planCode,
          source: 'stripe',
          sourceReference: subscription.id,
          features: [...config.features],
          maxStations: config.maxStations,
          maxDevicesPerStation: config.maxDevicesPerStation,
          maxConcurrentOutputs: config.maxConcurrentOutputs,
          validUntil: state.validUntil,
          graceUntil: state.graceUntil,
          updatedAt: now,
        },
      });
  }
  return organizations.length;
}

function studioProductConfig(subscription: Stripe.Subscription) {
  const planCode = studioStripePlan(subscription);
  if (!planCode) return null;

  const enterprise = planCode === 'enterprise';
  return {
    planCode,
    features: enterprise ? ENTERPRISE_FEATURES : DEFAULT_STUDIO_FEATURES,
    maxStations: boundedStudioMetadataInt(
      subscription,
      'studio_max_stations',
      enterprise ? 5 : 1,
      1,
      100
    ),
    maxDevicesPerStation: boundedStudioMetadataInt(
      subscription,
      'studio_max_devices',
      enterprise ? 4 : 2,
      1,
      20
    ),
    maxConcurrentOutputs: boundedStudioMetadataInt(
      subscription,
      'studio_max_outputs',
      enterprise ? 3 : 1,
      1,
      20
    ),
  };
}

function stripeEntitlementState(
  subscription: Stripe.Subscription,
  existing: { status: string; graceUntil: Date | null } | undefined,
  now: Date
): {
  status: 'trialing' | 'active' | 'grace' | 'suspended' | 'canceled';
  validUntil: Date | null;
  graceUntil: Date | null;
} {
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  if (subscription.status === 'trialing') {
    return {
      status: 'trialing',
      validUntil: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : periodEnd,
      graceUntil: null,
    };
  }
  if (subscription.status === 'active') {
    return {
      status: 'active',
      validUntil: periodEnd
        ? new Date(
            periodEnd.getTime() + STUDIO_PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000
          )
        : null,
      graceUntil: null,
    };
  }
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    return {
      status: 'grace',
      validUntil: periodEnd,
      graceUntil:
        existing?.status === 'grace' && existing.graceUntil
          ? existing.graceUntil
          : new Date(
              now.getTime() + STUDIO_PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000
            ),
    };
  }
  if (
    subscription.status === 'canceled' ||
    subscription.status === 'incomplete_expired'
  ) {
    return { status: 'canceled', validUntil: periodEnd, graceUntil: null };
  }
  return { status: 'suspended', validUntil: periodEnd, graceUntil: null };
}
