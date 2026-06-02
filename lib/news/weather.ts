import { fetchWithRetry, FetchError } from '@/lib/utils/retry';

export interface WeatherSnapshot {
  location: string;
  tempC: number;
  feelsLikeC: number;
  conditions: string;
  humidity: number;
  windKph: number;
}

const OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Splits a free-form city field into individual queries. Accepts
 * commas, plus the natural conjunctions used in EN/PT/ES so a
 * non-technical operator typing "São Paulo e Campinas" or "Madrid
 * y Barcelona" gets both queried instead of the whole string
 * being sent to OpenWeather as one city (which silently returns
 * 404 and kills the weather block).
 *
 * UF/state suffixes attached with a comma (e.g. "São Paulo, SP"
 * or "Buenos Aires, Argentina") are common and SHOULD stay
 * attached — we only split when at least one side ends up
 * looking like a separate city name. Heuristic: if a comma-split
 * piece is ≤ 3 chars and uppercase, treat it as a state code
 * belonging to the previous piece.
 */
export function splitCityField(raw: string): string[] {
  if (!raw) return [];
  const conjunctionSplit = raw.split(/\s+(?:e|and|y)\s+/i);
  const parts: string[] = [];
  for (const segment of conjunctionSplit) {
    const commaParts = segment.split(',').map((s) => s.trim());
    let buffer = '';
    for (const part of commaParts) {
      if (!part) continue;
      if (!buffer) {
        buffer = part;
        continue;
      }
      // Heuristic: ≤3 chars, all uppercase = state/country code,
      // belongs with the previous city.
      if (part.length <= 3 && part === part.toUpperCase()) {
        buffer = `${buffer}, ${part}`;
      } else {
        // Looks like a new city — flush the previous and start over.
        parts.push(buffer);
        buffer = part;
      }
    }
    if (buffer) parts.push(buffer);
  }
  return parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 5); // hard cap to keep latency bounded
}

export async function fetchWeather(
  location: string,
  language: 'en' | 'pt' | 'es' = 'en'
): Promise<WeatherSnapshot | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  const url = new URL(OWM_BASE);
  url.searchParams.set('q', location);
  url.searchParams.set('appid', key);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', language);

  try {
    const res = await fetchWithRetry(url.toString(), {}, { failFast: [400, 401, 404] });
    const data = (await res.json()) as OwmResponse;
    return {
      location: data.name ?? location,
      tempC: Math.round(data.main?.temp ?? 0),
      feelsLikeC: Math.round(data.main?.feels_like ?? 0),
      conditions: data.weather?.[0]?.description ?? 'unknown',
      humidity: data.main?.humidity ?? 0,
      windKph: Math.round((data.wind?.speed ?? 0) * 3.6),
    };
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[weather] OpenWeather failed for', location, err.status);
    } else {
      console.warn('[weather] OpenWeather failed for', location, err);
    }
    return null;
  }
}

/**
 * Fetches every city in a free-form field. Returns the list of
 * successful snapshots (might be empty) and the names that
 * failed, so the caller can either degrade gracefully OR surface a
 * clear error to the operator. The previous fetchWeather returned
 * null on failure with no indication WHY, which made debugging a
 * tester's "weather didn't show up" report painful.
 */
export async function fetchWeatherCities(
  rawField: string,
  language: 'en' | 'pt' | 'es' = 'en'
): Promise<{ snapshots: WeatherSnapshot[]; failed: string[] }> {
  const cities = splitCityField(rawField);
  if (cities.length === 0) return { snapshots: [], failed: [] };
  const results = await Promise.all(
    cities.map(async (city) => ({
      city,
      snapshot: await fetchWeather(city, language),
    }))
  );
  const snapshots: WeatherSnapshot[] = [];
  const failed: string[] = [];
  for (const r of results) {
    if (r.snapshot) snapshots.push(r.snapshot);
    else failed.push(r.city);
  }
  return { snapshots, failed };
}

interface OwmResponse {
  name?: string;
  main?: { temp?: number; feels_like?: number; humidity?: number };
  weather?: { description?: string }[];
  wind?: { speed?: number };
}
