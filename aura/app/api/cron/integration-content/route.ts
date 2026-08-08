import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron/guard';
import { processPendingContentRequests } from '@/lib/integration/content-requests';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = requireCronAuth(req);
  if (auth) return auth;
  const results = await processPendingContentRequests(5);
  return NextResponse.json({ ran: true, count: results.length, results });
}
