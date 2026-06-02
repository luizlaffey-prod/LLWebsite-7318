/**
 * Builds the `today` object the script generator injects into the
 * LLM prompt. Two formats so the model can cite either naturally:
 *   - iso       "2026-06-02"  (machine-friendly)
 *   - readable  "Tuesday, June 2, 2026"  (broadcast-friendly)
 *
 * Both are rendered in the station's timezone so an automation
 * firing at 04:00 UTC for a São Paulo station correctly reads
 * the local date, not yesterday's UTC date.
 */
export function todayForPrompt(
  timezone: string,
  language: 'en' | 'pt' | 'es'
): { iso: string; readable: string } {
  const now = new Date();

  // ISO date string in the requested timezone via en-CA, which
  // produces yyyy-MM-dd by spec. Robust across runtimes.
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const localeMap: Record<'en' | 'pt' | 'es', string> = {
    en: 'en-US',
    pt: 'pt-BR',
    es: 'es-ES',
  };
  const readable = new Intl.DateTimeFormat(localeMap[language], {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  return { iso, readable };
}
