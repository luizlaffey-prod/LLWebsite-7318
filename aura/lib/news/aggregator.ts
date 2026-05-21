import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { translateArticles } from '@/lib/llm/translate';
import {
  isArticleAllowed,
  newsapiDomainsForRequest,
  rssFeedsForRequest,
  type Bias,
  type Category,
  type SearchLang,
} from './bias-sources';
import { resolveLocation, type ResolvedLocation } from './countries';
import { fetchRssArticles } from './rss';
import { searchGuardian } from './guardian';

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  originalLanguage: string;
  image?: string;
}

export interface NewsSearchInput {
  categories: string[];
  bias: Bias;
  language: 'en' | 'pt' | 'es';
  geographicScope: 'global' | 'country';
  location?: string;
  limit?: number;
}

const NEWSAPI_BASE = 'https://newsapi.org/v2/everything';
const GNEWS_BASE = 'https://gnews.io/api/v4/search';

// Country resolution lives in ./countries.ts — it leans on the
// Node runtime's ICU country database (Intl.DisplayNames) so any of
// the ~250 ISO 3166-1 alpha-2 countries can be matched in EN/PT/ES
// without us maintaining a hand-rolled allowlist. When the user
// types a sub-country location (city, state, region) it's returned
// as-is via rawLocation and the aggregator drops it into the search
// query as a keyword.

// Category keyword translation per search language. GNews and NewsAPI match
// against the article text in whatever language they're searching, so passing
// the English token "politics" while lang=pt returns ~zero hits. We translate
// the user-selected category to the appropriate keyword for the search
// language so each provider gets a query it can actually match.
const CATEGORY_KEYWORD: Record<string, Record<string, string>> = {
  politics: { en: 'politics', pt: 'política', es: 'política' },
  cinema: { en: 'cinema', pt: 'cinema', es: 'cine' },
  music: { en: 'music', pt: 'música', es: 'música' },
  arts: { en: 'arts', pt: 'artes', es: 'arte' },
  sports: { en: 'sports', pt: 'esportes', es: 'deportes' },
  technology: { en: 'technology', pt: 'tecnologia', es: 'tecnología' },
  health: { en: 'health', pt: 'saúde', es: 'salud' },
  economy: { en: 'economy', pt: 'economia', es: 'economía' },
  culture: { en: 'culture', pt: 'cultura', es: 'cultura' },
};

function localizedKeyword(category: string, lang: string): string {
  return CATEGORY_KEYWORD[category]?.[lang] ?? category;
}

const VALID_CATEGORIES = Object.keys(CATEGORY_KEYWORD) as Category[];

/** Coerce raw input categories to the typed Category enum, dropping unknowns. */
function asCategories(cats: string[]): Category[] {
  return cats.filter((c): c is Category =>
    (VALID_CATEGORIES as readonly string[]).includes(c)
  );
}

function buildQuery(
  input: NewsSearchInput,
  lang: string,
  locationKeyword?: string
): string {
  // Two free-text components: the user's selected categories
  // (translated to the search language) and, when the location
  // wasn't a recognized country, the raw location string. The
  // location goes in as a phrase so multi-word names ("São Paulo")
  // stay together. We deliberately do NOT add the location keyword
  // when GNews's country filter already scopes the results — press
  // FROM a country rarely mentions the country name in headlines.
  const parts: string[] = [];
  if (input.categories.length > 0) {
    const keywords = input.categories.map((c) => localizedKeyword(c, lang));
    parts.push(`(${keywords.join(' OR ')})`);
  }
  if (locationKeyword) {
    const quoted = locationKeyword.includes(' ')
      ? `"${locationKeyword}"`
      : locationKeyword;
    parts.push(quoted);
  }
  if (parts.length === 0) return 'news';
  return parts.join(' AND ');
}

/**
 * Picks the actual search language for upstream providers. When the
 * user constrains by country (e.g. "Brasil"), we follow that country's
 * native press language regardless of the bulletin's output language,
 * because the script generator translates source material as it
 * writes. For sub-country locations or scopes outside our en/pt/es
 * catalog, falls back to the bulletin's output language.
 */
function effectiveSearchLang(
  input: NewsSearchInput,
  resolved?: ResolvedLocation
): SearchLang {
  const candidate = resolved?.pressLang ?? input.language;
  return candidate === 'pt' || candidate === 'es' ? candidate : 'en';
}

async function searchNewsApi(
  input: NewsSearchInput,
  lang: SearchLang,
  resolved: ResolvedLocation | null
): Promise<NewsArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  // Domains are picked per (language, bias, categories) so that, e.g.,
  // a "politics + center" search only queries political-news outlets —
  // not standalone tech sites that happen to live in the same bias
  // bucket. If the resulting domain list is empty (no outlet covers
  // any selected category in that bias bucket), skip NewsAPI entirely
  // since an empty `domains=` would silently widen the search to all
  // sources.
  const cats = asCategories(input.categories);
  const domains = newsapiDomainsForRequest(lang, input.bias, cats);
  if (!domains) return [];

  // Sub-country locations (cities, states) become a keyword filter
  // since NewsAPI has no country/region param — only language and
  // domain. The aggregator already restricts the domain list to the
  // chosen bias bucket; the keyword narrows further.
  const locationKeyword =
    resolved && !resolved.isCountry ? resolved.rawLocation : undefined;

  const url = new URL(NEWSAPI_BASE);
  url.searchParams.set('q', buildQuery(input, lang, locationKeyword));
  url.searchParams.set('domains', domains);
  url.searchParams.set('language', lang);
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', String(input.limit ?? 10));

  try {
    const res = await fetchWithRetry(url.toString(), {
      headers: { 'X-Api-Key': key },
    });
    const data = (await res.json()) as { articles?: NewsApiArticle[] };
    return (data.articles ?? []).map((a): NewsArticle => ({
      title: a.title ?? '',
      description: a.description ?? a.content ?? '',
      source: a.source?.name ?? '',
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      url: a.url ?? '',
      category: input.categories[0] ?? 'general',
      originalLanguage: lang,
      image: a.urlToImage || undefined,
    }));
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] NewsAPI failed', err.status, err.message);
    }
    return [];
  }
}

async function searchGNews(
  input: NewsSearchInput,
  lang: SearchLang,
  resolved: ResolvedLocation | null
): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_KEY;
  if (!key) return [];

  // Use the country filter when we resolved to an ISO code; otherwise
  // drop the location into the query as a keyword (cities / regions /
  // ambiguous text). For known countries we deliberately DON'T add
  // the country name as keyword — local press rarely mentions its
  // own country in headlines and the keyword would cut real results.
  const locationKeyword =
    resolved && !resolved.isCountry ? resolved.rawLocation : undefined;

  const url = new URL(GNEWS_BASE);
  url.searchParams.set('q', buildQuery(input, lang, locationKeyword));
  url.searchParams.set('lang', lang);
  url.searchParams.set('max', String(input.limit ?? 10));
  url.searchParams.set('apikey', key);
  if (resolved?.countryCode) {
    url.searchParams.set('country', resolved.countryCode);
  }

  try {
    const res = await fetchWithRetry(url.toString());
    const data = (await res.json()) as { articles?: GNewsArticle[] };
    // GNews has no bias or topical filter on its end — it returns
    // whatever is trending for the country + language. We post-filter
    // against the outlet catalog so a "politics + center" search
    // doesn't bleed in articles from tech-only outlets that happen to
    // share the center bucket.
    const cats = asCategories(input.categories);
    return (data.articles ?? [])
      .map((a): NewsArticle => ({
        title: a.title ?? '',
        description: a.description ?? '',
        source: a.source?.name ?? '',
        publishedAt: a.publishedAt ?? new Date().toISOString(),
        url: a.url ?? '',
        category: input.categories[0] ?? 'general',
        originalLanguage: lang,
        image: a.image || undefined,
      }))
      .filter((a) => a.url && isArticleAllowed(a.url, lang, input.bias, cats));
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] GNews failed', err.status, err.message);
    }
    return [];
  }
}

async function searchRss(
  input: NewsSearchInput,
  lang: SearchLang
): Promise<NewsArticle[]> {
  const cats = asCategories(input.categories);
  const feeds = rssFeedsForRequest(lang, input.bias, cats);
  if (feeds.length === 0) return [];
  const categoryKeywords = input.categories.map((c) => localizedKeyword(c, lang));
  return fetchRssArticles({
    feeds,
    lang,
    categories: input.categories,
    categoryKeywords,
    limit: input.limit ?? 10,
  });
}

export interface SearchNewsResult {
  articles: NewsArticle[];
  translationStatus: string;
  translatedCount: number;
}

export async function searchNews(input: NewsSearchInput): Promise<SearchNewsResult> {
  // Resolve location once. For country scope, if the user typed a
  // recognized ISO country we'll set GNews's `country=` filter and
  // use that country's press language; if they typed a sub-country
  // location (city, state, region) we'll use it as a search keyword
  // and fall back to the bulletin's output language.
  const resolved =
    input.geographicScope === 'country'
      ? resolveLocation(input.location)
      : null;

  // Determine which search languages to fan out across. Country scope
  // picks one (the country's native press language so we read its
  // own press, not what English wires say about it). Global scope
  // hits all three buckets — a Brazilian station on "Global, right"
  // should hear Fox + ABC España + Estadão, not just Estadão.
  // Per-language results are translated to the bulletin's output
  // language downstream by translateArticles.
  const langs: SearchLang[] =
    input.geographicScope === 'global'
      ? ['en', 'pt', 'es']
      : [effectiveSearchLang(input, resolved ?? undefined)];

  // Per-language: NewsAPI + GNews + RSS + Guardian in parallel.
  // Global multiplies request count proportionally — on free tiers
  // (NewsAPI: 100/day) plan accordingly, but each lang's RSS fan-out
  // is free, the Guardian's own quota is generous, and every provider
  // call streams in parallel so wall-clock latency is dominated by
  // the slowest single feed/API, not the total count.
  const calls = langs.flatMap((lang) => [
    searchNewsApi(input, lang, resolved),
    searchGNews(input, lang, resolved),
    searchRss(input, lang),
    searchGuardian(input, lang),
  ]);
  const results = await Promise.all(calls);

  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const a of results.flat()) {
    const key = a.url || `${a.source}|${a.title}`;
    if (seen.has(key)) continue;
    if (!a.title) continue;
    seen.add(key);
    merged.push(a);
  }
  merged.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const top = merged.slice(0, input.limit ?? 10);

  // Translate titles + descriptions into the user's output language when
  // sources are in a different press language (e.g. global scope returns
  // a mix of EN/PT/ES articles but the bulletin will be in one language).
  const translated = await translateArticles(top, input.language);
  return {
    articles: translated.articles,
    translationStatus: translated.status,
    translatedCount: translated.translatedCount,
  };
}

interface NewsApiArticle {
  title?: string;
  description?: string;
  content?: string;
  source?: { name?: string };
  publishedAt?: string;
  url?: string;
  urlToImage?: string;
}

interface GNewsArticle {
  title?: string;
  description?: string;
  source?: { name?: string; url?: string };
  publishedAt?: string;
  url?: string;
  image?: string;
}
