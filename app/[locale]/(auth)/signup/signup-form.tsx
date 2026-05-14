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
import type { Locale } from '@/i18n';

interface SignupFormProps {
  locale: Locale;
}

export function SignupForm({ locale }: SignupFormProps) {
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
      const result = await authClient.signUp.email({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.radioName,
        // additionalFields, sent through Better Auth's "input" allowlist:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ radioName: parsed.data.radioName, locale } as any)),
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

      router.push(`/${locale}/onboarding/plan`);
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

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t('submitting') : t('submitSignup')}
      </Button>

      <p className="pt-2 text-center text-sm text-text-secondary">
        {t('hasAccount')}{' '}
        <Link href={`/${locale}/login`} className="text-teal hover:underline">
          {t('loginCta')}
        </Link>
      </p>
    </form>
  );
}
