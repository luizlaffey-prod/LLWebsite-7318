import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default function middleware(req: NextRequest) {
  const res = intlMiddleware(req);
  res.headers.set('x-pathname', req.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
