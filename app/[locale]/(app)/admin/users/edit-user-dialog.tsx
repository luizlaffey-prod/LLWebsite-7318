'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Plan = 'trial' | 'starter' | 'standard' | 'pro';
type SubStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'none';

export interface EditableUser {
  id: string;
  email: string;
  radioName: string | null;
  name: string | null;
  plan: Plan;
  subscriptionStatus:
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | null;
  trialEndsAt: string | null;
}

interface Props {
  user: EditableUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const SUB_STATUSES: SubStatus[] = [
  'none',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
];

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DD in local TZ — what <input type="date"> expects.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInputValue(s: string): string | null {
  if (!s) return null;
  // Anchor at end of day local-time so a "trial until Dec 31" lasts
  // through Dec 31 rather than expiring at midnight that morning.
  const d = new Date(`${s}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function EditUserDialog({ user, open, onOpenChange, onSaved }: Props) {
  const [plan, setPlan] = useState<Plan>('trial');
  const [subStatus, setSubStatus] = useState<SubStatus>('none');
  const [trialDate, setTrialDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setPlan(user.plan);
    setSubStatus(user.subscriptionStatus ?? 'none');
    setTrialDate(toDateInputValue(user.trialEndsAt));
    setError(null);
  }, [user]);

  const dirty = useMemo(() => {
    if (!user) return false;
    if (plan !== user.plan) return true;
    if ((subStatus === 'none' ? null : subStatus) !== user.subscriptionStatus)
      return true;
    if (toDateInputValue(user.trialEndsAt) !== trialDate) return true;
    return false;
  }, [user, plan, subStatus, trialDate]);

  function bumpTrial(days: number) {
    const base =
      trialDate && !Number.isNaN(new Date(trialDate).getTime())
        ? new Date(`${trialDate}T23:59:59`)
        : new Date();
    base.setDate(base.getDate() + days);
    setTrialDate(toDateInputValue(base.toISOString()));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (plan !== user.plan) payload.plan = plan;
      const desiredSub = subStatus === 'none' ? null : subStatus;
      if (desiredSub !== user.subscriptionStatus) {
        payload.subscriptionStatus = desiredSub;
      }
      const desiredTrial = fromDateInputValue(trialDate);
      if (toDateInputValue(user.trialEndsAt) !== trialDate) {
        payload.trialEndsAt = desiredTrial;
      }
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Request failed (${res.status})`);
        setSaving(false);
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>
            {user ? (
              <>
                {user.email}
                {user.radioName ? ` · ${user.radioName}` : ''}
              </>
            ) : (
              ''
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Plan
            </label>
            <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Subscription status
            </label>
            <Select
              value={subStatus}
              onValueChange={(v) => setSubStatus(v as SubStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUB_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'none' ? '(none)' : s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-text-muted">
              For comped access pick <code className="text-text-secondary">active</code>.
              Feature gates and quotas treat that as a fully paid account.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
              Trial ends at
            </label>
            <Input
              type="date"
              value={trialDate}
              onChange={(e) => setTrialDate(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => bumpTrial(7)}
              >
                +7d
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => bumpTrial(30)}
              >
                +30d
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => bumpTrial(90)}
              >
                +90d
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setTrialDate('')}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
