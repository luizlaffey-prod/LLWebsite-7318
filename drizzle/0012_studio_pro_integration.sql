DO $$ BEGIN
  CREATE TYPE "organization_role" AS ENUM ('owner', 'admin', 'operator', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "station_device_status" AS ENUM ('active', 'revoked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "integration_request_status" AS ENUM ('pending', 'processing', 'ready', 'failed', 'expired', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "station_event_type" AS ENUM ('asset_downloaded', 'asset_validated', 'asset_queued', 'asset_aired', 'asset_skipped', 'asset_failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "billing_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_idx" ON "organization" ("slug");
CREATE INDEX IF NOT EXISTS "organization_billing_user_idx" ON "organization" ("billing_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" "organization_role" DEFAULT 'viewer' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_member_org_user_idx" ON "organization_member" ("organization_id", "user_id");
CREATE INDEX IF NOT EXISTS "organization_member_user_idx" ON "organization_member" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "station" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "default_language" "locale" DEFAULT 'en' NOT NULL,
  "default_voice_id" uuid REFERENCES "voice"("id") ON DELETE SET NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "station_org_slug_idx" ON "station" ("organization_id", "slug");
CREATE INDEX IF NOT EXISTS "station_organization_idx" ON "station" ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "station_device" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "platform" text NOT NULL,
  "status" "station_device_status" DEFAULT 'active' NOT NULL,
  "scopes" jsonb NOT NULL,
  "access_token_hash" text NOT NULL,
  "access_token_prefix" text NOT NULL,
  "access_token_expires_at" timestamp with time zone NOT NULL,
  "refresh_token_hash" text NOT NULL,
  "refresh_token_expires_at" timestamp with time zone NOT NULL,
  "last_seen_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "station_device_access_token_idx" ON "station_device" ("access_token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "station_device_refresh_token_idx" ON "station_device" ("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "station_device_station_idx" ON "station_device" ("station_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_pairing_code" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE CASCADE,
  "requested_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "code_hash" text NOT NULL,
  "scopes" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "device_pairing_code_hash_idx" ON "device_pairing_code" ("code_hash");
CREATE INDEX IF NOT EXISTS "device_pairing_station_idx" ON "device_pairing_code" ("station_id", "expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_content_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE CASCADE,
  "requested_by_device_id" uuid REFERENCES "station_device"("id") ON DELETE SET NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "kind" text NOT NULL,
  "status" "integration_request_status" DEFAULT 'pending' NOT NULL,
  "input" jsonb NOT NULL,
  "source_references" jsonb,
  "audio_id" uuid REFERENCES "generated_audio"("id") ON DELETE SET NULL,
  "scheduled_for" timestamp with time zone,
  "valid_from" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  "asset_sha256" text,
  "asset_bytes" integer,
  "asset_content_type" text,
  "error_code" text,
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_request_station_idem_idx" ON "integration_content_request" ("station_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "integration_request_station_updated_idx" ON "integration_content_request" ("station_id", "updated_at");
CREATE INDEX IF NOT EXISTS "integration_request_pending_idx" ON "integration_content_request" ("status", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "station_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE CASCADE,
  "device_id" uuid NOT NULL REFERENCES "station_device"("id") ON DELETE CASCADE,
  "content_request_id" uuid REFERENCES "integration_content_request"("id") ON DELETE SET NULL,
  "audio_id" uuid REFERENCES "generated_audio"("id") ON DELETE SET NULL,
  "type" "station_event_type" NOT NULL,
  "idempotency_key" text NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "station_event_device_idem_idx" ON "station_event" ("device_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "station_event_station_occurred_idx" ON "station_event" ("station_id", "occurred_at");
