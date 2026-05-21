import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import type { NewsArticle, NewsSearchInput } from './aggregator';
import type { SearchLang } from './bias-sources';

const GUARDIAN_BASE = 'https://content.guardianapis.com/search';

// Maps AURA's category tokens to Guardian Content API section IDs.
// The Guardian's section taxonomy is precise enough that we always
// filter by section when a category is selected — no keyword
// fallback needed. Categories absent from this map fall through to
// an unfiltered "latest" query.
const GUARDIAN_SECTION: Record<string, string> = {
  politics: 'politics',
  cinema: 'film',
  music: 'music',
  arts: 'culture',
  sports: 'sport',
  technology: 'technology',
  health: 'society',
  economy: 'business',
  culture: 'culture',
};

interface GuardianResult {
  webTitle?: string;
  webUrl?: string;
  webPublicationDate?: string;
  sectionName?: string;
  fields?: { trailText?: string; thumbnail?: string };
}

interface GuardianResponse {
  response?: { status?: string; results?: GuardianResult[] };
}

/**
 * Direct Guardian Content API integration. Free with registration at
 * open-platform.theguardian.com — paste the key into GUARDIAN_KEY on
 * Vercel and this provider lights up automatically. Without the key,
 * returns [] silently (won't break the search pipeline).
 *
 * Scope: English-language, left-bias bucket only. The Guardian sits
 * in our EN left list already (theguardian.com) but its own API
 * returns richer metadata than NewsAPI's view of the same articles,
 * runs without counting against NewsAPI's free-tier daily budget,
 * and survives if NewsAPI is throttled.
 */
export async function searchGuardian(
  input: NewsSearchInput,
  lang: SearchLang
): Promise<NewsArticle[]> {
  const key = process.env.GUARDIAN_KEY;
  if (!key) return [];

  // The Guardian is firmly left-leaning English-language press.
  // Calling it for other (lang, bias) combos would mis-bucket the
  // article and confuse the bias filter downstream.
  if (lang !== 'en' || input.bias !== 'left') return [];

  const sections = input.categories
    .map((c) => GUARDIAN_SECTION[c])
    .filter((s): s is string => Boolean(s));

  const url = new URL(GUARDIAN_BASE);
  if (sections.length > 0) {
    // Guardian section param is pipe-separated for OR semantics.
    url.searchParams.set('section', sections.join('|'));
  }
  url.searchParams.set('order-by', 'newest');
  url.searchParams.set('show-fields', 'trailText,thumbnail');
  url.searchParams.set('page-size', String(input.limit ?? 10));
  url.searchParams.set('api-key', key);

  try {
    const res = await fetchWithRetry(url.toString());
    const data = (await res.json()) as GuardianResponse;
    return (data.response?.results ?? []).map(
      (r): NewsArticle => ({
        title: r.webTitle ?? '',
        description: r.fields?.trailText ?? '',
        source: 'The Guardian',
        publishedAt: r.webPublicationDate ?? new Date().toISOString(),
        url: r.webUrl ?? '',
        category: input.categories[0] ?? 'general',
        originalLanguage: 'en',
        image: r.fields?.thumbnail,
      })
    );
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] Guardian failed', err.status, err.message);
    }
    return [];
  }
}
