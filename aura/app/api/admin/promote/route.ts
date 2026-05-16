import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PromoteSchema = z.object({
  email: z.string().email(),
  plan: z.enum(['starter', 'standard', 'pro']).default('pro'),
});

/**
 * Operator endpoint for promoting a freshly-signed-up user to a paid plan
 * without going through Stripe — used to provision the AURA team's own
 * super-admin accounts. Guarded by MIGRATE_SECRET (the same secret already
 * used by seed-voices) so it can't be hit anonymously.
 *
 * Idempotent: calling it twice with the same email is a no-op on the
 * second call. Clears trialEndsAt and marks subscriptionStatus='active'
 * so feature gates and quota calculations treat the account as fully
 * paying.
 */
export async function POST(req: Request) {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'MIGRATE_SECRET not configured' },
      { status: 500 }
    );
  }
  if (req.headers.get('x-migrate-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof PromoteSchema>;
  try {
    const raw: unknown = await req.json();
    body = PromoteSchema.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid body';
    return NextResponse.json({ error: 'bad_request', message }, { status: 400 });
  }

  const targetEmail = body.email.toLowerCase();

  const [existing] = await db
    .select({ id: user.id, email: user.email, plan: user.plan })
    .from(user)
    .where(eq(user.email, targetEmail))
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: 'user_not_found', email: targetEmail },
      { status: 404 }
    );
  }

  await db
    .update(user)
    .set({
      plan: body.plan,
      subscriptionStatus: 'active',
      trialEndsAt: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, existing.id));

  return NextResponse.json({
    ok: true,
    userId: existing.id,
    email: existing.email,
    previousPlan: existing.plan,
    newPlan: body.plan,
  });
}
