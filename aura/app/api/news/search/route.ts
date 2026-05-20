import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { newsSearch, user } from '@/lib/db/schema';
import { searchNews } from '@/lib/news/aggregator';
import { effectiveTier } from '@/lib/billing/quota';
import { maxCategoriesPerBulletin } from '@/lib/billing/feature-gates';

export const runtime = 'nodejs';
// Two parallel news provider calls + a batched LLM translation can run
// long on the default 10s budget; give it room to finish on Vercel.
export const maxDuration = 60;

const SearchInput = z.object({
  categories: z.array(z.string()).default([]),
  bias: z.enum(['left', 'center', 'right']).default('center'),
  language: z.enum(['en', 'pt', 'es']),
  durationSeconds: z.number().int().min(15).max(600),
  includeWeather: z.boolean().default(false),
  weatherFormat: z.enum(['separate', 'integrated']).default('separate'),
  geographicScope: z.enum(['global', 'country']).default('global'),
  location: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = SearchInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.issues }, { status: 400 });
  }

  // Enforce per-tier category cap server-side too — the UI restricts
  // the chip group on Starter, but anyone replaying the POST manually
  // could still send multiple. Refuse with 403 so the operator sees a
  // clear upgrade nudge.
  const [u] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const tier = effectiveTier(u?.plan);
  const cap = maxCategoriesPerBulletin(tier);
  if (parsed.data.categories.length > cap) {
    return NextResponse.json(
      {
        error: 'category_limit_reached',
        limit: cap,
        message: `Your plan allows ${cap} category per bulletin. Upgrade to Standard for unlimited categories.`,
      },
      { status: 403 }
    );
  }

  const { articles, translationStatus, translatedCount } = await searchNews({
    categories: parsed.data.categories,
    bias: parsed.data.bias,
    language: parsed.data.language,
    geographicScope: parsed.data.geographicScope,
    location: parsed.data.location,
    limit: 10,
  });

  const [search] = await db
    .insert(newsSearch)
    .values({
      userId: session.user.id,
      categories: parsed.data.categories,
      durationSeconds: parsed.data.durationSeconds,
      language: parsed.data.language,
      bias: parsed.data.bias,
      includeWeather: parsed.data.includeWeather,
      weatherFormat: parsed.data.weatherFormat,
      geographicScope: parsed.data.geographicScope,
      location: parsed.data.location,
    })
    .returning({ id: newsSearch.id });

  return NextResponse.json(
    { searchId: search.id, articles, translationStatus, translatedCount },
    {
      headers: {
        'x-translation-status': translationStatus,
        'x-translated-count': String(translatedCount),
      },
    }
  );
}
