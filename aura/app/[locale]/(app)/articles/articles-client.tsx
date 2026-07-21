'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Loader2,
  AlertCircle,
  Lock,
  MapPin,
  PenLine,
  Newspaper,
  Radio,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArticleEditorDrawer } from './article-editor-drawer';
import type { Locale } from '@/i18n';

interface NewsItem {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  originalLanguage: string;
  image?: string;
}

interface ArticleListItem {
  id: string;
  title: string;
  lede: string | null;
  status: 'draft' | 'approved' | 'published' | 'failed';
  imageUrl: string | null;
  language: string;
  wordCount: number | null;
  sourceName: string | null;
  publishedUrl: string | null;
  createdAt: string;
}

const CATEGORIES = [
  'politics',
  'cinema',
  'music',
  'arts',
  'sports',
  'technology',
  'health',
  'economy',
  'culture',
] as const;

type Bias = 'left' | 'center' | 'right';
type Scope = 'global' | 'country';

interface ArticlesClientProps {
  locale: Locale;
  canWrite: boolean;
  defaultLanguage: Locale;
}

const STATUS_STYLES: Record<ArticleListItem['status'], string> = {
  draft: 'border-border bg-elevated text-text-secondary',
  approved: 'border-teal/40 bg-teal/10 text-teal',
  published: 'border-violet/40 bg-violet/15 text-violet',
  failed: 'border-error/40 bg-error/10 text-error',
};

export function ArticlesClient({
  locale,
  canWrite,
  defaultLanguage,
}: ArticlesClientProps) {
  const t = useTranslations('articlesPage');
  const tCat = useTranslations('newsPage.categoryNames');

  const [categories, setCategories] = useState<string[]>(['politics']);
  const [language, setLanguage] = useState<Locale>(defaultLanguage);
  const [bias, setBias] = useState<Bias>('center');
  const [scope, setScope] = useState<Scope>('country');
  const [location, setLocation] = useState('');
  const [targetWords, setTargetWords] = useState('450');

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<NewsItem[]>([]);
  const [searchId, setSearchId] = useState<string | null>(null);

  // Which story is currently being written (by URL, so the spinner lands on
  // the right card) and any generation error.
  const [writingUrl, setWritingUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loadingList, setLoadingList] = useState(canWrite);
  const [openId, setOpenId] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles');
      if (!res.ok) return;
      const data = (await res.json()) as { articles: ArticleListItem[] };
      setArticles(data.articles);
    } catch {
      /* ignore — the list just stays empty */
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (canWrite) loadArticles();
  }, [canWrite, loadArticles]);

  const toggleCategory = (id: string) =>
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const onSearch = async () => {
    setSearching(true);
    setSearched(true);
    setSearchError(null);
    setResults([]);
    try {
      const res = await fetch('/api/news/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          bias,
          language,
          // The news endpoint needs a duration; articles don't care about
          // it, so send a modest value that keeps enough stories.
          durationSeconds: 120,
          includeWeather: false,
          geographicScope: scope,
          location: location || undefined,
        }),
      });
      if (!res.ok) {
        setSearchError(t('errorLoad'));
        return;
      }
      const data = (await res.json()) as {
        searchId: string;
        articles: NewsItem[];
      };
      setSearchId(data.searchId);
      setResults(data.articles);
    } catch {
      setSearchError(t('errorLoad'));
    } finally {
      setSearching(false);
    }
  };

  const writeArticle = async (story: NewsItem) => {
    setWritingUrl(story.url);
    setGenError(null);
    try {
      const res = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId: searchId ?? undefined,
          article: {
            title: story.title,
            description: story.description,
            source: story.source,
            url: story.url,
            image: story.image,
          },
          // Give the writer a little context from the other results.
          supporting: results
            .filter((r) => r.url !== story.url)
            .slice(0, 3)
            .map((r) => ({ title: r.title, description: r.description })),
          language,
          categories,
          targetWords: Math.max(150, Math.min(1200, Number(targetWords) || 450)),
          useSourceImage: true,
        }),
      });
      if (!res.ok) {
        setGenError(t('errorGenerate'));
        return;
      }
      const data = (await res.json()) as { id: string };
      await loadArticles();
      setOpenId(data.id);
    } catch {
      setGenError(t('errorGenerate'));
    } finally {
      setWritingUrl(null);
    }
  };

  if (!canWrite) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-violet">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{t('lockedTitle')}</h3>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          {t('lockedBody')}
        </p>
        <Button asChild className="mt-6">
          <a href={`/${locale}/settings/billing`}>{t('upgradeCta')}</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      {/* Search / generate */}
      <section>
        <h2 className="text-lg font-semibold">{t('generateSection')}</h2>
        <Card className="mt-4 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Categories */}
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('categories')}
              </Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((id) => {
                  const active = categories.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCategory(id)}
                      className={
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
                        (active
                          ? 'border-teal/40 bg-teal/10 text-teal'
                          : 'border-border bg-elevated text-text-secondary hover:text-text-primary')
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border ' +
                          (active
                            ? 'border-teal bg-teal text-base'
                            : 'border-border bg-transparent')
                        }
                      >
                        {active && <Check className="h-2.5 w-2.5" />}
                      </span>
                      {tCat(id)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('language')}
              </Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as Locale)}
              >
                <SelectTrigger className="mt-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="es">Español (LATAM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target words */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('targetWords')}
              </Label>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={150}
                  max={1200}
                  step={50}
                  value={targetWords}
                  onChange={(e) => setTargetWords(e.target.value)}
                />
                <span className="text-sm text-text-secondary">{t('words')}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {t('targetWordsHint')}
              </p>
            </div>

            {/* Bias */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('bias')}
              </Label>
              <Select value={bias} onValueChange={(v) => setBias(v as Bias)}>
                <SelectTrigger className="mt-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">{t('biasLeft')}</SelectItem>
                  <SelectItem value="center">{t('biasCenter')}</SelectItem>
                  <SelectItem value="right">{t('biasRight')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('scope')}
              </Label>
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger className="mt-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t('scopeGlobal')}</SelectItem>
                  <SelectItem value="country">{t('scopeCountry')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('location')}
              </Label>
              <div className="relative mt-3">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('locationPlaceholder')}
                  disabled={scope === 'global'}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-border pt-6">
            <Button
              size="lg"
              onClick={onSearch}
              disabled={searching || categories.length === 0}
              className="bg-teal text-base hover:bg-teal/90 active:bg-teal/80"
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('searching')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t('search')}
                </>
              )}
            </Button>
          </div>
        </Card>

        {searchError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
        {genError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{genError}</span>
          </div>
        )}

        {searching && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-2/3" />
                <Skeleton className="mt-4 h-9 w-28" />
              </Card>
            ))}
          </div>
        )}

        {searched && !searching && results.length === 0 && !searchError && (
          <div className="mt-6 rounded-md border border-border bg-surface p-10 text-center text-text-secondary">
            {t('noResults')}
          </div>
        )}

        {!searching && results.length > 0 && (
          <>
            <p className="mt-6 text-sm text-text-secondary">
              {t('resultsHint')}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {results.map((story, i) => {
                const writing = writingUrl === story.url;
                return (
                  <Card key={i} className="flex flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-md bg-violet/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet">
                        {(CATEGORIES as readonly string[]).includes(
                          story.category
                        )
                          ? tCat(story.category as (typeof CATEGORIES)[number])
                          : story.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-teal">
                        <Radio className="h-3 w-3" />
                        {story.source}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold leading-snug text-text-primary line-clamp-3">
                      {story.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
                      {story.description}
                    </p>
                    <div className="mt-4 flex flex-1 items-end justify-end">
                      <Button
                        size="sm"
                        onClick={() => writeArticle(story)}
                        disabled={writing || writingUrl !== null}
                        className="bg-teal text-base hover:bg-teal/90 active:bg-teal/80"
                      >
                        {writing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('generating')}
                          </>
                        ) : (
                          <>
                            <PenLine className="h-3.5 w-3.5" />
                            {t('writeArticle')}
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Existing articles */}
      <section>
        <h2 className="text-lg font-semibold">{t('listTitle')}</h2>
        {loadingList ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-text-muted">
              <Newspaper className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{t('emptyTitle')}</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              {t('emptyBody')}
            </p>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {articles.map((a) => (
              <Card
                key={a.id}
                className="flex items-center gap-4 p-4 transition-colors hover:border-teal/40"
              >
                {a.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.imageUrl}
                    alt=""
                    loading="lazy"
                    className="hidden h-16 w-24 shrink-0 rounded-md object-cover sm:block"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        'none';
                    }}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ' +
                        STATUS_STYLES[a.status]
                      }
                    >
                      {t(`status_${a.status}`)}
                    </span>
                    {a.sourceName && (
                      <span className="truncate text-xs text-text-muted">
                        {a.sourceName}
                      </span>
                    )}
                    {a.wordCount ? (
                      <span className="text-xs text-text-muted">
                        · {a.wordCount} {t('words')}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold text-text-primary">
                    {a.title}
                  </h3>
                  {a.lede && (
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {a.lede}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(a.id)}
                  className="shrink-0"
                >
                  {t('open')}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ArticleEditorDrawer
        articleId={openId}
        onClose={() => setOpenId(null)}
        onSaved={loadArticles}
      />
    </div>
  );
}
