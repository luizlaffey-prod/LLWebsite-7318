# AURA — Engineering Handoff

> **Purpose.** This is a self-contained technical handoff so another engineer or
> AI assistant can take over AURA with no prior context. It reflects the state
> of the codebase on branch `claude/studio-pro-integration-api` (all migrations
> `0000`–`0017`, including the merged Studio Pro in-app OAuth login). Read it
> top to bottom once; then use it as a reference.

---

## 1. What AURA is

AURA (Automated Urban Radio Audio) is a SaaS that produces **AI-voiced radio
news bulletins** for independent radio stations. An operator:

1. **Searches the news** (multi-provider aggregator, by category / bias / region).
2. Picks stories → AURA **writes a broadcast script** (LLM) and **synthesizes
   audio** (ElevenLabs TTS), optionally mixing background music and weather.
3. Downloads / auto-delivers the bulletin (FTP / HTTP webhook / email / RSS /
   local folder), or **schedules automations** that generate bulletins on a
   cadence.

Newer product surfaces built on the same research pipeline:

- **Articles (newsroom):** turn the news research into full written articles
  for the station's website, with images.
- **Publishing:** push approved articles to the station's site (WordPress REST
  or a generic webhook).
- **Studio Pro:** a desktop companion app that pairs to a station over a
  dedicated **Integration API v1** (device auth, content requests, licensing)
  and now supports **"Sign in with AURA"** (OAuth 2.0 + PKCE).

Marketing site name / canonical domain: **`https://www.aurapress.app`**
(apex `aurapress.app` 307-redirects to `www`).

---

## 2. Repository & branch topology (READ THIS FIRST — it's unusual)

The GitHub repo **`luizlaffey-prod/LLWebsite-7318`** hosts **multiple unrelated
projects**. AURA lives in the **`aura/` subfolder**. Other branches
(e.g. `claude/clarify-requirements-*`) are a *different* project (a
Cloudflare/Vite movie site) at the repo root with no `aura/` folder — do not
confuse them.

**All AURA code is under `aura/`.** Always `cd aura` before running anything.

Relevant branches (AURA):

- `claude/news-aggregator-app-TIwT9` — the long-lived AURA line: everything up
  to and including **Articles** (`0012`) and **Publishing** (`0013`).
- `claude/studio-pro-integration-api` — **the current/most-complete AURA
  branch.** Contains Articles + Publishing + the Studio Pro **Integration API**
  (`0014`), **licensing** (`0015`), **pairing hardening** (`0016`), and the
  merged **in-app OAuth login** (`0017`). Vercel Preview deploys from here; the
  production rollout to `www.aurapress.app` was cut from this line.
- `codex/aura-integration-api` — a **separate root-level mirror** of the AURA
  app (not in `aura/`), authored in parallel (the "Codex" line). The Studio Pro
  server was originally ported from here. Histories are unrelated; do not try to
  `git merge` the trees.

There was an attempt to migrate AURA into a dedicated repo
`luizlaffey-prod/aurapress`; it stalled on a two-GitHub-account permission issue
and the `aurapress` remote is empty. If you resume that migration, the code to
move is the `aura/` subfolder of `studio-pro-integration-api`.

> ⚠️ Because the repo is shared, Vercel/CI can show 307s or unrelated build
> failures on non-AURA branches. Judge AURA health only from AURA branches.

---

## 3. Tech stack

| Area | Choice |
|---|---|
| Framework | **Next.js 15.1.11** (App Router, React 19, TypeScript), `next dev --turbopack` |
| DB | **Neon Postgres** via **Drizzle ORM 0.36.4**, driver **`drizzle-orm/neon-http`** |
| Auth | **better-auth 1.2** (email/password + Google OAuth) |
| Storage | **Cloudflare R2** (hand-rolled AWS SigV4, presigned PUT to bypass Vercel's 4.5 MB body cap) |
| TTS / audio | **ElevenLabs** (TTS + sound generation); `ffmpeg` mixing with `silencedetect` ducking |
| LLM | **Anthropic Claude** (script = Sonnet, chat = Haiku) with **Gemini** fallback via `resolveProvider` |
| Email | **Resend** + React Email |
| Payments | **Stripe** (Checkout, subscriptions, webhook, coupons/promotion codes); PayPal scaffolding present |
| i18n | **next-intl**, locales `en` / `pt` / `es` (`messages/*.json`) |
| Tests | **vitest** (node env), pure-logic unit tests |
| Hosting | **Vercel** (project `aura`, root directory = `aura/`), crons via `vercel.json` |

Design tokens (CSS): `--base #06080F`, `--teal #00E5C8`, `--violet #8B5CF6`,
`--surface/--elevated/--border`, `--text-primary/secondary/muted`; utility
classes `aura-gradient-text`, `aura-card`, `font-serif` (Georgia).

---

## 4. Local development

```bash
cd aura
npm install
cp .env.example .env.local     # fill in the secrets you need (see §11)
npm run dev                    # http://localhost:3000

npm run typecheck              # tsc --noEmit
npm run lint                   # next lint
npm run test                   # vitest run  (see §14 for the vitest.config pin)
npm run build                  # next build
```

Database (Drizzle, **applied manually** in this project — see §7):

```bash
DATABASE_URL='...' npm run db:migrate    # drizzle-kit migrate
npm run db:studio                        # drizzle-kit studio
npm run env:check                        # scripts/check-env.ts — lists env status
```

> **Build note.** `next build` prints `✓ Compiled successfully`, then may fail
> "collecting page data" with `Error: DATABASE_URL is not set` — that's the
> admin routes importing the DB client at module load. It's expected locally
> without a DB and does **not** indicate a code problem; compile + typecheck +
> lint are the real local gates. Vercel (with `DATABASE_URL` set) completes the
> build.

---

## 5. Directory map (`aura/`)

```
app/[locale]/
  (app)/            # authenticated app shell (sidebar). news, audios, articles,
                    #   voices, automations, analytics, settings, admin, dashboard
  (auth)/           # login, signup, forgot/reset password
  (onboarding)/plan # plan selection after signup
  early-access/     # lead-capture interstitial for paid-plan clicks
  help/             # native user manual (/help), TOC + prose
  studio-connect/   # Studio Pro "Sign in with AURA" consent page + server action
app/api/
  cron/             # trial-warning, trial-downgrade, automations,
                    #   integration-content, studio-licensing
  stripe/webhook/   # Stripe events → plan + Studio entitlement sync
  v1/               # Studio Pro Integration API (see §10)
  ... news/search, articles/*, publishing/*, voices/*, delivery/*, feedback, etc.
lib/
  db/               # schema.ts (single source of truth), client.ts (neon-http)
  auth/             # better-auth config, server/client helpers, callback-url guard
  billing/          # plans, tiers, quota, feature-gates, stripe
  news/             # aggregator (NewsAPI, GNews, NewsData, RSS, Guardian), weather, OUTLETS
  llm/              # script-generator, article-generator, provider resolution, today
  tts/              # elevenlabs, voice-catalog, mixing
  articles/         # article-generator, export (html/md), publish (WordPress/webhook)
  integration/      # ALL Studio Pro logic (device auth, licensing, OAuth, bootstrap)
  storage/          # R2 (SigV4), local-folder sync
  email/ delivery/ automations/ analytics/ health/ help/ crypto/ constants/ utils/
drizzle/            # 0000–0017 .sql + meta/_journal.json + seed.ts
messages/           # en.json, pt.json, es.json  (next-intl, nested namespaces)
docs/               # Studio Pro API spec, OpenAPI, licensing threat model, runbook
scripts/            # check-env.ts, studio-auth-smoke.mjs
```

---

## 6. Auth (better-auth)

- Email/password + Google OAuth. `lib/auth/config.ts` is the server config.
- **Trial**: new users are stamped `plan='trial'` with `trialEndsAt = now + TRIAL_DAYS`
  (currently **14**) via better-auth `databaseHooks`. `TRIAL_TIER` grants Pro-level
  features during the trial; on expiry a cron downgrades to `downgradesTo`.
- **Admins**: `(app)/layout.tsx` auto-promotes any email in `ADMIN_EMAILS` to
  `plan='pro'` on first authenticated request (idempotent). **Consequence:** you
  cannot test plan changes on an admin account — it reverts to Pro. Use a
  non-admin account.
- **`callbackURL` safety**: `lib/auth/callback-url.ts::safeCallbackPath` validates
  post-auth redirects to internal paths only (open-redirect guard). Login/signup
  read it **server-side** in the page and pass it as a prop (see the
  `useSearchParams` gotcha in §12). Google auth threads it via
  `lib/auth/social-callback.ts`.

---

## 7. Database & migrations

- **Schema:** `lib/db/schema.ts` is the single source of truth (Drizzle).
- **Driver:** `drizzle-orm/neon-http` (stateless HTTP). **⚠️ This driver has NO
  interactive transactions** (`db.transaction(async tx => …)` is unavailable).
  For atomicity, use a **single SQL statement** (a CTE via `db.execute(sql\`…\`)`)
  or `ON CONFLICT` keyed on a unique constraint. Examples in the codebase:
  - `app/api/v1/studio-auth/token/route.ts` — consumes the auth code AND inserts
    the device in one CTE.
  - `lib/integration/studio-stations.ts` — idempotent bootstrap via deterministic
    slug + `ON CONFLICT DO NOTHING`.

### Migration history is applied MANUALLY (important)

Production's `drizzle.__drizzle_migrations` records only **`0000`–`0003`**, yet
the schema objects for `0004`–`0011` are present — they were applied by hand via
the **Neon SQL editor**, never recorded. So `_journal.json` is documentation-
level here; do not assume it matches `__drizzle_migrations`.

The official path forward (validated in `docs/studio-pro-preview-runbook.md`):
run `drizzle-kit migrate` on an **isolated Neon branch** — it re-runs the
guarded `0004`–`0011` as no-ops (all use `IF NOT EXISTS` / `ADD VALUE IF NOT
EXISTS`) and applies the rest. **Watch `0006`** (`ALTER TYPE "delivery_type" ADD
VALUE 'local_folder'`) — enum `ADD VALUE` can't run inside a transaction; it's a
no-op when the value already exists, but verify migrate doesn't choke.

Migrations at a glance:

| # | What |
|---|---|
| 0000–0003 | Better-auth + AURA base (recorded in `__drizzle_migrations`) |
| 0004 | monthly music usage |
| 0005 | `user.feed_token` (public RSS feed auth) |
| 0006 | `delivery_type` enum += `local_folder` |
| 0007 | `signup_attempt` (IP-hash anti-abuse) |
| 0008 | backfill `trial_ends_at` |
| 0009–0011 | automation: weather_city, transition_effects, lead_time_minutes |
| 0012 | **articles** (newsroom) |
| 0013 | **publishing_connection** (WordPress / webhook publishing) |
| 0014 | **studio_pro_integration** (org/station/device/content-request/events) |
| 0015 | **studio_pro_licensing** (entitlement + license lease/challenge/output) |
| 0016 | **device_pairing_rate_limit** (pairing hardening) |
| 0017 | **studio_auth_grant** + generic **rate_limit** (in-app OAuth login) |

### Neon branches used

- Preview validation ran on an **isolated branch** `studio-pro-preview`
  (`br-crimson-hall-akvxaaxy`, endpoint `ep-lucky-shadow-ak3why6p`), migrated
  through `0017`. Branches are copy-on-write and auto-expire.
- Production migration of the pairing work was recorded with a recoverable
  backup branch; see the runbook's "Production rollout record".

### Key tables (non-exhaustive)

`user, session, account, verification, subscription, usage_period,
monthly_music_usage, news_search, news_source, generated_audio, voice,
voice_preference, automation_schedule, automation_execution, delivery_endpoint,
delivery_log, signup_attempt, article, publishing_connection, organization,
organization_member, station, station_device, device_pairing_code,
device_pairing_rate_limit, integration_content_request, station_event,
studio_entitlement, studio_license_challenge, studio_license_lease,
studio_output_lease, studio_license_event, studio_auth_grant, rate_limit`.

---

## 8. Billing (Stripe)

- Tiers: `trial`, `starter`, `standard`, `pro` (`lib/billing/plans.ts`).
  `effectiveTier()` maps a user's plan (honoring the trial window) to a tier;
  `lib/billing/feature-gates.ts` gates features (`canSchedule`, `canAutoDeliver`,
  `canWriteArticles = tier==='pro'`, `maxCategoriesPerBulletin`, etc.).
- **Checkout / webhook**: `settings/billing/actions.ts::changePlan` creates a
  Stripe Customer, persists `stripeCustomerId`, uses `allow_promotion_codes`,
  and updates in place. `app/api/stripe/webhook/route.ts` writes plan changes and
  routes **Studio Pro** subscriptions to entitlement sync
  (`lib/integration/stripe-entitlements.ts`).
- Env prices: `STRIPE_PRICE_STARTER/STANDARD/PRO` and (for the future bundle)
  `STRIPE_PRICE_STUDIO_PRO/STUDIO_ENTERPRISE` (leave blank until the real
  products exist — the code falls back to trial).

> ⚠️ **www-canonical webhook gotcha.** The apex `aurapress.app` 307-redirects to
> `www`, and Stripe does **not** follow redirects. The Stripe webhook endpoint
> **must** be `https://www.aurapress.app/api/stripe/webhook`. Any server-to-server
> POST (webhooks, crons hitting the app) must target `www`.

---

## 9. Core features (quick tour)

- **News aggregator** (`lib/news/`): 5 providers (NewsAPI, GNews, NewsData, RSS,
  Guardian) with a per-language **OUTLETS catalog** carrying **bias** (left /
  center / right, tuned to *local* Brazilian/Hispanic perception) and **vertical
  tags** (so an economy search doesn't leak a tech outlet's "air fryer" deal).
  Scope `global` fans out across languages; `country` resolves via
  `Intl.DisplayNames` for **any** country. Location autocomplete at
  `/api/geo/autocomplete`.
- **Bulletin generation**: `lib/llm/script-generator.ts` → `lib/tts/elevenlabs.ts`.
  Today's date is injected via `lib/llm/today.ts` (timezone-aware) to stop date
  hallucination. Weather (`lib/news/weather.ts`) supports multi-city, separate or
  integrated; weather-only slots supported.
- **Automations** (`(app)/automations`, cron `/api/cron/automations`): scheduled
  bulletins; configurable lead time (5–120 min), days-of-week (tier-gated).
- **Voices** (`(app)/voices`, `/api/voices*`): curated `VOICE_CATALOG` + user
  **cloned** voices (`ownerUserId`); `voice_preference` holds default/speed.
- **Delivery** (`settings/delivery`, `/api/delivery*`, `lib/delivery/dispatch.ts`):
  per-user endpoints (FTP / HTTP / email / local_folder), encrypted config
  (`lib/crypto/secrets.ts`), delivery logs. Local-folder is a browser pull via the
  File System Access API.
- **Articles** (`(app)/articles`, `/api/articles*`): Pro-gated. Reuse news search →
  "Write article" (`lib/llm/article-generator.ts`) → editor (headline, standfirst,
  reorderable blocks, image+credit) → export HTML/Markdown (`lib/articles/export.ts`).
- **Publishing** (`settings/publishing`, `/api/publishing*`,
  `lib/articles/publish.ts`): per-station connection (WordPress REST or generic
  webhook w/ optional HMAC), test-before-save, "Publish to website" in the editor.
  Default status = draft (human review on the site).
- **Help** (`/help`): native localized user manual (`lib/help/manual-content.ts`).
- **Admin** (`(app)/admin`): edit user plan/trial/status; automations inspection;
  LLM/health status.
- **Early Access** (`/early-access`): lead-capture interstitial (leads → email).

---

## 10. Studio Pro: Integration API v1 + in-app OAuth login

The desktop **Studio Pro** app pairs to a station and pulls generated audio.
All server logic is in `lib/integration/*`; routes under `app/api/v1/*`. Full
contracts in `docs/`:

- `docs/studio-pro-integration-api-v1.md` + `docs/openapi-studio-pro-v1.yaml` —
  the Integration API (pairing, device tokens, content-requests, assets, events,
  licensing).
- `docs/studio-pro-in-app-login.md` — the OAuth "Sign in with AURA" contract
  (endpoints, params, error codes, redirect rules, desktop callback steps).
- `docs/studio-pro-licensing-threat-model.md` — licensing design + status.
- `docs/studio-pro-preview-runbook.md` — the Preview→Production release runbook.

### Data model

`organization` → `station` (belongs to an org; has `defaultVoiceId`, timezone,
language) → `station_device` (P-256 identity, activation slot, hashed
access/refresh tokens). `studio_entitlement` per org (status, features like
`aura_content`, `maxDevicesPerStation`, `maxConcurrentOutputs`, validity;
`source ∈ bundle|standalone|trial|admin`).

### Two ways to pair a computer

1. **Code pairing (admin fallback):** panel generates an 8-char code
   (`ABCD-EFGH`, 10-min TTL, hash-stored); desktop exchanges it at
   `POST /api/v1/device-pairings/exchange` with a P-256 proof.
2. **"Sign in with AURA" (primary, merged in `0017`)** — OAuth 2.0 Authorization
   Code + **PKCE S256**, public desktop client, **external system browser**:
   - `GET /api/v1/studio-auth/authorize` validates params → redirects to the
     localized **`/[locale]/studio-connect`** consent page (login/signup + station
     select + entitlement + consent) → the server action issues a **single-use
     authorization code** (≤5 min, hash-stored) bound to
     client/redirect/PKCE/user/station/**device public key** → redirects to the
     desktop's loopback callback with `code`+`state`.
   - `POST /api/v1/studio-auth/token` validates client/redirect/PKCE/device-proof,
     **atomically** consumes the code + registers the device (one CTE), returns the
     same **PairingResponse** the code flow issues (device + station + Bearer
     access token + rotating refresh token). No web session/cookie ever reaches
     the desktop.
   - `client_id = studio-pro-desktop` (public, no secret).

### Security invariants (don't regress these)

- PKCE S256 + random `state`, both validated; auth code single-use (replay →
  `invalid_grant`), ≤5 min, hash-only, atomically consumed.
- **Strict loopback redirect**: only `http://127.0.0.1:{port}/aura/callback`.
  Rejected: `localhost.evil`, credentials, IPv6, https, alternate path, query,
  fragment, port 0/>65535. Validation is a **regex** (`studio-auth-policy.ts`),
  not `new URL()` (see the host-substitution gotcha in §12).
- **`canonicalizeRedirectUri`** decodes percent-encoding AND rewrites the exact
  `localhost` alias → numeric `127.0.0.1` (platform substitutes the host — see
  §12); only the numeric form is ever forwarded/stored/redirected.
- P-256/ES256 device proof-of-possession preserved at token exchange.
- **Cross-tenant safety**: bootstrap org identity is a collision-resistant
  `sha256(userId)` slug + an explicit `billingUserId` ownership check; a slug
  owned by another user is refused (`studio_bootstrap_org_conflict`).
- **Voice-authorization**: a station may only use a **global** voice or one owned
  by a **member of its org** (`lib/integration/voice-authorization*.ts`), enforced
  in bootstrap, station PATCH, and `processContentRequest`.
- **Default-voice pairing gate**: a station needs a `defaultVoiceId` before
  pairing — enforced **server-side** in both `authorizeStudioConnect` and
  `POST /stations/{id}/pairing-codes` (not just the UI).
- **Rate limiting** on public routes: DB-backed fixed window
  (`rate-limit-store.ts`) for OAuth (token 30/min/IP, authorize 60/min/IP);
  pairing-exchange has its own `device_pairing_rate_limit` (`pairing-rate-limit.ts`).
- No codes/tokens/verifiers/proofs/passwords/cookies/keys in logs.

### Licensing (server-only; NOT enforced by the client yet)

Ed25519-signed offline license leases exist server-side
(`lib/integration/license-*.ts`). **The desktop client does not verify them
yet.** Therefore: **do NOT generate/install the production
`STUDIO_LICENSE_PRIVATE_KEY`** — the lease endpoint returns
`503 studio_license_signing_unavailable` by design until the client ships
verification. See the threat-model doc.

### Smoke test

`scripts/studio-auth-smoke.mjs` runs the headless HTTP matrix against a Preview
(`BASE_URL=… node scripts/studio-auth-smoke.mjs`): redirect rejections, valid
authorize→302, token errors, `/device` 401, legacy pairing, both rate limits.
It reports the `X-Studio-Auth-Policy` bundle-version header.

---

## 11. Environment variables

From `.env.example` (fill what you use — most features degrade gracefully when a
key is missing):

- **Core**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `NEXT_PUBLIC_APP_URL` (set to the `www` canonical), `ADMIN_EMAILS`, `CRON_SECRET`.
- **LLM**: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.
- **TTS**: `ELEVENLABS_API_KEY`.
- **News/weather**: `NEWSAPI_KEY`, `GNEWS_KEY`, `NEWSDATA_KEY`, `GUARDIAN_KEY`,
  `OPENWEATHER_API_KEY`.
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (domain must be verified and
  match the sending domain).
- **Storage (R2)**: R2 account/bucket/keys (see `lib/storage/r2.ts` + `.env.example`).
- **Payments**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_STARTER/STANDARD/PRO`, `STRIPE_PRICE_STUDIO_PRO/STUDIO_ENTERPRISE`
  (blank until real), `PAYPAL_*`.
- **Studio Pro**: `DEVICE_TOKEN_PEPPER` (≥32-char secret for device-token /
  auth-code / rate-limit hashing), `STUDIO_LICENSE_PRIVATE_KEY` (**leave unset**,
  see §10), `STUDIO_LICENSE_KEY_ID`.
- **Misc**: `MIGRATE_SECRET`, `INNGEST_*` (present, not central).

`DEVICE_TOKEN_PEPPER` is scoped per environment; Preview and Production hold
different values. `npm run env:check` prints presence without values.

---

## 12. Deployment & runtime gotchas (hard-won)

- **Vercel project `aura`, root directory = `aura/`.** Deploys from
  `studio-pro-integration-api`. Crons in `vercel.json`: trial-warning (daily),
  trial-downgrade (hourly), automations (\*/10), integration-content (\*/5),
  studio-licensing (\*/10). **Confirm the Vercel plan permits 5-/10-min cron
  frequencies** before relying on them in production.
- **`www` is canonical** — see §8. Server-to-server calls must use `www`.
- **Platform substitutes the loopback host `127.0.0.1` → `localhost`** in query
  values before the route sees them (confirmed via a Preview diagnostic echo).
  This is why `isValidLoopbackRedirectUri` is a **regex** and
  `canonicalizeRedirectUri` rewrites the `localhost` alias back to numeric. If you
  touch redirect validation, keep this behavior and the route-level test.
- **`useSearchParams()` breaks static generation.** Reading it in a client
  component forces a CSR bailout that fails `next build` static generation of
  otherwise-static pages (bit us on `/login`, `/signup`). **Read query params
  server-side in the page and pass as props**, or wrap in `<Suspense>`.
- **neon-http has no interactive transactions** — see §7.
- **Migration renumbering**: because two lines (this repo's `aura/` and the Codex
  mirror) evolved in parallel, migration numbers collided twice and were
  renumbered (articles/publishing took `0012/0013`; Studio Pro integration took
  `0014/0015`; the OAuth grant was bumped `0016→0017` after Codex added pairing
  hardening as `0016`). If you cherry-pick across lines, check for number
  collisions and update `_journal.json`.
- **The `vitest.config.ts` root pin** (see §14) exists because a sibling project's
  `vite.config.ts` at the repo root would otherwise hijack test runs.

---

## 13. Testing conventions

- `npm run test` → `vitest run`. Config: `aura/vitest.config.ts` pins `root` to
  `aura/` and aliases `@` (prevents a sibling repo's vite config from loading).
- Node environment, **no DB**. The pattern: **extract security-critical / decision
  logic into pure modules** (no `server-only`, no `@/lib/db/client`) and unit-test
  those. Examples: `studio-auth-policy.ts`, `voice-authorization-policy.ts`,
  `studio-bootstrap-flow.ts` (store-injected so an in-memory fake DB adapter can
  test concurrency/idempotency), `rate-limit.ts`, `pairing-format.ts`.
- Route-level tests import the handler with `@/lib/db/client` and the rate-limit
  store **mocked** and `server-only` stubbed (see
  `app/api/v1/studio-auth/authorize/route.test.ts`).
- Anything genuinely DB-dependent (idempotency under real concurrency, the atomic
  CTE, end-to-end OAuth) is validated on the **Preview** Neon branch via the
  runbook + `studio-auth-smoke.mjs` — the authoring environment has no DB.

---

## 14. Current status & roadmap

**Shipped / merged:** news aggregator, bulletin generation, automations, voices
(+clone), delivery, billing (Stripe, no-card 14-day trial), early access, native
help, admin tools, **Articles**, **Publishing**, **Studio Pro Integration API**,
and **in-app OAuth login** (PR #3, merged; Preview E2E green — smoke 17/17).

**Release gate still owned by the human (needs Neon prod + Vercel access):**

- Apply migration **`0017`** to production via the runbook (backup → isolated
  branch → `drizzle-kit migrate` → promote the exact validated commit). The
  in-app-auth code is merged but its production migration is the last step.

**Pre-production / pending:**

- **Ed25519 licensing key**: only generate/install once the desktop client
  verifies signed leases (see §10 / threat model). Not before.
- **Bundle billing**: `studio_entitlement.source` and the bundle feature set are
  scaffolded; wire the real Stripe product/prices, prevent double-charging an
  existing AURA customer, and define upgrade/downgrade/proration — no prices/IDs
  invented yet.
- **Articles Phase 1c**: AI image generation (e.g., Firefly) for articles.
- **Publishing Phase 2/3**: WordPress publishing depth; add-on for lower tiers +
  hosted white-label page.
- **Deliverability**: confirm Resend `RESEND_FROM_EMAIL` domain end-to-end (Forgot
  Password) if not already.

---

## 15. How to take over (checklist for the next AI/engineer)

1. `git fetch origin claude/studio-pro-integration-api && git checkout -B work origin/claude/studio-pro-integration-api`, then `cd aura`.
2. `npm install`; copy `.env.example` → `.env.local`; fill the keys for the area
   you're touching; `npm run typecheck && npm run lint && npm run test`.
3. Read `docs/` for anything Studio Pro. Read this file's §7, §10, §12 before
   touching the DB, the OAuth flow, or deploy config.
4. Make changes on a feature branch, keep `typecheck/lint/test/build` green,
   open a PR against `claude/studio-pro-integration-api`.
5. For anything DB/deploy-dependent, follow `docs/studio-pro-preview-runbook.md`
   (isolated Neon branch first; never touch production without an explicit
   human-approved backup + migration + promotion). **Do not** merge to `main`,
   promote production, change Stripe, or enable the licensing private key without
   explicit owner approval.

---

*Maintained alongside the code. When you change the DB, the OAuth flow, deploy
config, or a documented gotcha, update the relevant section here.*
