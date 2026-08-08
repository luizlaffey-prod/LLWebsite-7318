CREATE TABLE IF NOT EXISTS "device_pairing_rate_limit" (
  "bucket_key" text PRIMARY KEY NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "blocked_until" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_pairing_rate_limit_updated_idx"
  ON "device_pairing_rate_limit" ("updated_at");
