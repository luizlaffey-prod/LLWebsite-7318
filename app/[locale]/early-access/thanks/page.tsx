import Link from 'next/link';
import { Check } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { getSession } from '@/lib/auth/server';
import type { Locale } from '@/i18n';

export default async function EarlyAccessThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations('earlyAccess.thanks');

  const session = await getSession();
  const homeHref = session?.user ? `/${locale}/dashboard` : `/${locale}`;
  const homeLabel = session?.user ? t('backDashboard') : t('backHome');

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-teal/30 bg-teal/10">
            <Check className="h-7 w-7 text-teal" />
          </div>
          <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="aura-gradient-text">{t('title')}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-balance text-text-secondary">
            {t('body')}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href={homeHref}>{homeLabel}</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
