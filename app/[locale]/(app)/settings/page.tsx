import { setRequestLocale } from 'next-intl/server';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings, CreditCard, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
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

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const tier = effectiveTier(dbUser?.plan);

  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-text-secondary">
          Station info, plan, and preferences.
        </p>

        <Card className="mt-8 p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted">Station</div>
            <div className="mt-1 text-base font-medium">{dbUser?.radioName ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted">Email</div>
            <div className="mt-1 text-sm text-text-secondary">{dbUser?.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs uppercase tracking-wider text-text-muted">Plan</div>
            <Badge>{dbUser?.plan === 'trial' ? `TRIAL · ${tier.toUpperCase()}` : tier.toUpperCase()}</Badge>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-text-muted">Billing</div>
              <p className="mt-1 text-sm text-text-secondary">
                Change plan, view invoices, manage payment method.
              </p>
            </div>
            <Button asChild>
              <Link href={`/${locale}/settings/billing`}>
                <CreditCard className="h-4 w-4" /> Open billing
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="mt-6 flex items-center justify-center p-12 text-text-muted">
          <Settings className="mr-3 h-5 w-5" /> Locale, timezone, delivery and white-label settings ship in upcoming phases.
        </Card>
      </div>
    </div>
  );
}
