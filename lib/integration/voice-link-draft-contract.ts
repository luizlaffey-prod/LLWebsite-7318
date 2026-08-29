import type { VerifiedTrackFact } from '@/lib/llm/voice-link-generator';

export function estimateVoiceLinkDurationSeconds(scriptText: string): number {
  const words = scriptText.trim().split(/\s+/u).filter(Boolean).length;
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 2.35));
}

export function buildVoiceLinkDraftEnvelope(
  scriptText: string,
  verifiedFact?: VerifiedTrackFact | null,
) {
  const normalizedScript = scriptText.trim();
  const normalizedFactText = verifiedFact?.text.trim() ?? '';
  const usedFactText = normalizedFactText && normalizedScript.includes(normalizedFactText)
    ? normalizedFactText
    : null;

  return {
    draft: {
      scriptText: normalizedScript,
      estimatedDurationSeconds: estimateVoiceLinkDurationSeconds(normalizedScript),
      verifiedFact: verifiedFact ?? null,
      verifiedFactIncluded: Boolean(usedFactText),
      usedFactText,
    },
  };
}
