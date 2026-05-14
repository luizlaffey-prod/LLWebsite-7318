'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

const ProfileInput = z.object({
  radioName: z.string().min(2).max(120),
  locale: z.enum(['en', 'pt', 'es']),
  timezone: z.string().min(2).max(60),
  emailNotifications: z.boolean(),
});

export async function updateSettings(input: {
  radioName: string;
  locale: 'en' | 'pt' | 'es';
  timezone: string;
  emailNotifications: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session?.user) return { error: 'unauthorized' };

  const parsed = ProfileInput.safeParse(input);
  if (!parsed.success) return { error: 'invalid_input' };

  await db
    .update(user)
    .set({
      radioName: parsed.data.radioName,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
      emailNotifications: parsed.data.emailNotifications,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  return { ok: true };
}
