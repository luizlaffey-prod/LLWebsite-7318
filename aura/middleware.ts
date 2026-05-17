import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Pin first-touch visitors to defaultLocale ('en') regardless of their
  // browser's Accept-Language. The previous behavior auto-redirected a
  // Portuguese browser to /pt — surprising for a US-targeted product
  // whose marketing site should open in English. Logged-in users still
  // get routed to their saved preference by the (app) layout, and the
  // header language switcher overrides on demand.
  localeDetection: false,
});

export default function middleware(req: NextRequest) {
  const res = intlMiddleware(req);
  res.headers.set('x-pathname', req.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
