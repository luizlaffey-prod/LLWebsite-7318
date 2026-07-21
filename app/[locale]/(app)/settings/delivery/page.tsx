import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canAutoDeliver } from '@/lib/billing/feature-gates';
import { DeliveryClient } from './delivery-client';
import type { Locale } from '@/i18n';

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  const canDeliver = canAutoDeliver(tier);

  const t = await getTranslations('deliveryPage');

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        <div className="mt-8">
          <DeliveryClient canDeliver={canDeliver} locale={locale} />
        </div>
      </div>
    </div>
  );
}
