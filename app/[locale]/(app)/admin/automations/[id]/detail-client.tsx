'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

interface Slot {
  time: string;
  categories?: string[];
  daysOfWeek?: number[];
}

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  language: 'en' | 'pt' | 'es';
  timezone: string;
  bias: string;
  geographicScope: string;
  location: string | null;
  weatherCity: string | null;
  includeWeather: boolean;
  durationSeconds: number;
  slots: Slot[];
  voiceId: string | null;
  speed: number;
  bgTrackUrl: string | null;
  duckAudio: boolean;
  transitionEffects: boolean;
  createdAt: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  radioName: string | null;
  plan: string | null;
}

interface Execution {
  id: string;
  scheduledFor: string;
  slotTime: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  executedAt: string | null;
  retryCount: number;
  error: string | null;
  audioId: string | null;
  audioTitle: string | null;
  audioStatus: string | null;
  audioErrorMessage: string | null;
  audioDuration: number | null;
}

interface DetailResponse {
  automation: Automation;
  executions: Execution[];
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'border-success/30 bg-success/10 text-success',
  running: 'border-warning/30 bg-warning/10 text-warning',
  pending: 'border-border bg-elevated/60 text-text-muted',
  failed: 'border-error/30 bg-error/10 text-error',
};

const STATUS_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  completed: CheckCircle2,
  running: Loader2,
  pending: Clock,
  failed: XCircle,
};

export function AdminAutomationDetailClient({
  locale,
  automationId,
}: {
  locale: Locale;
  automationId: string;
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/automations/${automationId}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Not found' : 'Request failed');
          return;
        }
        const d = (await res.json()) as DetailResponse;
        if (cancelled) return;
        setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [automationId, reloadKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-error/30 bg-error/10 p-4 text-sm text-error">
        {error ?? 'Automation not found'}
      </div>
    );
  }

  const { automation, executions } = data;
  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: automation.timezone,
  });
  const fmtUtc = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'UTC',
  });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/admin/automations`}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-3 w-3" /> Back to automations
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            {automation.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {automation.userEmail}
            {automation.radioName ? ` · ${automation.radioName}` : ''}
            {automation.plan ? ` · ${automation.plan.toUpperCase()}` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Config summary */}
      <Card className="mt-6 p-5">
        <h2 className="text-xs uppercase tracking-wider text-text-muted">
          Configuration
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <Field label="Status">
            {automation.enabled ? (
              <span className="text-success">enabled</span>
            ) : (
              <span className="text-text-muted">paused</span>
            )}
          </Field>
          <Field label="Language">{automation.language.toUpperCase()}</Field>
          <Field label="Timezone">{automation.timezone}</Field>
          <Field label="Bias">{automation.bias}</Field>
          <Field label="Scope">{automation.geographicScope}</Field>
          <Field label="Location">{automation.location ?? '—'}</Field>
          <Field label="Weather city">{automation.weatherCity ?? '—'}</Field>
          <Field label="Weather on">
            {automation.includeWeather ? 'yes' : 'no'}
          </Field>
          <Field label="Duration">{automation.durationSeconds}s</Field>
          <Field label="Speed">{automation.speed.toFixed(2)}x</Field>
          <Field label="Ducking">
            {automation.duckAudio ? 'yes' : 'no'}
          </Field>
          <Field label="Bg track">
            {automation.bgTrackUrl ? 'yes' : '—'}
          </Field>
        </dl>
        <h3 className="mt-6 text-xs uppercase tracking-wider text-text-muted">
          Slots ({automation.slots.length})
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {automation.slots.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated/40 px-3 py-1.5 text-xs"
            >
              <Clock className="h-3 w-3 text-teal" />
              <span className="font-medium">{s.time}</span>
              {s.categories && s.categories.length > 0 && (
                <span className="text-text-muted">
                  · {s.categories.join(', ')}
                </span>
              )}
              {s.daysOfWeek && s.daysOfWeek.length > 0 && (
                <span className="text-text-muted">
                  · days: {s.daysOfWeek.join(',')}
                </span>
              )}
            </span>
          ))}
        </div>
      </Card>

      {/* Executions */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border bg-surface/60 px-5 py-3">
          <h2 className="text-xs uppercase tracking-wider text-text-muted">
            Execution history ({executions.length})
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Timestamps shown in the automation&apos;s timezone ({automation.timezone}).
          </p>
        </div>
        {executions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">
            No executions yet. The cron tick will create the first row when a
            slot becomes due.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Scheduled (local)</th>
                  <th className="px-4 py-3">Executed (UTC)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Retries</th>
                  <th className="px-4 py-3">Audio</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {executions.map((e) => {
                  const Icon = STATUS_ICON[e.status] ?? Clock;
                  return (
                    <tr key={e.id} className="hover:bg-surface/40">
                      <td className="px-4 py-3 font-mono text-xs">
                        {e.slotTime}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {fmt.format(new Date(e.scheduledFor))}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {e.executedAt ? fmtUtc.format(new Date(e.executedAt)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider',
                            STATUS_COLOR[e.status] ?? STATUS_COLOR.pending
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-3 w-3',
                              e.status === 'running' && 'animate-spin'
                            )}
                          />
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {e.retryCount > 0 ? `${e.retryCount}×` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {e.audioTitle ? (
                          <div>
                            <div className="text-text-secondary truncate max-w-[14rem]">
                              {e.audioTitle}
                            </div>
                            <div className="text-text-muted">
                              {e.audioStatus}
                              {e.audioDuration
                                ? ` · ${e.audioDuration}s`
                                : ''}
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {e.error || e.audioErrorMessage ? (
                          <div className="flex items-start gap-1 text-error">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="max-w-[20rem] break-words">
                              {e.error ?? e.audioErrorMessage}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
