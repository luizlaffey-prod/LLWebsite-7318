'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Sliders, Check, Sparkles } from 'lucide-react';
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

export interface VoiceItemForPersonality {
  id: string;
  name: string;
  description: string | null;
  style: string | null;
  accent: string | null;
}

export function VoicePersonalityModal({
  open,
  voice,
  onClose,
  onSaved,
}: {
  open: boolean;
  voice: VoiceItemForPersonality | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('voicesPage');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [accent, setAccent] = useState('');
  const [pending, setPending] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (voice) {
      setDescription(voice.description ?? '');
      setStyle(voice.style ?? '');
      setAccent(voice.accent ?? '');
      setError(null);
      setSavedSuccess(false);
    }
  }, [voice]);

  if (!voice) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/voices/${voice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || undefined,
          style: style.trim() || undefined,
          accent: accent.trim() || undefined,
        }),
      });

      if (!res.ok) {
        setError(t('errorSave'));
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 600);
    } catch {
      setError(t('errorSave'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sliders className="h-4 w-4 text-teal" />
            Personalidade do Locutor — {voice.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-300">
            Configure o tom editorial, estilo de locução e instruções de interpretação para este locutor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <Label className="text-zinc-200 font-medium">Tom & Personalidade do Locutor (Prompt)</Label>
            <textarea
              className="mt-2 w-full rounded-md border border-zinc-700/80 bg-[#06080F] p-3 text-sm text-white placeholder:text-zinc-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Locutor jovem, bem-humorado, dinâmico. Ritmo de rádio FM jovem com dicção clara e entusiasmo."
            />
            <p className="mt-1 text-xs text-zinc-400">
              Orienta o gerador de conteúdo sobre o comportamento e tom de voz deste locutor.
            </p>
          </div>

          <div>
            <Label className="text-zinc-200 font-medium">Estilo de Apresentação</Label>
            <Input
              className="mt-2 text-white bg-[#06080F] border-zinc-700/80 placeholder:text-zinc-400 focus:border-teal font-normal"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Ex: Jornalístico Dinâmico, Suave, Pop & Entretenimento"
            />
          </div>

          <div>
            <Label className="text-zinc-200 font-medium">Instruções de Pronúncia / Observações</Label>
            <Input
              className="mt-2 text-white bg-[#06080F] border-zinc-700/80 placeholder:text-zinc-400 focus:border-teal font-normal"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder="Ex: Paulista neutro, articular nomes próprios com clareza"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending} className="bg-teal text-black hover:bg-teal/90">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-4 w-4" /> Salvo!
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Salvar Personalidade
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
