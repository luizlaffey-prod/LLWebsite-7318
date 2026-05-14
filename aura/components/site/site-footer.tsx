import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations('landing.footer');

  return (
    <footer className="border-t border-border/60 bg-base">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <p className="text-xs text-text-muted">© {new Date().getFullYear()} {t('copyright')}</p>
        <nav className="flex items-center gap-6 text-xs text-text-secondary">
          <Link href={`/${locale}/terms`} className="hover:text-text-primary">
            {t('terms')}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-text-primary">
            {t('privacy')}
          </Link>
          <Link href={`/${locale}/contact`} className="hover:text-text-primary">
            {t('contact')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
