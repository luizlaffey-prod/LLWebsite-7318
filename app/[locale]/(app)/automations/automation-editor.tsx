'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Plus, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AutomationInputType } from '@/lib/automations/schemas';
import type { Locale } from '@/i18n';

const CATEGORIES = [
  'politics',
  'cinema',
  'music',
  'arts',
  'sports',
  'technology',
  'health',
  'economy',
  'culture',
] as const;

const TIMEZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Bogota',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Lisbon',
];

interface AutomationLike extends AutomationInputType {
  id: string;
}

interface VoiceOpt {
  id: string;
  name: string;
  accent: string | null;
}

interface Props {
  open: boolean;
  initial: AutomationLike | null;
  defaultLanguage: Locale;
  defaultTimezone: string;
  onClose: () => void;
  onSaved: () => void;
}

interface Slot {
  time: string;
  categories: string[];
}

function emptyForm(defaultLanguage: Locale, defaultTimezone: string): AutomationInputType {
  return {
    name: '',
    slots: [{ time: '06:00', categories: ['politics'] }],
    durationSeconds: 120,
    language: defaultLanguage,
    voiceId: '',
    speed: 1.0,
    bgTrackUrl: null,
    duckAudio: true,
    includeWeather: false,
    weatherFormat: 'separate',
    geographicScope: 'global',
    location: null,
    bias: 'center',
    timezone: defaultTimezone,
    enabled: true,
  };
}

export function AutomationEditor({
  open,
  initial,
  defaultLanguage,
  defaultTimezone,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations('automationsPage');
  const tCat = useTranslations('newsPage.categoryNames');

  const [form, setForm] = useState<AutomationInputType>(() =>
    initial ?? emptyForm(defaultLanguage, defaultTimezone)
  );
  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial ?? emptyForm(defaultLanguage, defaultTimezone));
      setError(null);
    }
  }, [open, initial, defaultLanguage, defaultTimezone]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/voices?lang=${form.language}`)
      .then((r) => r.json())
      .then((d: { voices: VoiceOpt[]; defaultVoiceId: string | null }) => {
        setVoices(d.voices ?? []);
        if (!form.voiceId) {
          setForm((f) => ({ ...f, voiceId: d.defaultVoiceId ?? d.voices[0]?.id ?? '' }));
        }
      })
      .catch(() => setVoices([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.language]);

  const update = <K extends keyof AutomationInputType>(
    key: K,
    value: AutomationInputType[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const updateSlot = (idx: number, slot: Slot) =>
    setForm((f) => ({ ...f, slots: f.slots.map((s, i) => (i === idx ? slot : s)) }));

  const addSlot = () =>
    setForm((f) => ({
      ...f,
      slots: [...f.slots, { time: '12:00', categories: ['politics'] }],
    }));

  const removeSlot = (idx: number) =>
    setForm((f) => ({ ...f, slots: f.slots.filter((_, i) => i !== idx) }));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = initial ? 'PATCH' : 'POST';
      const url = initial ? `/api/automations/${initial.id}` : '/api/automations';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t('errorSave'));
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
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{initial ? t('editTitle') : t('newTitle')}</SheetTitle>
          <SheetDescription>{t('editorSubtitle')}</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-6 overflow-y-auto px-6 pb-6 pt-4">
          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <Label>{t('name')}</Label>
            <Input
              className="mt-2"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('namePlaceholder')}
              required
              minLength={2}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label>{t('slotsSection')}</Label>
              <Button type="button" size="sm" variant="secondary" onClick={addSlot}>
                <Plus className="h-3.5 w-3.5" /> {t('addSlot')}
              </Button>
            </div>
            <div className="space-y-3">
              {form.slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-elevated/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      type="time"
                      value={slot.time}
                      onChange={(e) =>
                        updateSlot(idx, { ...slot, time: e.target.value })
                      }
                      className="w-32"
                    />
                    {form.slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="text-text-muted hover:text-error"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {CATEGORIES.map((id) => {
                      const active = slot.categories.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            updateSlot(idx, {
                              ...slot,
                              categories: active
                                ? slot.categories.filter((c) => c !== id)
                                : [...slot.categories, id],
                            })
                          }
                          className={
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ' +
                            (active
                              ? 'border-teal/40 bg-teal/10 text-teal'
                              : 'border-border bg-elevated text-text-secondary hover:text-text-primary')
                          }
                        >
                          <span
                            aria-hidden="true"
                            className={
                              'inline-flex h-3 w-3 items-center justify-center rounded-sm border ' +
                              (active
                                ? 'border-teal bg-teal text-base'
                                : 'border-border bg-transparent')
                            }
                          >
                            {active && <Check className="h-2.5 w-2.5" />}
                          </span>
                          {tCat(id)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('language')}</Label>
              <Select value={form.language} onValueChange={(v) => update('language', v as Locale)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('voice')}</Label>
              <Select value={form.voiceId} onValueChange={(v) => update('voiceId', v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                      {v.accent ? ` · ${v.accent}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('bias')}</Label>
              <Select value={form.bias} onValueChange={(v) => update('bias', v as 'left' | 'center' | 'right')}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">{t('biasLeft')}</SelectItem>
                  <SelectItem value="center">{t('biasCenter')}</SelectItem>
                  <SelectItem value="right">{t('biasRight')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('scope')}</Label>
              <Select
                value={form.geographicScope}
                onValueChange={(v) => update('geographicScope', v as 'global' | 'country' | 'state' | 'city')}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t('scopeGlobal')}</SelectItem>
                  <SelectItem value="country">{t('scopeCountry')}</SelectItem>
                  <SelectItem value="state">{t('scopeState')}</SelectItem>
                  <SelectItem value="city">{t('scopeCity')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('location')}</Label>
            <Input
              className="mt-2"
              value={form.location ?? ''}
              onChange={(e) => update('location', e.target.value || null)}
              placeholder={t('locationPlaceholder')}
              disabled={form.geographicScope === 'global'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('duration')}</Label>
              <Input
                type="number"
                min={30}
                max={600}
                value={form.durationSeconds}
                onChange={(e) => update('durationSeconds', Number(e.target.value))}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-text-muted">{t('durationHint')}</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>{t('speed')}</Label>
                <span className="text-sm text-text-secondary">{form.speed.toFixed(2)}x</span>
              </div>
              <Slider
                className="mt-3"
                min={0.8}
                max={1.5}
                step={0.05}
                value={[form.speed]}
                onValueChange={(v) => update('speed', v[0])}
              />
            </div>
          </div>

          <div>
            <Label>{t('timezone')}</Label>
            <Select value={form.timezone} onValueChange={(v) => update('timezone', v)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-elevated/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t('includeWeather')}</div>
                <div className="mt-0.5 text-xs text-text-muted">{t('weatherHint')}</div>
              </div>
              <Switch
                checked={form.includeWeather}
                onCheckedChange={(v) => update('includeWeather', v)}
              />
            </div>
            {form.includeWeather && (
              <Select
                value={form.weatherFormat ?? 'separate'}
                onValueChange={(v) => update('weatherFormat', v as 'separate' | 'integrated')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="separate">{t('weatherSeparate')}</SelectItem>
                  <SelectItem value="integrated">{t('weatherIntegrated')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>{t('bgTrack')}</Label>
            <Input
              className="mt-2"
              value={form.bgTrackUrl ?? ''}
              onChange={(e) => update('bgTrackUrl', e.target.value || null)}
              placeholder="https://..."
            />
            <div className="mt-3 flex items-center justify-between">
              <Label>{t('duckAudio')}</Label>
              <Switch
                checked={form.duckAudio}
                onCheckedChange={(v) => update('duckAudio', v)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-elevated/40 p-4">
            <div>
              <div className="text-sm font-medium">{t('enabled')}</div>
              <div className="mt-0.5 text-xs text-text-muted">{t('enabledHint')}</div>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => update('enabled', v)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
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
