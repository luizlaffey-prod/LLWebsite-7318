import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * AES-256-GCM symmetric encryption for storing credentials (FTP, API tokens)
 * in the database. The key is derived from BETTER_AUTH_SECRET via scrypt so
 * we don't need a second secret — but a dedicated SECRETS_KEY is honored
 * when set, for environments that want to rotate independently.
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const SALT = 'aura-secrets-v1';

function getKey(): Buffer {
  const material =
    process.env.SECRETS_KEY ?? process.env.BETTER_AUTH_SECRET ?? '';
  if (!material) {
    throw new Error('Cannot derive secrets key: BETTER_AUTH_SECRET (or SECRETS_KEY) is unset.');
  }
  return scryptSync(material, SALT, 32);
}

export function encryptJSON(value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const key = getKey();
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptJSON<T = unknown>(blob: string): T {
  const [ivB64, tagB64, ctB64] = blob.split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('invalid_encrypted_blob');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}
