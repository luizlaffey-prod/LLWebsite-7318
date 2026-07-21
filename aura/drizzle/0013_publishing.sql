-- Website publishing connection (newsroom feature). Each station configures
-- one connection in /settings/publishing so AURA can push approved written
-- articles to the station's site — WordPress via its REST API, or a generic
-- webhook. Credentials live in an encrypted blob (lib/crypto/secrets.ts);
-- only the non-secret site URL and default post status are plaintext.

DO $$ BEGIN
  CREATE TYPE "publishing_type" AS ENUM ('wordpress', 'webhook');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "publishing_connection" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE cascade,
  "type" "publishing_type" NOT NULL,
  "site_url" text NOT NULL,
  "config_encrypted" text NOT NULL,
  "default_status" text NOT NULL DEFAULT 'draft',
  "enabled" boolean NOT NULL DEFAULT true,
  "verified_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "publishing_connection_user_idx"
  ON "publishing_connection" ("user_id");
