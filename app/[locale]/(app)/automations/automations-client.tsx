'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarClock,
  Plus,
  Play,
  Edit3,
  Trash2,
  Loader2,
  Lock,
  History,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AutomationEditor } from './automation-editor';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';
import type { AutomationInputType } from '@/lib/automations/schemas';

interface LastRunInfo {
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  scheduledFor: string;
  executedAt: string | null;
  error: string | null;
  audioId: string | null;
}

interface LastDeliveryInfo {
  status: string;
  error: string | null;
  at: string;
}

interface AutomationRow extends AutomationInputType {
  id: string;
  createdAt: string;
  lastRun: LastRunInfo | null;
  lastDelivery: LastDeliveryInfo | null;
}

interface Props {
  locale: Locale;
  canSchedule: boolean;
  allowDaysOfWeek: boolean;
  defaultLanguage: Locale;
  defaultTimezone: string;
}

export function AutomationsClient({
  locale,
  canSchedule,
  allowDaysOfWeek,
  defaultLanguage,
  defaultTimezone,
}: Props) {
  const t = useTranslations('automationsPage');

  const [loading, setLoading] = useState(canSchedule);
  const [list, setList] = useState<AutomationRow[]>([]);
  const [editing, setEditing] = useState<AutomationRow | 'new' | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryEndpoints, setDeliveryEndpoints] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/automations');
      if (!res.ok) {
        setError(t('errorLoad'));
        return;
      }
      const data = (await res.json()) as {
        automations: AutomationRow[];
        deliveryEndpoints?: number;
      };
      setList(data.automations);
      setDeliveryEndpoints(data.deliveryEndpoints ?? 0);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canSchedule) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSchedule]);

  const toggleEnabled = async (row: AutomationRow) => {
    await fetch(`/api/automations/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !row.enabled }),
    });
    setList((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const runNow = async (id: string) => {
    setRunning(id);
    setError(null);
    try {
      const res = await fetch(`/api/automations/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: 0 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ? `${t('errorRun')} (${data.error})` : t('errorRun'));
      }
      // Refresh so the new execution appears in the lastRun badge.
      await load();
    } catch {
      setError(t('errorRun'));
    } finally {
      setRunning(null);
    }
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t('errorDelete'));
      return;
    }
    setConfirmDelete(null);
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  if (!canSchedule) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-violet">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{t('lockedTitle')}</h3>
        <p className="mt-2 max-w-md text-sm text-text-secondary">{t('lockedBody')}</p>
        <Button asChild className="mt-6">
          <a href={`/${locale}/settings/billing`}>{t('upgradeCta')}</a>
        </Button>
      </Card>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-text-secondary">{t('listHelp')}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> {t('newCta')}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-1/3" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <CalendarClock className="mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium">{t('emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">{t('emptyBody')}</p>
          <Button className="mt-5" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> {t('createFirstCta')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((row) => (
            <Card key={row.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      'truncate text-base font-semibold',
                      row.enabled ? 'text-success' : 'text-text-secondary'
                    )}
                  >
                    {row.name}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {row.slots.length} {t('slotsLabel')} · {row.timezone} ·{' '}
                    {row.language.toUpperCase()} · {row.bias}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={() => toggleEnabled(row)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {row.slots.slice(0, 6).map((s, i) => (
                  <Badge key={i} variant="secondary">
                    {s.time}
                  </Badge>
                ))}
                {row.slots.length > 6 && (
                  <Badge variant="secondary">+{row.slots.length - 6}</Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <LastRunBadge lastRun={row.lastRun} locale={locale} t={t} />
                <DeliveryHint count={deliveryEndpoints} t={t} />
                <LastDeliveryBadge lastDelivery={row.lastDelivery} t={t} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    row.enabled ? 'text-success' : 'text-text-muted'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      row.enabled ? 'bg-success' : 'bg-text-muted'
                    )}
                  />
                  {row.enabled ? t('active') : t('paused')}
                </span>
                <div className="flex items-center gap-1">
                  <Button asChild variant="ghost" size="icon" title={t('history')}>
                    <a href={`/${locale}/automations/${row.id}/runs`}>
                      <History className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => runNow(row.id)}
                    disabled={running === row.id}
                    title={t('runNow')}
                  >
                    {running === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(row)}
                    title={t('edit')}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete(row.id)}
                    title={t('delete')}
                    className="hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AutomationEditor
        open={editing !== null}
        initial={editing === 'new' || editing === null ? null : editing}
        defaultLanguage={defaultLanguage}
        defaultTimezone={defaultTimezone}
        allowDaysOfWeek={allowDaysOfWeek}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t('cancel')}
            </Button>
            <Button
              className="bg-error text-base hover:brightness-110"
              onClick={() => confirmDelete && onDelete(confirmDelete)}
            >
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LastRunBadge({
  lastRun,
  locale,
  t,
}: {
  lastRun: LastRunInfo | null;
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!lastRun) {
    return <span className="text-text-muted">{t("noRuns")}</span>;
  }
  const when = lastRun.executedAt ?? lastRun.scheduledFor;
  const ago = relativeTime(new Date(when), locale);
  if (lastRun.status === "succeeded") {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3 w-3" /> {t("lastRunOk", { ago })}
      </span>
    );
  }
  if (lastRun.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-error">
        <XCircle className="h-3 w-3" /> {t("lastRunFailed", { ago })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <Loader2 className="h-3 w-3 animate-spin" /> {t("lastRunRunning")}
    </span>
  );
}

function DeliveryHint({
  count,
  t,
}: {
  count: number;
  t: ReturnType<typeof useTranslations>;
}) {
  if (count > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-text-secondary">
        <Truck className="h-3 w-3" /> {t("deliveryConfigured", { n: count })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-warning">
      <AlertTriangle className="h-3 w-3" /> {t("deliveryNone")}
    </span>
  );
}

function LastDeliveryBadge({
  lastDelivery,
  t,
}: {
  lastDelivery: LastDeliveryInfo | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!lastDelivery) return null;
  if (lastDelivery.status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Truck className="h-3 w-3" /> {t("deliveryLastSuccess")}
      </span>
    );
  }
  // local_folder destinations write status='pending' when dispatch
  // queues the audio for the browser-side sync worker. Show that as a
  // neutral "queued" state instead of red — it's only an error when
  // status='failed'.
  if (lastDelivery.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-text-secondary">
        <Truck className="h-3 w-3" /> {t("deliveryLastPending")}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-error"
      title={lastDelivery.error ?? undefined}
    >
      <AlertTriangle className="h-3 w-3" /> {t("deliveryLastFailed")}
    </span>
  );
}

function relativeTime(date: Date, locale: string): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}
