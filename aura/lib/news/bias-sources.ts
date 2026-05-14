/**
 * Mapping of political/editorial bias to NewsAPI source IDs.
 * Seeded from the AURA prototype + AllSides classifications.
 */
export type Bias = 'left' | 'center' | 'right';

export const NEWSAPI_SOURCES_BY_BIAS: Record<Bias, string[]> = {
  left: [
    'bbc-news',
    'cnn',
    'msnbc',
    'the-guardian-uk',
    'national-public-radio',
    'el-pais',
    'folha-de-s-paulo',
  ],
  center: [
    'reuters',
    'associated-press',
    'bbc-news',
    'the-economist',
    'financial-times',
    'estadao',
    'o-globo',
  ],
  right: [
    'fox-news',
    'the-wall-street-journal',
    'the-national-review',
    'breitbart-news',
    'o-estado-de-s-paulo',
    'veja',
  ],
};

export function newsapiSourcesParam(bias: Bias): string {
  return NEWSAPI_SOURCES_BY_BIAS[bias].join(',');
}
