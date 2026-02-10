import { Layout } from "../components/shared";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, Shield, Lock, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

export default function Checkout() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { subscribe } = useSubscription();
  const [processing, setProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  // Get params from URL
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan');
  const program = params.get('program');

  const planNames: Record<string, string> = {
    'MONTHLY_BROADCAST': 'Monthly Plan',
    'ANNUAL_BROADCAST': 'Annual Plan',
    'STRATEGIC_ANNUAL': 'Dual Program Plan',
  };

  const planPrices: Record<string, string> = {
    'MONTHLY_BROADCAST': '$99',
    'ANNUAL_BROADCAST': '$999',
    'STRATEGIC_ANNUAL': '$1,799',
  };

  const programNames: Record<string, string> = {
    'ZERO_POINT_ZERO': 'Zero Point Zero',
    'LUIZ_LAFFEY_COLLECTION': "Luiz Laffey's Collection",
  };

  // Redirect if not logged in or missing params
  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/checkout&plan=${planId}&program=${program}`);
    }
    if (!planId || !program) {
      navigate('/plans');
    }
  }, [user, planId, program, navigate]);

  // Load PayPal SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'}&currency=USD`;
    script.async = true;
    script.onload = () => {
      setPaypalLoaded(true);
      renderPayPalButtons();
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [planId, program]);

  const renderPayPalButtons = () => {
    if (!window.paypal) return;

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
      },
      createOrder: async () => {
        try {
          // Convert program string to ID
          const programIdMap: Record<string, number> = {
            'ZERO_POINT_ZERO': 1,
            'LUIZ_LAFFEY_COLLECTION': 2,
          };
          
          // Convert plan string to ID
          const planIdMap: Record<string, number> = {
            'MONTHLY_BROADCAST': 1,
            'ANNUAL_BROADCAST': 2,
            'STRATEGIC_ANNUAL': 3,
          };

          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.user_id}`,
            },
            body: JSON.stringify({
              program_id: planId === 'STRATEGIC_ANNUAL' ? null : programIdMap[program!],
              plan_id: planIdMap[planId!],
              user_id: user?.user_id,
              user_email: user?.email,
            }),
          });

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || 'Failed to create order');
          }
          return data.order_id;
        } catch (error) {
          console.error('Error creating order:', error);
          alert('Failed to create order. Please try again.');
          throw error;
        }
      },
      onApprove: async (data: any) => {
        setProcessing(true);
        try {
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.user_id}`,
            },
            body: JSON.stringify({
              order_id: data.orderID,
              user_id: user?.user_id,
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Update local subscription
            const planIdMap: Record<string, number> = {
              'MONTHLY_BROADCAST': 1,
              'ANNUAL_BROADCAST': 2,
              'STRATEGIC_ANNUAL': 3,
            };
            const numericPlanId = planIdMap[planId!];
            const originalId = planId === 'STRATEGIC_ANNUAL' ? undefined : (program === 'ZERO_POINT_ZERO' ? 1 : 2);
            subscribe(numericPlanId, originalId);

            // Redirect to success page
            window.location.href = `/subscription-success?plan=${planId}&program=${program}`;
          } else {
            alert(result.error || 'Payment failed. Please try again.');
            setProcessing(false);
          }
        } catch (error) {
          console.error('Error capturing order:', error);
          alert('Payment processing failed. Please contact support.');
          setProcessing(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        alert('Payment error. Please try again.');
        setProcessing(false);
      },
    }).render('#paypal-button-container');
  };

  if (!user || !planId || !program) {
    return null;
  }

  return (
    <Layout>
      <section className="relative py-12 min-h-[calc(100vh-80px)]">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6">
          {/* Back Button */}
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 text-white/60 hover:text-[#d4a843] transition-colors mb-8 font-body"
          >
            <ArrowLeft size={18} />
            Back to Plans
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">
              Complete Your <span className="text-[#d4a843]">Purchase</span>
            </h1>
            <p className="font-body text-white/70 text-lg">
              Secure checkout powered by PayPal
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
              <h2 className="font-heading text-2xl text-white mb-6">Order Summary</h2>
              
              {/* Program */}
              <div className="mb-6 p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 text-sm mb-2">Program</p>
                <p className="text-white font-semibold text-lg">{programNames[program]}</p>
              </div>

              {/* Plan */}
              <div className="mb-6 p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 text-sm mb-2">Plan</p>
                <p className="text-white font-semibold text-lg">{planNames[planId]}</p>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex justify-between font-body text-white/70">
                  <span>Subtotal</span>
                  <span>{planPrices[planId]}</span>
                </div>
                <div className="flex justify-between font-body text-white/70">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-heading text-xl text-white pt-4 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-[#d4a843]">{planPrices[planId]}</span>
                </div>
              </div>

              {/* What's Included */}
              <div className="mt-8 p-4 bg-white/5 rounded-xl">
                <p className="text-white/60 text-sm uppercase tracking-wider mb-3">What's Included</p>
                <ul className="space-y-2 text-sm font-body text-white/80">
                  <li className="flex items-start gap-2">
                    <Check className="text-[#d4a843] shrink-0 mt-0.5" size={16} />
                    <span>Full access to {planId === 'STRATEGIC_ANNUAL' ? 'both programs' : 'program'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-[#d4a843] shrink-0 mt-0.5" size={16} />
                    <span>Weekly episode releases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-[#d4a843] shrink-0 mt-0.5" size={16} />
                    <span>Download broadcast files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-[#d4a843] shrink-0 mt-0.5" size={16} />
                    <span>Promotional assets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-[#d4a843] shrink-0 mt-0.5" size={16} />
                    <span>Cancel anytime</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Payment */}
            <div>
              <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="text-[#d4a843]" size={24} />
                  <h2 className="font-heading text-2xl text-white">Payment Method</h2>
                </div>

                {/* PayPal Button Container */}
                <div id="paypal-button-container" className={processing ? 'opacity-50 pointer-events-none' : ''}>
                  {!paypalLoaded && (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a843]"></div>
                    </div>
                  )}
                </div>

                {processing && (
                  <div className="mt-6 p-4 bg-[#d4a843]/10 border border-[#d4a843]/30 rounded-lg">
                    <p className="text-[#d4a843] text-sm text-center font-semibold">
                      Processing your payment...
                    </p>
                  </div>
                )}

                {/* Security Badge */}
                <div className="mt-8 p-4 bg-white/5 rounded-xl flex items-start gap-3">
                  <Shield className="text-green-500 shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">Secure Payment</p>
                    <p className="text-white/60 text-xs font-body">
                      Your payment information is encrypted and secure. We never store your card details.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-xs font-body">
                  <Lock size={14} />
                  <span>256-bit SSL encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
