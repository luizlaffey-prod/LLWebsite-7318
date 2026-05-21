import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

/**
 * Rename a voice the current user owns. Used to fix cloned voices
 * whose displayed name doesn't match the one chosen during cloning
 * (historical bug) and to let users rename their voices later.
 *
 * Guard: only the voice's ownerUserId can edit. Global catalog
 * voices (ownerUserId IS NULL) are never editable through this
 * endpoint — they're managed by the in-code VOICE_CATALOG.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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

  const [target] = await db
    .select({ id: voiceTable.id, ownerUserId: voiceTable.ownerUserId })
    .from(voiceTable)
    .where(eq(voiceTable.id, id))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }
  if (target.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await db
    .update(voiceTable)
    .set({ name: body.name })
    .where(and(eq(voiceTable.id, id), eq(voiceTable.ownerUserId, session.user.id)));

  return NextResponse.json({ ok: true });
}
