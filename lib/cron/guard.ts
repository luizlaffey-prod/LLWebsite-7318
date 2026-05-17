import { NextResponse } from 'next/server';

/**
 * Validates the caller is Vercel Cron (or a manual operator with the
 * same secret). Vercel attaches `Authorization: Bearer <CRON_SECRET>`
 * to every cron invocation when CRON_SECRET is set in project env
 * vars; without that env var it sends nothing, and we have to fail
 * loudly so the operator knows to configure it.
 *
 * Returns null when the caller is authorised; returns a NextResponse
 * (the route should return it directly) on rejection. Each rejection
 * is also logged so Vercel function logs reveal the specific reason
 * (missing secret vs header mismatch) rather than a generic 500.
 */
export function requireCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization') ?? '';

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[cron] CRON_SECRET env var is not set — every cron tick will 500 ' +
          'until it is. Generate a strong random string and add it to ' +
          'Vercel → Project → Settings → Environment Variables (all ' +
          'environments), then redeploy.'
      );
      return NextResponse.json(
        {
          error: 'cron_secret_unset',
          hint: 'Set CRON_SECRET env var in Vercel (Settings → Environment Variables) and redeploy.',
        },
        { status: 500 }
      );
    }
    // Dev: no secret configured, no enforcement. Useful for local
    // curl-testing while developing the route.
    return null;
  }

  if (header !== `Bearer ${secret}`) {
    console.warn(
      '[cron] Authorization mismatch. Header present:',
      !!header,
      'Expected length:',
      `Bearer ${secret}`.length,
      'Got length:',
      header.length
    );
    return NextResponse.json(
      {
        error: 'unauthorized',
        hint: 'Either CRON_SECRET on Vercel does not match the value the cron caller sends, or the caller is not Vercel Cron. Make sure the env var is set on this deployment.',
      },
      { status: 401 }
    );
  }

  return null;
}
