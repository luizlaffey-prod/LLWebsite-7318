import { z } from 'zod';
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
  const quoted = Array.from(
    customInstruction.matchAll(/["“”]([^"“”]{2,160})["“”]/gu),
    (match) => match[1]?.trim() ?? '',
  ).filter(Boolean);
  const labeled = customInstruction
    .split(/[\r\n;]+/u)
    .map((line) => line.match(/\b(?:slogan|eslogan)\s*:\s*(.+)$/iu)?.[1] ?? '')
    .map((phrase) => {
      const trimmed = phrase.trim();
      return trimmed.match(/^["“”]([^"“”]{2,160})["“”]/u)?.[1]?.trim() ??
        trimmed;
    })
    .filter((phrase) => phrase.length >= 2 && phrase.length <= 160);
  return [...new Set([...quoted, ...labeled])];
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

function pickShortestScript(candidates: string[]): string {
  const valid = candidates
    .map((script) => script.trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
  const chosen = valid[0];
  if (!chosen) throw new Error('voice_link_draft_empty');
  return chosen;
}

export async function generateVoiceLinkDraft(
  input: VoiceLinkDraftInput,
  verifiedFact?: VerifiedTrackFact | null,
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

  const prompt = `Write a short radio announcer voice link in ${languageName(input.language)}.
Tone: ${toneInstruction(input.tone)}.
Current track just played: ${promptTrack(input.currentTrack)}
Next track to play: ${promptTrack(nextTrack)}
${factInstruction}
${phrasesBullet}
${input.customInstruction ? `- Additional instruction: ${input.customInstruction}` : ''}

CRITICAL RULES:
- Output JSON format: { "texto": "..." }
- Maximum duration is ${input.maxDurationSeconds} seconds (~${input.maxDurationSeconds * 2.5} words max).
- Keep it concise, natural, and direct.`;

  try {
    const provider = resolveProvider();
    const resultText = await provider.complete({
      systemPrompt: 'You are a professional radio announcer. Always respond strictly in valid JSON format: { "texto": "..." }',
      userPrompt: prompt,
      temperature: 0.7,
    });
    const parsed = VoiceLinkResponse.parse(JSON.parse(resultText));
    return parsed.texto;
  } catch (error) {
    console.warn(
      '[llm] voice link draft generation failed, using fallback script',
      error instanceof Error ? error.message : error,
    );
    const candidates = compactFallbackScripts(input, phrases, verifiedFact);
    return pickShortestScript(candidates);
  }
}
