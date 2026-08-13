import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { voice as voiceTable, voicePreference } from '@/lib/db/schema';
import { canUseVoice } from '@/lib/billing/feature-gates';
import { getQuota } from '@/lib/billing/quota';
import { isVoiceAvailableToUser } from '@/lib/tts/voice-clone-policy';

export const runtime = 'nodejs';

const Input = z.object({
  voiceId: z.string().uuid(),
  speed: z.number().min(0.8).max(1.5).default(1.0),
  isDefault: z.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const [chosen] = await db
    .select()
    .from(voiceTable)
    .where(eq(voiceTable.id, parsed.data.voiceId))
    .limit(1);
  if (!chosen || !isVoiceAvailableToUser(chosen, session.user.id)) {
    return NextResponse.json({ error: 'voice_not_found' }, { status: 404 });
  }

  const quota = await getQuota(session.user.id);
  if (!canUseVoice(quota.tier, chosen)) {
    return NextResponse.json(
      { error: 'voice_not_allowed', requires: chosen.tierRequired },
      { status: 403 }
    );
  }

  if (parsed.data.isDefault) {
    // Clear previous default before flipping the new one.
    await db
      .update(voicePreference)
      .set({ isDefault: false })
      .where(eq(voicePreference.userId, session.user.id));
  }

  const existing = (
    await db
      .select()
      .from(voicePreference)
      .where(
        and(
          eq(voicePreference.userId, session.user.id),
          eq(voicePreference.voiceId, parsed.data.voiceId)
        )
      )
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(voicePreference)
      .set({ speed: parsed.data.speed, isDefault: parsed.data.isDefault })
      .where(eq(voicePreference.id, existing.id));
  } else {
    await db.insert(voicePreference).values({
      userId: session.user.id,
      voiceId: parsed.data.voiceId,
      speed: parsed.data.speed,
      isDefault: parsed.data.isDefault,
    });
  }

  return NextResponse.json({ ok: true });
}
