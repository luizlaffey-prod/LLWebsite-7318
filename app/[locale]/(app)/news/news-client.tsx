'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Sparkles,
  Radio,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BulletinDrawer } from './bulletin-drawer';
import type { Locale } from '@/i18n';

interface Article {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  originalLanguage: string;
  image?: string;
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

interface SuggestItem {
  label: string;
}

export function NewsClient({ locale }: { locale: Locale }) {
  const t = useTranslations('newsPage');
  const tCat = useTranslations('newsPage.categoryNames');

  const [categories, setCategories] = useState<string[]>(['technology']);
  const [mins, setMins] = useState('2');
  const [secs, setSecs] = useState('0');
  const [language, setLanguage] = useState<Locale>(locale);
  const [bias, setBias] = useState<Bias>('center');
  const [scope, setScope] = useState<Scope>('global');
  const [location, setLocation] = useState('');
  const [includeWeather, setIncludeWeather] = useState(false);
  const [weatherFormat, setWeatherFormat] = useState<'separate' | 'integrated'>('separate');
  const [transitionEffects, setTransitionEffects] = useState(true);
  // City for the weather block. Decoupled from the news-search `location`
  // so the operator can pick global news with local weather. Falls back to
  // `location` when this is blank — that's the placeholder hint shown in
  // the input.
  const [weatherCity, setWeatherCity] = useState('');

  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Article[]>([]);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [selected, setSelected] = useState<Article | null>(null);

  const totalSeconds = useMemo(
    // Cap matches the server's z.number().max(600) on /api/news/search.
    // Without this clamp the UI accepted 30 minutes, the request 400'd,
    // and the user saw a misleading "couldn't reach news service".
    () =>
      Math.min(
        600,
        Math.max(0, (Number(mins) || 0) * 60 + (Number(secs) || 0))
      ),
    [mins, secs]
  );

  // Debounced location autocomplete
  useEffect(() => {
    if (scope === 'global' || location.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geo/autocomplete?q=${encodeURIComponent(location)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: SuggestItem[] };
        setSuggestions(data.suggestions || []);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [location, scope]);

  const toggleCategory = (id: string) =>
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setLocation(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
    });
  };

  const onSearch = async () => {
    setSearching(true);
    setSearched(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch('/api/news/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          bias,
          language,
          durationSeconds: totalSeconds,
          includeWeather,
          weatherFormat,
          geographicScope: scope,
          location: location || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === 'quota_exceeded') {
          setError(t('errorQuota'));
        } else if (body.error === 'invalid_input') {
          // Surface what the server actually rejected so users aren't
          // told "couldn't reach news service" for a client-side mistake.
          const first = body.details?.[0];
          const field = first?.path?.join('.') ?? 'input';
          setError(t('errorInvalidInput', { field }));
        } else {
          setError(t('errorGeneric'));
        }
        return;
      }
      const data = (await res.json()) as { searchId: string; articles: Article[] };
      setSearchId(data.searchId);
      setResults(data.articles);
      setLastUpdatedAt(new Date());
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSearching(false);
    }
  };

  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        </div>

        <Card className="mt-8 p-6">
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

            {/* Duration */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('duration')}
              </Label>
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    value={mins}
                    onChange={(e) => {
                      // Hard-cap at 9 min so total stays ≤ 10 min (the
                      // server limit). Browser's max attribute is just
                      // a hint — users can paste any number, so we
                      // clamp in JS.
                      const n = Math.max(0, Math.min(9, Number(e.target.value) || 0));
                      setMins(String(n));
                    }}
                  />
                  <p className="mt-1 text-xs text-text-muted">{t('minutes')}</p>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={secs}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      setSecs(String(n));
                    }}
                  />
                  <p className="mt-1 text-xs text-text-muted">{t('seconds')}</p>
                </div>
                <div className="h-11 px-3 inline-flex items-center text-sm text-text-secondary border border-border bg-elevated rounded-md">
                  {totalSeconds}s
                </div>
              </div>
            </div>

            {/* Language */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-text-muted">
                {t('language')}
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Locale)}>
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
              <div className="mt-3 flex gap-2 relative">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={t('locationPlaceholder')}
                    disabled={scope === 'global'}
                    className="pl-9"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-elevated shadow-lg">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setLocation(s.label);
                            setShowSuggestions(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={useMyLocation}
                  disabled={scope === 'global'}
                >
                  {t('useMyLocation')}
                </Button>
              </div>
            </div>

            {/* Weather */}
            <div className="md:col-span-2 rounded-md border border-border bg-elevated/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includeWeather}
                    onCheckedChange={(v) => setIncludeWeather(v)}
                  />
                  <div>
                    <div className="text-sm font-medium">{t('includeWeather')}</div>
                    <div className="text-xs text-text-muted">{t('weatherFormat')}</div>
                  </div>
                </div>
                <Select
                  value={weatherFormat}
                  onValueChange={(v) => setWeatherFormat(v as 'separate' | 'integrated')}
                  disabled={!includeWeather}
                >
                  <SelectTrigger className="sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="separate">{t('weatherSeparate')}</SelectItem>
                    <SelectItem value="integrated">{t('weatherIntegrated')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {includeWeather && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center">
                  <Label className="text-xs text-text-muted sm:w-32 sm:shrink-0">
                    {t('weatherCityLabel')}
                  </Label>
                  <div className="flex-1">
                    <Input
                      value={weatherCity}
                      onChange={(e) => setWeatherCity(e.target.value)}
                      placeholder={location || t('weatherCityPlaceholder')}
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      {weatherCity.trim()
                        ? t('weatherCityHint')
                        : location
                          ? t('weatherCityFallback', { location })
                          : t('weatherCityRequired')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 rounded-md border border-border bg-elevated/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div>
                <div className="text-sm font-medium">
                  {t('transitionEffects')}
                </div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {t('transitionEffectsHint')}
                </div>
              </div>
              <Switch
                checked={transitionEffects}
                onCheckedChange={(v) => setTransitionEffects(v)}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-6">
            <p className="text-sm text-text-muted">{t('searchHint')}</p>
            <Button
              size="lg"
              onClick={onSearch}
              disabled={searching || categories.length === 0 || totalSeconds < 15}
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

        {/* Results */}
        <div className="mt-10">
          {(searched || searching) && (
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <span className="inline-block h-2 w-2 rounded-full bg-teal shadow-[0_0_8px_var(--teal)]" />
                {lastUpdatedAt
                  ? t('lastUpdated', { time: lastUpdatedLabel })
                  : t('searching')}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onSearch}
                disabled={searching || categories.length === 0 || totalSeconds < 15}
              >
                <RefreshCw className={searching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                {t('refreshNow')}
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {searching && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden p-0">
                  <Skeleton className="h-40 w-full rounded-none" />
                  <div className="p-5">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="mt-3 h-5 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-2/3" />
                    <Skeleton className="mt-4 h-4 w-32" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {searched && !searching && results.length === 0 && !error && (
            <div className="mt-4 rounded-md border border-border bg-surface p-10 text-center text-text-secondary">
              {t('noResults')}
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {results.map((article, i) => (
                <Card
                  key={i}
                  className="group flex flex-col overflow-hidden p-0 transition-colors hover:border-teal/40"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-elevated">
                    {article.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-text-muted">
                        <Radio className="h-10 w-10 opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-md bg-violet/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet">
                        {(CATEGORIES as readonly string[]).includes(article.category)
                          ? tCat(article.category as (typeof CATEGORIES)[number])
                          : article.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <Calendar className="h-3 w-3" />
                        {new Date(article.publishedAt).toLocaleDateString(locale)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-snug text-text-primary line-clamp-3">
                      {article.title}
                    </h3>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal">
                      <Radio className="h-3.5 w-3.5" />
                      {article.source}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-text-secondary">
                      {article.description}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => setSelected(article)}
                        className="bg-teal text-base hover:bg-teal/90 active:bg-teal/80"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {t('generate')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BulletinDrawer
        locale={locale}
        article={selected}
        searchId={searchId}
        durationSeconds={totalSeconds}
        language={language}
        includeWeather={includeWeather}
        weatherFormat={weatherFormat}
        // Prefer the dedicated weather city; fall back to the news-search
        // location so existing flows that didn't touch the new field still
        // get a usable value.
        weatherLocation={
          (weatherCity.trim() || location || '').trim() || undefined
        }
        transitionEffects={transitionEffects}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
