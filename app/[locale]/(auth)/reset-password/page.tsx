import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n';
import { ResetPasswordForm } from './reset-password-form';
import { LanguageSwitcher } from '@/components/site/language-switcher';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 30% 30%, rgba(0,229,200,0.18) 0%, rgba(139,92,246,0.10) 50%, transparent 80%)',
          }}
        />
        <Link href={`/${locale}`} className="relative text-2xl font-semibold">
          <span className="aura-gradient-text">AURA</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight">
            {t('resetTitle')}
          </h2>
          <p className="mt-3 max-w-sm text-text-secondary">
            {t('resetSubtitle')}
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher current={locale} />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href={`/${locale}`} className="text-2xl font-semibold">
              <span className="aura-gradient-text">AURA</span>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('resetTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('resetSubtitle')}
          </p>
          <div className="mt-8">
            {/* Suspense boundary is required because the form reads
                URLSearchParams via useSearchParams(); Next refuses to
                prerender pages that hit it without one. */}
            <Suspense fallback={null}>
              <ResetPasswordForm locale={locale} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
