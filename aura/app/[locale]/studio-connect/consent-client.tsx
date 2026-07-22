'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MonitorSmartphone,
  Radio,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authorizeStudioConnect, type AuthorizeState } from './actions';
import type { Locale } from '@/i18n';

interface Entitlement {
  status: string;
  planCode: string;
  features: string[];
  maxDevicesPerStation: number;
  maxConcurrentOutputs: number;
  validUntil: string | null;
}
interface StationOption {
  stationId: string;
  stationName: string;
  organizationName: string;
  entitlement: Entitlement;
}
interface Params {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  device_name: string;
  device_platform: string;
  device_public_key: string;
  device_key_algorithm: string;
}

export function ConsentClient({
  locale,
  accountEmail,
  params,
  stations,
}: {
  locale: Locale;
  accountEmail: string;
  params: Params;
  stations: StationOption[];
}) {
  const t = useTranslations('studioConnectPage');
  const [state, formAction, pending] = useActionState<AuthorizeState, FormData>(
    authorizeStudioConnect,
    {}
  );
  const [stationId, setStationId] = useState(stations[0]?.stationId ?? '');
  const selected = stations.find((s) => s.stationId === stationId) ?? stations[0];
  const ent = selected?.entitlement;

  const errText = (code?: string) =>
    code && t.has(`error_${code}`) ? t(`error_${code}`) : t('error_unknown');

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="text-2xl font-semibold aura-gradient-text">AURA</span>
        </div>

        <div className="aura-card p-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-teal">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-text-primary">
                {t('title')}
              </h1>
              <p className="text-xs text-text-muted">{accountEmail}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-text-secondary">
            {t('intro', { device: params.device_name })}
          </p>

          {/* Station selection */}
          <div className="mt-5">
            <label className="text-xs uppercase tracking-wider text-text-muted">
              {t('stationLabel')}
            </label>
            {stations.length > 1 ? (
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.stationId} value={s.stationId}>
                      {s.stationName} · {s.organizationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-elevated/40 px-3 py-2 text-sm">
                <Radio className="h-4 w-4 text-teal" />
                {selected?.stationName}
              </div>
            )}
          </div>

          {/* Package summary */}
          {ent && (
            <div className="mt-4 rounded-md border border-border bg-elevated/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-text-muted">
                  {t('packageLabel')}
                </span>
                <span className="inline-flex items-center rounded-full border border-teal/40 bg-teal/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal">
                  {t.has(`entStatus_${ent.status}`)
                    ? t(`entStatus_${ent.status}`)
                    : ent.status}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-teal" />
                  {t('featDevices', { n: ent.maxDevicesPerStation })}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-teal" />
                  {t('featOutputs', { n: ent.maxConcurrentOutputs })}
                </li>
                {ent.features.includes('aura_content') && (
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-teal" />
                    {t('featContent')}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Consent notice */}
          <div className="mt-4 flex items-start gap-2 rounded-md border border-violet/30 bg-violet/10 px-3 py-2.5 text-xs text-text-secondary">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
            <span>{t('consentNotice', { device: params.device_name })}</span>
          </div>

          {state.error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2.5 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errText(state.error)}</span>
            </div>
          )}

          {/* Authorize form */}
          <form action={formAction} className="mt-5 space-y-2">
            {Object.entries(params).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <input type="hidden" name="station_id" value={stationId} />
            <Button
              type="submit"
              disabled={pending || !stationId}
              className="w-full bg-teal text-base hover:bg-teal/90 active:bg-teal/80"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('authorizing')}
                </>
              ) : (
                t('authorize')
              )}
            </Button>
          </form>
          <a
            href={`/${locale}/dashboard`}
            className="mt-3 block text-center text-xs text-text-muted hover:text-text-secondary"
          >
            {t('cancel')}
          </a>
        </div>

        <p className="mt-4 text-center text-[11px] text-text-muted">
          {t('securityFooter')}
        </p>
      </div>
    </div>
  );
}
