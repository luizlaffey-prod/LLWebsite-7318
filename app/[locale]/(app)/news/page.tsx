import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { NewsClient } from './news-client';
import type { Locale } from '@/i18n';

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  return <NewsClient locale={locale} />;
}
