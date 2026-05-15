import { z } from 'zod';
import type { Emotion } from '@/lib/audio/emotions';
import type { ScriptBlock, ScriptGenerationInput } from './types';
import { resolveProvider } from './provider';

export type { ScriptBlock, ScriptGenerationInput } from './types';

const ScriptResponse = z.object({
  blocos: z
    .array(
      z.object({
        texto: z.string().min(1),
        emocao: z.enum(['ENTHUSIASM', 'SERIOUSNESS', 'CONCERN', 'NEUTRAL', 'DRAMATIC']),
        duracao_segundos: z.number().min(1).max(20),
      })
    )
    .min(1),
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
    'You are a radio newsroom writer. Output ONLY valid JSON, no Markdown, no commentary.',
    'Write radio bulletins that sound natural when read aloud: short sentences, conversational rhythm, active voice, no headers.',
    'Each block is 5–10 seconds when spoken at normal pace (~12–18 words). Use emotion tags to coach the voice: ENTHUSIASM for openings/positive, SERIOUSNESS for hard news, CONCERN for risks/warnings, NEUTRAL for facts/transitions, DRAMATIC for sparingly used emphasis.',
    'When weather is provided with format=integrated, weave it into the last 1–2 blocks naturally. When format=separate, add it as the closing block(s).',
  ].join(' ');
}

function buildUserPrompt(
  input: ScriptGenerationInput,
  correction?: { previousTotal: number }
): string {
  const langDisplay = languageName(input.language);
  const weatherLine = input.weather
    ? `\n\nWeather (location=${input.weather.location}, format=${input.weather.format}): ${input.weather.summary}`
    : '';
  const correctionLine = correction
    ? `\n\nThe previous attempt totaled ${correction.previousTotal} seconds. Adjust block text so the new total lands within ±2 seconds of ${input.targetDurationSeconds}.`
    : '';

  return [
    `Write a radio news bulletin in ${langDisplay}.`,
    `Exact total duration target: ${input.targetDurationSeconds} seconds (±2s tolerance).`,
    `Source material:\n${input.newsContent}${weatherLine}`,
    correctionLine,
    '',
    'Return JSON only, with this exact shape:',
    `{ "blocos": [{ "texto": "...", "emocao": "ENTHUSIASM|SERIOUSNESS|CONCERN|NEUTRAL|DRAMATIC", "duracao_segundos": <int 5-10> }] }`,
  ].join('\n');
}

function totalDuration(blocks: { duracaoSegundos: number }[]): number {
  return blocks.reduce((acc, b) => acc + b.duracaoSegundos, 0);
}

function parseResponse(text: string): ScriptBlock[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  }
  const parsed = ScriptResponse.parse(JSON.parse(cleaned));
  return parsed.blocos.map((b) => ({
    text: b.texto,
    emotion: b.emocao as Emotion,
    duracaoSegundos: b.duracao_segundos,
  }));
}

/**
 * Generates an emotional radio script through whichever LLM is configured,
 * with a self-correcting duration loop (up to 2 attempts).
 */
export async function generateScript(
  input: ScriptGenerationInput
): Promise<ScriptBlock[]> {
  const provider = resolveProvider();
  const systemPrompt = buildSystemPrompt();

  let blocks: ScriptBlock[] | null = null;
  let correction: { previousTotal: number } | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt = buildUserPrompt(input, correction);
    const text = await provider.complete({ systemPrompt, userPrompt });
    blocks = parseResponse(text);

    const total = totalDuration(blocks);
    if (Math.abs(total - input.targetDurationSeconds) <= 2) return blocks;
    correction = { previousTotal: total };
  }

  if (!blocks) throw new Error('script generation produced no output');
  return blocks;
}
