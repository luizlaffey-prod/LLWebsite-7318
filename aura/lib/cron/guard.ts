import { NextResponse } from 'next/server';

/**
 * Vercel Cron Triggers attach an Authorization: Bearer <CRON_SECRET> header.
 * Locally we accept the same to make manual testing easy.
 */
export function requireCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If no secret is set, refuse outright in production.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'cron_secret_unset' }, { status: 500 });
    }
    return null; // allow in dev
  }
  const header = req.headers.get('authorization') ?? '';
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
