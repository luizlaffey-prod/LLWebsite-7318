import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Pure OAuth policy for the Studio Pro "Sign in with AURA" desktop flow.
 * No DB, no server-only imports, so this is fully unit-testable. It owns the
 * security-critical decisions: PKCE S256 verification, the strict loopback
 * redirect-URI rules, and the P-256 device-proof message binding.
 */

/** The single public desktop client. No client secret. */
export const STUDIO_PRO_CLIENT_ID = 'studio-pro-desktop';

/** Authorization codes live at most 5 minutes (spec ceiling). */
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

/** Only PKCE S256 is accepted — never 'plain'. */
export const PKCE_METHOD = 'S256' as const;

const B64URL = /^[A-Za-z0-9_-]+$/;

/** RFC 7636 code_challenge: 43–128 chars, base64url. */
export function isValidCodeChallenge(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 43 &&
    value.length <= 128 &&
    B64URL.test(value)
  );
}

/** RFC 7636 code_verifier: 43–128 chars, unreserved (base64url covers it). */
export function isValidCodeVerifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 43 &&
    value.length <= 128 &&
    B64URL.test(value)
  );
}

/** S256 transform: BASE64URL(SHA256(ASCII(verifier))). */
export function pkceChallengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/**
 * Verifies a PKCE code_verifier against the stored S256 challenge in constant
 * time. Returns false for malformed input rather than throwing.
 */
export function verifyPkceS256(verifier: string, storedChallenge: string): boolean {
  if (!isValidCodeVerifier(verifier) || typeof storedChallenge !== 'string') {
    return false;
  }
  const computed = pkceChallengeFromVerifier(verifier);
  const a = Buffer.from(computed);
  const b = Buffer.from(storedChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Strict redirect-URI rule for the public desktop client: **only** a loopback
 * callback of the exact form `http://127.0.0.1:{port}/aura/callback`.
 *
 * Rejected: https, any host other than the literal `127.0.0.1` (so `localhost`,
 * `::1`, and every external domain are refused), any other path, any query or
 * fragment, embedded credentials, and out-of-range ports. This closes open-
 * redirect and SSRF-style abuse — there is no wildcard matching.
 */
export function isValidLoopbackRedirectUri(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:') return false;
  if (u.hostname !== '127.0.0.1') return false;
  if (u.pathname !== '/aura/callback') return false;
  if (u.search !== '' || u.hash !== '') return false;
  if (u.username !== '' || u.password !== '') return false;
  if (u.port === '') return false; // an explicit port is required
  const port = Number(u.port);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * The message the desktop signs (P-256/ES256) at the token step to prove it
 * holds the private key matching the public key bound to the grant. Binding
 * the client id, redirect URI, code and device fingerprint stops a stolen
 * code from being redeemed by a different device or client.
 */
export function studioAuthProofMessage(input: {
  clientId: string;
  redirectUri: string;
  code: string;
  deviceFingerprint: string;
}): string {
  return [
    'studio-pro-auth-code-v1',
    input.clientId,
    input.redirectUri,
    input.code,
    input.deviceFingerprint,
  ].join('\n');
}
