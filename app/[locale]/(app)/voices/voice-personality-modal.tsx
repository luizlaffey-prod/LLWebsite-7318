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

interface StructuredPersonality {
  essencia?: string;
  presencaEntrega?: string;
  assinaturasSlogans?: string;
  interessesEditoriais?: string;
  oQueEvitar?: string;
}

function parsePersonality(desc: string | null): StructuredPersonality {
  if (!desc) return {};
  try {
    if (desc.startsWith('{') && desc.endsWith('}')) {
      return JSON.parse(desc);
    }
  } catch {
    /* fallback to free text */
  }
  return { essencia: desc };
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
  const [essencia, setEssencia] = useState('');
  const [presencaEntrega, setPresencaEntrega] = useState('');
  const [assinaturasSlogans, setAssinaturasSlogans] = useState('');
  const [interessesEditoriais, setInteressesEditoriais] = useState('');
  const [oQueEvitar, setOQueEvitar] = useState('');

  const [style, setStyle] = useState('');
  const [accent, setAccent] = useState('');
  const [pending, setPending] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (voice) {
      const parsed = parsePersonality(voice.description);
      setEssencia(parsed.essencia ?? voice.description ?? '');
      setPresencaEntrega(parsed.presencaEntrega ?? voice.style ?? '');
      setAssinaturasSlogans(parsed.assinaturasSlogans ?? '');
      setInteressesEditoriais(parsed.interessesEditoriais ?? '');
      setOQueEvitar(parsed.oQueEvitar ?? '');

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

    const payloadObj: StructuredPersonality = {
      essencia: essencia.trim() || undefined,
      presencaEntrega: presencaEntrega.trim() || undefined,
      assinaturasSlogans: assinaturasSlogans.trim() || undefined,
      interessesEditoriais: interessesEditoriais.trim() || undefined,
      oQueEvitar: oQueEvitar.trim() || undefined,
    };

    const formattedDesc = JSON.stringify(payloadObj);

    try {
      const res = await fetch(`/api/voices/${voice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formattedDesc,
          style: presencaEntrega.trim() || style.trim() || undefined,
          accent: accent.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { message?: string };
        setError(errJson.message || t('errorSave'));
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-lg">
            <Sliders className="h-5 w-5 text-teal" />
            Perfil Editorial & Personalidade do Locutor — {voice.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-300">
            Defina em detalhes a identidade, tom, bordões e restrições editoriais para este locutor no ar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <Label className="text-zinc-200 font-medium text-sm">1. Essência do Locutor</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-zinc-700/80 bg-[#06080F] p-3 text-sm text-white placeholder:text-zinc-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              rows={2}
              value={essencia}
              onChange={(e) => setEssencia(e.target.value)}
              placeholder="Ex: Quem é o locutor, a história, o personagem, vibe e valores do apresentador."
            />
          </div>

          <div>
            <Label className="text-zinc-200 font-medium text-sm">2. Presença & Entrega (Tom e Ritmo)</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-zinc-700/80 bg-[#06080F] p-3 text-sm text-white placeholder:text-zinc-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              rows={2}
              value={presencaEntrega}
              onChange={(e) => setPresencaEntrega(e.target.value)}
              placeholder="Ex: Tom de voz, velocidade, energia, dicção, sotaque e estilo de locução no ar."
            />
          </div>

          <div>
            <Label className="text-zinc-200 font-medium text-sm">3. Assinatura & Slogans Autorizados</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-zinc-700/80 bg-[#06080F] p-3 text-sm text-white placeholder:text-zinc-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              rows={2}
              value={assinaturasSlogans}
              onChange={(e) => setAssinaturasSlogans(e.target.value)}
              placeholder="Ex: Bordões clássicos, slogans da emissora, vinhetas de abertura e encerramento autorizadas."
            />
          </div>

          <div>
            <Label className="text-zinc-200 font-medium text-sm">4. Interesses Editoriais</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-zinc-700/80 bg-[#06080F] p-3 text-sm text-white placeholder:text-zinc-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              rows={2}
              value={interessesEditoriais}
              onChange={(e) => setInteressesEditoriais(e.target.value)}
              placeholder="Ex: Assuntos em que fala com propriedade e entusiasmo (ex: Nu-Disco, Funk 70s, Lançamentos, Tecnologia)."
            />
          </div>

          <div>
            <Label className="text-zinc-200 font-medium text-sm">5. O Que Evitar (Restrições)</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-zinc-700/80 bg-[#06080F] p-3 text-sm text-white placeholder:text-zinc-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              rows={2}
              value={oQueEvitar}
              onChange={(e) => setOQueEvitar(e.target.value)}
              placeholder="Ex: Termos proibidos, estilos vedados, exageros a não cometer, saudações de horário engessadas."
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending} className="bg-teal text-black hover:bg-teal/90 font-medium">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-4 w-4" /> Perfil Salvo!
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Salvar Perfil Completo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
