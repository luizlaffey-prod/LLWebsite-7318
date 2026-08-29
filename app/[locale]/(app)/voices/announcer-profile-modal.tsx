'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface AnnouncerProfileForm {
  stationId: string;
  voiceId: string;
  personality: string;
  deliveryStyle: string;
  exampleScripts: string;
  signatures: string;
  editorialPreferences: string;
  avoidances: string;
  pronunciationGuide: string;
  humorLevel: 'subtle' | 'balanced' | 'free';
  energyLevel: 'calm' | 'balanced' | 'high';
  reactionsEnabled: boolean;
}

export interface AnnouncerProfileVoice {
  id: string;
  name: string;
  announcerProfile: AnnouncerProfileForm | null;
}

function blankProfile(stationId: string, voiceId: string): AnnouncerProfileForm {
  return {
    stationId,
    voiceId,
    personality: '',
    deliveryStyle: '',
    exampleScripts: '',
    signatures: '',
    editorialPreferences: '',
    avoidances: '',
    pronunciationGuide: '',
    humorLevel: 'balanced',
    energyLevel: 'balanced',
    reactionsEnabled: true,
  };
}

export function AnnouncerProfileModal({
  open,
  stationId,
  voice,
  onClose,
  onSaved,
}: {
  open: boolean;
  stationId: string;
  voice: AnnouncerProfileVoice | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('voicesPage.announcerProfile');
  const [form, setForm] = useState<AnnouncerProfileForm>(() =>
    blankProfile(stationId, voice?.id ?? ''),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!voice) return;
    setForm(voice.announcerProfile ?? blankProfile(stationId, voice.id));
    setError(null);
  }, [stationId, voice]);

  const update = <K extends keyof AnnouncerProfileForm>(
    key: K,
    value: AnnouncerProfileForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!voice || !stationId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/voices/${voice.id}/announcer-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, stationId }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(data.message || data.error || t('errorSave'));
      }
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title', { name: voice?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="announcer-personality">1. {t('personality')}</Label>
            <Textarea
              id="announcer-personality"
              value={form.personality}
              onChange={(event) => update('personality', event.target.value)}
              maxLength={3_000}
              rows={4}
              placeholder={t('personalityPlaceholder')}
            />
            <p className="text-xs text-text-muted">{t('personalityHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcer-delivery">2. {t('delivery')}</Label>
            <Textarea
              id="announcer-delivery"
              value={form.deliveryStyle}
              onChange={(event) => update('deliveryStyle', event.target.value)}
              maxLength={2_500}
              rows={3}
              placeholder={t('deliveryPlaceholder')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('humor')}</Label>
              <Select
                value={form.humorLevel}
                onValueChange={(value) =>
                  update('humorLevel', value as AnnouncerProfileForm['humorLevel'])
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subtle">{t('humorSubtle')}</SelectItem>
                  <SelectItem value="balanced">{t('humorBalanced')}</SelectItem>
                  <SelectItem value="free">{t('humorFree')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('energy')}</Label>
              <Select
                value={form.energyLevel}
                onValueChange={(value) =>
                  update('energyLevel', value as AnnouncerProfileForm['energyLevel'])
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calm">{t('energyCalm')}</SelectItem>
                  <SelectItem value="balanced">{t('energyBalanced')}</SelectItem>
                  <SelectItem value="high">{t('energyHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-elevated/40 p-3 text-sm text-text-secondary">
            <Checkbox
              checked={form.reactionsEnabled}
              onCheckedChange={(checked) => update('reactionsEnabled', checked === true)}
            />
            <span>
              <strong className="text-text-primary">{t('reactions')}</strong><br />
              {t('reactionsHint')}
            </span>
          </label>

          {([
            ['signatures', '3. signatures', 'signaturesPlaceholder', 1_500, 3],
            ['editorialPreferences', '4. editorial', 'editorialPlaceholder', 2_500, 3],
            ['avoidances', '5. avoidances', 'avoidancesPlaceholder', 2_500, 3],
            ['exampleScripts', 'examples', 'examplesPlaceholder', 8_000, 5],
            ['pronunciationGuide', 'pronunciation', 'pronunciationPlaceholder', 2_500, 3],
          ] as const).map(([key, label, placeholder, maxLength, rows]) => {
            const [prefix, translationKey] = label.includes('. ')
              ? label.split('. ')
              : ['', label];
            return (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`announcer-${key}`}>
                  {prefix ? `${prefix}. ` : ''}{t(translationKey)}
                </Label>
                <Textarea
                  id={`announcer-${key}`}
                  value={form[key]}
                  onChange={(event) => update(key, event.target.value)}
                  maxLength={maxLength}
                  rows={rows}
                  placeholder={t(placeholder)}
                />
              </div>
            );
          })}

          {error && (
            <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving || !voice || !stationId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
