import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { AppSidebar } from '@/components/app/app-sidebar';
import { effectiveTier } from '@/lib/billing/quota';
import type { Locale } from '@/i18n';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const [dbUser] = await db
    .select({
      radioName: user.radioName,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      brandLogoUrl: user.brandLogoUrl,
      brandAccentColor: user.brandAccentColor,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const tier = effectiveTier(dbUser?.plan);
  const planLabel = dbUser?.plan === 'trial' ? 'TRIAL · PRO' : tier.toUpperCase();

  const styleOverride = dbUser?.brandAccentColor
    ? ({ ['--teal' as string]: dbUser.brandAccentColor } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-screen bg-base" style={styleOverride}>
      <AppSidebar
        locale={locale}
        radioName={dbUser?.radioName}
        planLabel={planLabel}
        brandLogoUrl={dbUser?.brandLogoUrl ?? null}
      />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
