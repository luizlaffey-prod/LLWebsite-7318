import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWriteArticles } from '@/lib/billing/feature-gates';
import { PublishingClient } from './publishing-client';
import type { Locale } from '@/i18n';

export default async function PublishingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const canPublish = canWriteArticles(effectiveTier(u?.plan));

  const t = await getTranslations('publishingPage');

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        <div className="mt-8">
          <PublishingClient canPublish={canPublish} locale={locale} />
        </div>
      </div>
    </div>
  );
}
