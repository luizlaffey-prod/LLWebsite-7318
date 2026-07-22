import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  AUTH_CODE_TTL_MS,
  isValidCodeChallenge,
  isValidCodeVerifier,
  isValidLoopbackRedirectUri,
  pkceChallengeFromVerifier,
  STUDIO_PRO_CLIENT_ID,
  studioAuthProofMessage,
  verifyPkceS256,
} from './studio-auth-policy';

describe('Studio Pro OAuth — client + code TTL', () => {
  it('exposes the stable public client id and a ≤5-minute code TTL', () => {
    expect(STUDIO_PRO_CLIENT_ID).toBe('studio-pro-desktop');
    expect(AUTH_CODE_TTL_MS).toBeLessThanOrEqual(5 * 60 * 1000);
    expect(AUTH_CODE_TTL_MS).toBeGreaterThan(0);
  });
});

describe('Studio Pro OAuth — PKCE S256', () => {
  const verifier = randomBytes(32).toString('base64url'); // 43 chars

  it('accepts a valid verifier/challenge pair', () => {
    const challenge = pkceChallengeFromVerifier(verifier);
    expect(isValidCodeVerifier(verifier)).toBe(true);
    expect(isValidCodeChallenge(challenge)).toBe(true);
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it('rejects an incorrect code_verifier', () => {
    const challenge = pkceChallengeFromVerifier(verifier);
    const wrong = randomBytes(32).toString('base64url');
    expect(verifyPkceS256(wrong, challenge)).toBe(false);
  });

  it('rejects a malformed verifier and never throws', () => {
    const challenge = pkceChallengeFromVerifier(verifier);
    expect(verifyPkceS256('too-short', challenge)).toBe(false);
    expect(verifyPkceS256(verifier, 'not-the-challenge')).toBe(false);
    expect(isValidCodeVerifier('x'.repeat(200))).toBe(false);
  });
});

describe('Studio Pro OAuth — loopback redirect URI (strict)', () => {
  it('accepts only http://127.0.0.1:{port}/aura/callback', () => {
    expect(isValidLoopbackRedirectUri('http://127.0.0.1:49152/aura/callback')).toBe(true);
    expect(isValidLoopbackRedirectUri('http://127.0.0.1:1/aura/callback')).toBe(true);
  });

  it('rejects localhost, IPv6 loopback, external hosts and https', () => {
    for (const bad of [
      'http://localhost:49152/aura/callback',
      'http://[::1]:49152/aura/callback',
      'http://127.0.0.1:49152/evil',
      'http://127.0.0.1/aura/callback', // no port
      'http://127.0.0.1:49152/aura/callback?x=1', // query
      'http://127.0.0.1:49152/aura/callback#f', // fragment
      'https://127.0.0.1:49152/aura/callback', // https
      'http://attacker.com/aura/callback',
      'http://user:pass@127.0.0.1:49152/aura/callback',
      'http://127.0.0.1:99999/aura/callback', // out of range
      'not a url',
      '',
    ]) {
      expect(isValidLoopbackRedirectUri(bad), bad).toBe(false);
    }
  });
});

describe('Studio Pro OAuth — device proof binding', () => {
  it('binds client id, redirect uri, code and fingerprint (order-stable)', () => {
    const msg = studioAuthProofMessage({
      clientId: 'studio-pro-desktop',
      redirectUri: 'http://127.0.0.1:5000/aura/callback',
      code: 'aura_ac_abc',
      deviceFingerprint: 'ff00',
    });
    expect(msg).toBe(
      'studio-pro-auth-code-v1\nstudio-pro-desktop\nhttp://127.0.0.1:5000/aura/callback\naura_ac_abc\nff00'
    );
    // Changing any bound field changes the message (so a stolen code can't be
    // redeemed by a different device/client/redirect).
    const other = studioAuthProofMessage({
      clientId: 'studio-pro-desktop',
      redirectUri: 'http://127.0.0.1:5000/aura/callback',
      code: 'aura_ac_abc',
      deviceFingerprint: 'ee11',
    });
    expect(other).not.toBe(msg);
  });
});
