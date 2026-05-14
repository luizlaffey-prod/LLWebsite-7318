'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PlanCard } from '@/components/site/plan-card';
import { PLAN_ORDER, type PlanTier } from '@/lib/billing/plans';
import { startTrialCheckout } from './actions';
import type { Locale } from '@/i18n';

export function PlanGrid({ locale }: { locale: Locale }) {
  const t = useTranslations('onboarding');
  const tAuth = useTranslations('auth');
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSelect(tier: PlanTier) {
    setError(null);
    setPendingTier(tier);
    startTransition(async () => {
      const result = await startTrialCheckout({ tier, locale });
      if ('error' in result) {
        setError(tAuth('errors.generic'));
        setPendingTier(null);
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((tier) => (
          <PlanCard
            key={tier}
            tier={tier}
            highlighted={tier === 'standard'}
            action={
              <Button
                className="w-full"
                variant={tier === 'standard' ? 'default' : 'secondary'}
                onClick={() => handleSelect(tier)}
                disabled={pendingTier !== null}
              >
                {pendingTier === tier ? tAuth('submitting') : t('continue')}
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}
