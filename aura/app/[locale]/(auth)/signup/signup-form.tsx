'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { signupSchema } from '@/lib/auth/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form-error';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import type { Locale } from '@/i18n';

interface SignupFormProps {
  locale: Locale;
  showGoogle?: boolean;
  callbackURL?: string | null;
}

export function SignupForm({ locale, showGoogle, callbackURL }: SignupFormProps) {
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
      confirmPassword: String(data.get('confirmPassword') ?? ''),
      radioName: String(data.get('radioName') ?? ''),
      locale,
      marketingOptIn: data.get('marketingOptIn') === 'on',
    };

    const parsed = signupSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]?.toString() ?? 'form';
        if (errs[path]) continue;
        if (path === 'email') errs.email = t('errors.invalidEmail');
        else if (path === 'password') errs.password = t('errors.passwordTooShort');
        else if (path === 'confirmPassword' && issue.message === 'passwordMismatch')
          errs.confirmPassword = t('errors.passwordMismatch');
        else if (path === 'confirmPassword')
          errs.confirmPassword = t('errors.passwordTooShort');
        else if (path === 'radioName') errs.radioName = t('errors.radioNameRequired');
      }
      setFieldErrors(errs);
      return;
    }

    setPending(true);
    try {
      // IP-rate-limit gate: precheck records the attempt and rejects
      // when the caller's IP already opened 3 accounts in the last 30
      // days. Done BEFORE better-auth so a tripped limit doesn't
      // create a half-baked DB row.
      const precheck = await fetch('/api/signup/precheck', { method: 'POST' });
      if (precheck.status === 429) {
        setTopError(t('errors.ipLimit'));
        setPending(false);
        return;
      }

      // additionalFields are passed through Better Auth's "input" allowlist.
      // emailNotifications mirrors marketingOptIn so the
      // user.emailNotifications column reflects the box the operator
      // actually checked (LGPD-style explicit consent).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extras: any = {
        radioName: parsed.data.radioName,
        locale,
        emailNotifications: parsed.data.marketingOptIn,
      };
      const result = await authClient.signUp.email({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.radioName,
        ...extras,
      });

      if (result.error) {
        if (result.error.status === 422 || result.error.code === 'USER_ALREADY_EXISTS') {
          setTopError(t('errors.emailInUse'));
        } else {
          setTopError(t('errors.generic'));
        }
        setPending(false);
        return;
      }

      // A new account created inside the Studio Pro sign-in flow returns to
      // the consent screen; otherwise continue to plan selection.
      router.push(callbackURL ?? `/${locale}/plan`);
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
        <Label htmlFor="radioName">{t('radioName')}</Label>
        <Input
          id="radioName"
          name="radioName"
          required
          placeholder={t('radioNamePlaceholder')}
          className="mt-1.5"
          autoComplete="organization"
        />
        <FormError>{fieldErrors.radioName}</FormError>
      </div>

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
          autoComplete="new-password"
          minLength={8}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-text-muted">{t('passwordHint')}</p>
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

      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-elevated/30 px-3 py-2.5 text-xs text-text-secondary">
        <input
          type="checkbox"
          name="marketingOptIn"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-base accent-teal"
        />
        <span>{t('marketingOptIn')}</span>
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('submitting') : t('submitSignup')}
      </Button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        {t('hasAccount')}{' '}
        <Link
          href={
            callbackURL
              ? `/${locale}/login?callbackURL=${encodeURIComponent(callbackURL)}`
              : `/${locale}/login`
          }
          className="text-teal hover:underline"
        >
          {t('loginCta')}
        </Link>
      </p>
    </form>
  );
}
