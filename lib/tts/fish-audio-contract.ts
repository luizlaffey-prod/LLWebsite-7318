export interface FishModelSummary {
  _id?: unknown;
  id?: unknown;
  title?: unknown;
  type?: unknown;
  state?: unknown;
  created_at?: unknown;
}

export function isFishVoiceId(value: string): boolean {
  return value.startsWith('fish:');
}

export function parseFishModelId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const model = payload as FishModelSummary;
  const candidate = model._id ?? model.id;
  if (typeof candidate !== 'string') return null;

  const id = candidate.trim();
  return id.length > 0 ? id : null;
}

export function fishReferenceId(value: string): string | undefined {
  if (!isFishVoiceId(value)) return undefined;
  const referenceId = value.replace(/^fish:/, '').trim();
  return referenceId && referenceId !== 'default' ? referenceId : undefined;
}

export function findReusableFishModel(
  payload: unknown,
  expectedTitle: string,
  now = new Date(),
  maxAgeMs = 24 * 60 * 60 * 1000
): { id: string; title: string } | null {
  if (!payload || typeof payload !== 'object') return null;

  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;

  const cutoff = now.getTime() - maxAgeMs;
  const matches = items
    .map((item) => {
      const id = parseFishModelId(item);
      if (!id || !item || typeof item !== 'object') return null;

      const model = item as FishModelSummary;
      const title = typeof model.title === 'string' ? model.title : '';
      const type = typeof model.type === 'string' ? model.type : '';
      const state = typeof model.state === 'string' ? model.state : '';
      const createdAt =
        typeof model.created_at === 'string'
          ? Date.parse(model.created_at)
          : Number.NaN;

      if (
        title !== expectedTitle ||
        type !== 'tts' ||
        state === 'failed' ||
        !Number.isFinite(createdAt) ||
        createdAt < cutoff
      ) {
        return null;
      }

      return { id, title, createdAt };
    })
    .filter((item): item is { id: string; title: string; createdAt: number } => Boolean(item))
    .sort((a, b) => b.createdAt - a.createdAt);

  return matches[0] ? { id: matches[0].id, title: matches[0].title } : null;
}
