import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generatedAudio, voice as voiceTable } from '@/lib/db/schema';

export type Period = '7d' | '30d' | '90d' | 'custom';

export interface AnalyticsRange {
  start: Date;
  end: Date;
  days: number;
}

export function resolvePeriod(input: {
  period: Period;
  start?: string;
  end?: string;
}): AnalyticsRange {
  const now = new Date();
  if (input.period === 'custom') {
    const start = input.start ? new Date(input.start) : new Date(now.getTime() - 30 * 86_400_000);
    const end = input.end ? new Date(input.end) : now;
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    return { start, end, days };
  }
  const days = input.period === '7d' ? 7 : input.period === '90d' ? 90 : 30;
  const start = new Date(now.getTime() - days * 86_400_000);
  return { start, end: now, days };
}

export interface AnalyticsSummary {
  totalAudios: number;
  totalSecondsSynthesized: number;
  topLanguage: { code: string; count: number; percent: number } | null;
  topVoice: { name: string; count: number; percent: number } | null;
  topArticle: { title: string; count: number } | null;
  averagePerDay: number;
  audiosPerDay: { date: string; count: number }[];
  languageBreakdown: { code: string; count: number }[];
  topArticles: { title: string; count: number }[];
}

export async function summarize(
  userId: string,
  range: AnalyticsRange
): Promise<AnalyticsSummary> {
  const where = and(
    eq(generatedAudio.userId, userId),
    eq(generatedAudio.status, 'ready'),
    gte(generatedAudio.createdAt, range.start),
    lte(generatedAudio.createdAt, range.end)
  );

  const rows = await db
    .select({
      title: generatedAudio.title,
      durationSeconds: generatedAudio.durationSeconds,
      language: generatedAudio.language,
      createdAt: generatedAudio.createdAt,
      voiceName: voiceTable.name,
    })
    .from(generatedAudio)
    .leftJoin(voiceTable, eq(generatedAudio.voiceId, voiceTable.id))
    .where(where);

  const totalAudios = rows.length;
  const totalSeconds = rows.reduce((acc, r) => acc + (r.durationSeconds ?? 0), 0);

  const langCounts: Record<string, number> = {};
  const voiceCounts: Record<string, number> = {};
  const articleCounts: Record<string, number> = {};
  const dayBuckets: Record<string, number> = {};

  for (const r of rows) {
    langCounts[r.language] = (langCounts[r.language] ?? 0) + 1;
    if (r.voiceName) voiceCounts[r.voiceName] = (voiceCounts[r.voiceName] ?? 0) + 1;
    articleCounts[r.title] = (articleCounts[r.title] ?? 0) + 1;
    const day = r.createdAt.toISOString().slice(0, 10);
    dayBuckets[day] = (dayBuckets[day] ?? 0) + 1;
  }

  function topEntry<T>(
    record: Record<string, number>,
    build: (key: string, count: number) => T
  ): T | null {
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [k, v] of Object.entries(record)) {
      if (v > bestCount) {
        bestKey = k;
        bestCount = v;
      }
    }
    return bestKey ? build(bestKey, bestCount) : null;
  }

  const topLanguage = topEntry(langCounts, (code, count) => ({
    code,
    count,
    percent: totalAudios > 0 ? Math.round((count / totalAudios) * 100) : 0,
  }));
  const topVoice = topEntry(voiceCounts, (name, count) => ({
    name,
    count,
    percent: totalAudios > 0 ? Math.round((count / totalAudios) * 100) : 0,
  }));
  const topArticle = topEntry(articleCounts, (title, count) => ({ title, count }));

  // Fill missing days with zero so the chart line is continuous.
  const audiosPerDay: { date: string; count: number }[] = [];
  for (let i = 0; i < range.days; i++) {
    const d = new Date(range.end.getTime() - (range.days - 1 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    audiosPerDay.push({ date: key, count: dayBuckets[key] ?? 0 });
  }

  const languageBreakdown = Object.entries(langCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  const topArticles = Object.entries(articleCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const averagePerDay = range.days > 0 ? Number((totalAudios / range.days).toFixed(2)) : 0;

  // Suppress unused-import linter complaint when no rows existed.
  void sql;

  return {
    totalAudios,
    totalSecondsSynthesized: totalSeconds,
    topLanguage,
    topVoice,
    topArticle,
    averagePerDay,
    audiosPerDay,
    languageBreakdown,
    topArticles,
  };
}

export async function listAudiosForExport(
  userId: string,
  range: AnalyticsRange
): Promise<
  Array<{
    createdAt: Date;
    title: string;
    language: string;
    durationSeconds: number;
    voiceName: string | null;
    status: string;
  }>
> {
  return db
    .select({
      createdAt: generatedAudio.createdAt,
      title: generatedAudio.title,
      language: generatedAudio.language,
      durationSeconds: generatedAudio.durationSeconds,
      voiceName: voiceTable.name,
      status: generatedAudio.status,
    })
    .from(generatedAudio)
    .leftJoin(voiceTable, eq(generatedAudio.voiceId, voiceTable.id))
    .where(
      and(
        eq(generatedAudio.userId, userId),
        gte(generatedAudio.createdAt, range.start),
        lte(generatedAudio.createdAt, range.end)
      )
    );
}
