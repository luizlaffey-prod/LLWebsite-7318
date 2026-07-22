#!/usr/bin/env node
/**
 * Studio Pro "Sign in with AURA" smoke test — headless HTTP checks.
 *
 * Runs the deterministic, DB-and-network-dependent security checks against a
 * deployed Preview. Must be run from an environment that CAN reach the Preview
 * host and after migration `0017_studio_auth_grant` is applied to the Preview's
 * Neon branch (the routes hit the `rate_limit` table first).
 *
 *   BASE_URL=https://<preview-host> node scripts/studio-auth-smoke.mjs
 *
 * Covers (automatable without a browser session):
 *   - authorize: invalid client_id / invalid redirect URIs → 400 error page (no redirect)
 *   - authorize: valid params, no session → 302 to /{locale}/studio-connect
 *   - token: malformed body → 400 invalid_request; unknown code → 400 invalid_grant
 *   - GET /api/v1/device without bearer → 401
 *   - old 8-char pairing exchange with bad input → 400 invalid_input
 *   - rate limiting on /authorize (60/min) and /token (30/min) → 429
 *
 * NOT covered here (require the interactive browser consent + a paired device;
 * run via Playwright or manually per runbook step 7): existing-account login,
 * account creation, station selection, PKCE happy path, expired code, code
 * replay, device registration, refresh rotation, revocation, station isolation,
 * missing entitlement. A correct P-256 device-proof helper is exported below so
 * those steps can be completed once a real authorization code is obtained.
 */
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';

const BASE = (process.env.BASE_URL || process.argv[2] || '').replace(/\/+$/, '');
if (!BASE) {
  console.error('Set BASE_URL or pass the Preview URL as the first argument.');
  process.exit(2);
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// A valid-looking P-256 SPKI public key (base64) + PKCE material, so authorize
// param validation reaches the redirect-rule checks rather than failing on the
// key. The key never has to be "trusted" for these negative tests.
const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const devicePublicKey = publicKey
  .export({ format: 'der', type: 'spki' })
  .toString('base64');
const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash('sha256').update(verifier).digest());
const state = b64url(randomBytes(12));

/** Proof helper matching the server's verifyDeviceSignature (ECDSA P-256 /
 *  SHA-256, DER signature, base64url). For the manual happy-path completion. */
export function studioAuthProof({ privateKey, clientId, redirectUri, code, deviceFingerprint }) {
  const message = [
    'studio-pro-auth-code-v1',
    clientId,
    redirectUri,
    code,
    deviceFingerprint,
  ].join('\n');
  return sign('sha256', Buffer.from(message, 'utf8'), privateKey).toString('base64url');
}

function authorizeUrl(overrides = {}) {
  const p = new URLSearchParams({
    client_id: 'studio-pro-desktop',
    redirect_uri: 'http://127.0.0.1:49721/aura/callback',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    device_name: 'Smoke Test',
    device_platform: 'macos',
    device_public_key: devicePublicKey,
    device_key_algorithm: 'ES256',
    ...overrides,
  });
  return `${BASE}/api/v1/studio-auth/authorize?${p.toString()}`;
}

async function main() {
  // 1. authorize — invalid client_id → 400, no redirect.
  {
    const r = await fetch(authorizeUrl({ client_id: 'bogus' }), { redirect: 'manual' });
    record('authorize invalid client_id → 400 (no redirect)', r.status === 400 && !r.headers.get('location'), `HTTP ${r.status}`);
  }

  // 2. authorize — invalid redirect URIs → 400, no redirect.
  for (const bad of [
    'http://localhost:49721/aura/callback',
    'http://[::1]:49721/aura/callback',
    'https://127.0.0.1:49721/aura/callback',
    'http://127.0.0.1:49721/evil',
    'http://127.0.0.1/aura/callback',
    'http://attacker.com/aura/callback',
    'http://127.0.0.1:49721/aura/callback?x=1',
  ]) {
    const r = await fetch(authorizeUrl({ redirect_uri: bad }), { redirect: 'manual' });
    record(`authorize rejects redirect ${bad}`, r.status === 400 && !r.headers.get('location'), `HTTP ${r.status}`);
  }

  // 3. authorize — valid params, no session → 302 to the consent page.
  {
    const r = await fetch(authorizeUrl(), { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    record('authorize valid → 302 to /studio-connect', r.status === 302 && /\/studio-connect/.test(loc), `HTTP ${r.status} → ${loc.slice(0, 60)}`);
  }

  // 4. token — malformed body → 400 invalid_request.
  {
    const r = await fetch(`${BASE}/api/v1/studio-auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"grant_type":"authorization_code"}' });
    const j = await r.json().catch(() => ({}));
    record('token malformed body → 400 invalid_request', r.status === 400 && j.error === 'invalid_request', `HTTP ${r.status} ${j.error || ''}`);
  }

  // 5. token — unknown code → 400 invalid_grant.
  {
    const body = { grant_type: 'authorization_code', client_id: 'studio-pro-desktop', code: `aura_ac_${b64url(randomBytes(32))}`, redirect_uri: 'http://127.0.0.1:49721/aura/callback', code_verifier: verifier, device_proof: b64url(randomBytes(70)) };
    const r = await fetch(`${BASE}/api/v1/studio-auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    record('token unknown code → 400 invalid_grant', r.status === 400 && j.error === 'invalid_grant', `HTTP ${r.status} ${j.error || ''}`);
  }

  // 6. GET /api/v1/device without bearer → 401.
  {
    const r = await fetch(`${BASE}/api/v1/device`);
    record('device without bearer → 401', r.status === 401, `HTTP ${r.status}`);
  }

  // 7. old pairing exchange bad input → 400 invalid_input (compat check).
  {
    const r = await fetch(`${BASE}/api/v1/device-pairings/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => ({}));
    record('old pairing exchange bad input → 400', r.status === 400 && j.error === 'invalid_input', `HTTP ${r.status} ${j.error || ''}`);
  }

  // 8. rate limit — token 30/min/IP → 429 within ~40 rapid calls.
  {
    let got429 = false;
    for (let i = 0; i < 40 && !got429; i += 1) {
      const r = await fetch(`${BASE}/api/v1/studio-auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (r.status === 429) got429 = true;
    }
    record('token rate limit → 429', got429, got429 ? 'hit 429' : 'no 429 within 40 calls');
  }

  // 9. rate limit — authorize 60/min/IP → 429 within ~80 rapid calls.
  {
    let got429 = false;
    for (let i = 0; i < 80 && !got429; i += 1) {
      const r = await fetch(authorizeUrl(), { redirect: 'manual' });
      if (r.status === 429) got429 = true;
    }
    record('authorize rate limit → 429', got429, got429 ? 'hit 429' : 'no 429 within 80 calls');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('smoke run error:', e?.message || e);
  process.exit(2);
});
