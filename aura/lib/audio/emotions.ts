export const EMOTIONS = [
  'ENTHUSIASM',
  'SERIOUSNESS',
  'CONCERN',
  'NEUTRAL',
  'DRAMATIC',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_COLOR: Record<Emotion, { text: string; bg: string; border: string }> = {
  ENTHUSIASM: { text: 'text-teal', bg: 'bg-teal/10', border: 'border-teal/30' },
  SERIOUSNESS: { text: 'text-info', bg: 'bg-info/10', border: 'border-info/30' },
  CONCERN: { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  NEUTRAL: { text: 'text-text-secondary', bg: 'bg-text-secondary/10', border: 'border-text-secondary/30' },
  DRAMATIC: { text: 'text-violet', bg: 'bg-violet/10', border: 'border-violet/30' },
};

export const EMOTION_LABEL_EN: Record<Emotion, string> = {
  ENTHUSIASM: 'Enthusiasm',
  SERIOUSNESS: 'Seriousness',
  CONCERN: 'Concern',
  NEUTRAL: 'Neutral',
  DRAMATIC: 'Dramatic',
};
