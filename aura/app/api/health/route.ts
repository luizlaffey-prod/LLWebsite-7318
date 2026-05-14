import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { checkAll } from '@/lib/health/checks';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const results = await checkAll();
  return NextResponse.json({ results });
}
