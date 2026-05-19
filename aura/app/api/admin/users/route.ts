import { NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/**
 * Operator dashboard: paginated list of every user account plus
 * the metrics needed to triage the funnel (totals by plan,
 * by subscription state, trial-expiring soon). Gated behind
 * ADMIN_EMAILS so customers never reach it even if they guess
 * the URL.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const planFilter = url.searchParams.get('plan'); // trial|starter|standard|pro|all
  const statusFilter = url.searchParams.get('status'); // active|trialing|past_due|canceled|all
  const newsletter = url.searchParams.get('newsletter'); // yes|no|all
  const searchTerm = (url.searchParams.get('q') ?? '').trim();

  const filters: ReturnType<typeof and>[] = [];
  if (planFilter && planFilter !== 'all') {
    filters.push(eq(user.plan, planFilter as 'trial' | 'starter' | 'standard' | 'pro'));
  }
  if (statusFilter && statusFilter !== 'all') {
    filters.push(
      eq(
        user.subscriptionStatus,
        statusFilter as 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
      )
    );
  }
  if (newsletter === 'yes') filters.push(eq(user.emailNotifications, true));
  if (newsletter === 'no') filters.push(eq(user.emailNotifications, false));
  if (searchTerm.length > 0) {
    filters.push(
      or(
        ilike(user.email, `%${searchTerm}%`),
        ilike(user.radioName, `%${searchTerm}%`),
        ilike(user.name, `%${searchTerm}%`)
      )
    );
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: user.id,
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
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: count() })
    .from(user)
    .where(where);

  // Funnel metrics — computed across the FULL table so the dashboard
  // numbers don't shift as filters narrow the list view.
  const summaryRows = await db.execute<{
    plan: string;
    n: number;
  }>(sql`SELECT plan::text as plan, COUNT(*)::int as n FROM "user" GROUP BY plan`);
  const planCounts: Record<string, number> = {};
  for (const r of summaryRows.rows ?? []) planCounts[r.plan] = Number(r.n);

  const trialExpiringIn7d = await db.execute<{ n: number }>(
    sql`SELECT COUNT(*)::int as n FROM "user"
        WHERE plan = 'trial'
          AND trial_ends_at IS NOT NULL
          AND trial_ends_at > NOW()
          AND trial_ends_at <= NOW() + INTERVAL '7 days'`
  );

  const optedIntoMarketing = await db.execute<{ n: number }>(
    sql`SELECT COUNT(*)::int as n FROM "user" WHERE email_notifications = true`
  );

  return NextResponse.json({
    users: rows,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.max(1, Math.ceil(Number(total) / PAGE_SIZE)),
    },
    summary: {
      byPlan: planCounts,
      trialExpiring7d: Number(trialExpiringIn7d.rows?.[0]?.n ?? 0),
      optedIntoMarketing: Number(optedIntoMarketing.rows?.[0]?.n ?? 0),
    },
  });
}
