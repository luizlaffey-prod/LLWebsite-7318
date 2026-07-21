'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Copy,
  Check,
  Trash2,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatPairingCode,
  remainingMs,
  formatCountdown,
} from '@/lib/integration/pairing-format';
import type { Locale } from '@/i18n';

interface Station {
  id: string;
  name: string;
  timezone: string;
  defaultLanguage: string;
  defaultVoiceId: string | null;
  enabled: boolean;
}
interface Entitlement {
  status: string;
  planCode: string;
  features: string[];
  maxStations: number;
  maxDevicesPerStation: number;
  maxConcurrentOutputs: number;
  validUntil: string | null;
}
interface Device {
  id: string;
  name: string | null;
  platform: string | null;
  status: string;
  lastSeenAt: string | null;
  createdAt: string;
  deviceKeyFingerprint: string | null;
}
interface VoiceOpt {
  id: string;
  name: string;
  locked: boolean;
  isMine: boolean;
}
interface PairingCode {
  code: string;
  expiresAt: string;
}

const CONTENT_FEATURE = 'aura_content';

export function StudioProClient({ locale }: { locale: Locale }) {
  const t = useTranslations('studioProPage');

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  const [voiceChoice, setVoiceChoice] = useState('');
  const [savingVoice, setSavingVoice] = useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const [pairing, setPairing] = useState(false);
  const [code, setCode] = useState<PairingCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => 0);

  const [actionError, setActionError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const errText = useCallback(
    (codeStr?: string) =>
      codeStr && t.has(`error_${codeStr}`) ? t(`error_${codeStr}`) : t('error_unknown'),
    [t]
  );

  const loadDevices = useCallback(async (stationId: string) => {
    setLoadingDevices(true);
    try {
      const res = await fetch(`/api/v1/stations/${stationId}/devices`);
      if (res.ok) {
        const data = (await res.json()) as { devices: Device[] };
        setDevices(data.devices);
      }
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // Bootstrap the station + load voices on mount.
  useEffect(() => {
    (async () => {
      try {
        const [bootRes, voicesRes] = await Promise.all([
          fetch('/api/v1/integration/bootstrap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          }),
          fetch('/api/voices'),
        ]);
        if (!bootRes.ok) {
          const b = (await bootRes.json().catch(() => ({}))) as { error?: string };
          setFatal(errText(b.error));
          return;
        }
        const boot = (await bootRes.json()) as {
          station: Station;
          entitlement: Entitlement;
        };
        setStation(boot.station);
        setEntitlement(boot.entitlement);
        if (voicesRes.ok) {
          const vd = (await voicesRes.json()) as { voices: VoiceOpt[] };
          setVoices(vd.voices.filter((v) => !v.locked));
        }
        await loadDevices(boot.station.id);
      } catch {
        setFatal(errText());
      } finally {
        setLoading(false);
      }
    })();
  }, [errText, loadDevices]);

  // Tick every second while a code is displayed; drop it when it expires.
  useEffect(() => {
    if (!code) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const t2 = Date.now();
      setNow(t2);
      if (remainingMs(code.expiresAt, t2) <= 0) setCode(null);
    }, 1000);
    return () => clearInterval(id);
  }, [code]);

  const saveVoice = async () => {
    if (!station || !voiceChoice) return;
    setSavingVoice(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/stations/${station.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultVoiceId: voiceChoice }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(errText(b.error));
        return;
      }
      const { station: updated } = (await res.json()) as { station: Station };
      setStation(updated);
    } catch {
      setActionError(errText());
    } finally {
      setSavingVoice(false);
    }
  };

  const generateCode = async () => {
    if (!station) return;
    setPairing(true);
    setActionError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/v1/stations/${station.id}/pairing-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !data.code || !data.expiresAt) {
        setActionError(errText(data.error));
        return;
      }
      setCode({ code: data.code, expiresAt: data.expiresAt });
      // Refresh device list shortly after — pairing may add one.
      loadDevices(station.id);
    } catch {
      setActionError(errText());
    } finally {
      setPairing(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(formatPairingCode(code.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the code is visible on screen anyway */
    }
  };

  const revokeDevice = async (deviceId: string) => {
    if (!station) return;
    if (!confirm(t('confirmRevoke'))) return;
    setRevoking(deviceId);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/v1/stations/${station.id}/devices/${deviceId}`,
        { method: 'DELETE' }
      );
      if (!res.ok && res.status !== 204) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(errText(b.error));
        return;
      }
      await loadDevices(station.id);
    } catch {
      setActionError(errText());
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (fatal || !station || !entitlement) {
    return (
      <Card className="flex items-start gap-3 p-6">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div>
          <div className="text-sm font-medium">{t('bootstrapFailed')}</div>
          <p className="mt-1 text-sm text-text-secondary">{fatal ?? errText()}</p>
        </div>
      </Card>
    );
  }

  const activeDevices = devices.filter((d) => d.status === 'active');
  const hasContentFeature = entitlement.features.includes(CONTENT_FEATURE);
  const atDeviceLimit = activeDevices.length >= entitlement.maxDevicesPerStation;
  const secondsLeft = code ? remainingMs(code.expiresAt, now) : 0;

  return (
    <div className="space-y-6">
      {/* Station + entitlement overview */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted">
              {t('stationLabel')}
            </div>
            <div className="mt-1 text-lg font-semibold">{station.name}</div>
            <div className="mt-1 text-sm text-text-muted">
              {station.timezone} · {station.defaultLanguage.toUpperCase()}
            </div>
          </div>
          <span
            className={
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ' +
              (entitlement.status === 'active' || entitlement.status === 'trialing'
                ? 'border-teal/40 bg-teal/10 text-teal'
                : 'border-warning/40 bg-warning/10 text-warning')
            }
          >
            {t.has(`entStatus_${entitlement.status}`)
              ? t(`entStatus_${entitlement.status}`)
              : entitlement.status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div>
            <div className="text-xs text-text-muted">{t('plan')}</div>
            <div className="mt-0.5 text-sm font-medium">{entitlement.planCode}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted">{t('devicesLimit')}</div>
            <div className="mt-0.5 text-sm font-medium">
              {activeDevices.length} / {entitlement.maxDevicesPerStation}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">{t('outputsLimit')}</div>
            <div className="mt-0.5 text-sm font-medium">
              {entitlement.maxConcurrentOutputs}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">{t('validUntil')}</div>
            <div className="mt-0.5 text-sm font-medium">
              {entitlement.validUntil
                ? new Date(entitlement.validUntil).toLocaleDateString(locale)
                : '—'}
            </div>
          </div>
        </div>

        {!hasContentFeature && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('noContentFeature')}</span>
          </div>
        )}
      </Card>

      {/* Default voice requirement */}
      <Card className="p-6">
        <div className="text-xs uppercase tracking-wider text-text-muted">
          {t('defaultVoiceLabel')}
        </div>
        {station.defaultVoiceId ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-teal">
            <CheckCircle2 className="h-4 w-4" />
            {voices.find((v) => v.id === station.defaultVoiceId)?.name ??
              t('voiceSet')}
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-text-secondary">
              {t('defaultVoiceHint')}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Select value={voiceChoice} onValueChange={setVoiceChoice}>
                <SelectTrigger className="sm:max-w-xs">
                  <SelectValue placeholder={t('chooseVoice')} />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                      {v.isMine ? ` · ${t('mine')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={saveVoice} disabled={!voiceChoice || savingVoice}>
                {savingVoice ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t('saveVoice')}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Pairing */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted">
              {t('pairingLabel')}
            </div>
            <p className="mt-1 text-sm text-text-secondary">{t('pairingHint')}</p>
          </div>
          <Button
            onClick={generateCode}
            disabled={pairing || atDeviceLimit || !station.defaultVoiceId}
            className="shrink-0"
          >
            {pairing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {t('generateCode')}
          </Button>
        </div>

        {atDeviceLimit && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('deviceLimitReached')}</span>
          </div>
        )}
        {!station.defaultVoiceId && (
          <div className="mt-3 text-xs text-text-muted">{t('needVoiceFirst')}</div>
        )}

        {code && (
          <div className="mt-4 rounded-md border border-teal/30 bg-teal/5 p-5 text-center">
            <div className="font-mono text-3xl font-semibold tracking-[0.3em] text-text-primary">
              {formatPairingCode(code.code)}
            </div>
            <div className="mt-2 text-sm text-text-muted">
              {t('expiresIn', { time: formatCountdown(secondsLeft) })}
            </div>
            <div className="mt-3 flex justify-center">
              <Button variant="outline" size="sm" onClick={copyCode}>
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
            <p className="mt-3 text-xs text-text-muted">{t('codeOnceHint')}</p>
          </div>
        )}
      </Card>

      {/* Devices */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-text-muted">
            {t('devicesLabel')}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadDevices(station.id)}
            disabled={loadingDevices}
          >
            <RefreshCw
              className={loadingDevices ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'}
            />
            {t('refresh')}
          </Button>
        </div>

        {actionError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {devices.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
            {t('noDevices')}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-md border border-border bg-elevated/40 p-3"
              >
                <Monitor className="h-5 w-5 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {d.name || t('unnamedDevice')}
                    </span>
                    <span
                      className={
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ' +
                        (d.status === 'active'
                          ? 'border-teal/40 bg-teal/10 text-teal'
                          : 'border-border bg-elevated text-text-muted')
                      }
                    >
                      {t.has(`devStatus_${d.status}`)
                        ? t(`devStatus_${d.status}`)
                        : d.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-text-muted">
                    {d.platform ? `${d.platform} · ` : ''}
                    {d.lastSeenAt
                      ? t('lastSeen', {
                          time: new Date(d.lastSeenAt).toLocaleString(locale),
                        })
                      : t('neverSeen')}
                  </div>
                </div>
                {d.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeDevice(d.id)}
                    disabled={revoking === d.id}
                    className="shrink-0 text-error hover:text-error"
                  >
                    {revoking === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {t('revoke')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
