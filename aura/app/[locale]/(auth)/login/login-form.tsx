'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { loginSchema } from '@/lib/auth/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form-error';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import type { Locale } from '@/i18n';

export function LoginForm({
  locale,
  showGoogle,
  callbackURL,
}: {
  locale: Locale;
  showGoogle?: boolean;
  callbackURL?: string | null;
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setTopError(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]?.toString() ?? 'form';
        if (errs[path]) continue;
        if (path === 'email') errs.email = t('errors.invalidEmail');
        else if (path === 'password') errs.password = t('errors.passwordTooShort');
      }
      setFieldErrors(errs);
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result.error) {
        setTopError(t('errors.invalidCredentials'));
        setPending(false);
        return;
      }

      router.push(callbackURL ?? `/${locale}/dashboard`);
    } catch {
      setTopError(t('errors.generic'));
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

      {showGoogle && (
        <>
          <GoogleAuthButton locale={locale} callbackURL={callbackURL} />
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-base px-3 text-xs uppercase tracking-wider text-text-muted">
                {t('orDivider')}
              </span>
            </div>
          </div>
        </>
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

      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5"
        />
        <FormError>{fieldErrors.password}</FormError>
        <div className="mt-2 text-right">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-xs text-text-secondary hover:text-teal"
          >
            {t('forgotLink')}
          </Link>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('submitting') : t('submitLogin')}
      </Button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        {t('noAccount')}{' '}
        <Link
          href={
            callbackURL
              ? `/${locale}/signup?callbackURL=${encodeURIComponent(callbackURL)}`
              : `/${locale}/signup`
          }
          className="text-teal hover:underline"
        >
          {t('signupCta')}
        </Link>
      </p>
    </form>
  );
}
