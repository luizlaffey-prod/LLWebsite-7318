import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight, Search, Headphones, CalendarClock } from 'lucide-react';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { getQuota } from '@/lib/billing/quota';
import { PLANS } from '@/lib/billing/plans';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n';

function daysUntil(date: Date | null): number {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  const quota = await getQuota(session.user.id);

  const t = await getTranslations('dashboard');

  const isTrial = dbUser?.plan === 'trial';
  const trialDaysLeft = isTrial ? daysUntil(dbUser?.trialEndsAt ?? null) : 0;

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t('welcomeTitle')}</h1>
            <p className="mt-2 max-w-2xl text-text-secondary">{t('welcomeBody')}</p>
          </div>
          {isTrial && (
            <span className="inline-flex items-center rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-medium text-teal">
              {t('trialBadge', { days: trialDaysLeft })}
            </span>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted">Bulletins today</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold">{quota.used}</span>
              <span className="text-text-secondary">/ {quota.limit}</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-aura-gradient transition-all"
                style={{
                  width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {quota.remaining} remaining · {PLANS[quota.tier].priceMonthly > 0 ? `${quota.tier} plan` : ''}
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted">Quick start</div>
            <div className="mt-3">
              <Button asChild className="w-full justify-between">
                <Link href={`/${locale}/news`}>
                  <span className="inline-flex items-center gap-2">
                    <Search className="h-4 w-4" /> Search news
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="mt-2 w-full justify-between">
                <Link href={`/${locale}/audios`}>
                  <span className="inline-flex items-center gap-2">
                    <Headphones className="h-4 w-4" /> My audios
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs uppercase tracking-wider text-text-muted">Automate</div>
            <p className="mt-3 text-sm text-text-secondary">
              Schedule recurring bulletins so they ship without lifting a finger.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href={`/${locale}/automations`}>
                <CalendarClock className="mr-2 h-4 w-4" /> Open automations
              </Link>
            </Button>
          </Card>
        </div>

        <Card className="mt-8 p-8 text-center text-text-secondary">{t('comingSoon')}</Card>
      </div>
    </div>
  );
}
