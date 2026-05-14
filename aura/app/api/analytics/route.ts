import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { resolvePeriod, summarize } from '@/lib/analytics/query';

export const runtime = 'nodejs';

const Input = z.object({
  period: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
  start: z.string().optional(),
  end: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = Input.safeParse({
    period: url.searchParams.get('period') ?? '30d',
    start: url.searchParams.get('start') ?? undefined,
    end: url.searchParams.get('end') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const range = resolvePeriod(parsed.data);
  const summary = await summarize(session.user.id, range);
  return NextResponse.json({
    range: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      days: range.days,
    },
    ...summary,
  });
}
