# AURA — Automated Urban Radio Audio

B2B SaaS for radio stations to generate AI-voiced news bulletins on demand.

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

The same diagnostics page tests every other integration (Anthropic, NewsAPI,
GNews, OpenWeather, Resend, R2, Stripe, Postgres, Better Auth). Each card
shows which env var it expects, so finding a missing key takes seconds.

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
```

## Phased delivery

Implementation follows the plan at `../.claude/plans/greedy-strolling-valiant.md`. Phase 0 is foundation only — landing page, locale routing, Better Auth, Drizzle schema for `user`, `session`, `account`, `verification`, `subscription`, `usage_period`. Subsequent phases add billing, news search, bulletin generation, voices, automations, and Pro features.
