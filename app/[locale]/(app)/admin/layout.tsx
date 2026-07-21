import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { AdminTabs } from './admin-tabs';
import type { Locale } from '@/i18n';

/**
 * Gates the whole /admin tree behind ADMIN_EMAILS — same check
 * each child page also performs, but enforcing it at the layout
 * level means a missing/forbidden session is rejected before the
 * page even renders. The tab nav is shared across the section.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);
  if (!isAdminSession(session)) notFound();

  return (
    <>
      <AdminTabs locale={locale} />
      {children}
    </>
  );
}
