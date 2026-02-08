import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface SubscribedOriginal {
  id: number;
  slug: string;
  name: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [originals, setOriginals] = useState<SubscribedOriginal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserOriginals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Try to fetch from API first
        const response = await fetch('/api/me/originals', {
          headers: {
            'Authorization': `Bearer ${user.user_id}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setOriginals(data.originals || []);
        } else {
          // Fallback to localStorage (mock)
          const stored = localStorage.getItem(`subscriptions_${user.user_id}`);
          if (stored) {
            setOriginals(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Failed to fetch originals:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem(`subscriptions_${user.user_id}`);
        if (stored) {
          setOriginals(JSON.parse(stored));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserOriginals();
  }, [user]);

  const hasAccess = (originalId: number | string) => {
    return originals.some(o => o.id === originalId || o.slug === originalId);
  };

  const subscribe = (planId: number, originalId?: number) => {
    if (!user) return;

    // Mock subscription
    let newOriginals: SubscribedOriginal[] = [];

    if (planId === 3) {
      // Dual plan - subscribe to both
      newOriginals = [
        { id: 1, slug: 'zero-point-zero', name: 'Zero Point Zero' },
        { id: 2, slug: 'luiz-laffey-collection', name: "Luiz Laffey's Collection" },
      ];
    } else if (originalId === 1) {
      // Zero Point Zero
      newOriginals = [
        { id: 1, slug: 'zero-point-zero', name: 'Zero Point Zero' },
      ];
    } else if (originalId === 2) {
      // Luiz Collection
      newOriginals = [
        { id: 2, slug: 'luiz-laffey-collection', name: "Luiz Laffey's Collection" },
      ];
    }

    localStorage.setItem(`subscriptions_${user.user_id}`, JSON.stringify(newOriginals));
    setOriginals(newOriginals);
  };

  return {
    originals,
    loading,
    hasAccess,
    subscribe,
  };
}
