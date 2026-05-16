CREATE TABLE IF NOT EXISTS "monthly_music_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "tracks_used" integer DEFAULT 0 NOT NULL,
  "tracks_limit" integer NOT NULL,
  "overage_count" integer DEFAULT 0 NOT NULL,
  "overage_amount_cents" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "monthly_music_usage_user_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "music_usage_user_period_idx" ON "monthly_music_usage" ("user_id", "period_start");
