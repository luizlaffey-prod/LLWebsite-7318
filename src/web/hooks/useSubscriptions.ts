import { useState, useEffect } from 'react';

export interface Subscription {
  subscription_id: string;
  user_id: string;
  program_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  payment_id?: string;
  created_at: string;
}

export interface Plan {
  plan_id: string;
  plan_name: string;
  billing_cycle: string;
  price: number;
  description: string;
  is_active: boolean;
}

export function useSubscriptions(userId?: string) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/subscriptions/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      } else {
        throw new Error('Failed to fetch subscriptions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [userId]);

  const checkAccess = async (programId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const response = await fetch(
        `/api/subscriptions/check?user_id=${userId}&program_id=${programId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.has_access;
      }
      return false;
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  };

  const hasProgram = (programId: string): boolean => {
    return subscriptions.some(
      (sub) => sub.program_id === programId && sub.status === 'active'
    );
  };

  const cancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        // Refresh subscriptions
        await fetchSubscriptions();
        return true;
      }
      throw new Error('Failed to cancel subscription');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  };

  return {
    subscriptions,
    loading,
    error,
    checkAccess,
    hasProgram,
    cancelSubscription,
    refetch: fetchSubscriptions,
  };
}
