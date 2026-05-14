import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  deliveryEndpoint,
  deliveryLog,
  generatedAudio,
  type DeliveryEndpoint,
  type FtpConfig,
  type HttpConfig,
  type EmailConfig,
} from '@/lib/db/schema';
import { decryptJSON } from '@/lib/crypto/secrets';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import { Resend } from 'resend';

export interface DispatchInput {
  userId: string;
  audioId: string;
}

export interface DispatchResult {
  endpointId: string;
  ok: boolean;
  error?: string;
}

function renderName(pattern: string, ctx: { name: string; date: string }): string {
  return pattern
    .replace(/\{\{name\}\}/g, ctx.name)
    .replace(/\{\{date\}\}/g, ctx.date);
}

async function pushHttp(
  config: HttpConfig,
  payload: { audioUrl: string; filename: string; title: string }
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.customHeaders ?? {}),
  };
  if (config.bearerToken) {
    headers.Authorization = `Bearer ${config.bearerToken}`;
  }
  await fetchWithRetry(
    config.url,
    {
      method: config.method,
      headers,
      body: JSON.stringify(payload),
    },
    { timeoutMs: 30_000 }
  );
}

async function pushEmail(
  config: EmailConfig,
  payload: { audioUrl: string; title: string; filename: string }
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('email_delivery_not_configured');
  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'AURA <noreply@aura.app>',
    to: config.recipient,
    subject: `AURA bulletin — ${payload.title}`,
    html: `
      <p>Your scheduled AURA bulletin is ready:</p>
      <p><strong>${payload.title}</strong></p>
      <p><a href="${payload.audioUrl}">Download ${payload.filename}.mp3</a></p>
    `,
  });
}

async function pushFtp(
  config: FtpConfig,
  payload: { audioUrl: string; filename: string }
): Promise<void> {
  // FTP push is best done from a Node serverless function. We avoid the
  // basic-ftp dep on hot paths; production deployments should swap this
  // for a dedicated FTP worker. For now we throw a structured error so
  // the log captures the unsupported state without failing silently.
  void config;
  void payload;
  throw new Error('ftp_delivery_pending_implementation');
}

export async function dispatchAudioToEndpoints(
  input: DispatchInput
): Promise<DispatchResult[]> {
  const [audio] = await db
    .select({
      id: generatedAudio.id,
      title: generatedAudio.title,
      audioUrl: generatedAudio.audioUrl,
    })
    .from(generatedAudio)
    .where(eq(generatedAudio.id, input.audioId))
    .limit(1);
  if (!audio || !audio.audioUrl) return [];

  const endpoints = await db
    .select()
    .from(deliveryEndpoint)
    .where(eq(deliveryEndpoint.userId, input.userId));

  const date = new Date().toISOString().slice(0, 10);
  const results: DispatchResult[] = [];

  for (const ep of endpoints.filter((e: DeliveryEndpoint) => e.enabled)) {
    const filename = renderName(ep.slotNamingPattern, { name: audio.title, date });
    try {
      switch (ep.type) {
        case 'http': {
          const config = decryptJSON<HttpConfig>(ep.configEncrypted);
          await pushHttp(config, {
            audioUrl: audio.audioUrl,
            filename,
            title: audio.title,
          });
          break;
        }
        case 'email': {
          const config = decryptJSON<EmailConfig>(ep.configEncrypted);
          await pushEmail(config, {
            audioUrl: audio.audioUrl,
            title: audio.title,
            filename,
          });
          break;
        }
        case 'ftp': {
          const config = decryptJSON<FtpConfig>(ep.configEncrypted);
          await pushFtp(config, { audioUrl: audio.audioUrl, filename });
          break;
        }
      }
      await db.insert(deliveryLog).values({
        deliveryEndpointId: ep.id,
        audioId: audio.id,
        status: 'success',
      });
      await db
        .update(deliveryEndpoint)
        .set({ lastUsedAt: new Date() })
        .where(eq(deliveryEndpoint.id, ep.id));
      results.push({ endpointId: ep.id, ok: true });
    } catch (err) {
      const message =
        err instanceof FetchError
          ? `${err.status}_${err.message}`
          : err instanceof Error
            ? err.message
            : 'unknown_error';
      await db.insert(deliveryLog).values({
        deliveryEndpointId: ep.id,
        audioId: audio.id,
        status: 'failed',
        error: message,
      });
      results.push({ endpointId: ep.id, ok: false, error: message });
    }
  }

  return results;
}
