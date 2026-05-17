-- Backfill trial_ends_at for accounts created before the user.create
-- hook was added. Any 'trial' user with NULL trial_ends_at gets a
-- 7-day window measured from their original signup (created_at), so
-- the dashboard's "X days left" math matches what the operator
-- expected at signup. Idempotent — re-running is a no-op because the
-- WHERE clause skips rows that already have a value.
UPDATE "user"
SET "trial_ends_at" = "created_at" + INTERVAL '7 days',
    "updated_at"    = NOW()
WHERE "plan" = 'trial'
  AND "trial_ends_at" IS NULL;
