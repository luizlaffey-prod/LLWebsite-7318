import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { StudioProClient } from './studio-pro-client';
import type { Locale } from '@/i18n';

export default async function StudioProPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations('studioProPage');

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        <div className="mt-8">
          <StudioProClient locale={locale} />
        </div>
      </div>
    </div>
  );
}
