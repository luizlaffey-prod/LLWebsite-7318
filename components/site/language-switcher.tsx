'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales, type Locale } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
};

interface LanguageSwitcherProps {
  current: Locale;
  /**
   * When true, also POST the chosen locale to /api/user/locale so future
   * logins remember it. Used inside the authenticated app; left off on
   * the marketing site where there's no user record yet.
   */
  persist?: boolean;
}

/**
 * Picks a UI language by rewriting the current URL's first segment. The
 * URL is always the source of truth for what the user sees right now;
 * the optional persist flag mirrors the choice into user.locale so
 * future sessions default to the same language.
 */
export function LanguageSwitcher({ current, persist = false }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (next: string) => {
    if (next === current) return;
    if (persist) {
      // Fire-and-forget — navigation happens regardless of the save
      // outcome so a transient 5xx doesn't strand the user on a stale
      // language. Worst case the next login uses the old preference.
      void fetch('/api/user/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
    }
    // Pathname always starts with `/<locale>` because middleware enforces
    // localePrefix: 'always'. Swap that first segment.
    const swapped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, `/${next}`);
    router.push(swapped);
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger
        className="h-8 w-auto gap-1.5 border-border/60 bg-elevated/40 px-2.5 text-xs"
        aria-label="Language"
      >
        <Globe className="h-3.5 w-3.5 text-text-secondary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {LABELS[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
