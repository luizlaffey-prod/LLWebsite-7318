ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "feed_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_feed_token_idx" ON "user" ("feed_token");
