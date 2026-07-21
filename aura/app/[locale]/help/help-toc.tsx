'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  title: string;
}

/**
 * Sticky table of contents for the /help manual. Highlights the section
 * currently in view via IntersectionObserver and smooth-scrolls on click.
 * Pure client-side enhancement over the server-rendered section anchors.
 */
export function HelpToc({ items, title }: { items: TocItem[]; title: string }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    for (const item of items) {
      const el = document.getElementById(`sec-${item.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={title}
      className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto md:block"
    >
      <p className="mb-3 pl-3 text-xs uppercase tracking-wider text-text-muted">
        {title}
      </p>
      <ol className="space-y-0.5">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#sec-${item.id}`}
              className={cn(
                'grid grid-cols-[1.4rem_1fr] items-baseline gap-2.5 rounded-md border-l-2 px-2.5 py-1.5 text-[13.5px] leading-tight transition-colors',
                active === item.id
                  ? 'border-teal bg-surface text-text-primary'
                  : 'border-transparent text-text-secondary hover:bg-surface hover:text-text-primary'
              )}
            >
              <span
                className={cn(
                  'font-mono text-[11px]',
                  active === item.id ? 'text-teal' : 'text-text-muted'
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{item.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
