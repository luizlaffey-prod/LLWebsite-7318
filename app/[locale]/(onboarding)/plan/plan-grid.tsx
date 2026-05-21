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
                <Link href={`/${locale}/early-access?plan=${tier}`}>
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
