'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  Loader2,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
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
import { TIMEZONE_OPTIONS } from '@/lib/constants/timezones';
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

// JS Date.getDay() encoding: 0=Sun, 1=Mon, ..., 6=Sat. UI puts Mon
// first because that's how every radio program grid is read, but the
// stored values keep the JS numeric convention to match server code.
const WEEKDAYS: { value: number; key: string }[] = [
  { value: 1, key: 'mon' },
  { value: 2, key: 'tue' },
  { value: 3, key: 'wed' },
  { value: 4, key: 'thu' },
  { value: 5, key: 'fri' },
  { value: 6, key: 'sat' },
  { value: 0, key: 'sun' },
];


interface AutomationLike extends AutomationInputType {
  id: string;
}

interface VoiceOpt {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral' | null;
  accent: string | null;
}

interface Props {
  open: boolean;
  initial: AutomationLike | null;
  defaultLanguage: Locale;
  defaultTimezone: string;
  /**
   * When false, the per-slot days-of-week chips are hidden and every
   * slot fires every day (Standard tier behavior). Pro receives true.
   */
  allowDaysOfWeek: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface Slot {
  time: string;
  categories: string[];
  daysOfWeek?: number[];
}

/**
 * Existing automations may carry legacy 'state' / 'city' values from before
 * the UI dropped those options. Collapse them to 'country' so the Select
 * shows the closest equivalent and a save round-trip succeeds.
 */
function normalizeScope(form: AutomationInputType): AutomationInputType {
  const scope = form.geographicScope as string;
  if (scope === 'global' || scope === 'country') return form;
  return { ...form, geographicScope: 'country' };
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
    weatherCity: null,
    transitionEffects: true,
    leadTimeMinutes: 60,
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
  allowDaysOfWeek,
  onClose,
  onSaved,
}: Props) {
  const t = useTranslations('automationsPage');
  const tCat = useTranslations('newsPage.categoryNames');

  const [form, setForm] = useState<AutomationInputType>(() =>
    normalizeScope(initial ?? emptyForm(defaultLanguage, defaultTimezone))
  );
  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  /** Locks the voice picker until /api/voices resolves so the user
   * can't manually pick a voice before the default has a chance to
   * apply. Tester (Marco) reported "voz padrão não foi pré-selecionada"
   * — root cause was a race where he clicked through faster than the
   * fetch completed. */
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  const onUploadBg = async (file: File) => {
    setBgBusy(true);
    setBgError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/bg-track', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setBgError(data.error ?? t('errorSave'));
        return;
      }
      update('bgTrackUrl', data.url);
    } catch {
      setBgError(t('errorSave'));
    } finally {
      setBgBusy(false);
    }
  };

  useEffect(() => {
    if (open) {
      setForm(normalizeScope(initial ?? emptyForm(defaultLanguage, defaultTimezone)));
      setError(null);
    }
  }, [open, initial, defaultLanguage, defaultTimezone]);

  useEffect(() => {
    if (!open) return;
    setVoicesLoading(true);
    fetch(`/api/voices?lang=${form.language}`)
      .then((r) => r.json())
      .then((d: { voices: VoiceOpt[]; defaultVoiceId: string | null }) => {
        setVoices(d.voices ?? []);
        if (!form.voiceId) {
          setForm((f) => ({ ...f, voiceId: d.defaultVoiceId ?? d.voices[0]?.id ?? '' }));
        }
      })
      .catch(() => setVoices([]))
      .finally(() => setVoicesLoading(false));
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
        // Prefer the explicit upstream message when the API returned
        // one (validation details, DB column-missing, etc.) so the
        // operator sees what's actually broken instead of the generic
        // fallback. data.message is set by the catch in the POST
        // route; data.error contains the canonical code.
        const detail =
          data?.message ||
          (data?.details?.[0]?.path
            ? `${data.error}: ${data.details[0].path.join('.')}`
            : data?.error);
        setError(detail || t('errorSave'));
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

                  {slot.categories.length === 0 && (
                    <div
                      className={
                        'mt-3 rounded-md border px-3 py-2 text-xs ' +
                        (form.includeWeather
                          ? 'border-teal/30 bg-teal/10 text-teal'
                          : 'border-warning/30 bg-warning/10 text-warning')
                      }
                    >
                      {form.includeWeather
                        ? t('weatherOnlySlotHint')
                        : t('emptySlotWarning')}
                    </div>
                  )}

                  {allowDaysOfWeek && (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <div className="mb-1.5 text-xs uppercase tracking-wider text-text-muted">
                      {t('daysOfWeek')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAYS.map(({ value, key }) => {
                        const currentDays = slot.daysOfWeek ?? [];
                        // Empty array means "every day". Show all chips as
                        // active when that's the case, but toggle into a
                        // restricted set the moment the user clicks one.
                        const everyDay = currentDays.length === 0;
                        const active =
                          everyDay || currentDays.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              const base = everyDay
                                ? [0, 1, 2, 3, 4, 5, 6]
                                : currentDays;
                              const next = base.includes(value)
                                ? base.filter((d) => d !== value)
                                : [...base, value].sort();
                              // If the user toggled back to "all days",
                              // collapse to undefined so the wire shape
                              // stays clean and the cron treats it as
                              // every day.
                              const collapsed =
                                next.length === 7 ? undefined : next;
                              updateSlot(idx, { ...slot, daysOfWeek: collapsed });
                            }}
                            className={
                              'h-7 w-7 rounded-full border text-[10px] font-medium uppercase tracking-wider transition-colors ' +
                              (active
                                ? 'border-teal/40 bg-teal/10 text-teal'
                                : 'border-border bg-elevated text-text-muted hover:text-text-primary')
                            }
                            aria-pressed={active}
                            aria-label={t(`day_${key}`)}
                          >
                            {t(`day_${key}_short`)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-xs text-text-muted">
                      {(slot.daysOfWeek ?? []).length === 0
                        ? t('daysOfWeekEveryDay')
                        : t('daysOfWeekCount', {
                            n: slot.daysOfWeek?.length ?? 0,
                          })}
                    </p>
                  </div>
                  )}
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
              <Select
                value={form.voiceId}
                onValueChange={(v) => update('voiceId', v)}
                disabled={voicesLoading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue
                    placeholder={voicesLoading ? t('voicesLoading') : '—'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                      {v.gender ? ` · ${v.gender}` : ''}
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
                onValueChange={(v) => update('geographicScope', v as 'global' | 'country')}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t('scopeGlobal')}</SelectItem>
                  <SelectItem value="country">{t('scopeCountry')}</SelectItem>
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
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
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
              <div className="space-y-3">
                <Select
                  value={form.weatherFormat ?? 'separate'}
                  onValueChange={(v) =>
                    update('weatherFormat', v as 'separate' | 'integrated')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="separate">{t('weatherSeparate')}</SelectItem>
                    <SelectItem value="integrated">{t('weatherIntegrated')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="border-t border-border/60 pt-3">
                  <Label className="text-xs text-text-muted">
                    {t('weatherCityLabel')}
                  </Label>
                  <Input
                    className="mt-2"
                    value={form.weatherCity ?? ''}
                    onChange={(e) =>
                      update('weatherCity', e.target.value || null)
                    }
                    placeholder={form.location || t('weatherCityPlaceholder')}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    {form.weatherCity?.trim()
                      ? t('weatherCityHint')
                      : form.location?.trim()
                        ? t('weatherCityFallback', { location: form.location })
                        : t('weatherCityRequired')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>{t('bgTrack')}</Label>

            <div className="mt-2">
              <Input
                type="file"
                accept="audio/*"
                disabled={bgBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadBg(f);
                }}
              />
              <p className="mt-1 text-xs text-text-muted">
                {t('bgTrackUploadHint')}
              </p>
            </div>

            {form.bgTrackUrl && (
              <div className="mt-3 rounded-md border border-border bg-elevated/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-text-secondary">
                      {form.bgTrackUrl}
                    </p>
                    <audio
                      controls
                      className="mt-2 w-full"
                      src={form.bgTrackUrl}
                    >
                      <track kind="captions" />
                    </audio>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => update('bgTrackUrl', null)}
                    title={t('bgTrackClear')}
                  >
                    <Trash2 className="h-4 w-4 text-text-muted hover:text-error" />
                  </Button>
                </div>
              </div>
            )}

            {bgError && (
              <p className="mt-2 text-xs text-error">{bgError}</p>
            )}

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
              <div className="text-sm font-medium">
                {t('transitionEffects')}
              </div>
              <div className="mt-0.5 text-xs text-text-muted">
                {t('transitionEffectsHint')}
              </div>
            </div>
            <Switch
              checked={form.transitionEffects}
              onCheckedChange={(v) => update('transitionEffects', v)}
            />
          </div>

          <div className="rounded-md border border-border bg-elevated/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium">{t('leadTime')}</div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {t('leadTimeHint')}
                </div>
              </div>
              <div className="shrink-0 text-sm font-medium tabular-nums">
                {form.leadTimeMinutes < 60
                  ? `${form.leadTimeMinutes} min`
                  : `${(form.leadTimeMinutes / 60).toFixed(form.leadTimeMinutes % 60 === 0 ? 0 : 1)} h`}
              </div>
            </div>
            <Slider
              className="mt-4"
              min={5}
              max={120}
              step={5}
              value={[form.leadTimeMinutes]}
              onValueChange={(v) => update('leadTimeMinutes', v[0])}
            />
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-text-muted">
              <span>{t('leadTimeFresh')}</span>
              <span>{t('leadTimeBuffer')}</span>
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
