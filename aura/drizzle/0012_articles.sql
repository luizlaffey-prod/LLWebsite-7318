-- Written journalistic articles (web / newsroom feature). Generated from the
-- same news research as audio bulletins, reviewed by a human, then optionally
-- published to the station's website (e.g. WordPress). Status starts at
-- 'draft' so nothing publishes without approval.

DO $$ BEGIN
  CREATE TYPE "article_status" AS ENUM ('draft', 'approved', 'published', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "article_image_source" AS ENUM ('source', 'ai', 'upload', 'none');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "article" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "news_search_id" uuid REFERENCES "news_search"("id") ON DELETE set null,
  "title" text NOT NULL,
  "lede" text,
  "body" jsonb NOT NULL,
  "edited_body" jsonb,
  "source_name" text,
  "source_article_url" text,
  "image_url" text,
  "image_source" "article_image_source" NOT NULL DEFAULT 'none',
  "image_credit" text,
  "categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "language" "locale" NOT NULL,
  "word_count" integer NOT NULL DEFAULT 0,
  "status" "article_status" NOT NULL DEFAULT 'draft',
  "error_message" text,
  "published_url" text,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "article_user_idx" ON "article" ("user_id", "created_at");
