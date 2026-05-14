import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { fetchWeather } from '@/lib/news/weather';

export const runtime = 'nodejs';

const Input = z.object({
  location: z.string().min(2),
  language: z.enum(['en', 'pt', 'es']).default('en'),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = Input.safeParse({
    location: url.searchParams.get('location') ?? '',
    language: url.searchParams.get('language') ?? 'en',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const weather = await fetchWeather(parsed.data.location, parsed.data.language);
  return NextResponse.json({ weather });
}
