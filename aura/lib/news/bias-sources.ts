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
 * Bias classifications follow AllSides / Adfontes where they publish a
 * rating, and pragmatic Brazilian / Hispanic press convention
 * otherwise.
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
      'cartacapital.com.br',
      'brasil247.com',
      'redebrasilatual.com.br',
    ],
    center: [
      'g1.globo.com',
      'oglobo.globo.com',
      'uol.com.br',
      'bbc.com',
      'r7.com',
    ],
    right: [
      'estadao.com.br',
      'veja.abril.com.br',
      'gazetadopovo.com.br',
      'jovempan.com.br',
      'oantagonista.com.br',
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
      'elmundo.es',
      'clarin.com',
      'infobae.com',
      'bbc.com',
    ],
    right: [
      'abc.es',
      'larazon.es',
      'lanacion.com.ar',
      'eluniverso.com',
      'eltiempo.com',
    ],
  },
};

export function newsapiDomainsParam(lang: SearchLang, bias: Bias): string {
  return NEWSAPI_DOMAINS[lang][bias].join(',');
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
      { url: 'https://www.cartacapital.com.br/feed/', source: 'CartaCapital' },
    ],
    center: [
      { url: 'https://g1.globo.com/rss/g1/', source: 'G1' },
      { url: 'https://www.bbc.com/portuguese/index.xml', source: 'BBC Brasil' },
      { url: 'https://rss.uol.com.br/feed/noticias.xml', source: 'UOL' },
    ],
    right: [
      { url: 'https://www.estadao.com.br/rss/ultimas.xml', source: 'Estadão' },
      { url: 'https://veja.abril.com.br/feed', source: 'Veja' },
      { url: 'https://www.gazetadopovo.com.br/feed/', source: 'Gazeta do Povo' },
    ],
  },
  es: {
    left: [
      { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', source: 'El País' },
      { url: 'https://www.eldiario.es/rss/', source: 'elDiario.es' },
    ],
    center: [
      { url: 'https://www.bbc.com/mundo/index.xml', source: 'BBC Mundo' },
      { url: 'https://www.clarin.com/rss/lo-ultimo/', source: 'Clarín' },
      { url: 'https://www.infobae.com/feeds/rss/', source: 'Infobae' },
    ],
    right: [
      { url: 'https://www.abc.es/rss/feeds/abcPortada.xml', source: 'ABC' },
      { url: 'https://www.larazon.es/rss/portada.xml', source: 'La Razón' },
      { url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml', source: 'La Nación' },
    ],
  },
};
