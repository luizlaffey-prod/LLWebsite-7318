import { describe, expect, it, vi } from 'vitest';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';

// The route pulls in server-only + the DB-backed rate limiter. Stub those so
// the handler runs in the node test env; everything else (param parsing, the
// redirect-URI policy, PKCE + device-key checks) runs for real.
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({ db: {} }));
vi.mock('@/lib/integration/rate-limit-store', () => ({
  enforceRateLimit: vi.fn(async () => {}),
  rateLimitClientKey: () => 'test-key',
}));

import { GET } from './route';

function validDevicePublicKey(): string {
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
}

function buildRequest(overrides: Record<string, string> = {}): Request {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const params: Record<string, string> = {
    client_id: 'studio-pro-desktop',
    redirect_uri: 'http://127.0.0.1:49721/aura/callback',
    state: 'abcdefgh',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    device_name: 'Smoke Test',
    device_platform: 'macos',
    device_public_key: validDevicePublicKey(),
    device_key_algorithm: 'ES256',
    ...overrides,
  };
  const qs = new URLSearchParams(params).toString();
  return new Request(`https://preview.vercel.app/api/v1/studio-auth/authorize?${qs}`);
}

describe('GET /api/v1/studio-auth/authorize (route boundary)', () => {
  it('a valid loopback redirect reaches the 302 consent redirect', async () => {
    for (const port of ['1', '49152', '49721', '65535']) {
      const res = await GET(
        buildRequest({ redirect_uri: `http://127.0.0.1:${port}/aura/callback` })
      );
      expect(res.status, `port ${port}`).toBe(302);
      expect(res.headers.get('location') ?? '', `port ${port}`).toMatch(
        /\/studio-connect\?/
      );
    }
  });

  it('accepts the exact localhost alias and redirects to the NUMERIC loopback', async () => {
    // Simulates the platform substituting 127.0.0.1 → localhost. The 302
    // Location must carry the encoded numeric callback and never `localhost`.
    const res = await GET(
      buildRequest({ redirect_uri: 'http://localhost:49721/aura/callback' })
    );
    expect(res.status).toBe(302);
    const loc = res.headers.get('location') ?? '';
    expect(loc).toContain('%2F%2F127.0.0.1%3A49721%2Faura%2Fcallback');
    expect(loc).not.toContain('localhost');
  });

  it('keeps the rejection matrix intact (400, no redirect)', async () => {
    const bad = [
      // NB: a plain `http://localhost:{port}/aura/callback` is now accepted and
      // canonicalized to the numeric form (see the test above) — it is no
      // longer in the reject matrix. Look-alikes must still be rejected:
      'http://localhost.evil.com:49721/aura/callback',
      'http://user:pass@localhost:49721/aura/callback',
      'http://localhost:0/aura/callback', // port 0
      'http://localhost:99999/aura/callback', // out of range
      'http://[::1]:49721/aura/callback',
      'https://127.0.0.1:49721/aura/callback',
      'http://127.0.0.1/aura/callback', // missing port
      'http://127.0.0.1:49721/evil', // wrong path
      'http://127.0.0.1:49721/aura/callback?x=1', // query
      'http://127.0.0.1:49721/aura/callback#f', // fragment
      'http://user:pass@127.0.0.1:49721/aura/callback', // credentials
      'http://attacker.com/aura/callback', // external
    ];
    for (const redirect_uri of bad) {
      const res = await GET(buildRequest({ redirect_uri }));
      expect(res.status, redirect_uri).toBe(400);
      expect(res.headers.get('location'), redirect_uri).toBeNull();
    }
  });

  it('rejects an unknown client_id and a bad PKCE challenge', async () => {
    expect((await GET(buildRequest({ client_id: 'nope' }))).status).toBe(400);
    expect((await GET(buildRequest({ code_challenge: 'short' }))).status).toBe(400);
  });
});
