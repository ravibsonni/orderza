-- ============================================================
-- Orderza — Enable Realtime for rider tracking
-- Migration: 002_enable_realtime.sql
-- ============================================================
-- The 001 schema noted this had to be run by hand in the dashboard.
-- When migrations are applied via the Supabase GitHub integration or
-- `supabase db push`, they run as the `postgres` role, which owns the
-- `supabase_realtime` publication — so it can be automated here.
--
-- Wrapped in a guard so it is idempotent (safe to re-run, and a no-op
-- if the table was already added to the publication manually).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'rider_tracking_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rider_tracking_sessions;
  END IF;
END $$;
