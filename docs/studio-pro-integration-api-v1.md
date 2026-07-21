# AURA ↔ Studio Pro Integration API v1

Status: integration and commercial-licensing foundation complete on the
`codex/aura-integration-api` branch. This document is the contract between
AURA Cloud and Studio Pro; it is not a replacement for AURA's existing browser
API.

## Boundary

- AURA owns editorial inputs, scripts, voices, generation jobs and the produced
  audio object.
- Studio Pro owns clocks, exact playout timing, local cache, queue decisions and
  the factual record of what aired.
- Studio Pro always initiates the connection. No inbound port or webhook on the
  studio computer is required.
- Existing AURA users, automations and `generated_audio` ownership remain
  unchanged.

## Security model

1. A signed-in AURA owner/admin bootstraps an organization, station and 14-day
   Studio Pro trial entitlement.
2. The owner/admin creates a one-time pairing code. Codes expire after 10
   minutes and are stored only as keyed hashes.
3. Studio Pro generates a non-exportable P-256 key when possible and submits
   the public key plus a pairing signature. The private key remains in Windows
   DPAPI/TPM or macOS Keychain/Secure Enclave storage.
4. AURA assigns one of the licensed device slots. The default policy permits
   two devices per station: primary and hot standby.
5. Studio Pro receives a 15-minute access token and rotating 90-day refresh
   token. Refresh requires a valid signature from the registered device key,
   so a copied database or refresh token is insufficient.
6. License-sensitive operations use a five-minute, single-use challenge and a
   device-key proof over the exact request payload.
7. AURA issues an Ed25519-signed license lease. The private signing key exists
   only in AURA; Studio Pro embeds the corresponding public key.
8. The signed lease is valid for online renewal for 24 hours and permits safe
   offline operation for no more than seven days, never beyond the trial or
   payment-grace deadline.
9. A short heartbeat atomically reserves the licensed on-air output slot. The
   default is one simultaneous on-air output; an abandoned slot expires after
   90 seconds.
10. Every device, license lease and live output slot can be revoked
    independently, with an audit event retained in AURA.

Production must set `DEVICE_TOKEN_PEPPER` to a dedicated random secret of at
least 32 characters. The implementation falls back to `SECRETS_KEY` or
`BETTER_AUTH_SECRET` only to keep existing development environments bootable.
Production license issuance also requires `STUDIO_LICENSE_PRIVATE_KEY`, an
Ed25519 PKCS#8 private key, and a stable `STUDIO_LICENSE_KEY_ID`. Never put the
private key in the repository or desktop build.

## Main flow

```text
AURA user session                  Studio Pro device
       |                                  |
       | POST /integration/bootstrap      |
       | POST /stations/{id}/pairing-codes|
       |---------------- pairing code --->|
       |                                  | POST /device-pairings/exchange
       |                                  |<-- access + refresh token
       |                                  |
       |                                  | POST /licenses/challenge (lease)
       |                                  | sign challenge + exact payload
       |                                  | POST /licenses/lease
       |                                  |<-- signed 24h/7d license lease
       |                                  | POST /licenses/heartbeat every 30s
       |                                  |<-- licensed on-air output slot
       |                                  |
       |                                  | POST /content-requests
       |                                  |<-- 202 + request id
       |                                  | GET request until ready
       |                                  | GET authenticated asset download
       |                                  | verify SHA-256, cache atomically
       |                                  | POST downloaded/queued/aired event
```

## Endpoints

Human/session endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/integration/bootstrap` | Create or return the first organization/station for the signed-in AURA user |
| `POST` | `/api/v1/stations/{stationId}/pairing-codes` | Create a one-time device code; owner/admin only |
| `GET` | `/api/v1/stations/{stationId}/devices` | List paired devices; owner/admin only |
| `DELETE` | `/api/v1/stations/{stationId}/devices/{deviceId}` | Revoke a device and both credentials |
| `GET` | `/api/v1/stations/{stationId}/license` | Inspect entitlement, active devices/outputs and recent license audit events |

Public credential endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/device-pairings/exchange` | Exchange a valid one-time code for device credentials |
| `POST` | `/api/v1/device-tokens/refresh` | Rotate both access and refresh tokens |

The refresh request includes `refreshProof`, a P-256 signature over the device
ID and SHA-256 of the presented refresh token.

Canonical signature messages are UTF-8 strings joined by line feeds, with no
trailing line feed:

```text
studio-pro-pairing-v1
<pairing code normalized to eight uppercase characters>
<trimmed device name>
<windows|macos>
<lowercase SHA-256 of canonical SPKI DER>

studio-pro-token-refresh-v1
<device UUID>
<lowercase SHA-256 of the opaque refresh token>

studio-pro-device-proof-v1
<lease|heartbeat|deactivate>
<challenge UUID>
<base64url challenge>
<device UUID>
<station UUID>
<SHA-256 of the canonical JSON request payload excluding proof>
```

P-256 signatures use SHA-256, ASN.1 DER encoding and base64url transport. The
license token uses Ed25519 and compact `header.payload.signature` transport.

Device bearer endpoints:

| Method | Path | Required scope |
|---|---|---|
| `GET` | `/api/v1/device` | `station:read` |
| `POST` | `/api/v1/stations/{stationId}/content-requests` | `station:content:request` |
| `GET` | `/api/v1/stations/{stationId}/content-requests` | `station:read` |
| `GET` | `/api/v1/stations/{stationId}/content-requests/{requestId}` | `station:read` |
| `GET` | `/api/v1/stations/{stationId}/assets/{audioId}/download` | `station:assets:read` |
| `POST` | `/api/v1/stations/{stationId}/events` | `station:events:write` |

License endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/licenses/challenge` | Create a one-use proof challenge for `lease`, `heartbeat` or `deactivate` |
| `POST` | `/api/v1/licenses/lease` | Issue an Ed25519-signed device-bound offline lease |
| `POST` | `/api/v1/licenses/heartbeat` | Acquire, renew, release or relinquish an on-air output slot |
| `GET` | `/api/v1/licenses/status` | Read entitlement, activation slot and current lease state |
| `POST` | `/api/v1/licenses/deactivate` | Self-deactivate after device-key proof |

`POST /content-requests` now requires the `aura_content` entitlement, and asset
downloads require a commercially usable trial/subscription/grace state. The UI
or local SQLite database is never authoritative for a paid feature.

## Commercial policy encoded in v1

| Policy | Default |
|---|---|
| License unit | One station / one simultaneous on-air output |
| Activated devices | Two per station |
| Online lease renewal | Every 24 hours |
| Maximum offline operation | Seven days |
| Payment failure grace | Seven days |
| Trial | Fourteen days |
| On-air heartbeat | Every 30 seconds; slot expires after 90 seconds |
| Expiration behavior | `safe_restricted`; Studio Pro must not cut current audio |

The signed claim includes organization, station, device-key fingerprint, plan,
feature list, limits, server time, online expiration, offline ceiling and the
mandatory `safe_restricted` expiration mode. Studio Pro must persist the last
verified server time and treat a large backwards clock movement as suspicious.

Stripe subscription events provision the internal entitlement only when the
subscription matches `STRIPE_PRICE_STUDIO_PRO`,
`STRIPE_PRICE_STUDIO_ENTERPRISE`, or carries `studio_pro_plan=studio_pro` /
`enterprise` metadata. Existing AURA subscription prices are deliberately not
treated as Studio Pro licenses. This avoids accidentally giving desktop rights
before the Studio Pro catalog and pricing are approved.

## Idempotency and job recovery

`POST /content-requests` requires an `Idempotency-Key` header between 8 and
128 characters. Reusing the key with the same normalized body returns the
existing resource; reusing it with a different body returns `409`.

The route returns `202` and uses Next.js `after()` for immediate background
generation. `/api/cron/integration-content` runs every five minutes as a
recovery path and safely claims pending jobs. Processing rows older than 15
minutes are made eligible for retry. Database state transitions prevent two
workers from producing the same request simultaneously.

For higher volume, replace the `after()` + cron trigger with Inngest while
keeping `processContentRequest()` and this external contract unchanged.

## Example content request

```http
POST /api/v1/stations/8da1.../content-requests HTTP/1.1
Authorization: Bearer aura_at_...
Idempotency-Key: clock-2026-07-21T13:00:00Z-news
Content-Type: application/json

{
  "kind": "news_bulletin",
  "source": {
    "mode": "search",
    "categories": ["politics", "economy"],
    "bias": "center",
    "geographicScope": "country",
    "location": "Brazil"
  },
  "durationSeconds": 60,
  "language": "pt",
  "includeWeather": true,
  "weatherLocation": "São Paulo",
  "scheduledFor": "2026-07-21T13:00:00-03:00",
  "validForSeconds": 7200
}
```

When ready, the resource contains an authenticated `downloadUrl`, byte count
and SHA-256. Studio Pro must download to a temporary file, verify the hash and
only then atomically move it into its playout cache.

## Station events

Accepted event types:

- `asset_downloaded`
- `asset_validated`
- `asset_queued`
- `asset_aired`
- `asset_skipped`
- `asset_failed`

Events have their own device-scoped idempotency key. `occurredAt` is the time
recorded by Studio Pro; `createdAt` is the AURA ingestion time. Payload can
carry deck, planned start, actual start, duration and a failure reason.

## Deployment checklist

1. Back up Neon and apply `drizzle/0011_automation_lead_time.sql`,
   `drizzle/0012_studio_pro_integration.sql`, then
   `drizzle/0013_studio_pro_licensing.sql`.
2. The licensing migration revokes any pre-key legacy device rows; those
   devices must pair again to establish a P-256 identity.
3. Set `DEVICE_TOKEN_PEPPER`, `STUDIO_LICENSE_PRIVATE_KEY`,
   `STUDIO_LICENSE_KEY_ID` and confirm `CRON_SECRET` in Vercel. Back up the
   Ed25519 key securely; losing it prevents already-installed clients from
   trusting future leases after a key change.
4. Configure Studio Pro Stripe prices and ensure the checkout subscription has
   `user_id` metadata. Bootstrap the organization before checkout so the first
   webhook can provision its entitlement.
5. Deploy to Preview first and run pairing, refresh-proof, challenge, lease,
   heartbeat, content, download, revoke and offline-expiry smoke flows.
6. Confirm existing browser generation, automations, Stripe and local-folder
   delivery still pass.
7. Enable one beta station, monitor license denials, duplicated activations,
   output-slot conflicts, generation latency and checksum failures before
   expanding access.

`/api/cron/studio-licensing` runs every ten minutes to remove expired
challenges/output reservations and mark offline leases expired. Expiration is
also enforced directly in every request, so cleanup timing is not an
authorization boundary.

Security baseline checked on 2026-07-21: Next.js was moved from 15.1.11 to
15.5.20, Better Auth to 1.6.13+ and Drizzle ORM to 0.45.2. `npm audit
--omit=dev` reports no high or critical production advisories. Six moderate
advisories remain in UI/e-mail dependencies and require separate breaking
upgrades; none is part of the Studio Pro bearer-token path.

## Known boundaries of v1

- The generated asset is MP3. Broadcast WAV and explicit loudness metadata are
  planned contract additions.
- One organization billing user pays the existing AURA quota.
- Pairing and refresh routes should receive edge/WAF rate limits in production.
- Stripe product/price creation and the customer-facing Studio Pro checkout UI
  are commercial rollout tasks; the secure webhook adapter is present but no
  production price ID is invented by this branch.
- Studio Pro must implement OS-key storage, signed-lease verification, clock
  rollback handling and safe restricted mode. This repository implements the
  AURA/server half of that contract.
- This branch does not deploy or migrate production automatically.
