import { fetchWithRetry, FetchError } from '@/lib/utils/retry';

export interface LocationSuggestion {
  label: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

const OWM_GEO_BASE = 'https://api.openweathermap.org/geo/1.0/direct';

/**
 * Autocomplete location names using OpenWeather's free geocoder.
 * Falls back to an empty list if no key configured.
 */
export async function suggestLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return [];

  const url = new URL(OWM_GEO_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '5');
  url.searchParams.set('appid', key);

  try {
    const res = await fetchWithRetry(url.toString());
    const data = (await res.json()) as GeoEntry[];
    return data.map((entry) => ({
      label: [entry.name, entry.state, entry.country].filter(Boolean).join(', '),
      country: entry.country,
      state: entry.state,
      lat: entry.lat,
      lon: entry.lon,
    }));
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[geo] OpenWeather geo failed', err.status);
    }
    return [];
  }
}

interface GeoEntry {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}
