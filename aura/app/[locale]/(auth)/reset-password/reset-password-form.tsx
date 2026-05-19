'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form-error';
import type { Locale } from '@/i18n';

export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // The reset link Better Auth builds carries `?token=…` (and an
  // `error` param if the token is bad). We capture them here so the
  // form can act before the user types anything.
  useEffect(() => {
    const t = searchParams.get('token');
    const err = searchParams.get('error');
    setToken(t);
    if (err === 'invalid_token' || err === 'expired_token') {
      setTopError(err === 'expired_token' ? 'expiredToken' : 'invalidToken');
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setTopError(null);

    if (!token) {
      setTopError('invalidToken');
      return;
    }

    const data = new FormData(e.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');

    if (password.length < 8) {
      setFieldErrors({ password: t('errors.passwordTooShort') });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t('errors.passwordMismatch') });
      return;
    }

    setPending(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setTopError(
          result.error.code === 'INVALID_TOKEN' ? 'invalidToken' : 'generic'
        );
        setPending(false);
        return;
      }
      router.push(`/${locale}/login?reset=ok`);
    } catch {
      setTopError('generic');
      setPending(false);
    }
  }

  const topErrorMessage =
    topError === 'invalidToken'
      ? t('errors.invalidToken')
      : topError === 'expiredToken'
        ? t('errors.expiredToken')
        : topError === 'generic'
          ? t('errors.generic')
          : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {topErrorMessage && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {topErrorMessage}
        </div>
      )}

      <div>
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="mt-1.5"
        />
        <FormError>{fieldErrors.password}</FormError>
      </div>

      <div>
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="mt-1.5"
        />
        <FormError>{fieldErrors.confirmPassword}</FormError>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || !token}
      >
        {pending ? t('submitting') : t('resetSubmit')}
      </Button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        <Link href={`/${locale}/login`} className="text-teal hover:underline">
          {t('forgotBackToLogin')}
        </Link>
      </p>
    </form>
  );
}
