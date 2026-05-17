/**
 * Curated IANA timezone list surfaced in the user-facing UI (settings,
 * automation scheduler). Kept tight on purpose — the full tz database has
 * 400+ entries and most are noise. We cover:
 *
 *   • All US mainland zones plus Alaska / Hawaii / Arizona (no-DST)
 *   • Brazil, Mexico, the major Spanish-speaking LATAM hubs
 *   • Iberia + the UK + Central Europe
 *
 * Add to this list (with a label) when a customer asks for a zone we don't
 * yet have — there's no need to ship the whole database.
 */
export interface TimezoneOption {
  value: string;
  label: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'UTC', label: 'UTC' },

  // United States
  { value: 'America/New_York', label: 'US — Eastern (New York)' },
  { value: 'America/Chicago', label: 'US — Central (Chicago)' },
  { value: 'America/Denver', label: 'US — Mountain (Denver)' },
  { value: 'America/Phoenix', label: 'US — Arizona (no DST)' },
  { value: 'America/Los_Angeles', label: 'US — Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'US — Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'US — Hawaii (Honolulu)' },

  // Latin America
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },

  // Europe
  { value: 'Europe/London', label: 'United Kingdom (London)' },
  { value: 'Europe/Lisbon', label: 'Portugal (Lisboa)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'Europe/Paris', label: 'France (Paris)' },
];

export const TIMEZONES: string[] = TIMEZONE_OPTIONS.map((tz) => tz.value);
