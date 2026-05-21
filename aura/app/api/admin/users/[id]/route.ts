import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { isAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  plan: z.enum(['trial', 'starter', 'standard', 'pro']).optional(),
  subscriptionStatus: z
    .enum(['trialing', 'active', 'past_due', 'canceled', 'unpaid'])
    .nullable()
    .optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
});

/**
 * Operator endpoint to adjust a single user's plan / trial / status
 * without going through Stripe. Used to comp partners, extend trials,
 * or unblock a stuck account. Same admin gate as the rest of /admin —
 * session must come from an email in ADMIN_EMAILS.
 *
 * All three fields are optional; only what's sent is updated. Passing
 * `trialEndsAt: null` clears the trial date (typical when promoting a
 * trial user to a paid plan).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: z.infer<typeof PatchSchema>;
  try {
    const raw: unknown = await req.json();
    body = PatchSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: 'bad_request', message: err instanceof Error ? err.message : '' },
      { status: 400 }
    );
  }

  if (
    body.plan === undefined &&
    body.subscriptionStatus === undefined &&
    body.trialEndsAt === undefined
  ) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const [target] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const update: Partial<typeof user.$inferInsert> = { updatedAt: new Date() };
  if (body.plan !== undefined) update.plan = body.plan;
  if (body.subscriptionStatus !== undefined) {
    update.subscriptionStatus = body.subscriptionStatus;
  }
  if (body.trialEndsAt !== undefined) {
    update.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
  }

  await db.update(user).set(update).where(eq(user.id, id));

  const [refreshed] = await db
    .select({
      id: user.id,
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  return NextResponse.json({ ok: true, user: refreshed });
}
