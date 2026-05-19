-- Dedicated weather city for automations, mirroring the field we
-- added to the Buscar Notícias flow. Lets the operator pick global
-- news + local weather (or any independent mix). Falls back to the
-- existing `location` column when null. Existing rows keep working
-- because every consumer treats this column as optional.
ALTER TABLE "automation_schedule"
  ADD COLUMN IF NOT EXISTS "weather_city" text;
