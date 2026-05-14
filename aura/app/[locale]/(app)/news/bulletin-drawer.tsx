'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Mic,
  Download,
  RotateCcw,
  Edit3,
  Folder,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { EMOTIONS, EMOTION_COLOR, type Emotion } from '@/lib/audio/emotions';
import {
  chooseDownloadFolder,
  defaultFilename,
  downloadBlob,
  hasFolderConfigured,
} from '@/lib/storage/local-folder';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

interface Article {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
}

interface ScriptBlock {
  text: string;
  emotion: Emotion;
  duracaoSegundos: number;
}

interface VoiceOpt {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  gender: string;
  accent: string | null;
}

interface Props {
  locale: Locale;
  article: Article | null;
  searchId: string | null;
  durationSeconds: number;
  language: Locale;
  includeWeather: boolean;
  weatherFormat: 'separate' | 'integrated';
  weatherLocation?: string;
  onClose: () => void;
}

export function BulletinDrawer(props: Props) {
  const open = props.article !== null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && props.onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        {props.article && <DrawerBody {...props} key={props.article.url} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody(props: Props) {
  const t = useTranslations('bulletin');
  const { article } = props;

  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  const [voiceId, setVoiceId] = useState<string>('');
  const [speed, setSpeed] = useState(1.0);
  const [bgTrack, setBgTrack] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [folderReady, setFolderReady] = useState<boolean>(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/voices?lang=${props.language}`)
      .then((r) => r.json())
      .then((d: { voices: VoiceOpt[] }) => {
        setVoices(d.voices ?? []);
        setVoiceId(d.voices?.[0]?.id ?? '');
      })
      .catch(() => setVoices([]));
    hasFolderConfigured().then(setFolderReady);
  }, [props.language]);

  const onGenerate = async () => {
    if (!article || !voiceId) return;
    setGenerating(true);
    setError(null);
    setBlocks([]);
    setAudioUrl(null);
    try {
      const res = await fetch('/api/bulletin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId: props.searchId ?? undefined,
          article: {
            title: article.title,
            description: article.description,
            source: article.source,
            url: article.url,
          },
          voiceId,
          speed,
          bgTrackUrl: bgTrack || undefined,
          durationSeconds: props.durationSeconds,
          language: props.language,
          includeWeather: props.includeWeather,
          weatherFormat: props.weatherFormat,
          weatherLocation: props.weatherLocation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t('errorGenerate'));
        return;
      }
      setAudioId(data.audioId);
      setAudioUrl(data.audioUrl);
      setBlocks(data.script ?? []);
    } catch {
      setError(t('errorGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const onRegenerate = async () => {
    if (!audioId || blocks.length === 0) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/bulletin/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId, blocks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t('errorGenerate'));
        return;
      }
      setAudioUrl(data.audioUrl + `?t=${Date.now()}`); // bust cache
    } catch {
      setError(t('errorGenerate'));
    } finally {
      setRegenerating(false);
    }
  };

  const onChooseFolder = async () => {
    const ok = await chooseDownloadFolder();
    setFolderReady(ok);
  };

  const onDownload = async () => {
    if (!audioUrl) return;
    const filename = defaultFilename({ topic: article?.title ?? 'bulletin' });
    const result = await downloadBlob({ filename, fromUrl: audioUrl });
    setDownloadMsg(
      result.kind === 'folder' ? `${t('downloadedTo')}: ${result.path}` : t('download')
    );
    setTimeout(() => setDownloadMsg(null), 3000);
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t('drawerTitle')}</SheetTitle>
        <SheetDescription className="line-clamp-2">{article?.title}</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 overflow-y-auto px-6 pb-6 pt-4">
        {/* Config block */}
        <div className="grid gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-text-muted">
              {t('voice')}
            </Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t('voicePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.accent ? `· ${v.accent}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('speed')}
              </Label>
              <span className="text-sm text-text-secondary">{speed.toFixed(2)}x</span>
            </div>
            <Slider
              className="mt-3"
              min={0.8}
              max={1.5}
              step={0.05}
              value={[speed]}
              onValueChange={(v) => setSpeed(v[0])}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-text-muted">
              {t('bgTrack')}
            </Label>
            <Input
              className="mt-2"
              value={bgTrack}
              onChange={(e) => setBgTrack(e.target.value)}
              placeholder={t('bgTrackPlaceholder')}
            />
          </div>

          <Button
            size="lg"
            onClick={onGenerate}
            disabled={generating || !voiceId}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t('generating')}
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" /> {t('generate')}
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        {/* Script */}
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-text-muted">
            {t('scriptTitle')}
          </h3>
          {blocks.length === 0 && !generating && (
            <p className="mt-3 rounded-md border border-dashed border-border bg-elevated/40 p-6 text-center text-sm text-text-muted">
              {t('scriptEmpty')}
            </p>
          )}
          {generating && (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md border border-border bg-surface p-3">
                  <div className="mb-2 h-2 w-16 animate-pulse rounded bg-elevated" />
                  <div className="h-3 w-full animate-pulse rounded bg-elevated" />
                  <div className="mt-1 h-3 w-3/4 animate-pulse rounded bg-elevated" />
                </div>
              ))}
            </div>
          )}
          {blocks.length > 0 && (
            <ol className="mt-3 space-y-3">
              {blocks.map((b, i) => {
                const color = EMOTION_COLOR[b.emotion];
                return (
                  <li
                    key={i}
                    className={cn(
                      'group rounded-md border bg-surface p-3 transition-colors',
                      color.border
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                          color.text,
                          color.bg
                        )}
                      >
                        {i + 1} · {b.emotion} · {b.duracaoSegundos}s
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing(i)}
                        className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-text-primary">{b.text}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Player + actions */}
        {audioUrl && (
          <div className="rounded-md border border-border bg-elevated/40 p-4 space-y-3">
            <audio controls className="w-full" src={audioUrl}>
              <track kind="captions" />
            </audio>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {regenerating ? t('regenerating') : t('regenerate')}
              </Button>
              <Button size="sm" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
                {t('download')}
              </Button>
              {!folderReady && (
                <Button variant="outline" size="sm" onClick={onChooseFolder}>
                  <Folder className="h-3.5 w-3.5" />
                  {t('choosingFolder')}
                </Button>
              )}
            </div>
            {downloadMsg && (
              <p className="text-xs text-success">{downloadMsg}</p>
            )}
          </div>
        )}
      </div>

      {/* Edit block modal */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editBlock')}</DialogTitle>
          </DialogHeader>
          {editing !== null && blocks[editing] && (
            <EditBlockForm
              block={blocks[editing]}
              onSave={(updated) => {
                setBlocks((prev) => prev.map((b, i) => (i === editing ? updated : b)));
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}

function EditBlockForm({
  block,
  onSave,
  onCancel,
}: {
  block: ScriptBlock;
  onSave: (b: ScriptBlock) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('bulletin');
  const [text, setText] = useState(block.text);
  const [emotion, setEmotion] = useState<Emotion>(block.emotion);
  const [duration, setDuration] = useState(block.duracaoSegundos);

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('blockText')}</Label>
        <Textarea
          className="mt-2 min-h-[100px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('blockEmotion')}</Label>
          <Select value={emotion} onValueChange={(v) => setEmotion(v as Emotion)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMOTIONS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duration (s)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-2"
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={() => onSave({ text, emotion, duracaoSegundos: duration })}>
          {t('save')}
        </Button>
      </DialogFooter>
    </div>
  );
}

