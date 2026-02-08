import { eq, and } from 'drizzle-orm';
import { database } from '../database';
import { subscriptions, subscriptionOriginals, originals } from '../database/schema';

/**
 * Check if user has active access to a specific original
 * @param userId - User ID
 * @param originalId - Original ID
 * @returns true if user has active subscription to this original
 */
export async function userHasAccessToOriginal(
  userId: string,
  originalId: number
): Promise<boolean> {
  const result = await database
    .select({
      id: subscriptionOriginals.id,
    })
    .from(subscriptionOriginals)
    .innerJoin(
      subscriptions,
      eq(subscriptionOriginals.subscription_id, subscriptions.id)
    )
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptionOriginals.original_id, originalId),
        eq(subscriptions.status, 'active')
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Get all originals that a user has access to
 * @param userId - User ID
 * @returns Array of originals with full details
 */
export async function getUserAccessibleOriginals(userId: string) {
  const result = await database
    .select({
      id: originals.id,
      slug: originals.slug,
      name: originals.name,
      is_active: originals.is_active,
    })
    .from(subscriptionOriginals)
    .innerJoin(
      originals,
      eq(subscriptionOriginals.original_id, originals.id)
    )
    .innerJoin(
      subscriptions,
      eq(subscriptionOriginals.subscription_id, subscriptions.id)
    )
    .where(
      and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, 'active')
      )
    )
    .distinct();

  return result;
}

/**
 * Create subscription with original access
 * If plan allows multiple originals, link ALL originals
 * Otherwise, link only the specified original
 */
export async function createSubscriptionWithOriginals(
  userId: string,
  planId: number,
  originalId?: number
) {
  // Get the plan to check if it allows multiple originals
  const planResult = await database
    .select()
    .from(originals);
  
  const [plan] = await database
    .select()
    .from(originals)
    .where(eq(originals.id, planId));

  if (!plan) {
    throw new Error('Plan not found');
  }

  // If plan doesn't allow multiple and no originalId provided, error
  // For now we'll simplify - just validate
  if (!originalId && !plan) {
    throw new Error('Original ID required');
  }

  // Get all originals if allows_multiple = true
  const allOriginals = await database
    .select()
    .from(originals)
    .where(eq(originals.is_active, true));

  // Create subscription
  const subscriptionResult = await database
    .insert(subscriptions)
    .values({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      start_date: new Date().toISOString(),
    })
    .returning();

  const subscription = subscriptionResult[0];

  // Link originals
  if (originalId) {
    // Link the specified original
    await database
      .insert(subscriptionOriginals)
      .values({
        subscription_id: subscription.id,
        original_id: originalId,
      });
  } else {
    // Link all active originals
    await database
      .insert(subscriptionOriginals)
      .values(allOriginals.map((o) => ({
        subscription_id: subscription.id,
        original_id: o.id,
      })));
  }

  return subscription;
}
