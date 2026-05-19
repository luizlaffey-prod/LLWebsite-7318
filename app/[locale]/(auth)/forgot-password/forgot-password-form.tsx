'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form-error';
import type { Locale } from '@/i18n';

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations('auth');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setTopError(null);

    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    if (!email || !email.includes('@')) {
      setFieldErrors({ email: t('errors.invalidEmail') });
      return;
    }

    setPending(true);
    try {
      // Better Auth returns success even when the email isn't in the
      // database — by design, so a stranger can't enumerate accounts by
      // probing the form. We mirror that: regardless of the result we
      // show the "check your inbox" message.
      await authClient.requestPasswordReset({
        email,
        redirectTo: `/${locale}/reset-password`,
      });
      setSent(true);
    } catch {
      // Only surface a generic error for actual failures (network down,
      // RESEND_API_KEY missing on the server, etc.).
      setTopError(t('errors.generic'));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {t('forgotSentBody')}
        </div>
        <p className="text-center text-sm text-text-secondary">
          <Link href={`/${locale}/login`} className="text-teal hover:underline">
            {t('forgotBackToLogin')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {topError && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {topError}
        </div>
      )}

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          className="mt-1.5"
        />
        <FormError>{fieldErrors.email}</FormError>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('submitting') : t('forgotSubmit')}
      </Button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        <Link href={`/${locale}/login`} className="text-teal hover:underline">
          {t('forgotBackToLogin')}
        </Link>
      </p>
    </form>
  );
}
