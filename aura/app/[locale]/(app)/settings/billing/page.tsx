import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { getStripe } from '@/lib/billing/stripe';
import { effectiveTier } from '@/lib/billing/quota';
import { BillingClient } from './billing-client';
import type { Locale } from '@/i18n';

async function loadInvoices(stripeCustomerId: string | null) {
  if (!stripeCustomerId) return [];
  try {
    const stripe = getStripe();
    const list = await stripe.invoices.list({ customer: stripeCustomerId, limit: 5 });
    return list.data.map((inv) => ({
      id: inv.id ?? '',
      amountDue: inv.amount_due,
      status: inv.status ?? 'unknown',
      date: inv.created ? new Date(inv.created * 1000).toISOString() : new Date().toISOString(),
      hostedUrl: inv.hosted_invoice_url ?? null,
    }));
  } catch (err) {
    console.warn('[billing] invoice fetch failed', err);
    return [];
  }
}

export default async function BillingPage({
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

  const t = await getTranslations('billing');

  const tier = effectiveTier(u?.plan);
  const isTrial = u?.plan === 'trial';
  const invoices = await loadInvoices(u?.stripeCustomerId ?? null);

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        <div className="mt-8">
          <BillingClient
            locale={locale}
            currentTier={tier}
            isTrial={isTrial}
            trialEndsAt={u?.trialEndsAt ? u.trialEndsAt.toISOString() : null}
            invoices={invoices}
          />
        </div>
      </div>
    </div>
  );
}
