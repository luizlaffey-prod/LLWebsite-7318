'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Trash2,
  Loader2,
  Server,
  Mail,
  HardDrive,
  Lock,
  Rss,
  Copy,
  RotateCw,
  Check,
} from 'lucide-react';
import { Folder } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Locale } from '@/i18n';

interface EndpointRow {
  id: string;
  name: string;
  type: 'ftp' | 'http' | 'email' | 'local_folder';
  slotNamingPattern: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

const TYPE_ICON = {
  ftp: HardDrive,
  http: Server,
  email: Mail,
  local_folder: Folder,
} as const;

interface Props {
  canDeliver: boolean;
  locale: Locale;
}

export function DeliveryClient({ canDeliver, locale }: Props) {
  const t = useTranslations('deliveryPage');
  const [loading, setLoading] = useState(canDeliver);
  const [endpoints, setEndpoints] = useState<EndpointRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery');
      if (!res.ok) {
        setError(t('errorLoad'));
        return;
      }
      const data = (await res.json()) as { endpoints: EndpointRow[] };
      setEndpoints(data.endpoints);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canDeliver) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDeliver]);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await fetch(`/api/delivery/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setEndpoints((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !enabled } : e))
    );
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/delivery/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t('errorDelete'));
      return;
    }
    setConfirmDelete(null);
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
  };

  if (!canDeliver) {
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

      <RssFeedCard t={t} />

      <div className="mb-6 mt-8 flex items-center justify-between">
        <p className="text-sm text-text-secondary">{t('listHelp')}</p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t('newCta')}
        </Button>
      </div>

      {loading ? (
        <Card className="h-32 animate-pulse" />
      ) : endpoints.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center text-text-secondary">
          <Server className="mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium">{t('emptyTitle')}</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">{t('emptyBody')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => {
            const Icon = TYPE_ICON[ep.type];
            return (
              <Card key={ep.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-elevated text-teal">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{ep.name}</h3>
                      <Badge variant="secondary">{ep.type.toUpperCase()}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {t('patternLabel')}: <code>{ep.slotNamingPattern}</code>
                      {ep.lastUsedAt && (
                        <>
                          {' · '}
                          {t('lastUsed', {
                            date: new Date(ep.lastUsedAt).toLocaleString(locale),
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={ep.enabled}
                    onCheckedChange={() => toggleEnabled(ep.id, ep.enabled)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete(ep.id)}
                    className="hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DeliveryEditor
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
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

type EndpointType = 'http' | 'email' | 'ftp' | 'local_folder';

function DeliveryEditor({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('deliveryPage');
  const [type, setType] = useState<EndpointType>('http');
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('{{name}}_{{date}}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HTTP fields
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'POST' | 'PUT'>('POST');
  const [bearerToken, setBearerToken] = useState('');

  // Email
  const [recipient, setRecipient] = useState('');

  // FTP
  const [ftpHost, setFtpHost] = useState('');
  const [ftpPort, setFtpPort] = useState('21');
  const [ftpUser, setFtpUser] = useState('');
  const [ftpPass, setFtpPass] = useState('');
  const [ftpDir, setFtpDir] = useState('');

  useEffect(() => {
    if (open) {
      setError(null);
      setName('');
      setPattern('{{name}}_{{date}}');
      setUrl('');
      setBearerToken('');
      setRecipient('');
      setFtpHost('');
      setFtpUser('');
      setFtpPass('');
      setFtpDir('');
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload =
        type === 'local_folder'
          ? {
              name,
              type,
              slotNamingPattern: pattern,
              enabled: true,
              config: { label: 'browser-folder' },
            }
          : type === 'http'
          ? {
              name,
              type,
              slotNamingPattern: pattern,
              enabled: true,
              config: { url, method, bearerToken: bearerToken || undefined },
            }
          : type === 'email'
            ? {
                name,
                type,
                slotNamingPattern: pattern,
                enabled: true,
                config: { recipient },
              }
            : {
                name,
                type,
                slotNamingPattern: pattern,
                enabled: true,
                config: {
                  host: ftpHost,
                  port: Number(ftpPort) || 21,
                  username: ftpUser,
                  password: ftpPass,
                  remoteDir: ftpDir || undefined,
                },
              };

      const res = await fetch('/api/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(t('errorSave'));
        return;
      }
      onSaved();
    } catch {
      setError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('editorTitle')}</SheetTitle>
          <SheetDescription>{t('editorSubtitle')}</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-5 px-6 pb-6 pt-4">
          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <Label>{t('name')}</Label>
            <Input
              className="mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div>
            <Label>{t('type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as EndpointType)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local_folder">
                  {t('typeLocalFolder')}
                </SelectItem>
                <SelectItem value="ftp">{t('typeFtp')}</SelectItem>
                <SelectItem value="http">{t('typeHttp')}</SelectItem>
                <SelectItem value="email">{t('typeEmail')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'local_folder' && (
            <LocalFolderField t={t} />
          )}

          {type === 'http' && (
            <div className="space-y-4">
              <div>
                <Label>{t('httpUrl')}</Label>
                <Input
                  className="mt-2"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://api.your-radio.com/incoming"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('httpMethod')}</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as 'POST' | 'PUT')}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('httpBearer')}</Label>
                  <Input
                    className="mt-2"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder={t('optional')}
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'email' && (
            <div>
              <Label>{t('emailRecipient')}</Label>
              <Input
                className="mt-2"
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                placeholder="playout@your-radio.com"
              />
            </div>
          )}

          {type === 'ftp' && (
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div>
                  <Label>{t('ftpHost')}</Label>
                  <Input
                    className="mt-2"
                    value={ftpHost}
                    onChange={(e) => setFtpHost(e.target.value)}
                    required
                    placeholder="ftp.your-radio.com"
                  />
                </div>
                <div>
                  <Label>{t('ftpPort')}</Label>
                  <Input
                    className="mt-2"
                    type="number"
                    value={ftpPort}
                    onChange={(e) => setFtpPort(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('ftpUser')}</Label>
                  <Input
                    className="mt-2"
                    value={ftpUser}
                    onChange={(e) => setFtpUser(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>{t('ftpPassword')}</Label>
                  <Input
                    className="mt-2"
                    type="password"
                    value={ftpPass}
                    onChange={(e) => setFtpPass(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>{t('ftpRemoteDir')}</Label>
                <Input
                  className="mt-2"
                  value={ftpDir}
                  onChange={(e) => setFtpDir(e.target.value)}
                  placeholder="/playout/incoming"
                />
              </div>
            </div>
          )}

          <div>
            <Label>{t('namingPattern')}</Label>
            <Input
              className="mt-2"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">{t('patternHint')}</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Form field for the local_folder destination. Surfaces the File System
 * Access API status (supported, folder picked, permission active) and
 * lets the operator choose / re-choose the directory. The actual handle
 * lives in IndexedDB on this device — the server only stores a label.
 */
function LocalFolderField({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [hasFolder, setHasFolder] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { hasFolderConfigured } = await import(
        '@/lib/storage/local-folder'
      );
      if (cancelled) return;
      setSupported(
        typeof window !== 'undefined' && !!window.showDirectoryPicker
      );
      setHasFolder(await hasFolderConfigured());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPick = async () => {
    setPicking(true);
    try {
      const { chooseDownloadFolder } = await import(
        '@/lib/storage/local-folder'
      );
      const ok = await chooseDownloadFolder();
      if (ok) setHasFolder(true);
    } finally {
      setPicking(false);
    }
  };

  if (supported === false) {
    return (
      <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        {t('localFolderUnsupported')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">{t('localFolderHelp')}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onPick}
          disabled={picking}
        >
          {picking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Folder className="h-3.5 w-3.5" />
          )}
          {hasFolder ? t('localFolderChange') : t('localFolderPick')}
        </Button>
        {hasFolder && (
          <span className="text-xs text-success">
            {t('localFolderReady')}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted">{t('localFolderTabHint')}</p>
    </div>
  );
}

/**
 * Pull-based delivery channel: a per-user RSS 2.0 feed that radio
 * automation systems (Zetta, NexGen, RCS) and podcast catchers can
 * subscribe to. The token in the URL IS the auth — rotating it
 * invalidates every external subscriber.
 */
function RssFeedCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/feed/token');
        if (!res.ok) return;
        const data = (await res.json()) as { token: string };
        if (!cancelled) setToken(data.token);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const feedUrl =
    typeof window !== 'undefined' && token
      ? `${window.location.origin}/api/feed/${token}`
      : '';

  const onCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  const onRotate = async () => {
    setRotating(true);
    try {
      const res = await fetch('/api/feed/token', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { token: string };
        setToken(data.token);
      }
    } finally {
      setRotating(false);
      setConfirmRotate(false);
    }
  };

  return (
    <Card className="mb-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-elevated text-teal">
            <Rss className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{t('feedTitle')}</h3>
            <p className="mt-1 text-xs text-text-muted">{t('feedHint')}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-elevated px-3 py-2 font-mono text-xs text-text-secondary">
          {loading ? '…' : feedUrl || t('feedUnavailable')}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCopy}
            disabled={!feedUrl}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? t('feedCopied') : t('feedCopy')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmRotate(true)}
            disabled={!feedUrl}
            title={t('feedRotateTooltip')}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {t('feedRotate')}
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmRotate}
        onOpenChange={(o) => !o && !rotating && setConfirmRotate(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('feedConfirmRotateTitle')}</DialogTitle>
            <DialogDescription>{t('feedConfirmRotateBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmRotate(false)}
              disabled={rotating}
            >
              {t('cancel')}
            </Button>
            <Button onClick={onRotate} disabled={rotating}>
              {rotating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              {t('feedRotate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

