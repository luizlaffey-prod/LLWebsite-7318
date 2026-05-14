CREATE TYPE "public"."automation_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "automation_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_schedule_id" uuid NOT NULL,
	"audio_id" uuid,
	"scheduled_for" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	"slot_time" text NOT NULL,
	"status" "automation_status" DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slots" jsonb NOT NULL,
	"duration_seconds" integer NOT NULL,
	"language" "locale" NOT NULL,
	"voice_id" uuid,
	"speed" real DEFAULT 1 NOT NULL,
	"bg_track_url" text,
	"duck_audio" boolean DEFAULT true NOT NULL,
	"include_weather" boolean DEFAULT false NOT NULL,
	"weather_format" "weather_format" DEFAULT 'separate',
	"geographic_scope" "geo_scope" DEFAULT 'global' NOT NULL,
	"location" text,
	"bias" "news_bias" DEFAULT 'center' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_execution" ADD CONSTRAINT "automation_execution_automation_schedule_id_automation_schedule_id_fk" FOREIGN KEY ("automation_schedule_id") REFERENCES "public"."automation_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution" ADD CONSTRAINT "automation_execution_audio_id_generated_audio_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."generated_audio"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_schedule" ADD CONSTRAINT "automation_schedule_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_schedule" ADD CONSTRAINT "automation_schedule_voice_id_voice_id_fk" FOREIGN KEY ("voice_id") REFERENCES "public"."voice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_exec_sched_idx" ON "automation_execution" USING btree ("automation_schedule_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "automation_user_idx" ON "automation_schedule" USING btree ("user_id","enabled");