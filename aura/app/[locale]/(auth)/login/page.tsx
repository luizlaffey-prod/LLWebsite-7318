import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n';
import { LoginForm } from './login-form';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
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
            {t('loginTitle')}
          </h2>
          <p className="mt-3 max-w-sm text-text-secondary">{t('loginSubtitle')}</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href={`/${locale}`} className="text-2xl font-semibold">
              <span className="aura-gradient-text">AURA</span>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('loginTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">{t('loginSubtitle')}</p>
          <div className="mt-8">
            <LoginForm locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
