'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarNav } from './sidebar-nav';
import type { Locale } from '@/i18n';

interface SidebarProps {
  locale: Locale;
  radioName?: string | null;
  planLabel?: string;
  brandLogoUrl?: string | null;
}

/**
 * Desktop-only sticky sidebar (hidden on mobile). The mobile drawer lives in
 * MobileTopBar and shares the same SidebarNav content.
 */
export function AppSidebar(props: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 z-30 hidden h-screen flex-col border-r border-border bg-surface transition-all md:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute right-2 top-5 rounded-md p-1 text-text-muted hover:bg-elevated hover:text-text-secondary"
        aria-label="Toggle sidebar"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
      <SidebarNav {...props} collapsed={collapsed} />
    </aside>
  );
}
