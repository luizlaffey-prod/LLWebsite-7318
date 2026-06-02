import { NextResponse } from 'next/server';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import { automationSchedule, user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/**
 * Operator-facing list of every automation across every account.
 * Joins the schedule table against `user` so the dashboard can show
 * who owns each automation without a second round-trip per row.
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
  const q = (url.searchParams.get('q') ?? '').trim();

  const where = q.length
    ? or(
        ilike(automationSchedule.name, `%${q}%`),
        ilike(user.email, `%${q}%`),
        ilike(user.radioName, `%${q}%`)
      )
    : undefined;

  const rows = await db
    .select({
      id: automationSchedule.id,
      name: automationSchedule.name,
      enabled: automationSchedule.enabled,
      language: automationSchedule.language,
      timezone: automationSchedule.timezone,
      bias: automationSchedule.bias,
      slots: automationSchedule.slots,
      createdAt: automationSchedule.createdAt,
      userId: automationSchedule.userId,
      userEmail: user.email,
      radioName: user.radioName,
      plan: user.plan,
    })
    .from(automationSchedule)
    .leftJoin(user, eq(automationSchedule.userId, user.id))
    .where(where)
    .orderBy(desc(automationSchedule.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: count() })
    .from(automationSchedule)
    .leftJoin(user, eq(automationSchedule.userId, user.id))
    .where(where);

  return NextResponse.json({
    automations: rows,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.max(1, Math.ceil(Number(total) / PAGE_SIZE)),
    },
  });
}
