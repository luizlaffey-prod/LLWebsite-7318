import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppBrandHeader } from '@/components/app/app-brand-header';
import { MobileTopBar } from '@/components/app/mobile-top-bar';
import { LocalFolderSyncWorker } from '@/components/app/local-folder-sync-worker';
import { AuraChat } from '@/components/app/aura-chat';
import { effectiveTier } from '@/lib/billing/quota';
import type { Locale } from '@/i18n';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  let [dbUser] = await db
    .select({
      radioName: user.radioName,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      brandLogoUrl: user.brandLogoUrl,
      brandAccentColor: user.brandAccentColor,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  // Auto-promote admins to the Pro plan on first authenticated request.
  // The ADMIN_EMAILS allowlist is the source of truth — anyone listed
  // there gets full Pro features without going through Stripe. Idempotent:
  // re-runs are a no-op once plan='pro' and subscriptionStatus='active'.
  if (
    dbUser &&
    isAdminSession(session) &&
    dbUser.plan !== 'pro'
  ) {
    await db
      .update(user)
      .set({
        plan: 'pro',
        subscriptionStatus: 'active',
        trialEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));
    dbUser = { ...dbUser, plan: 'pro', trialEndsAt: null };
  }

  // Honor the user's stored UI-language preference: if the URL locale
  // doesn't match user.locale, redirect to the same path under the
  // preferred locale prefix. The in-app language switcher also writes
  // user.locale before navigating, so picking a different language
  // there sticks — the next request matches and this redirect is a
  // no-op. Behavior intended: brand-new accounts always open in the
  // language picked at signup; switcher edits propagate to future
  // sessions.
  const preferred = dbUser?.locale as Locale | undefined;
  if (
    preferred &&
    preferred !== locale &&
    (['en', 'pt', 'es'] as const).includes(preferred)
  ) {
    const pathname = (await headers()).get('x-pathname') ?? `/${locale}`;
    const swapped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, `/${preferred}`);
    redirect(swapped);
  }

  const tier = effectiveTier(dbUser?.plan);
  const planLabel = dbUser?.plan === 'trial' ? 'TRIAL · PRO' : tier.toUpperCase();

  const styleOverride = dbUser?.brandAccentColor
    ? ({ ['--teal' as string]: dbUser.brandAccentColor } as React.CSSProperties)
    : undefined;

  const navProps = {
    locale,
    radioName: dbUser?.radioName,
    planLabel,
    brandLogoUrl: dbUser?.brandLogoUrl ?? null,
  };

  return (
    <div className="flex min-h-screen bg-base md:flex-row" style={styleOverride}>
      <AppSidebar {...navProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar {...navProps} />
        <AppBrandHeader locale={locale} />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
      <LocalFolderSyncWorker />
      {/* AURA Assistant — Standard / Pro only. Starter (and any
          legacy tier we add later) doesn't see the FAB. */}
      {(tier === 'standard' || tier === 'pro') && (
        <AuraChat locale={locale} />
      )}
    </div>
  );
}
