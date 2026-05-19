import { desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator-only CSV dump of every user row, optimised for pasting
 * into HubSpot / Mailchimp / a quick spreadsheet. Columns are stable
 * (consumers tend to script against them), and only customers who
 * have emailNotifications=true should be used for non-transactional
 * sends — the column is included so the operator can filter.
 *
 * Streams up to the entire user table at once. We don't paginate
 * because there's no realistic scale issue until tens of thousands
 * of accounts; revisit then.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return new Response('unauthorized', { status: 401 });
  }
  if (!isAdminSession(session)) {
    return new Response('forbidden', { status: 403 });
  }

  const rows = await db
    .select({
      email: user.email,
      name: user.name,
      radioName: user.radioName,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      locale: user.locale,
      timezone: user.timezone,
      emailNotifications: user.emailNotifications,
      stripeCustomerId: user.stripeCustomerId,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  const header = [
    'email',
    'name',
    'radio_name',
    'plan',
    'subscription_status',
    'trial_ends_at',
    'locale',
    'timezone',
    'newsletter_opt_in',
    'stripe_customer_id',
    'created_at',
  ].join(',');

  const lines = rows.map((r) =>
    [
      csv(r.email),
      csv(r.name ?? ''),
      csv(r.radioName ?? ''),
      csv(r.plan),
      csv(r.subscriptionStatus ?? ''),
      csv(r.trialEndsAt?.toISOString() ?? ''),
      csv(r.locale),
      csv(r.timezone),
      csv(r.emailNotifications ? 'yes' : 'no'),
      csv(r.stripeCustomerId ?? ''),
      csv(r.createdAt.toISOString()),
    ].join(',')
  );

  const body = [header, ...lines].join('\n');
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aura-users-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

function csv(value: string): string {
  // Quote when the value contains a separator, quote, or newline, and
  // escape embedded quotes by doubling them — RFC 4180 minimum.
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
