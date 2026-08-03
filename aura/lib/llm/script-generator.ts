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
        // Optional topic tag. Free-form short slug ("politics",
        // "tech", "weather", "sports", etc.). The audio pipeline uses
        // it to insert a transition sting between consecutive blocks
        // whose categoria changes.
        categoria: z.string().min(1).max(40).optional(),
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
    'Never use time-of-day greetings or sign-offs ("good morning", "good evening", "bom dia", "boa noite", "buenos días", "buenas noches", etc.). Bulletins are generated once and may be played at any local time, so a fixed greeting will be wrong for most listeners. Also never use generic opener phrases ("Nas notícias de hoje", "In today\'s headlines", "En los titulares de hoy", "Veja a seguir", "Here are the headlines", etc.) — open DIRECTLY with the first piece of news, no preamble. The voice should land mid-broadcast feel, not introduction feel.',
    'Weather handling is STRICT and depends on the format flag. format=integrated: weather facts MUST appear inside the SAME blocks as news stories — pick the last 1–2 news blocks and rewrite them so the weather is mentioned in the same sentence as the story (e.g. "...while the Senate vote continues, drivers in São Paulo should expect light rain through the evening, 18 degrees."). Do NOT produce any block that is only about weather under format=integrated. format=separate: produce one or two dedicated trailing blocks AFTER the final news block — these blocks talk ONLY about weather, must not mention any news topic, must open with a clear transition ("Now, the weather.", "Agora, a previsão.", "Y ahora, el clima."), and must be the last items in the array. The format flag is the ground truth — never default to separate when integrated was requested.',
    'Weather-only bulletins: when source material has no news section (only the weather summary), produce a short weather-only script — open directly with the conditions, do not invent news, do not greet. 2–4 blocks total is plenty.',
    'On-topic discipline: when source material declares a category at the top ("All articles below should be about: economy"), treat that as a hard constraint. If a source article in the list is clearly off-topic for that category (e.g. a sports transfer story in an economy bulletin), IGNORE it. Better to write a tighter 3-block bulletin from on-topic material than to pad with off-topic stories.',
    'Tag every block with a categoria slug that uniquely identifies the specific NEWS STORY, not just the broad topic. Use the pattern "<topic>-<kebab-case-keyword>": politics-bolsonaro-trial, politics-congress-vote, health-flu-season, health-hospital-strike, weather. Two blocks belonging to the same single story share the same slug; the moment you move to a different story (even within the same topic), pick a fresh slug. The audio pipeline plays a short transition sting between consecutive blocks whose slug differs, so this granularity directly controls how clearly the listener hears the boundary between stories.',
  ].join(' ');
}

function buildUserPrompt(
  input: ScriptGenerationInput,
  correction?: { previousTotal: number }
): string {
  const langDisplay = languageName(input.language);
  const todayLine = input.today
    ? `\nToday is ${input.today.readable} (${input.today.iso}). Treat this as the current date when interpreting "today", "yesterday", "this week" in the source material. NEVER invent a different date — if a story is dated earlier, refer to it as past news, not as happening today.`
    : '';
  const weatherLine = input.weather
    ? `\n\nWeather (location=${input.weather.location}, format=${input.weather.format}): ${input.weather.summary}`
    : '';
  const correctionLine = correction
    ? `\n\nThe previous attempt totaled ${correction.previousTotal} seconds. Adjust block text so the new total lands within ±2 seconds of ${input.targetDurationSeconds}.`
    : '';

  return [
    `Write a radio news bulletin in ${langDisplay}.${todayLine}`,
    `Exact total duration target: ${input.targetDurationSeconds} seconds (±2s tolerance).`,
    `Source material:\n${input.newsContent}${weatherLine}`,
    correctionLine,
    '',
    'Return JSON only, with this exact shape:',
    `{ "blocos": [{ "texto": "...", "emocao": "ENTHUSIASM|SERIOUSNESS|CONCERN|NEUTRAL|DRAMATIC", "duracao_segundos": <int 5-10>, "categoria": "<topic slug>" }] }`,
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
    category: b.categoria,
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
    const text = await provider.complete({
      systemPrompt,
      userPrompt,
      // Gemini 2.5 counts internal reasoning inside maxOutputTokens. Reserve a
      // bounded thinking budget so a successful response still has enough
      // capacity to emit the bulletin JSON.
      maxTokens: 4_096,
      thinkingBudget: 512,
    });
    blocks = parseResponse(text);

    const total = totalDuration(blocks);
    if (Math.abs(total - input.targetDurationSeconds) <= 2) return blocks;
    correction = { previousTotal: total };
  }

  if (!blocks) throw new Error('script generation produced no output');
  return blocks;
}
