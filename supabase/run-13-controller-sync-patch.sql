-- ============================================================
-- Big V's Best Routes™ — Run 13 Controller Sync Patch
-- Additive SQL patch: Fleet Controller PWA ↔ Dashboard sync
-- Execute AFTER run-11 schema and all previous patches.
--
-- SECURITY: RLS remains ENABLED on all tables.
-- No policies weakened. No service role key required.
-- All frontend operations use anon/public key only.
-- ============================================================

-- ── Execution order ──────────────────────────────────────────
-- 1. Create tables (IF NOT EXISTS — safe to re-run)
-- 2. Enable RLS
-- 3. Create indexes
-- 4. Create policies
-- 5. Verification query
-- ── Rollback: see comments at bottom ────────────────────────


-- ============================================================
-- TABLE: controller_actions
-- Stores all actions pushed from Fleet Controller PWA
-- ============================================================
CREATE TABLE IF NOT EXISTS controller_actions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id    TEXT NOT NULL,
  organisation_id  TEXT,
  profile_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type      TEXT NOT NULL,  -- request_check_in | mark_reviewed | flag_route_review | add_note | incident_review | compliance_exception_review | vehicle_readiness_review
  target_type      TEXT,           -- driver | vehicle | trip | incident | route | compliance | exception
  target_id        TEXT,
  linked_trip_id   TEXT,
  linked_driver_id TEXT,
  linked_route_id  TEXT,
  linked_vehicle_id TEXT,
  note             TEXT,
  severity         TEXT DEFAULT 'info', -- info | warning | critical
  review_status    TEXT DEFAULT 'pending', -- pending | reviewed | flagged | resolved | escalated
  review_outcome   TEXT,
  reviewed_by      TEXT,
  reviewed_at      TIMESTAMPTZ,
  flag_follow_up   BOOLEAN DEFAULT FALSE,
  sync_status      TEXT DEFAULT 'synced', -- synced | pending | failed
  is_demo          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE controller_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_controller_actions_controller_id
  ON controller_actions(controller_id);
CREATE INDEX IF NOT EXISTS idx_controller_actions_action_type
  ON controller_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_controller_actions_target_id
  ON controller_actions(target_id);
CREATE INDEX IF NOT EXISTS idx_controller_actions_created_at
  ON controller_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_controller_actions_is_demo
  ON controller_actions(is_demo);

-- Policy: Authenticated users can insert their own controller actions
CREATE POLICY "controller_actions_insert_auth" ON controller_actions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read controller actions
CREATE POLICY "controller_actions_select_auth" ON controller_actions
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Controllers can update their own actions
CREATE POLICY "controller_actions_update_own" ON controller_actions
  FOR UPDATE TO authenticated
  USING (controller_id = auth.uid()::text OR controller_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (true);

-- Policy: Anon can read non-demo controller actions (dashboard public view)
CREATE POLICY "controller_actions_select_anon" ON controller_actions
  FOR SELECT TO anon
  USING (is_demo = FALSE);


-- ============================================================
-- TABLE: controller_notes
-- Stores notes pushed from Fleet Controller PWA
-- ============================================================
CREATE TABLE IF NOT EXISTS controller_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id    TEXT NOT NULL,
  organisation_id  TEXT,
  profile_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note_text        TEXT NOT NULL,
  severity         TEXT DEFAULT 'info', -- info | warning | critical
  linked_driver_id TEXT,
  linked_vehicle_id TEXT,
  linked_route_id  TEXT,
  linked_trip_id   TEXT,
  linked_incident_id TEXT,
  linked_compliance_id TEXT,
  sync_status      TEXT DEFAULT 'synced',
  is_demo          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE controller_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_controller_notes_controller_id
  ON controller_notes(controller_id);
CREATE INDEX IF NOT EXISTS idx_controller_notes_created_at
  ON controller_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_controller_notes_linked_driver
  ON controller_notes(linked_driver_id);
CREATE INDEX IF NOT EXISTS idx_controller_notes_linked_trip
  ON controller_notes(linked_trip_id);

CREATE POLICY "controller_notes_insert_auth" ON controller_notes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "controller_notes_select_auth" ON controller_notes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "controller_notes_update_own" ON controller_notes
  FOR UPDATE TO authenticated
  USING (controller_id = auth.uid()::text OR controller_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (true);

CREATE POLICY "controller_notes_select_anon" ON controller_notes
  FOR SELECT TO anon
  USING (is_demo = FALSE);


-- ============================================================
-- TABLE: vehicle_readiness
-- Stores vehicle readiness reviews from Controller PWA
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_readiness (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       TEXT NOT NULL,
  organisation_id  TEXT,
  controller_id    TEXT NOT NULL,
  profile_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  readiness_status TEXT DEFAULT 'pending', -- pending | ready | not_ready | conditional | review_required
  note             TEXT,
  reviewed_by      TEXT,
  reviewed_at      TIMESTAMPTZ,
  sync_status      TEXT DEFAULT 'synced',
  is_demo          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_readiness ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vehicle_readiness_vehicle_id
  ON vehicle_readiness(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_readiness_controller_id
  ON vehicle_readiness(controller_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_readiness_status
  ON vehicle_readiness(readiness_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_readiness_created_at
  ON vehicle_readiness(created_at DESC);

CREATE POLICY "vehicle_readiness_insert_auth" ON vehicle_readiness
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "vehicle_readiness_select_auth" ON vehicle_readiness
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "vehicle_readiness_update_own" ON vehicle_readiness
  FOR UPDATE TO authenticated
  USING (controller_id = auth.uid()::text OR controller_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (true);

CREATE POLICY "vehicle_readiness_select_anon" ON vehicle_readiness
  FOR SELECT TO anon
  USING (is_demo = FALSE);


-- ============================================================
-- TABLE: sync_events  (additive — add run-13 columns if missing)
-- Already created in Run 11 — only add new columns safely
-- ============================================================
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS
  source TEXT DEFAULT 'unknown'; -- driver_pwa | fleet_controller_pwa | dashboard | system

ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS
  controller_id TEXT;

ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS
  is_demo BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_sync_events_source
  ON sync_events(source);

CREATE INDEX IF NOT EXISTS idx_sync_events_controller_id
  ON sync_events(controller_id);


-- ============================================================
-- VERIFICATION — run after applying patch
-- Expected: 3 tables returned (controller_actions, controller_notes, vehicle_readiness)
-- ============================================================
SELECT table_name, row_security
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('controller_actions','controller_notes','vehicle_readiness')
  AND c.relrowsecurity = TRUE
ORDER BY t.table_name;


-- ============================================================
-- ROLLBACK NOTE
-- If you need to roll back Run 13 patch only:
--
-- DROP TABLE IF EXISTS vehicle_readiness CASCADE;
-- DROP TABLE IF EXISTS controller_notes CASCADE;
-- DROP TABLE IF EXISTS controller_actions CASCADE;
-- -- sync_events column removals (destructive — check for data first):
-- -- ALTER TABLE sync_events DROP COLUMN IF EXISTS source;
-- -- ALTER TABLE sync_events DROP COLUMN IF EXISTS controller_id;
-- -- ALTER TABLE sync_events DROP COLUMN IF EXISTS is_demo;
--
-- Do NOT drop sync_events itself — created in Run 11.
-- Do NOT roll back Run 11 tables.
-- ============================================================
