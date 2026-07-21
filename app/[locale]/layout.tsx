import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

// Inter for body/UI — same neutral grotesque the dashboard mockup uses.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Playfair for serif display headings ("Latest News" in the mockup).
// Available via the `font-serif` Tailwind utility.
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AURA — Automated Urban Radio Audio',
  description:
    'AI-voiced news bulletins for radio stations. Search global news, generate emotional scripts, and ship broadcast-quality audio in minutes.',
  // PWA installability hints. Next picks up the manifest from
  // app/manifest.ts automatically and emits the <link rel="manifest">
  // tag; these meta entries cover the rest.
  applicationName: 'AURA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AURA',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#06080F',
  initialScale: 1,
  width: 'device-width',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;

  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`dark ${inter.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen bg-base font-sans text-text-primary antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
