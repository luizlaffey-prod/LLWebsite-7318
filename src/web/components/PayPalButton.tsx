import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PayPalButtonProps {
  planId: string;
  programId: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: Error) => void;
}

export function PayPalButton({
  planId,
  programId,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  // Load PayPal SDK
  useEffect(() => {
    // Check if PayPal SDK is already loaded
    if ((window as any).paypal) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}`;
    script.onload = () => setPaypalLoaded(true);
    script.onerror = () => {
      setError('Failed to load PayPal SDK');
      if (onError) {
        onError(new Error('Failed to load PayPal SDK'));
      }
    };
    document.body.appendChild(script);
  }, [onError]);

  const handlePayment = async () => {
    if (!user) {
      setError('Please log in first');
      return;
    }

    if (!paypalLoaded || !(window as any).paypal) {
      setError('PayPal SDK not loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create PayPal order
      const createOrderResponse = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          user_email: user.email,
          plan_id: planId,
          program_id: programId,
        }),
      });

      if (!createOrderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const { order_id } = await createOrderResponse.json();

      // Step 2: Open PayPal checkout with the order
      (window as any).paypal.Checkout.showModal(order_id);

      // Step 3: After user approves, capture the order
      const captureResponse = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id,
          user_id: user.user_id,
        }),
      });

      if (!captureResponse.ok) {
        throw new Error('Failed to complete payment');
      }

      const { payment_id } = await captureResponse.json();

      if (onSuccess) {
        onSuccess(payment_id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!paypalLoaded) {
    return <div className="text-gray-400">Loading PayPal...</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handlePayment}
        disabled={loading || !user}
        className="w-full px-4 py-3 bg-[#0070ba] text-white rounded-lg font-medium hover:bg-[#005a94] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Subscribe with PayPal'}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {!user && (
        <div className="text-yellow-500 text-sm">Please log in to subscribe</div>
      )}
    </div>
  );
}
