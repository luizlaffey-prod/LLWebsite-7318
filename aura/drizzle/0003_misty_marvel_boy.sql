CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."delivery_type" AS ENUM('ftp', 'http', 'email');--> statement-breakpoint
CREATE TABLE "delivery_endpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "delivery_type" NOT NULL,
	"config_encrypted" text NOT NULL,
	"slot_naming_pattern" text DEFAULT '{{name}}_{{date}}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_endpoint_id" uuid NOT NULL,
	"audio_id" uuid,
	"status" "delivery_status" NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "brand_logo_url" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "brand_accent_color" text;--> statement-breakpoint
ALTER TABLE "delivery_endpoint" ADD CONSTRAINT "delivery_endpoint_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_log" ADD CONSTRAINT "delivery_log_delivery_endpoint_id_delivery_endpoint_id_fk" FOREIGN KEY ("delivery_endpoint_id") REFERENCES "public"."delivery_endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_log" ADD CONSTRAINT "delivery_log_audio_id_generated_audio_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."generated_audio"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_user_idx" ON "delivery_endpoint" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "delivery_log_endpoint_idx" ON "delivery_log" USING btree ("delivery_endpoint_id");