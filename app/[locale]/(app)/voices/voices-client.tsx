'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Play, Pause, Check, Lock, Loader2, Mic } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VoiceItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  languages: string[];
  gender: 'male' | 'female' | 'neutral';
  accent: string | null;
  style: string | null;
  tierRequired: 'starter' | 'standard' | 'pro';
  locked: boolean;
  isDefault: boolean;
}

interface ApiResponse {
  voices: VoiceItem[];
  tier: 'starter' | 'standard' | 'pro';
  defaultVoiceId: string | null;
  defaultSpeed: number;
}

export function VoicesClient() {
  const t = useTranslations('voicesPage');

  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [tier, setTier] = useState<'starter' | 'standard' | 'pro'>('starter');
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/voices?includeLocked=1');
      if (!res.ok) {
        setError(t('errorLoad'));
        return;
      }
      const data = (await res.json()) as ApiResponse;
      setVoices(data.voices);
      setTier(data.tier);
      setDefaultVoiceId(data.defaultVoiceId);
      setSpeed(data.defaultSpeed);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePreview = (voiceId: string) => {
    if (playingId === voiceId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const a = new Audio(`/api/voices/preview/${voiceId}`);
    a.onended = () => setPlayingId(null);
    a.onerror = () => {
      setPlayingId(null);
      setError(t('errorPreview'));
    };
    a.play().catch(() => {
      setPlayingId(null);
      setError(t('errorPreview'));
    });
    audioRef.current = a;
    setPlayingId(voiceId);
  };

  const setAsDefault = async (voiceId: string) => {
    setError(null);
    setPendingVoiceId(voiceId);
    try {
      const res = await fetch('/api/voices/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, speed, isDefault: true }),
      });
      if (!res.ok) {
        setError(t('errorSave'));
        return;
      }
      setDefaultVoiceId(voiceId);
      // Refresh list to flip isDefault flags.
      const refreshed = await fetch('/api/voices?includeLocked=1').then((r) => r.json());
      setVoices(refreshed.voices);
    } catch {
      setError(t('errorSave'));
    } finally {
      setPendingVoiceId(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-muted">{t('defaultSpeed')}</div>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              min={0.8}
              max={1.5}
              step={0.05}
              value={[speed]}
              onValueChange={(v) => setSpeed(v[0])}
              className="w-48"
            />
            <span className="text-sm text-text-secondary tabular-nums">{speed.toFixed(2)}x</span>
          </div>
        </div>
        <p className="text-xs text-text-muted max-w-xs">{t('speedHint')}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
              <div className="mt-5 flex justify-between">
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {voices.map((v) => {
            const isDefault = v.id === defaultVoiceId;
            return (
              <Card
                key={v.id}
                className={cn(
                  'flex flex-col p-5 transition-all',
                  isDefault && 'border-teal/40 shadow-[0_0_30px_-15px_rgba(0,229,200,0.5)]',
                  v.locked && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-elevated">
                      <Mic className="h-5 w-5 text-teal" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{v.name}</h3>
                      <p className="text-xs text-text-muted capitalize">
                        {v.gender}
                        {v.accent ? ` · ${v.accent}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isDefault && <Badge>{t('defaultBadge')}</Badge>}
                    {v.locked && (
                      <Badge variant="violet">
                        <Lock className="h-3 w-3 mr-1" /> {v.tierRequired.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm text-text-secondary line-clamp-2">{v.description}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {v.languages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-muted"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => togglePreview(v.id)}
                    disabled={v.locked}
                  >
                    {playingId === v.id ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> {t('stop')}
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> {t('preview')}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={isDefault ? 'outline' : 'default'}
                    onClick={() => setAsDefault(v.id)}
                    disabled={v.locked || isDefault || pendingVoiceId === v.id}
                  >
                    {pendingVoiceId === v.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isDefault ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> {t('inUse')}
                      </>
                    ) : (
                      t('use')
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && tier !== 'pro' && (
        <Card className="mt-8 p-5 text-center text-sm text-text-secondary">
          {t('upgradeForMore')}
        </Card>
      )}
    </div>
  );
}
