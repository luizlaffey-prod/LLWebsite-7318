import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { translateArticles } from '@/lib/llm/translate';
import { newsapiSourcesParam, type Bias } from './bias-sources';

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

function buildQuery(input: NewsSearchInput, lang: string): string {
  // Country scope is enforced via the provider's native filter; categories
  // contribute the only free-text component — translated to the search
  // language so it actually matches articles.
  if (input.categories.length === 0) return 'news';
  const keywords = input.categories.map((c) => localizedKeyword(c, lang));
  return keywords.join(' OR ');
}

async function searchNewsApi(input: NewsSearchInput): Promise<NewsArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  const url = new URL(NEWSAPI_BASE);
  // NewsAPI's source list is English-press oriented, so we keep the query
  // in English regardless of the user's output language.
  url.searchParams.set('q', buildQuery(input, 'en'));
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
      image: a.urlToImage || undefined,
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
  url.searchParams.set('q', buildQuery(input, searchLang));
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
      image: a.image || undefined,
    }));
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] GNews failed', err.status, err.message);
    }
    return [];
  }
}

export interface SearchNewsResult {
  articles: NewsArticle[];
  translationStatus: string;
  translatedCount: number;
}

export async function searchNews(input: NewsSearchInput): Promise<SearchNewsResult> {
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
  const top = merged.slice(0, input.limit ?? 10);

  // Translate titles + descriptions into the user's output language when
  // sources are in a different press language (e.g. global/US scope returns
  // English articles but the bulletin will be in Portuguese).
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
