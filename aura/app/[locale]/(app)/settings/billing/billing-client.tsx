'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ExternalLink, CreditCard, ArrowUpRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLAN_ORDER, PLANS, type PlanTier } from '@/lib/billing/plans';
import { openBillingPortal } from './actions';
import type { Locale } from '@/i18n';

interface Invoice {
  id: string;
  amountDue: number;
  status: string;
  date: string;
  hostedUrl: string | null;
}

interface Props {
  locale: Locale;
  currentTier: PlanTier;
  isTrial: boolean;
  trialEndsAt: string | null;
  invoices: Invoice[];
}

export function BillingClient({ locale, currentTier, isTrial, trialEndsAt, invoices }: Props) {
  const t = useTranslations('billing');
  const router = useRouter();
  const [pendingPortal, setPendingPortal] = useState(false);
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePortal = async () => {
    setError(null);
    setPendingPortal(true);
    const res = await openBillingPortal(locale);
    setPendingPortal(false);
    if ('error' in res) {
      setError(t('errorPortalUnavailable'));
      return;
    }
    window.location.href = res.url;
  };

  const handleChange = (tier: PlanTier) => {
    setError(null);
    setPendingTier(tier);
    router.push(`/${locale}/early-access?plan=${tier}`);
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted">{t('currentPlan')}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-semibold">{PLANS[currentTier].priceMonthly === 0 ? '—' : `$${PLANS[currentTier].priceMonthly.toFixed(2)}/mo`}</span>
              <Badge>{isTrial ? `TRIAL · ${currentTier.toUpperCase()}` : currentTier.toUpperCase()}</Badge>
            </div>
            {isTrial && trialEndsAt && (
              <p className="mt-2 text-sm text-text-secondary">
                {t('trialEndsAt', { date: new Date(trialEndsAt).toLocaleDateString(locale) })}
              </p>
            )}
          </div>
          <Button onClick={handlePortal} variant="secondary" disabled={pendingPortal}>
            {pendingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {t('managePortal')}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('changePlan')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('changePlanSub')}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((tier) => (
            <PlanColumn
              key={tier}
              tier={tier}
              isCurrent={tier === currentTier && !isTrial}
              pending={pendingTier === tier}
              disabled={
                (tier === currentTier && !isTrial) || pendingTier !== null
              }
              onChange={handleChange}
              t={t}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('invoices')}</h2>
        {invoices.length === 0 ? (
          <Card className="mt-3 p-6 text-center text-sm text-text-muted">
            {t('noInvoices')}
          </Card>
        ) : (
          <Card className="mt-3 divide-y divide-border">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <div>{new Date(inv.date).toLocaleDateString(locale)}</div>
                  <div className="text-xs text-text-muted capitalize">{inv.status}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${(inv.amountDue / 100).toFixed(2)}</span>
                  {inv.hostedUrl && (
                    <a
                      href={inv.hostedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      {t('viewInvoice')} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

interface PlanColumnProps {
  tier: PlanTier;
  isCurrent: boolean;
  pending: boolean;
  disabled: boolean;
  onChange: (tier: PlanTier) => void;
  t: ReturnType<typeof useTranslations>;
}

/**
 * One column in the "Change plan" grid. Lives as its own component
 * so React's rules-of-hooks allow useTranslations(`plans.${tier}`)
 * — calling it inside .map would violate the static-call rule.
 */
function PlanColumn({
  tier,
  isCurrent,
  pending,
  disabled,
  onChange,
  t,
}: PlanColumnProps) {
  const tPlan = useTranslations(`plans.${tier}`);
  const tPlans = useTranslations('plans');
  const plan = PLANS[tier];

  const features: string[] = [
    tPlan('feature_bulletins', { count: plan.bulletinsPerDay }),
    tPlan('feature_duration', {
      duration: Math.round(plan.maxDurationSeconds / 60),
    }),
    tPlan('feature_voices'),
    tPlan('feature_formats'),
  ];
  if (tier === 'standard' || tier === 'pro') {
    features.push(tPlan('feature_scheduling'));
  }
  if (tier === 'pro') {
    features.push(tPlan('feature_delivery'));
    features.push(tPlan('feature_whiteLabel'));
    features.push(tPlan('feature_dualVoice'));
  }
  features.push(tPlan('feature_support'));

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="aura-gradient-text font-serif text-2xl font-semibold capitalize">
          {tPlan('name')}
        </h3>
        {isCurrent && <Badge variant="secondary">{t('currentBadge')}</Badge>}
      </div>
      <p className="mt-1 text-xs uppercase tracking-wider text-text-muted">
        {tPlan('tagline')}
      </p>
      <div className="mt-3 text-2xl font-semibold">
        ${plan.priceMonthly.toFixed(2)}
        <span className="text-sm font-normal text-text-secondary">
          {tPlans('perMonth')}
        </span>
      </div>
      <ul className="mt-4 flex-1 space-y-1.5 text-xs text-text-secondary">
        {features.map((line, i) => (
          <li key={i}>· {line}</li>
        ))}
      </ul>
      <Button
        className="mt-4 w-full"
        variant={
          isCurrent ? 'secondary' : tier === 'standard' ? 'default' : 'outline'
        }
        disabled={disabled}
        onClick={() => onChange(tier)}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isCurrent ? (
          t('currentBadge')
        ) : (
          <>
            <ArrowUpRight className="h-3.5 w-3.5" />
            {t('switchTo', { tier })}
          </>
        )}
      </Button>
    </Card>
  );
}
