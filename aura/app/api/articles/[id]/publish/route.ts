import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { article, publishingConnection, user } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWriteArticles } from '@/lib/billing/feature-gates';
import { publishArticle, PublishError } from '@/lib/articles/publish';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Publishes an approved article to the station's configured website. The
 * article is marked 'published' with the returned URL on success; on
 * failure its error is recorded and a typed reason is returned so the UI
 * can explain what to fix (bad credentials, unreachable site, …).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;

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

  const [conn] = await db
    .select()
    .from(publishingConnection)
    .where(eq(publishingConnection.userId, session.user.id))
    .limit(1);
  if (!conn || !conn.enabled) {
    return NextResponse.json({ error: 'no_connection' }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(article)
    .where(and(eq(article.id, id), eq(article.userId, session.user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const { url } = await publishArticle(conn, row);
    await db
      .update(article)
      .set({
        status: 'published',
        publishedUrl: url,
        publishedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(article.id, id));
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const reason = err instanceof PublishError ? err.reason : 'unknown';
    await db
      .update(article)
      .set({ errorMessage: `publish:${reason}`, updatedAt: new Date() })
      .where(eq(article.id, id));
    return NextResponse.json({ error: 'publish_failed', reason }, { status: 502 });
  }
}
