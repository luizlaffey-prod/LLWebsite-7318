import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PLANS, type PlanTier } from '@/lib/billing/plans';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  tier: PlanTier;
  highlighted?: boolean;
  action: React.ReactNode;
}

export function PlanCard({ tier, highlighted = false, action }: PlanCardProps) {
  const t = useTranslations(`plans.${tier}`);
  const tPlans = useTranslations('plans');
  const plan = PLANS[tier];

  const features: string[] = [];
  features.push(
    t('feature_bulletins', { count: plan.bulletinsPerDay }),
    t('feature_duration', { duration: Math.round(plan.maxDurationSeconds / 60) }),
    t('feature_voices'),
    t('feature_formats')
  );
  if (tier === 'standard' || tier === 'pro') features.push(t('feature_scheduling'));
  if (tier === 'pro') {
    features.push(t('feature_delivery'));
    features.push(t('feature_whiteLabel'));
  }
  features.push(t('feature_support'));

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-all',
        highlighted
          ? 'border-teal/40 bg-gradient-to-b from-elevated to-surface shadow-[0_0_60px_-15px_rgba(0,229,200,0.25)]'
          : 'border-border bg-surface'
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-6 rounded-full bg-aura-gradient px-3 py-1 text-xs font-medium text-base">
          {tPlans('popularBadge')}
        </div>
      )}
      <div>
        <h3 className="text-xl font-semibold">{t('name')}</h3>
        <p className="mt-1 text-sm text-text-secondary">{t('tagline')}</p>
      </div>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tracking-tight">${plan.priceMonthly.toFixed(2)}</span>
        <span className="text-sm text-text-secondary">{tPlans('perMonth')}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            <span className="text-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{action}</div>
    </div>
  );
}
