import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/lib/auth/config';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PlanGrid } from './plan-grid';
import type { Locale } from '@/i18n';

export default async function PlanSelectionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('onboarding');

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t('planTitle')}
            </h1>
            <p className="mt-3 text-text-secondary">{t('planSubtitle')}</p>
          </div>
          <div className="mt-12">
            <PlanGrid locale={locale} />
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
