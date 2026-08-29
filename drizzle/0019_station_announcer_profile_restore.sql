CREATE TABLE IF NOT EXISTS "station_announcer_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_id" uuid NOT NULL REFERENCES "station"("id") ON DELETE cascade,
  "voice_id" uuid NOT NULL REFERENCES "voice"("id") ON DELETE cascade,
  "personality" text NOT NULL DEFAULT '',
  "delivery_style" text NOT NULL DEFAULT '',
  "example_scripts" text NOT NULL DEFAULT '',
  "signatures" text NOT NULL DEFAULT '',
  "editorial_preferences" text NOT NULL DEFAULT '',
  "avoidances" text NOT NULL DEFAULT '',
  "pronunciation_guide" text NOT NULL DEFAULT '',
  "humor_level" text NOT NULL DEFAULT 'balanced',
  "energy_level" text NOT NULL DEFAULT 'balanced',
  "reactions_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "station_announcer_profile"
  ADD COLUMN IF NOT EXISTS "delivery_style" text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS "station_announcer_profile_station_voice_idx"
  ON "station_announcer_profile" ("station_id", "voice_id");

CREATE INDEX IF NOT EXISTS "station_announcer_profile_station_idx"
  ON "station_announcer_profile" ("station_id");
