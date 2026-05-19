-- Toggle for the topic-transition sting effect. Defaults to ON since
-- the cost is one cached audio file (generated once, reused across
-- every bulletin) and the beta tester explicitly asked for the
-- separation between news topics.
ALTER TABLE "automation_schedule"
  ADD COLUMN IF NOT EXISTS "transition_effects" boolean NOT NULL DEFAULT true;
