import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowRight, CreditCard, Server, Palette, Activity } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { SettingsForm } from './settings-form';
import { DownloadFolderCard } from './download-folder-card';
import type { Locale } from '@/i18n';

export default async function SettingsPage({
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

  const t = await getTranslations('settingsPage');
  const tier = effectiveTier(u?.plan);
  const showAdmin = isAdminSession(session);

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>

        <div className="mt-8 space-y-6">
          <SettingsForm
            initial={{
              radioName: u?.radioName ?? '',
              email: u?.email ?? '',
              locale: (u?.locale ?? locale) as Locale,
              timezone: u?.timezone ?? 'UTC',
              emailNotifications: u?.emailNotifications ?? true,
            }}
          />
          <DownloadFolderCard />
        </div>

        <Card className="mt-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted">
                {t('billingSection')}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-text-secondary">{t('billingHint')}</span>
                <Badge>{u?.plan === 'trial' ? `TRIAL · ${tier.toUpperCase()}` : tier.toUpperCase()}</Badge>
              </div>
            </div>
            <Button asChild>
              <Link href={`/${locale}/settings/billing`}>
                <CreditCard className="h-4 w-4" /> {t('openBilling')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted">
                {t('deliverySection')}
              </div>
              <p className="mt-1 text-sm text-text-secondary">{t('deliveryHint')}</p>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/${locale}/settings/delivery`}>
                <Server className="h-4 w-4" /> {t('openDelivery')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted">
                {t('brandSection')}
              </div>
              <p className="mt-1 text-sm text-text-secondary">{t('brandHint')}</p>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/${locale}/settings/brand`}>
                <Palette className="h-4 w-4" /> {t('openBrand')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {showAdmin && (
          <Card className="mt-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-text-muted">
                  {t('healthSection')}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {t('healthHint')}
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link href={`/${locale}/settings/health`}>
                  <Activity className="h-4 w-4" /> {t('openHealth')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
