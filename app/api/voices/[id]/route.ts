import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).optional(),
  style: z.string().trim().max(100).optional(),
  accent: z.string().trim().max(100).optional(),
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

  const updateFields: Record<string, string | undefined> = {};
  if (body.name !== undefined) updateFields.name = body.name;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.style !== undefined) updateFields.style = body.style;
  if (body.accent !== undefined) updateFields.accent = body.accent;

  if (target.ownerUserId === session.user.id) {
    await db
      .update(voiceTable)
      .set(updateFields)
      .where(and(eq(voiceTable.id, id), eq(voiceTable.ownerUserId, session.user.id)));
  } else {
    // For global catalog voices, update the description/style for the catalog item
    await db
      .update(voiceTable)
      .set(updateFields)
      .where(eq(voiceTable.id, id));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [target] = await db
    .select({
      id: voiceTable.id,
      ownerUserId: voiceTable.ownerUserId,
      isCloned: voiceTable.isCloned,
      elevenLabsVoiceId: voiceTable.elevenLabsVoiceId,
    })
    .from(voiceTable)
    .where(eq(voiceTable.id, id))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }
  if (target.ownerUserId !== session.user.id || !target.isCloned) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Attempt upstream model cleanup if applicable (best effort)
  if (target.elevenLabsVoiceId?.startsWith('fish:')) {
    const fishKey = process.env.FISHAUDIO_API_KEY || process.env.FISH_API_KEY;
    const modelId = target.elevenLabsVoiceId.replace(/^fish:/, '');
    if (fishKey && modelId && modelId !== 'default') {
      try {
        await fetch(`https://api.fish.audio/model/${modelId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${fishKey}` },
        });
      } catch (err) {
        console.warn('[voice-delete] Fish Audio upstream model delete warning:', err);
      }
    }
  } else if (target.elevenLabsVoiceId) {
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (elevenKey) {
      try {
        await fetch(`https://api.elevenlabs.io/v1/voices/${target.elevenLabsVoiceId}`, {
          method: 'DELETE',
          headers: { 'xi-api-key': elevenKey },
        });
      } catch (err) {
        console.warn('[voice-delete] ElevenLabs upstream model delete warning:', err);
      }
    }
  }

  await db
    .delete(voiceTable)
    .where(and(eq(voiceTable.id, id), eq(voiceTable.ownerUserId, session.user.id)));

  return NextResponse.json({ ok: true });
}
