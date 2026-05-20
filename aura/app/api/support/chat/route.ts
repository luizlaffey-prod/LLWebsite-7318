import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { askAuraAssistant } from '@/lib/llm/aura-assistant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(30),
  locale: z.enum(['en', 'pt', 'es']),
});

/**
 * AURA Assistant chat endpoint. Standard and Pro tiers only (Starter
 * doesn't include chat per the marketing copy). Trial users keep
 * access while they're on Pro-via-trial.
 *
 * Stateless: the client owns the conversation history and replays it
 * on every turn. Keeps the route simple and lets the operator close
 * the tab without losing data (sessionStorage on the client).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [u] = await db
    .select({
      plan: user.plan,
      radioName: user.radioName,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const tier = effectiveTier(u?.plan);
  if (tier === 'starter') {
    return NextResponse.json(
      { error: 'feature_not_available', requires: 'standard' },
      { status: 403 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const reply = await askAuraAssistant({
      messages: body.messages,
      locale: body.locale,
      tier,
      radioName: u?.radioName ?? null,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[support-chat] assistant call failed', message);
    return NextResponse.json(
      { error: 'assistant_unavailable', message: message.slice(0, 200) },
      { status: 502 }
    );
  }
}
