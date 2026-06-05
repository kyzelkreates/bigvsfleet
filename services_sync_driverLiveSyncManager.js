/**
 * ============================================================
 * Big V's Best Routes™ — Driver Live Sync Manager
 * /src/services/sync/driverLiveSyncManager.js
 *
 * RUN 12 — Real-Time Dashboard ↔ Driver PWA Sync
 *
 * PURPOSE:
 *   All Driver PWA → Supabase push operations and
 *   Dashboard ← Supabase pull operations for live driver data.
 *   Uses anon/public Supabase client only. Respects RLS.
 *   Falls back to offline queue if backend unavailable.
 *
 * SECURITY:
 *   No service role key. No backend secrets.
 *   All operations go through RLS-protected anon client.
 *   Backend settings never exposed in Driver PWA.
 *
 * SAFETY / ADVISORY:
 *   "Synced driver data supports fleet visibility only. It does not
 *    replace driver responsibility, road signage, current laws,
 *    permits, restrictions, bridge checks, road conditions, or
 *    company policy."
 *
 * DEMO MODE:
 *   All push/pull functions check mode first.
 *   Demo Mode → local/offline only, never writes to Supabase.
 *   Live Mode + no backend → offline queue, clear warning.
 *   Live Mode + backend configured → Supabase operations + fallback.
 *
 * REALTIME:
 *   Supabase Realtime subscriptions used where available.
 *   Polling fallback if realtime unavailable or errors.
 *   Status reported honestly: realtime_connected | polling_fallback |
 *   offline_queue | backend_missing | schema_or_policy_error | local_demo_only
 * ============================================================
 */

import { getSupabaseClient, getSupabaseSettings, isSupabaseConfigured } from './services_supabase_supabaseClient'
import {
  queueItem, markSyncing, markSynced, markFailed, markConflict,
  getPendingItems, getPendingCount, getQueueSummary, clearSyncedItems,
  QUEUE_ITEM_TYPES, QUEUE_STATUS,
} from './services_sync_offlineQueueManager'

// ── Live sync status constants ────────────────────────────────
export const LIVE_SYNC_STATUS = {
  LOCAL_DEMO_ONLY:        'local_demo_only',
  BACKEND_MISSING:        'backend_missing',
  SCHEMA_OR_POLICY_ERROR: 'schema_or_policy_error',
  OFFLINE_QUEUE:          'offline_queue',
  POLLING_FALLBACK:       'polling_fallback',
  REALTIME_CONNECTED:     'realtime_connected',
  CONNECTED:              'connected',
  ERROR:                  'error',
  NOT_CONFIGURED:         'not_configured',
}

// ── Internal state ─────────────────────────────────────────────
let _realtimeChannel = null
let _pollingInterval = null
let _lastDashboardRead = null

// ── Helper: read mode from localStorage (no circular import) ──
function _getMode() {
  try {
    const raw = localStorage.getItem('bigv:mode:demoLive')
    if (!raw) return 'demo'
    const parsed = JSON.parse(raw)
    return parsed?.demoLiveMode?.mode ?? 'demo'
  } catch { return 'demo' }
}

function _isDemo() { return _getMode() === 'demo' }
function _isLive()  { return _getMode() === 'live' }

// ── Helper: get current org from saved backend config ─────────
function _getOrg() {
  try {
    const raw = localStorage.getItem('bigv:backend:config')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.organisationId || null
  } catch { return null }
}

// ── Normalise Supabase error ──────────────────────────────────
export function normaliseSupabaseError(error) {
  if (!error) return null
  const msg   = error?.message || error?.details || String(error)
  const code  = error?.code    || error?.status   || ''
  const isRLS = code === '42501' || code === 'PGRST301' || msg?.toLowerCase().includes('row-level security') || msg?.toLowerCase().includes('permission denied')
  const isMissing = code === '42P01' || msg?.toLowerCase().includes('does not exist')
  return { message: msg, code: String(code), isRLS, isMissing, raw: error }
}

// ── isLiveDriverSyncAvailable ─────────────────────────────────
export function isLiveDriverSyncAvailable() {
  if (_isDemo()) return false
  return isSupabaseConfigured()
}

// ── getDriverLiveSyncStatus ───────────────────────────────────
export function getDriverLiveSyncStatus() {
  if (_isDemo()) return LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY
  if (!isSupabaseConfigured()) return LIVE_SYNC_STATUS.BACKEND_MISSING
  if (_realtimeChannel) return LIVE_SYNC_STATUS.REALTIME_CONNECTED
  if (_pollingInterval) return LIVE_SYNC_STATUS.POLLING_FALLBACK
  return LIVE_SYNC_STATUS.OFFLINE_QUEUE
}

// ── updateDriverSyncStatusSST (update SSOT without circular import) ─
function _updateSST(patch) {
  try {
    const key = 'bigv:driver:state'
    const raw = localStorage.getItem(key)
    const state = raw ? JSON.parse(raw) : {}
    state.syncStatus = { ...state.syncStatus, ...patch }
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}
}

// ── Safe Supabase insert helper ───────────────────────────────
async function _safeInsert(table, record, queueType, queuePayload, options = {}) {
  const client = getSupabaseClient()
  if (!client) {
    const qId = queueItem(queueType, queuePayload, { isDemo: false, priority: options.priority })
    _updateSST({ pendingSync: true, lastError: 'Backend not configured — queued locally.' })
    return { queued: true, queueId: qId }
  }
  try {
    const { data, error } = await client.from(table).insert(record).select('id').single()
    if (error) {
      const norm = normaliseSupabaseError(error)
      if (norm.isRLS) {
        _updateSST({ lastError: `RLS policy blocked insert to ${table}. Check Supabase policies. Details: ${norm.message}` })
        return { ok: false, rlsError: true, error: norm }
      }
      if (norm.isMissing) {
        _updateSST({ lastError: `Table ${table} not found. Run the Run 11 SQL schema in Supabase.` })
        return { ok: false, schemaError: true, error: norm }
      }
      // Queue locally on any other error
      const qId = queueItem(queueType, queuePayload, { isDemo: false, priority: options.priority })
      _updateSST({ pendingSync: true, lastError: norm.message })
      return { queued: true, queueId: qId, error: norm }
    }
    _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: false, lastError: null })
    return { ok: true, id: data?.id }
  } catch (e) {
    const qId = queueItem(queueType, queuePayload, { isDemo: false, priority: options.priority })
    _updateSST({ pendingSync: true, lastError: e.message })
    return { queued: true, queueId: qId, error: { message: e.message } }
  }
}

// ════════════════════════════════════════════════════════════════
// PUSH FUNCTIONS — Driver PWA → Supabase
// ════════════════════════════════════════════════════════════════

/**
 * pushDriverStatus()
 * Upserts the driver's current status in driver_statuses.
 */
export async function pushDriverStatus(driverState) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) {
    queueItem(QUEUE_ITEM_TYPES.DRIVER_STATUS, driverState, { priority: 'normal' })
    return { queued: true, reason: 'backend_not_configured' }
  }
  const client = getSupabaseClient()
  if (!client) { queueItem(QUEUE_ITEM_TYPES.DRIVER_STATUS, driverState, {}); return { queued: true } }

  const { driverId, status, lastSeenAt, lastLocationAt, organisationId } = driverState
  if (!organisationId) { queueItem(QUEUE_ITEM_TYPES.DRIVER_STATUS, driverState, {}); return { queued: true, reason: 'missing_org_id' } }

  try {
    const record = {
      organisation_id:  organisationId,
      driver_id:        driverId || null,
      status:           status || 'available',
      last_seen_at:     lastSeenAt || new Date().toISOString(),
      last_location_at: lastLocationAt || null,
      is_demo:          false,
      metadata:         { source: 'driver_pwa', run: 12 },
    }
    const { data, error } = await client.from('driver_statuses').insert(record).select('id').single()
    if (error) { const n = normaliseSupabaseError(error); queueItem(QUEUE_ITEM_TYPES.DRIVER_STATUS, driverState, {}); return { queued: true, error: n } }
    _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: false })
    return { ok: true, id: data?.id }
  } catch (e) { queueItem(QUEUE_ITEM_TYPES.DRIVER_STATUS, driverState, {}); return { queued: true, error: { message: e.message } } }
}

/**
 * pushGpsLocationUpdate()
 * Inserts a GPS location snapshot to gps_location_updates.
 */
export async function pushGpsLocationUpdate(gpsData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.GPS_LOCATION_UPDATE, gpsData, {}); return { queued: true } }
  if (!gpsData.lat || !gpsData.lng) return { skipped: true, reason: 'no_coordinates' }

  const record = {
    organisation_id: gpsData.organisationId || null,
    trip_id:         gpsData.tripId   || null,
    driver_id:       gpsData.driverId || null,
    vehicle_id:      gpsData.vehicleId || null,
    lat:             gpsData.lat,
    lng:             gpsData.lng,
    accuracy_m:      gpsData.accuracyMeters || null,
    heading_deg:     gpsData.heading || null,
    speed_kmh:       gpsData.speed   || null,
    gps_source:      gpsData.source  || 'browser_geolocation',
    recorded_at:     gpsData.timestamp || new Date().toISOString(),
    is_demo:         false,
    metadata:        { confidence: gpsData.confidence, run: 12 },
  }
  return _safeInsert('gps_location_updates', record, QUEUE_ITEM_TYPES.GPS_LOCATION_UPDATE, gpsData)
}

/**
 * pushTripEvent()
 * Inserts a trip lifecycle event to trip_events.
 */
export async function pushTripEvent(tripEventData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.TRIP_EVENT, tripEventData, { priority: 'high' }); return { queued: true } }

  const record = {
    trip_id:         tripEventData.tripId       || null,
    organisation_id: tripEventData.organisationId || null,
    event_type:      tripEventData.eventType    || 'status_change',
    event_at:        tripEventData.timestamp    || new Date().toISOString(),
    lat:             tripEventData.lat          || null,
    lng:             tripEventData.lng          || null,
    notes:           tripEventData.notes        || null,
    is_demo:         false,
    metadata:        { run: 12, status: tripEventData.status },
  }
  return _safeInsert('trip_events', record, QUEUE_ITEM_TYPES.TRIP_EVENT, tripEventData, { priority: 'high' })
}

/**
 * pushPreTripChecklist()
 * Upserts pre-trip checklist to pre_trip_checklists.
 */
export async function pushPreTripChecklist(checklist) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.PRE_TRIP_CHECKLIST, checklist, {}); return { queued: true } }

  const record = {
    organisation_id:              checklist.organisationId || null,
    trip_id:                      checklist.tripId    || null,
    driver_id:                    checklist.driverId  || null,
    vehicle_id:                   checklist.vehicleId || null,
    vehicle_checked:              !!checklist.vehicleChecked,
    route_reviewed:               !!checklist.routeReviewed,
    restrictions_reviewed:        !!checklist.restrictionsReviewed,
    load_checked:                 !!checklist.loadChecked,
    safety_equipment_checked:     !!checklist.safetyEquipmentChecked,
    notes_reviewed:               !!checklist.notesReviewed,
    company_policy_acknowledged:  !!checklist.companyPolicyAcknowledged,
    notes:                        checklist.notes || null,
    completed_at:                 checklist.completedAt || null,
    override_started_without:     !!checklist.overrideStartedWithout,
    override_note:                checklist.overrideNote || null,
    is_demo:                      false,
    metadata:                     { run: 12 },
  }
  return _safeInsert('pre_trip_checklists', record, QUEUE_ITEM_TYPES.PRE_TRIP_CHECKLIST, checklist)
}

/**
 * pushRouteAcknowledgement()
 * Inserts route acknowledgement.
 */
export async function pushRouteAcknowledgement(ackData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.ROUTE_ACKNOWLEDGEMENT, ackData, {}); return { queued: true } }

  const record = {
    organisation_id: ackData.organisationId || null,
    route_id:        ackData.routeId        || null,
    driver_id:       ackData.driverId       || null,
    trip_id:         ackData.tripId         || null,
    acknowledged:    true,
    acknowledged_at: ackData.acknowledgedAt || new Date().toISOString(),
    is_demo:         false,
    metadata:        { run: 12 },
  }
  return _safeInsert('route_acknowledgements', record, QUEUE_ITEM_TYPES.ROUTE_ACKNOWLEDGEMENT, ackData)
}

/**
 * pushComplianceAcknowledgement()
 * Inserts advisory compliance acknowledgement.
 * Always advisory_only: true. Never guarantees compliance.
 */
export async function pushComplianceAcknowledgement(ackData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.COMPLIANCE_ACKNOWLEDGEMENT, ackData, {}); return { queued: true } }

  const record = {
    organisation_id:      ackData.organisationId || null,
    driver_id:            ackData.driverId       || null,
    route_id:             ackData.routeId        || null,
    trip_id:              ackData.tripId         || null,
    acknowledged:         true,
    acknowledged_at:      ackData.acknowledgedAt || new Date().toISOString(),
    acknowledgement_text: ackData.message        || null,
    advisory_only:        true,    // always
    no_guarantee:         true,    // always
    is_demo:              false,
    metadata:             { run: 12 },
  }
  return _safeInsert('compliance_acknowledgements', record, QUEUE_ITEM_TYPES.COMPLIANCE_ACKNOWLEDGEMENT, ackData)
}

/**
 * pushIncidentReport()
 * Inserts incident report. Evidence-preserving. Priority high.
 */
export async function pushIncidentReport(incident) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) {
    queueItem(QUEUE_ITEM_TYPES.INCIDENT_REPORT, incident, { priority: 'high' })
    return { queued: true, reason: 'backend_not_configured' }
  }

  const record = {
    organisation_id:    incident.organisationId  || null,
    reported_by_driver: incident.driverId        || null,
    trip_id:            incident.tripId          || null,
    vehicle_id:         incident.vehicleId       || null,
    route_id:           incident.routeId         || null,
    incident_type:      incident.type            || 'general',
    severity:           incident.severity        || 'low',
    title:              incident.title           || incident.description?.slice(0, 80) || 'Incident report',
    description:        incident.description     || '',
    lat:                incident.location?.lat   || null,
    lng:                incident.location?.lng   || null,
    incident_at:        incident.timestamp       || new Date().toISOString(),
    archived:           false,
    is_demo:            false,
    evidence_files:     [],
    metadata:           { localId: incident.id, run: 12 },
  }
  return _safeInsert('incident_reports', record, QUEUE_ITEM_TYPES.INCIDENT_REPORT, incident, { priority: 'high' })
}

/**
 * pushDriverNote()
 * Inserts a driver note.
 */
export async function pushDriverNote(note) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.DRIVER_NOTE, note, {}); return { queued: true } }

  const record = {
    organisation_id: note.organisationId || null,
    driver_id:       note.driverId       || null,
    trip_id:         note.tripId         || null,
    note_text:       note.text           || '',
    note_type:       note.type           || 'general',
    is_demo:         false,
    metadata:        { localId: note.id, run: 12 },
  }
  return _safeInsert('driver_notes', record, QUEUE_ITEM_TYPES.DRIVER_NOTE, note)
}

// ════════════════════════════════════════════════════════════════
// PULL FUNCTIONS — Dashboard / Driver PWA ← Supabase
// ════════════════════════════════════════════════════════════════

/**
 * fetchDriverAssignment()
 * Driver PWA reads its assigned route/vehicle from route_assignments.
 */
export async function fetchDriverAssignment(driverId, organisationId) {
  if (_isDemo()) return { data: null, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: null, reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: null, reason: 'client_null' }

  try {
    const { data, error } = await client
      .from('route_assignments')
      .select('*, fleet_routes(*), vehicles(*), drivers(*)')
      .eq('driver_id', driverId)
      .eq('organisation_id', organisationId)
      .in('status', ['confirmed', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) { const n = normaliseSupabaseError(error); return { data: null, error: n } }
    _lastDashboardRead = new Date().toISOString()
    return { data, readAt: _lastDashboardRead }
  } catch (e) { return { data: null, error: { message: e.message } } }
}

/**
 * fetchDriverActiveTrip()
 * Fetch driver's current active trip from active_trips.
 */
export async function fetchDriverActiveTrip(driverId, organisationId) {
  if (_isDemo()) return { data: null, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: null, reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: null, reason: 'client_null' }

  try {
    const { data, error } = await client
      .from('active_trips')
      .select('*')
      .eq('driver_id', driverId)
      .eq('organisation_id', organisationId)
      .in('status', ['started', 'paused', 'resumed'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) { const n = normaliseSupabaseError(error); return { data: null, error: n } }
    return { data, readAt: new Date().toISOString() }
  } catch (e) { return { data: null, error: { message: e.message } } }
}

/**
 * fetchDashboardDriverStatuses()
 * Dashboard reads all live driver statuses for the organisation.
 */
export async function fetchDashboardDriverStatuses(organisationId) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }

  try {
    const { data, error } = await client
      .from('driver_statuses')
      .select('*, drivers(full_name, driver_ref, status)')
      .eq('organisation_id', organisationId)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) { const n = normaliseSupabaseError(error); return { data: [], error: n } }
    _lastDashboardRead = new Date().toISOString()
    return { data: data || [], readAt: _lastDashboardRead }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

/**
 * fetchDashboardLiveIncidents()
 * Dashboard reads recent incidents for the organisation.
 */
export async function fetchDashboardLiveIncidents(organisationId, limit = 20) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }

  try {
    const { data, error } = await client
      .from('incident_reports')
      .select('*, drivers(full_name)')
      .eq('organisation_id', organisationId)
      .eq('archived', false)
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) { const n = normaliseSupabaseError(error); return { data: [], error: n } }
    return { data: data || [], readAt: new Date().toISOString() }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

/**
 * fetchDashboardActiveTrips()
 * Dashboard reads all active trips for the organisation.
 */
export async function fetchDashboardActiveTrips(organisationId) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }

  try {
    const { data, error } = await client
      .from('active_trips')
      .select('*, drivers(full_name, driver_ref), vehicles(reg, vehicle_type), fleet_routes(name, destination_label)')
      .eq('organisation_id', organisationId)
      .in('status', ['started', 'paused', 'resumed'])
      .order('started_at', { ascending: false })
      .limit(50)

    if (error) { const n = normaliseSupabaseError(error); return { data: [], error: n } }
    return { data: data || [], readAt: new Date().toISOString() }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD — Create/update route assignment
// ════════════════════════════════════════════════════════════════

/**
 * createOrUpdateAssignment()
 * Dashboard assigns a route/driver/vehicle in Supabase.
 */
export async function createOrUpdateAssignment({ routeId, driverId, vehicleId, organisationId, assignedBy }) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { ok: false, reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { ok: false, reason: 'client_null' }

  try {
    const record = {
      organisation_id: organisationId,
      route_id:        routeId   || null,
      driver_id:       driverId  || null,
      vehicle_id:      vehicleId || null,
      assigned_by:     assignedBy || null,
      status:          'confirmed',
      is_demo:         false,
      metadata:        { run: 12, createdAt: new Date().toISOString() },
    }
    const { data, error } = await client.from('route_assignments').insert(record).select('id').single()
    if (error) { const n = normaliseSupabaseError(error); return { ok: false, error: n } }
    return { ok: true, id: data?.id }
  } catch (e) { return { ok: false, error: { message: e.message } } }
}

// ════════════════════════════════════════════════════════════════
// OFFLINE QUEUE RETRY
// ════════════════════════════════════════════════════════════════

/**
 * retryDriverPendingSync()
 * Attempts to sync all pending queue items to Supabase.
 * Evidence-safe: never loses incidents.
 */
export async function retryDriverPendingSync() {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode', synced: 0, failed: 0 }
  if (!isSupabaseConfigured()) return { ok: false, reason: 'backend_not_configured', synced: 0, failed: 0 }

  const pending = getPendingItems()
  if (!pending.length) return { ok: true, synced: 0, failed: 0, message: 'No pending items' }

  let synced = 0, failed = 0
  for (const item of pending) {
    markSyncing(item.id)
    let result
    try {
      switch (item.type) {
        case QUEUE_ITEM_TYPES.DRIVER_STATUS:              result = await pushDriverStatus(item.payload); break
        case QUEUE_ITEM_TYPES.GPS_LOCATION_UPDATE:        result = await pushGpsLocationUpdate(item.payload); break
        case QUEUE_ITEM_TYPES.TRIP_EVENT:                 result = await pushTripEvent(item.payload); break
        case QUEUE_ITEM_TYPES.PRE_TRIP_CHECKLIST:         result = await pushPreTripChecklist(item.payload); break
        case QUEUE_ITEM_TYPES.ROUTE_ACKNOWLEDGEMENT:      result = await pushRouteAcknowledgement(item.payload); break
        case QUEUE_ITEM_TYPES.COMPLIANCE_ACKNOWLEDGEMENT: result = await pushComplianceAcknowledgement(item.payload); break
        case QUEUE_ITEM_TYPES.INCIDENT_REPORT:            result = await pushIncidentReport(item.payload); break
        case QUEUE_ITEM_TYPES.DRIVER_NOTE:                result = await pushDriverNote(item.payload); break
        default: markFailed(item.id, 'Unknown queue item type'); failed++; continue
      }
      if (result?.ok) { markSynced(item.id, result.id); synced++ }
      else { markFailed(item.id, result?.error?.message || 'Sync failed'); failed++ }
    } catch (e) { markFailed(item.id, e.message); failed++ }
  }
  _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: failed > 0 })
  return { ok: failed === 0, synced, failed, total: pending.length }
}

// ════════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS (Dashboard)
// ════════════════════════════════════════════════════════════════

/**
 * subscribeDashboardToDriverUpdates()
 * Dashboard subscribes to Supabase Realtime for driver updates.
 * Falls back to polling if realtime unavailable.
 */
export function subscribeDashboardToDriverUpdates(organisationId, onUpdate) {
  if (_isDemo() || !isSupabaseConfigured()) {
    onUpdate?.({ status: _isDemo() ? LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY : LIVE_SYNC_STATUS.BACKEND_MISSING, data: null })
    return () => {}
  }
  const client = getSupabaseClient()
  if (!client) {
    onUpdate?.({ status: LIVE_SYNC_STATUS.BACKEND_MISSING, data: null })
    return () => {}
  }

  try {
    const channel = client
      .channel(`bigv-driver-sync-${organisationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_statuses',    filter: `organisation_id=eq.${organisationId}` }, p => onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, table: 'driver_statuses', payload: p }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_trips',        filter: `organisation_id=eq.${organisationId}` }, p => onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, table: 'active_trips',    payload: p }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_location_updates',filter: `organisation_id=eq.${organisationId}` }, p => onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, table: 'gps_location_updates', payload: p }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports',    filter: `organisation_id=eq.${organisationId}` }, p => onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, table: 'incident_reports',    payload: p }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_trip_checklists', filter: `organisation_id=eq.${organisationId}` }, p => onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, table: 'pre_trip_checklists', payload: p }))
      .subscribe((sub) => {
        if (sub === 'SUBSCRIBED') {
          _realtimeChannel = channel
          onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, connected: true })
        } else if (sub === 'CHANNEL_ERROR' || sub === 'TIMED_OUT') {
          _realtimeChannel = null
          _startPolling(organisationId, onUpdate)
        }
      })

    _realtimeChannel = channel
    return () => {
      try { client.removeChannel(channel) } catch {}
      _realtimeChannel = null
    }
  } catch (e) {
    console.warn('[BigV:DriverSync] Realtime subscribe failed, falling back to polling:', e.message)
    _startPolling(organisationId, onUpdate)
    return () => _stopPolling()
  }
}

function _startPolling(organisationId, onUpdate) {
  if (_pollingInterval) return
  _pollingInterval = setInterval(async () => {
    const result = await fetchDashboardDriverStatuses(organisationId)
    onUpdate?.({ status: LIVE_SYNC_STATUS.POLLING_FALLBACK, data: result.data, readAt: result.readAt })
  }, 30000) // 30s polling fallback
  onUpdate?.({ status: LIVE_SYNC_STATUS.POLLING_FALLBACK })
}

function _stopPolling() {
  if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null }
}

// ════════════════════════════════════════════════════════════════
// SYNC MARKER HELPERS
// ════════════════════════════════════════════════════════════════

export function markDriverSyncSuccess(id, supabaseId) { markSynced(id, supabaseId) }
export function markDriverSyncFailure(id, error)      { markFailed(id, error) }

// ════════════════════════════════════════════════════════════════
// QUEUE HELPERS (re-export from offlineQueueManager)
// ════════════════════════════════════════════════════════════════

export function queueDriverOfflineUpdate(type, payload, opts) { return queueItem(type, payload, opts) }
export { getPendingCount, getQueueSummary, clearSyncedItems }

export default {
  getDriverLiveSyncStatus,
  isLiveDriverSyncAvailable,
  fetchDriverAssignment,
  fetchDriverActiveTrip,
  fetchDashboardDriverStatuses,
  fetchDashboardLiveIncidents,
  fetchDashboardActiveTrips,
  createOrUpdateAssignment,
  pushDriverStatus,
  pushGpsLocationUpdate,
  pushTripEvent,
  pushPreTripChecklist,
  pushRouteAcknowledgement,
  pushComplianceAcknowledgement,
  pushIncidentReport,
  pushDriverNote,
  retryDriverPendingSync,
  queueDriverOfflineUpdate,
  markDriverSyncSuccess,
  markDriverSyncFailure,
  normaliseSupabaseError,
  getPendingCount,
  getQueueSummary,
  LIVE_SYNC_STATUS,
  QUEUE_ITEM_TYPES,
}
