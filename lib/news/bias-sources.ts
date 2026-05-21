/**
 * Per-language outlet catalog for the news aggregator.
 *
 * Each outlet declares its political bias plus an optional list of
 * verticals (the topical buckets it actually covers). The aggregator
 * uses these tags to decide which outlets to query for a given
 * (bias, categories) combination so that, e.g., a "politics + center"
 * search doesn't pull from a tech-only outlet just because the
 * keyword "economia" appears inside an air-fryer affiliate post.
 *
 * Generalist outlets (no `verticals` field) cover every category and
 * are gated only by bias. Vertical outlets must match at least one
 * of the user's requested categories to be included.
 *
 * A vertical outlet may declare `bias: null` to opt out of the bias
 * filter entirely — used for standalone tech/sport/economy outlets
 * that don't carry a political slant on those topics. Verticals
 * inside a politically branded conglomerate (Tilt UOL → UOL group,
 * Globo Esporte → Globo) keep their parent's bias.
 */
export type Bias = 'left' | 'center' | 'right';
export type SearchLang = 'en' | 'pt' | 'es';
export type Category =
  | 'politics'
  | 'cinema'
  | 'music'
  | 'arts'
  | 'sports'
  | 'technology'
  | 'health'
  | 'economy'
  | 'culture';

export interface Outlet {
  domain: string;
  source: string;
  rssUrl?: string;
  bias: Bias | null;
  /** Omit for generalist outlets (cover every category). */
  verticals?: Category[];
}

export const OUTLETS: Record<SearchLang, Outlet[]> = {
  en: [
    // --- left, generalist
    { domain: 'cnn.com', source: 'CNN', bias: 'left' },
    { domain: 'msnbc.com', source: 'MSNBC', bias: 'left' },
    { domain: 'theguardian.com', source: 'The Guardian', bias: 'left',
      rssUrl: 'https://www.theguardian.com/world/rss' },
    { domain: 'npr.org', source: 'NPR', bias: 'left',
      rssUrl: 'https://feeds.npr.org/1001/rss.xml' },
    { domain: 'huffpost.com', source: 'HuffPost', bias: 'left' },
    { domain: 'vox.com', source: 'Vox', bias: 'left' },

    // --- center, generalist
    { domain: 'reuters.com', source: 'Reuters', bias: 'center' },
    { domain: 'apnews.com', source: 'AP', bias: 'center' },
    { domain: 'bbc.co.uk', source: 'BBC', bias: 'center',
      rssUrl: 'http://feeds.bbci.co.uk/news/rss.xml' },
    { domain: 'bbc.com', source: 'BBC', bias: 'center' },
    { domain: 'economist.com', source: 'The Economist', bias: 'center' },
    { domain: 'ft.com', source: 'Financial Times', bias: 'center' },
    { domain: 'thehill.com', source: 'The Hill', bias: 'center',
      rssUrl: 'https://thehill.com/feed/' },

    // --- bias-neutral verticals
    { domain: 'techcrunch.com', source: 'TechCrunch', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://techcrunch.com/feed/' },
    { domain: 'arstechnica.com', source: 'Ars Technica', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://feeds.arstechnica.com/arstechnica/index' },
    { domain: 'theverge.com', source: 'The Verge', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://www.theverge.com/rss/index.xml' },
    { domain: 'espn.com', source: 'ESPN', bias: null,
      verticals: ['sports'] },
    { domain: 'cnbc.com', source: 'CNBC', bias: null,
      verticals: ['economy'] },
    // BBC Sport is independent enough editorially from BBC News politics
    // to be treated as bias-neutral when the search is sports-specific.
    { domain: 'bbc.com/sport', source: 'BBC Sport', bias: null,
      verticals: ['sports'],
      rssUrl: 'http://feeds.bbci.co.uk/sport/rss.xml' },

    // --- right, generalist
    { domain: 'foxnews.com', source: 'Fox News', bias: 'right',
      rssUrl: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
    { domain: 'wsj.com', source: 'Wall Street Journal', bias: 'right',
      rssUrl: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
    { domain: 'nationalreview.com', source: 'National Review', bias: 'right' },
    { domain: 'breitbart.com', source: 'Breitbart', bias: 'right' },
    { domain: 'nypost.com', source: 'New York Post', bias: 'right' },
    { domain: 'washingtontimes.com', source: 'Washington Times', bias: 'right' },
  ],

  pt: [
    // --- left, generalist
    { domain: 'folha.uol.com.br', source: 'Folha de S.Paulo', bias: 'left',
      rssUrl: 'https://feeds.folha.uol.com.br/poder/rss091.xml' },
    { domain: 'uol.com.br', source: 'UOL', bias: 'left',
      rssUrl: 'https://rss.uol.com.br/feed/noticias.xml' },
    { domain: 'g1.globo.com', source: 'G1', bias: 'left',
      rssUrl: 'https://g1.globo.com/rss/g1/' },
    { domain: 'oglobo.globo.com', source: 'O Globo', bias: 'left' },
    { domain: 'bbc.com/portuguese', source: 'BBC Brasil', bias: 'left',
      rssUrl: 'https://www.bbc.com/portuguese/index.xml' },
    { domain: 'cartacapital.com.br', source: 'CartaCapital', bias: 'left',
      rssUrl: 'https://www.cartacapital.com.br/feed/' },
    { domain: 'brasil247.com', source: 'Brasil247', bias: 'left' },
    { domain: 'redebrasilatual.com.br', source: 'Rede Brasil Atual', bias: 'left' },
    { domain: 'cartamaior.com.br', source: 'Carta Maior', bias: 'left' },
    { domain: 'diariodocentrodomundo.com.br', source: 'Diário do Centro do Mundo', bias: 'left' },

    // --- left, bias-aware verticals (inherit parent conglomerate bias)
    { domain: 'tilt.uol.com.br', source: 'Tilt UOL', bias: 'left',
      verticals: ['technology'],
      rssUrl: 'https://rss.uol.com.br/feed/tilt.xml' },
    { domain: 'ge.globo.com', source: 'Globo Esporte', bias: 'left',
      verticals: ['sports'],
      rssUrl: 'https://ge.globo.com/rss/ge/' },

    // --- center, politics/economy-focused (vertical, not true generalists)
    // These outlets brand themselves as policy / political analysis;
    // they don't cover sports, cinema or tech. Tagging them as verticals
    // both reflects reality and stops them from showing up in
    // "center + sports" or "center + culture" queries where they have
    // nothing to offer.
    { domain: 'poder360.com.br', source: 'Poder360', bias: 'center',
      verticals: ['politics', 'economy'],
      rssUrl: 'https://www.poder360.com.br/feed/' },
    { domain: 'nexojornal.com.br', source: 'Nexo', bias: 'center',
      verticals: ['politics', 'economy', 'culture'],
      rssUrl: 'https://www.nexojornal.com.br/rss' },
    { domain: 'lupa.uol.com.br', source: 'Agência Lupa', bias: 'center',
      verticals: ['politics'] },

    // --- bias-neutral verticals
    { domain: 'olhardigital.com.br', source: 'Olhar Digital', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://olhardigital.com.br/feed/' },
    { domain: 'tecmundo.com.br', source: 'TecMundo', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://www.tecmundo.com.br/rss' },
    { domain: 'canaltech.com.br', source: 'Canaltech', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://canaltech.com.br/rss/' },
    { domain: 'infomoney.com.br', source: 'InfoMoney', bias: null,
      verticals: ['economy'],
      rssUrl: 'https://www.infomoney.com.br/feed/' },
    { domain: 'lance.com.br', source: 'Lance', bias: null,
      verticals: ['sports'],
      rssUrl: 'https://www.lance.com.br/feed.xml' },

    // --- right, generalist
    { domain: 'estadao.com.br', source: 'Estadão', bias: 'right',
      rssUrl: 'https://www.estadao.com.br/rss/ultimas.xml' },
    { domain: 'oantagonista.com.br', source: 'O Antagonista', bias: 'right' },
    { domain: 'veja.abril.com.br', source: 'Veja', bias: 'right',
      rssUrl: 'https://veja.abril.com.br/feed' },
    { domain: 'gazetadopovo.com.br', source: 'Gazeta do Povo', bias: 'right',
      rssUrl: 'https://www.gazetadopovo.com.br/feed/' },
    { domain: 'jovempan.com.br', source: 'Jovem Pan', bias: 'right',
      rssUrl: 'https://jovempan.com.br/feed' },
    { domain: 'r7.com', source: 'R7', bias: 'right' },
    { domain: 'revistaoeste.com', source: 'Revista Oeste', bias: 'right' },
  ],

  es: [
    // --- left, generalist
    { domain: 'elpais.com', source: 'El País', bias: 'left',
      rssUrl: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
    { domain: 'publico.es', source: 'Público', bias: 'left',
      rssUrl: 'https://www.publico.es/rss/' },
    { domain: 'eldiario.es', source: 'elDiario.es', bias: 'left',
      rssUrl: 'https://www.eldiario.es/rss/' },
    { domain: 'pagina12.com.ar', source: 'Página 12', bias: 'left' },

    // --- center, generalist
    { domain: 'lavanguardia.com', source: 'La Vanguardia', bias: 'center',
      rssUrl: 'https://www.lavanguardia.com/mvc/feed/rss/home' },
    { domain: 'infobae.com', source: 'Infobae', bias: 'center',
      rssUrl: 'https://www.infobae.com/feeds/rss/' },
    { domain: 'bbc.com/mundo', source: 'BBC Mundo', bias: 'center',
      rssUrl: 'https://www.bbc.com/mundo/index.xml' },
    { domain: 'eluniverso.com', source: 'El Universo', bias: 'center' },
    { domain: 'eltiempo.com', source: 'El Tiempo', bias: 'center' },

    // --- bias-neutral verticals
    { domain: 'xataka.com', source: 'Xataka', bias: null,
      verticals: ['technology'],
      rssUrl: 'https://www.xataka.com/feedburner.xml' },
    { domain: 'marca.com', source: 'Marca', bias: null,
      verticals: ['sports'],
      rssUrl: 'https://e00-marca.uecdn.es/rss/portada.xml' },

    // --- right, generalist
    { domain: 'elmundo.es', source: 'El Mundo', bias: 'right',
      rssUrl: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml' },
    { domain: 'abc.es', source: 'ABC', bias: 'right',
      rssUrl: 'https://www.abc.es/rss/feeds/abcPortada.xml' },
    { domain: 'larazon.es', source: 'La Razón', bias: 'right',
      rssUrl: 'https://www.larazon.es/rss/portada.xml' },
    { domain: 'lanacion.com.ar', source: 'La Nación', bias: 'right',
      rssUrl: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml' },
    { domain: 'clarin.com', source: 'Clarín', bias: 'right',
      rssUrl: 'https://www.clarin.com/rss/lo-ultimo/' },
  ],
};

/**
 * Selects outlets to query for a given (language, bias, categories)
 * combination. Three rules:
 *   1. Generalist outlets (no verticals) must match the requested bias.
 *   2. Vertical outlets must cover at least one of the requested
 *      categories. If no categories are requested, all verticals pass.
 *   3. Vertical outlets with bias=null are politically neutral and
 *      bypass the bias filter; verticals with a non-null bias must
 *      still match the requested bias.
 */
export function selectOutlets(
  lang: SearchLang,
  bias: Bias,
  categories: Category[]
): Outlet[] {
  return (OUTLETS[lang] ?? []).filter((o) => {
    if (!o.verticals) {
      return o.bias === bias;
    }
    const matchesCategory =
      categories.length === 0 ||
      categories.some((c) => o.verticals!.includes(c));
    if (!matchesCategory) return false;
    return o.bias === null || o.bias === bias;
  });
}

/** Convenience: comma-separated domains for NewsAPI's `domains=` param. */
export function newsapiDomainsForRequest(
  lang: SearchLang,
  bias: Bias,
  categories: Category[]
): string {
  return selectOutlets(lang, bias, categories)
    .map((o) => o.domain)
    .join(',');
}

export interface RssFeed {
  url: string;
  source: string;
  /**
   * Whether this feed comes from a vertical (topic-tagged) outlet.
   * Verticals don't need a category-keyword filter on their items
   * because the entire feed is already on-topic for the verticals
   * we matched. Generalist feeds DO need the keyword filter, since
   * their feed contains every topic and we only want the slice that
   * matches the user's selected categories.
   */
  isVertical: boolean;
}

/** RSS feeds belonging to the selected outlets. */
export function rssFeedsForRequest(
  lang: SearchLang,
  bias: Bias,
  categories: Category[]
): RssFeed[] {
  return selectOutlets(lang, bias, categories)
    .filter((o): o is Outlet & { rssUrl: string } => Boolean(o.rssUrl))
    .map((o) => ({
      url: o.rssUrl,
      source: o.source,
      isVertical: Boolean(o.verticals),
    }));
}

/**
 * Returns true when the article's URL belongs to one of the outlets
 * selected for this (lang, bias, categories) request. Used to
 * post-filter GNews results, whose API has no bias parameter and
 * therefore freely mixes outlets we'd otherwise exclude.
 *
 * Uses longest-suffix matching against outlet domains so subdomains
 * not in the catalog (e.g. m.uol.com.br) inherit the bucket of their
 * registered parent (uol.com.br).
 */
export function isArticleAllowed(
  url: string,
  lang: SearchLang,
  bias: Bias,
  categories: Category[]
): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return false;
  }
  const allowed = new Set(
    selectOutlets(lang, bias, categories).map((o) => o.domain.toLowerCase())
  );
  let candidate = host;
  while (candidate) {
    if (allowed.has(candidate)) return true;
    const i = candidate.indexOf('.');
    if (i === -1) return false;
    candidate = candidate.slice(i + 1);
  }
  return false;
}
