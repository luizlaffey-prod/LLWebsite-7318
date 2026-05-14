import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { VoicesClient } from './voices-client';
import type { Locale } from '@/i18n';

export default async function VoicesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations('voicesPage');

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        <div className="mt-8">
          <VoicesClient />
        </div>
      </div>
    </div>
  );
}
