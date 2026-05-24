/**
 * Minimal R2/S3 upload using AWS Signature V4 via fetch. Avoids pulling the
 * 700+KB @aws-sdk/client-s3 dependency for a single PutObject call.
 */
import { createHash, createHmac } from 'node:crypto';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string;
}

function getConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 environment variables not configured');
  }
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  };
}

function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadAudio(
  key: string,
  body: Uint8Array,
  contentType = 'audio/mpeg'
): Promise<UploadResult> {
  const cfg = getConfig();
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${cfg.bucket}/${key}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalUri = `/${cfg.bucket}/${encodeURI(key).replace(/%2F/g, '/')}`;
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const region = 'auto';
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
    },
    body: body as BodyInit,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed ${res.status}: ${text}`);
  }

  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`
    : url;

  return { key, url: publicUrl };
}

export function audioKey(userId: string, audioId: string): string {
  return `audio/${userId}/${audioId}.mp3`;
}

/**
 * Presigned PUT URL for direct browser→R2 uploads. Bypasses
 * Vercel's 4.5 MB serverless body limit, which kills any
 * meaningful WAV upload (10-30 MB is common for short bg tracks).
 *
 * Requires the R2 bucket to have CORS configured for the app's
 * origin — see docs/r2-cors.json. Once that's in place, the
 * browser can PUT freely without proxying through our backend.
 */
export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export function presignPutUrl(
  key: string,
  expiresSeconds: number = 300
): PresignResult {
  const cfg = getConfig();
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${cfg.accessKeyId}/${scope}`;

  const canonicalUri = `/${cfg.bucket}/${encodeURI(key).replace(/%2F/g, '/')}`;

  // Sort query params alphabetically per SigV4 spec.
  const queryEntries: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  queryEntries.sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = queryEntries
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .join('&');

  // Only `host` is signed so the browser doesn't need to pin its
  // Content-Type to anything specific — keeps the upload tolerant
  // of whatever the File object happens to report.
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning)
    .update(stringToSign)
    .digest('hex');

  const fullQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  const uploadUrl = `https://${host}${canonicalUri}?${fullQuery}`;
  const publicUrl = cfg.publicBaseUrl
    ? `${cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`
    : `https://${host}${canonicalUri}`;

  return { uploadUrl, publicUrl, key };
}

function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}
