import { z } from 'zod';
import {
  announcerProfilePrompt,
  type AnnouncerEditorialProfile,
} from '@/lib/announcers/profile';
import type { VoiceLinkDraftInput } from '@/lib/integration/contracts';
import { resolveProvider } from './provider';

export interface VerifiedTrackFact {
  text: string;
  sources: Array<{ title: string; url: string }>;
}

const VoiceLinkResponse = z.object({
  texto: z.string().trim().min(1).max(1_000),
});

function languageName(language: VoiceLinkDraftInput['language']): string {
  if (language === 'pt') return 'Brazilian Portuguese';
  if (language === 'es') return 'Latin American Spanish';
  return 'English';
}

function toneInstruction(tone: VoiceLinkDraftInput['tone']): string {
  if (tone === 'energetic') return 'energetic and concise';
  if (tone === 'warm') return 'warm, friendly, and natural';
  if (tone === 'institutional') return 'polished and restrained';
  return 'natural, conversational, and concise';
}

function requiredPhrases(customInstruction?: string): string[] {
  if (!customInstruction) return [];
  return [...new Set(customInstruction
    .split(/[\r\n;]+/u)
    .map((line) => line.match(
      /\b(?:mandatory phrase|frase obrigat[oó]ria|frase obligatoria)\s*:\s*(.+)$/iu,
    )?.[1] ?? '')
    .map((phrase) => {
      const trimmed = phrase.trim();
      return trimmed.match(/^["“”]([^"“”]{2,160})["“”]/u)?.[1]?.trim() ?? trimmed;
    })
    .filter((phrase) => phrase.length >= 2 && phrase.length <= 160))];
}

function asSentence(text: string): string {
  return /[.!?]$/u.test(text) ? text : `${text}.`;
}

function instructionRequestsPhraseFirst(customInstruction?: string): boolean {
  return Boolean(
    customInstruction?.match(
      /\b(?:start|begin|comece|inicie|empiece|comience)\b[\s\S]{0,80}\b(?:slogan|eslogan)\b/iu,
    ),
  );
}

function spokenTrack(
  track: VoiceLinkDraftInput['currentTrack'],
  language: VoiceLinkDraftInput['language'],
  next = false,
): string {
  const title = asSentence(track.title);
  if (!track.artist) {
    if (!next) return title;
    if (language === 'en') return `Next, ${title}`;
    if (language === 'es') return `A continuación, ${title}`;
    return `A seguir, ${title}`;
  }
  if (!next) {
    return language === 'en'
      ? `${track.title} by ${track.artist}.`
      : `${track.title}, de ${track.artist}.`;
  }
  if (language === 'en') return `Next, ${track.title} by ${track.artist}.`;
  if (language === 'es') return `A continuación, ${track.title}, de ${track.artist}.`;
  return `A seguir, ${track.title}, de ${track.artist}.`;
}

function promptTrack(track: VoiceLinkDraftInput['currentTrack']): string {
  return track.artist
    ? `${track.artist} — ${track.title}`
    : `${track.title} (artist not provided; mention only the song title)`;
}

function compactFallbackScripts(
  input: VoiceLinkDraftInput,
  phrases: string[],
  verifiedFact?: VerifiedTrackFact | null,
): string[] {
  const nextTrack = input.nextTracks[0];
  if (!nextTrack) throw new Error('voice_link_draft_empty');

  const currentWithArtist = spokenTrack(input.currentTrack, input.language);
  const nextWithArtist = spokenTrack(nextTrack, input.language, true);
  const currentTitle = asSentence(input.currentTrack.title);
  const nextTitle =
    input.language === 'en'
      ? `Next, ${asSentence(nextTrack.title)}`
      : input.language === 'es'
        ? `A continuación, ${asSentence(nextTrack.title)}`
        : `A seguir, ${asSentence(nextTrack.title)}`;
  const phrase = phrases[0] ? asSentence(phrases[0]) : null;
  const fact = verifiedFact?.text?.trim() ? asSentence(verifiedFact.text.trim()) : null;

  if (phrases[0] && instructionRequestsPhraseFirst(input.customInstruction)) {
    if (fact) {
      return [
        `${phrase} ${currentWithArtist} ${fact} ${nextWithArtist}`,
        `${phrase} ${currentTitle} ${fact} ${nextTitle}`,
      ];
    }
    return [
      `${phrase} ${currentWithArtist} ${nextWithArtist}`,
      `${phrase} ${currentTitle} ${nextTitle}`,
    ];
  }

  if (phrase && fact) {
    return [
      `${currentWithArtist} ${fact} ${phrase} ${nextWithArtist}`,
      `${currentTitle} ${fact} ${phrase} ${nextTitle}`,
    ];
  }

  if (phrase) {
    return [
      `${currentWithArtist} ${phrase} ${nextWithArtist}`,
      `${currentTitle} ${phrase} ${nextTitle}`,
    ];
  }

  if (fact) {
    return [
      `${currentWithArtist} ${fact} ${nextWithArtist}`,
      `${currentTitle} ${fact} ${nextTitle}`,
    ];
  }

  return [
    `${currentWithArtist} ${nextWithArtist}`,
    `${currentTitle} ${nextTitle}`,
  ];
}

function normalizedWords(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function ngrams(words: string[], size: number): Set<string> {
  const result = new Set<string>();
  for (let index = 0; index + size <= words.length; index += 1) {
    result.add(words.slice(index, index + size).join(' '));
  }
  return result;
}

export function voiceLinkRepetitionScore(
  script: string,
  recentScripts: string[]
): number {
  const words = normalizedWords(script);
  if (!words.length || !recentScripts.length) return 0;
  const normalized = words.join(' ');
  const phrases = ngrams(words, 4);
  return recentScripts.reduce((highest, recent) => {
    const recentWords = normalizedWords(recent);
    if (!recentWords.length) return highest;
    if (normalized === recentWords.join(' ')) return 1;
    const recentPhrases = ngrams(recentWords, 4);
    const sharedPhrases = [...phrases]
      .filter((phrase) => recentPhrases.has(phrase)).length;
    const phraseScore = Math.min(
      0.99,
      sharedPhrases / Math.max(1, Math.min(phrases.size, recentPhrases.size))
    );
    const openingMatch = words.slice(0, 5).join(' ') ===
      recentWords.slice(0, 5).join(' ') ? 0.95 : 0;
    return Math.max(highest, phraseScore, openingMatch);
  }, 0);
}

function pickLeastRepeatedScript(
  candidates: string[],
  recentScripts: string[]
): string {
  const valid = candidates.map((script) => script.trim()).filter(Boolean);
  const chosen = valid.sort((left, right) =>
    voiceLinkRepetitionScore(left, recentScripts) -
      voiceLinkRepetitionScore(right, recentScripts) || left.length - right.length
  )[0];
  if (!chosen) throw new Error('voice_link_draft_empty');
  return chosen;
}

export async function generateVoiceLinkDraft(
  input: VoiceLinkDraftInput,
  verifiedFact?: VerifiedTrackFact | null,
  announcerProfile?: AnnouncerEditorialProfile | null,
  trace?: { requestId?: string },
): Promise<string> {
  const nextTrack = input.nextTracks[0];
  if (!nextTrack) {
    throw new Error('voice_link_draft_empty');
  }

  const phrases = requiredPhrases(input.customInstruction);
  const phrasesBullet = phrases.length
    ? `- Must include these exact mandatory phrases verbatim: ${phrases.map((phrase) => `"${phrase}"`).join(', ')}`
    : '';

  const factInstruction = verifiedFact?.text
    ? `- VERIFIED SONG FACT: "${verifiedFact.text}". Integrate this fact naturally in 1 short sentence.`
    : '';

  const recentScriptsInstruction = input.recentScripts.length
    ? `Recent links from this station are a hard anti-repetition constraint. Do not reuse their opening, sentence skeleton, catchphrase, slogan, sign-off, laugh/reaction pattern, or any distinctive four-word phrase:\n${input.recentScripts
        .slice(-10)
        .map((script) => `- ${JSON.stringify(script)}`)
        .join('\n')}`
    : '';

  const prompt = `Write a short radio announcer voice link in ${languageName(input.language)}.
Tone: ${toneInstruction(input.tone)}.
Current track just played: ${promptTrack(input.currentTrack)}
Next track to play: ${promptTrack(nextTrack)}
${factInstruction}
${phrasesBullet}
${input.customInstruction ? `- Additional instruction: ${input.customInstruction}` : ''}
${recentScriptsInstruction}

CRITICAL RULES:
- Output JSON format: { "texto": "..." }
- Maximum duration is ${input.maxDurationSeconds} seconds (~${input.maxDurationSeconds * 2.5} words max).
- Keep it concise, natural, and direct.`;

  try {
    const provider = resolveProvider();
    const systemPrompt = [
      'You are a professional radio announcer and editorial writer.',
      announcerProfilePrompt(announcerProfile),
      'Always respond strictly in valid JSON format: { "texto": "..." }',
    ].join('\n\n');
    const firstText = await provider.complete({
      systemPrompt,
      userPrompt: prompt,
      temperature: 0.7,
    });
    const first = VoiceLinkResponse.parse(JSON.parse(firstText)).texto;
    const firstScore = voiceLinkRepetitionScore(first, input.recentScripts);
    if (firstScore < 0.5) {
      console.info('[llm] voice link editorial result', {
        requestId: trace?.requestId ?? null,
        provider: provider.id,
        recentCount: input.recentScripts.length,
        repetitionScore: Number(firstScore.toFixed(3)),
        diversificationRetry: false,
        fallbackScript: false,
      });
      return first;
    }

    const retryText = await provider.complete({
      systemPrompt,
      userPrompt: `${prompt}\n\nThe first draft was rejected because it repeated a recent station link (score ${firstScore.toFixed(2)}). Write a genuinely different link: new opening, new sentence architecture, and no reused catchphrase or four-word phrase.`,
      temperature: 0.85,
    });
    const retry = VoiceLinkResponse.parse(JSON.parse(retryText)).texto;
    const retryScore = voiceLinkRepetitionScore(retry, input.recentScripts);
    const chosen = retryScore <= firstScore ? retry : first;
    console.info('[llm] voice link editorial result', {
      requestId: trace?.requestId ?? null,
      provider: provider.id,
      recentCount: input.recentScripts.length,
      repetitionScore: Number(Math.min(firstScore, retryScore).toFixed(3)),
      diversificationRetry: true,
      fallbackScript: false,
    });
    return chosen;
  } catch (error) {
    console.warn(
      '[llm] voice link draft generation failed, using fallback script',
      error instanceof Error ? error.message : error,
    );
    const candidates = compactFallbackScripts(input, phrases, verifiedFact);
    const script = pickLeastRepeatedScript(candidates, input.recentScripts);
    console.info('[llm] voice link editorial result', {
      requestId: trace?.requestId ?? null,
      provider: null,
      recentCount: input.recentScripts.length,
      repetitionScore: Number(
        voiceLinkRepetitionScore(script, input.recentScripts).toFixed(3)
      ),
      diversificationRetry: false,
      fallbackScript: true,
    });
    return script;
  }
}
