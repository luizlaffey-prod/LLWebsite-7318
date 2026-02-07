import { Hono } from 'hono';
import { database } from '../database';
import { subscriptions } from '../database/schema';
import { eq } from 'drizzle-orm';
import { hasAccess, getUserSubscriptions, createSubscription, getPlan } from './utils';

const app = new Hono().basePath('/api/subscriptions');

/**
 * GET /api/subscriptions/check
 * Check if user has access to a program
 * Query params: user_id, program_id
 */
app.get('/check', async (c) => {
  const userId = c.req.query('user_id');
  const programId = c.req.query('program_id');

  if (!userId || !programId) {
    return c.json({ error: 'Missing user_id or program_id' }, 400);
  }

  try {
    const hasUserAccess = await hasAccess(userId, programId);
    return c.json({ has_access: hasUserAccess });
  } catch (error) {
    console.error('Error checking access:', error);
    return c.json({ error: 'Failed to check access' }, 500);
  }
});

/**
 * GET /api/subscriptions/user/:user_id
 * Get all active subscriptions for a user
 */
app.get('/user/:user_id', async (c) => {
  const userId = c.req.param('user_id');

  try {
    const userSubs = await getUserSubscriptions(userId);
    return c.json({ subscriptions: userSubs });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return c.json({ error: 'Failed to fetch subscriptions' }, 500);
  }
});

/**
 * GET /api/subscriptions/:subscription_id
 * Get subscription details
 */
app.get('/:subscription_id', async (c) => {
  const subscriptionId = c.req.param('subscription_id');

  try {
    const result = await database
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.subscription_id, subscriptionId));

    if (!result.length) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return c.json({ error: 'Failed to fetch subscription' }, 500);
  }
});

/**
 * POST /api/subscriptions/create
 * Create a new subscription after payment
 * Body: { user_id, program_id, plan_id, payment_id }
 */
app.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, program_id, plan_id, payment_id } = body;

    // Validate required fields
    if (!user_id || !plan_id || !payment_id) {
      return c.json({ 
        error: 'Missing required fields: user_id, plan_id, payment_id' 
      }, 400);
    }

    // For non-STRATEGIC_ANNUAL plans, program_id is required
    if (plan_id !== 'STRATEGIC_ANNUAL' && !program_id) {
      return c.json({ 
        error: 'program_id required for this plan' 
      }, 400);
    }

    // Verify plan exists
    const plan = await getPlan(plan_id);
    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    // Create subscription
    await createSubscription(
      user_id,
      program_id || 'BOTH', // Placeholder for STRATEGIC_ANNUAL
      plan_id,
      payment_id
    );

    const userSubs = await getUserSubscriptions(user_id);
    return c.json({ 
      success: true,
      message: 'Subscription created successfully',
      subscriptions: userSubs 
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return c.json({ 
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/subscriptions/:subscription_id/cancel
 * Cancel a subscription
 */
app.post('/:subscription_id/cancel', async (c) => {
  const subscriptionId = c.req.param('subscription_id');

  try {
    await database
      .update(subscriptions)
      .set({ status: 'canceled' })
      .where(eq(subscriptions.subscription_id, subscriptionId));

    return c.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return c.json({ error: 'Failed to cancel subscription' }, 500);
  }
});

export default app;
