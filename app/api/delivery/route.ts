import { NextResponse } from 'next/server';
import { count, desc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { deliveryEndpoint, user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import {
  canAutoDeliver,
  maxDeliveryEndpoints,
} from '@/lib/billing/feature-gates';
import { DeliveryInput } from '@/lib/delivery/schemas';
import { encryptJSON } from '@/lib/crypto/secrets';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: deliveryEndpoint.id,
      name: deliveryEndpoint.name,
      type: deliveryEndpoint.type,
      slotNamingPattern: deliveryEndpoint.slotNamingPattern,
      enabled: deliveryEndpoint.enabled,
      lastUsedAt: deliveryEndpoint.lastUsedAt,
      createdAt: deliveryEndpoint.createdAt,
    })
    .from(deliveryEndpoint)
    .where(eq(deliveryEndpoint.userId, session.user.id))
    .orderBy(desc(deliveryEndpoint.createdAt));

  return NextResponse.json({ endpoints: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  if (!canAutoDeliver(tier)) {
    return NextResponse.json(
      { error: 'feature_not_available', requires: 'standard' },
      { status: 403 }
    );
  }

  // Per-tier endpoint cap: Standard 1, Pro unlimited. Count current
  // rows before allowing a new INSERT so the user can't slip past the
  // UI cap by replaying the POST directly.
  const cap = maxDeliveryEndpoints(tier);
  if (Number.isFinite(cap)) {
    const [{ existing }] = await db
      .select({ existing: count() })
      .from(deliveryEndpoint)
      .where(eq(deliveryEndpoint.userId, session.user.id));
    if (Number(existing) >= cap) {
      return NextResponse.json(
        {
          error: 'destination_limit_reached',
          limit: cap,
          message: `Your plan allows ${cap} destination(s). Upgrade to Pro for unlimited destinations.`,
        },
        { status: 403 }
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const parsed = DeliveryInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(deliveryEndpoint)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      configEncrypted: encryptJSON(parsed.data.config),
      slotNamingPattern: parsed.data.slotNamingPattern,
      enabled: parsed.data.enabled,
    })
    .returning({ id: deliveryEndpoint.id });

  return NextResponse.json({ id: created.id });
}
