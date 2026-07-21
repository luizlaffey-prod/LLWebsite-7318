import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { getManual } from '@/lib/help/manual-content';
import { HelpToc } from './help-toc';
import type { Locale } from '@/i18n';

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const manual = getManual(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
          {/* Hero */}
          <div className="mb-10 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
              {manual.eyebrow}
            </p>
            <h1 className="mt-4 text-balance font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              <span className="aura-gradient-text">{manual.h1a}</span>
              <br />
              {manual.h1b}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-text-secondary">
              {manual.lede}
            </p>
          </div>

          {/* Layout: sticky TOC + content */}
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[260px_1fr]">
            <HelpToc
              title={manual.tocTitle}
              items={manual.sections.map((s) => ({ id: s.id, title: s.title }))}
            />

            <div className="min-w-0">
              {manual.sections.map((section, i) => (
                <section
                  key={section.id}
                  id={`sec-${section.id}`}
                  className="scroll-mt-24 border-t border-border/60 py-8 first:border-t-0 first:pt-0"
                >
                  <h2 className="mb-4 flex items-baseline gap-3 font-serif text-2xl font-semibold tracking-tight">
                    <span className="font-mono text-sm font-normal text-teal">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {section.title}
                  </h2>
                  <div
                    className="manual-prose"
                    // Content is fully static and authored in-repo (no user
                    // input), so rendering it as HTML is safe here.
                    dangerouslySetInnerHTML={{ __html: section.html }}
                  />
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
