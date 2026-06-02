-- Operator-configurable lead time per automation: how many minutes
-- BEFORE the slot's scheduled time the cron should start generating
-- the bulletin. Higher values catch fresher news (script + voice
-- synthesis takes ~30-60s, so the bulletin you hear at 7:00 was
-- composed at 6:50 with 10min lead, vs 5:00 with 2h lead). Tester
-- (Marco) explicitly asked for 1-2h preroll so the bulletin reflects
-- news from earlier the same morning, not the night before.
--
-- Default 60 minutes — generous enough to honor the request without
-- breaking existing automations that worked fine at the previous
-- hardcoded 10min. The cron's tolerance window already absorbs
-- whatever value the operator picks here.
ALTER TABLE "automation_schedule"
  ADD COLUMN IF NOT EXISTS "lead_time_minutes" integer NOT NULL DEFAULT 60;
