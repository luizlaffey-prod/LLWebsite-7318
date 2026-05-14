import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/server';
import { listAudiosForExport, resolvePeriod } from '@/lib/analytics/query';

export const runtime = 'nodejs';

const Input = z.object({
  period: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
  start: z.string().optional(),
  end: z.string().optional(),
});

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

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
  const rows = await listAudiosForExport(session.user.id, range);

  const lines: string[] = ['Date,News,Language,Duration (seconds),Voice,Status'];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.createdAt.toISOString()),
        csvCell(r.title),
        csvCell(r.language),
        csvCell(r.durationSeconds),
        csvCell(r.voiceName ?? ''),
        csvCell(r.status),
      ].join(',')
    );
  }
  const body = lines.join('\n') + '\n';
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aura_analytics_${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
