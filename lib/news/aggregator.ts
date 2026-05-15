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

// Common country name → ISO 3166-1 alpha-2 (lowercased for GNews).
// Accepts PT, EN and ES forms. Extend as needed.
const COUNTRY_CODE: Record<string, string> = {
  'united states': 'us', 'usa': 'us', 'estados unidos': 'us', 'eua': 'us',
  'brazil': 'br', 'brasil': 'br',
  'mexico': 'mx', 'méxico': 'mx',
  'argentina': 'ar',
  'spain': 'es', 'espanha': 'es', 'españa': 'es',
  'portugal': 'pt',
  'united kingdom': 'gb', 'uk': 'gb', 'reino unido': 'gb',
  'france': 'fr', 'frança': 'fr', 'francia': 'fr',
  'germany': 'de', 'alemanha': 'de', 'alemania': 'de',
  'italy': 'it', 'itália': 'it', 'italia': 'it',
  'canada': 'ca', 'canadá': 'ca',
  'japan': 'jp', 'japão': 'jp', 'japón': 'jp',
  'china': 'cn',
  'india': 'in', 'índia': 'in',
  'australia': 'au', 'austrália': 'au',
  'colombia': 'co', 'colômbia': 'co',
  'chile': 'cl',
  'peru': 'pe', 'perú': 'pe',
};

// ISO country code → primary press language used by GNews's `lang` param.
// The bulletin script generator translates source articles into the user's
// chosen output language, so the search should pull from the country's
// native press rather than filter by the output locale.
const COUNTRY_PRESS_LANG: Record<string, string> = {
  us: 'en', gb: 'en', ca: 'en', au: 'en', in: 'en',
  br: 'pt', pt: 'pt',
  es: 'es', mx: 'es', ar: 'es', co: 'es', cl: 'es', pe: 'es',
  fr: 'fr', de: 'de', it: 'it', jp: 'ja', cn: 'zh',
};

function countryCodeFor(location?: string): string | undefined {
  if (!location) return undefined;
  return COUNTRY_CODE[location.trim().toLowerCase()];
}

function buildQuery(input: NewsSearchInput): string {
  const parts: string[] = [];
  // For state/city scope, include location as a soft hint (no quotes).
  // For country scope, the provider's native country filter handles it.
  if (
    (input.geographicScope === 'state' || input.geographicScope === 'city') &&
    input.location &&
    input.location.toLowerCase() !== 'global'
  ) {
    parts.push(input.location);
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

  // Search language follows the country's native press, not the bulletin's
  // output language — the script generator translates as it writes.
  const countryCode =
    input.geographicScope === 'country' ? countryCodeFor(input.location) : undefined;
  const searchLang =
    (countryCode && COUNTRY_PRESS_LANG[countryCode]) || input.language;

  const url = new URL(GNEWS_BASE);
  url.searchParams.set('q', buildQuery(input));
  url.searchParams.set('lang', searchLang);
  url.searchParams.set('max', String(input.limit ?? 10));
  url.searchParams.set('apikey', key);
  if (countryCode) url.searchParams.set('country', countryCode);

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
      originalLanguage: searchLang,
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
