'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { updateSettings } from './actions';
import type { Locale } from '@/i18n';

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

interface Props {
  initial: {
    radioName: string;
    email: string;
    locale: Locale;
    timezone: string;
    emailNotifications: boolean;
  };
}

export function SettingsForm({ initial }: Props) {
  const t = useTranslations('settingsPage');
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [radioName, setRadioName] = useState(initial.radioName);
  const [locale, setLocale] = useState<Locale>(initial.locale);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [emailNotifications, setEmailNotifications] = useState(initial.emailNotifications);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const localeChanged = locale !== initial.locale;
      const res = await updateSettings({ radioName, locale, timezone, emailNotifications });
      setSaving(false);
      if ('error' in res) {
        setError(t('errorSave'));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // If locale changed, drop the user on the same path in the new locale.
      if (localeChanged && typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/^\/[a-z]{2}/, `/${locale}`);
        router.push(path);
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xs uppercase tracking-wider text-text-muted">
          {t('stationSection')}
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="radioName">{t('radioName')}</Label>
            <Input
              id="radioName"
              className="mt-2"
              value={radioName}
              onChange={(e) => setRadioName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <Label>{t('email')}</Label>
            <Input className="mt-2" value={initial.email} disabled />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xs uppercase tracking-wider text-text-muted">
          {t('preferencesSection')}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t('uiLanguage')}</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
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
            <Label>{t('timezone')}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
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
        </div>

        <div className="mt-6 flex items-start justify-between gap-4 rounded-md border border-border bg-elevated/40 p-4">
          <div>
            <div className="text-sm font-medium">{t('emailNotifications')}</div>
            <div className="mt-1 text-xs text-text-muted max-w-md">
              {t('emailNotificationsHint')}
            </div>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={(v) => setEmailNotifications(v)}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check className="h-4 w-4" /> {t('saved')}
          </span>
        )}
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
  );
}
