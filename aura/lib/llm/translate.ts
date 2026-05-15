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

/** Strips Markdown fences and grabs the first balanced top-level JSON object. */
function extractJsonObject(raw: string): string | null {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const first = s.indexOf('{');
  if (first < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = first; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(first, i + 1);
    }
  }
  return null;
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

  let provider;
  try {
    provider = resolveProvider();
  } catch (err) {
    console.warn('[translate] no LLM provider available, returning originals', err);
    return articles;
  }
  const langName = languageName(targetLang);

  const systemPrompt =
    'You are a professional news translator. Output ONLY valid JSON, no Markdown fences, no prose. Start your reply with `{`. Preserve named entities (people, places, brands) faithfully. Keep tone neutral and journalistic.';

  const userPrompt = [
    `Translate the following ${toTranslate.length} news items into ${langName}.`,
    'Return JSON with this exact shape (and nothing else):',
    '{ "items": [{ "title": "...", "description": "..." }] }',
    'Items MUST be returned in the same order as the input.',
    '',
    'Input:',
    JSON.stringify(
      toTranslate.map((t) => ({ title: t.title, description: t.description }))
    ),
  ].join('\n');

  let text = '';
  let parsed: z.infer<typeof TranslateResponse>;
  try {
    text = await provider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.2,
    });
    const json = extractJsonObject(text);
    if (!json) throw new Error('no_json_object_in_response');
    parsed = TranslateResponse.parse(JSON.parse(json));
  } catch (err) {
    console.warn(
      '[translate] LLM translation failed, returning originals.',
      'err=',
      err,
      'preview=',
      text.slice(0, 400)
    );
    return articles;
  }

  if (parsed.items.length !== toTranslate.length) {
    console.warn(
      '[translate] item count mismatch, returning originals.',
      'got=',
      parsed.items.length,
      'expected=',
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
  console.log(
    `[translate] translated ${toTranslate.length} articles into ${targetLang}`
  );
  return result;
}
