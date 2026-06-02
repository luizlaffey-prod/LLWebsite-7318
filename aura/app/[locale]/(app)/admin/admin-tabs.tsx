'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

const TABS = [
  { key: 'users', href: '/admin/users', label: 'Users', icon: Users },
  {
    key: 'automations',
    href: '/admin/automations',
    label: 'Automations',
    icon: CalendarClock,
  },
] as const;

export function AdminTabs({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  return (
    <div className="border-b border-border bg-surface/40 px-4 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-1">
        {TABS.map((tab) => {
          const href = `/${locale}${tab.href}`;
          const active = pathname.startsWith(href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors',
                active
                  ? 'border-teal text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
