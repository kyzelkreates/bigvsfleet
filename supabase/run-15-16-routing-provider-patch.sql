-- ============================================================
-- Big V's Best Routes™ — Run 15-16 Routing Provider SQL Patch
-- COMBINED RUN 15-16 — Advanced Overpass + GraphHopper
--
-- SAFE ADDITIVE PATCH — apply after Run 14 patch.
-- Adds advisory_only enforcement + provider columns to
-- route_risk_results where missing.
--
-- RLS STATUS: RLS REMAINS ENABLED ON ALL TABLES.
-- ADVISORY: All data stored here is advisory only.
-- ============================================================

-- Step 1: Additive column additions to route_risk_results
ALTER TABLE IF EXISTS public.route_risk_results
  ADD COLUMN IF NOT EXISTS provider              TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS provider_status       TEXT DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS vehicle_profile       TEXT,
  ADD COLUMN IF NOT EXISTS restriction_concerns  JSONB,
  ADD COLUMN IF NOT EXISTS route_instructions    JSONB,
  ADD COLUMN IF NOT EXISTS route_distance_m      NUMERIC,
  ADD COLUMN IF NOT EXISTS route_duration_ms     BIGINT,
  ADD COLUMN IF NOT EXISTS record_source         TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS advisory_only         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS no_guarantee          BOOLEAN DEFAULT TRUE;

-- Step 2: Advisory-only enforcement index
CREATE INDEX IF NOT EXISTS idx_route_risk_results_provider
  ON public.route_risk_results(organisation_id, provider, created_at DESC);

-- Step 3: Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='route_risk_results') THEN
    RAISE NOTICE 'Run 15-16 patch: route_risk_results patched. RLS remains enabled. Advisory only.';
  ELSE
    RAISE WARNING 'Run 15-16 patch: route_risk_results table not found. Apply Run 11 schema first.';
  END IF;
END $$;

-- ROLLBACK: ALTER TABLE public.route_risk_results DROP COLUMN IF EXISTS provider, DROP COLUMN IF EXISTS provider_status, DROP COLUMN IF EXISTS vehicle_profile, DROP COLUMN IF EXISTS restriction_concerns, DROP COLUMN IF EXISTS route_instructions, DROP COLUMN IF EXISTS route_distance_m, DROP COLUMN IF EXISTS route_duration_ms;
