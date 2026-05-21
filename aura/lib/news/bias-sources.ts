/**
 * Per-language curated source catalogs for the news aggregator.
 *
 * Two parallel maps:
 *  - NEWSAPI_DOMAINS — domains passed to NewsAPI's `domains=` parameter.
 *    We use domains rather than source IDs because NewsAPI's source-ID
 *    catalog is English-heavy and skips most PT/ES outlets we care
 *    about.
 *  - RSS_FEEDS — direct RSS endpoints we pull and parse ourselves.
 *    These cover outlets that either aren't in NewsAPI or whose API
 *    coverage is unreliable, and they're the only way to guarantee
 *    bias representation in PT/ES.
 *
 * Bias classifications follow how the outlet is perceived in its own
 * market — not a globalized AllSides plot. Brazilian center-left
 * outlets (Folha, Globo, UOL) live in `left` rather than `center`
 * because that's where a Brazilian listener locates them; the
 * `center` bucket is reserved for outlets actually perceived as
 * neutral / institutional locally. Same logic for ES.
 */
export type Bias = 'left' | 'center' | 'right';
export type SearchLang = 'en' | 'pt' | 'es';

export const NEWSAPI_DOMAINS: Record<SearchLang, Record<Bias, string[]>> = {
  en: {
    left: [
      'cnn.com',
      'msnbc.com',
      'theguardian.com',
      'npr.org',
      'huffpost.com',
      'vox.com',
    ],
    center: [
      'reuters.com',
      'apnews.com',
      'bbc.co.uk',
      'bbc.com',
      'economist.com',
      'ft.com',
      'thehill.com',
    ],
    right: [
      'foxnews.com',
      'wsj.com',
      'nationalreview.com',
      'breitbart.com',
      'nypost.com',
      'washingtontimes.com',
    ],
  },
  pt: {
    left: [
      'folha.uol.com.br',
      'uol.com.br',
      'g1.globo.com',
      'oglobo.globo.com',
      'bbc.com',
      'cartacapital.com.br',
      'brasil247.com',
      'redebrasilatual.com.br',
      'cartamaior.com.br',
      'diariodocentrodomundo.com.br',
    ],
    center: [
      'poder360.com.br',
      'nexojornal.com.br',
      'reuters.com',
      'apnews.com',
      'lupa.uol.com.br',
      'olhardigital.com.br',
    ],
    right: [
      'estadao.com.br',
      'oantagonista.com.br',
      'veja.abril.com.br',
      'gazetadopovo.com.br',
      'jovempan.com.br',
      'r7.com',
      'revistaoeste.com',
    ],
  },
  es: {
    left: [
      'elpais.com',
      'publico.es',
      'eldiario.es',
      'pagina12.com.ar',
    ],
    center: [
      'lavanguardia.com',
      'infobae.com',
      'bbc.com',
      'eluniverso.com',
      'eltiempo.com',
    ],
    right: [
      'elmundo.es',
      'abc.es',
      'larazon.es',
      'lanacion.com.ar',
      'clarin.com',
    ],
  },
};

export function newsapiDomainsParam(lang: SearchLang, bias: Bias): string {
  return NEWSAPI_DOMAINS[lang][bias].join(',');
}

// Reverse index: domain → bias bucket, per language. Built once at module
// load so per-article classification is O(1) per suffix lookup.
const DOMAIN_TO_BIAS: Record<SearchLang, Map<string, Bias>> = (() => {
  const out = {} as Record<SearchLang, Map<string, Bias>>;
  for (const lang of ['en', 'pt', 'es'] as const) {
    const m = new Map<string, Bias>();
    for (const bias of ['left', 'center', 'right'] as const) {
      for (const domain of NEWSAPI_DOMAINS[lang][bias]) {
        m.set(domain.toLowerCase(), bias);
      }
    }
    out[lang] = m;
  }
  return out;
})();

/**
 * Returns the bias bucket an article URL belongs to within a given
 * search language, or null if the domain is not in our catalog.
 *
 * Uses longest-suffix matching so a specific subdomain catalogued
 * separately (e.g. lupa.uol.com.br in `center`) wins over a more
 * general parent domain (uol.com.br in `left`). An article from
 * `m.uol.com.br` would fall back to the `uol.com.br` bucket; an
 * article from a domain we've never seen returns null and gets
 * dropped from bias-filtered results.
 */
export function biasOfDomain(
  url: string,
  lang: SearchLang
): Bias | null {
  const map = DOMAIN_TO_BIAS[lang];
  if (!map) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  let candidate = host;
  // Walk from full host toward TLD, returning the first catalogued match.
  while (candidate) {
    const hit = map.get(candidate);
    if (hit) return hit;
    const i = candidate.indexOf('.');
    if (i === -1) return null;
    candidate = candidate.slice(i + 1);
  }
  return null;
}

export interface RssFeed {
  url: string;
  source: string;
}

/**
 * Curated RSS feeds we fetch and parse directly. Each entry should
 * point at the outlet's main / general feed — per-category filtering
 * happens at the aggregator level by matching the user's chosen
 * categories against article title + description.
 */
export const RSS_FEEDS: Record<SearchLang, Record<Bias, RssFeed[]>> = {
  en: {
    left: [
      { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
      { url: 'https://feeds.npr.org/1001/rss.xml', source: 'NPR' },
    ],
    center: [
      { url: 'http://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' },
      { url: 'https://thehill.com/feed/', source: 'The Hill' },
    ],
    right: [
      { url: 'https://moxie.foxnews.com/google-publisher/latest.xml', source: 'Fox News' },
      { url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', source: 'Wall Street Journal' },
    ],
  },
  pt: {
    left: [
      { url: 'https://feeds.folha.uol.com.br/poder/rss091.xml', source: 'Folha de S.Paulo' },
      { url: 'https://g1.globo.com/rss/g1/', source: 'G1' },
      { url: 'https://rss.uol.com.br/feed/noticias.xml', source: 'UOL' },
      { url: 'https://www.bbc.com/portuguese/index.xml', source: 'BBC Brasil' },
      { url: 'https://www.cartacapital.com.br/feed/', source: 'CartaCapital' },
    ],
    center: [
      { url: 'https://www.poder360.com.br/feed/', source: 'Poder360' },
      { url: 'https://www.nexojornal.com.br/rss', source: 'Nexo' },
      { url: 'https://olhardigital.com.br/feed/', source: 'Olhar Digital' },
    ],
    right: [
      { url: 'https://www.estadao.com.br/rss/ultimas.xml', source: 'Estadão' },
      { url: 'https://veja.abril.com.br/feed', source: 'Veja' },
      { url: 'https://www.gazetadopovo.com.br/feed/', source: 'Gazeta do Povo' },
      { url: 'https://jovempan.com.br/feed', source: 'Jovem Pan' },
    ],
  },
  es: {
    left: [
      { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', source: 'El País' },
      { url: 'https://www.eldiario.es/rss/', source: 'elDiario.es' },
      { url: 'https://www.publico.es/rss/', source: 'Público' },
    ],
    center: [
      { url: 'https://www.lavanguardia.com/mvc/feed/rss/home', source: 'La Vanguardia' },
      { url: 'https://www.bbc.com/mundo/index.xml', source: 'BBC Mundo' },
      { url: 'https://www.infobae.com/feeds/rss/', source: 'Infobae' },
    ],
    right: [
      { url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml', source: 'El Mundo' },
      { url: 'https://www.abc.es/rss/feeds/abcPortada.xml', source: 'ABC' },
      { url: 'https://www.larazon.es/rss/portada.xml', source: 'La Razón' },
      { url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml', source: 'La Nación' },
      { url: 'https://www.clarin.com/rss/lo-ultimo/', source: 'Clarín' },
    ],
  },
};
