import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { suggestLocations } from '@/lib/news/geo';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const suggestions = await suggestLocations(q);
  return NextResponse.json({ suggestions });
}
