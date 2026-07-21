import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { user, article } from '@/lib/db/schema';
import { effectiveTier } from '@/lib/billing/quota';
import { canWriteArticles } from '@/lib/billing/feature-gates';
import { generateArticle } from '@/lib/llm/article-generator';
import { todayForPrompt } from '@/lib/llm/today';

export const runtime = 'nodejs';
export const maxDuration = 120;

const Input = z.object({
  searchId: z.string().uuid().optional(),
  // The lead story the article is built around.
  article: z.object({
    title: z.string().min(1),
    description: z.string().default(''),
    source: z.string().optional(),
    url: z.string().url().optional(),
    image: z.string().url().optional(),
  }),
  // A few supporting stories for context (optional).
  supporting: z
    .array(z.object({ title: z.string(), description: z.string().default('') }))
    .max(4)
    .default([]),
  language: z.enum(['en', 'pt', 'es']),
  categories: z.array(z.string()).default([]),
  targetWords: z.number().int().min(150).max(1200).default(450),
  // Whether to seed the draft with the source outlet's image (with
  // credit). AI-image generation is a separate follow-up step.
  useSourceImage: z.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [u] = await db
    .select({ plan: user.plan, timezone: user.timezone })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  if (!canWriteArticles(tier)) {
    return NextResponse.json(
      { error: 'feature_not_available', requires: 'pro' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.issues },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Assemble the source material: the lead story first, then any
  // supporting stories as context the writer can weave in.
  const sourceContent = [
    `LEAD STORY: ${input.article.title}\n${input.article.description}`,
    ...input.supporting.map(
      (s, i) => `SUPPORTING ${i + 1}: ${s.title}\n${s.description}`
    ),
  ].join('\n\n');

  let generated;
  try {
    generated = await generateArticle({
      sourceContent,
      sourceName: input.article.source,
      sourceUrl: input.article.url,
      language: input.language,
      targetWords: input.targetWords,
      categories: input.categories,
      today: todayForPrompt(u?.timezone ?? 'UTC', input.language),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generation_failed';
    console.error('[articles/generate] failed', message);
    return NextResponse.json(
      { error: 'generation_failed', message },
      { status: 502 }
    );
  }

  const useImg = input.useSourceImage && input.article.image;
  const [created] = await db
    .insert(article)
    .values({
      userId: session.user.id,
      newsSearchId: input.searchId ?? null,
      title: generated.title,
      lede: generated.lede,
      body: generated.body,
      sourceName: input.article.source ?? null,
      sourceArticleUrl: input.article.url ?? null,
      imageUrl: useImg ? input.article.image! : null,
      imageSource: useImg ? 'source' : 'none',
      imageCredit: useImg ? (input.article.source ?? null) : null,
      categories: input.categories,
      language: input.language,
      wordCount: generated.wordCount,
      status: 'draft',
    })
    .returning({ id: article.id });

  return NextResponse.json({
    id: created.id,
    title: generated.title,
    lede: generated.lede,
    body: generated.body,
    wordCount: generated.wordCount,
    imageUrl: useImg ? input.article.image : null,
    imageCredit: useImg ? input.article.source : null,
    status: 'draft',
  });
}
