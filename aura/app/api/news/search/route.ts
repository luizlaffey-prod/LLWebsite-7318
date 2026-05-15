import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { newsSearch } from '@/lib/db/schema';
import { searchNews } from '@/lib/news/aggregator';

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
  geographicScope: z.enum(['global', 'country', 'state', 'city']).default('global'),
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
