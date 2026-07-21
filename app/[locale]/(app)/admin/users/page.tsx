import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { AdminUsersClient } from './users-client';
import type { Locale } from '@/i18n';

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);
  if (!isAdminSession(session)) notFound();

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Users
        </h1>
        <p className="mt-2 text-text-secondary">
          Every account, every plan. Filter, search, export.
        </p>
        <div className="mt-8">
          <AdminUsersClient locale={locale} />
        </div>
      </div>
    </div>
  );
}
