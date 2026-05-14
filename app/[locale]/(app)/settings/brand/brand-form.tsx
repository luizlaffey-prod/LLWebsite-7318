'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBrand } from './actions';

interface Props {
  initial: { brandLogoUrl: string | null; brandAccentColor: string | null };
}

export function BrandForm({ initial }: Props) {
  const t = useTranslations('brandPage');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(initial.brandLogoUrl ?? '');
  const [accent, setAccent] = useState(initial.brandAccentColor ?? '#00E5C8');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateBrand({
        brandLogoUrl: logoUrl,
        brandAccentColor: accent,
      });
      setSaving(false);
      if ('error' in res) {
        setError(t('errorSave'));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-xs uppercase tracking-wider text-text-muted">{t('logo')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <Label>{t('logoUrl')}</Label>
            <Input
              className="mt-2"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://your-cdn.com/logo.png"
            />
            <p className="mt-1 text-xs text-text-muted">{t('logoHint')}</p>
          </div>
          <div className="flex items-center justify-center rounded-md border border-border bg-elevated p-4 h-24 w-32">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-text-muted">{t('logoPreview')}</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xs uppercase tracking-wider text-text-muted">{t('accent')}</h2>
        <div className="mt-4 flex items-center gap-4">
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-12 w-12 cursor-pointer rounded-md border border-border bg-elevated"
          />
          <Input
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            placeholder="#00E5C8"
            className="font-mono uppercase max-w-xs"
          />
          <span
            className="inline-flex h-10 px-4 items-center rounded-md text-sm font-medium text-base"
            style={{ backgroundColor: accent }}
          >
            {t('sampleButton')}
          </span>
        </div>
        <p className="mt-3 text-xs text-text-muted">{t('accentHint')}</p>
      </Card>

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

