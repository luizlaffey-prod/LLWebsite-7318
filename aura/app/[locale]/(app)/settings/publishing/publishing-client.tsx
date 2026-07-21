'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Lock,
  Globe,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/i18n';

type ConnType = 'wordpress' | 'webhook';

interface Connection {
  type: ConnType;
  siteUrl: string;
  defaultStatus: string;
  enabled: boolean;
  verifiedAt: string | null;
  lastError: string | null;
  username: string | null;
}

interface Props {
  canPublish: boolean;
  locale: Locale;
}

export function PublishingClient({ canPublish, locale }: Props) {
  const t = useTranslations('publishingPage');

  const [loading, setLoading] = useState(canPublish);
  const [existing, setExisting] = useState<Connection | null>(null);

  const [type, setType] = useState<ConnType>('wordpress');
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [defaultStatus, setDefaultStatus] = useState<'draft' | 'publish'>('draft');
  const [secret, setSecret] = useState('');

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  // Result banner: { ok, reason? } from a test or save.
  const [result, setResult] = useState<{ ok: boolean; reason?: string } | null>(
    null
  );

  useEffect(() => {
    if (!canPublish) return;
    (async () => {
      try {
        const res = await fetch('/api/publishing');
        if (res.ok) {
          const { connection } = (await res.json()) as {
            connection: Connection | null;
          };
          if (connection) {
            setExisting(connection);
            setType(connection.type);
            setSiteUrl(connection.siteUrl);
            setUsername(connection.username ?? '');
            setDefaultStatus(
              connection.defaultStatus === 'publish' ? 'publish' : 'draft'
            );
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [canPublish]);

  const buildBody = () =>
    type === 'wordpress'
      ? { type, siteUrl, username, appPassword, defaultStatus }
      : { type, siteUrl, secret: secret || undefined };

  const reasonText = (reason?: string) =>
    reason && t.has(`reason_${reason}`) ? t(`reason_${reason}`) : t('reason_unknown');

  const onTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/publishing/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };
      setResult({ ok: !!data.ok, reason: data.reason });
    } catch {
      setResult({ ok: false, reason: 'unreachable' });
    } finally {
      setTesting(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/publishing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        verified?: boolean;
        reason?: string;
      };
      if (!res.ok) {
        setResult({ ok: false, reason: data.reason });
        return;
      }
      setResult({ ok: !!data.verified, reason: data.reason });
      // Refresh the saved view.
      setExisting({
        type,
        siteUrl,
        defaultStatus,
        enabled: true,
        verifiedAt: data.verified ? new Date().toISOString() : null,
        lastError: data.verified ? null : (data.reason ?? null),
        username: type === 'wordpress' ? username : null,
      });
      setAppPassword('');
    } catch {
      setResult({ ok: false, reason: 'unreachable' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(t('confirmDelete'))) return;
    setSaving(true);
    try {
      await fetch('/api/publishing', { method: 'DELETE' });
      setExisting(null);
      setSiteUrl('');
      setUsername('');
      setAppPassword('');
      setSecret('');
      setType('wordpress');
      setDefaultStatus('draft');
      setResult(null);
    } finally {
      setSaving(false);
    }
  };

  if (!canPublish) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-violet">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{t('lockedTitle')}</h3>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          {t('lockedBody')}
        </p>
        <Button asChild className="mt-6">
          <a href={`/${locale}/settings/billing`}>{t('upgradeCta')}</a>
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const canSubmit =
    siteUrl.trim().length > 0 &&
    (type === 'webhook' ||
      (username.trim().length > 0 &&
        (appPassword.trim().length > 0 || !!existing)));

  return (
    <div className="space-y-6">
      {existing && (
        <Card className="flex items-center gap-3 p-4">
          {existing.verifiedAt ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {existing.verifiedAt
                ? t('statusConnected')
                : t('statusUnverified')}
            </div>
            <div className="truncate text-xs text-text-muted">
              {existing.type === 'wordpress' ? 'WordPress' : t('typeWebhook')} ·{' '}
              {existing.siteUrl}
              {existing.lastError ? ` · ${reasonText(existing.lastError)}` : ''}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={saving}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
            {t('disconnect')}
          </Button>
        </Card>
      )}

      <Card className="p-6">
        {/* Type selector */}
        <Label className="text-xs uppercase tracking-wider text-text-muted">
          {t('typeLabel')}
        </Label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('wordpress')}
            className={
              'flex items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors ' +
              (type === 'wordpress'
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-border bg-elevated text-text-secondary hover:text-text-primary')
            }
          >
            <Globe className="h-4 w-4" /> WordPress
          </button>
          <button
            type="button"
            onClick={() => setType('webhook')}
            className={
              'flex items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors ' +
              (type === 'webhook'
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-border bg-elevated text-text-secondary hover:text-text-primary')
            }
          >
            <Webhook className="h-4 w-4" /> {t('typeWebhook')}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {/* Site URL */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-text-muted">
              {type === 'wordpress' ? t('siteUrlLabel') : t('webhookUrlLabel')}
            </Label>
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder={
                type === 'wordpress'
                  ? 'https://minharadio.com.br'
                  : 'https://minharadio.com.br/webhook/aura'
              }
              className="mt-2"
            />
            <p className="mt-1 text-xs text-text-muted">
              {type === 'wordpress' ? t('siteUrlHint') : t('webhookUrlHint')}
            </p>
          </div>

          {type === 'wordpress' ? (
            <>
              <div>
                <Label className="text-xs uppercase tracking-wider text-text-muted">
                  {t('usernameLabel')}
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-text-muted">
                  {t('appPasswordLabel')}
                </Label>
                <Input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder={existing ? t('appPasswordKeep') : 'xxxx xxxx xxxx xxxx'}
                  className="mt-2 font-mono"
                />
                <p className="mt-1 text-xs text-text-muted">
                  {t('appPasswordHint')}
                </p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-text-muted">
                  {t('defaultStatusLabel')}
                </Label>
                <Select
                  value={defaultStatus}
                  onValueChange={(v) => setDefaultStatus(v as 'draft' | 'publish')}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('statusDraft')}</SelectItem>
                    <SelectItem value="publish">{t('statusPublish')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-text-muted">
                  {t('defaultStatusHint')}
                </p>
              </div>
            </>
          ) : (
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('secretLabel')}
              </Label>
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={existing ? t('appPasswordKeep') : t('secretPlaceholder')}
                className="mt-2 font-mono"
              />
              <p className="mt-1 text-xs text-text-muted">{t('secretHint')}</p>
            </div>
          )}
        </div>

        {result && (
          <div
            className={
              'mt-5 flex items-start gap-2 rounded-md border px-4 py-3 text-sm ' +
              (result.ok
                ? 'border-teal/30 bg-teal/10 text-teal'
                : 'border-error/30 bg-error/10 text-error')
            }
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{result.ok ? t('testOk') : reasonText(result.reason)}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-6">
          <Button
            variant="outline"
            onClick={onTest}
            disabled={testing || saving || !canSubmit}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            {t('testConnection')}
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || testing || !canSubmit}
            className="bg-teal text-base hover:bg-teal/90 active:bg-teal/80"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
