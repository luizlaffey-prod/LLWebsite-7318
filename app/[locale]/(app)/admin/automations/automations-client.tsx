'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Pause,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n';

interface Slot {
  time: string;
  categories?: string[];
  daysOfWeek?: number[];
}

interface AutomationRow {
  id: string;
  name: string;
  enabled: boolean;
  language: 'en' | 'pt' | 'es';
  timezone: string;
  bias: string;
  slots: Slot[];
  createdAt: string;
  userId: string;
  userEmail: string | null;
  radioName: string | null;
  plan: string | null;
}

interface Page {
  automations: AutomationRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function AdminAutomationsClient({ locale }: { locale: Locale }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
        const res = await fetch(`/api/admin/automations?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as Page;
        if (cancelled) return;
        setRows(data.automations);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedQ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const enabledCount = useMemo(
    () => rows.filter((r) => r.enabled).length,
    [rows]
  );

  return (
    <div>
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="name, email, or radio name"
                className="pl-9"
              />
            </div>
          </div>
          <div className="text-xs text-text-muted whitespace-nowrap pt-5">
            {total} total · {enabledCount} enabled on this page
          </div>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-3">Name / Owner</th>
                <th className="px-4 py-3">Slots</th>
                <th className="px-4 py-3">Lang</th>
                <th className="px-4 py-3">Timezone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={7}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-sm text-text-muted"
                    colSpan={7}
                  >
                    No automations found.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-text-muted">
                        {a.userEmail ?? '—'}
                        {a.radioName ? ` · ${a.radioName}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {a.slots.length} ·{' '}
                      {a.slots.map((s) => s.time).join(', ').slice(0, 80)}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-text-secondary">
                      {a.language}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {a.timezone}
                    </td>
                    <td className="px-4 py-3">
                      {a.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-success">
                          <CheckCircle2 className="h-3 w-3" /> enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
                          <Pause className="h-3 w-3" /> paused
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {new Date(a.createdAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/${locale}/admin/automations/${a.id}`}>
                          Inspect
                          <ChevronRightIcon className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-surface/60 px-4 py-3 text-sm">
            <div className="text-text-muted">
              Page {page} of {totalPages} · {total} total
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
