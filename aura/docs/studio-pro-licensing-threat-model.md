# Studio Pro licensing threat model

Status: server foundation implemented; desktop enforcement and production key
ceremony remain required before launch.

> ## ⚠️ Implementation status (2026-07) — licensing NOT yet enforced
>
> The Ed25519 offline-licensing scheme described below is **implemented on the
> server only**. The Studio Pro **desktop client does not yet verify license
> leases or signatures** — there is currently no client-side enforcement path.
>
> Consequences for operations, until the desktop client ships verification:
>
> - **Do NOT generate or install the production `STUDIO_LICENSE_PRIVATE_KEY`.**
>   Creating and deploying it now would imply an active protection that does
>   not exist. Leave it unset.
> - With the key unset, `POST /api/v1/stations/{stationId}/license` (lease
>   issuance) returns `503 studio_license_signing_unavailable`. That is the
>   **correct, safe state for now** — device pairing, content requests and
>   authenticated downloads all work without it; only the offline-license
>   feature is inert.
> - The private-key ceremony (generate outside the repo → store only as a
>   Vercel secret → hand the public key + `keyId` to the desktop team) must be
>   done **together with** the client change that consumes it, not before.
>
> This banner should be removed only once the desktop client verifies signed
> leases end-to-end.

## Security objective

No desktop application can make piracy mathematically impossible after an
attacker controls the machine. Studio Pro instead combines server-side value,
device-bound credentials, short online leases, signed offline rights and
concurrent-output enforcement so that copying or patching one binary does not
produce a useful, updateable or AURA-connected pirate installation.

The protection must also preserve radio continuity. A transient internet,
Stripe, Vercel or license-service failure must not stop audio already on air.

## Trust boundaries

- Stripe reports commercial subscription state; it never authenticates the
  desktop directly.
- AURA Postgres is authoritative for internal entitlements, activations,
  revocations, signed leases and output slots.
- The AURA license signing private key stays in protected server/CI secrets.
- Studio Pro embeds only license-verification public keys.
- Each desktop creates its own P-256 identity. The private key should be
  hardware-backed and non-exportable when the operating system supports it.
- React/Tauri UI and local SQLite state are untrusted for licensing decisions.
  The native Station Core verifies and enforces the signed claims.

## Threats and controls

| Threat | Primary controls | Residual risk |
|---|---|---|
| Installer copied publicly | Pairing code, two activation slots, active entitlement | Anyone can possess the installer; unauthorized use cannot activate cloud value |
| Access/refresh token copied | 15-minute access token, rotating refresh token, required P-256 refresh proof | A stolen live access token has a short misuse window |
| Local database copied | Device-key fingerprint binding and OS-protected private key | Malware running as the same user can still attack local processes |
| License token copied to another PC | Signed device ID and key fingerprint checked in native core | A fully patched native core may bypass local-only checks |
| App binary patched | Server enforces AURA content rights, device limits and output concurrency | Offline core playout can eventually be cracked by a determined reverser |
| Multiple stations share one account | Per-station device slots and short on-air output leases | Offline sites cannot be concurrency-checked until they reconnect |
| Local clock moved backwards | Signed server time, stored last-good time and offline ceiling | An attacker controlling storage and code can patch the check |
| License server unavailable | Seven-day signed offline window and safe restricted mode | Outages longer than the lease require an emergency support procedure |
| Payment fails | Stripe webhook moves entitlement to seven-day grace, then inactive | Missed webhooks require reconciliation against Stripe |
| Signing key leaks | `kid`-based rotation, audit events, server secret isolation | Installed clients need a trusted replacement key before old-key revocation |
| Update server compromised | Tauri update signatures plus OS code signing/notarization | Theft of both update and platform signing keys remains critical |

## Safe expiration state machine

```text
ONLINE
  -> online lease expires
OFFLINE_GRACE (maximum 7 days)
  -> entitlement/lease ceiling expires
SAFE_RESTRICTED
  -> finish current item/block at a defined safe boundary
  -> prohibit new schedules, cloud generation, remote control and updates
  -> retain local emergency/manual playout according to product policy
```

Studio Pro must never stop a playing item solely because a heartbeat, lease or
payment deadline crosses in the middle of that item. The UI should warn well
before each deadline and clearly distinguish connectivity, payment and device
revocation errors.

## Key lifecycle

1. Generate the Ed25519 license key offline; do not commit either key file.
2. Store the private PKCS#8 key as `STUDIO_LICENSE_PRIVATE_KEY` in protected
   production secrets and back it up in an encrypted owner-controlled vault.
3. Embed the public key and `STUDIO_LICENSE_KEY_ID` in the native Studio Pro
   verifier.
4. To rotate, ship a signed desktop update trusting both old and new public
   keys, switch AURA to the new `kid`, then retire the old key after all active
   offline leases and supported client versions have aged out.
5. If compromise is suspected, stop issuance, preserve audit data, rotate the
   key and platform signing credentials, revoke affected leases/devices, and
   publish a mandatory signed update.

## Production gates

- Keep the application-level persistent pairing limits enabled and add WAF
  limits as defense in depth; add equivalent limits to refresh and challenge
  endpoints before broad public rollout.
- Reconcile Stripe subscriptions to AURA entitlements on a scheduled job; do
  not rely only on webhook delivery.
- Alert on repeated invalid proofs, activation-slot conflicts, key reuse,
  clock skew, and concurrent-output conflicts.
- Run a desktop security review of the Rust/C++ enforcement path and verify
  that JavaScript cannot call privileged playout commands without native
  authorization.
- Sign Windows artifacts with a publicly trusted code-signing identity; sign,
  harden and notarize macOS artifacts; keep Tauri update signing independent.
- Exercise loss of internet, Stripe delay, expired card, license-server outage,
  revoked device, cloned storage, clock rollback and signing-key rotation in a
  preproduction radio simulation.
