import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { article } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BlockSchema = z.object({
  type: z.enum(['heading', 'paragraph']),
  text: z.string().min(1),
});

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  lede: z.string().trim().max(300).nullable().optional(),
  body: z.array(BlockSchema).min(1).optional(),
  status: z.enum(['draft', 'approved', 'published']).optional(),
  imageUrl: z.string().url().nullable().optional(),
  imageCredit: z.string().max(200).nullable().optional(),
  imageSource: z.enum(['source', 'ai', 'upload', 'none']).optional(),
});

function ownScope(userId: string, id: string) {
  return and(eq(article.id, id), eq(article.userId, userId));
}

/** Fetch a single article the user owns. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const [row] = await db
    .select()
    .from(article)
    .where(ownScope(session.user.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Prefer the edited body when present so the editor round-trips.
  return NextResponse.json({
    article: { ...row, body: row.editedBody ?? row.body },
  });
}

/** Update an article's editable fields (title, lede, body, status, image). */
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
    body = PatchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'bad_request', message: err instanceof Error ? err.message : '' },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: article.id })
    .from(article)
    .where(ownScope(session.user.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const update: Partial<typeof article.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = body.title;
  if (body.lede !== undefined) update.lede = body.lede;
  // Body edits land in editedBody so the original generation is
  // preserved; word count is recomputed off the edited copy.
  if (body.body !== undefined) {
    update.editedBody = body.body;
    update.wordCount = body.body.reduce(
      (n, b) => n + b.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );
  }
  if (body.status !== undefined) update.status = body.status;
  if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl;
  if (body.imageCredit !== undefined) update.imageCredit = body.imageCredit;
  if (body.imageSource !== undefined) update.imageSource = body.imageSource;

  await db.update(article).set(update).where(ownScope(session.user.id, id));
  return NextResponse.json({ ok: true });
}

/** Delete an article. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await db.delete(article).where(ownScope(session.user.id, id));
  return NextResponse.json({ ok: true });
}
