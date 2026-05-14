'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  Headphones,
  Languages,
  Mic,
  Newspaper,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import type { Locale } from '@/i18n';

type Period = '7d' | '30d' | '90d' | 'custom';

interface Summary {
  range: { start: string; end: string; days: number };
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

export function AnalyticsClient({ locale }: { locale: Locale }) {
  const t = useTranslations('analyticsPage');
  const [period, setPeriod] = useState<Period>('30d');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom') {
        if (start) params.set('start', new Date(start).toISOString());
        if (end) params.set('end', new Date(end).toISOString());
      }
      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) {
        setError(t('errorLoad'));
        return;
      }
      setSummary((await res.json()) as Summary);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, start, end]);

  const onExport = () => {
    const params = new URLSearchParams({ period });
    if (period === 'custom') {
      if (start) params.set('start', new Date(start).toISOString());
      if (end) params.set('end', new Date(end).toISOString());
    }
    window.open(`/api/analytics/export?${params.toString()}`, '_blank');
  };

  const minutesSynth = summary
    ? Math.round((summary.totalSecondsSynthesized / 60) * 10) / 10
    : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-text-muted">
              {t('period')}
            </Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="mt-2 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('period7d')}</SelectItem>
                <SelectItem value="30d">{t('period30d')}</SelectItem>
                <SelectItem value="90d">{t('period90d')}</SelectItem>
                <SelectItem value="custom">{t('periodCustom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <Label className="text-xs uppercase tracking-wider text-text-muted">
                  {t('from')}
                </Label>
                <Input
                  type="date"
                  className="mt-2 w-40"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-text-muted">
                  {t('to')}
                </Label>
                <Input
                  type="date"
                  className="mt-2 w-40"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <Button variant="secondary" onClick={onExport} disabled={loading}>
          <Download className="h-4 w-4" /> {t('exportCsv')}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading || !summary ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-3 h-8 w-1/2" />
              <Skeleton className="mt-3 h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : summary.totalAudios === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-20 text-center text-text-secondary">
          <BarChart3 className="mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium">{t('emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">{t('emptyBody')}</p>
        </Card>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <MetricCard
              icon={<Headphones className="h-4 w-4" />}
              label={t('cards.audiosTitle')}
              value={summary.totalAudios}
              sub={t('cards.audiosSub', { days: summary.range.days })}
            />
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label={t('cards.minutesTitle')}
              value={minutesSynth}
              sub={t('cards.minutesSub')}
            />
            <MetricCard
              icon={<Languages className="h-4 w-4" />}
              label={t('cards.languageTitle')}
              value={summary.topLanguage?.code.toUpperCase() ?? '—'}
              sub={
                summary.topLanguage
                  ? t('cards.percentSub', { percent: summary.topLanguage.percent })
                  : ''
              }
            />
            <MetricCard
              icon={<Mic className="h-4 w-4" />}
              label={t('cards.voiceTitle')}
              value={summary.topVoice?.name ?? '—'}
              sub={
                summary.topVoice
                  ? t('cards.percentSub', { percent: summary.topVoice.percent })
                  : ''
              }
            />
            <MetricCard
              icon={<Newspaper className="h-4 w-4" />}
              label={t('cards.articleTitle')}
              value={summary.topArticle ? truncate(summary.topArticle.title, 22) : '—'}
              sub={
                summary.topArticle
                  ? t('cards.articleSub', { count: summary.topArticle.count })
                  : ''
              }
            />
            <MetricCard
              icon={<Calendar className="h-4 w-4" />}
              label={t('cards.averageTitle')}
              value={summary.averagePerDay}
              sub={t('cards.averageSub')}
            />
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-text-muted">
                {t('charts.dailyTitle')}
              </h3>
              <LineChart data={summary.audiosPerDay} className="mt-4 w-full" />
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-text-muted">
                {t('charts.languageTitle')}
              </h3>
              <div className="mt-4">
                <DonutChart
                  data={summary.languageBreakdown.map((b) => ({
                    label: b.code,
                    value: b.count,
                  }))}
                />
              </div>
            </Card>
            <Card className="p-5 lg:col-span-3">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-text-muted">
                {t('charts.articlesTitle')}
              </h3>
              <BarChart
                className="mt-4"
                data={summary.topArticles.map((a) => ({ label: a.title, value: a.count }))}
              />
            </Card>
          </div>

          <p className="mt-6 text-xs text-text-muted">
            {t('rangeFooter', {
              start: new Date(summary.range.start).toLocaleDateString(locale),
              end: new Date(summary.range.end).toLocaleDateString(locale),
            })}
          </p>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-muted">
        <span className="text-teal">{icon}</span>
        {label}
      </div>
      <div className="mt-3 truncate text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-text-muted">{sub}</div>
    </Card>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

