import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { article } from '@/lib/db/schema';
import { articleToHtml, articleToMarkdown } from '@/lib/articles/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Exports an article as an HTML fragment or Markdown for pasting into a
 * CMS. `?format=html` (default) or `?format=md`. Returns the text with a
 * download-friendly content type.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const format = new URL(req.url).searchParams.get('format') === 'md' ? 'md' : 'html';

  const [row] = await db
    .select()
    .from(article)
    .where(and(eq(article.id, id), eq(article.userId, session.user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const exportable = {
    title: row.title,
    lede: row.lede,
    body: row.editedBody ?? row.body,
    imageUrl: row.imageUrl,
    imageCredit: row.imageCredit,
    sourceName: row.sourceName,
    sourceArticleUrl: row.sourceArticleUrl,
  };

  const text =
    format === 'md' ? articleToMarkdown(exportable) : articleToHtml(exportable);
  const contentType = format === 'md' ? 'text/markdown' : 'text/html';
  const slug = row.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'article';

  return new NextResponse(text, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${slug}.${format}"`,
    },
  });
}
