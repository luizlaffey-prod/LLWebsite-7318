import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { Button } from '@/components/ui/button';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const tNav = await getTranslations('nav');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href={`/${locale}`}
          className="text-2xl font-semibold tracking-tight"
        >
          <span className="aura-gradient-text">AURA</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/login`}>{tNav('login')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/${locale}/signup`}>{tNav('signup')}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
