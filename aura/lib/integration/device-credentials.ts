import { createHmac, randomBytes, randomInt } from 'node:crypto';

const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACCESS_PREFIX = 'aura_at_';
const REFRESH_PREFIX = 'aura_rt_';

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

export function createPairingCode(): string {
  let raw = '';
  for (let i = 0; i < 8; i += 1) {
    raw += PAIRING_ALPHABET[randomInt(0, PAIRING_ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizePairingCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashPairingCode(code: string): string {
  return keyedHash(`pairing:${normalizePairingCode(code)}`);
}

export function hashDeviceToken(token: string): string {
  return keyedHash(`device:${token}`);
}

export function issueDeviceCredentials(now = new Date()) {
  const accessToken = `${ACCESS_PREFIX}${randomBytes(32).toString('base64url')}`;
  const refreshToken = `${REFRESH_PREFIX}${randomBytes(48).toString('base64url')}`;
  return {
    accessToken,
    accessTokenHash: hashDeviceToken(accessToken),
    accessTokenPrefix: accessToken.slice(0, 18),
    accessTokenExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS),
    refreshToken,
    refreshTokenHash: hashDeviceToken(refreshToken),
    refreshTokenExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
  };
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null;
  return token;
}

export function isAccessToken(token: string): boolean {
  return token.startsWith(ACCESS_PREFIX);
}

export function isRefreshToken(token: string): boolean {
  return token.startsWith(REFRESH_PREFIX);
}

function keyedHash(value: string): string {
  const key =
    process.env.DEVICE_TOKEN_PEPPER ??
    process.env.SECRETS_KEY ??
    process.env.BETTER_AUTH_SECRET;
  if (!key) {
    throw new Error(
      'DEVICE_TOKEN_PEPPER, SECRETS_KEY or BETTER_AUTH_SECRET must be configured'
    );
  }
  return createHmac('sha256', key).update(value).digest('hex');
}
