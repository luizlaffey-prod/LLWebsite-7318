'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/lib/feedback/schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('feedback');
  const pathname = usePathname();

  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state every time the dialog opens so a previous successful
  // send doesn't leave a stale "Thank you" up.
  useEffect(() => {
    if (open) {
      setCategory('suggestion');
      setMessage('');
      setSent(false);
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError(t('errorTooShort'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: trimmed,
          pageUrl: typeof window !== 'undefined'
            ? `${window.location.origin}${pathname}`
            : pathname,
        }),
      });
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      setSent(true);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-teal/30 bg-teal/10">
              <Check className="h-6 w-6 text-teal" />
            </div>
            <p className="mt-4 text-base font-medium">{t('thanksTitle')}</p>
            <p className="mt-1 max-w-sm text-sm text-text-secondary">
              {t('thanksBody')}
            </p>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="mt-6"
            >
              {t('close')}
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
                  {t('categoryLabel')}
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as FeedbackCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`category.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-text-muted">
                  {t('messageLabel')}
                </label>
                <Textarea
                  rows={6}
                  maxLength={2000}
                  placeholder={t('messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={pending}
                />
                <p className="mt-1 text-xs text-text-muted">
                  {message.length} / 2000
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                {t('cancel')}
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('sending')}
                  </>
                ) : (
                  t('submit')
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
