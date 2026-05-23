'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Play,
  Database,
  Shield,
  Mic,
  Sparkles,
  Newspaper,
  Cloud,
  Mail,
  HardDrive,
  CreditCard,
  Globe,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SERVICES = [
  'database',
  'auth',
  'admin',
  'cron',
  'elevenlabs',
  'anthropic',
  'gemini',
  'newsapi',
  'gnews',
  'newsdata',
  'guardian',
  'openweather',
  'resend',
  'r2',
  'stripe',
] as const;

type Service = (typeof SERVICES)[number];

interface HealthResult {
  service: Service;
  configured: boolean;
  ok: boolean;
  detail?: string;
  error?: string;
}

const ICONS: Record<Service, React.ComponentType<{ className?: string }>> = {
  database: Database,
  auth: Shield,
  admin: ShieldCheck,
  cron: Clock,
  elevenlabs: Mic,
  anthropic: Sparkles,
  gemini: Sparkles,
  newsapi: Newspaper,
  gnews: Globe,
  newsdata: Newspaper,
  guardian: Newspaper,
  openweather: Cloud,
  resend: Mail,
  r2: HardDrive,
  stripe: CreditCard,
};

const ENV_HINT: Record<Service, string> = {
  database: 'DATABASE_URL',
  auth: 'BETTER_AUTH_SECRET',
  admin: 'ADMIN_EMAILS',
  cron: 'CRON_SECRET',
  elevenlabs: 'ELEVENLABS_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  newsapi: 'NEWSAPI_KEY',
  gnews: 'GNEWS_KEY',
  newsdata: 'NEWSDATA_KEY',
  guardian: 'GUARDIAN_KEY',
  openweather: 'OPENWEATHER_API_KEY',
  resend: 'RESEND_API_KEY',
  r2: 'R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET',
  stripe: 'STRIPE_SECRET_KEY',
};

export function HealthClient() {
  const t = useTranslations('healthPage');

  const [results, setResults] = useState<Partial<Record<Service, HealthResult>>>({});
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingOne, setLoadingOne] = useState<Service | null>(null);
  const [ttsTestPlaying, setTtsTestPlaying] = useState(false);
  const [ttsTestError, setTtsTestError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoadingAll(true);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return;
      const data = (await res.json()) as { results: Record<Service, HealthResult> };
      setResults(data.results);
    } finally {
      setLoadingAll(false);
    }
  };

  const refreshOne = async (service: Service) => {
    setLoadingOne(service);
    try {
      const res = await fetch(`/api/health/${service}`);
      if (!res.ok) return;
      const data = (await res.json()) as { result: HealthResult };
      setResults((prev) => ({ ...prev, [service]: data.result }));
    } finally {
      setLoadingOne(null);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const playTtsTest = async () => {
    setTtsTestPlaying(true);
    setTtsTestError(null);
    try {
      // Use the first preset voice. Voice IDs are determined server-side.
      const voicesRes = await fetch('/api/voices?lang=en');
      const voicesJson = (await voicesRes.json()) as {
        voices: { id: string }[];
      };
      const voiceId = voicesJson.voices?.[0]?.id;
      if (!voiceId) {
        setTtsTestError(t('errorNoVoice'));
        return;
      }
      const audio = new Audio(`/api/voices/preview/${voiceId}`);
      audio.onended = () => setTtsTestPlaying(false);
      audio.onerror = () => {
        setTtsTestPlaying(false);
        setTtsTestError(t('errorPreview'));
      };
      await audio.play();
    } catch {
      setTtsTestPlaying(false);
      setTtsTestError(t('errorPreview'));
    }
  };

  const summary = SERVICES.reduce(
    (acc, s) => {
      const r = results[s];
      if (!r) return acc;
      if (r.ok) acc.ok++;
      else if (r.configured) acc.failed++;
      else acc.unset++;
      return acc;
    },
    { ok: 0, failed: 0, unset: 0 }
  );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              <span className="font-medium text-success">{summary.ok}</span>
              <span className="text-text-secondary">{t('summaryOk')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-error" />
              <span className="font-medium text-error">{summary.failed}</span>
              <span className="text-text-secondary">{t('summaryFailed')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-text-muted" />
              <span className="font-medium text-text-secondary">{summary.unset}</span>
              <span className="text-text-secondary">{t('summaryUnset')}</span>
            </span>
          </div>
          <Button variant="secondary" onClick={loadAll} disabled={loadingAll}>
            {loadingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('retestAll')}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{t('ttsTestTitle')}</div>
            <div className="mt-1 text-xs text-text-muted">{t('ttsTestHint')}</div>
            {ttsTestError && (
              <p className="mt-2 text-xs text-error">{ttsTestError}</p>
            )}
          </div>
          <Button onClick={playTtsTest} disabled={ttsTestPlaying}>
            {ttsTestPlaying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {t('ttsTestCta')}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {SERVICES.map((service) => {
          const result = results[service];
          const Icon = ICONS[service];
          const status =
            !result ? 'pending' : result.ok ? 'ok' : result.configured ? 'failed' : 'unset';
          return (
            <Card key={service} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                      status === 'ok' && 'bg-success/10 text-success',
                      status === 'failed' && 'bg-error/10 text-error',
                      status === 'unset' && 'bg-elevated text-text-muted',
                      status === 'pending' && 'bg-elevated text-text-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold capitalize">{service}</h3>
                      {status === 'ok' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
                          <Check className="h-3 w-3" /> {t('statusOk')}
                        </span>
                      )}
                      {status === 'failed' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-error/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-error">
                          <X className="h-3 w-3" /> {t('statusFailed')}
                        </span>
                      )}
                      {status === 'unset' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                          <AlertCircle className="h-3 w-3" /> {t('statusUnset')}
                        </span>
                      )}
                      {status === 'pending' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                      )}
                    </div>
                    {result?.detail && (
                      <p className="mt-1 text-xs text-text-secondary">{result.detail}</p>
                    )}
                    {result?.error && (
                      <p className="mt-1 text-xs text-error">{result.error}</p>
                    )}
                    <p className="mt-2 text-[11px] text-text-muted font-mono">
                      env: <span className="text-text-secondary">{ENV_HINT[service]}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshOne(service)}
                  disabled={loadingOne === service}
                >
                  {loadingOne === service ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {t('retest')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 text-xs text-text-muted">
        <p>{t('explanation')}</p>
      </Card>
    </div>
  );
}
