import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { AdminAutomationsClient } from './automations-client';
import type { Locale } from '@/i18n';

export default async function AdminAutomationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);
  if (!isAdminSession(session)) notFound();

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Automations
        </h1>
        <p className="mt-2 text-text-secondary">
          Every scheduled automation across every account. Click one to
          inspect its execution history.
        </p>
        <div className="mt-8">
          <AdminAutomationsClient locale={locale} />
        </div>
      </div>
    </div>
  );
}
