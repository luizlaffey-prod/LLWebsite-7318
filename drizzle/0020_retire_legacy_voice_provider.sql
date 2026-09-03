INSERT INTO "voice" (
  "slug",
  "eleven_labs_voice_id",
  "name",
  "description",
  "languages",
  "gender",
  "style",
  "tier_required",
  "enabled"
) VALUES (
  'fish-default',
  'fish:default',
  'AURA Default',
  'Default multilingual system voice.',
  '["en", "pt", "es"]'::jsonb,
  'neutral',
  'conversational',
  'starter',
  true
)
ON CONFLICT ("slug") DO UPDATE SET
  "eleven_labs_voice_id" = EXCLUDED."eleven_labs_voice_id",
  "enabled" = true;
--> statement-breakpoint
UPDATE "automation_schedule"
SET "voice_id" = (SELECT "id" FROM "voice" WHERE "slug" = 'fish-default')
WHERE "voice_id" IN (
  SELECT "id" FROM "voice" WHERE "eleven_labs_voice_id" NOT LIKE 'fish:%'
);
--> statement-breakpoint
UPDATE "station"
SET "default_voice_id" = (SELECT "id" FROM "voice" WHERE "slug" = 'fish-default')
WHERE "default_voice_id" IN (
  SELECT "id" FROM "voice" WHERE "eleven_labs_voice_id" NOT LIKE 'fish:%'
);
--> statement-breakpoint
INSERT INTO "voice_preference" ("user_id", "voice_id", "speed", "is_default")
SELECT
  legacy_preference."user_id",
  fish_default."id",
  legacy_preference."speed",
  true
FROM "voice_preference" AS legacy_preference
INNER JOIN "voice" AS legacy_voice
  ON legacy_voice."id" = legacy_preference."voice_id"
CROSS JOIN "voice" AS fish_default
WHERE legacy_preference."is_default" = true
  AND legacy_voice."eleven_labs_voice_id" NOT LIKE 'fish:%'
  AND fish_default."slug" = 'fish-default'
ON CONFLICT ("user_id", "voice_id") DO UPDATE SET
  "speed" = EXCLUDED."speed",
  "is_default" = true;
--> statement-breakpoint
UPDATE "voice_preference"
SET "is_default" = false
WHERE "voice_id" IN (
  SELECT "id" FROM "voice" WHERE "eleven_labs_voice_id" NOT LIKE 'fish:%'
);
--> statement-breakpoint
UPDATE "voice"
SET "enabled" = false
WHERE "eleven_labs_voice_id" NOT LIKE 'fish:%';
