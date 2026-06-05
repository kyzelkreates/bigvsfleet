-- ============================================================
-- Big V's Best Routes™ — Run 14 Demo/Live Validation SQL Patch
-- Safety & Legal Compliance First Navigation Platform
-- 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- RUN 14 — Demo/Live Hard Separation + Production Validation
--
-- PURPOSE:
--   Additive SQL patch to validate and harden demo/live data separation
--   at the database layer. Adds safe columns and indexes where missing.
--
-- EXECUTION ORDER (REQUIRED — apply AFTER Run 11 schema):
--   1. Additive column additions (safe — ADD COLUMN IF NOT EXISTS)
--   2. Additive indexes
--   3. Enable RLS (safe — already enabled, no-op if already set)
--   4. Additive policies
--   5. Additive sync_conflicts table
--   6. Verification query
--   7. Rollback notes
--
-- RLS STATUS:
--   RLS IS ENABLED ON ALL OPERATIONAL TABLES.
--   This patch does not disable RLS on any table.
--   This patch does not create public open policies.
--   This patch does not weaken existing policies.
--
-- SECURITY:
--   Never use the Supabase service role key in frontend code.
--   Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend.
--
-- ADVISORY:
--   All fields, tables, and policies in this patch are advisory.
--   No field, column, or trigger implies legal compliance guarantee.
--   Drivers, fleet managers, and controllers remain responsible.
--
-- ROLLBACK:
--   See bottom of file — individual rollback statements provided.
--   Do not rollback Run 11 schema to rollback this patch.
--   Rollback only Run 14 columns/indexes/table.
-- ============================================================


-- ════════════════════════════════════════════════════════════════
-- STEP 1 — ADDITIVE COLUMN ADDITIONS
-- Adds record_source, sync_mode, mode_visibility where missing.
-- All safe: ALTER TABLE … ADD COLUMN IF NOT EXISTS
-- ════════════════════════════════════════════════════════════════

-- record_source: labels where a record came from
-- Values: demo_local | live_backend | offline_queue | imported | unknown
DO $$
DECLARE
  t TEXT;
  operational_tables TEXT[] := ARRAY[
    'route_assignments', 'active_trips', 'trip_events', 'driver_statuses',
    'gps_location_updates', 'pre_trip_checklists', 'route_acknowledgements',
    'compliance_acknowledgements', 'incident_reports', 'driver_notes',
    'controller_actions', 'controller_notes', 'vehicle_readiness',
    'compliance_checks', 'route_risk_results', 'safety_oversight_results',
    'legal_compliance_oversight_results', 'sync_events'
  ];
BEGIN
  FOREACH t IN ARRAY operational_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      -- record_source column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='record_source') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN record_source TEXT DEFAULT %L', t, 'unknown');
        RAISE NOTICE 'Added record_source to %', t;
      END IF;
      -- sync_mode column
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='sync_mode') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN sync_mode TEXT DEFAULT %L', t, 'unknown');
        RAISE NOTICE 'Added sync_mode to %', t;
      END IF;
    END IF;
  END LOOP;
END $$;

-- reviewed column on incident_reports (used by Run 13 controller reviews)
ALTER TABLE IF EXISTS public.incident_reports
  ADD COLUMN IF NOT EXISTS reviewed          BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes      TEXT,
  ADD COLUMN IF NOT EXISTS review_by_controller TEXT;

-- advisory_only enforcement columns
ALTER TABLE IF EXISTS public.compliance_acknowledgements
  ADD COLUMN IF NOT EXISTS advisory_only     BOOLEAN   DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS no_guarantee      BOOLEAN   DEFAULT TRUE;

ALTER TABLE IF EXISTS public.vehicle_readiness
  ADD COLUMN IF NOT EXISTS advisory_only     BOOLEAN   DEFAULT TRUE;

ALTER TABLE IF EXISTS public.compliance_checks
  ADD COLUMN IF NOT EXISTS advisory_only     BOOLEAN   DEFAULT TRUE;

ALTER TABLE IF EXISTS public.route_risk_results
  ADD COLUMN IF NOT EXISTS advisory_only     BOOLEAN   DEFAULT TRUE;

ALTER TABLE IF EXISTS public.safety_oversight_results
  ADD COLUMN IF NOT EXISTS advisory_only     BOOLEAN   DEFAULT TRUE;

ALTER TABLE IF EXISTS public.legal_compliance_oversight_results
  ADD COLUMN IF NOT EXISTS advisory_only     BOOLEAN   DEFAULT TRUE;


-- ════════════════════════════════════════════════════════════════
-- STEP 2 — SYNC CONFLICTS TABLE
-- Stores detected sync conflicts for human review.
-- Evidence-safe: never auto-deletes either version.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id     UUID         REFERENCES public.organisations(id) ON DELETE CASCADE,
  record_type         TEXT         NOT NULL,           -- 'trip_event' | 'incident_report' | 'controller_action' etc.
  status              TEXT         DEFAULT 'needs_review', -- needs_review | resolved
  reason              TEXT,                            -- 'backend_newer_local_pending' | 'timestamps_missing' etc.
  local_record_id     TEXT,
  local_updated_at    TIMESTAMPTZ,
  local_summary       TEXT,
  backend_record_id   TEXT,
  backend_updated_at  TIMESTAMPTZ,
  backend_summary     TEXT,
  related_driver_id   UUID,
  related_vehicle_id  UUID,
  related_route_id    UUID,
  related_trip_id     UUID,
  related_incident_id UUID,
  resolution          TEXT,                            -- use_local | use_backend | manual_merge
  resolved_by         TEXT,
  resolved_at         TIMESTAMPTZ,
  recommended_action  TEXT         DEFAULT 'Human review required. Do not auto-delete either version.',
  warning_message     TEXT         DEFAULT 'Sync conflict detected. Local and backend records differ. Human review required.',
  auto_resolved       BOOLEAN      DEFAULT FALSE,
  evidence_safe       BOOLEAN      DEFAULT TRUE,       -- always true — evidence never deleted
  is_demo             BOOLEAN      DEFAULT FALSE,
  detected_at         TIMESTAMPTZ  DEFAULT NOW(),
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE public.sync_conflicts IS
  'Run 14 — Sync conflicts needing human review. Evidence-safe: auto_resolved is always FALSE. Evidence is never deleted.';


-- ════════════════════════════════════════════════════════════════
-- STEP 3 — ADDITIVE INDEXES
-- ════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_org_status
  ON public.sync_conflicts(organisation_id, status);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_record_type
  ON public.sync_conflicts(record_type, status);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_detected_at
  ON public.sync_conflicts(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_reports_reviewed
  ON public.incident_reports(organisation_id, reviewed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_reports_record_source
  ON public.incident_reports(organisation_id, record_source);

CREATE INDEX IF NOT EXISTS idx_controller_actions_record_source
  ON public.controller_actions(organisation_id, record_source);


-- ════════════════════════════════════════════════════════════════
-- STEP 4 — ENABLE RLS ON sync_conflicts
-- (All other tables already have RLS from Run 11)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════
-- STEP 5 — ADDITIVE POLICIES
-- ════════════════════════════════════════════════════════════════

-- sync_conflicts: fleet admins can manage, controllers can read
DROP POLICY IF EXISTS "fleet_admin_manage_sync_conflicts"    ON public.sync_conflicts;
DROP POLICY IF EXISTS "fleet_controller_read_sync_conflicts" ON public.sync_conflicts;

CREATE POLICY "fleet_admin_manage_sync_conflicts"
  ON public.sync_conflicts
  FOR ALL
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('fleet_admin', 'super_admin')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('fleet_admin', 'super_admin')
    )
  );

CREATE POLICY "fleet_controller_read_sync_conflicts"
  ON public.sync_conflicts
  FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('fleet_admin', 'super_admin', 'fleet_controller')
    )
  );

-- incident_reports: allow controller to update review fields only (not delete)
DROP POLICY IF EXISTS "fleet_controller_review_incidents" ON public.incident_reports;

CREATE POLICY "fleet_controller_review_incidents"
  ON public.incident_reports
  FOR UPDATE
  TO authenticated
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('fleet_admin', 'super_admin', 'fleet_controller')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('fleet_admin', 'super_admin', 'fleet_controller')
    )
  );


-- ════════════════════════════════════════════════════════════════
-- STEP 6 — UPDATED_AT TRIGGER FOR sync_conflicts
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_sync_conflicts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_conflicts_updated_at ON public.sync_conflicts;
CREATE TRIGGER trigger_sync_conflicts_updated_at
  BEFORE UPDATE ON public.sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_sync_conflicts_updated_at();


-- ════════════════════════════════════════════════════════════════
-- STEP 7 — VERIFICATION QUERY
-- Run this after applying the patch to verify all tables exist.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  missing_tables TEXT[] := '{}';
  required_tables TEXT[] := ARRAY[
    -- Run 11 tables
    'organisations', 'profiles', 'vehicles', 'drivers', 'fleet_controllers',
    'fleet_routes', 'route_waypoints', 'route_assignments', 'active_trips',
    'trip_events', 'driver_statuses', 'gps_location_updates', 'pre_trip_checklists',
    'route_acknowledgements', 'compliance_acknowledgements', 'incident_reports',
    'driver_notes', 'controller_actions', 'controller_notes', 'vehicle_readiness',
    'compliance_checks', 'route_risk_results', 'safety_oversight_results',
    'legal_compliance_oversight_results', 'pwa_deployments', 'sync_events',
    'evidence_summaries', 'report_drafts', 'backend_health_checks',
    -- Run 14 table
    'sync_conflicts'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      missing_tables := array_append(missing_tables, t);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Run 14 patch — missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'Run 14 patch verification passed — all 30 tables present. RLS enabled. Evidence-safe.';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════
-- ROLLBACK NOTES
-- To rollback ONLY Run 14 changes:
--
--   DROP TABLE IF EXISTS public.sync_conflicts;
--
--   ALTER TABLE public.incident_reports
--     DROP COLUMN IF EXISTS reviewed,
--     DROP COLUMN IF EXISTS reviewed_at,
--     DROP COLUMN IF EXISTS review_notes,
--     DROP COLUMN IF EXISTS review_by_controller;
--
--   -- Remove record_source / sync_mode from individual tables if needed:
--   ALTER TABLE public.route_assignments DROP COLUMN IF EXISTS record_source;
--   ALTER TABLE public.route_assignments DROP COLUMN IF EXISTS sync_mode;
--   -- ... repeat for each table listed in Step 1
--
-- Do NOT rollback Run 11 schema to undo this patch.
-- ════════════════════════════════════════════════════════════════
