'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Plus,
  Heading,
  ChevronUp,
  ChevronDown,
  Trash2,
  Download,
  Check,
  ImageOff,
  AlertCircle,
  Send,
  ExternalLink,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Block {
  type: 'heading' | 'paragraph';
  text: string;
}

interface FullArticle {
  id: string;
  title: string;
  lede: string | null;
  body: Block[];
  status: 'draft' | 'approved' | 'published' | 'failed';
  imageUrl: string | null;
  imageCredit: string | null;
  sourceName: string | null;
  sourceArticleUrl: string | null;
  publishedUrl: string | null;
}

interface Props {
  articleId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ArticleEditorDrawer({ articleId, onClose, onSaved }: Props) {
  const t = useTranslations('articlesPage');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [title, setTitle] = useState('');
  const [lede, setLede] = useState('');
  const [body, setBody] = useState<Block[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageCredit, setImageCredit] = useState<string>('');
  const [status, setStatus] = useState<FullArticle['status']>('draft');
  const [source, setSource] = useState<{
    name: string | null;
    url: string | null;
  }>({ name: null, url: null });

  // Website publishing: whether the station has a connection configured,
  // the in-flight state, the resulting live URL, and any failure reason.
  const [hasConnection, setHasConnection] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    setError(null);
    setDirty(false);
    setPublishError(null);
    setPublishedUrl(null);
    (async () => {
      try {
        // Load the article and the station's publishing connection in
        // parallel — the latter decides whether the Publish button shows.
        const [res, connRes] = await Promise.all([
          fetch(`/api/articles/${articleId}`),
          fetch('/api/publishing'),
        ]);
        if (!res.ok) {
          setError(t('errorLoad'));
          return;
        }
        const { article: a } = (await res.json()) as { article: FullArticle };
        setTitle(a.title);
        setLede(a.lede ?? '');
        setBody(Array.isArray(a.body) ? a.body : []);
        setImageUrl(a.imageUrl);
        setImageCredit(a.imageCredit ?? '');
        setStatus(a.status);
        setSource({ name: a.sourceName, url: a.sourceArticleUrl });
        setPublishedUrl(a.publishedUrl ?? null);
        if (connRes.ok) {
          const { connection } = (await connRes.json()) as {
            connection: { enabled: boolean } | null;
          };
          setHasConnection(!!connection && connection.enabled);
        }
      } catch {
        setError(t('errorLoad'));
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId, t]);

  const mark = () => setDirty(true);

  const updateBlock = (i: number, text: string) => {
    setBody((prev) => prev.map((b, idx) => (idx === i ? { ...b, text } : b)));
    mark();
  };
  const addBlock = (type: Block['type']) => {
    setBody((prev) => [...prev, { type, text: '' }]);
    mark();
  };
  const removeBlock = (i: number) => {
    setBody((prev) => prev.filter((_, idx) => idx !== i));
    mark();
  };
  const moveBlock = (i: number, dir: -1 | 1) => {
    setBody((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    mark();
  };

  const save = async (nextStatus?: FullArticle['status']) => {
    if (!articleId) return;
    setSaving(true);
    setError(null);
    try {
      const cleanBody = body
        .map((b) => ({ ...b, text: b.text.trim() }))
        .filter((b) => b.text.length > 0);
      const res = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          lede: lede.trim() || null,
          body: cleanBody.length > 0 ? cleanBody : undefined,
          imageUrl,
          imageCredit: imageCredit.trim() || null,
          ...(nextStatus ? { status: nextStatus } : {}),
        }),
      });
      if (!res.ok) {
        setError(t('errorSave'));
        return;
      }
      if (nextStatus) setStatus(nextStatus);
      setDirty(false);
      onSaved();
    } catch {
      setError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!articleId) return;
    if (!confirm(t('confirmDelete'))) return;
    setSaving(true);
    try {
      await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const exportArticle = (format: 'html' | 'md') => {
    if (!articleId) return;
    window.open(`/api/articles/${articleId}/export?format=${format}`, '_blank');
  };

  const publish = async () => {
    if (!articleId) return;
    // Persist any pending edits first so the site gets the current copy.
    if (dirty) await save();
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: 'POST',
      });
      const data = (await res.json()) as { url?: string; reason?: string };
      if (!res.ok) {
        setPublishError(
          data.reason && t.has(`publishReason_${data.reason}`)
            ? t(`publishReason_${data.reason}`)
            : t('publishReason_unknown')
        );
        return;
      }
      setStatus('published');
      setPublishedUrl(data.url ?? null);
      onSaved();
    } catch {
      setPublishError(t('publishReason_unreachable'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Sheet open={!!articleId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t('drawerTitle')}</SheetTitle>
          {source.name && (
            <SheetDescription>
              {t('sourceLabel')}:{' '}
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal hover:underline"
                >
                  {source.name}
                </a>
              ) : (
                source.name
              )}
            </SheetDescription>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="mt-6 space-y-6 pb-24">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Image */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('imageLabel')}
              </Label>
              {imageUrl ? (
                <div className="mt-3">
                  <div className="overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt=""
                      className="max-h-56 w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          'none';
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={imageCredit}
                      onChange={(e) => {
                        setImageCredit(e.target.value);
                        mark();
                      }}
                      placeholder={t('imageCredit')}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImageUrl(null);
                        setImageCredit('');
                        mark();
                      }}
                    >
                      {t('removeImage')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-text-muted">
                  <ImageOff className="h-4 w-4" />
                  {t('noImage')}
                </div>
              )}
            </div>

            {/* Headline */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('titleLabel')}
              </Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  mark();
                }}
                className="mt-3 text-lg font-semibold"
              />
            </div>

            {/* Lede */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('ledeLabel')}
              </Label>
              <Textarea
                value={lede}
                onChange={(e) => {
                  setLede(e.target.value);
                  mark();
                }}
                rows={2}
                className="mt-3"
              />
            </div>

            {/* Body */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('bodyLabel')}
              </Label>
              <div className="mt-3 space-y-3">
                {body.map((block, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-elevated/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {block.type === 'heading'
                          ? t('blockHeading')
                          : t('blockParagraph')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveBlock(i, -1)}
                          disabled={i === 0}
                          title={t('moveUp')}
                          className="rounded p-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(i, 1)}
                          disabled={i === body.length - 1}
                          title={t('moveDown')}
                          className="rounded p-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(i)}
                          title={t('deleteBlock')}
                          className="rounded p-1 text-text-muted hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <Textarea
                      value={block.text}
                      onChange={(e) => updateBlock(i, e.target.value)}
                      rows={block.type === 'heading' ? 1 : 4}
                      className={
                        block.type === 'heading'
                          ? 'font-semibold'
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('paragraph')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('addParagraph')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('heading')}
                >
                  <Heading className="h-3.5 w-3.5" />
                  {t('addHeading')}
                </Button>
              </div>
            </div>

            {/* Publish to website */}
            <div className="border-t border-border pt-4">
              <div className="flex flex-col gap-3 rounded-md border border-border bg-elevated/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t('publishTitle')}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {hasConnection ? t('publishHint') : t('publishNoConnection')}
                  </div>
                </div>
                {hasConnection ? (
                  <Button
                    size="sm"
                    onClick={publish}
                    disabled={publishing || saving}
                    className="shrink-0 bg-violet text-white hover:bg-violet/90"
                  >
                    {publishing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {status === 'published' ? t('republish') : t('publish')}
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <a href="../settings/publishing">{t('setupConnection')}</a>
                  </Button>
                )}
              </div>
              {publishedUrl && (
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-teal hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('viewPublished')}
                </a>
              )}
              {publishError && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}
            </div>

            {/* Export */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportArticle('html')}
              >
                <Download className="h-3.5 w-3.5" />
                {t('exportHtml')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportArticle('md')}
              >
                <Download className="h-3.5 w-3.5" />
                {t('exportMd')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={saving}
                className="ml-auto text-error hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('delete')}
              </Button>
            </div>
          </div>
        )}

        {/* Sticky footer actions */}
        {!loading && (
          <div className="sticky bottom-0 -mx-6 mt-auto flex items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
            <span className="text-xs text-text-muted">
              {dirty ? t('unsaved') : ' '}
            </span>
            <div className="flex items-center gap-2">
              {status === 'approved' ? (
                <span className="inline-flex items-center gap-1 text-sm text-teal">
                  <Check className="h-4 w-4" />
                  {t('approved')}
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => save('approved')}
                  disabled={saving}
                >
                  <Check className="h-4 w-4" />
                  {t('approve')}
                </Button>
              )}
              <Button
                onClick={() => save()}
                disabled={saving || !dirty}
                className="bg-teal text-base hover:bg-teal/90 active:bg-teal/80"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
