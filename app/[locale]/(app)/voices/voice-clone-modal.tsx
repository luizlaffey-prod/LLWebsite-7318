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
import { Checkbox } from '@/components/ui/checkbox';
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
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) {
      setError(t('errorNoFiles'));
      return;
    }
    if (files.length > 5) {
      setError(t('errorTooManyFiles'));
      return;
    }
    if (files.some((file) => file.size > 11 * 1024 * 1024)) {
      setError(t('errorFileTooLarge'));
      return;
    }
    if (!consent) {
      setError(t('errorConsent'));
      return;
    }
    setPending(true);
    setError(null);
    let uploadedKeys: string[] = [];

    try {
      const presignRes = await fetch('/api/voices/clone/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: files.map((file) => ({
            filename: file.name,
            contentType: file.type || contentTypeFromName(file.name),
            sizeBytes: file.size,
          })),
        }),
      });
      if (!presignRes.ok) {
        const data = await readApiError(presignRes);
        setError(data.message || t('errorUpload'));
        return;
      }

      const { uploads } = (await presignRes.json()) as {
        uploads: Array<{
          uploadUrl: string;
          key: string;
          filename: string;
          contentType: string;
          sizeBytes: number;
        }>;
      };
      uploadedKeys = uploads.map((upload) => upload.key);

      try {
        await Promise.all(
          uploads.map(async (upload, index) => {
            const putRes = await fetch(upload.uploadUrl, {
              method: 'PUT',
              body: files[index],
            });
            if (!putRes.ok) throw new Error(`upload_${putRes.status}`);
          })
        );
      } catch {
        await cleanupUploads(uploads.map((upload) => upload.key));
        setError(t('errorUpload'));
        return;
      }

      const res = await fetch('/api/voices/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          language,
          gender,
          accent: accent || undefined,
          consent,
          samples: uploads.map(({ key, filename, contentType, sizeBytes }) => ({
            key,
            filename,
            contentType,
            sizeBytes,
          })),
        }),
      });
      if (!res.ok) {
        const data = await readApiError(res);
        await cleanupUploads(uploadedKeys);
        setError(data.message || t('errorGeneric'));
        return;
      }
      onCloned();
    } catch {
      if (uploadedKeys.length > 0) await cleanupUploads(uploadedKeys);
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

          <div className="flex items-start gap-3 rounded-md border border-border bg-elevated/40 p-3">
            <Checkbox
              id="voice-clone-consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
              disabled={pending}
            />
            <Label htmlFor="voice-clone-consent" className="text-sm leading-5 text-text-secondary">
              {t('consent')}
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending || !consent}>
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

function contentTypeFromName(filename: string): string {
  return filename.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
}

async function readApiError(res: Response): Promise<{ message?: string }> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json().catch(() => ({}));
  }
  if (res.status === 413) {
    return { message: 'The selected audio is too large for this upload.' };
  }
  return {};
}

async function cleanupUploads(keys: string[]): Promise<void> {
  await fetch('/api/voices/clone/presign', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  }).catch(() => undefined);
}
