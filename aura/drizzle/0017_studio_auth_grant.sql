-- Studio Pro in-app login ("Sign in with AURA"): OAuth 2.0 Authorization Code
-- + PKCE (S256) for the public desktop client. A short-lived, single-use
-- authorization code is issued in the browser after the user authenticates,
-- selects a station and consents to registering the computer; the desktop
-- then exchanges it (with its PKCE verifier and P-256 proof) for the same
-- device credentials the existing pairing flow issues. Only the code HASH is
-- stored; the code itself never persists.

CREATE TABLE IF NOT EXISTS "studio_auth_grant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  -- Keyed hash of the authorization code (never the code itself). Unique so
  -- a code can back exactly one grant.
  "code_hash" text NOT NULL UNIQUE,
  "client_id" text NOT NULL,
  "redirect_uri" text NOT NULL,
  "pkce_challenge" text NOT NULL,
  "pkce_method" text NOT NULL DEFAULT 'S256',
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE cascade,
  "device_name" text NOT NULL,
  "device_platform" text NOT NULL,
  "device_public_key" text NOT NULL,
  "device_key_algorithm" text NOT NULL DEFAULT 'ES256',
  "device_fingerprint" text NOT NULL,
  "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "expires_at" timestamptz NOT NULL,
  -- Set exactly once, atomically, when the code is exchanged. A second
  -- exchange finds it non-null and is rejected (replay protection).
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "studio_auth_grant_expires_idx"
  ON "studio_auth_grant" ("expires_at");

-- Generic fixed-window rate limiter for public routes (auth token exchange,
-- authorize, and the existing device endpoints). One row per (key, window);
-- `expires_at` lets a cleanup job purge stale rows.
CREATE TABLE IF NOT EXISTS "rate_limit" (
  "bucket" text PRIMARY KEY,
  "count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS "rate_limit_expires_idx"
  ON "rate_limit" ("expires_at");
