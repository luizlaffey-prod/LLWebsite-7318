import { redirect, notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { automationSchedule } from '@/lib/db/schema';
import { RunsClient } from './runs-client';
import type { Locale } from '@/i18n';

export default async function AutomationRunsPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const [automation] = await db
    .select({
      id: automationSchedule.id,
      name: automationSchedule.name,
      timezone: automationSchedule.timezone,
    })
    .from(automationSchedule)
    .where(
      and(
        eq(automationSchedule.id, id),
        eq(automationSchedule.userId, session.user.id)
      )
    )
    .limit(1);

  if (!automation) notFound();

  const t = await getTranslations('automationsPage');

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <a
          href={`/${locale}/automations`}
          className="text-xs uppercase tracking-wider text-text-muted hover:text-text-primary"
        >
          ← {t('backToList')}
        </a>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {automation.name}
        </h1>
        <p className="mt-2 text-text-secondary">
          {t('runsSubtitle', { timezone: automation.timezone })}
        </p>
        <div className="mt-8">
          <RunsClient automationId={automation.id} locale={locale} />
        </div>
      </div>
    </div>
  );
}
