import Link from 'next/link';
import type { Locale } from '@/i18n';

interface AppBrandHeaderProps {
  locale: Locale;
  /** Hide the tagline on narrow viewports — wordmark alone still reads. */
  className?: string;
}

/**
 * Top-of-page brand strip used by every authenticated app screen.
 * Matches the mockup: a mint-on-dark-teal broadcast-icon tile beside
 * the AURA wordmark and dimmer tagline. Sits inside the main content
 * area (not the sidebar) so it reads as a page-wide identity bar.
 */
export function AppBrandHeader({ locale, className = '' }: AppBrandHeaderProps) {
  return (
    <header
      className={`flex h-16 items-center border-b border-border bg-base px-4 md:px-8 ${className}`}
    >
      <Link
        href={`/${locale}/dashboard`}
        className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-md"
        aria-label="AURA — Automated Urban Radio Audio"
      >
        <BroadcastTile />
        <span className="flex items-baseline gap-2 truncate">
          <span className="text-base font-bold tracking-tight text-text-primary md:text-lg">
            AURA
          </span>
          <span className="hidden truncate text-sm font-medium text-text-secondary sm:inline">
            — Automated Urban Radio Audio
          </span>
        </span>
      </Link>
    </header>
  );
}

function BroadcastTile() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0F2D2A]"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="1.6" fill="#00E5C8" />
        <path
          d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2"
          stroke="#00E5C8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M5.7 5.7a8.9 8.9 0 0 0 0 12.6"
          stroke="#00E5C8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M15.6 8.4a5.1 5.1 0 0 1 0 7.2"
          stroke="#00E5C8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M18.3 5.7a8.9 8.9 0 0 1 0 12.6"
          stroke="#00E5C8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
