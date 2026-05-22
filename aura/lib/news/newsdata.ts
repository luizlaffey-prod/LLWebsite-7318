import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { isArticleAllowed, type Category, type SearchLang } from './bias-sources';
import type { NewsArticle, NewsSearchInput } from './aggregator';
import type { ResolvedLocation } from './countries';

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest';

interface NewsDataResult {
  title?: string | null;
  link?: string | null;
  description?: string | null;
  pubDate?: string | null;
  source_id?: string | null;
  source_name?: string | null;
  image_url?: string | null;
  language?: string | null;
}

interface NewsDataResponse {
  status?: string;
  results?: NewsDataResult[];
}

/**
 * NewsData.io integration. Free tier is 200 req/day, paid starts
 * around $50/mo with effectively unlimited volume. Strong LATAM
 * and lusophone coverage compared to GNews — the main reason to
 * add it.
 *
 * Lights up automatically when NEWSDATA_KEY is set on Vercel.
 * Without the key, returns [] silently so the pipeline still
 * works.
 *
 * Like GNews, NewsData has no bias filter of its own; results are
 * post-filtered against our outlet catalog via isArticleAllowed
 * so a "right + Brasil" search can't bleed in left-leaning press.
 */
export async function searchNewsData(
  input: NewsSearchInput,
  lang: SearchLang,
  resolved: ResolvedLocation | null,
  categories: Category[],
  buildQueryFn: (input: NewsSearchInput, lang: string, locKw?: string) => string
): Promise<NewsArticle[]> {
  const key = process.env.NEWSDATA_KEY;
  if (!key) return [];

  const url = new URL(NEWSDATA_BASE);
  // NewsData's `q` accepts free-form search; we reuse the same
  // (categories OR'd + optional location keyword) query the other
  // providers receive.
  const locationKeyword =
    resolved && !resolved.isCountry ? resolved.rawLocation : undefined;
  url.searchParams.set('q', buildQueryFn(input, lang, locationKeyword));
  url.searchParams.set('language', lang);
  url.searchParams.set('size', String(Math.min(input.limit ?? 10, 50)));
  if (resolved?.countryCode) {
    url.searchParams.set('country', resolved.countryCode);
  }
  url.searchParams.set('apikey', key);

  try {
    const res = await fetchWithRetry(url.toString());
    const data = (await res.json()) as NewsDataResponse;
    return (data.results ?? [])
      .map((r): NewsArticle => ({
        title: r.title ?? '',
        description: r.description ?? '',
        source: r.source_name ?? r.source_id ?? '',
        publishedAt: r.pubDate
          ? new Date(r.pubDate.replace(' ', 'T') + 'Z').toISOString()
          : new Date().toISOString(),
        url: r.link ?? '',
        category: input.categories[0] ?? 'general',
        originalLanguage: lang,
        image: r.image_url || undefined,
      }))
      .filter(
        (a) => a.url && a.title && isArticleAllowed(a.url, lang, input.bias, categories)
      );
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] NewsData failed', err.status, err.message);
    }
    return [];
  }
}
