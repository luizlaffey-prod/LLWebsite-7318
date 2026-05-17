'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Locale } from '@/i18n';

interface GoogleAuthButtonProps {
  locale: Locale;
}

/**
 * "Continue with Google" CTA — single-click sign-in or sign-up via the
 * Google OAuth flow betterAuth wires up. Same UX on /login and /signup
 * because Google's flow already does the existing-account check on the
 * provider side. Render only when isGoogleAuthConfigured() is true on
 * the server.
 */
export function GoogleAuthButton({ locale }: GoogleAuthButtonProps) {
  const t = useTranslations('auth');
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `/${locale}/dashboard`,
      });
      // signIn.social triggers a full-page redirect — we don't usually
      // get past this point. If we DO (e.g. popup mode), the auth
      // client handles the rest. Leaving pending=true so the button
      // stays disabled while the redirect completes.
    } catch {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleGlyph />
      )}
      {t('continueWithGoogle')}
    </Button>
  );
}

function GoogleGlyph() {
  // Multi-color "G" mark — official Google branding requires the four
  // brand colors when not displayed on a Google-blue button.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
