import { z } from 'zod';
import type { ArticleBlock } from '@/lib/db/schema';
import { resolveProvider } from './provider';

/**
 * Long-form journalistic article generator. Shares the LLM provider
 * abstraction with the radio script generator but produces a written
 * article for publication on the station's website — headline, a
 * one-line standfirst (lede), and a structured body of paragraphs and
 * optional sub-headings — rather than a spoken 30-second bulletin.
 *
 * Editorial guardrails live in the system prompt: rewrite in the
 * outlet's own words (never copy source text), attribute claims,
 * neutral factual tone, and a closing attribution line. The generated
 * article is always a DRAFT — a human approves before it publishes.
 */

export interface ArticleGenerationInput {
  /** Source material: headline + description of the lead story, plus a
   * few supporting stories, exactly as assembled from the aggregator. */
  sourceContent: string;
  /** Primary source outlet name, for the attribution line. */
  sourceName?: string;
  /** Primary source URL, cited at the end. */
  sourceUrl?: string;
  language: 'en' | 'pt' | 'es';
  /** Target article length in words (the model aims for ±15%). */
  targetWords: number;
  /** Topic tags the article should stay on. */
  categories: string[];
  /** Today's date rendered in the station timezone, so temporal
   * references ("today", "this week") are accurate. */
  today?: { iso: string; readable: string };
}

export interface GeneratedArticle {
  title: string;
  lede: string;
  body: ArticleBlock[];
  wordCount: number;
}

const BlockSchema = z.object({
  type: z.enum(['heading', 'paragraph']),
  text: z.string().min(1),
});

const ArticleResponse = z.object({
  titulo: z.string().min(1).max(200),
  linha_fina: z.string().min(1).max(300),
  corpo: z.array(BlockSchema).min(2),
});

function languageName(lang: 'en' | 'pt' | 'es'): string {
  return lang === 'pt'
    ? 'Portuguese (Brazil)'
    : lang === 'es'
      ? 'Latin American Spanish'
      : 'English';
}

function buildSystemPrompt(): string {
  return [
    'You are a newsroom staff writer producing a publication-ready web article for a radio station\'s website. Output ONLY valid JSON, no Markdown, no commentary.',
    'Write clear, accurate journalism for READING (not for the ear): an informative headline, a one-sentence standfirst (dek) that summarizes the story, and a structured body of short paragraphs. Use sub-headings only when the article genuinely has distinct sections.',
    'CRITICAL — sourcing and originality: REWRITE everything in your own words. Never copy sentences from the source material. Attribute factual claims ("according to <source>", "<source> reported"). Do not invent quotes, statistics, names, or events that are not in the source material. If the source is thin, write a shorter, accurate article rather than padding with speculation.',
    'Tone: neutral, factual, professional. No opinion, no editorializing, no marketing language, no clickbait. Do not open with "In today\'s news" or a dateline greeting — open with the substance of the story.',
    'Stay strictly on the requested topic(s). Discard any source item that is clearly off-topic.',
    'Length: aim for the requested word count (±15%). Favor accuracy and clarity over hitting the number exactly.',
    'End the body with a final paragraph that credits the primary source by name (and note it links to the original) — this is the attribution line, phrased naturally in the article\'s language.',
  ].join(' ');
}

function buildUserPrompt(input: ArticleGenerationInput): string {
  const langDisplay = languageName(input.language);
  const todayLine = input.today
    ? `\nToday is ${input.today.readable} (${input.today.iso}). Use this as the current date; never invent a different one.`
    : '';
  const cats = input.categories.length
    ? `\nThis article must be about: ${input.categories.join(', ')}. Discard off-topic source items.`
    : '';
  const attribution = input.sourceName
    ? `\nPrimary source to credit: ${input.sourceName}${input.sourceUrl ? ` (${input.sourceUrl})` : ''}.`
    : '';

  return [
    `Write a web news article in ${langDisplay}.${todayLine}${cats}${attribution}`,
    `Target length: about ${input.targetWords} words.`,
    `Source material:\n${input.sourceContent}`,
    '',
    'Return JSON only, with this exact shape:',
    '{ "titulo": "<headline>", "linha_fina": "<one-sentence standfirst>", "corpo": [{ "type": "paragraph"|"heading", "text": "..." }] }',
  ].join('\n');
}

function parseResponse(text: string): GeneratedArticle {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  }
  const parsed = ArticleResponse.parse(JSON.parse(cleaned));
  const body: ArticleBlock[] = parsed.corpo.map((b) => ({
    type: b.type,
    text: b.text,
  }));
  const wordCount = countWords(parsed.titulo, parsed.linha_fina, body);
  return {
    title: parsed.titulo,
    lede: parsed.linha_fina,
    body,
    wordCount,
  };
}

function countWords(title: string, lede: string, body: ArticleBlock[]): number {
  const all = [title, lede, ...body.map((b) => b.text)].join(' ');
  const words = all.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Generates a written article via the configured LLM. A single call —
 * unlike the radio script's duration loop, article length is a soft
 * target so one pass is enough. Throws if the model returns nothing
 * parseable.
 */
export async function generateArticle(
  input: ArticleGenerationInput
): Promise<GeneratedArticle> {
  const provider = resolveProvider();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const text = await provider.complete({
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });
  return parseResponse(text);
}
