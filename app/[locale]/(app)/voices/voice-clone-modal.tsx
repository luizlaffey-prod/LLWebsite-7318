'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function VoiceCloneModal({
  open,
  onClose,
  onCloned,
}: {
  open: boolean;
  onClose: () => void;
  onCloned: () => void;
}) {
  const t = useTranslations('voicesPage.clone');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'en' | 'pt' | 'es'>('en');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [accent, setAccent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) {
      setError(t('errorNoFiles'));
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set('name', name);
    if (description) form.set('description', description);
    form.set('language', language);
    form.set('gender', gender);
    if (accent) form.set('accent', accent);
    for (const f of files) form.append('samples', f);

    try {
      const res = await fetch('/api/voices/clone', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || t('errorGeneric'));
        return;
      }
      onCloned();
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('modalHelp')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
              maxLength={60}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div>
            <Label>{t('description')}</Label>
            <Input
              className="mt-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('language')}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'pt' | 'es')}>
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
              <Label>{t('gender')}</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as 'male' | 'female' | 'neutral')}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('genderMale')}</SelectItem>
                  <SelectItem value="female">{t('genderFemale')}</SelectItem>
                  <SelectItem value="neutral">{t('genderNeutral')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('accent')}</Label>
            <Input
              className="mt-2"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder={t('accentPlaceholder')}
            />
          </div>

          <div>
            <Label>{t('samples')}</Label>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-elevated/40 px-4 py-6 text-center hover:border-teal/50">
              <Upload className="mb-2 h-5 w-5 text-text-muted" />
              <span className="text-sm text-text-secondary">
                {files.length > 0
                  ? t('samplesSelected', { count: files.length })
                  : t('samplesHint')}
              </span>
              <input
                type="file"
                multiple
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                className="hidden"
                onChange={(e) =>
                  setFiles(e.target.files ? Array.from(e.target.files) : [])
                }
              />
            </label>
            <p className="mt-1 text-xs text-text-muted">{t('samplesNote')}</p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('cloning')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> {t('clone')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
