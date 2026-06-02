'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Download,
  RotateCcw,
  Edit3,
  Folder,
  AlertCircle,
  Trash2,
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EMOTIONS, EMOTION_COLOR, type Emotion } from '@/lib/audio/emotions';
import {
  chooseDownloadFolder,
  defaultFilename,
  downloadBlob,
  hasFolderConfigured,
} from '@/lib/storage/local-folder';
import { cn } from '@/lib/utils';

interface ScriptBlock {
  text: string;
  emotion: Emotion;
  duracaoSegundos: number;
}

interface AudioDetail {
  id: string;
  title: string;
  sourceName: string | null;
  voiceName: string | null;
  audioUrl: string | null;
  durationSeconds: number;
  originalScript: ScriptBlock[];
  editedScript: ScriptBlock[] | null;
  status: string;
}

export function AudioEditorDrawer({
  audioId,
  onClose,
}: {
  audioId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={audioId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        {audioId && <Body audioId={audioId} key={audioId} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ audioId }: { audioId: string }) {
  const t = useTranslations('bulletin');

  const [loading, setLoading] = useState(true);
  const [audio, setAudio] = useState<AudioDetail | null>(null);
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  /** Snapshot of the script as it came back from the API. Compared
   * against `blocks` to know when the user has unsaved edits — drives
   * the "edits not in the audio yet" hint next to the Regenerate
   * button. */
  const [originalBlocks, setOriginalBlocks] = useState<ScriptBlock[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderReady, setFolderReady] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audios/${audioId}`)
      .then((r) => r.json())
      .then((d: { audio?: AudioDetail; error?: string }) => {
        if (d.error || !d.audio) {
          setError(t('errorGenerate'));
          return;
        }
        setAudio(d.audio);
        const fresh = d.audio.editedScript ?? d.audio.originalScript;
        setBlocks(fresh);
        setOriginalBlocks(fresh);
        setAudioUrl(d.audio.audioUrl);
      })
      .catch(() => setError(t('errorGenerate')))
      .finally(() => setLoading(false));
    hasFolderConfigured().then(setFolderReady);
  }, [audioId, t]);

  const onRegenerate = async () => {
    if (!audio) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/bulletin/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId: audio.id, blocks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t('errorGenerate'));
        return;
      }
      setAudioUrl(`${data.audioUrl}?t=${Date.now()}`);
      // Edits are now baked into the audio — sync the baseline.
      setOriginalBlocks(blocks);
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
    const filename = defaultFilename({ topic: audio?.title ?? 'bulletin' });
    const result = await downloadBlob({
      filename,
      fromUrl: audioUrl,
      proxyUrl: `/api/audios/${audioId}/download`,
    });
    setDownloadMsg(
      result.kind === 'folder' ? `${t('downloadedTo')}: ${result.path}` : t('download')
    );
    setTimeout(() => setDownloadMsg(null), 3000);
  };

  if (loading) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{t('drawerTitle')}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-4 space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </>
    );
  }

  if (error && !audio) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>{t('drawerTitle')}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{audio?.title}</SheetTitle>
        <SheetDescription>
          {audio?.voiceName ? `${audio.voiceName}` : ''}
          {audio?.sourceName ? ` · ${audio.sourceName}` : ''}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 overflow-y-auto px-6 pb-6 pt-4">
        {error && (
          <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wider text-text-muted font-semibold">
            {t('scriptTitle')}
          </h3>
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
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditing(i)}
                        className="rounded p-1 text-text-muted hover:bg-elevated hover:text-text-primary"
                        title={t('editBlock')}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Last block can't be deleted — bulletin needs
                          // at least one block for the regenerate route
                          // to accept the payload.
                          if (blocks.length <= 1) return;
                          setBlocks((bs) => bs.filter((_, idx) => idx !== i));
                        }}
                        disabled={blocks.length <= 1}
                        className="rounded p-1 text-text-muted hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                        title={t('deleteBlock')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-text-primary">{b.text}</p>
                </li>
              );
            })}
          </ol>
        </div>

        {audioUrl && (
          <div className="rounded-md border border-border bg-elevated/40 p-4 space-y-3">
            <audio controls className="w-full" src={audioUrl}>
              <track kind="captions" />
            </audio>
            {hasUnsavedEdits(originalBlocks, blocks) && (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{t('unsavedEditsHint')}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  hasUnsavedEdits(originalBlocks, blocks)
                    ? 'default'
                    : 'secondary'
                }
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
                <Download className="h-3.5 w-3.5" /> {t('download')}
              </Button>
              {!folderReady && (
                <Button variant="outline" size="sm" onClick={onChooseFolder}>
                  <Folder className="h-3.5 w-3.5" /> {t('choosingFolder')}
                </Button>
              )}
            </div>
            {downloadMsg && <p className="text-xs text-success">{downloadMsg}</p>}
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editBlock')}</DialogTitle>
          </DialogHeader>
          {editing !== null && blocks[editing] && (
            <EditBlockForm
              block={blocks[editing]}
              onSave={(updated) => {
                setBlocks((prev) =>
                  prev.map((b, i) => (i === editing ? updated : b))
                );
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


/**
 * Returns true when the working `current` array differs from the
 * baseline `original` array — drives the "edits not in the audio
 * yet" warning. Compares length, then field-by-field. Equality is
 * cheap enough at bulletin sizes (typically 4-8 blocks) that this
 * runs on every render without a memo.
 */
function hasUnsavedEdits(original: ScriptBlock[], current: ScriptBlock[]): boolean {
  if (original.length !== current.length) return true;
  for (let i = 0; i < original.length; i++) {
    const a = original[i];
    const b = current[i];
    if (
      a.text !== b.text ||
      a.emotion !== b.emotion ||
      a.duracaoSegundos !== b.duracaoSegundos
    ) {
      return true;
    }
  }
  return false;
}
