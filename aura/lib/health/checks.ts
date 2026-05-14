/**
 * Per-service connectivity probes used by /api/health/[service] and the
 * /settings/health diagnostics page. Each probe returns a small typed
 * result so the UI can display "configured?" + "reachable?" + an
 * optional human-readable detail (account/usage info, error code).
 */
import { sql } from 'drizzle-orm';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { db } from '@/lib/db/client';

export type HealthService =
  | 'database'
  | 'auth'
  | 'elevenlabs'
  | 'anthropic'
  | 'gemini'
  | 'newsapi'
  | 'gnews'
  | 'openweather'
  | 'resend'
  | 'r2'
  | 'stripe';

export interface HealthResult {
  service: HealthService;
  configured: boolean;
  ok: boolean;
  detail?: string;
  error?: string;
}

function notConfigured(service: HealthService, reason: string): HealthResult {
  return { service, configured: false, ok: false, error: reason };
}

function errorMessage(err: unknown): string {
  if (err instanceof FetchError) {
    if (err.status === 401) return 'unauthorized (check the API key)';
    if (err.status === 403) return 'forbidden (key valid but insufficient permissions)';
    if (err.status === 429) return 'rate limited';
    if (err.status >= 500) return `upstream ${err.status}`;
    return `${err.status} ${err.message}`;
  }
  return err instanceof Error ? err.message : 'unknown error';
}

export async function checkDatabase(): Promise<HealthResult> {
  if (!process.env.DATABASE_URL) {
    return notConfigured('database', 'DATABASE_URL not set');
  }
  try {
    await db.execute(sql`SELECT 1`);
    return { service: 'database', configured: true, ok: true, detail: 'Postgres reachable' };
  } catch (err) {
    return {
      service: 'database',
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

export async function checkAuth(): Promise<HealthResult> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return notConfigured('auth', 'BETTER_AUTH_SECRET not set');
  if (secret.length < 32) {
    return {
      service: 'auth',
      configured: true,
      ok: false,
      error: 'BETTER_AUTH_SECRET should be at least 32 characters',
    };
  }
  return { service: 'auth', configured: true, ok: true, detail: 'Secret length OK' };
}

export async function checkElevenLabs(): Promise<HealthResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return notConfigured('elevenlabs', 'ELEVENLABS_API_KEY not set');
  try {
    const res = await fetchWithRetry(
      'https://api.elevenlabs.io/v1/user/subscription',
      { headers: { 'xi-api-key': key, Accept: 'application/json' } },
      { timeoutMs: 10_000, retryOn: [503] }
    );
    const data = (await res.json()) as {
      tier?: string;
      character_count?: number;
      character_limit?: number;
    };
    const used = data.character_count ?? 0;
    const limit = data.character_limit ?? 0;
    return {
      service: 'elevenlabs',
      configured: true,
      ok: true,
      detail: `Tier: ${data.tier ?? '—'} · characters ${used.toLocaleString()} / ${limit.toLocaleString()}`,
    };
  } catch (err) {
    return {
      service: 'elevenlabs',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkAnthropic(): Promise<HealthResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return notConfigured('anthropic', 'ANTHROPIC_API_KEY not set');
  try {
    const res = await fetchWithRetry(
      'https://api.anthropic.com/v1/models',
      {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          Accept: 'application/json',
        },
      },
      { timeoutMs: 10_000, retryOn: [503] }
    );
    const data = (await res.json()) as { data?: { id: string }[] };
    return {
      service: 'anthropic',
      configured: true,
      ok: true,
      detail: `${data.data?.length ?? 0} models available`,
    };
  } catch (err) {
    return {
      service: 'anthropic',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkGemini(): Promise<HealthResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return notConfigured('gemini', 'GEMINI_API_KEY not set');
  try {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { headers: { Accept: 'application/json' } },
      { timeoutMs: 10_000, retryOn: [503] }
    );
    const data = (await res.json()) as { models?: { name: string }[] };
    return {
      service: 'gemini',
      configured: true,
      ok: true,
      detail: `${data.models?.length ?? 0} models available`,
    };
  } catch (err) {
    return {
      service: 'gemini',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkNewsApi(): Promise<HealthResult> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return notConfigured('newsapi', 'NEWSAPI_KEY not set');
  try {
    const res = await fetchWithRetry(
      'https://newsapi.org/v2/top-headlines?language=en&pageSize=1',
      { headers: { 'X-Api-Key': key } },
      { timeoutMs: 10_000 }
    );
    const data = (await res.json()) as { status?: string; totalResults?: number };
    return {
      service: 'newsapi',
      configured: true,
      ok: data.status === 'ok',
      detail: data.status === 'ok' ? `${data.totalResults ?? 0} headlines fetched` : undefined,
      error: data.status !== 'ok' ? `status=${data.status}` : undefined,
    };
  } catch (err) {
    return {
      service: 'newsapi',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkGNews(): Promise<HealthResult> {
  const key = process.env.GNEWS_KEY;
  if (!key) return notConfigured('gnews', 'GNEWS_KEY not set');
  try {
    const res = await fetchWithRetry(
      `https://gnews.io/api/v4/top-headlines?lang=en&max=1&apikey=${key}`,
      {},
      { timeoutMs: 10_000 }
    );
    const data = (await res.json()) as { articles?: unknown[] };
    return {
      service: 'gnews',
      configured: true,
      ok: Array.isArray(data.articles),
      detail: Array.isArray(data.articles)
        ? `${data.articles.length} article(s) fetched`
        : undefined,
    };
  } catch (err) {
    return {
      service: 'gnews',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkOpenWeather(): Promise<HealthResult> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return notConfigured('openweather', 'OPENWEATHER_API_KEY not set');
  try {
    const res = await fetchWithRetry(
      `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${key}&units=metric`,
      {},
      { timeoutMs: 10_000 }
    );
    const data = (await res.json()) as { name?: string; main?: { temp?: number } };
    return {
      service: 'openweather',
      configured: true,
      ok: !!data.name,
      detail: data.name ? `OK (test: ${data.name} ${data.main?.temp ?? '—'}°C)` : undefined,
    };
  } catch (err) {
    return {
      service: 'openweather',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkResend(): Promise<HealthResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return notConfigured('resend', 'RESEND_API_KEY not set');
  try {
    const res = await fetchWithRetry(
      'https://api.resend.com/domains',
      { headers: { Authorization: `Bearer ${key}` } },
      { timeoutMs: 10_000 }
    );
    const data = (await res.json()) as { data?: unknown[] };
    return {
      service: 'resend',
      configured: true,
      ok: true,
      detail: `${Array.isArray(data.data) ? data.data.length : 0} domain(s)`,
    };
  } catch (err) {
    return {
      service: 'resend',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkR2(): Promise<HealthResult> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKey || !secret || !bucket) {
    return notConfigured('r2', 'R2_* variables missing (account/key/secret/bucket)');
  }
  // Real auth happens only on actual uploads; here we confirm the
  // bucket virtual-host resolves to Cloudflare R2.
  try {
    const res = await fetch(`https://${accountId}.r2.cloudflarestorage.com/${bucket}`, {
      method: 'HEAD',
    });
    return {
      service: 'r2',
      configured: true,
      ok: res.status > 0,
      detail: `Bucket host reachable (status ${res.status})`,
    };
  } catch (err) {
    return {
      service: 'r2',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

export async function checkStripe(): Promise<HealthResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return notConfigured('stripe', 'STRIPE_SECRET_KEY not set');
  try {
    const res = await fetchWithRetry(
      'https://api.stripe.com/v1/balance',
      { headers: { Authorization: `Bearer ${key}` } },
      { timeoutMs: 10_000 }
    );
    const data = (await res.json()) as { available?: unknown[]; livemode?: boolean };
    return {
      service: 'stripe',
      configured: true,
      ok: Array.isArray(data.available),
      detail: `mode: ${data.livemode ? 'live' : 'test'}`,
    };
  } catch (err) {
    return {
      service: 'stripe',
      configured: true,
      ok: false,
      error: errorMessage(err),
    };
  }
}

const PROBES: Record<HealthService, () => Promise<HealthResult>> = {
  database: checkDatabase,
  auth: checkAuth,
  elevenlabs: checkElevenLabs,
  anthropic: checkAnthropic,
  gemini: checkGemini,
  newsapi: checkNewsApi,
  gnews: checkGNews,
  openweather: checkOpenWeather,
  resend: checkResend,
  r2: checkR2,
  stripe: checkStripe,
};

export const SERVICES: HealthService[] = [
  'database',
  'auth',
  'elevenlabs',
  'anthropic',
  'gemini',
  'newsapi',
  'gnews',
  'openweather',
  'resend',
  'r2',
  'stripe',
];

export async function checkOne(service: HealthService): Promise<HealthResult> {
  const fn = PROBES[service];
  if (!fn) throw new Error('unknown_service');
  return fn();
}

export async function checkAll(): Promise<Record<HealthService, HealthResult>> {
  const entries = await Promise.all(
    SERVICES.map(async (s) => [s, await PROBES[s]()] as const)
  );
  return Object.fromEntries(entries) as Record<HealthService, HealthResult>;
}
