import { NextResponse } from 'next/server';
import { count, desc, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { article } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

/** Paginated list of the current user's articles, newest first. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

  const where = eq(article.userId, session.user.id);

  const rows = await db
    .select({
      id: article.id,
      title: article.title,
      lede: article.lede,
      status: article.status,
      imageUrl: article.imageUrl,
      imageSource: article.imageSource,
      language: article.language,
      wordCount: article.wordCount,
      sourceName: article.sourceName,
      publishedUrl: article.publishedUrl,
      createdAt: article.createdAt,
    })
    .from(article)
    .where(where)
    .orderBy(desc(article.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: count() })
    .from(article)
    .where(where);

  return NextResponse.json({
    articles: rows,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: Number(total),
      totalPages: Math.max(1, Math.ceil(Number(total) / PAGE_SIZE)),
    },
  });
}
