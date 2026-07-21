DO $$ BEGIN
  CREATE TYPE "studio_entitlement_status" AS ENUM ('trialing', 'active', 'grace', 'suspended', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "studio_license_lease_status" AS ENUM ('active', 'superseded', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "studio_license_challenge_purpose" AS ENUM ('lease', 'heartbeat', 'deactivate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_entitlement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "status" "studio_entitlement_status" DEFAULT 'trialing' NOT NULL,
  "plan_code" text DEFAULT 'trial' NOT NULL,
  "source" text DEFAULT 'trial' NOT NULL,
  "source_reference" text,
  "features" jsonb NOT NULL,
  "max_stations" integer DEFAULT 1 NOT NULL,
  "max_devices_per_station" integer DEFAULT 2 NOT NULL,
  "max_concurrent_outputs" integer DEFAULT 1 NOT NULL,
  "valid_until" timestamp with time zone,
  "grace_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "studio_entitlement_organization_idx" ON "studio_entitlement" ("organization_id");
CREATE INDEX IF NOT EXISTS "studio_entitlement_source_reference_idx" ON "studio_entitlement" ("source", "source_reference");
--> statement-breakpoint
ALTER TABLE "station_device" ADD COLUMN IF NOT EXISTS "activation_slot" integer;
ALTER TABLE "station_device" ADD COLUMN IF NOT EXISTS "device_key_algorithm" text;
ALTER TABLE "station_device" ADD COLUMN IF NOT EXISTS "device_public_key" text;
ALTER TABLE "station_device" ADD COLUMN IF NOT EXISTS "device_key_fingerprint" text;
ALTER TABLE "station_device" ADD COLUMN IF NOT EXISTS "last_license_issued_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "station_device"
SET
  "status" = 'revoked',
  "revoked_at" = COALESCE("revoked_at", now()),
  "activation_slot" = NULL,
  "device_key_algorithm" = COALESCE("device_key_algorithm", 'legacy'),
  "device_public_key" = COALESCE("device_public_key", ''),
  "device_key_fingerprint" = COALESCE("device_key_fingerprint", 'legacy:' || "id"::text),
  "updated_at" = now()
WHERE "device_key_algorithm" IS NULL
   OR "device_public_key" IS NULL
   OR "device_key_fingerprint" IS NULL;
--> statement-breakpoint
ALTER TABLE "station_device" ALTER COLUMN "device_key_algorithm" SET NOT NULL;
ALTER TABLE "station_device" ALTER COLUMN "device_public_key" SET NOT NULL;
ALTER TABLE "station_device" ALTER COLUMN "device_key_fingerprint" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "station_device_activation_slot_idx" ON "station_device" ("station_id", "activation_slot");
CREATE UNIQUE INDEX IF NOT EXISTS "station_device_key_fingerprint_idx" ON "station_device" ("device_key_fingerprint") WHERE "status" = 'active';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_license_challenge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_id" uuid NOT NULL REFERENCES "station_device"("id") ON DELETE CASCADE,
  "purpose" "studio_license_challenge_purpose" NOT NULL,
  "challenge_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_license_challenge_device_expiry_idx" ON "studio_license_challenge" ("device_id", "expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_license_lease" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entitlement_id" uuid NOT NULL REFERENCES "studio_entitlement"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE CASCADE,
  "device_id" uuid NOT NULL REFERENCES "station_device"("id") ON DELETE CASCADE,
  "status" "studio_license_lease_status" DEFAULT 'active' NOT NULL,
  "token_hash" text NOT NULL,
  "key_id" text NOT NULL,
  "plan_code" text NOT NULL,
  "features" jsonb NOT NULL,
  "app_version" text NOT NULL,
  "build_channel" text NOT NULL,
  "online_expires_at" timestamp with time zone NOT NULL,
  "offline_grace_until" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "studio_license_lease_token_hash_idx" ON "studio_license_lease" ("token_hash");
CREATE INDEX IF NOT EXISTS "studio_license_lease_device_status_idx" ON "studio_license_lease" ("device_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "studio_license_lease_station_expiry_idx" ON "studio_license_lease" ("station_id", "offline_grace_until");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_output_lease" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE CASCADE,
  "slot" integer NOT NULL,
  "device_id" uuid NOT NULL REFERENCES "station_device"("id") ON DELETE CASCADE,
  "license_lease_id" uuid NOT NULL REFERENCES "studio_license_lease"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL,
  "output_id" text NOT NULL,
  "app_version" text NOT NULL,
  "last_heartbeat_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "studio_output_lease_station_slot_idx" ON "studio_output_lease" ("station_id", "slot");
CREATE UNIQUE INDEX IF NOT EXISTS "studio_output_lease_session_idx" ON "studio_output_lease" ("session_id");
CREATE INDEX IF NOT EXISTS "studio_output_lease_expiry_idx" ON "studio_output_lease" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_license_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "station_id" uuid REFERENCES "station"("id") ON DELETE SET NULL,
  "device_id" uuid REFERENCES "station_device"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_license_event_org_created_idx" ON "studio_license_event" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "studio_license_event_station_created_idx" ON "studio_license_event" ("station_id", "created_at");
