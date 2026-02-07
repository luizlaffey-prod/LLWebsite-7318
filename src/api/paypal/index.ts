import { Hono } from 'hono';
import { createSubscription, getPlan } from '../subscriptions/utils';

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

export default app;
