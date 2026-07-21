import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { AdminAutomationDetailClient } from './detail-client';
import type { Locale } from '@/i18n';

export default async function AdminAutomationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);
  if (!isAdminSession(session)) notFound();

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <AdminAutomationDetailClient locale={locale} automationId={id} />
      </div>
    </div>
  );
}
