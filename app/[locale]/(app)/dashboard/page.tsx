import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import type { Locale } from '@/i18n';

function daysUntil(date: Date | null): number {
  if (!date) return 0;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(`/${locale}/login`);

  const dbUser = (
    await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)
  )[0];

  const t = await getTranslations('dashboard');

  const isTrial = dbUser?.plan === 'trial';
  const trialDaysLeft = isTrial ? daysUntil(dbUser?.trialEndsAt ?? null) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {t('welcomeTitle')}
              </h1>
              <p className="mt-2 max-w-2xl text-text-secondary">
                {t('welcomeBody')}
              </p>
            </div>
            {isTrial && (
              <span className="inline-flex items-center rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
                {t('trialBadge', { days: trialDaysLeft })}
              </span>
            )}
          </div>
          <Card className="mt-10 p-8 text-center text-text-secondary">
            {t('comingSoon')}
          </Card>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
