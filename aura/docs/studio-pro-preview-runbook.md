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

## 3. Apply `0014` and `0015` to the Preview branch only

Goal: migrate the isolated branch, not production.

- With the **`preview-studio-pro` branch selected** in the Neon SQL Editor,
  run the two files **in order**, each pasted in full:
  1. `drizzle/0014_studio_pro_integration.sql`
  2. `drizzle/0015_studio_pro_licensing.sql`
- Both are idempotent (`DO $$ … EXCEPTION` / `IF NOT EXISTS`), so re-running
  is safe.
- ⚠️ `0015` revokes legacy devices lacking a P-256 identity. On a fresh
  branch with no Studio devices this is a **no-op** — confirm the affected
  row count is 0.
- Verify all expected tables now exist on the branch (re-run the query from
  step 1 against `preview-studio-pro`; expect all 13 present).

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
13. Confirm the **crons** run: `integration-content` and `studio-licensing`.

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

1. Create a **recoverable Neon backup/branch/snapshot** of the production
   branch; record its identifier.
2. Apply `0014` then `0015` to the **production** branch (idempotent; confirm
   `0015` legacy-revocation count is 0).
3. Set the Preview-proven env on **Production** (still leaving the Ed25519
   license key unset until the desktop client verifies it).
4. Promote **the same validated commit** to Production.
5. Post-promotion check: `GET https://www.aurapress.app/api/v1/device` with no
   bearer returns JSON `401`.

Only after all of the above is production considered done — and only if the
panel generates a usable pairing code and the download passes its checksum.
