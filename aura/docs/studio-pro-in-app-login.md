# Studio Pro in-app login — "Sign in with AURA" (OAuth 2.0 + PKCE)

Server-side contract for the desktop **Sign in with AURA** flow. Authorization
Code + PKCE (S256) for a **public** desktop client (no client secret). The old
8-character pairing code flow is unchanged and remains available for admins /
headless machines.

## Endpoints & client

| | |
|---|---|
| Authorization endpoint | `GET /api/v1/studio-auth/authorize` |
| Token endpoint | `POST /api/v1/studio-auth/token` |
| Refresh (unchanged) | `POST /api/v1/device-tokens/refresh` |
| Revoke (unchanged) | `DELETE /api/v1/stations/{stationId}/devices/{deviceId}` (AURA panel) |
| `client_id` | `studio-pro-desktop` |
| `grant_type` | `authorization_code` |
| `code_challenge_method` | `S256` (only) |
| `client_secret` | none (public client) |

## Redirect URI rules (strict, exact match)

Only a loopback callback of this **exact** shape is accepted:

```
http://127.0.0.1:{port}/aura/callback
```

- `http` only (loopback), host is the literal `127.0.0.1` — **`localhost`, `::1`,
  any domain, and `https` are rejected**.
- Path must be exactly `/aura/callback`; **no query string or fragment**; no
  embedded credentials; `port` is any 1–65535.
- No wildcard/prefix matching. An invalid `client_id` or `redirect_uri` makes
  `/authorize` render an error page and **never redirect** (no open redirect).

## Flow

1. Desktop generates: a P-256 device keypair (stored in Keychain/Credential
   Manager), a PKCE `code_verifier` (43–128 chars, base64url) →
   `code_challenge = base64url(SHA256(code_verifier))`, and a random `state`.
2. Desktop starts a loopback listener on `http://127.0.0.1:{port}/aura/callback`.
3. Desktop opens the **system browser** at the authorization endpoint (below).
4. AURA authenticates the user (existing login **or account creation in the
   same flow**), lets them pick a station if they manage more than one, checks
   the Studio Pro entitlement, and shows a consent screen naming the computer.
5. On **Authorize**, the browser is redirected to
   `redirect_uri?code={code}&state={state}`. The loopback listener captures it.
6. Desktop verifies `state` matches, then calls the token endpoint with the
   `code`, its `code_verifier`, and a device proof.
7. AURA returns the same device credentials as the pairing flow. Store them;
   from then on the device uses the existing refresh-token rotation.

### Authorization request

```
GET /api/v1/studio-auth/authorize
  ?client_id=studio-pro-desktop
  &redirect_uri=http://127.0.0.1:49721/aura/callback
  &state=<random, ≥8 chars>
  &code_challenge=<base64url SHA256 of verifier, 43–128 chars>
  &code_challenge_method=S256
  &device_name=<e.g. "Studio Mac — Newsroom">
  &device_platform=windows|macos
  &device_public_key=<base64 DER SPKI of the P-256 public key>
  &device_key_algorithm=ES256
  [&scope=<space-separated subset of the default scopes>]
  [&ui_locales=en|pt|es]
```

Success → `302` to `/{locale}/studio-connect?...` (consent). After consent →
`302` to `redirect_uri?code=...&state=...`. Parameter errors → `400` HTML
error page (never a redirect).

Default scopes bound to the device: `station:read`, `station:content:request`,
`station:assets:read`, `station:events:write`.

### Token request

```
POST /api/v1/studio-auth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "studio-pro-desktop",
  "code": "aura_ac_...",
  "redirect_uri": "http://127.0.0.1:49721/aura/callback",
  "code_verifier": "<the PKCE verifier>",
  "device_proof": "<base64url ECDSA-P256/SHA-256 signature, DER-encoded>"
}
```

**`device_proof`** is an ES256 signature (the *same* scheme the pairing proof
already uses: ECDSA over P-256, SHA-256 digest, DER-encoded signature, then
base64url) over this exact message (`\n`-joined, no trailing newline):

```
studio-pro-auth-code-v1
<client_id>
<redirect_uri>
<code>
<device_fingerprint>
```

where `device_fingerprint = SHA256_hex(DER SPKI of the device public key)` —
the desktop computes it from its own public key. Binding the client, redirect
URI, code and fingerprint means a stolen code cannot be redeemed by a different
device, client or redirect.

### Token response — `201 Created` (same shape as the pairing flow)

```json
{
  "device": {
    "id": "uuid",
    "name": "Studio Mac — Newsroom",
    "platform": "macos",
    "activationSlot": 1,
    "scopes": ["station:read", "station:content:request", "station:assets:read", "station:events:write"],
    "deviceKeyFingerprint": "hex"
  },
  "station": { "id": "uuid", "name": "Joy Radio", "timezone": "America/Sao_Paulo", "defaultLanguage": "pt" },
  "tokenType": "Bearer",
  "accessToken": "aura_at_...",
  "accessTokenExpiresAt": "2026-07-21T12:15:00.000Z",
  "refreshToken": "aura_rt_...",
  "refreshTokenExpiresAt": "2026-10-19T12:00:00.000Z"
}
```

No web session cookie or password is ever returned to the desktop. Access
token TTL is 15 min; refresh token TTL is 90 days and rotates on use via the
existing `/api/v1/device-tokens/refresh`.

## Error codes

| Endpoint | HTTP | `error` | Meaning |
|---|---|---|---|
| authorize | 400 (HTML) | `invalid_request` | Malformed params / bad PKCE / bad device key |
| authorize | 400 (HTML) | `invalid_client` | Unknown `client_id` |
| authorize | 400 (HTML) | `invalid_redirect_uri` | Redirect URI not an allowed loopback |
| authorize | 429 | `rate_limited` | Too many requests from this IP |
| token | 400 | `invalid_request` | Malformed body |
| token | 401 | `invalid_client` | `client_id` mismatch |
| token | 400 | `invalid_grant` | Code missing/expired/**already used**, or client/redirect/**PKCE**/**device-proof** mismatch, or station disabled |
| token | 409 | `device_key_already_registered` | That device key is already active |
| token | 409 | `device_activation_limit_reached` | Station is at its device limit |
| token | 402 | `studio_license_inactive` | Entitlement not usable |
| token | 429 | `rate_limited` | Too many requests from this IP |

`invalid_grant` deliberately collapses several failure causes so the endpoint
can't be used to probe which codes exist.

## Security properties

- Password is only ever entered on `aurapress.app` in the system browser — never
  in a Studio Pro WebView. No `client_secret` in the app.
- PKCE **S256** and `state` are required; `state` is echoed back for the desktop
  to validate.
- Authorization code: high-entropy, single-use, **≤5-minute** TTL, stored only
  as a keyed hash, atomically consumed (replay → `invalid_grant`), and bound to
  client id, redirect URI, PKCE challenge, user, station and device public key.
- P-256/ES256 device proof-of-possession preserved at the token step.
- Public routes are rate-limited (token: 30/min/IP; authorize: 60/min/IP).
- Codes, tokens, verifiers, proofs, passwords, cookies and private keys are
  never logged.

## Studio Pro (desktop) implementation checklist

1. Generate/persist a P-256 keypair in Keychain (macOS) / Credential Manager
   (Windows). Export the public key as **DER SPKI, base64** → `device_public_key`.
2. Create `code_verifier` (43–128 chars, base64url) and
   `code_challenge = base64url(SHA256(code_verifier))`. Create a random `state`.
3. Bind a loopback listener on `127.0.0.1:{ephemeral port}`, route
   `/aura/callback`. Build `redirect_uri` from the chosen port.
4. Open the system browser to the authorization URL with all params above.
5. On the callback: reject if `state` ≠ the one you sent; otherwise read `code`.
6. Compute `device_fingerprint = SHA256_hex(DER SPKI)`. Build the proof message
   exactly as specified and sign it (same ECDSA-P256/SHA-256 DER→base64url
   scheme as your existing pairing proof) → `device_proof`.
7. `POST /api/v1/studio-auth/token` with `code`, `code_verifier`, `device_proof`,
   `client_id`, `redirect_uri`.
8. Store `device`, `accessToken`, `refreshToken` (+ expiries) in the vault.
   Refresh with `/api/v1/device-tokens/refresh` (rotating) as today. On restart,
   no new login is needed while the refresh token is valid.
9. Keep the "Pair with code" path as a secondary option.

## What is NOT included yet (server, tracked)

- Bundle billing: `studio_entitlement.source` accepts `bundle | standalone |
  trial | admin` and the bundle feature set (`studio_pro_desktop`, `aura_content`)
  is defined, but no Stripe product/price is created and no double-charge
  migration is wired — deferred by request.
- Ed25519 offline **license** signing remains inert (separate feature; see
  `studio-pro-licensing-threat-model.md`). This login flow does not depend on it.
