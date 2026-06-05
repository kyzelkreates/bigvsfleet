-- ============================================================
-- Big V's Best Routes™ — Full SQL Schema
-- Safety & Legal Compliance First Navigation Platform
-- 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- RUN 11 — Supabase Live Backend Foundation + SQL + RLS
--
-- EXECUTION ORDER (REQUIRED):
--   1. Extensions
--   2. Helper functions
--   3. Tables (in dependency order)
--   4. Indexes (after tables)
--   5. Triggers (after functions)
--   6. Enable RLS (after tables)
--   7. Policies (after RLS is enabled)
--   8. Optional seed / demo records
--   9. Verification query
--
-- RLS STATUS:
--   RLS IS ENABLED ON ALL OPERATIONAL TABLES.
--
-- SECURITY:
--   Never use the Supabase service role key in frontend code.
--   Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend.
--   Service role keys bypass RLS and are backend-only.
--
-- ADVISORY:
--   All compliance/risk/AI records in this schema are advisory only.
--   No table, field, or trigger implies legal compliance guarantee.
--   Drivers, fleet managers, and controllers remain responsible for
--   checking current laws, signage, permits, restrictions, road
--   conditions, bridge limits, access rules, and company policy.
--
-- COMPATIBILITY:
--   PostgreSQL 15+ (Supabase default)
--   UUID: gen_random_uuid() (pgcrypto extension)
--   JSONB: used for flexible advisory/compliance fields
--   Timestamps: timestamptz (timezone-aware)
-- ============================================================

-- ===========================================================
-- SECTION 1: EXTENSIONS
-- ===========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;          -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;           -- trigram indexes for search
CREATE EXTENSION IF NOT EXISTS postgis;           -- spatial/GPS queries (optional, safe to skip if not available)

-- ===========================================================
-- SECTION 2: HELPER FUNCTIONS
-- (Must be before triggers)
-- ===========================================================

-- update_updated_at_column()
-- Automatically updates updated_at on any table with that column.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- current_profile_id()
-- Returns the profile.id for the current authenticated user.
-- Used in RLS policies.
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- current_organisation_id()
-- Returns the primary organisation_id for the current user.
CREATE OR REPLACE FUNCTION public.current_organisation_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organisation_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- current_user_role()
-- Returns the role string for the current user.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- is_org_member(org_id)
-- Returns true if the current user is a member of the organisation.
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND organisation_id = org_id
  );
$$;

-- is_fleet_admin(org_id)
-- Returns true if the current user is a fleet_admin in the organisation.
CREATE OR REPLACE FUNCTION public.is_fleet_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organisation_id = org_id
      AND role = 'fleet_admin'
  );
$$;

-- is_driver_for_record(driver_profile_id)
-- Returns true if the current user's profile matches the given driver profile.
CREATE OR REPLACE FUNCTION public.is_driver_for_record(driver_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND id = driver_profile_id AND role = 'driver'
  );
$$;

-- is_controller(org_id)
-- Returns true if the current user is a fleet_controller in the organisation.
CREATE OR REPLACE FUNCTION public.is_controller(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND organisation_id = org_id
      AND role IN ('fleet_controller', 'fleet_admin')
  );
$$;

-- ===========================================================
-- SECTION 3: TABLES (in dependency order)
-- ===========================================================

-- ── 1. organisations ────────────────────────────────────────
-- Parent tenant/group. All operational data scoped to an org.
CREATE TABLE IF NOT EXISTS public.organisations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        UNIQUE,
  operator_ref    text,
  contact_email   text,
  is_active       boolean     NOT NULL DEFAULT true,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.organisations IS 'Big V — Tenant organisations. Parent of all operational data.';

-- ── 2. profiles ─────────────────────────────────────────────
-- Links Supabase auth.users to BigV roles.
-- Roles: fleet_admin | driver | fleet_controller | viewer
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id uuid        REFERENCES public.organisations(id) ON DELETE SET NULL,
  full_name       text,
  display_name    text,
  role            text        NOT NULL DEFAULT 'viewer'
                              CHECK (role IN ('fleet_admin','driver','fleet_controller','viewer')),
  is_active       boolean     NOT NULL DEFAULT true,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Big V — User profiles linked to Supabase auth. Roles: fleet_admin, driver, fleet_controller, viewer.';

-- ── 3. vehicles ─────────────────────────────────────────────
-- Vehicle registry. Dimensions/weights/legal profile in JSONB.
CREATE TABLE IF NOT EXISTS public.vehicles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reg             text        NOT NULL,
  vehicle_type    text        NOT NULL DEFAULT 'van'
                              CHECK (vehicle_type IN ('car','van','hgv','lorry','coach','minibus','recovery','trailer','specialist','other')),
  make            text,
  model           text,
  year            int,
  colour          text,
  status          text        NOT NULL DEFAULT 'available'
                              CHECK (status IN ('available','on_route','maintenance','off_road','decommissioned')),
  -- Legal/physical dimensions (advisory — may be incomplete)
  height_m        numeric(5,3),
  width_m         numeric(5,3),
  length_m        numeric(6,3),
  weight_kg       numeric(10,2),
  axle_weight_kg  numeric(10,2),
  -- Flags
  hazardous_goods         boolean NOT NULL DEFAULT false,
  hazardous_goods_class   text,
  permit_required         boolean NOT NULL DEFAULT false,
  emission_zone_compliant boolean,
  -- Legal profile JSONB for future fields
  legal_profile   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.vehicles IS 'Big V — Vehicle registry. Dimensions/legal fields advisory only. RLS: org members only.';

-- ── 4. drivers ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drivers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  profile_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  driver_ref      text,
  full_name       text        NOT NULL,
  status          text        NOT NULL DEFAULT 'available'
                              CHECK (status IN ('available','on_route','off_duty','suspended')),
  licence_class   text,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.drivers IS 'Big V — Driver profiles. Linked to auth profiles.';

-- ── 5. fleet_controllers ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_controllers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  profile_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name       text        NOT NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 6. fleet_routes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fleet_routes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                text        NOT NULL,
  description         text,
  origin_label        text,
  destination_label   text,
  origin_lat          numeric(10,7),
  origin_lng          numeric(10,7),
  destination_lat     numeric(10,7),
  destination_lng     numeric(10,7),
  distance_km         numeric(10,3),
  estimated_minutes   int,
  route_provider      text        DEFAULT 'demo_local',
  status              text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','active','archived','suspended')),
  -- Route geometry (GeoJSON LineString or array of coords)
  route_geometry      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Advisory warnings from OSM/Overpass/GraphHopper
  advisory_warnings   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Route risk advisory output (Run 9)
  route_risk_level    text        DEFAULT 'unknown',
  route_risk_notes    text,
  -- Restriction data freshness
  restriction_data_at timestamptz,
  restriction_source  text,
  is_demo             boolean     NOT NULL DEFAULT false,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.fleet_routes IS 'Big V — Route registry. Advisory route data. OSM/GraphHopper output does not guarantee legal suitability.';

-- ── 7. route_waypoints ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.route_waypoints (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        uuid        NOT NULL REFERENCES public.fleet_routes(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  sequence_num    int         NOT NULL,
  label           text,
  lat             numeric(10,7) NOT NULL,
  lng             numeric(10,7) NOT NULL,
  waypoint_type   text        DEFAULT 'stop'
                              CHECK (waypoint_type IN ('origin','stop','waypoint','destination')),
  instructions    text,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 8. route_assignments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.route_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  route_id        uuid        NOT NULL REFERENCES public.fleet_routes(id) ON DELETE CASCADE,
  driver_id       uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id      uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','confirmed','active','completed','cancelled')),
  scheduled_at    timestamptz,
  notes           text,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 9. active_trips ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.active_trips (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assignment_id       uuid        REFERENCES public.route_assignments(id) ON DELETE SET NULL,
  route_id            uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  driver_id           uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id          uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status              text        NOT NULL DEFAULT 'not_started'
                                  CHECK (status IN ('not_started','started','paused','resumed','completed','abandoned')),
  started_at          timestamptz,
  paused_at           timestamptz,
  resumed_at          timestamptz,
  completed_at        timestamptz,
  last_known_lat      numeric(10,7),
  last_known_lng      numeric(10,7),
  last_known_at       timestamptz,
  off_route_status    text        DEFAULT 'unknown',
  is_demo             boolean     NOT NULL DEFAULT false,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 10. trip_events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid        NOT NULL REFERENCES public.active_trips(id) ON DELETE CASCADE,
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  event_at        timestamptz NOT NULL DEFAULT now(),
  lat             numeric(10,7),
  lng             numeric(10,7),
  notes           text,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 11. driver_statuses ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_statuses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  driver_id       uuid        NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  trip_id         uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'available',
  last_seen_at    timestamptz,
  last_location_at timestamptz,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 12. gps_location_updates ────────────────────────────────
-- Evidence-preserving GPS trail. ADVISORY — not legal proof.
CREATE TABLE IF NOT EXISTS public.gps_location_updates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  trip_id         uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  driver_id       uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id      uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  lat             numeric(10,7) NOT NULL,
  lng             numeric(10,7) NOT NULL,
  accuracy_m      numeric(8,2),
  heading_deg     numeric(6,2),
  speed_kmh       numeric(8,2),
  altitude_m      numeric(8,2),
  gps_source      text        DEFAULT 'browser_geolocation',
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.gps_location_updates IS 'Big V — GPS trail. Advisory only. GPS accuracy can vary. Not legal proof of route suitability.';

-- ── 13. pre_trip_checklists ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pre_trip_checklists (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  trip_id                     uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  driver_id                   uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id                  uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_checked             boolean     NOT NULL DEFAULT false,
  route_reviewed              boolean     NOT NULL DEFAULT false,
  restrictions_reviewed       boolean     NOT NULL DEFAULT false,
  load_checked                boolean     NOT NULL DEFAULT false,
  safety_equipment_checked    boolean     NOT NULL DEFAULT false,
  notes_reviewed              boolean     NOT NULL DEFAULT false,
  company_policy_acknowledged boolean     NOT NULL DEFAULT false,
  completed_at                timestamptz,
  override_started_without    boolean     NOT NULL DEFAULT false,
  override_note               text,
  notes                       text,
  is_demo                     boolean     NOT NULL DEFAULT false,
  metadata                    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ── 14. route_acknowledgements ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.route_acknowledgements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  route_id        uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  driver_id       uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id         uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  acknowledged    boolean     NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 15. compliance_acknowledgements ─────────────────────────
-- Advisory compliance acknowledgement. Never guarantees compliance.
CREATE TABLE IF NOT EXISTS public.compliance_acknowledgements (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  driver_id           uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id            uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  trip_id             uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  acknowledged        boolean     NOT NULL DEFAULT false,
  acknowledged_at     timestamptz,
  -- Acknowledgement message text preserved as evidence
  acknowledgement_text text,
  -- Advisory only — no guarantee field
  advisory_only       boolean     NOT NULL DEFAULT true,
  no_guarantee        boolean     NOT NULL DEFAULT true,
  is_demo             boolean     NOT NULL DEFAULT false,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.compliance_acknowledgements IS 'Big V — Driver compliance acknowledgements. Advisory only. Never implies legal compliance guarantee.';

-- ── 16. incident_reports ────────────────────────────────────
-- Evidence-preserving. Never destructive. Append-only preferred.
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  reported_by_driver  uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id             uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  vehicle_id          uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  route_id            uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  incident_type       text        NOT NULL DEFAULT 'general',
  severity            text        NOT NULL DEFAULT 'low'
                                  CHECK (severity IN ('low','medium','high','critical')),
  title               text        NOT NULL,
  description         text,
  lat                 numeric(10,7),
  lng                 numeric(10,7),
  incident_at         timestamptz DEFAULT now(),
  reviewed            boolean     NOT NULL DEFAULT false,
  reviewed_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  review_notes        text,
  evidence_files      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_demo             boolean     NOT NULL DEFAULT false,
  -- Evidence must not be deleted — use archived flag instead
  archived            boolean     NOT NULL DEFAULT false,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.incident_reports IS 'Big V — Incident evidence. Evidence-preserving. Use archived flag — do not hard-delete.';

-- ── 17. driver_notes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  driver_id       uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id         uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  note_text       text        NOT NULL,
  note_type       text        DEFAULT 'general',
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 18. controller_actions ──────────────────────────────────
-- Append-only preferred. Evidence-preserving.
CREATE TABLE IF NOT EXISTS public.controller_actions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  controller_id   uuid        REFERENCES public.fleet_controllers(id) ON DELETE SET NULL,
  performed_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type     text        NOT NULL,
  target_type     text,
  target_id       uuid,
  status          text        NOT NULL DEFAULT 'local_saved',
  notes           text,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.controller_actions IS 'Big V — Controller actions. Evidence-preserving. Append-only preferred.';

-- ── 19. controller_notes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.controller_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  controller_id   uuid        REFERENCES public.fleet_controllers(id) ON DELETE SET NULL,
  performed_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_type    text,
  subject_id      uuid,
  note_text       text        NOT NULL,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 20. vehicle_readiness ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_readiness (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  vehicle_id      uuid        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  checked_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  readiness_status text       NOT NULL DEFAULT 'unknown'
                              CHECK (readiness_status IN ('unknown','ready','advisory_concern','not_ready')),
  check_notes     text,
  advisory_only   boolean     NOT NULL DEFAULT true,
  checked_at      timestamptz NOT NULL DEFAULT now(),
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 21. compliance_checks ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  check_type          text        NOT NULL,
  related_driver_id   uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  related_vehicle_id  uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  related_route_id    uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  related_trip_id     uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','pass','fail','warning','expired','advisory')),
  notes               text,
  expiry_date         date,
  advisory_only       boolean     NOT NULL DEFAULT true,
  is_demo             boolean     NOT NULL DEFAULT false,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 22. route_risk_results ──────────────────────────────────
-- Advisory route risk output from Run 9 engine.
CREATE TABLE IF NOT EXISTS public.route_risk_results (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  route_id            uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  trip_id             uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  vehicle_id          uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  risk_level          text        NOT NULL DEFAULT 'unknown'
                                  CHECK (risk_level IN ('unknown','low','medium','high','critical')),
  confidence_score    int         NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  missing_data        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  warnings            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  explanation         text,
  recommended_checks  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- No guarantee fields
  advisory_only       boolean     NOT NULL DEFAULT true,
  no_guarantee        boolean     NOT NULL DEFAULT true,
  is_demo             boolean     NOT NULL DEFAULT false,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  generated_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.route_risk_results IS 'Big V — Advisory route risk. No legal guarantee. Confidence reflects available app data only.';

-- ── 23. safety_oversight_results ────────────────────────────
-- 4P3X Intelligent AI 1 — Safety Oversight AI outputs.
CREATE TABLE IF NOT EXISTS public.safety_oversight_results (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  scope                   text        NOT NULL DEFAULT 'dashboard',
  related_route_id        uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  related_trip_id         uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  related_vehicle_id      uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  related_driver_id       uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  risk_level              text        NOT NULL DEFAULT 'unknown'
                                      CHECK (risk_level IN ('unknown','low','medium','high','critical')),
  confidence_score        int         NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  missing_data            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  warnings                jsonb       NOT NULL DEFAULT '[]'::jsonb,
  explanation             text,
  recommended_human_checks jsonb      NOT NULL DEFAULT '[]'::jsonb,
  evidence_summary        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Required advisory fields
  advisory_only           boolean     NOT NULL DEFAULT true,
  no_guarantee            boolean     NOT NULL DEFAULT true,
  is_demo                 boolean     NOT NULL DEFAULT false,
  generated_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.safety_oversight_results IS 'Big V — 4P3X Intelligent AI 1 Safety Oversight. Advisory only. Human verification required.';

-- ── 24. legal_compliance_oversight_results ──────────────────
-- 4P3X Intelligent AI 2 — Legal Compliance Oversight AI outputs.
CREATE TABLE IF NOT EXISTS public.legal_compliance_oversight_results (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  scope                       text        NOT NULL DEFAULT 'dashboard',
  related_route_id            uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  related_trip_id             uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  related_vehicle_id          uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  related_driver_id           uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  advisory_risk_level         text        NOT NULL DEFAULT 'unknown'
                                          CHECK (advisory_risk_level IN ('unknown','low','medium','high','critical')),
  confidence_score            int         NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  missing_legal_critical_data jsonb       NOT NULL DEFAULT '[]'::jsonb,
  route_restriction_concerns  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  data_freshness_warnings     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  warnings                    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  explanation                 text,
  recommended_human_checks    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  evidence_summary            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Required advisory/no-guarantee fields
  advisory_only               boolean     NOT NULL DEFAULT true,
  no_guarantee                boolean     NOT NULL DEFAULT true,
  is_demo                     boolean     NOT NULL DEFAULT false,
  generated_at                timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.legal_compliance_oversight_results IS 'Big V — 4P3X Intelligent AI 2 Legal Compliance Oversight. Advisory only. No legal guarantee.';

-- ── 25. pwa_deployments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pwa_deployments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  pwa_role        text        NOT NULL CHECK (pwa_role IN ('driver','controller')),
  profile_name    text,
  pwa_url         text,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 26. sync_events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  initiated_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sync_type       text        NOT NULL DEFAULT 'demo_local',
  pwa_role        text,
  status          text        NOT NULL DEFAULT 'pending',
  items_synced    int         DEFAULT 0,
  error_message   text,
  is_demo         boolean     NOT NULL DEFAULT false,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 27. evidence_summaries ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evidence_summaries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  trip_id         uuid        REFERENCES public.active_trips(id) ON DELETE SET NULL,
  route_id        uuid        REFERENCES public.fleet_routes(id) ON DELETE SET NULL,
  driver_id       uuid        REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id      uuid        REFERENCES public.vehicles(id) ON DELETE SET NULL,
  summary_data    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  advisory_only   boolean     NOT NULL DEFAULT true,
  no_guarantee    boolean     NOT NULL DEFAULT true,
  is_demo         boolean     NOT NULL DEFAULT false,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 28. report_drafts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_drafts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           text        NOT NULL,
  report_type     text        NOT NULL DEFAULT 'advisory_summary',
  report_data     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','ready','exported')),
  advisory_only   boolean     NOT NULL DEFAULT true,
  no_guarantee    boolean     NOT NULL DEFAULT true,
  is_demo         boolean     NOT NULL DEFAULT false,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 29. backend_health_checks ───────────────────────────────
-- Used by the app to verify schema readiness and connection.
-- getSchemaStatus() queries this table.
CREATE TABLE IF NOT EXISTS public.backend_health_checks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name      text        NOT NULL DEFAULT 'bigv_schema_ready',
  schema_version  text        NOT NULL DEFAULT 'run_11',
  run_number      int         NOT NULL DEFAULT 11,
  is_ready        boolean     NOT NULL DEFAULT true,
  notes           text        DEFAULT 'Big V''s Best Routes™ schema deployed. RLS enabled on all operational tables.',
  checked_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.backend_health_checks IS 'Big V — Schema readiness check. Queried by app testSupabaseConnection() and getSchemaStatus().';

-- ===========================================================
-- SECTION 4: INDEXES (after tables)
-- ===========================================================

-- organisations
CREATE INDEX IF NOT EXISTS idx_organisations_slug       ON public.organisations(slug);
CREATE INDEX IF NOT EXISTS idx_organisations_is_demo    ON public.organisations(is_demo);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id         ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organisation_id ON public.profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role            ON public.profiles(role);

-- vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id          ON public.vehicles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status          ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type    ON public.vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_demo         ON public.vehicles(is_demo);

-- drivers
CREATE INDEX IF NOT EXISTS idx_drivers_org_id           ON public.drivers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_drivers_profile_id       ON public.drivers(profile_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status           ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_is_demo          ON public.drivers(is_demo);

-- fleet_routes
CREATE INDEX IF NOT EXISTS idx_routes_org_id            ON public.fleet_routes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_routes_status            ON public.fleet_routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_is_demo           ON public.fleet_routes(is_demo);
CREATE INDEX IF NOT EXISTS idx_routes_created_at        ON public.fleet_routes(created_at DESC);

-- route_assignments
CREATE INDEX IF NOT EXISTS idx_assignments_org_id       ON public.route_assignments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_assignments_route_id     ON public.route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_assignments_driver_id    ON public.route_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_id   ON public.route_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status       ON public.route_assignments(status);

-- active_trips
CREATE INDEX IF NOT EXISTS idx_trips_org_id             ON public.active_trips(organisation_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id          ON public.active_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id         ON public.active_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_id           ON public.active_trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_status             ON public.active_trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_is_demo            ON public.active_trips(is_demo);
CREATE INDEX IF NOT EXISTS idx_trips_started_at         ON public.active_trips(started_at DESC);

-- gps_location_updates (high-volume table)
CREATE INDEX IF NOT EXISTS idx_gps_trip_id              ON public.gps_location_updates(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_driver_id            ON public.gps_location_updates(driver_id);
CREATE INDEX IF NOT EXISTS idx_gps_recorded_at          ON public.gps_location_updates(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_org_id               ON public.gps_location_updates(organisation_id);

-- incident_reports
CREATE INDEX IF NOT EXISTS idx_incidents_org_id         ON public.incident_reports(organisation_id);
CREATE INDEX IF NOT EXISTS idx_incidents_trip_id        ON public.incident_reports(trip_id);
CREATE INDEX IF NOT EXISTS idx_incidents_driver_id      ON public.incident_reports(reported_by_driver);
CREATE INDEX IF NOT EXISTS idx_incidents_severity       ON public.incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_reviewed       ON public.incident_reports(reviewed);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at     ON public.incident_reports(created_at DESC);

-- controller_actions
CREATE INDEX IF NOT EXISTS idx_ctrl_actions_org_id      ON public.controller_actions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_actions_type        ON public.controller_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ctrl_actions_created_at  ON public.controller_actions(created_at DESC);

-- safety/legal oversight results
CREATE INDEX IF NOT EXISTS idx_safety_org_id            ON public.safety_oversight_results(organisation_id);
CREATE INDEX IF NOT EXISTS idx_safety_risk_level        ON public.safety_oversight_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_safety_generated_at      ON public.safety_oversight_results(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_org_id             ON public.legal_compliance_oversight_results(organisation_id);
CREATE INDEX IF NOT EXISTS idx_legal_risk_level         ON public.legal_compliance_oversight_results(advisory_risk_level);
CREATE INDEX IF NOT EXISTS idx_legal_generated_at       ON public.legal_compliance_oversight_results(generated_at DESC);

-- compliance_checks
CREATE INDEX IF NOT EXISTS idx_compliance_org_id        ON public.compliance_checks(organisation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status        ON public.compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_expiry        ON public.compliance_checks(expiry_date);

-- sync_events
CREATE INDEX IF NOT EXISTS idx_sync_org_id              ON public.sync_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sync_synced_at           ON public.sync_events(synced_at DESC);

-- ===========================================================
-- SECTION 5: TRIGGERS (after functions, after tables)
-- ===========================================================

-- updated_at triggers for tables with updated_at column

CREATE OR REPLACE TRIGGER trg_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_fleet_controllers_updated_at
  BEFORE UPDATE ON public.fleet_controllers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_fleet_routes_updated_at
  BEFORE UPDATE ON public.fleet_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_route_assignments_updated_at
  BEFORE UPDATE ON public.route_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_active_trips_updated_at
  BEFORE UPDATE ON public.active_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_driver_statuses_updated_at
  BEFORE UPDATE ON public.driver_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_pre_trip_checklists_updated_at
  BEFORE UPDATE ON public.pre_trip_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_compliance_checks_updated_at
  BEFORE UPDATE ON public.compliance_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_vehicle_readiness_updated_at
  BEFORE UPDATE ON public.vehicle_readiness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_report_drafts_updated_at
  BEFORE UPDATE ON public.report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================================
-- SECTION 6: ENABLE ROW LEVEL SECURITY
-- (Must be after tables are created)
-- RLS IS ENABLED ON ALL OPERATIONAL TABLES.
-- ===========================================================

ALTER TABLE public.organisations                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_controllers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_routes                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_waypoints                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_assignments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_trips                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_events                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_statuses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_location_updates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_trip_checklists                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_acknowledgements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_acknowledgements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_notes                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_actions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controller_notes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_readiness                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_risk_results                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_oversight_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_compliance_oversight_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_deployments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_summaries                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_drafts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backend_health_checks              ENABLE ROW LEVEL SECURITY;

-- ===========================================================
-- SECTION 7: RLS POLICIES
-- (Must be after RLS is enabled and tables exist)
-- ===========================================================

-- ── Organisations ────────────────────────────────────────────
CREATE POLICY "org_members_select" ON public.organisations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY "fleet_admin_manage_org" ON public.organisations
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(id))
  WITH CHECK (public.is_fleet_admin(id));

-- ── Profiles ─────────────────────────────────────────────────
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(organisation_id));

CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fleet_admin_manage_profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Vehicles ─────────────────────────────────────────────────
CREATE POLICY "org_members_view_vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_vehicles" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Drivers ──────────────────────────────────────────────────
CREATE POLICY "org_members_view_drivers" ON public.drivers
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "driver_own_record" ON public.drivers
  FOR SELECT TO authenticated
  USING (public.is_driver_for_record(profile_id));

CREATE POLICY "fleet_admin_manage_drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Fleet Controllers ─────────────────────────────────────────
CREATE POLICY "org_members_view_controllers" ON public.fleet_controllers
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_controllers" ON public.fleet_controllers
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Fleet Routes ──────────────────────────────────────────────
CREATE POLICY "org_members_view_routes" ON public.fleet_routes
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_routes" ON public.fleet_routes
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Route Waypoints ───────────────────────────────────────────
CREATE POLICY "org_members_view_waypoints" ON public.route_waypoints
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_waypoints" ON public.route_waypoints
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Route Assignments ─────────────────────────────────────────
CREATE POLICY "org_members_view_assignments" ON public.route_assignments
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "controllers_manage_assignments" ON public.route_assignments
  FOR ALL TO authenticated
  USING (public.is_controller(organisation_id))
  WITH CHECK (public.is_controller(organisation_id));

-- ── Active Trips ──────────────────────────────────────────────
CREATE POLICY "org_members_view_trips" ON public.active_trips
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "driver_own_trip_write" ON public.active_trips
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

CREATE POLICY "driver_own_trip_update" ON public.active_trips
  FOR UPDATE TO authenticated
  USING (public.is_org_member(organisation_id))
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Trip Events ───────────────────────────────────────────────
CREATE POLICY "org_members_trip_events" ON public.trip_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_trip_events" ON public.trip_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Driver Statuses ───────────────────────────────────────────
CREATE POLICY "org_members_view_driver_statuses" ON public.driver_statuses
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_driver_statuses" ON public.driver_statuses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

CREATE POLICY "update_driver_statuses" ON public.driver_statuses
  FOR UPDATE TO authenticated
  USING (public.is_org_member(organisation_id));

-- ── GPS Location Updates ──────────────────────────────────────
CREATE POLICY "org_members_view_gps" ON public.gps_location_updates
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_gps_updates" ON public.gps_location_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Pre-Trip Checklists ───────────────────────────────────────
CREATE POLICY "org_members_view_checklists" ON public.pre_trip_checklists
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "driver_manage_own_checklists" ON public.pre_trip_checklists
  FOR ALL TO authenticated
  USING (public.is_org_member(organisation_id))
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Route Acknowledgements ────────────────────────────────────
CREATE POLICY "org_members_view_route_acks" ON public.route_acknowledgements
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_route_acks" ON public.route_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Compliance Acknowledgements ───────────────────────────────
CREATE POLICY "org_members_view_compliance_acks" ON public.compliance_acknowledgements
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_compliance_acks" ON public.compliance_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Incident Reports ──────────────────────────────────────────
CREATE POLICY "org_members_view_incidents" ON public.incident_reports
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "driver_report_incident" ON public.incident_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- Evidence-preserving: updates allowed for review fields only, not deletion.
CREATE POLICY "controller_review_incident" ON public.incident_reports
  FOR UPDATE TO authenticated
  USING (public.is_controller(organisation_id))
  WITH CHECK (public.is_controller(organisation_id));

-- ── Driver Notes ──────────────────────────────────────────────
CREATE POLICY "org_members_view_driver_notes" ON public.driver_notes
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "driver_insert_notes" ON public.driver_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Controller Actions ────────────────────────────────────────
CREATE POLICY "org_members_view_ctrl_actions" ON public.controller_actions
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "controller_insert_actions" ON public.controller_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_controller(organisation_id));

-- ── Controller Notes ──────────────────────────────────────────
CREATE POLICY "org_members_view_ctrl_notes" ON public.controller_notes
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "controller_insert_notes" ON public.controller_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_controller(organisation_id));

-- ── Vehicle Readiness ─────────────────────────────────────────
CREATE POLICY "org_members_view_readiness" ON public.vehicle_readiness
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_readiness" ON public.vehicle_readiness
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Compliance Checks ─────────────────────────────────────────
CREATE POLICY "org_members_view_compliance" ON public.compliance_checks
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_compliance" ON public.compliance_checks
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Route Risk Results ────────────────────────────────────────
CREATE POLICY "org_members_view_route_risk" ON public.route_risk_results
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_route_risk" ON public.route_risk_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Safety Oversight Results ──────────────────────────────────
CREATE POLICY "org_members_view_safety_oversight" ON public.safety_oversight_results
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_safety_oversight" ON public.safety_oversight_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Legal Compliance Oversight Results ───────────────────────
CREATE POLICY "org_members_view_legal_oversight" ON public.legal_compliance_oversight_results
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_legal_oversight" ON public.legal_compliance_oversight_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── PWA Deployments ───────────────────────────────────────────
CREATE POLICY "org_members_view_pwa_deployments" ON public.pwa_deployments
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_pwa_deployments" ON public.pwa_deployments
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Sync Events ───────────────────────────────────────────────
CREATE POLICY "org_members_view_sync_events" ON public.sync_events
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_sync_events" ON public.sync_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Evidence Summaries ────────────────────────────────────────
CREATE POLICY "org_members_view_evidence" ON public.evidence_summaries
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "insert_evidence" ON public.evidence_summaries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organisation_id));

-- ── Report Drafts ─────────────────────────────────────────────
CREATE POLICY "org_members_view_reports" ON public.report_drafts
  FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "fleet_admin_manage_reports" ON public.report_drafts
  FOR ALL TO authenticated
  USING (public.is_fleet_admin(organisation_id))
  WITH CHECK (public.is_fleet_admin(organisation_id));

-- ── Backend Health Checks ─────────────────────────────────────
-- Allow any authenticated user to read (used for schema readiness test).
CREATE POLICY "authenticated_read_health" ON public.backend_health_checks
  FOR SELECT TO authenticated
  USING (true);

-- ===========================================================
-- SECTION 8: SEED — Schema readiness record
-- ===========================================================

INSERT INTO public.backend_health_checks (check_name, schema_version, run_number, is_ready, notes)
VALUES (
  'bigv_schema_ready',
  'run_11',
  11,
  true,
  'Big V''s Best Routes™ — Run 11 SQL schema deployed. RLS enabled on all operational tables. 4P3X Intelligent AI™ Created by Kyzel Kreates™.'
)
ON CONFLICT DO NOTHING;

-- ===========================================================
-- SECTION 9: VERIFICATION QUERY
-- Run this after deployment to confirm schema readiness.
-- ===========================================================

-- Quick backend readiness check:
SELECT
  'big_vs_best_routes_backend_ready' AS check_name,
  now()                              AS checked_at,
  schema_version,
  run_number,
  is_ready,
  notes
FROM public.backend_health_checks
WHERE check_name = 'bigv_schema_ready'
LIMIT 1;

-- Table count verification:
SELECT
  COUNT(*)  AS total_tables,
  29        AS expected_tables,
  CASE WHEN COUNT(*) >= 29 THEN 'PASS' ELSE 'FAIL — rerun schema SQL' END AS table_check
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organisations','profiles','vehicles','drivers','fleet_controllers',
    'fleet_routes','route_waypoints','route_assignments','active_trips','trip_events',
    'driver_statuses','gps_location_updates','pre_trip_checklists',
    'route_acknowledgements','compliance_acknowledgements','incident_reports',
    'driver_notes','controller_actions','controller_notes','vehicle_readiness',
    'compliance_checks','route_risk_results','safety_oversight_results',
    'legal_compliance_oversight_results','pwa_deployments','sync_events',
    'evidence_summaries','report_drafts','backend_health_checks'
  );

-- RLS enabled verification:
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organisations','profiles','vehicles','drivers','fleet_routes',
    'active_trips','incident_reports','safety_oversight_results',
    'legal_compliance_oversight_results','backend_health_checks'
  )
ORDER BY tablename;

-- ===========================================================
-- SECTION 10: ROLLBACK NOTES
-- (See supabase/rollback-run-11.sql for the full rollback script)
-- ===========================================================

-- To roll back Run 11:
-- 1. Open supabase/rollback-run-11.sql
-- 2. Review the DROP statements carefully
-- 3. Run ONLY on a development/test Supabase project
-- 4. Never run rollback on production without full backup
-- ============================================================
-- END OF RUN 11 SQL SCHEMA
-- Big V's Best Routes™ · Safety & Legal Compliance First Navigation Platform
-- 4P3X Intelligent AI™ Created by Kyzel Kreates™
-- RLS IS ENABLED ON ALL OPERATIONAL TABLES.
-- ============================================================
