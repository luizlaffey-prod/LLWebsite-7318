import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { newsapiSourcesParam, type Bias } from './bias-sources';

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  originalLanguage: string;
}

export interface NewsSearchInput {
  categories: string[];
  bias: Bias;
  language: 'en' | 'pt' | 'es';
  geographicScope: 'global' | 'country' | 'state' | 'city';
  location?: string;
  limit?: number;
}

const NEWSAPI_BASE = 'https://newsapi.org/v2/everything';
const GNEWS_BASE = 'https://gnews.io/api/v4/search';

function buildQuery(input: NewsSearchInput): string {
  const parts: string[] = [];
  if (
    input.geographicScope !== 'global' &&
    input.location &&
    input.location.toLowerCase() !== 'global'
  ) {
    parts.push(`"${input.location}"`);
  }
  if (input.categories.length > 0) {
    parts.push(input.categories.join(' OR '));
  }
  return parts.join(' ') || 'news';
}

async function searchNewsApi(input: NewsSearchInput): Promise<NewsArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  const url = new URL(NEWSAPI_BASE);
  url.searchParams.set('q', buildQuery(input));
  url.searchParams.set('sources', newsapiSourcesParam(input.bias));
  url.searchParams.set('language', 'en');
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
      originalLanguage: 'en',
    }));
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] NewsAPI failed', err.status, err.message);
    }
    return [];
  }
}

async function searchGNews(input: NewsSearchInput): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_KEY;
  if (!key) return [];

  const url = new URL(GNEWS_BASE);
  url.searchParams.set('q', buildQuery(input));
  url.searchParams.set('lang', input.language);
  url.searchParams.set('max', String(input.limit ?? 10));
  url.searchParams.set('apikey', key);

  try {
    const res = await fetchWithRetry(url.toString());
    const data = (await res.json()) as { articles?: GNewsArticle[] };
    return (data.articles ?? []).map((a): NewsArticle => ({
      title: a.title ?? '',
      description: a.description ?? '',
      source: a.source?.name ?? '',
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      url: a.url ?? '',
      category: input.categories[0] ?? 'general',
      originalLanguage: input.language,
    }));
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] GNews failed', err.status, err.message);
    }
    return [];
  }
}

export async function searchNews(input: NewsSearchInput): Promise<NewsArticle[]> {
  // Run both providers in parallel; merge, dedupe by URL, keep newest first.
  const [newsapi, gnews] = await Promise.all([
    searchNewsApi(input),
    searchGNews(input),
  ]);

  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const a of [...newsapi, ...gnews]) {
    const key = a.url || `${a.source}|${a.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(a);
  }
  merged.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return merged.slice(0, input.limit ?? 10);
}

interface NewsApiArticle {
  title?: string;
  description?: string;
  content?: string;
  source?: { name?: string };
  publishedAt?: string;
  url?: string;
}

interface GNewsArticle {
  title?: string;
  description?: string;
  source?: { name?: string; url?: string };
  publishedAt?: string;
  url?: string;
}
