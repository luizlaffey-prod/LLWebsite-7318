import { Hono } from 'hono';
import { createSubscription, getPlan } from '../subscriptions/utils';
import { database } from '../database';
import { subscriptions, subscriptionOriginals, originals } from '../database/schema';
import { eq } from 'drizzle-orm';

/**
 * PayPal Integration for Luiz Laffey Productions
 * 
 * Flow:
 * 1. Frontend calls /api/paypal/create-order with program_id, plan_id
 * 2. Backend creates PayPal order and returns order ID
 * 3. Frontend shows PayPal checkout UI
 * 4. User approves payment
 * 5. Frontend calls /api/paypal/capture-order with orderID, user_id
 * 6. Backend verifies payment and creates subscription record
 * 7. PayPal sends webhook notification to /api/paypal/webhook
 * 8. Backend creates subscription via webhook
 */

const app = new Hono().basePath('/api/paypal');

/**
 * Helper to make PayPal API calls
 * Uses env variables: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE
 */
async function paypalRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  env?: Record<string, any>
) {
  const clientId = env?.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const secret = env?.PAYPAL_SECRET || process.env.PAYPAL_SECRET;
  const mode = env?.PAYPAL_MODE || process.env.PAYPAL_MODE || 'sandbox';

  const baseUrl = mode === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com';

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal API error:', error);
      throw new Error(`PayPal API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('PayPal request failed:', error);
    throw error;
  }
}

/**
 * POST /api/paypal/create-order
 * Create a PayPal order for subscription
 * Body: { program_id, plan_id, user_id, user_email }
 */
app.post('/create-order', async (c) => {
  try {
    const body = await c.req.json();
    const { program_id, plan_id, user_id, user_email } = body;

    if (!plan_id || !user_id) {
      return c.json({ error: 'Missing plan_id or user_id' }, 400);
    }

    // Get plan details
    const plan = await getPlan(plan_id);
    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    const amount = plan.price?.toString() || '0';
    
    // Determine return URL (in production, this should be your domain)
    const returnUrl = process.env.RETURN_URL || 'http://localhost:5173/checkout/success';

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
          custom_id: JSON.stringify({
            user_id,
            program_id,
            plan_id,
            user_email,
          }),
          description: `${plan.plan_name} - ${program_id || 'Multiple Programs'}`,
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: `${returnUrl}?cancel=true`,
        brand_name: 'Luiz Laffey Productions',
        locale: 'en-US',
        user_action: 'PAY_NOW',
      },
    };

    const order = await paypalRequest('/v2/checkout/orders', 'POST', orderData, c.env);

    return c.json({
      success: true,
      order_id: order.id,
    });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return c.json({
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/paypal/capture-order
 * Capture a PayPal order after user approval
 * Body: { order_id, user_id }
 */
app.post('/capture-order', async (c) => {
  try {
    const body = await c.req.json();
    const { order_id, user_id } = body;

    if (!order_id || !user_id) {
      return c.json({ error: 'Missing order_id or user_id' }, 400);
    }

    // Capture the order with PayPal
    const capture = await paypalRequest(
      `/v2/checkout/orders/${order_id}/capture`,
      'POST',
      {},
      c.env
    );

    if (capture.status !== 'COMPLETED') {
      return c.json({ 
        error: 'Payment not completed',
        status: capture.status,
      }, 400);
    }

    // Extract subscription details from custom_id
    const customData = JSON.parse(
      capture.purchase_units[0].custom_id
    );
    const { program_id, plan_id } = customData;
    const paymentId = capture.id;

    // Create subscription in database
    await createSubscription(user_id, program_id, plan_id, paymentId);

    return c.json({
      success: true,
      message: 'Payment captured and subscription created',
      payment_id: paymentId,
      order_id,
    });
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    return c.json({
      error: 'Failed to capture payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/paypal/webhook
 * Handle PayPal webhook notifications
 * 
 * PayPal sends event notifications here automatically when:
 * - Payment is captured
 * - Payment is denied
 * - Subscription is cancelled
 */
app.post('/webhook', async (c) => {
  try {
    const event = await c.req.json();
    
    console.log('🔔 PayPal Webhook Event:', event.event_type);
    console.log('📦 Event ID:', event.id);

    // Handle different event types
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.COMPLETED':
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const resource = event.resource;
        console.log('💰 Payment captured:', resource.id);

        try {
          // Extract custom data from the purchase unit
          const customData = JSON.parse(resource.purchase_units?.[0]?.custom_id || '{}');
          const { user_id, program_id, plan_id, user_email } = customData;

          if (!user_id || !plan_id) {
            console.warn('⚠️ Missing required data in webhook');
            return c.json({ success: true }); // Still return 200 to PayPal
          }

          console.log('👤 Creating subscription for:', { user_id, program_id, plan_id });

          // Create subscription record
          const [subscription] = await database
            .insert(subscriptions)
            .values({
              user_id,
              plan_id: Number(plan_id),
              status: 'active',
              payment_id: resource.id,
              start_date: new Date().toISOString(),
            })
            .returning();

          console.log('✅ Subscription created:', subscription.id);

          // If program_id specified, link it
          if (program_id) {
            await database
              .insert(subscriptionOriginals)
              .values({
                subscription_id: subscription.id,
                original_id: Number(program_id),
              });

            console.log('🔗 Linked subscription to program:', program_id);
          } else {
            // If no program_id, link ALL originals (for dual plans)
            const allOriginals = await database
              .select({ id: originals.id })
              .from(originals)
              .where(eq(originals.is_active, true));

            for (const original of allOriginals) {
              await database
                .insert(subscriptionOriginals)
                .values({
                  subscription_id: subscription.id,
                  original_id: original.id,
                });
            }

            console.log('🔗 Linked subscription to all originals');
          }

          // TODO: Send confirmation email here
          console.log('📧 TODO: Send confirmation email to', user_email);

        } catch (error) {
          console.error('❌ Error processing payment:', error);
          // Still return 200 to avoid PayPal retrying
        }
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        console.log('❌ Payment denied:', event.resource.id);
        console.log('❌ Reason:', event.resource.status_details?.reason);
        
        // TODO: Send failure email
        console.log('📧 TODO: Send payment denied email');
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        console.log('🚫 Subscription cancelled:', event.resource.id);
        
        // TODO: Update subscription status to 'cancelled'
        // TODO: Send cancellation email
        console.log('📧 TODO: Send cancellation email');
        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.event_type);
    }

    // Always respond 200 to PayPal (webhook received and processed)
    return c.json({ 
      success: true,
      event_id: event.id,
      event_type: event.event_type
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to avoid PayPal retrying
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 200);
  }
});

/**
 * GET /api/paypal/webhook-test
 * Test if webhook is accessible
 */
app.get('/webhook-test', async (c) => {
  return c.json({ 
    success: true,
    message: 'Webhook endpoint is accessible',
    webhook_url: 'POST /api/paypal/webhook'
  });
});

export default app;
