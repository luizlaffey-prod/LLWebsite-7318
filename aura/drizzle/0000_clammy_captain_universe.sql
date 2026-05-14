CREATE TYPE "public"."audio_status" AS ENUM('pending', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."news_bias" AS ENUM('left', 'center', 'right', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."geo_scope" AS ENUM('global', 'country', 'state', 'city');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'pt', 'es');--> statement-breakpoint
CREATE TYPE "public"."news_source_provider" AS ENUM('newsapi', 'gnews', 'rss');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('trial', 'starter', 'standard', 'pro');--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('stripe', 'paypal');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."voice_gender" AS ENUM('male', 'female', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."weather_format" AS ENUM('separate', 'integrated');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_audio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"news_search_id" uuid,
	"title" text NOT NULL,
	"source_article_url" text,
	"source_name" text,
	"original_script" jsonb NOT NULL,
	"edited_script" jsonb,
	"voice_id" uuid,
	"speed" real DEFAULT 1 NOT NULL,
	"bg_track_url" text,
	"audio_url" text,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"language" "locale" NOT NULL,
	"status" "audio_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"categories" jsonb NOT NULL,
	"duration_seconds" integer NOT NULL,
	"language" "locale" NOT NULL,
	"bias" "news_bias" DEFAULT 'center' NOT NULL,
	"include_weather" boolean DEFAULT false NOT NULL,
	"weather_format" "weather_format" DEFAULT 'separate',
	"geographic_scope" "geo_scope" DEFAULT 'global' NOT NULL,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"language" text NOT NULL,
	"rss_url" text,
	"api_source_id" text,
	"api_provider" "news_source_provider" NOT NULL,
	"bias" "news_bias" DEFAULT 'mixed' NOT NULL,
	"trust_score" integer DEFAULT 80 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_source_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"tier" "plan" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"external_id" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"bulletins_used" integer DEFAULT 0 NOT NULL,
	"bulletins_limit" integer NOT NULL,
	"overage_count" integer DEFAULT 0 NOT NULL,
	"overage_amount_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"image" text,
	"radio_name" text,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"plan" "plan" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"downgrades_to" "plan" DEFAULT 'starter',
	"stripe_customer_id" text,
	"paypal_subscription_id" text,
	"subscription_status" "subscription_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"eleven_labs_voice_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"languages" jsonb NOT NULL,
	"gender" "voice_gender" DEFAULT 'neutral' NOT NULL,
	"style" text,
	"accent" text,
	"tier_required" "plan" DEFAULT 'starter' NOT NULL,
	"preview_url" text,
	"is_cloned" boolean DEFAULT false NOT NULL,
	"owner_user_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "voice_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"voice_id" uuid NOT NULL,
	"speed" real DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_audio" ADD CONSTRAINT "generated_audio_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_audio" ADD CONSTRAINT "generated_audio_news_search_id_news_search_id_fk" FOREIGN KEY ("news_search_id") REFERENCES "public"."news_search"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_search" ADD CONSTRAINT "news_search_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_period" ADD CONSTRAINT "usage_period_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice" ADD CONSTRAINT "voice_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_preference" ADD CONSTRAINT "voice_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_preference" ADD CONSTRAINT "voice_preference_voice_id_voice_id_fk" FOREIGN KEY ("voice_id") REFERENCES "public"."voice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_audio_user_idx" ON "generated_audio" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "news_source_bias_idx" ON "news_source" USING btree ("bias");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_user_period_idx" ON "usage_period" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "voice_eleven_idx" ON "voice" USING btree ("eleven_labs_voice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voice_pref_user_voice_idx" ON "voice_preference" USING btree ("user_id","voice_id");