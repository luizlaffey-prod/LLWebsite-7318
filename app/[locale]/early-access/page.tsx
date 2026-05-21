import { eq } from 'drizzle-orm';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PLAN_ORDER, type PlanTier } from '@/lib/billing/plans';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import type { Locale } from '@/i18n';
import { EarlyAccessForm } from './early-access-form';

export default async function EarlyAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { plan: planParam } = await searchParams;
  const t = await getTranslations('earlyAccess');

  const plan: PlanTier = (PLAN_ORDER as readonly string[]).includes(
    planParam ?? ''
  )
    ? (planParam as PlanTier)
    : 'standard';

  let initialName = '';
  let initialEmail = '';
  let initialStation = '';
  const session = await getSession();
  if (session?.user) {
    const [dbUser] = await db
      .select({
        email: user.email,
        name: user.name,
        radioName: user.radioName,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if (dbUser) {
      initialEmail = dbUser.email ?? '';
      initialName = dbUser.name ?? '';
      initialStation = dbUser.radioName ?? '';
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-4 py-1.5 text-xs text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              <span>{t('badge')}</span>
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              <span className="aura-gradient-text">{t('title')}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-text-secondary">
              {t('subtitle')}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
              {t('body')}
            </p>
          </div>
          <div className="mt-10">
            <EarlyAccessForm
              locale={locale}
              plan={plan}
              initialName={initialName}
              initialEmail={initialEmail}
              initialStation={initialStation}
            />
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
