import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  locale: z.enum(['en', 'pt', 'es']),
});

/**
 * Lightweight endpoint for the in-app language switcher. Updates only
 * the user.locale column so future logins remember the choice — the
 * caller is also responsible for navigating to the new URL prefix.
 * Kept separate from /settings updateSettings so the switcher doesn't
 * have to round-trip every other preference.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  await db
    .update(user)
    .set({ locale: body.locale, updatedAt: new Date() })
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ ok: true, locale: body.locale });
}
