import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight, Globe, Mic, Sparkles } from 'lucide-react';
import type { Locale } from '@/i18n';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { PlanCard } from '@/components/site/plan-card';
import { PLAN_ORDER } from '@/lib/billing/plans';

const BENEFIT_ICONS = {
  global: Globe,
  smart: Sparkles,
  audio: Mic,
} as const;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(80% 60% at 50% 0%, rgba(0,229,200,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)',
            }}
          />
          <div className="mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-4 py-1.5 text-xs text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              <span>{t('ctaSub')}</span>
            </div>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              <span className="aura-gradient-text">{t('headline')}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-text-secondary">
              {t('subheadline')}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={`/${locale}/signup`}>
                  {t('cta')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {(['global', 'smart', 'audio'] as const).map((key) => {
              const Icon = BENEFIT_ICONS[key];
              return (
                <div
                  key={key}
                  className="group aura-card p-6 transition-all hover:border-teal/30 hover:shadow-[0_0_40px_-15px_rgba(0,229,200,0.35)]"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-elevated transition-colors group-hover:bg-teal/10">
                    <Icon className="h-5 w-5 text-teal" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {t(`benefits.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {t(`benefits.${key}.body`)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t('plansTitle')}
            </h2>
            <p className="mt-3 text-text-secondary">{t('plansSubtitle')}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLAN_ORDER.map((tier) => (
              <PlanCard
                key={tier}
                tier={tier}
                highlighted={tier === 'standard'}
                action={
                  <Button asChild className="w-full" variant={tier === 'standard' ? 'default' : 'secondary'}>
                    <Link href={`/${locale}/early-access?plan=${tier}`}>
                      {t('cta')}
                    </Link>
                  </Button>
                }
              />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
