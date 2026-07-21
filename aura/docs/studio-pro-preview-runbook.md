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

This PR introduces three migrations (renumbered to avoid colliding with the
pre-existing `0012_articles` / `0013_publishing`):

- `drizzle/0014_studio_pro_integration.sql`
- `drizzle/0015_studio_pro_licensing.sql`
- `drizzle/0016_studio_pro_pairing_hardening.sql`

**Production migration scope is `0012` → `0016`, not just `0014`–`0016`.** The
read-only audit (step 1) found that `0012_articles` and `0013_publishing` are
**also absent** from production — so the migration to bring production current
must apply all of `0012, 0013, 0014, 0015, 0016`.

> ### Production schema ↔ history divergence (must be respected)
>
> The audit found production's `drizzle.__drizzle_migrations` records **only
> `0000`–`0003`**, yet the schema objects for `0004`–`0011` are already present
> (`monthly_music_usage`, `signup_attempt`, `user.feed_token`,
> `delivery_type.local_folder`, `automation_schedule.weather_city`,
> `transition_effects`, `lead_time_minutes`), and the `0008` trial backfill has
> no pending rows. In other words, `0004`–`0011` were applied **manually** and
> never recorded in the Drizzle history. `0012`–`0016` and the Studio Pro enums
> do **not** exist.
>
> Consequence: the official `drizzle-kit migrate` flow will re-encounter
> `0004`–`0011` (which must be safely re-appliable — they are, see step 3) and
> record them, then apply `0012`–`0016`. This is validated on an **isolated
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

## 2. Isolated database branch for Preview — DONE

An isolated branch was created **from `production`**. Nothing has been migrated
on it yet, and production remains untouched.

| Field | Value |
|---|---|
| Branch name | `studio-pro-preview` |
| Branch ID | `br-crimson-hall-akvxaaxy` |
| Source | `production` (copy-on-write) |
| Auto-expires | **2026-07-28 17:34 (GMT-3)** |
| Migrated? | No — pre-migration state (`__drizzle_migrations` = 0000–0003) |

- ⏳ **The branch auto-expires 2026-07-28 17:34 GMT-3.** Complete steps 3–5
  before then, or recreate the branch. Do not let a half-migrated branch
  linger past expiry.
- Copy the connection string **from this branch specifically** (Neon Console →
  Branches → `studio-pro-preview` → Connect). It becomes the Preview
  `DATABASE_URL` (step 4). Do not paste it into this repo or into chat, and
  **never** use the `production` connection string for steps 3–5.

## 3. Run the official Drizzle flow up to `0015` on the isolated branch

Goal: bring the isolated branch to `0015` using **`drizzle-kit migrate`** (the
official flow), not hand-pasted SQL — and prove it reconciles the divergence
cleanly. Because production records only `0000`–`0003`, migrate will re-run
`0004`–`0011` (already present in the schema), then apply `0012`–`0015`.

Run everything against the **`studio-pro-preview` branch**
(`br-crimson-hall-akvxaaxy`) connection string from step 2 — **never**
production:

```bash
# from aura/ — point drizzle at the ISOLATED branch, not production.
# Use the connection string copied from the studio-pro-preview branch.
export DATABASE_URL='<studio-pro-preview branch connection string>'
```

### A. Preflight — verify the connection AND the history, no hash drift

**Connection safety first.** Confirm the shell is pointed at the branch, not
production, before running anything that writes. A Neon branch has its own
endpoint host, so the host in `DATABASE_URL` must differ from production's:
```bash
echo "$DATABASE_URL" | sed -E 's#://[^@]+@#://<redacted>@#'   # eyeball the host
```
- The host must be the `studio-pro-preview` endpoint (Neon shows it under the
  branch's Connect dialog), **not** the production endpoint. If in doubt, stop
  and re-copy from the branch.
- After step 3 completes, confirm in the Neon Console that the **`production`
  branch is still at 0000–0003 / no 0012–0015 tables** — proof it was never
  touched.

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

> ### ✅ Preflight APPROVED — 2026-07-21 (branch `studio-pro-preview`)
>
> Run in the branch SQL Editor (breadcrumb `production / studio-pro-preview`).
> Result matched expectations exactly:
> - `drizzle.__drizzle_migrations` = **4 rows**, hashes match `0000`–`0003`.
> - `0012`–`0015` tables = **[]** (none present).
> - `0004`/`0007` objects present (`monthly_music_usage`, `signup_attempt`).
> - `0006` enum value present (`m0006_localfolder = 1`) → re-apply is a no-op.
> - Production confirmed untouched.
>
> The branch is cleared to run `drizzle-kit migrate` (see step 3.C
> authorization).

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

> ### ✅ AUTHORIZED — `drizzle-kit migrate` on `studio-pro-preview` ONLY
>
> Preflight approved (step 3.A). This authorization is **scoped exclusively to
> the `studio-pro-preview` branch (`br-crimson-hall-akvxaaxy`)**. It does
> **not** authorize production, promotion, or any secret generation.
>
> Before running, re-confirm the connection safety check (host = branch
> endpoint, not production). Then:
> ```bash
> # DATABASE_URL MUST be the studio-pro-preview branch string (verified in 3.A)
> npx drizzle-kit migrate
> ```
> **Watch `0006`** as it runs (step 3.B): the `delivery_type` enum value
> already exists, so it should be a no-op — but if migrate errors on the
> `ALTER TYPE … ADD VALUE` inside a transaction, **stop and record it**; do not
> force past it. Capture the full migrate stdout/stderr for the record.

```bash
npx drizzle-kit migrate          # applies 0004→0015 on the BRANCH
```
Then verify on the branch:

```sql
-- 0012–0015 objects now present — all 13 relevant tables should exist:
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

> ### ✅ Step 3 COMPLETE — 2026-07-21 (branch `studio-pro-preview`)
>
> `drizzle-kit migrate` ran from commit `795116d` with a guard that accepted
> **only** the branch endpoint `ep-lucky-shadow-ak3why6p`. Exit code 0,
> "migrations applied successfully", and **`0006` passed without error**.
> Post-verification on the branch matched exactly:
> - `relevant_tables = 13`
> - `studio_enums = 7`
> - `revoked_legacy = 0`
> - `drizzle_migrations = 16` (0000–0015)
>
> Production untouched; the branch connection string was cleared from the
> clipboard. Cleared to proceed to step 4 (Preview env) and step 5 (smoke
> tests). The `0006` handling is now **proven** for the eventual production run.

> ### ✅ Hardening follow-up COMPLETE — migration `0016` (2026-07-21)
>
> The completion record above is the historical `0012`–`0015` validation.
> The same endpoint-guarded `drizzle-kit migrate` flow was run against **only**
> `studio-pro-preview`. Migration `0016` added
> `device_pairing_rate_limit`; `to_regclass(...)` was non-null and the Drizzle
> history reached **17 rows (`0000`–`0016`)**. Production was not connected or
> modified. This record does not authorize any production migration.

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
**Preview** (not Production, not Development):

- `DATABASE_URL` → the **`studio-pro-preview` branch** connection string
  (endpoint `ep-lucky-shadow-ak3why6p`, branch `br-crimson-hall-akvxaaxy`).
  - **Scope it to this PR's git branch** (`claude/studio-pro-integration-api`)
    if the project has other preview branches, so no unrelated preview
    deployment gets pointed at this database.
  - ⏳ This branch **auto-expires 2026-07-28 17:34 GMT-3**. After the smoke
    tests, **remove or repoint this Preview override** — do not leave Preview
    pointing at an expired branch.
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
14. **Pairing hardening:** with a disposable code/device, cross the configured
    code-attempt threshold and confirm JSON **`429 pairing_rate_limited`** plus
    a numeric **`Retry-After`** header. Then run the authenticated licensing
    cron and confirm its response includes `deletedPairingCodes` and
    `deletedPairingRateLimitBuckets`.

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

### ✅ Pairing hardening Preview result — 2026-07-21

Validated commit: `e5a49d1` (`studio-pro: make pairing retry window exact`).
Vercel deployment: `aura-7icnh3wwp-aura-audio.vercel.app`, status **Ready**.
The stable branch alias was also used for the authentication flow so its
configured origin remained consistent.

| Check | Result | Status |
|---|---|---:|
| Readiness: `GET /api/v1/device` without bearer | JSON `invalid_device_token` | 401 |
| Signed P-256 pairing exchange | Device credentials issued | 201 |
| Device profile with issued bearer | Profile returned | 200 |
| Browser-session device revocation | Device revoked | 204 |
| Reuse bearer after revocation | Token rejected | 401 |
| Per-code fixed window | Attempts 1–6 reached validation; attempt 7 blocked | 400 × 6, then 429 |
| Code `Retry-After` / cache policy | `599`, `Cache-Control: no-store` | pass |
| Per-IP fixed window | Requests through total 20 reached validation; request 21 blocked | 400 through 20, then 429 |
| IP `Retry-After` / cache policy | `595`, `Cache-Control: no-store` | pass |
| Per-station atomic policy (isolated DB test) | Attempts 1–10 allowed; attempt 11 blocked, `Retry-After: 600` | pass |
| Forged `X-Forwarded-For` on Vercel | Did not bypass the active IP bucket | 429 |
| Licensing cron without authorization | Rejected | 401 |
| Licensing cron with Preview test secret + isolated DB | Removed an expired code and a stale bucket; both reported in JSON | 200 |

The final end-to-end run used a disposable beta account and never persisted a
raw pairing code, password, cookie, access token or database connection in
the test output. After validation, the isolated branch cleanup removed 16
synthetic rate-limit buckets and 2 consumed/expired pairing codes; the rate
bucket table was confirmed empty. The database connection was cleared from
the clipboard. **Production remained untouched.**

## 6. Only after approval — production backup + migration

Do **not** start this section until steps 1–5 pass and a human approves.

0. Confirm the Vercel production plan permits the 5-min / 10-min cron
   frequencies (see the note in step 5). Resolve first if it doesn't.
1. Create a **recoverable Neon backup/branch/snapshot** of the production
   branch; record its identifier.
2. Bring production current with the **same official Drizzle flow proven on
   the branch in step 3** — `drizzle-kit migrate` against production, which
   re-runs the guarded `0004`–`0011` as no-ops and applies `0012`–`0016`
   (scope is `0012`→`0016`, since articles/publishing are also absent). Apply
   the exact `0006` handling that step 3.B established on the branch (if
   migrate cannot run the enum `ADD VALUE` in-transaction, use the same
   out-of-band procedure validated there — do not improvise on production).
   Then run the step 3.C verification queries against production (expect 14
   tables including `device_pairing_rate_limit`, 7 enums,
   `revoked_legacy = 0`, history through `0016` / 17 rows). Do **not**
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

### ✅ Production rollout record — 2026-07-21

The owner explicitly approved the backup, `0012`→`0016` migration and
promotion. The private Ed25519 license-signing key remained unset.

- **Rollback point:** Neon branch
  `prod-backup-pre-studio-pro-2026-07-21`
  (`br-twilight-feather-akpv0dh9`), forked from production with no automatic
  expiration.
- **Production branch:** `br-crimson-mode-ak83hbxd`; the migration command was
  protected by an endpoint allowlist before `drizzle-kit migrate` ran.
- **Preflight:** Drizzle history had 4 rows (`0000`–`0003`), all 14 target
  tables from `0012`–`0016` were absent, the guarded `0004`/`0007` objects and
  `0006 local_folder` enum value were already present, and production held 4
  users / 1,120 generated-audio rows.
- **Post-migration:** 14 target tables, 7 Studio Pro enums,
  `revoked_legacy = 0`, and 17 Drizzle history rows (`0000`–`0016`). The same
  4 users / 1,120 generated-audio rows remained present.
- **Secrets:** a new random `DEVICE_TOKEN_PEPPER` was stored as Sensitive and
  scoped to Production only. Preview retains a different branch-scoped value.
  The generated value and database connection were cleared from the local
  clipboard; neither was logged or committed.
- **Deployment:** validated commit `be1d79a` was rebuilt with Production env
  and promoted as deployment `3qJRCYhokk3m8yZ4qNSdsnrA7df1`
  (`aura-l50bykig3-aura-audio.vercel.app`), then aliased to
  `www.aurapress.app`.

| Production check | Result | Status |
|---|---|---:|
| `GET /api/v1/device` without bearer | JSON `invalid_device_token` | 401 |
| Pairing exchange with an invalid schema | JSON `invalid_input` | 400 |
| Licensing cron without authorization | JSON `unauthorized` | 401 |
| Studio Pro settings page | Rendered authenticated panel | 200 |
| Station bootstrap | Created `ADMIN` station and trial entitlement | 201 |
| Authorized voices | Returned selectable voices | 200 |
| Scheduled `integration-content` cron | Vercel Production log | 200 |
| Scheduled `studio-licensing` cron | Vercel Production log | 200 |
| Scheduled `automations` cron | Vercel Production log | 200 |
| Vercel production errors during verification | Error count | 0 |

The account currently has no default voice selected, so the panel correctly
keeps **Generate pairing code** disabled. The deployment and scheduled jobs
are live; final operator activation is to choose the desired default voice,
generate a one-time code, pair the actual Studio Pro installation and verify
one real AURA download checksum. Do not select a voice on the owner's behalf.

## Pre-production hardening gates

These controls are implemented by migration `0016` and passed their isolated
Preview smoke checks on 2026-07-21. They no longer block the Preview beta.
Production still requires the separate human approval, backup, migration and
post-promotion checks in step 6.

1. **Rate-limit the public pairing exchange — ✅ Preview validated.**
   `POST /api/v1/device-pairings/exchange` is unauthenticated (it accepts the
   8-character pairing code). It now consumes atomic, persistent per-IP,
   per-code and per-station buckets and returns `429` with an exact
   `Retry-After` through the end of the fixed window.
   Bucket identifiers are HMACs; client IPs and raw codes are never stored.

2. **Purge expired pairing codes — ✅ Preview validated.**
   The `studio-licensing` cron now deletes all consumed or expired pairing
   codes and rate-limit buckets inactive for 24 hours, and reports both counts
   in its authenticated JSON result.
