'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ExternalLink, CreditCard, ArrowUpRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLAN_ORDER, PLANS, type PlanTier } from '@/lib/billing/plans';
import { openBillingPortal, changePlan } from './actions';
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
  const [, startTransition] = useTransition();
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
    startTransition(async () => {
      const res = await changePlan(tier, locale);
      setPendingTier(null);
      if ('error' in res) {
        setError(t('errorChangeFailed'));
        return;
      }
      if ('url' in res) {
        window.location.href = res.url;
        return;
      }
      router.refresh();
    });
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
          {PLAN_ORDER.map((tier) => {
            const isCurrent = tier === currentTier && !isTrial;
            const plan = PLANS[tier];
            return (
              <Card key={tier} className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold capitalize">{tier}</h3>
                  {isCurrent && <Badge variant="secondary">{t('currentBadge')}</Badge>}
                </div>
                <div className="mt-3 text-2xl font-semibold">${plan.priceMonthly.toFixed(2)}<span className="text-sm font-normal text-text-secondary">/mo</span></div>
                <ul className="mt-4 flex-1 space-y-1.5 text-xs text-text-secondary">
                  <li>· {plan.bulletinsPerDay} bulletins/day</li>
                  <li>· Up to {Math.round(plan.maxDurationSeconds / 60)}-min runtime</li>
                  <li>· {plan.voicesPerLanguage === 'unlimited' ? 'Unlimited voices' : `${plan.voicesPerLanguage} voice(s)/language`}</li>
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={isCurrent ? 'secondary' : tier === 'standard' ? 'default' : 'outline'}
                  disabled={isCurrent || pendingTier !== null}
                  onClick={() => handleChange(tier)}
                >
                  {pendingTier === tier ? (
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
          })}
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
