import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWriteArticles } from '@/lib/billing/feature-gates';
import { ArticlesClient } from './articles-client';
import type { Locale } from '@/i18n';

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const [u] = await db
    .select({ plan: user.plan, locale: user.locale })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const tier = effectiveTier(u?.plan);
  const t = await getTranslations('articlesPage');

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        <div className="mt-8">
          <ArticlesClient
            locale={locale}
            canWrite={canWriteArticles(tier)}
            defaultLanguage={(u?.locale ?? locale) as Locale}
          />
        </div>
      </div>
    </div>
  );
}
