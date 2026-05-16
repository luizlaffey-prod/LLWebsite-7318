'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarNav } from './sidebar-nav';
import type { Locale } from '@/i18n';

interface Props {
  locale: Locale;
  radioName?: string | null;
  planLabel?: string;
  brandLogoUrl?: string | null;
}

/**
 * Mobile-only header (hidden on md+). Hamburger opens a slide-in Sheet
 * containing the same SidebarNav as the desktop aside, which auto-closes
 * after a nav click via onNavigate.
 */
export function MobileTopBar({
  locale,
  radioName,
  planLabel,
  brandLogoUrl,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1 text-text-primary hover:bg-elevated"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          href={`/${locale}/dashboard`}
          className="flex flex-1 items-center gap-2 truncate"
        >
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoUrl}
              alt="Logo"
              className="h-7 w-auto max-w-[100px] object-contain"
            />
          ) : (
            <span className="text-lg font-semibold aura-gradient-text">
              AURA
            </span>
          )}
          {radioName && (
            <span className="truncate text-sm text-text-secondary">
              · {radioName}
            </span>
          )}
        </Link>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
          <SidebarNav
            locale={locale}
            radioName={radioName}
            planLabel={planLabel}
            brandLogoUrl={brandLogoUrl}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
