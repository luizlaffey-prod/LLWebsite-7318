import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user, type WordPressSecret, type WebhookSecret } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWriteArticles } from '@/lib/billing/feature-gates';
import { PublishingInput } from '@/lib/articles/publishing-schemas';
import { encryptJSON } from '@/lib/crypto/secrets';
import { testConnection, PublishError } from '@/lib/articles/publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Tests connection credentials the user typed into the form, without
 * saving them. Lets the operator confirm the WordPress app password (or
 * webhook endpoint) works before committing the connection.
 */
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
  if (!canWriteArticles(effectiveTier(u?.plan))) {
    return NextResponse.json(
      { error: 'feature_not_available', requires: 'pro' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PublishingInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const secret =
    input.type === 'wordpress'
      ? ({ username: input.username, appPassword: input.appPassword } as WordPressSecret)
      : ({ secret: input.secret } as WebhookSecret);

  try {
    await testConnection({
      type: input.type,
      siteUrl: input.siteUrl,
      configEncrypted: encryptJSON(secret),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      reason: err instanceof PublishError ? err.reason : 'unknown',
    });
  }
}
