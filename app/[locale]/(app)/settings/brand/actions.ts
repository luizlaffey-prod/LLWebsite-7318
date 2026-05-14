'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWhiteLabel } from '@/lib/billing/feature-gates';

const Input = z.object({
  brandLogoUrl: z.string().url().optional().or(z.literal('')),
  brandAccentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'invalid_hex')
    .optional()
    .or(z.literal('')),
});

export async function updateBrand(input: {
  brandLogoUrl?: string;
  brandAccentColor?: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session?.user) return { error: 'unauthorized' };

  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  if (!canWhiteLabel(tier)) {
    return { error: 'feature_not_available' };
  }

  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: 'invalid_input' };

  await db
    .update(user)
    .set({
      brandLogoUrl: parsed.data.brandLogoUrl || null,
      brandAccentColor: parsed.data.brandAccentColor || null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  return { ok: true };
}
