import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tNav = await getTranslations('nav');

  return (
    <main className="relative min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href={`/${locale}`} className="text-2xl font-semibold tracking-tight">
          <span className="aura-gradient-text">AURA</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href={`/${locale}/login`}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            {tNav('login')}
          </Link>
          <Link
            href={`/${locale}/signup`}
            className="rounded-md bg-aura-gradient px-4 py-2 text-sm font-medium text-base"
          >
            {tNav('signup')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          {t('headline')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-text-secondary">
          {t('subheadline')}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={`/${locale}/signup`}
            className="rounded-md bg-aura-gradient px-6 py-3 text-base font-medium text-base"
          >
            {t('cta')}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-24 md:grid-cols-3">
        {(['global', 'smart', 'audio'] as const).map((key) => (
          <div key={key} className="aura-card p-6">
            <h3 className="text-lg font-semibold">{t(`benefits.${key}.title`)}</h3>
            <p className="mt-2 text-sm text-text-secondary">
              {t(`benefits.${key}.body`)}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
