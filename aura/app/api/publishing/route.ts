import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import {
  publishingConnection,
  user,
  type WordPressSecret,
} from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWriteArticles } from '@/lib/billing/feature-gates';
import { PublishingInput } from '@/lib/articles/publishing-schemas';
import { encryptJSON, decryptJSON } from '@/lib/crypto/secrets';
import { testConnection, PublishError } from '@/lib/articles/publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The current station's publishing connection, secrets stripped. Returns
 * the WordPress username (safe) so the form can pre-fill, never the
 * app password / webhook secret. */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const [row] = await db
    .select()
    .from(publishingConnection)
    .where(eq(publishingConnection.userId, session.user.id))
    .limit(1);
  if (!row) return NextResponse.json({ connection: null });

  let username: string | null = null;
  if (row.type === 'wordpress') {
    try {
      username = decryptJSON<WordPressSecret>(row.configEncrypted).username;
    } catch {
      /* corrupt blob — leave username null */
    }
  }

  return NextResponse.json({
    connection: {
      type: row.type,
      siteUrl: row.siteUrl,
      defaultStatus: row.defaultStatus,
      enabled: row.enabled,
      verifiedAt: row.verifiedAt,
      lastError: row.lastError,
      username,
    },
  });
}

/** Split validated input into the plaintext columns and the secret blob. */
function split(input: ReturnType<typeof PublishingInput.parse>) {
  if (input.type === 'wordpress') {
    return {
      type: 'wordpress' as const,
      siteUrl: input.siteUrl,
      defaultStatus: input.defaultStatus,
      enabled: input.enabled,
      secret: {
        username: input.username,
        appPassword: input.appPassword,
      } as WordPressSecret,
    };
  }
  return {
    type: 'webhook' as const,
    siteUrl: input.siteUrl,
    defaultStatus: 'draft',
    enabled: input.enabled,
    secret: { secret: input.secret },
  };
}

/** Create or replace the station's single publishing connection. Saving
 * always succeeds (so a temporarily-down site can still be configured); we
 * run a connection test and record the verified/unverified state alongside. */
export async function PUT(req: Request) {
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
  const s = split(parsed.data);
  const configEncrypted = encryptJSON(s.secret);

  // Verify before persisting the verified flag.
  let verified = false;
  let reason: string | undefined;
  try {
    await testConnection({ type: s.type, siteUrl: s.siteUrl, configEncrypted });
    verified = true;
  } catch (err) {
    reason = err instanceof PublishError ? err.reason : 'unknown';
  }

  const now = new Date();
  await db
    .insert(publishingConnection)
    .values({
      userId: session.user.id,
      type: s.type,
      siteUrl: s.siteUrl,
      configEncrypted,
      defaultStatus: s.defaultStatus,
      enabled: s.enabled,
      verifiedAt: verified ? now : null,
      lastError: verified ? null : (reason ?? null),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: publishingConnection.userId,
      set: {
        type: s.type,
        siteUrl: s.siteUrl,
        configEncrypted,
        defaultStatus: s.defaultStatus,
        enabled: s.enabled,
        verifiedAt: verified ? now : null,
        lastError: verified ? null : (reason ?? null),
        updatedAt: now,
      },
    });

  return NextResponse.json({ ok: true, verified, reason });
}

/** Remove the station's publishing connection. */
export async function DELETE() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  await db
    .delete(publishingConnection)
    .where(eq(publishingConnection.userId, session.user.id));
  return NextResponse.json({ ok: true });
}
