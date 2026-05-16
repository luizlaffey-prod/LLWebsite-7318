'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Download,
  Folder,
  Truck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  chooseDownloadFolder,
  defaultFilename,
  downloadBlob,
  hasFolderConfigured,
} from '@/lib/storage/local-folder';
import type { Locale } from '@/i18n';

interface Delivery {
  status: 'pending' | 'success' | 'failed';
  endpointName: string;
  endpointType: 'http' | 'email' | 'ftp';
  error: string | null;
  at: string;
}

interface Run {
  id: string;
  scheduledFor: string;
  executedAt: string | null;
  slotTime: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  retryCount: number;
  error: string | null;
  audio: {
    id: string;
    url: string | null;
    title: string;
    durationSeconds: number;
  } | null;
  deliveries: Delivery[];
}

interface Props {
  automationId: string;
  locale: Locale;
}

export function RunsClient({ automationId, locale }: Props) {
  const t = useTranslations('automationsPage');
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [folderReady, setFolderReady] = useState(false);

  useEffect(() => {
    hasFolderConfigured().then(setFolderReady);
  }, []);

  const onChooseFolder = async () => {
    const ok = await chooseDownloadFolder();
    setFolderReady(ok);
  };

  const onDownload = async (run: Run) => {
    if (!run.audio?.url || !run.audio?.id) return;
    setDownloading(run.id);
    setDownloadMsg(null);
    try {
      const filename = defaultFilename({
        topic: run.audio.title || `bulletin-${run.slotTime}`,
      });
      const result = await downloadBlob({
        filename,
        fromUrl: run.audio.url,
        proxyUrl: `/api/audios/${run.audio.id}/download`,
      });
      setDownloadMsg(
        result.kind === 'folder'
          ? `${t('downloadedTo')}: ${result.path}`
          : t('runsAudio')
      );
      setTimeout(() => setDownloadMsg(null), 3000);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setDownloading(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/automations/${automationId}/runs?limit=50`);
      if (!res.ok) {
        setError(t('errorLoad'));
        return;
      }
      const data = (await res.json()) as { runs: Run[] };
      setRuns(data.runs);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId]);

  const onRetry = async (run: Run) => {
    setRetrying(run.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/automations/${automationId}/runs/${run.id}/retry`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? `${t('errorRun')} (${data.error})` : t('errorRun'));
        return;
      }
      await load();
    } catch {
      setError(t('errorRun'));
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">
          {folderReady ? t('folderReady') : t('folderNotConfigured')}
        </span>
        {!folderReady && (
          <Button variant="outline" size="sm" onClick={onChooseFolder}>
            <Folder className="h-3.5 w-3.5" /> {t('choosingFolder')}
          </Button>
        )}
      </div>

      {downloadMsg && (
        <p className="mb-4 text-xs text-success">{downloadMsg}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-3 h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium">{t('runsEmptyTitle')}</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">
            {t('runsEmptyBody')}
          </p>
        </Card>
      ) : (
        <ol className="space-y-3">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              locale={locale}
              retrying={retrying === run.id}
              downloading={downloading === run.id}
              onRetry={() => onRetry(run)}
              onDownload={() => onDownload(run)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function RunRow({
  run,
  locale,
  retrying,
  downloading,
  onRetry,
  onDownload,
}: {
  run: Run;
  locale: Locale;
  retrying: boolean;
  downloading: boolean;
  onRetry: () => void;
  onDownload: () => void;
}) {
  const t = useTranslations('automationsPage');
  const scheduled = new Date(run.scheduledFor);
  const executed = run.executedAt ? new Date(run.executedAt) : null;
  const dateLabel = scheduled.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const latencyMs =
    executed && scheduled ? executed.getTime() - scheduled.getTime() : null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusBadge status={run.status} />
            <span className="text-sm font-medium text-text-primary">
              {dateLabel}
            </span>
            <span className="text-xs text-text-muted">· {run.slotTime}</span>
            {run.retryCount > 0 && (
              <span className="text-xs text-text-muted">
                · {t('runsRetryCount', { n: run.retryCount })}
              </span>
            )}
          </div>
          {latencyMs !== null && latencyMs > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {t('runsDuration', { seconds: Math.round(latencyMs / 1000) })}
            </p>
          )}
          {run.error && (
            <p className="mt-2 break-words font-mono text-xs text-error">
              {run.error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {run.audio?.url && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {t('runsAudio')}
            </Button>
          )}
          {run.status === 'failed' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              disabled={retrying}
            >
              {retrying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('retrying')}
                </>
              ) : (
                <>
                  <RotateCw className="h-3.5 w-3.5" /> {t('retry')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {run.audio?.url && (
        <audio controls className="mt-3 w-full" src={run.audio.url}>
          <track kind="captions" />
        </audio>
      )}

      {run.deliveries.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">
            {t('runsDeliveriesLabel')}
          </p>
          {run.deliveries.map((d, i) => (
            <DeliveryRow key={i} d={d} />
          ))}
        </div>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: Run['status'] }) {
  const Map: Record<
    Run['status'],
    { label: string; icon: React.ReactNode; bg: string; text: string }
  > = {
    pending: {
      label: 'pending',
      icon: <Clock className="h-3 w-3" />,
      bg: 'bg-text-muted/15',
      text: 'text-text-muted',
    },
    running: {
      label: 'running',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      bg: 'bg-info/15',
      text: 'text-info',
    },
    succeeded: {
      label: 'succeeded',
      icon: <CheckCircle2 className="h-3 w-3" />,
      bg: 'bg-success/15',
      text: 'text-success',
    },
    failed: {
      label: 'failed',
      icon: <XCircle className="h-3 w-3" />,
      bg: 'bg-error/15',
      text: 'text-error',
    },
  };
  const c = Map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        c.bg,
        c.text
      )}
    >
      {c.icon} {c.label}
    </span>
  );
}

function DeliveryRow({ d }: { d: Delivery }) {
  const color =
    d.status === 'success'
      ? 'text-success'
      : d.status === 'failed'
        ? 'text-error'
        : 'text-text-muted';
  return (
    <div className="flex items-start gap-2 text-xs">
      <Truck className={cn('mt-0.5 h-3 w-3 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-text-primary">
          {d.endpointName}
        </span>{' '}
        <span className="text-text-muted">· {d.endpointType.toUpperCase()}</span>{' '}
        <span className={color}>· {d.status}</span>
        {d.error && (
          <span className="ml-1 font-mono text-error">— {d.error}</span>
        )}
      </div>
    </div>
  );
}
