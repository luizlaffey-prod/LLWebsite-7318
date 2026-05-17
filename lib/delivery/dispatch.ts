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
import { render } from '@react-email/render';
import { DeliveryEmail } from '@/lib/email/templates/delivery';

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
  // Render through the shared EmailShell so delivery notifications carry
  // the AURA brand header + dark/mint palette, matching welcome and
  // trial-ending. The previous inline HTML was unbranded and looked
  // generic compared to the rest of the customer's experience.
  const html = await render(
    DeliveryEmail({
      title: payload.title,
      filename: payload.filename,
      audioUrl: payload.audioUrl,
      locale: 'en',
    })
  );
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'AURA <noreply@aura.app>',
    to: config.recipient,
    subject: `AURA bulletin — ${payload.title}`,
    html,
  });
}

async function pushFtp(
  config: FtpConfig,
  payload: { audioUrl: string; filename: string }
): Promise<void> {
  // Lazy-load basic-ftp so routes that never use FTP delivery don't pull
  // the client + its socket plumbing into their cold-start path.
  const { Client } = await import('basic-ftp');

  const audioRes = await fetchWithRetry(payload.audioUrl, {}, { timeoutMs: 60_000 });
  const audioBytes = Buffer.from(await audioRes.arrayBuffer());

  const client = new Client(30_000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      // basic-ftp's `secure: true` negotiates explicit FTPS on the control
      // channel (the modern standard). secureOptions are forwarded to
      // tls.connect so customers can pin a self-signed CA later if their
      // station's server requires it.
      secure: config.secure ?? false,
    });

    if (config.remoteDir && config.remoteDir.trim().length > 0) {
      await client.ensureDir(config.remoteDir);
    }

    // Stream the bytes from memory — keeps tmpdir clean and lets us
    // bound total memory usage by the audio size (typically < 5 MB).
    const { Readable } = await import('node:stream');
    const stream = Readable.from(audioBytes);
    // Naming pattern + .mp3 — the dispatcher already formatted the base
    // name; we just append the extension so the radio's automation
    // system recognises it as MP3 (some need the extension even with
    // correct MIME).
    const safeName = payload.filename.endsWith('.mp3')
      ? payload.filename
      : `${payload.filename}.mp3`;
    await client.uploadFrom(stream, safeName);
  } finally {
    client.close();
  }
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
