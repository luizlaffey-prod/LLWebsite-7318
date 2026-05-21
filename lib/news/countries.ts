/**
 * Country resolution backed by the Node runtime's ICU country
 * database. Replaces the previous hand-maintained allowlist of ~25
 * country names — any of the ~250 ISO 3166-1 alpha-2 countries can
 * now be matched in EN, PT, ES, FR or DE, plus a small set of
 * everyday aliases ("EUA", "Reino Unido", "Holanda").
 *
 * When the user types something that isn't a country (a city, a
 * state, a region), `resolveLocation` returns `isCountry: false`
 * with the raw string preserved so the aggregator can drop it into
 * the search query as a keyword — best-effort scoping without a
 * country-level filter.
 */

// Full ISO 3166-1 alpha-2 catalog. Used to enumerate every code
// when reverse-indexing names produced by Intl.DisplayNames.
const ISO_CODES = [
  'ad','ae','af','ag','ai','al','am','ao','aq','ar','as','at','au','aw','ax','az',
  'ba','bb','bd','be','bf','bg','bh','bi','bj','bl','bm','bn','bo','bq','br','bs','bt','bv','bw','by','bz',
  'ca','cc','cd','cf','cg','ch','ci','ck','cl','cm','cn','co','cr','cu','cv','cw','cx','cy','cz',
  'de','dj','dk','dm','do','dz',
  'ec','ee','eg','eh','er','es','et',
  'fi','fj','fk','fm','fo','fr',
  'ga','gb','gd','ge','gf','gg','gh','gi','gl','gm','gn','gp','gq','gr','gs','gt','gu','gw','gy',
  'hk','hm','hn','hr','ht','hu',
  'id','ie','il','im','in','io','iq','ir','is','it',
  'je','jm','jo','jp',
  'ke','kg','kh','ki','km','kn','kp','kr','kw','ky','kz',
  'la','lb','lc','li','lk','lr','ls','lt','lu','lv','ly',
  'ma','mc','md','me','mf','mg','mh','mk','ml','mm','mn','mo','mp','mq','mr','ms','mt','mu','mv','mw','mx','my','mz',
  'na','nc','ne','nf','ng','ni','nl','no','np','nr','nu','nz',
  'om',
  'pa','pe','pf','pg','ph','pk','pl','pm','pn','pr','ps','pt','pw','py',
  'qa',
  're','ro','rs','ru','rw',
  'sa','sb','sc','sd','se','sg','sh','si','sj','sk','sl','sm','sn','so','sr','ss','st','sv','sx','sy','sz',
  'tc','td','tf','tg','th','tj','tk','tl','tm','tn','to','tr','tt','tv','tw','tz',
  'ua','ug','um','us','uy','uz',
  'va','vc','ve','vg','vi','vn','vu',
  'wf','ws',
  'ye','yt',
  'za','zm','zw',
];

// Press-language buckets we have outlet coverage for. Anything not
// in pt/es falls back to en — the EN bias bucket has the broadest
// generalist catalog and international wires usually carry the
// country's news in English.
const PT_PRESS_COUNTRIES = new Set([
  'pt', 'br', 'ao', 'mz', 'cv', 'gw', 'st', 'tl',
]);
const ES_PRESS_COUNTRIES = new Set([
  'ar','bo','cl','co','cr','cu','do','ec','es','gq','gt','hn',
  'mx','ni','pa','pe','pr','py','sv','uy','ve',
]);

// Everyday aliases not present in Intl.DisplayNames (or where the
// official name diverges from what people type).
const ALIASES: Record<string, string> = {
  usa: 'us',
  eua: 'us',
  'estados unidos': 'us',
  'reino unido': 'gb',
  uk: 'gb',
  inglaterra: 'gb',
  holanda: 'nl',
  'paises baixos': 'nl',
  russia: 'ru',
  'russian federation': 'ru',
  iran: 'ir',
  turquia: 'tr',
  taiwan: 'tw',
  'coreia do sul': 'kr',
  'south korea': 'kr',
  'coreia do norte': 'kp',
  'north korea': 'kp',
  vietnam: 'vn',
  vietna: 'vn',
  'são tomé': 'st',
  'sao tome': 'st',
};

let _index: Map<string, string> | null = null;

function buildIndex(): Map<string, string> {
  const m = new Map<string, string>();
  for (const locale of ['en', 'pt', 'es', 'fr', 'de'] as const) {
    let dn: Intl.DisplayNames;
    try {
      dn = new Intl.DisplayNames([locale], {
        type: 'region',
        fallback: 'none',
      });
    } catch {
      continue;
    }
    for (const code of ISO_CODES) {
      try {
        const name = dn.of(code.toUpperCase());
        if (!name) continue;
        const norm = normalize(name);
        // First locale to claim a name wins. EN goes first so the
        // canonical English name dominates; PT/ES extend coverage
        // for names that differ across languages.
        if (!m.has(norm)) m.set(norm, code);
      } catch {
        // Some locales/runtimes raise on territory-only codes
        // (e.g. AQ, BV). Skip silently.
      }
    }
  }
  for (const [alias, code] of Object.entries(ALIASES)) {
    m.set(normalize(alias), code);
  }
  return m;
}

function getIndex(): Map<string, string> {
  if (!_index) _index = buildIndex();
  return _index;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ResolvedLocation {
  /** ISO 3166-1 alpha-2 lowercase. Undefined when input wasn't a country. */
  countryCode?: string;
  /** Best press-language bucket for this country (en/pt/es only). */
  pressLang?: 'en' | 'pt' | 'es';
  /** Whatever the user typed, trimmed. Used as a search keyword
   * when isCountry=false (city, state, region, free-form). */
  rawLocation: string;
  isCountry: boolean;
}

export function resolveLocation(
  input: string | undefined
): ResolvedLocation {
  const raw = (input ?? '').trim();
  if (!raw) return { rawLocation: '', isCountry: false };
  const norm = normalize(raw);
  const code = getIndex().get(norm);
  if (!code) {
    return { rawLocation: raw, isCountry: false };
  }
  return {
    countryCode: code,
    pressLang: pressLangFor(code),
    rawLocation: raw,
    isCountry: true,
  };
}

function pressLangFor(code: string): 'en' | 'pt' | 'es' {
  if (PT_PRESS_COUNTRIES.has(code)) return 'pt';
  if (ES_PRESS_COUNTRIES.has(code)) return 'es';
  return 'en';
}
