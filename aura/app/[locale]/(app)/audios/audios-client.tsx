'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Play,
  Pause,
  Download,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { defaultFilename, downloadBlob } from '@/lib/storage/local-folder';
import { AudioEditorDrawer } from './audio-editor-drawer';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n';

interface AudioItem {
  id: string;
  title: string;
  sourceName: string | null;
  audioUrl: string | null;
  durationSeconds: number;
  language: 'en' | 'pt' | 'es';
  status: string;
  createdAt: string;
  voiceName: string | null;
  voiceId: string | null;
}

interface Page {
  audios: AudioItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudiosClient({ locale }: { locale: Locale }) {
  const t = useTranslations('audiosPage');

  const [loading, setLoading] = useState(true);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterLang, setFilterLang] = useState<'all' | 'en' | 'pt' | 'es'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (filterLang !== 'all') params.set('language', filterLang);
      const res = await fetch(`/api/audios?${params.toString()}`);
      if (!res.ok) {
        setError(t('errorLoad'));
        return;
      }
      const data = (await res.json()) as Page;
      setAudios(data.audios);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError(t('errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (audioEl) audioEl.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterLang]);

  // Reset selection whenever the visible page changes — keeping an off-page
  // selection alive would be surprising and risks deleting rows the user
  // can't currently see.
  useEffect(() => {
    setSelected(new Set());
  }, [page, filterLang]);

  const selectedCount = selected.size;
  const allOnPageSelected = useMemo(
    () => audios.length > 0 && audios.every((a) => selected.has(a.id)),
    [audios, selected]
  );
  const someOnPageSelected = selectedCount > 0 && !allOnPageSelected;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const a of audios) next.delete(a.id);
      } else {
        for (const a of audios) next.add(a.id);
      }
      return next;
    });
  };

  const togglePlay = (audio: AudioItem) => {
    if (!audio.audioUrl) return;
    if (playingId === audio.id && audioEl) {
      audioEl.pause();
      setPlayingId(null);
      setAudioEl(null);
      return;
    }
    if (audioEl) audioEl.pause();
    const a = new Audio(audio.audioUrl);
    a.onended = () => setPlayingId(null);
    a.onerror = () => setPlayingId(null);
    a.play().catch(() => setPlayingId(null));
    setAudioEl(a);
    setPlayingId(audio.id);
  };

  const onDownload = async (audio: AudioItem) => {
    if (!audio.audioUrl) return;
    setDownloading(audio.id);
    setError(null);
    try {
      await downloadBlob({
        filename: defaultFilename({ topic: audio.title }),
        fromUrl: audio.audioUrl,
        proxyUrl: `/api/audios/${audio.id}/download`,
      });
    } catch (err) {
      console.error('[audios] download failed', err);
      setError(t('errorDownload'));
    } finally {
      setDownloading(null);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/audios/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(t('errorDelete'));
        return;
      }
      setConfirmDelete(null);
      await load();
    } catch {
      setError(t('errorDelete'));
    }
  };

  const onBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    setError(null);
    const ids = Array.from(selected);
    // Fire deletes in parallel — same-origin requests so the browser will
    // pipe them efficiently. Settle independently so a partial failure
    // still removes the rows that did succeed.
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/audios/${id}`, { method: 'DELETE' }))
    );
    const failedCount = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
    ).length;
    setBulkDeleting(false);
    setConfirmBulkDelete(false);
    setSelected(new Set());
    if (failedCount > 0) {
      setError(t('errorBulkDelete', { failed: failedCount }));
    }
    await load();
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {audios.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <Checkbox
                  checked={
                    allOnPageSelected
                      ? true
                      : someOnPageSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={toggleAllOnPage}
                  aria-label={t('selectAll')}
                />
                <span className="select-none">{t('selectAll')}</span>
              </label>
            )}
            <div className="text-sm text-text-secondary">
              {selectedCount > 0
                ? t('selectedLabel', { n: selectedCount })
                : total > 0
                  ? t('countLabel', { total })
                  : t('emptyShort')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                size="sm"
                onClick={() => setConfirmBulkDelete(true)}
                className="bg-error text-base hover:brightness-110"
              >
                <Trash2 className="h-4 w-4" />
                {t('deleteSelected', { n: selectedCount })}
              </Button>
            )}
            <Select
              value={filterLang}
              onValueChange={(v) => {
                setFilterLang(v as 'all' | 'en' | 'pt' | 'es');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filterAllLanguages')}</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : audios.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center text-text-secondary">
            <Headphones className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm font-medium">{t('emptyTitle')}</p>
            <p className="mt-1 text-xs text-text-muted">{t('emptyBody')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {audios.map((a) => {
              const isPlaying = playingId === a.id;
              const isReady = a.status === 'ready' && !!a.audioUrl;
              const isSelected = selected.has(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    'grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 transition-colors',
                    isSelected && 'bg-surface/40'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(a.id)}
                    aria-label={t('selectOne')}
                  />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-sm font-medium">{a.title}</h3>
                      <Badge
                        variant={
                          a.status === 'ready'
                            ? 'success'
                            : a.status === 'failed'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span>{a.voiceName ?? '—'}</span>
                      <span>·</span>
                      <span>{formatDuration(a.durationSeconds)}</span>
                      <span>·</span>
                      <span className="uppercase">{a.language}</span>
                      {a.sourceName && (
                        <>
                          <span>·</span>
                          <span>{a.sourceName}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{new Date(a.createdAt).toLocaleDateString(locale)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePlay(a)}
                      disabled={!isReady}
                      title={t('play')}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(a.id)}
                      disabled={!isReady}
                      title={t('edit')}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(a)}
                      disabled={!isReady || downloading === a.id}
                      title={t('download')}
                    >
                      {downloading === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete(a.id)}
                      title={t('delete')}
                      className="hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-surface/60 px-4 py-3 text-sm">
            <div className="text-text-muted">
              {t('pageOf', { page, total: totalPages })}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AudioEditorDrawer audioId={editing} onClose={() => setEditing(null)} />

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t('cancel')}
            </Button>
            <Button
              className={cn('bg-error text-base hover:brightness-110')}
              onClick={() => confirmDelete && onDelete(confirmDelete)}
            >
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmBulkDelete}
        onOpenChange={(o) => !o && !bulkDeleting && setConfirmBulkDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('confirmBulkDeleteTitle', { n: selectedCount })}
            </DialogTitle>
            <DialogDescription>{t('confirmBulkDeleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmBulkDelete(false)}
              disabled={bulkDeleting}
            >
              {t('cancel')}
            </Button>
            <Button
              className={cn('bg-error text-base hover:brightness-110')}
              onClick={onBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
