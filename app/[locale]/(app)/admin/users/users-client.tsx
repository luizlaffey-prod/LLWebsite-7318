'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  radioName: string | null;
  plan: 'trial' | 'starter' | 'standard' | 'pro';
  subscriptionStatus:
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | null;
  trialEndsAt: string | null;
  locale: 'en' | 'pt' | 'es';
  timezone: string;
  emailNotifications: boolean;
  stripeCustomerId: string | null;
  createdAt: string;
}

interface Summary {
  byPlan: Record<string, number>;
  trialExpiring7d: number;
  optedIntoMarketing: number;
}

interface Page {
  users: UserRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: Summary;
}

const PLAN_COLOR: Record<UserRow['plan'], string> = {
  trial: 'bg-warning/10 text-warning border-warning/30',
  starter: 'bg-info/10 text-info border-info/30',
  standard: 'bg-teal/10 text-teal border-teal/30',
  pro: 'bg-violet/10 text-violet border-violet/30',
};

export function AdminUsersClient({ locale }: { locale: Locale }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newsletter, setNewsletter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce search box so each keystroke doesn't hammer the API.
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
        if (planFilter !== 'all') params.set('plan', planFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (newsletter !== 'all') params.set('newsletter', newsletter);
        if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as Page;
        if (cancelled) return;
        setRows(data.users);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setSummary(data.summary);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, planFilter, statusFilter, newsletter, debouncedQ]);

  // Reset to first page when a filter changes.
  useEffect(() => {
    setPage(1);
  }, [planFilter, statusFilter, newsletter, debouncedQ]);

  const totalsRow = useMemo(() => {
    if (!summary) return null;
    const byPlan = summary.byPlan;
    return {
      total: (byPlan.trial ?? 0) + (byPlan.starter ?? 0) + (byPlan.standard ?? 0) + (byPlan.pro ?? 0),
      trial: byPlan.trial ?? 0,
      starter: byPlan.starter ?? 0,
      standard: byPlan.standard ?? 0,
      pro: byPlan.pro ?? 0,
    };
  }, [summary]);

  return (
    <div>
      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <MetricCard label="Total" value={totalsRow?.total ?? '—'} />
        <MetricCard label="Trial" value={totalsRow?.trial ?? '—'} accent="warning" />
        <MetricCard label="Starter" value={totalsRow?.starter ?? '—'} accent="info" />
        <MetricCard label="Standard" value={totalsRow?.standard ?? '—'} accent="teal" />
        <MetricCard label="Pro" value={totalsRow?.pro ?? '—'} accent="violet" />
        <MetricCard
          label="Trial → 7d"
          value={summary?.trialExpiring7d ?? '—'}
          accent="warning"
        />
      </div>

      <div className="mt-2 text-xs text-text-muted">
        {summary
          ? `${summary.optedIntoMarketing} opted into marketing emails`
          : ''}
      </div>

      {/* Filter bar */}
      <Card className="mt-6 p-4">
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
                placeholder="email, name, or radio name"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Plan
            </label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Newsletter
            </label>
            <Select value={newsletter} onValueChange={setNewsletter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="yes">Opted in</SelectItem>
                <SelectItem value="no">Opted out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button asChild variant="secondary">
            <a href="/api/admin/users/export" download>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-4 py-3">Email / Radio</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trial ends</th>
                <th className="px-4 py-3">Locale</th>
                <th className="px-4 py-3">Newsletter</th>
                <th className="px-4 py-3">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
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
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.email}</div>
                      <div className="text-xs text-text-muted">
                        {u.radioName ?? u.name ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${PLAN_COLOR[u.plan]}`}
                      >
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {u.subscriptionStatus ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {u.trialEndsAt
                        ? new Date(u.trialEndsAt).toLocaleDateString(locale)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-text-secondary">
                      {u.locale}
                    </td>
                    <td className="px-4 py-3">
                      {u.emailNotifications ? (
                        <Badge variant="success">opted in</Badge>
                      ) : (
                        <span className="text-xs text-text-muted">no</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {new Date(u.createdAt).toLocaleDateString(locale)}
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

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: 'warning' | 'info' | 'teal' | 'violet';
}) {
  const accentClass =
    accent === 'warning'
      ? 'text-warning'
      : accent === 'info'
        ? 'text-info'
        : accent === 'teal'
          ? 'text-teal'
          : accent === 'violet'
            ? 'text-violet'
            : 'text-text-primary';
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className={`mt-1 font-serif text-2xl font-semibold ${accentClass}`}>
        {value}
      </div>
    </Card>
  );
}
