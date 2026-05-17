import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWhiteLabel } from '@/lib/billing/feature-gates';
import { BrandForm } from './brand-form';
import type { Locale } from '@/i18n';

export default async function BrandPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect(`/${locale}/login`);

  const [u] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  const allowed = canWhiteLabel(tier);

  const t = await getTranslations('brandPage');

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>

        <div className="mt-8">
          {allowed ? (
            <BrandForm
              initial={{
                brandLogoUrl: u?.brandLogoUrl ?? null,
                brandAccentColor: u?.brandAccentColor ?? null,
              }}
            />
          ) : (
            <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-violet">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('lockedTitle')}</h3>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                {t('lockedBody')}
              </p>
              <Button asChild className="mt-6">
                <a href={`/${locale}/settings/billing`}>{t('upgradeCta')}</a>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
