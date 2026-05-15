import { z } from 'zod';
import { resolveProvider } from './provider';

type TargetLang = 'en' | 'pt' | 'es';

function languageName(lang: TargetLang): string {
  return lang === 'pt'
    ? 'Portuguese (Brazil)'
    : lang === 'es'
      ? 'Latin American Spanish'
      : 'English';
}

const TranslateResponse = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

export interface TranslatableArticle {
  title: string;
  description: string;
  originalLanguage: string;
}

/**
 * Translates titles and descriptions in a single batched LLM call. Articles
 * already in `targetLang` are passed through untouched. Order is preserved.
 */
export async function translateArticles<T extends TranslatableArticle>(
  articles: T[],
  targetLang: TargetLang
): Promise<T[]> {
  const toTranslate: { idx: number; title: string; description: string }[] = [];
  articles.forEach((a, idx) => {
    if (a.originalLanguage !== targetLang) {
      toTranslate.push({ idx, title: a.title, description: a.description });
    }
  });
  if (toTranslate.length === 0) return articles;

  const provider = resolveProvider();
  const langName = languageName(targetLang);

  const systemPrompt =
    'You are a professional news translator. Output ONLY valid JSON, no Markdown, no commentary. Preserve named entities (people, places, brands) faithfully. Keep tone neutral and journalistic.';

  const userPrompt = [
    `Translate the following news items into ${langName}.`,
    'Return JSON with this exact shape:',
    '{ "items": [{ "title": "...", "description": "..." }] }',
    `Items must be returned in the same order as the input. There are ${toTranslate.length} items.`,
    '',
    'Input:',
    JSON.stringify(
      toTranslate.map((t) => ({ title: t.title, description: t.description })),
      null,
      2
    ),
  ].join('\n');

  let parsed: z.infer<typeof TranslateResponse>;
  try {
    const text = await provider.complete({ systemPrompt, userPrompt });
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    }
    parsed = TranslateResponse.parse(JSON.parse(cleaned));
  } catch (err) {
    console.warn('[translate] LLM translation failed, returning originals', err);
    return articles;
  }

  if (parsed.items.length !== toTranslate.length) {
    console.warn(
      '[translate] item count mismatch',
      parsed.items.length,
      'vs',
      toTranslate.length
    );
    return articles;
  }

  const result = articles.slice();
  toTranslate.forEach((t, i) => {
    const tr = parsed.items[i];
    result[t.idx] = {
      ...result[t.idx],
      title: tr.title || result[t.idx].title,
      description: tr.description || result[t.idx].description,
    };
  });
  return result;
}
