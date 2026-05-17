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
}

/**
 * Picks a UI language by rewriting the current URL's first segment. Used
 * on the marketing site where there's no user record to persist a
 * preference to — the URL itself is the source of truth.
 *
 * Authenticated users hit a separate flow in the (app) layout that
 * mirrors `user.locale` back into the URL; this component doesn't try
 * to touch that state.
 */
export function LanguageSwitcher({ current }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (next: string) => {
    if (next === current) return;
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
