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
    const res = await fetchWithRetry(url.toString());
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
      console.warn('[weather] OpenWeather failed', err.status);
    }
    return null;
  }
}

interface OwmResponse {
  name?: string;
  main?: { temp?: number; feels_like?: number; humidity?: number };
  weather?: { description?: string }[];
  wind?: { speed?: number };
}
