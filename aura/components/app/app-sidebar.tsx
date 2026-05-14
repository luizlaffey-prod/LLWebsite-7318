'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Search,
  Headphones,
  Mic,
  CalendarClock,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

interface SidebarProps {
  locale: Locale;
  radioName?: string | null;
  planLabel?: string;
  brandLogoUrl?: string | null;
}

const ITEMS = [
  { key: 'news', icon: Search, href: '/news' },
  { key: 'audios', icon: Headphones, href: '/audios' },
  { key: 'voices', icon: Mic, href: '/voices' },
  { key: 'automations', icon: CalendarClock, href: '/automations' },
  { key: 'settings', icon: Settings, href: '/settings' },
] as const;

export function AppSidebar({ locale, radioName, planLabel, brandLogoUrl }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push(`/${locale}/login`);
  };

  return (
    <aside
      className={cn(
        'sticky top-0 z-30 flex h-screen flex-col border-r border-border bg-surface transition-all',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoUrl}
              alt="Logo"
              className={cn('h-8 object-contain', collapsed ? 'w-8' : 'w-auto max-w-[140px]')}
            />
          ) : (
            <>
              <span className="text-xl font-semibold aura-gradient-text">A</span>
              {!collapsed && (
                <span className="text-lg font-semibold aura-gradient-text">AURA</span>
              )}
            </>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1 text-text-muted hover:bg-elevated hover:text-text-secondary"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="border-b border-border px-4 py-4">
          <p className="truncate text-xs text-text-muted uppercase tracking-wider">
            {radioName ? 'Station' : ''}
          </p>
          <p className="truncate text-sm font-medium text-text-primary">
            {radioName ?? '—'}
          </p>
          {planLabel && (
            <span className="mt-2 inline-flex items-center rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal">
              {planLabel}
            </span>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-2 py-4">
        {ITEMS.map((item) => {
          const href = `/${locale}${item.href}`;
          const active = pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-elevated/60 hover:text-text-primary',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-teal')} />
              {!collapsed && <span>{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-2 py-3">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-elevated hover:text-text-primary',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
