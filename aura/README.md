# AURA — Automated Urban Radio Audio

B2B SaaS for radio stations to generate AI-voiced news bulletins on demand.

## One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fluizlaffey-prod%2FLLWebsite-7318&root-directory=aura&project-name=aura&repository-name=aura&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,NEXT_PUBLIC_APP_URL,ELEVENLABS_API_KEY,ANTHROPIC_API_KEY,GEMINI_API_KEY&envDescription=Minimum%20vars%20to%20boot%20AURA.%20DATABASE_URL%20from%20Neon%20(free%20tier).%20BETTER_AUTH_SECRET%20%3D%20openssl%20rand%20-base64%2032.%20Leave%20BETTER_AUTH_URL%20and%20NEXT_PUBLIC_APP_URL%20blank%20on%20first%20deploy.%20Use%20EITHER%20ANTHROPIC_API_KEY%20OR%20GEMINI_API_KEY%20(the%20one%20you%20left%20blank%20can%20stay%20blank).&envLink=https%3A%2F%2Fgithub.com%2Fluizlaffey-prod%2FLLWebsite-7318%2Fblob%2Fclaude%2Fnews-aggregator-app-TIwT9%2Faura%2FREADME.md%23deploying-to-vercel-production-access-in-20-minutes)

The button above clones the repo, scaffolds the project on Vercel with
`aura/` as the root directory, and pops up a form pre-filled with every
env var you need to enter. Total time: ~10 minutes once you have the
Neon/ElevenLabs/Anthropic keys ready (see [the full walkthrough](#deploying-to-vercel-production-access-in-20-minutes)).

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui + framer-motion
- **Postgres** (Neon) + **Drizzle ORM**
- **Better Auth** (email/password)
- **Stripe** (primary) + **PayPal** (optional) for billing
- **Claude Sonnet 4.6** (Anthropic SDK) for script generation
- **ElevenLabs** Multilingual v2 for TTS
- **NewsAPI** + **GNews** + curated RSS for news aggregation
- **OpenWeatherMap** for weather
- **Resend** for transactional email
- **Cloudflare R2** for audio storage
- **Inngest** for cron / background jobs
- **next-intl** for i18n (EN default, PT, ES-LATAM)

## Local setup

```bash
cd aura
cp .env.example .env.local      # fill in all required secrets
bun install
bun db:generate                  # generate migration SQL from schema
bun db:push                      # apply schema to Neon database
bun dev                          # http://localhost:3000
```

The app auto-redirects `/` to the locale prefix (`/en`, `/pt`, or `/es`).
EN is the default. Add new strings in `messages/{en,pt,es}.json`.

## Folder layout

```
aura/
├── app/
│   ├── [locale]/                # i18n routes
│   │   └── (marketing, auth, onboarding, app)
│   ├── api/                     # Route handlers (auth, webhooks, bulletin, news...)
│   └── globals.css              # AURA design tokens
├── components/                  # Reusable UI (shadcn + custom)
├── lib/
│   ├── auth/                    # Better Auth server + client
│   ├── db/                      # Drizzle schema + client
│   ├── news/                    # Aggregator (NewsAPI + GNews + RSS + bias)
│   ├── tts/                     # ElevenLabs client
│   ├── llm/                     # Claude script generator
│   ├── billing/                 # Stripe + PayPal + quota engine
│   ├── audio/                   # Mix, duck, encode
│   ├── email/                   # Resend templates
│   └── storage/                 # R2 + local download (File System Access API)
├── messages/                    # i18n strings
├── inngest/                     # Cron + background jobs
└── drizzle/                     # SQL migrations
```

## Required environment variables

See `.env.example`. The most critical for the foundation phase:

- `DATABASE_URL` — Neon Postgres connection string
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` — base URL of the app

The remaining keys (Anthropic, ElevenLabs, Stripe, NewsAPI, GNews, OpenWeather, Resend, R2, Inngest) are needed as their respective phases land.

## Wiring ElevenLabs (testing the voice engine)

ElevenLabs is the only service that produces audio. Get it working before
testing the full bulletin flow.

1. Create an account at https://elevenlabs.io and grab your API key from
   **Profile → API Key**.
2. Add `ELEVENLABS_API_KEY=sk_...` to `.env.local`.
3. Seed the voice catalog so AURA knows which presets to expose:
   ```bash
   bun run db:seed
   ```
4. Restart the dev server (`bun dev`).
5. Open `/en/settings/health` while logged in. The ElevenLabs row should
   show `OK` with your tier + character usage. Click **Play test sample**
   — if you hear audio, the full pipeline is live.

Troubleshooting:
- `unauthorized (check the API key)` → wrong key, paste again from the
  ElevenLabs dashboard.
- `forbidden` → your plan doesn't allow the voice you picked (e.g. some
  presets are gated on the free tier). Try a different voice in `/voices`.
- `rate limited` → too many calls in a short window; wait a minute.
- `upstream 5xx` → ElevenLabs is degraded; retry in a few minutes.

The same diagnostics page tests every other integration (Anthropic, Gemini,
NewsAPI, GNews, OpenWeather, Resend, R2, Stripe, Postgres, Better Auth).
Each card shows which env var it expects, so finding a missing key takes
seconds.

## Picking the LLM provider (Claude vs Gemini)

AURA can use either **Anthropic Claude** or **Google Gemini** for script
generation — same prompt, same emotion-tagged output, same ±2s
self-correcting duration loop. Set one (or both) of these:

```
# Either works on its own; pick whichever you already pay for.
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

If both are set, the app prefers Claude. Force a specific provider with:

```
LLM_PROVIDER=gemini   # or "claude"
```

Optional model overrides (defaults shown):

```
AURA_CLAUDE_MODEL=claude-sonnet-4-6
AURA_GEMINI_MODEL=gemini-2.5-pro
```

Where to get the keys:
- Claude: https://console.anthropic.com → API Keys
- Gemini: https://aistudio.google.com/apikey → Create API key

## Scripts

```bash
bun dev            # dev server (Turbopack)
bun build          # production build
bun lint           # ESLint
bun typecheck      # tsc --noEmit
bun test           # Vitest unit tests
bun db:generate    # generate SQL migration from schema
bun db:push        # push schema to DB (dev shortcut)
bun db:migrate     # apply migrations in order (prod)
bun db:studio      # Drizzle Studio (DB browser)
bun db:seed        # populate the voice catalog
bun env:check      # checklist of required + optional env vars
```

## Deploying to Vercel (production access in ~20 minutes)

The fastest path from "code in GitHub" to "URL my browser can hit". You'll
need accounts on: Vercel (free), Neon (free tier), ElevenLabs (free tier).

### 1. Provision Postgres on Neon (5 min)

1. Go to https://neon.tech and create a project.
2. Region: pick the closest to your users (Brazil → `aws-sa-east-1`,
   US East → `aws-us-east-1`).
3. Copy the **connection string** with `?sslmode=require` — you'll paste
   it as `DATABASE_URL` later.

### 2. Generate Better Auth secret (10 sec)

```bash
openssl rand -base64 32
```

Save the output as `BETTER_AUTH_SECRET`.

### 3. Get the ElevenLabs API key (2 min)

1. Sign up at https://elevenlabs.io.
2. Profile → API Keys → Copy.
3. Save as `ELEVENLABS_API_KEY`.

### 4. Deploy on Vercel (5 min)

1. https://vercel.com → **Add New Project**.
2. **Import** this GitHub repo (`luizlaffey-prod/LLWebsite-7318`).
3. **Root Directory**: click "Edit" and set to `aura/`. This is critical
   — the repo also contains the legacy radio website at the root.
4. **Framework Preset**: Next.js (auto-detected).
5. **Environment Variables** — add these before clicking Deploy:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string from step 1 |
   | `BETTER_AUTH_SECRET` | Output of `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | Leave blank for now, fill in after first deploy |
   | `NEXT_PUBLIC_APP_URL` | Same as `BETTER_AUTH_URL` |
   | `ELEVENLABS_API_KEY` | From step 3 |
   | `ANTHROPIC_API_KEY` *or* `GEMINI_API_KEY` | Script generator — Claude (https://console.anthropic.com) **or** Gemini (https://aistudio.google.com/apikey). Pick one. |

6. Click **Deploy**. First build takes ~3 minutes.

### 5. Configure URL + finish (2 min)

1. After deploy, Vercel gives you a URL like
   `https://aura-xxxx.vercel.app`.
2. Project → **Settings** → **Environment Variables**: edit
   `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the actual URL above.
3. Project → **Deployments** → "..." menu on the latest one → **Redeploy**.
4. While redeploying, push the schema to Neon:
   ```bash
   # locally, with the same DATABASE_URL exported
   DATABASE_URL='postgres://...' bun db:push
   DATABASE_URL='postgres://...' bun db:seed
   ```

### 6. First login

1. Open your Vercel URL.
2. Click **Start free** → fill out signup → no real card required at
   this point if Stripe vars are unset (the plan page will still load).
3. After signup, you'll land on `/dashboard`.
4. Navigate to `/settings/health` → ElevenLabs row should be green with
   your tier + character usage. Click **Play test sample** to confirm
   audio plays.
5. Go to `/news`, pick a category, hit **Search news**. If you set
   `NEWSAPI_KEY` or `GNEWS_KEY` you get real articles; otherwise add
   them later — every other piece of the flow works either way once
   ElevenLabs + Anthropic are wired.

### Optional integrations (add anytime)

Add these in Vercel → Settings → Environment Variables, then redeploy:

- **`NEWSAPI_KEY`** — https://newsapi.org (free tier: 100 req/day)
- **`GNEWS_KEY`** — https://gnews.io (free tier: 100 req/day)
- **`OPENWEATHER_API_KEY`** — https://openweathermap.org/api (weather block)
- **`RESEND_API_KEY`** + **`RESEND_FROM_EMAIL`** — https://resend.com
  (welcome + trial-ending emails)
- **`R2_ACCOUNT_ID`** + **`R2_ACCESS_KEY_ID`** + **`R2_SECRET_ACCESS_KEY`** +
  **`R2_BUCKET`** — Cloudflare R2 (where generated MP3s live).
  Without R2 the audio is generated but not persisted between deploys.
- **`STRIPE_SECRET_KEY`** + price IDs — gates the trial → paid flow.
- **`CRON_SECRET`** — `openssl rand -base64 32`. Required for the
  trial-warning / trial-downgrade / automation cron triggers.

### Smoke test checklist (after first deploy)

Hit these in order. Each one stresses a different part of the stack.

- [ ] Landing page (`/`) loads, locale switcher works (`/en`, `/pt`, `/es`).
- [ ] Signup at `/en/signup` creates a user in Neon.
- [ ] `/en/settings/health` shows ElevenLabs **OK** with your tier.
- [ ] `/en/voices` shows 10 voices (if you ran `db:seed`); Preview plays.
- [ ] `/en/news` returns articles for `Politics, bias=Center`.
- [ ] Generate Bulletin produces a script + plays audio in the drawer.
- [ ] `/en/audios` lists the bulletin you just generated.
- [ ] Download MP3 button works.

If any step breaks, `/en/settings/health` tells you exactly which
upstream is missing or misbehaving.

## Phased delivery

Implementation follows the plan at `../.claude/plans/greedy-strolling-valiant.md`. Phase 0 is foundation only — landing page, locale routing, Better Auth, Drizzle schema for `user`, `session`, `account`, `verification`, `subscription`, `usage_period`. Subsequent phases add billing, news search, bulletin generation, voices, automations, and Pro features.
