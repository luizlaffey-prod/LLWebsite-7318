CREATE TABLE IF NOT EXISTS "signup_attempt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ip_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signup_attempt_ip_idx" ON "signup_attempt" ("ip_hash", "created_at");
