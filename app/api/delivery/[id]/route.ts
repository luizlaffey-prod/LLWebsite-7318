import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { deliveryEndpoint } from '@/lib/db/schema';
import { encryptJSON } from '@/lib/crypto/secrets';
import { DeliveryInput } from '@/lib/delivery/schemas';

export const runtime = 'nodejs';

const PatchInput = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(2).max(120).optional(),
  slotNamingPattern: z.string().min(1).max(200).optional(),
  /** Optional full replacement of the endpoint payload. */
  replace: DeliveryInput.optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.slotNamingPattern !== undefined)
    updates.slotNamingPattern = parsed.data.slotNamingPattern;
  if (parsed.data.replace) {
    updates.type = parsed.data.replace.type;
    updates.configEncrypted = encryptJSON(parsed.data.replace.config);
    updates.name = parsed.data.replace.name;
    updates.slotNamingPattern = parsed.data.replace.slotNamingPattern;
    updates.enabled = parsed.data.replace.enabled;
  }

  const result = await db
    .update(deliveryEndpoint)
    .set(updates)
    .where(
      and(
        eq(deliveryEndpoint.id, id),
        eq(deliveryEndpoint.userId, session.user.id)
      )
    )
    .returning({ id: deliveryEndpoint.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;

  const result = await db
    .delete(deliveryEndpoint)
    .where(
      and(
        eq(deliveryEndpoint.id, id),
        eq(deliveryEndpoint.userId, session.user.id)
      )
    )
    .returning({ id: deliveryEndpoint.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
