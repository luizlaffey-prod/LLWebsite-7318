import { Hono } from 'hono';
import { database } from '../database';
import { subscriptions, plans, originals, subscriptionOriginals } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { userHasAccessToOriginal, getUserAccessibleOriginals, createSubscriptionWithOriginals } from '../auth/authorization';

const app = new Hono().basePath('/api/subscriptions');

/**
 * POST /api/subscriptions
 * Create a new subscription
 * 
 * Body:
 * {
 *   planId: number,           // Required
 *   originalId?: number       // Required if plan.allows_multiple = false
 * }
 * 
 * Uses userId from auth context (c.get('userId'))
 */
app.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<{ planId: number; originalId?: number }>();
    const { planId, originalId } = body;

    if (!planId) {
      return c.json({ error: 'planId is required' }, 400);
    }

    // Get the plan
    const [plan] = await database.select().from(plans).where(eq(plans.id, planId));
    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    // Validate originalId if plan doesn't allow multiple
    if (!plan.allows_multiple && !originalId) {
      return c.json(
        { error: 'originalId is required for single-original plans' },
        400
      );
    }

    if (originalId) {
      // Verify original exists
      const [original] = await database
        .select()
        .from(originals)
        .where(eq(originals.id, originalId));
      if (!original) {
        return c.json({ error: 'Original not found' }, 404);
      }
    }

    // Create subscription with originals
    const subscription = await createSubscriptionWithOriginals(
      userId,
      planId,
      originalId
    );

    return c.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return c.json(
      {
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/subscriptions/me
 * Get current user's subscriptions with details
 */
app.get('/me', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userSubs = await database
      .select({
        id: subscriptions.id,
        planId: subscriptions.plan_id,
        status: subscriptions.status,
        startDate: subscriptions.start_date,
        endDate: subscriptions.end_date,
        createdAt: subscriptions.created_at,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, 'active')
        )
      );

    return c.json({
      subscriptions: userSubs,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return c.json({ error: 'Failed to fetch subscriptions' }, 500);
  }
});

/**
 * GET /api/me/originals
 * Get all originals the current user has access to
 * This is the SOURCE OF TRUTH for frontend authorization
 */
app.get('/me/originals', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userOriginals = await getUserAccessibleOriginals(userId);

    return c.json({
      originals: userOriginals,
    });
  } catch (error) {
    console.error('Error fetching user originals:', error);
    return c.json({ error: 'Failed to fetch originals' }, 500);
  }
});

/**
 * GET /api/subscriptions/:id
 * Get subscription details by ID
 */
app.get('/:id', async (c) => {
  try {
    const subscriptionId = parseInt(c.req.param('id'), 10);
    if (isNaN(subscriptionId)) {
      return c.json({ error: 'Invalid subscription ID' }, 400);
    }

    const [subscription] = await database
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    return c.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return c.json({ error: 'Failed to fetch subscription' }, 500);
  }
});

/**
 * GET /api/subscriptions/:id/originals
 * Get all originals linked to a subscription
 */
app.get('/:id/originals', async (c) => {
  try {
    const subscriptionId = parseInt(c.req.param('id'), 10);
    if (isNaN(subscriptionId)) {
      return c.json({ error: 'Invalid subscription ID' }, 400);
    }

    const linkedOriginals = await database
      .select({
        id: originals.id,
        slug: originals.slug,
        name: originals.name,
      })
      .from(subscriptionOriginals)
      .innerJoin(
        originals,
        eq(subscriptionOriginals.original_id, originals.id)
      )
      .where(eq(subscriptionOriginals.subscription_id, subscriptionId));

    return c.json({
      originals: linkedOriginals,
    });
  } catch (error) {
    console.error('Error fetching subscription originals:', error);
    return c.json({ error: 'Failed to fetch originals' }, 500);
  }
});

/**
 * POST /api/subscriptions/:id/cancel
 * Cancel a subscription
 */
app.post('/:id/cancel', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const subscriptionId = parseInt(c.req.param('id'), 10);
    if (isNaN(subscriptionId)) {
      return c.json({ error: 'Invalid subscription ID' }, 400);
    }

    // Verify subscription belongs to user
    const [subscription] = await database
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription || subscription.user_id !== userId) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    // Cancel it
    await database
      .update(subscriptions)
      .set({ status: 'canceled' })
      .where(eq(subscriptions.id, subscriptionId));

    return c.json({
      success: true,
      message: 'Subscription cancelled',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return c.json({ error: 'Failed to cancel subscription' }, 500);
  }
});

export default app;
