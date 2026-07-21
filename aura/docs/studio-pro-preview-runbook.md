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

This PR introduces two migrations (renumbered to avoid colliding with the
pre-existing `0012_articles` / `0013_publishing`):

- `drizzle/0014_studio_pro_integration.sql`
- `drizzle/0015_studio_pro_licensing.sql`

**Production migration scope is `0012` → `0015`, not just `0014/0015`.** The
read-only audit (step 1) found that `0012_articles` and `0013_publishing` are
**also absent** from production — so the migration to bring production current
must apply all of `0012, 0013, 0014, 0015`.

> ### Production schema ↔ history divergence (must be respected)
>
> The audit found production's `drizzle.__drizzle_migrations` records **only
> `0000`–`0003`**, yet the schema objects for `0004`–`0011` are already present
> (`monthly_music_usage`, `signup_attempt`, `user.feed_token`,
> `delivery_type.local_folder`, `automation_schedule.weather_city`,
> `transition_effects`, `lead_time_minutes`), and the `0008` trial backfill has
> no pending rows. In other words, `0004`–`0011` were applied **manually** and
> never recorded in the Drizzle history. `0012`–`0015` and the Studio Pro enums
> do **not** exist.
>
> Consequence: the official `drizzle-kit migrate` flow will re-encounter
> `0004`–`0011` (which must be safely re-appliable — they are, see step 3) and
> record them, then apply `0012`–`0015`. This is validated on an **isolated
> branch first**. We do **not** hand-insert rows into `__drizzle_migrations`
> to "baseline" the manual migrations without a full schema comparison first
> (step 3, point D).

---

## 1. Confirm the real migration history in Neon — DONE (read-only)

A read-only audit of the **production** branch was completed. Findings:

- `drizzle.__drizzle_migrations` exists but records **only 4 rows**, whose
  hashes match migrations **`0000`–`0003`**.
- Schema objects for **`0004`–`0011` are already present** (applied manually,
  never recorded): `monthly_music_usage`, `signup_attempt`, `user.feed_token`,
  `delivery_type` enum value `local_folder`, `automation_schedule.weather_city`,
  `automation_schedule.transition_effects`, `automation_schedule.lead_time_minutes`.
- The `0008` trial backfill has **no pending rows**.
- **`0012`–`0015` tables do NOT exist**, and the Studio Pro enums do NOT exist.

Conclusion: production has a **schema ↔ Drizzle-history divergence** caused by
manual migrations. The forward plan (steps 2–5) validates, on an isolated
branch, that the official Drizzle flow reconciles this cleanly before we ever
touch production.

The read-only queries used (safe to re-run — `SELECT` only):

```sql
-- (A) which relevant tables already exist
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN (
  'article','publishing_connection','organization','organization_member',
  'station','station_device','device_pairing_code','integration_content_request',
  'station_event','studio_entitlement','studio_license_challenge',
  'studio_license_lease','studio_output_lease','studio_license_event')
ORDER BY table_name;
-- (B) Studio Pro enums present?
SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typtype='e' AND t.typname IN (
  'organization_role','station_device_status','integration_request_status',
  'station_event_type','studio_entitlement_status','studio_license_lease_status',
  'studio_license_challenge_purpose') ORDER BY 1;
-- (C) recorded Drizzle history
SELECT to_regclass('drizzle.__drizzle_migrations') AS meta;  -- non-null on prod
SELECT * FROM drizzle.__drizzle_migrations ORDER BY 1;       -- expect 4 rows (0000–0003)
```

## 2. Create an isolated database branch for Preview

Goal: never test schema changes on production data.

- In the **Neon Console → Branches**, create a branch from the production
  branch, e.g. `preview-studio-pro`. This is a copy-on-write branch — cheap
  and fully isolated.
- Copy that branch's pooled connection string. It becomes the Preview
  `DATABASE_URL` (step 4). Do not paste it into this repo or into chat.

## 3. Run the official Drizzle flow up to `0015` on the isolated branch

Goal: bring the isolated branch to `0015` using **`drizzle-kit migrate`** (the
official flow), not hand-pasted SQL — and prove it reconciles the divergence
cleanly. Because production records only `0000`–`0003`, migrate will re-run
`0004`–`0011` (already present in the schema), then apply `0012`–`0015`.

Run everything against the **branch** connection string from step 2 — never
production:

```bash
# from aura/ — point drizzle at the ISOLATED branch, not production
export DATABASE_URL='<preview-studio-pro branch connection string>'
```

### A. Preflight — verify the history is what we expect, no hash drift

`drizzle-kit migrate` (v0.30) has **no dry-run/plan mode** — the isolated
branch *is* the dry run. Before applying, confirm the starting state with
read-only SQL against the branch:
```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY 1;  -- expect the same 4 rows (0000–0003)
```
- It is hash-based: for each `_journal.json` entry, migrate applies only those
  whose hash isn't already recorded — so `0004`–`0015` will run, `0000`–`0003`
  will be skipped. If the recorded hash of `0000`–`0003` no longer matches the
  current `drizzle/0000_*`…`0003_*` files, migrate **errors on a hash
  mismatch** — if so, **stop**: an early migration file was edited after being
  applied, and that must be reconciled first.
- Confirm `drizzle/meta/_journal.json` lists `0000`…`0015` in order with tags
  matching the `.sql` filenames (it does in this PR).

### B. Re-appliability of `0004`–`0011` (all guarded; validate `0006`)

`drizzle-kit migrate` will re-run `0004`–`0011` against a schema that already
has those objects. Each is written idempotently, so re-running is a no-op:

| Migration | Operation | Re-runnable because |
|---|---|---|
| 0004 | `CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS` | guarded |
| 0005 | `ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS` | guarded |
| **0006** | **`ALTER TYPE "delivery_type" ADD VALUE IF NOT EXISTS 'local_folder'`** | value already exists → no-op |
| 0007 | `CREATE TABLE/INDEX IF NOT EXISTS` | guarded |
| 0008 | trial backfill `UPDATE` | no pending rows → no-op |
| 0009–0011 | `ADD COLUMN IF NOT EXISTS` | guarded |

> ⚠️ **Validate `0006` specifically.** `ALTER TYPE … ADD VALUE` **cannot run
> inside a transaction block that later uses the value**, and Postgres historically
> disallowed it in transactions entirely — which is why the file carries the
> comment "requires ALTER TYPE … ADD VALUE outside of a transaction." Since
> `local_folder` already exists on the branch, `ADD VALUE IF NOT EXISTS` is a
> no-op and should pass. But `drizzle-kit migrate` wraps migrations in
> transactions, so **watch this step**: if migrate errors on `0006`
> (e.g. "ALTER TYPE ... ADD VALUE cannot run inside a transaction block"),
> stop and record it — it may need to be applied out-of-band and marked
> applied, and the same handling must be planned for production. Do not force
> past it.

### C. Apply and verify

```bash
npx drizzle-kit migrate          # applies 0004→0015 on the BRANCH
```
Then verify on the branch:

```sql
-- 0012–0015 objects now present — expect 8 tables:
SELECT count(*) FROM information_schema.tables WHERE table_schema='public'
AND table_name IN ('article','publishing_connection',
  'organization','station','station_device','device_pairing_code',
  'integration_content_request','station_event','studio_entitlement',
  'studio_license_challenge','studio_license_lease','studio_output_lease',
  'studio_license_event');                         -- expect 13 total
-- Studio Pro enums present — expect 7:
SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typtype='e' AND t.typname IN (
  'organization_role','station_device_status','integration_request_status',
  'station_event_type','studio_entitlement_status','studio_license_lease_status',
  'studio_license_challenge_purpose');
-- 0015 legacy-device revocation must have touched nothing on a fresh branch:
SELECT count(*) AS revoked_legacy FROM station_device WHERE status='revoked';  -- expect 0
-- Drizzle history now records through 0015:
SELECT count(*) FROM drizzle.__drizzle_migrations;   -- expect 16 (0000–0015)
```
If any count is off, or migrate errored, **stop** and investigate on the
branch (it is disposable) before considering production.

### D. Do NOT hand-baseline `__drizzle_migrations`

An alternative would be to skip re-running `0004`–`0011` by manually inserting
their hashes into `drizzle.__drizzle_migrations` ("baselining"). **Do not do
this** without first proving the live schema is byte-for-byte what those
migrations produce. If you ever consider it, first compare **tables, columns,
indexes, constraints and defaults** between the isolated branch (after a clean
migrate) and production — e.g. dump and diff:
```bash
pg_dump --schema-only --no-owner "$BRANCH_URL" > branch.sql
pg_dump --schema-only --no-owner "$PROD_URL"   > prod.sql
diff -u prod.sql branch.sql            # must be understood line-by-line
```
Only an empty/explained diff justifies baselining. The default and safer path
is letting migrate re-run the guarded `0004`–`0011` as no-ops.

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
2. Bring production current with the **same official Drizzle flow proven on
   the branch in step 3** — `drizzle-kit migrate` against production, which
   re-runs the guarded `0004`–`0011` as no-ops and applies `0012`–`0015`
   (scope is `0012`→`0015`, since articles/publishing are also absent). Apply
   the exact `0006` handling that step 3.B established on the branch (if
   migrate cannot run the enum `ADD VALUE` in-transaction, use the same
   out-of-band procedure validated there — do not improvise on production).
   Then run the step 3.C verification queries against production (expect 13
   tables, 7 enums, `revoked_legacy = 0`, history through `0015`). Do **not**
   hand-insert `__drizzle_migrations` rows (step 3.D).
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
