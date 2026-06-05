-- ============================================================
-- Big V's Best Routes™ — ROLLBACK Run 11
-- Safety & Legal Compliance First Navigation Platform
-- 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- ⚠️  WARNING: This script DROPS all Run 11 tables.
--
-- Only run this rollback on a development/test Supabase project
-- unless you are absolutely certain.
--
-- NEVER run on production without a full database backup.
-- NEVER run if real driver, incident, or compliance evidence exists.
-- Evidence must not be destroyed once operational records are present.
--
-- EXECUTION ORDER:
--   Drop tables in reverse dependency order.
--   Drop functions after tables.
--   Drop policies automatically cascade when tables are dropped.
--   Drop triggers automatically cascade when tables are dropped.
-- ============================================================

-- ── CONFIRM YOU INTEND TO RUN THIS ──────────────────────────
-- Uncomment the block below and replace with your project ref
-- to confirm this is a development rollback.
--
-- DO $$
-- BEGIN
--   IF current_database() = 'postgres' THEN
--     RAISE NOTICE '⚠️ Running Run 11 rollback on: %', current_database();
--   END IF;
-- END $$;

-- ── DROP TABLES (reverse dependency order) ────────────────────

DROP TABLE IF EXISTS public.backend_health_checks                  CASCADE;
DROP TABLE IF EXISTS public.report_drafts                          CASCADE;
DROP TABLE IF EXISTS public.evidence_summaries                     CASCADE;
DROP TABLE IF EXISTS public.sync_events                            CASCADE;
DROP TABLE IF EXISTS public.pwa_deployments                        CASCADE;
DROP TABLE IF EXISTS public.legal_compliance_oversight_results     CASCADE;
DROP TABLE IF EXISTS public.safety_oversight_results               CASCADE;
DROP TABLE IF EXISTS public.route_risk_results                     CASCADE;
DROP TABLE IF EXISTS public.compliance_checks                      CASCADE;
DROP TABLE IF EXISTS public.vehicle_readiness                      CASCADE;
DROP TABLE IF EXISTS public.controller_notes                       CASCADE;
DROP TABLE IF EXISTS public.controller_actions                     CASCADE;
DROP TABLE IF EXISTS public.driver_notes                           CASCADE;
DROP TABLE IF EXISTS public.incident_reports                       CASCADE;
DROP TABLE IF EXISTS public.compliance_acknowledgements            CASCADE;
DROP TABLE IF EXISTS public.route_acknowledgements                 CASCADE;
DROP TABLE IF EXISTS public.pre_trip_checklists                    CASCADE;
DROP TABLE IF EXISTS public.gps_location_updates                   CASCADE;
DROP TABLE IF EXISTS public.driver_statuses                        CASCADE;
DROP TABLE IF EXISTS public.trip_events                            CASCADE;
DROP TABLE IF EXISTS public.active_trips                           CASCADE;
DROP TABLE IF EXISTS public.route_assignments                      CASCADE;
DROP TABLE IF EXISTS public.route_waypoints                        CASCADE;
DROP TABLE IF EXISTS public.fleet_routes                           CASCADE;
DROP TABLE IF EXISTS public.fleet_controllers                      CASCADE;
DROP TABLE IF EXISTS public.drivers                                CASCADE;
DROP TABLE IF EXISTS public.vehicles                               CASCADE;
DROP TABLE IF EXISTS public.profiles                               CASCADE;
DROP TABLE IF EXISTS public.organisations                          CASCADE;

-- ── DROP HELPER FUNCTIONS ─────────────────────────────────────

DROP FUNCTION IF EXISTS public.is_controller(uuid)                 CASCADE;
DROP FUNCTION IF EXISTS public.is_driver_for_record(uuid)          CASCADE;
DROP FUNCTION IF EXISTS public.is_fleet_admin(uuid)                CASCADE;
DROP FUNCTION IF EXISTS public.is_org_member(uuid)                 CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role()                 CASCADE;
DROP FUNCTION IF EXISTS public.current_organisation_id()           CASCADE;
DROP FUNCTION IF EXISTS public.current_profile_id()                CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column()          CASCADE;

-- ── DROP EXTENSIONS (optional — only if not used by other schemas) ─
-- Leave extensions if they were already present before Run 11.
-- Uncomment only if you are sure these were added by Run 11 only.
--
-- DROP EXTENSION IF EXISTS postgis;
-- DROP EXTENSION IF EXISTS pg_trgm;
-- DROP EXTENSION IF EXISTS pgcrypto;

-- ── VERIFICATION ──────────────────────────────────────────────
SELECT
  'rollback_complete' AS check_name,
  now()              AS rolled_back_at,
  'Big V''s Best Routes™ Run 11 schema dropped. Re-run schema SQL to redeploy.' AS notes;

-- ============================================================
-- END OF RUN 11 ROLLBACK
-- Big V's Best Routes™ · 4P3X Intelligent AI™ Created by Kyzel Kreates™
-- ============================================================
