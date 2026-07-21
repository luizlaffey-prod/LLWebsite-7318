# Studio Pro — Preview validation runbook (do NOT execute yet)

This runbook describes, **without executing anything**, how to validate the
Studio Pro Integration API on a **Preview** deployment against an **isolated
database branch** before any production change. Nothing here should be run
until explicitly approved.

**Hard stops (until sign-off):**

- ❌ No merge to `main`.
- ❌ No production migration.
- ❌ No production promotion.
- ❌ Do **not** generate/install the production `STUDIO_LICENSE_PRIVATE_KEY`
  — desktop-client license verification is not implemented yet (see
  `studio-pro-licensing-threat-model.md`). Licensing stays inert; the lease
  endpoint returns `503 studio_license_signing_unavailable`, which is fine.

Migrations introduced by this work (already renumbered to avoid colliding
with `0012_articles` / `0013_publishing`):

- `drizzle/0014_studio_pro_integration.sql`
- `drizzle/0015_studio_pro_licensing.sql`

---

## 1. Confirm the real migration history in Neon

Goal: know exactly which migrations are already live before touching anything.

- In the **Neon Console → the production project → the production branch**,
  open the SQL Editor and inspect what actually exists:
  - List Studio Pro / articles tables to see what's already applied:
    ```sql
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'article','publishing_connection',
        'organization','station','station_device','device_pairing_code',
        'integration_content_request','station_event','studio_entitlement',
        'studio_license_challenge','studio_license_lease','studio_output_lease',
        'studio_license_event'
      )
    ORDER BY table_name;
    ```
  - If this project also tracks a Drizzle migrations table, check it:
    ```sql
    SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;  -- if present
    ```
- Record the result. Expectation for the Studio Pro tables: **absent** on
  production today. If any already exist, stop and reconcile before migrating.

> Note: this project applies migrations **manually via the Neon SQL editor**,
> not `drizzle-kit migrate`. `_journal.json` is documentation-level here.

## 2. Create an isolated database branch for Preview

Goal: never test schema changes on production data.

- In the **Neon Console → Branches**, create a branch from the production
  branch, e.g. `preview-studio-pro`. This is a copy-on-write branch — cheap
  and fully isolated.
- Copy that branch's pooled connection string. It becomes the Preview
  `DATABASE_URL` (step 4). Do not paste it into this repo or into chat.

## 3. Apply `0014` then `0015` to the Preview branch — transactionally

Goal: migrate the isolated branch, not production.

**Do NOT treat these migrations as blindly repeatable.** The files carry
`IF NOT EXISTS` / `DO $$ … EXCEPTION` guards, but those are a safety net, not
a substitute for verification. Apply **each** migration inside an explicit
transaction with a **preflight** and a **post-verification**; on any
divergence from the expected state, `ROLLBACK` and stop.

With the **`preview-studio-pro` branch selected** in the Neon SQL Editor, do
the following for `0014` first, then repeat for `0015`:

1. **Preflight** — confirm the migration hasn't already run (expect the
   objects it creates to be absent):
   ```sql
   -- before 0014:
   SELECT to_regclass('public.station')              AS station,
          to_regclass('public.integration_content_request') AS content_req;
   -- before 0015:
   SELECT to_regclass('public.studio_license_lease') AS lease,
          to_regclass('public.studio_entitlement')   AS entitlement;
   ```
   If anything is already non-NULL, **stop and reconcile** — do not re-run.

2. **Apply in one transaction** (paste the full file body between the markers):
   ```sql
   BEGIN;
   -- >>> full contents of drizzle/0014_studio_pro_integration.sql
   -- <<<
   -- Do NOT COMMIT yet — run the post-verification below in the same session.
   ```

3. **Post-verification** — run before committing:
   ```sql
   -- after 0014 — expect 6:
   SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN
     ('organization','station','station_device','device_pairing_code',
      'integration_content_request','station_event');
   -- after 0015 — expect 5, and legacy revocation must have touched nothing:
   SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN
     ('studio_entitlement','studio_license_challenge','studio_license_lease',
      'studio_output_lease','studio_license_event');
   SELECT count(*) AS revoked_legacy FROM station_device WHERE status='revoked';
   ```

4. **Decide**:
   - All counts match (6 / 5) **and** `revoked_legacy = 0` → `COMMIT;`
   - Any mismatch, or `0015` revoked a device on this fresh branch →
     `ROLLBACK;` and **stop** to investigate before retrying.

> ⚠️ `0015` revokes legacy devices lacking a P-256 identity. On a fresh
> branch there are none, so `revoked_legacy` must be `0`; a non-zero value
> means the branch wasn't as expected — roll back.

## 4. Configure secrets on Preview only

Goal: give the Preview deployment what it needs — nothing production.

In **Vercel → Project → Settings → Environment Variables**, scoped to
**Preview** (not Production):

- `DATABASE_URL` → the `preview-studio-pro` branch connection string (step 2).
- `DEVICE_TOKEN_PEPPER` → a Preview-only random ≥32-char secret
  (`openssl rand -base64 32`). Distinct from any production value.
- `CRON_SECRET` → confirm a value exists for Preview (crons 500 without it).
- `STRIPE_PRICE_STUDIO_PRO` / `STRIPE_PRICE_STUDIO_ENTERPRISE` → only if the
  real test-mode prices exist; otherwise leave blank (entitlement falls back
  to trial).
- `STUDIO_LICENSE_PRIVATE_KEY` / `STUDIO_LICENSE_KEY_ID` → **leave unset.**
  Licensing stays inert by design; the lease endpoint returns `503`. (If you
  later want to exercise the lease path in Preview, a *throwaway* Preview-only
  Ed25519 key may be generated — never the production key, never committed.)

Then trigger a **Preview deploy of this PR's commit** (do not promote).

## 5. Run the smoke tests on Preview

Use a **beta/test owner account** — do not spend meaningful quota on a real
account. Base URL = the Preview deployment URL.

1. **Bootstrap** the station (`POST /api/v1/integration/bootstrap`).
2. Confirm **entitlement** has feature `aura_content` and a valid **default
   voice** is set (set one in the Estúdio Pro panel if missing).
3. **Generate a pairing code** (panel or `POST …/pairing-codes`).
4. **Pair a P-256 test device** (`POST /api/v1/device-pairings/exchange`).
5. `GET /api/v1/device` with the bearer → device profile.
6. **Refresh** access/refresh tokens using the device signature.
7. Create a **content request** with an `Idempotency-Key`.
8. Repeat same key + same payload → **idempotent replay**; same key +
   different payload → **`409`**.
9. Poll pending → processing → **ready**.
10. **Download** the authenticated MP3; verify **bytes + SHA-256** match.
11. Register at least one **`asset_validated`** event.
12. **Revoke** the device; confirm its credentials stop working.
13. **Crons — Preview does NOT fire them automatically.** Vercel only runs the
    `vercel.json` cron schedules on Production deployments, so on Preview you
    must invoke both endpoints **manually**, authenticated with the Preview
    `CRON_SECRET` (`GET` with `Authorization: Bearer <CRON_SECRET>`), and
    record the JSON response **and** the Vercel function logs for each:
    ```bash
    curl -si "$PREVIEW/api/cron/integration-content" \
      -H "Authorization: Bearer $CRON_SECRET"      # expect 200 {ran:true,...}
    curl -si "$PREVIEW/api/cron/studio-licensing" \
      -H "Authorization: Bearer $CRON_SECRET"      # expect 200 {cleanedAt,...}
    ```
    Then confirm the negative case — no/incorrect secret must return **`401`**,
    never `200`:
    ```bash
    curl -si "$PREVIEW/api/cron/studio-licensing"  # expect 401
    ```
    Save both authenticated responses and the matching logs to the results
    record.

> **Before production (cron frequency):** `vercel.json` schedules
> `integration-content` every 5 min and `studio-licensing` every 10 min.
> Confirm the Vercel **plan on the production project actually permits those
> frequencies** — cron granularity is plan-limited, and a plan that only
> allows less-frequent (e.g. daily) crons will silently not run them at the
> intended cadence. Verify this before promoting; if the plan is too limited,
> either upgrade or adjust the schedules first.

Also confirm the negative auth case:
`GET <preview>/api/v1/device` **without** a bearer token returns JSON
**`401`** (not HTML `404`).

Cross-account voice check (new in this PR): from the beta org's device,
request a content generation with a `voiceId` that belongs to a **different**
account's private cloned voice → must fail with `voice_not_authorized`,
never generate.

Record a results matrix (step → HTTP status → pass/fail). Do not put a real
pairing code in any permanent log.

## 6. Only after approval — production backup + migration

Do **not** start this section until steps 1–5 pass and a human approves.

0. Confirm the Vercel production plan permits the 5-min / 10-min cron
   frequencies (see the note in step 5). Resolve first if it doesn't.
1. Create a **recoverable Neon backup/branch/snapshot** of the production
   branch; record its identifier.
2. Apply `0014` then `0015` to the **production** branch using the **same
   transactional procedure as step 3** — per-migration `BEGIN` → preflight →
   paste file body → post-verification → `COMMIT` only if the counts match and
   `station_device` legacy-revocation count is `0`; otherwise `ROLLBACK` and
   stop. Do not rely on the files' `IF NOT EXISTS` guards in place of the
   checks.
3. Set the Preview-proven env on **Production** (still leaving the Ed25519
   license key unset until the desktop client verifies it).
4. Promote **the same validated commit** to Production.
5. Post-promotion checks:
   - `GET https://www.aurapress.app/api/v1/device` with no bearer → JSON `401`.
   - Manually hit both `/api/cron/*` endpoints once with the production
     `CRON_SECRET` and confirm `200`, then confirm the scheduled runs appear
     in the Vercel cron logs at the expected cadence.

Only after all of the above is production considered done — and only if the
panel generates a usable pairing code and the download passes its checksum.

## Pre-production pending (must be resolved before production)

These are **known gaps** to close before the public launch of Studio Pro.
They do not block Preview validation (step 1–5), but they **do** block a
production go-live.

1. **Rate-limit the public pairing exchange.**
   `POST /api/v1/device-pairings/exchange` is unauthenticated (it accepts the
   8-character pairing code) and currently has **no throttling**. That invites
   brute-forcing the code space. Add per-IP and per-station rate limiting with
   backoff (and consider a short lockout after repeated misses) before
   production. The code TTL (10 min) and one-time use limit exposure, but are
   not a substitute for rate limiting.

2. **Purge expired pairing codes.**
   `device_pairing_code` rows are **never deleted** — the `studio-licensing`
   cron cleans challenges, output leases and license leases, but not pairing
   codes. Expired/consumed rows accumulate indefinitely. Add a cleanup of
   `device_pairing_code WHERE expires_at <= now()` (and consumed codes) to the
   `studio-licensing` cron (or a dedicated job) before production.
