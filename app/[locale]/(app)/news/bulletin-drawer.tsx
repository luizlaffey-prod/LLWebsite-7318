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
  Sparkles,
  Lock,
  Upload,
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
import { mixVoiceWithBackground } from '@/lib/audio/mix';
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
  transitionEffects?: boolean;
  onClose: () => void;
}

/**
 * Server-side mix helper. When the caller supplies a local `bgFile`,
 * the file is first uploaded straight to R2 via a presigned URL —
 * Vercel's 4.5 MB request-body cap kills any meaningful WAV bed if
 * we proxy the bytes through our function. Once the file is on R2
 * (or when a bgUrl was passed in directly), the mix endpoint takes
 * over the same way it does for AI-generated music.
 *
 * Returns the mixed URL on success, or null on any failure — the
 * caller decides whether to retry or just play the voice-only audio.
 */
async function serverSideMix(opts: {
  voiceUrl: string;
  bgFile?: File | null;
  bgUrl?: string | null;
}): Promise<string | null> {
  try {
    let bgUrl = opts.bgUrl ?? null;

    if (opts.bgFile && !bgUrl) {
      // Step 1: ask the backend for a presigned PUT URL.
      const presignRes = await fetch('/api/uploads/bg-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: opts.bgFile.name,
          contentType: opts.bgFile.type || 'application/octet-stream',
          sizeBytes: opts.bgFile.size,
        }),
      });
      if (!presignRes.ok) {
        console.warn('[mix] presign failed', await presignRes.text());
        return null;
      }
      const { uploadUrl, publicUrl } = (await presignRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };

      // Step 2: PUT the file directly to R2 — no Vercel in the middle.
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: opts.bgFile,
      });
      if (!putRes.ok) {
        console.warn('[mix] R2 PUT failed', putRes.status);
        return null;
      }
      bgUrl = publicUrl;
    }

    if (!bgUrl) return null;

    // Step 3: ask the mix endpoint to compose voice + bg.
    const mixRes = await fetch('/api/audios/mix-with-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceUrl: opts.voiceUrl,
        bgUrl,
      }),
    });
    if (!mixRes.ok) return null;
    const data = (await mixRes.json()) as { mixedUrl?: string };
    return data.mixedUrl ?? null;
  } catch (err) {
    console.warn('[mix] server-side mix request failed', err);
    return null;
  }
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
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgMode, setBgMode] = useState<'upload' | 'ai'>('upload');
  const [aiMusicUrl, setAiMusicUrl] = useState<string | null>(null);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [musicTier, setMusicTier] = useState<'starter' | 'standard' | 'pro'>('starter');
  const [musicQuota, setMusicQuota] = useState<{ used: number; limit: number } | null>(null);
  const [musicOveragePrompt, setMusicOveragePrompt] = useState<
    { priceCents: number } | null
  >(null);
  const [musicError, setMusicError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [mixing, setMixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ScriptBlock[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [folderReady, setFolderReady] = useState<boolean>(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [overagePrompt, setOveragePrompt] = useState<
    | { priceCents: number; isTrial: boolean }
    | null
  >(null);

  useEffect(() => {
    fetch(`/api/voices?lang=${props.language}`)
      .then((r) => r.json())
      .then(
        (d: {
          voices: VoiceOpt[];
          defaultVoiceId: string | null;
          defaultSpeed: number;
        }) => {
          setVoices(d.voices ?? []);
          const preferred = d.defaultVoiceId
            ? d.voices.find((v) => v.id === d.defaultVoiceId)
            : null;
          setVoiceId((preferred ?? d.voices?.[0])?.id ?? '');
          if (d.defaultSpeed) setSpeed(d.defaultSpeed);
        }
      )
      .catch(() => setVoices([]));
    hasFolderConfigured().then(setFolderReady);
    fetch('/api/music/quota')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tier: 'starter' | 'standard' | 'pro'; used: number; limit: number } | null) => {
        if (!d) return;
        setMusicTier(d.tier);
        setMusicQuota({ used: d.used, limit: d.limit });
      })
      .catch(() => {});
  }, [props.language]);

  const aiUnlocked = musicTier === 'pro';

  const callGenerateMusic = async (acceptOverage: boolean): Promise<string | null> => {
    setGeneratingMusic(true);
    setMusicError(null);
    setMusicOveragePrompt(null);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds: props.durationSeconds,
          emotions: blocks.map((b) => b.emotion),
          language: props.language,
          acceptOverage,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setMusicOveragePrompt({ priceCents: data.overagePriceCents ?? 75 });
        return null;
      }
      if (res.status === 403) {
        setMusicError(t('musicLocked'));
        return null;
      }
      if (!res.ok) {
        setMusicError(data.message || t('errorGenerate'));
        return null;
      }
      setAiMusicUrl(data.musicUrl);
      // Refresh quota after a successful generation.
      fetch('/api/music/quota')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setMusicQuota({ used: d.used, limit: d.limit }));
      return data.musicUrl as string;
    } catch {
      setMusicError(t('errorGenerate'));
      return null;
    } finally {
      setGeneratingMusic(false);
    }
  };

  const callGenerate = async (acceptOverage: boolean) => {
    if (!article || !voiceId) return;
    setGenerating(true);
    setError(null);
    setOveragePrompt(null);
    if (!acceptOverage) {
      setBlocks([]);
      setAudioUrl(null);
    }
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
          durationSeconds: props.durationSeconds,
          language: props.language,
          includeWeather: props.includeWeather,
          weatherFormat: props.weatherFormat,
          weatherLocation: props.weatherLocation,
          transitionEffects: props.transitionEffects ?? false,
          acceptOverage,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setOveragePrompt({
          priceCents: data.overagePriceCents ?? 50,
          isTrial: !!data.isTrial,
        });
        return;
      }
      if (!res.ok) {
        setError(data.message || t('errorGenerate'));
        return;
      }
      setAudioId(data.audioId);
      setBlocks(data.script ?? []);

      const freshBlocks: ScriptBlock[] = data.script ?? [];

      // Decide background source for mixing.
      let bgUrlForMix: string | null = null;
      let bgFileForMix: File | null = null;
      if (bgMode === 'upload' && bgFile) {
        bgFileForMix = bgFile;
      } else if (bgMode === 'ai' && aiUnlocked && freshBlocks.length > 0) {
        // Reuse a track from this drawer session if already generated, else mint one.
        if (aiMusicUrl) {
          bgUrlForMix = aiMusicUrl;
        } else {
          setGeneratingMusic(true);
          try {
            // Pass voiceUrl so the server can run the ffmpeg mix
            // itself and hand back a final mixedUrl. Avoids the
            // browser decodeAudioData / CORS path entirely, which has
            // been the source of "Não foi possível mixar a trilha"
            // errors.
            const musicRes = await fetch('/api/music/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                durationSeconds: props.durationSeconds,
                emotions: freshBlocks.map((b) => b.emotion),
                language: props.language,
                acceptOverage: false,
                voiceUrl: data.audioUrl,
              }),
            });
            const musicData = await musicRes.json();
            if (musicRes.status === 402) {
              setMusicOveragePrompt({
                priceCents: musicData.overagePriceCents ?? 75,
              });
            } else if (musicRes.ok) {
              setAiMusicUrl(musicData.musicUrl);
              if (musicData.mixedUrl) {
                // Server already mixed — short-circuit the client mix
                // and play the result.
                setAudioUrl(musicData.mixedUrl);
                setGeneratingMusic(false);
                return;
              }
              bgUrlForMix = musicData.musicUrl;
            } else {
              setMusicError(musicData.message || t('errorGenerate'));
            }
          } catch {
            setMusicError(t('errorGenerate'));
          } finally {
            setGeneratingMusic(false);
          }
        }
      }

      if (bgFileForMix || bgUrlForMix) {
        setMixing(true);
        try {
          const mixed = await mixVoiceWithBackground({
            voiceUrl: data.audioUrl,
            bgFile: bgFileForMix ?? undefined,
            bgUrl: bgUrlForMix ?? undefined,
          });
          setAudioUrl(URL.createObjectURL(mixed));
        } catch (clientErr) {
          // Client-side Web Audio chokes on some WAV codecs / large
          // files even when <audio> plays them fine. Fall back to
          // the server-side ffmpeg mix transparently.
          console.warn('[mix] client failed, retrying server-side', clientErr);
          const serverMixed = await serverSideMix({
            voiceUrl: data.audioUrl,
            bgFile: bgFileForMix,
            bgUrl: bgUrlForMix,
          });
          if (serverMixed) {
            setAudioUrl(serverMixed);
          } else {
            setError(t('errorMix'));
            setAudioUrl(data.audioUrl);
          }
        } finally {
          setMixing(false);
        }
      } else {
        setAudioUrl(data.audioUrl);
      }
    } catch {
      setError(t('errorGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const onGenerate = () => callGenerate(false);
  const onAcceptOverage = () => callGenerate(true);

  const onRegenerate = async () => {
    if (!audioId || blocks.length === 0) return;
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/bulletin/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioId,
          blocks,
          transitionEffects: props.transitionEffects ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t('errorGenerate'));
        return;
      }
      const fresh = data.audioUrl + `?t=${Date.now()}`; // bust cache
      const useAiBg = bgMode === 'ai' && aiUnlocked && aiMusicUrl;
      const useUploadBg = bgMode === 'upload' && bgFile;
      if (useAiBg) {
        const serverMixed = await serverSideMix({
          voiceUrl: data.audioUrl,
          bgUrl: aiMusicUrl as string,
        });
        if (serverMixed) {
          setAudioUrl(serverMixed);
        } else {
          setError(t('errorMix'));
          setAudioUrl(fresh);
        }
      } else if (useUploadBg) {
        try {
          const mixed = await mixVoiceWithBackground({
            voiceUrl: fresh,
            bgFile: bgFile as File,
          });
          setAudioUrl(URL.createObjectURL(mixed));
        } catch (clientErr) {
          console.warn('[regen] client mix failed, retrying server-side', clientErr);
          const serverMixed = await serverSideMix({
            voiceUrl: data.audioUrl,
            bgFile: bgFile as File,
          });
          if (serverMixed) {
            setAudioUrl(serverMixed);
          } else {
            setError(t('errorMix'));
            setAudioUrl(fresh);
          }
        }
      } else {
        setAudioUrl(fresh);
      }
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
    const result = await downloadBlob({
      filename,
      fromUrl: audioUrl,
      proxyUrl: audioId ? `/api/audios/${audioId}/download` : undefined,
    });
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

            {/* Segmented tabs: upload vs AI generation */}
            <div className="mt-2 inline-flex w-full rounded-md border border-border bg-elevated p-1">
              <button
                type="button"
                onClick={() => setBgMode('upload')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                  bgMode === 'upload'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Upload className="h-3.5 w-3.5" /> {t('bgTabUpload')}
              </button>
              <button
                type="button"
                onClick={() => setBgMode('ai')}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                  bgMode === 'ai'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {aiUnlocked ? (
                  <Sparkles className="h-3.5 w-3.5 text-violet" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-text-muted" />
                )}
                {t('bgTabAi')}{' '}
                <span className="inline-flex items-center rounded-sm bg-violet/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-violet">
                  Pro
                </span>
              </button>
            </div>

            {bgMode === 'upload' && (
              <>
                <p className="mt-2 text-xs text-text-secondary">{t('bgTrackHint')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setBgFile(e.target.files?.[0] ?? null)}
                    className="flex-1"
                  />
                  {bgFile && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setBgFile(null)}
                    >
                      {t('bgTrackClear')}
                    </Button>
                  )}
                </div>
                {bgFile && (
                  <p
                    className="mt-1 truncate text-xs text-text-secondary"
                    title={bgFile.name}
                  >
                    {bgFile.name} · {(bgFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}
              </>
            )}

            {bgMode === 'ai' && !aiUnlocked && (
              <div className="mt-2 rounded-md border border-violet/30 bg-violet/5 p-3 text-xs">
                <p className="font-medium text-text-primary">{t('musicLocked')}</p>
                <p className="mt-1 text-text-secondary">{t('musicLockedHint')}</p>
              </div>
            )}

            {bgMode === 'ai' && aiUnlocked && (
              <div className="mt-2 rounded-md border border-border bg-elevated/40 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" />
                  <div className="flex-1">
                    <p className="text-text-primary">{t('musicAiHint')}</p>
                    {musicQuota && (
                      <p className="mt-1 text-text-muted">
                        {t('musicQuotaLine', {
                          used: musicQuota.used,
                          limit: musicQuota.limit,
                        })}
                      </p>
                    )}
                  </div>
                </div>
                {aiMusicUrl && (
                  <div className="mt-3">
                    <audio controls className="w-full" src={aiMusicUrl}>
                      <track kind="captions" />
                    </audio>
                    <button
                      type="button"
                      onClick={() => {
                        setAiMusicUrl(null);
                        setMusicError(null);
                      }}
                      className="mt-1 text-[11px] text-text-muted hover:text-text-primary"
                    >
                      {t('musicRegenerate')}
                    </button>
                  </div>
                )}
                {generatingMusic && (
                  <div className="mt-3 inline-flex items-center gap-2 text-text-secondary">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t('musicGenerating')}
                  </div>
                )}
                {musicError && (
                  <p className="mt-2 text-text-secondary text-error">{musicError}</p>
                )}
                {musicOveragePrompt && (
                  <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-2">
                    <p className="text-warning">
                      {t('musicOveragePrompt', {
                        price: (musicOveragePrompt.priceCents / 100).toFixed(2),
                      })}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const url = await callGenerateMusic(true);
                          if (url) setAiMusicUrl(url);
                        }}
                        disabled={generatingMusic}
                      >
                        {t('overageConfirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMusicOveragePrompt(null)}
                      >
                        {t('cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            size="lg"
            onClick={onGenerate}
            disabled={generating || mixing || !voiceId}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t('generating')}
              </>
            ) : mixing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t('mixing')}
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

        {overagePrompt && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm">
            <p className="font-medium text-warning">
              {overagePrompt.isTrial
                ? t('overageTrial')
                : t('overagePrompt', { price: (overagePrompt.priceCents / 100).toFixed(2) })}
            </p>
            {!overagePrompt.isTrial && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={onAcceptOverage} disabled={generating}>
                  {t('overageConfirm')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOveragePrompt(null)}
                >
                  {t('cancel')}
                </Button>
              </div>
            )}
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

