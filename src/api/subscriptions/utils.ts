import { database } from '../database';
import { subscriptions, plans } from '../database/schema';
import { eq, and, or, isNull, gte } from 'drizzle-orm';

/**
 * Check if user has active subscription to a program
 */
export async function hasAccess(userId: string, programId: string): Promise<boolean> {
  const now = new Date().toISOString();
  
  const result = await database
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.program_id, programId),
        eq(subscriptions.status, 'active'),
        // Check expiration: end_date must be null OR in the future
        or(
          isNull(subscriptions.end_date),
          gte(subscriptions.end_date, now)
        )
      )
    );

  return result.length > 0;
}

/**
 * Get user's active subscriptions
 */
export async function getUserSubscriptions(userId: string) {
  const now = new Date().toISOString();
  
  return database
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, 'active'),
        or(
          isNull(subscriptions.end_date),
          gte(subscriptions.end_date, now)
        )
      )
    );
}

/**
 * Calculate end date based on plan billing cycle
 */
export function calculateEndDate(billingCycle: string): Date {
  const now = new Date();
  
  if (billingCycle === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else if (billingCycle === 'annual') {
    now.setFullYear(now.getFullYear() + 1);
  }
  
  return now;
}

/**
 * Get plan details
 */
export async function getPlan(planId: string) {
  const result = await database
    .select()
    .from(plans)
    .where(eq(plans.plan_id, planId));
  
  return result[0] || null;
}

/**
 * Create a subscription
 * For STRATEGIC_ANNUAL, creates TWO subscriptions (one per program)
 */
export async function createSubscription(
  userId: string,
  programId: string,
  planId: string,
  paymentId: string
) {
  const plan = await getPlan(planId);
  
  if (!plan) {
    throw new Error(`Plan ${planId} not found`);
  }

  const endDate = calculateEndDate(plan.billing_cycle).toISOString();
  const generateId = () => `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    if (planId === 'STRATEGIC_ANNUAL') {
      // Create subscriptions for BOTH programs
      await database.insert(subscriptions).values([
        {
          subscription_id: generateId(),
          user_id: userId,
          program_id: 'ZERO_POINT_ZERO',
          plan_id: planId,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate,
          auto_renew: true,
          payment_id: paymentId,
          created_at: new Date().toISOString(),
        },
        {
          subscription_id: generateId(),
          user_id: userId,
          program_id: 'LUIZ_LAFFEY_COLLECTION',
          plan_id: planId,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate,
          auto_renew: true,
          payment_id: paymentId,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      // Create single subscription for selected program
      await database.insert(subscriptions).values({
        subscription_id: generateId(),
        user_id: userId,
        program_id: programId,
        plan_id: planId,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate,
        auto_renew: true,
        payment_id: paymentId,
        created_at: new Date().toISOString(),
      });
    }

    return { success: true, endDate };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}
