'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormError } from '@/components/ui/form-error';
import { earlyAccessSchema } from '@/lib/early-access/schema';
import { PLAN_ORDER, type PlanTier } from '@/lib/billing/plans';
import type { Locale } from '@/i18n';

interface Props {
  locale: Locale;
  plan: PlanTier;
  initialName?: string;
  initialEmail?: string;
  initialStation?: string;
}

export function EarlyAccessForm({
  locale,
  plan,
  initialName,
  initialEmail,
  initialStation,
}: Props) {
  const t = useTranslations('earlyAccess');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(plan);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setTopError(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      radioStation: String(data.get('radioStation') ?? ''),
      cityState: String(data.get('cityState') ?? ''),
      website: String(data.get('website') ?? ''),
      notes: String(data.get('notes') ?? ''),
      plan: selectedPlan,
      locale,
    };

    const parsed = earlyAccessSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? 'form';
        if (!errs[key]) errs[key] = t('error.validation');
      }
      setFieldErrors(errs);
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setTopError(t('error.generic'));
        setPending(false);
        return;
      }
      router.push(`/${locale}/early-access/thanks`);
    } catch {
      setTopError(t('error.generic'));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {topError && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {topError}
        </div>
      )}

      <div>
        <Label htmlFor="ea-plan">{t('field.plan')}</Label>
        <div
          id="ea-plan"
          className="mt-1.5 grid grid-cols-3 gap-2"
          role="radiogroup"
        >
          {PLAN_ORDER.map((tier) => {
            const active = selectedPlan === tier;
            return (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedPlan(tier)}
                className={
                  'rounded-md border px-3 py-2 text-sm capitalize transition-colors ' +
                  (active
                    ? 'border-teal bg-teal/10 text-text-primary'
                    : 'border-border bg-elevated/40 text-text-secondary hover:border-teal/40')
                }
              >
                {tier}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ea-name">{t('field.name')}</Label>
          <Input
            id="ea-name"
            name="name"
            required
            defaultValue={initialName}
            autoComplete="name"
            className="mt-1.5"
          />
          <FormError>{fieldErrors.name}</FormError>
        </div>
        <div>
          <Label htmlFor="ea-email">{t('field.email')}</Label>
          <Input
            id="ea-email"
            name="email"
            type="email"
            required
            defaultValue={initialEmail}
            autoComplete="email"
            className="mt-1.5"
          />
          <FormError>{fieldErrors.email}</FormError>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ea-phone">{t('field.phone')}</Label>
          <Input
            id="ea-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={t('field.phonePlaceholder')}
            className="mt-1.5"
          />
          <FormError>{fieldErrors.phone}</FormError>
        </div>
        <div>
          <Label htmlFor="ea-station">{t('field.radioStation')}</Label>
          <Input
            id="ea-station"
            name="radioStation"
            required
            defaultValue={initialStation}
            autoComplete="organization"
            className="mt-1.5"
          />
          <FormError>{fieldErrors.radioStation}</FormError>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ea-city">{t('field.cityState')}</Label>
          <Input
            id="ea-city"
            name="cityState"
            required
            placeholder={t('field.cityStatePlaceholder')}
            className="mt-1.5"
          />
          <FormError>{fieldErrors.cityState}</FormError>
        </div>
        <div>
          <Label htmlFor="ea-website">{t('field.website')}</Label>
          <Input
            id="ea-website"
            name="website"
            placeholder={t('field.websitePlaceholder')}
            className="mt-1.5"
          />
          <FormError>{fieldErrors.website}</FormError>
        </div>
      </div>

      <div>
        <Label htmlFor="ea-notes">{t('field.notes')}</Label>
        <Textarea
          id="ea-notes"
          name="notes"
          rows={4}
          maxLength={1000}
          placeholder={t('field.notesPlaceholder')}
          className="mt-1.5"
        />
        <FormError>{fieldErrors.notes}</FormError>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
