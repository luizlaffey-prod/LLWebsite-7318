'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PlanCard } from '@/components/site/plan-card';
import { PLAN_ORDER } from '@/lib/billing/plans';
import type { Locale } from '@/i18n';

export function PlanGrid({ locale }: { locale: Locale }) {
  const t = useTranslations('onboarding');

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((tier) => (
          <PlanCard
            key={tier}
            tier={tier}
            highlighted={tier === 'standard'}
            action={
              <Button
                asChild
                className="w-full"
                variant={tier === 'standard' ? 'default' : 'secondary'}
              >
                {/* No-card trial: the account already has a 14-day Pro
                    trial from signup, so onboarding just drops the user
                    into the app. The plan they clicked is remembered as
                    a hint so billing can pre-highlight it when the trial
                    ends and they subscribe. */}
                <Link href={`/${locale}/dashboard?intent=${tier}`}>
                  {t('continue')}
                </Link>
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}
