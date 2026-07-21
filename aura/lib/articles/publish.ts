import { createHmac } from 'node:crypto';
import { decryptJSON } from '@/lib/crypto/secrets';
import { fetchWithRetry, FetchError } from '@/lib/utils/retry';
import type {
  Article,
  PublishingConnection,
  WordPressSecret,
  WebhookSecret,
} from '@/lib/db/schema';
import type { ExportableArticle } from './export';

/**
 * Pushes an approved article to the station's configured website. Two
 * targets are supported: WordPress (via its REST API) and a generic
 * webhook. Both return the public/edit URL of the created post when the
 * receiver reports one.
 *
 * Errors are thrown as PublishError with a short, user-facing `reason` so
 * the API route can surface exactly what went wrong (bad credentials,
 * unreachable site, …) instead of a generic failure.
 */

export class PublishError extends Error {
  constructor(
    public readonly reason: string,
    public readonly status?: number
  ) {
    super(reason);
    this.name = 'PublishError';
  }
}

/** Build the content HTML sent to the CMS — no <h1> (the title is a
 * separate field) and no lede (that goes in the excerpt). */
function contentHtml(a: ExportableArticle): string {
  const parts: string[] = [];
  if (a.imageUrl) {
    const credit = a.imageCredit ? `<figcaption>${esc(a.imageCredit)}</figcaption>` : '';
    parts.push(
      `<figure><img src="${esc(a.imageUrl)}" alt="${esc(a.title)}" />${credit}</figure>`
    );
  }
  for (const block of a.body) {
    parts.push(
      block.type === 'heading'
        ? `<h2>${esc(block.text)}</h2>`
        : `<p>${esc(block.text)}</p>`
    );
  }
  if (a.sourceName) {
    const link = a.sourceArticleUrl
      ? `<a href="${esc(a.sourceArticleUrl)}" rel="nofollow">${esc(a.sourceName)}</a>`
      : esc(a.sourceName);
    parts.push(`<p class="source"><em>Source: ${link}</em></p>`);
  }
  return parts.join('\n');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toExportable(a: Article): ExportableArticle {
  return {
    title: a.title,
    lede: a.lede,
    body: a.editedBody ?? a.body,
    imageUrl: a.imageUrl,
    imageCredit: a.imageCredit,
    sourceName: a.sourceName,
    sourceArticleUrl: a.sourceArticleUrl,
  };
}

export interface PublishResult {
  url: string | null;
}

async function publishToWordPress(
  conn: PublishingConnection,
  article: Article
): Promise<PublishResult> {
  const secret = decryptJSON<WordPressSecret>(conn.configEncrypted);
  const ex = toExportable(article);
  // WordPress accepts the Application Password with or without spaces.
  const auth = Buffer.from(
    `${secret.username}:${secret.appPassword}`,
    'utf8'
  ).toString('base64');

  let res: Response;
  try {
    res = await fetchWithRetry(
      `${conn.siteUrl}/wp-json/wp/v2/posts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: ex.title,
          content: contentHtml(ex),
          excerpt: ex.lede ?? '',
          status: conn.defaultStatus === 'publish' ? 'publish' : 'draft',
        }),
      },
      { failFast: [400, 401, 403, 404, 429], timeoutMs: 30_000 }
    );
  } catch (err) {
    if (err instanceof FetchError) {
      if (err.status === 401 || err.status === 403) {
        throw new PublishError('wp_auth', err.status);
      }
      if (err.status === 404) throw new PublishError('wp_not_found', 404);
      throw new PublishError('wp_rejected', err.status);
    }
    throw new PublishError('unreachable');
  }

  const data = (await res.json().catch(() => ({}))) as {
    link?: string;
    id?: number;
  };
  // Prefer the public permalink; fall back to the wp-admin edit screen so a
  // draft (which has no public link yet) is still openable.
  const url =
    data.link ??
    (data.id ? `${conn.siteUrl}/wp-admin/post.php?post=${data.id}&action=edit` : null);
  return { url };
}

async function publishToWebhook(
  conn: PublishingConnection,
  article: Article
): Promise<PublishResult> {
  const { secret } = decryptJSON<WebhookSecret>(conn.configEncrypted);
  const ex = toExportable(article);
  const payload = JSON.stringify({
    title: ex.title,
    lede: ex.lede,
    body: ex.body,
    html: contentHtml(ex),
    imageUrl: ex.imageUrl,
    imageCredit: ex.imageCredit,
    sourceName: ex.sourceName,
    sourceArticleUrl: ex.sourceArticleUrl,
    categories: article.categories,
    language: article.language,
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    // Detached HMAC so the receiver can verify the body wasn't tampered with.
    headers['X-AURA-Signature'] =
      'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }

  let res: Response;
  try {
    res = await fetchWithRetry(
      conn.siteUrl,
      { method: 'POST', headers, body: payload },
      { failFast: [400, 401, 403, 404, 429], timeoutMs: 30_000 }
    );
  } catch (err) {
    if (err instanceof FetchError) {
      if (err.status === 401 || err.status === 403) {
        throw new PublishError('webhook_auth', err.status);
      }
      throw new PublishError('webhook_rejected', err.status);
    }
    throw new PublishError('unreachable');
  }

  const data = (await res.json().catch(() => ({}))) as { url?: string };
  return { url: data.url ?? null };
}

export function publishArticle(
  conn: PublishingConnection,
  article: Article
): Promise<PublishResult> {
  return conn.type === 'wordpress'
    ? publishToWordPress(conn, article)
    : publishToWebhook(conn, article);
}

/**
 * Verifies credentials without creating a post. For WordPress we GET the
 * authenticated user (`/wp-json/wp/v2/users/me`); a 200 proves the site is
 * reachable and the app password is valid. For a webhook we send a small
 * `{ ping: true }` probe and accept any 2xx.
 */
export async function testConnection(
  conn: Pick<
    PublishingConnection,
    'type' | 'siteUrl' | 'configEncrypted'
  >
): Promise<void> {
  if (conn.type === 'wordpress') {
    const secret = decryptJSON<WordPressSecret>(conn.configEncrypted);
    const auth = Buffer.from(
      `${secret.username}:${secret.appPassword}`,
      'utf8'
    ).toString('base64');
    try {
      await fetchWithRetry(
        `${conn.siteUrl}/wp-json/wp/v2/users/me?context=edit`,
        { method: 'GET', headers: { Authorization: `Basic ${auth}` } },
        { failFast: [400, 401, 403, 404, 429], timeoutMs: 20_000 }
      );
    } catch (err) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) throw new PublishError('wp_auth', err.status);
        if (err.status === 404) throw new PublishError('wp_not_found', 404);
        throw new PublishError('wp_rejected', err.status);
      }
      throw new PublishError('unreachable');
    }
    return;
  }

  const { secret } = decryptJSON<WebhookSecret>(conn.configEncrypted);
  const payload = JSON.stringify({ ping: true });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['X-AURA-Signature'] =
      'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }
  try {
    await fetchWithRetry(
      conn.siteUrl,
      { method: 'POST', headers, body: payload },
      { failFast: [400, 401, 403, 404, 429], timeoutMs: 20_000 }
    );
  } catch (err) {
    if (err instanceof FetchError) {
      if (err.status === 401 || err.status === 403) throw new PublishError('webhook_auth', err.status);
      throw new PublishError('webhook_rejected', err.status);
    }
    throw new PublishError('unreachable');
  }
}
