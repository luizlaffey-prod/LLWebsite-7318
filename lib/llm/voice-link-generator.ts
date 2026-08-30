import { z } from 'zod';
import {
  announcerProfilePrompt,
  type AnnouncerEditorialProfile,
} from '@/lib/announcers/profile';
import type { VoiceLinkDraftInput } from '@/lib/integration/contracts';
import { resolveProvider } from './provider';

export interface VerifiedTrackFact {
  text: string;
  alternatives?: string[];
  sources: Array<{ title: string; url: string }>;
}

const VoiceLinkResponse = z.object({
  texto: z.string().trim().min(1).max(1_000),
});

function parseVoiceLinkResponse(raw: string): string {
  const unfenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim();
  return VoiceLinkResponse.parse(JSON.parse(unfenced)).texto;
}

function normalizedIncludes(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizedWords(needle).join(' ');
  return Boolean(
    normalizedNeedle
    && normalizedWords(haystack).join(' ').includes(normalizedNeedle)
  );
}

export function matchedVerifiedFactText(
  script: string,
  verifiedFact?: VerifiedTrackFact | null,
): string | null {
  if (!verifiedFact) return null;
  const options = [verifiedFact.text, ...(verifiedFact.alternatives ?? [])]
    .map((fact) => fact.trim())
    .filter(Boolean);
  const scriptWords = new Set(normalizedWords(script));
  return options.find((fact) => {
    if (normalizedIncludes(script, fact)) return true;
    const factWords = normalizedWords(fact)
      .filter((word) => word.length >= 4);
    if (factWords.length < 4) return false;
    const shared = factWords.filter((word) => scriptWords.has(word)).length;
    return shared >= 4 && shared / factWords.length >= 0.55;
  }) ?? null;
}

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

function profileRepertoire(
  profile: AnnouncerEditorialProfile | null | undefined,
  recentScripts: string[],
): string | null {
  if (!profile?.signatures.trim()) return null;
  const recent = recentScripts.slice(-5).join(' ');
  return profile.signatures
    .split(/[\r\n;|]+/u)
    .map((phrase) => phrase.trim().replace(/^[-*•]\s*/u, ''))
    .filter((phrase) => phrase.length >= 2 && phrase.length <= 160)
    .find((phrase) => !normalizedIncludes(recent, phrase)) ?? null;
}

function announcerIdentityRequired(
  profile: AnnouncerEditorialProfile | null | undefined,
  recentScripts: string[],
): boolean {
  if (!profile?.announcerName?.trim()) return false;
  return !recentScripts
    .slice(-3)
    .some((script) => normalizedIncludes(script, profile.announcerName!));
}

function identitySentence(
  name: string,
  language: VoiceLinkDraftInput['language'],
): string {
  if (language === 'pt') return `Aqui é ${name}.`;
  if (language === 'es') return `Soy ${name}.`;
  return `I'm ${name}.`;
}

function compactFallbackScripts(
  input: VoiceLinkDraftInput,
  phrases: string[],
  verifiedFact?: VerifiedTrackFact | null,
  announcerProfile?: AnnouncerEditorialProfile | null,
  identityRequired = false,
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
  const repertoire = profileRepertoire(announcerProfile, input.recentScripts);
  const phraseText = phrases[0] ?? repertoire;
  const phrase = phraseText ? asSentence(phraseText) : null;
  const factOption = [verifiedFact?.text, ...(verifiedFact?.alternatives ?? [])]
    .map((value) => value?.trim() ?? '')
    .find(Boolean);
  const fact = factOption ? asSentence(factOption) : null;
  const identity = identityRequired && announcerProfile?.announcerName
    ? identitySentence(announcerProfile.announcerName, input.language)
    : null;
  const prefix = [identity, phrase].filter(Boolean).join(' ');
  const isAfterCommercial = input.eventPosition === 'after-commercial';

  if (isAfterCommercial) {
    return [
      [prefix, fact, nextWithArtist].filter(Boolean).join(' '),
      [identity, fact, nextTitle].filter(Boolean).join(' '),
    ];
  }

  if (phrases[0] && instructionRequestsPhraseFirst(input.customInstruction)) {
    if (fact) {
      return [
        [phrase, identity, currentWithArtist, fact, nextWithArtist].filter(Boolean).join(' '),
        [phrase, identity, currentTitle, fact, nextTitle].filter(Boolean).join(' '),
      ];
    }
    return [
      [phrase, identity, currentWithArtist, nextWithArtist].filter(Boolean).join(' '),
      [phrase, identity, currentTitle, nextTitle].filter(Boolean).join(' '),
    ];
  }

  if (phrase && fact) {
    return [
      [currentWithArtist, fact, identity, phrase, nextWithArtist].filter(Boolean).join(' '),
      [currentTitle, fact, identity, phrase, nextTitle].filter(Boolean).join(' '),
    ];
  }

  if (phrase) {
    return [
      [currentWithArtist, identity, phrase, nextWithArtist].filter(Boolean).join(' '),
      [currentTitle, identity, phrase, nextTitle].filter(Boolean).join(' '),
    ];
  }

  if (fact) {
    return [
      [currentWithArtist, fact, identity, nextWithArtist].filter(Boolean).join(' '),
      [currentTitle, fact, identity, nextTitle].filter(Boolean).join(' '),
    ];
  }

  return [
    [currentWithArtist, identity, nextWithArtist].filter(Boolean).join(' '),
    [currentTitle, identity, nextTitle].filter(Boolean).join(' '),
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

function validateVoiceLinkCandidate(
  raw: string,
  input: VoiceLinkDraftInput,
  verifiedFact: VerifiedTrackFact | null | undefined,
  announcerProfile: AnnouncerEditorialProfile | null | undefined,
  identityRequired: boolean,
  phrases: string[],
): void {
  const script = parseVoiceLinkResponse(raw);
  const nextTrack = input.nextTracks[0];
  if (!nextTrack || !normalizedIncludes(script, nextTrack.title)) {
    throw new Error('voice_link_missing_next_track');
  }
  if (
    identityRequired
    && announcerProfile?.announcerName
    && !normalizedIncludes(script, announcerProfile.announcerName)
  ) {
    throw new Error('voice_link_missing_announcer_identity');
  }
  if (verifiedFact && !matchedVerifiedFactText(script, verifiedFact)) {
    throw new Error('voice_link_missing_verified_fact');
  }
  for (const phrase of phrases) {
    if (!normalizedIncludes(script, phrase)) {
      throw new Error('voice_link_missing_mandatory_phrase');
    }
  }
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

  const factOptions = verifiedFact
    ? [verifiedFact.text, ...(verifiedFact.alternatives ?? [])]
        .map((fact) => fact.trim())
        .filter(Boolean)
    : [];
  const factInstruction = factOptions.length
    ? [
        '- VERIFIED MUSIC RESEARCH DOSSIER:',
        ...factOptions.map((fact, index) => `  ${index + 1}. ${JSON.stringify(fact)}`),
        '- Choose one fresh, relevant angle from this dossier and weave it naturally into the conversation. Preserve its factual meaning; do not invent or combine claims.',
      ].join('\n')
    : '';
  const identityRequired = announcerIdentityRequired(announcerProfile, input.recentScripts);
  const identityInstruction = announcerProfile?.announcerName
    ? identityRequired
      ? `- Introduce yourself naturally as ${JSON.stringify(announcerProfile.announcerName)} in this link; the name has not appeared in the last three links.`
      : `- Your on-air name is ${JSON.stringify(announcerProfile.announcerName)}. You may omit it in this link because it was heard recently.`
    : '';

  const recentScriptsInstruction = input.recentScripts.length
    ? `Recent links from this station are a hard anti-repetition constraint. Do not reuse their opening, sentence skeleton, catchphrase, slogan, sign-off, laugh/reaction pattern, or any distinctive four-word phrase. The announcer name and station name are identity anchors and may recur naturally:\n${input.recentScripts
        .slice(-10)
        .map((script) => `- ${JSON.stringify(script)}`)
        .join('\n')}`
    : '';

  const trackContext = input.eventPosition === 'after-commercial'
    ? `The commercial break has just ended. Upcoming track: ${promptTrack(nextTrack)}`
    : `Current track just played: ${promptTrack(input.currentTrack)}\nNext track to play: ${promptTrack(nextTrack)}`;
  const eventRule = input.eventPosition === 'after-commercial'
    ? '- This is a fresh return from a commercial break. Do not identify, recap, or allude to any song heard before the break. Establish the announcer/station identity when requested and announce only the upcoming song.'
    : '';
  const prompt = `Write a broadcast-ready radio announcer voice link in ${languageName(input.language)}.
Tone: ${toneInstruction(input.tone)}.
${trackContext}
${factInstruction}
${identityInstruction}
${phrasesBullet}
${input.customInstruction ? `- Additional instruction: ${input.customInstruction}` : ''}
${recentScriptsInstruction}

CRITICAL RULES:
- Output JSON format: { "texto": "..." }
- Maximum duration is ${input.maxDurationSeconds} seconds (~${input.maxDurationSeconds * 2.5} words max).
- Mention the upcoming song title accurately.
- Sound alive, specific, and conversational: create a small moment of chemistry with the listener instead of reading a metadata list.
- Use the selected announcer's personality, delivery, humor policy, editorial interests, authorized repertoire, and avoidances as one coherent voice.
${eventRule}
- Be concise enough for the time window, but do not flatten the personality or omit the verified angle merely to be shorter.`;

  try {
    const provider = resolveProvider();
    const systemPrompt = [
      'You are a professional radio announcer and editorial writer.',
      announcerProfilePrompt(announcerProfile),
      'Always respond strictly in valid JSON format: { "texto": "..." }',
    ].join('\n\n');
    const validate = (raw: string) => validateVoiceLinkCandidate(
      raw,
      input,
      verifiedFact,
      announcerProfile,
      identityRequired,
      phrases,
    );
    const firstText = await provider.complete({
      systemPrompt,
      userPrompt: prompt,
      temperature: 0.7,
      maxTokens: 1_600,
      validate,
    });
    validate(firstText);
    const first = parseVoiceLinkResponse(firstText);
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
      maxTokens: 1_600,
      validate,
    });
    validate(retryText);
    const retry = parseVoiceLinkResponse(retryText);
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
    const candidates = compactFallbackScripts(
      input,
      phrases,
      verifiedFact,
      announcerProfile,
      identityRequired,
    );
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
