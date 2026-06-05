/**
 * ============================================================
 * Big V's Best Routes™ — Controller Live Sync Manager
 * /src/services/sync/controllerSyncManager.js
 *
 * RUN 13 — Real-Time Dashboard ↔ Fleet Controller PWA Sync
 *
 * PURPOSE:
 *   All Fleet Controller PWA → Supabase push operations and
 *   Dashboard ← Supabase pull operations for live controller data.
 *   Uses anon/public Supabase client only. Respects RLS.
 *   Falls back to offline queue if backend unavailable.
 *
 * SECURITY:
 *   No service role key. No backend secrets.
 *   All operations go through RLS-protected anon client.
 *   Backend settings never exposed in Controller PWA.
 *
 * SAFETY / ADVISORY:
 *   "Synced controller data supports fleet visibility and review
 *    workflow only. It does not replace driver responsibility,
 *    fleet manager responsibility, road signage, current laws,
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
 *   Status: realtime_connected | polling_fallback | offline_queue
 *           | backend_missing | schema_or_policy_error | local_demo_only
 * ============================================================
 */

import { getSupabaseClient, isSupabaseConfigured } from './services_supabase_supabaseClient'
import {
  queueItem, markSyncing, markSynced, markFailed,
  getPendingItems, getPendingCount, getQueueSummary,
  QUEUE_ITEM_TYPES, QUEUE_STATUS,
} from './services_sync_offlineQueueManager'

// ── Re-export status constants (mirrors driverLiveSyncManager) ─
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

// ── Internal realtime state ───────────────────────────────────
let _realtimeChannel  = null
let _pollingInterval  = null

// ── Mode helpers (no circular import) ─────────────────────────
function _getMode() {
  try {
    const raw = localStorage.getItem('bigv:mode:demoLive')
    if (!raw) return 'demo'
    return JSON.parse(raw)?.demoLiveMode?.mode ?? 'demo'
  } catch { return 'demo' }
}
function _isDemo() { return _getMode() === 'demo' }
function _isLive()  { return _getMode() === 'live'  }

// ── Update SSOT syncStatus without circular import ─────────────
function _updateSST(patch) {
  try {
    const key = 'bigv:controller:state'
    const raw = localStorage.getItem(key)
    const state = raw ? JSON.parse(raw) : {}
    state.syncStatus = { ...state.syncStatus, ...patch }
    localStorage.setItem(key, JSON.stringify(state))
  } catch {}
}

// ── Normalise Supabase error ──────────────────────────────────
export function normaliseSupabaseError(error) {
  if (!error) return null
  const msg  = error?.message || error?.details || String(error)
  const code = error?.code    || error?.status   || ''
  const isRLS    = code === '42501' || code === 'PGRST301' ||
                   msg?.toLowerCase().includes('row-level security') ||
                   msg?.toLowerCase().includes('permission denied')
  const isMissing = code === '42P01' || msg?.toLowerCase().includes('does not exist')
  return { message: msg, code: String(code), isRLS, isMissing, raw: error }
}

// ── isLiveControllerSyncAvailable ────────────────────────────
export function isLiveControllerSyncAvailable() {
  if (_isDemo()) return false
  return isSupabaseConfigured()
}

// ── getControllerLiveSyncStatus ───────────────────────────────
export function getControllerLiveSyncStatus() {
  if (_isDemo())            return LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY
  if (!isSupabaseConfigured()) return LIVE_SYNC_STATUS.BACKEND_MISSING
  if (_realtimeChannel)     return LIVE_SYNC_STATUS.REALTIME_CONNECTED
  if (_pollingInterval)     return LIVE_SYNC_STATUS.POLLING_FALLBACK
  return LIVE_SYNC_STATUS.OFFLINE_QUEUE
}

// ── Safe Supabase insert helper ───────────────────────────────
async function _safeInsert(table, record, queueType, queuePayload, options = {}) {
  const client = getSupabaseClient()
  if (!client) {
    const qId = queueItem(queueType, queuePayload, { isDemo: false, priority: options.priority ?? 'normal' })
    _updateSST({ pendingSync: true, lastError: `Backend not configured — queued locally (${table}).` })
    return { queued: true, queueId: qId }
  }
  try {
    const { data, error } = await client.from(table).insert(record).select('id').single()
    if (error) {
      const norm = normaliseSupabaseError(error)
      if (norm.isRLS)     { _updateSST({ lastError: `RLS blocked insert to ${table}. Check Supabase policies.` }); return { ok: false, rlsError: true, error: norm } }
      if (norm.isMissing) { _updateSST({ lastError: `Table ${table} not found. Deploy Run 11 + 13 SQL.` });       return { ok: false, schemaError: true, error: norm } }
      const qId = queueItem(queueType, queuePayload, { priority: options.priority ?? 'normal' })
      _updateSST({ pendingSync: true, lastError: norm.message })
      return { queued: true, queueId: qId, error: norm }
    }
    _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: false, lastError: null })
    return { ok: true, id: data?.id }
  } catch (e) {
    const qId = queueItem(queueType, queuePayload, { priority: options.priority ?? 'normal' })
    _updateSST({ pendingSync: true, lastError: e.message })
    return { queued: true, queueId: qId, error: { message: e.message } }
  }
}

// ════════════════════════════════════════════════════════════════
// PUSH FUNCTIONS — Controller PWA → Supabase
// ════════════════════════════════════════════════════════════════

/**
 * pushControllerStatus()
 * Upserts controller presence in controller_actions (status record).
 */
export async function pushControllerStatus(controllerState) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) {
    queueItem(QUEUE_ITEM_TYPES.CONTROLLER_STATUS, controllerState, {})
    return { queued: true, reason: 'backend_not_configured' }
  }
  const record = {
    organisation_id: controllerState.organisationId || null,
    controller_id:   controllerState.controllerId   || null,
    performed_by:    controllerState.profileId      || null,
    action_type:     'status_update',
    status:          'synced',
    notes:           `Status: ${controllerState.status || 'active'}, Last seen: ${new Date().toISOString()}`,
    is_demo:         false,
    metadata:        { source: 'fleet_controller_pwa', run: 13, status: controllerState.status },
  }
  return _safeInsert('controller_actions', record, QUEUE_ITEM_TYPES.CONTROLLER_STATUS, controllerState)
}

/**
 * pushControllerAction()
 * Pushes a controller action (request_check_in, mark_reviewed, flag_route_review, etc.)
 */
export async function pushControllerAction(action) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) {
    queueItem(QUEUE_ITEM_TYPES.CONTROLLER_ACTION, action, { priority: 'high' })
    return { queued: true, reason: 'backend_not_configured' }
  }
  const record = {
    organisation_id: action.organisationId || null,
    controller_id:   action.controllerId   || null,
    performed_by:    action.profileId      || null,
    action_type:     action.type           || 'add_note',
    target_type:     action.targetType     || null,
    target_id:       action.targetId       || null,
    status:          'synced',
    notes:           action.note           || null,
    is_demo:         false,
    metadata:        {
      driverId:  action.driverId  || null,
      tripId:    action.tripId    || null,
      routeId:   action.routeId   || null,
      vehicleId: action.vehicleId || null,
      localId:   action.id        || null,
      run:       13,
    },
  }
  return _safeInsert('controller_actions', record, QUEUE_ITEM_TYPES.CONTROLLER_ACTION, action, { priority: 'high' })
}

/**
 * pushControllerNote()
 * Pushes a controller note. Evidence-preserving.
 */
export async function pushControllerNote(note) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) {
    queueItem(QUEUE_ITEM_TYPES.CONTROLLER_NOTE, note, { priority: 'high' })
    return { queued: true }
  }
  const record = {
    organisation_id: note.organisationId || null,
    controller_id:   note.controllerId   || null,
    performed_by:    note.profileId      || null,
    subject_type:    note.subjectType    || null,
    subject_id:      note.subjectId      || null,
    note_text:       note.text           || '',
    is_demo:         false,
    metadata:        { severity: note.severity, driverId: note.driverId, tripId: note.tripId, routeId: note.routeId, vehicleId: note.vehicleId, incidentId: note.incidentId, localId: note.id, run: 13 },
  }
  return _safeInsert('controller_notes', record, QUEUE_ITEM_TYPES.CONTROLLER_NOTE, note, { priority: 'high' })
}

/**
 * pushIncidentReview()
 * Updates the incident report's review fields.
 * Evidence-preserving — never destroys data.
 */
export async function pushIncidentReview(reviewData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) {
    queueItem(QUEUE_ITEM_TYPES.INCIDENT_REVIEW, reviewData, { priority: 'high' })
    return { queued: true }
  }
  const client = getSupabaseClient()
  if (!client) { queueItem(QUEUE_ITEM_TYPES.INCIDENT_REVIEW, reviewData, { priority: 'high' }); return { queued: true } }

  try {
    // UPDATE incident_reports review fields only — never deletes evidence
    if (reviewData.incidentId) {
      const patch = {
        reviewed:      true,
        reviewed_at:   reviewData.reviewedAt || new Date().toISOString(),
        review_notes:  reviewData.reviewNote || null,
        metadata:      { reviewedBy: reviewData.reviewedBy || null, followUp: !!reviewData.flagForFollowUp, run: 13 },
      }
      const { error } = await client.from('incident_reports').update(patch).eq('id', reviewData.incidentId)
      if (error) {
        const norm = normaliseSupabaseError(error)
        queueItem(QUEUE_ITEM_TYPES.INCIDENT_REVIEW, reviewData, { priority: 'high' })
        _updateSST({ lastError: norm.message, pendingSync: true })
        return { queued: true, error: norm }
      }
      _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: false })
      return { ok: true }
    }
    // If no incidentId — push as controller_action
    return pushControllerAction({ ...reviewData, type: 'incident_review', targetType: 'incident', targetId: reviewData.incidentId })
  } catch (e) {
    queueItem(QUEUE_ITEM_TYPES.INCIDENT_REVIEW, reviewData, { priority: 'high' })
    return { queued: true, error: { message: e.message } }
  }
}

/**
 * pushRouteReviewFlag()
 * Inserts a route review flag as a controller_action.
 */
export async function pushRouteReviewFlag(flagData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.ROUTE_REVIEW_FLAG, flagData, { priority: 'high' }); return { queued: true } }

  const record = {
    organisation_id: flagData.organisationId || null,
    controller_id:   flagData.controllerId   || null,
    performed_by:    flagData.profileId      || null,
    action_type:     'flag_route_review',
    target_type:     'route',
    target_id:       flagData.routeId        || null,
    status:          'synced',
    notes:           flagData.reason         || 'Route flagged for review',
    is_demo:         false,
    metadata:        { severity: flagData.severity, driverId: flagData.driverId, tripId: flagData.tripId, vehicleId: flagData.vehicleId, localId: flagData.id, run: 13 },
  }
  return _safeInsert('controller_actions', record, QUEUE_ITEM_TYPES.ROUTE_REVIEW_FLAG, flagData, { priority: 'high' })
}

/**
 * pushDriverCheckInRequest()
 * Inserts a driver check-in request as a controller_action.
 */
export async function pushDriverCheckInRequest(checkInData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.DRIVER_CHECK_IN_REQUEST, checkInData, { priority: 'high' }); return { queued: true } }

  const record = {
    organisation_id: checkInData.organisationId || null,
    controller_id:   checkInData.controllerId   || null,
    performed_by:    checkInData.profileId      || null,
    action_type:     'request_check_in',
    target_type:     'driver',
    target_id:       checkInData.driverId       || null,
    status:          'synced',
    notes:           checkInData.message        || 'Check-in requested by controller',
    is_demo:         false,
    metadata:        { tripId: checkInData.tripId, requestedAt: checkInData.requestedAt || new Date().toISOString(), reason: checkInData.reason, run: 13 },
  }
  return _safeInsert('controller_actions', record, QUEUE_ITEM_TYPES.DRIVER_CHECK_IN_REQUEST, checkInData, { priority: 'high' })
}

/**
 * pushComplianceExceptionReview()
 * Inserts a compliance exception review.
 * Advisory only — never implies legal compliance guarantee.
 */
export async function pushComplianceExceptionReview(reviewData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.COMPLIANCE_EXCEPTION_REVIEW, reviewData, {}); return { queued: true } }
  const client = getSupabaseClient()
  if (!client) { queueItem(QUEUE_ITEM_TYPES.COMPLIANCE_EXCEPTION_REVIEW, reviewData, {}); return { queued: true } }

  try {
    // Update compliance_checks if checkId available
    if (reviewData.checkId) {
      const { error } = await client.from('compliance_checks').update({
        status:    reviewData.status    || 'advisory',
        notes:     reviewData.note      || null,
        metadata:  { reviewedBy: reviewData.reviewedBy, reviewedAt: reviewData.reviewedAt || new Date().toISOString(), advisory_only: true, run: 13 },
      }).eq('id', reviewData.checkId)
      if (error) {
        const norm = normaliseSupabaseError(error)
        queueItem(QUEUE_ITEM_TYPES.COMPLIANCE_EXCEPTION_REVIEW, reviewData, {})
        return { queued: true, error: norm }
      }
      _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: false })
      return { ok: true }
    }
    // Fallback to controller_action
    return pushControllerAction({ ...reviewData, type: 'compliance_exception_review', targetType: 'compliance_check', targetId: reviewData.checkId })
  } catch (e) {
    queueItem(QUEUE_ITEM_TYPES.COMPLIANCE_EXCEPTION_REVIEW, reviewData, {})
    return { queued: true, error: { message: e.message } }
  }
}

/**
 * pushVehicleReadinessReview()
 * Inserts vehicle readiness review into vehicle_readiness table.
 * Advisory only — never guarantees vehicle legal suitability.
 */
export async function pushVehicleReadinessReview(readinessData) {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) { queueItem(QUEUE_ITEM_TYPES.VEHICLE_READINESS_REVIEW, readinessData, {}); return { queued: true } }

  const record = {
    organisation_id: readinessData.organisationId || null,
    vehicle_id:      readinessData.vehicleId      || null,
    checked_by:      readinessData.profileId      || null,
    readiness_status: readinessData.status        || 'unknown',
    check_notes:     readinessData.note           || null,
    advisory_only:   true,   // always
    checked_at:      readinessData.checkedAt      || new Date().toISOString(),
    is_demo:         false,
    metadata:        { controllerId: readinessData.controllerId, localId: readinessData.id, run: 13 },
  }
  return _safeInsert('vehicle_readiness', record, QUEUE_ITEM_TYPES.VEHICLE_READINESS_REVIEW, readinessData)
}

// ════════════════════════════════════════════════════════════════
// PULL FUNCTIONS — Controller PWA / Dashboard ← Supabase
// ════════════════════════════════════════════════════════════════

/**
 * fetchControllerOperationalView()
 * Controller PWA reads full live operational picture from Supabase.
 */
export async function fetchControllerOperationalView(organisationId) {
  if (_isDemo()) return { data: null, reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: null, reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: null, reason: 'client_null' }

  try {
    const [tripsRes, driversRes, incidentsRes, actionsRes] = await Promise.all([
      client.from('active_trips').select('*, drivers(full_name, driver_ref), vehicles(reg, vehicle_type), fleet_routes(name, destination_label)').eq('organisation_id', organisationId).in('status', ['started','paused','resumed']).order('started_at', { ascending: false }).limit(50),
      client.from('driver_statuses').select('*, drivers(full_name, driver_ref)').eq('organisation_id', organisationId).order('updated_at', { ascending: false }).limit(100),
      client.from('incident_reports').select('*, drivers(full_name)').eq('organisation_id', organisationId).eq('archived', false).eq('is_demo', false).order('created_at', { ascending: false }).limit(30),
      client.from('controller_actions').select('*').eq('organisation_id', organisationId).order('created_at', { ascending: false }).limit(50),
    ])

    const errors = [tripsRes.error, driversRes.error, incidentsRes.error, actionsRes.error].filter(Boolean)
    const firstErr = errors[0]
    if (firstErr) {
      const norm = normaliseSupabaseError(firstErr)
      return { data: null, error: norm }
    }

    return {
      data: {
        activeTrips:     tripsRes.data    || [],
        driverStatuses:  driversRes.data  || [],
        incidents:       incidentsRes.data || [],
        controllerActions: actionsRes.data || [],
      },
      readAt: new Date().toISOString(),
    }
  } catch (e) { return { data: null, error: { message: e.message } } }
}

/**
 * fetchControllerLiveTrips()
 */
export async function fetchControllerLiveTrips(organisationId) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }
  try {
    const { data, error } = await client.from('active_trips').select('*, drivers(full_name, driver_ref), vehicles(reg, vehicle_type), fleet_routes(name, destination_label)').eq('organisation_id', organisationId).in('status', ['started','paused','resumed']).order('started_at', { ascending: false }).limit(50)
    if (error) return { data: [], error: normaliseSupabaseError(error) }
    return { data: data || [], readAt: new Date().toISOString() }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

/**
 * fetchControllerDriverStatuses()
 */
export async function fetchControllerDriverStatuses(organisationId) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }
  try {
    const { data, error } = await client.from('driver_statuses').select('*, drivers(full_name, driver_ref, status)').eq('organisation_id', organisationId).order('updated_at', { ascending: false }).limit(100)
    if (error) return { data: [], error: normaliseSupabaseError(error) }
    return { data: data || [], readAt: new Date().toISOString() }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

/**
 * fetchControllerIncidentReviews()
 */
export async function fetchControllerIncidentReviews(organisationId, limit = 30) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }
  try {
    const { data, error } = await client.from('incident_reports').select('*, drivers(full_name)').eq('organisation_id', organisationId).eq('archived', false).order('created_at', { ascending: false }).limit(limit)
    if (error) return { data: [], error: normaliseSupabaseError(error) }
    return { data: data || [], readAt: new Date().toISOString() }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

/**
 * fetchDashboardControllerActions()
 * Dashboard reads controller actions/notes from Supabase.
 */
export async function fetchDashboardControllerActions(organisationId, limit = 50) {
  if (_isDemo()) return { data: [], reason: 'demo_mode' }
  if (!isSupabaseConfigured()) return { data: [], reason: 'backend_not_configured' }
  const client = getSupabaseClient()
  if (!client) return { data: [], reason: 'client_null' }
  try {
    const [actRes, notesRes] = await Promise.all([
      client.from('controller_actions').select('*').eq('organisation_id', organisationId).order('created_at', { ascending: false }).limit(limit),
      client.from('controller_notes').select('*').eq('organisation_id', organisationId).order('created_at', { ascending: false }).limit(limit),
    ])
    const err = actRes.error || notesRes.error
    if (err) return { data: [], error: normaliseSupabaseError(err) }
    return { data: { actions: actRes.data || [], notes: notesRes.data || [] }, readAt: new Date().toISOString() }
  } catch (e) { return { data: [], error: { message: e.message } } }
}

// ════════════════════════════════════════════════════════════════
// OFFLINE QUEUE RETRY
// ════════════════════════════════════════════════════════════════

/**
 * retryControllerPendingSync()
 * Attempts to sync all pending controller queue items to Supabase.
 */
export async function retryControllerPendingSync() {
  if (_isDemo()) return { skipped: true, reason: 'demo_mode', synced: 0, failed: 0 }
  if (!isSupabaseConfigured()) return { ok: false, reason: 'backend_not_configured', synced: 0, failed: 0 }

  const pending = getPendingItems().filter(i =>
    [QUEUE_ITEM_TYPES.CONTROLLER_STATUS, QUEUE_ITEM_TYPES.CONTROLLER_ACTION,
     QUEUE_ITEM_TYPES.CONTROLLER_NOTE, QUEUE_ITEM_TYPES.INCIDENT_REVIEW,
     QUEUE_ITEM_TYPES.ROUTE_REVIEW_FLAG, QUEUE_ITEM_TYPES.DRIVER_CHECK_IN_REQUEST,
     QUEUE_ITEM_TYPES.COMPLIANCE_EXCEPTION_REVIEW, QUEUE_ITEM_TYPES.VEHICLE_READINESS_REVIEW].includes(i.type)
  )
  if (!pending.length) return { ok: true, synced: 0, failed: 0, message: 'No pending controller items' }

  let synced = 0, failed = 0
  for (const item of pending) {
    markSyncing(item.id)
    let result
    try {
      switch (item.type) {
        case QUEUE_ITEM_TYPES.CONTROLLER_STATUS:            result = await pushControllerStatus(item.payload); break
        case QUEUE_ITEM_TYPES.CONTROLLER_ACTION:            result = await pushControllerAction(item.payload); break
        case QUEUE_ITEM_TYPES.CONTROLLER_NOTE:              result = await pushControllerNote(item.payload); break
        case QUEUE_ITEM_TYPES.INCIDENT_REVIEW:              result = await pushIncidentReview(item.payload); break
        case QUEUE_ITEM_TYPES.ROUTE_REVIEW_FLAG:            result = await pushRouteReviewFlag(item.payload); break
        case QUEUE_ITEM_TYPES.DRIVER_CHECK_IN_REQUEST:      result = await pushDriverCheckInRequest(item.payload); break
        case QUEUE_ITEM_TYPES.COMPLIANCE_EXCEPTION_REVIEW:  result = await pushComplianceExceptionReview(item.payload); break
        case QUEUE_ITEM_TYPES.VEHICLE_READINESS_REVIEW:     result = await pushVehicleReadinessReview(item.payload); break
        default: markFailed(item.id, 'Unknown controller queue type'); failed++; continue
      }
      if (result?.ok) { markSynced(item.id, result.id); synced++ }
      else { markFailed(item.id, result?.error?.message || 'Sync failed'); failed++ }
    } catch (e) { markFailed(item.id, e.message); failed++ }
  }
  _updateSST({ lastSyncAt: new Date().toISOString(), pendingSync: failed > 0 })
  return { ok: failed === 0, synced, failed, total: pending.length }
}

// ════════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTION (Controller PWA + Dashboard)
// ════════════════════════════════════════════════════════════════

/**
 * subscribeControllerToLiveUpdates()
 * Controller PWA / Dashboard subscribes to Supabase Realtime for all
 * operational tables. Falls back to polling if realtime unavailable.
 */
export function subscribeControllerToLiveUpdates(organisationId, onUpdate) {
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
    const TABLES_TO_WATCH = [
      'active_trips', 'trip_events', 'driver_statuses', 'gps_location_updates',
      'route_assignments', 'pre_trip_checklists', 'route_acknowledgements',
      'compliance_acknowledgements', 'incident_reports', 'driver_notes',
      'controller_actions', 'controller_notes', 'vehicle_readiness',
      'compliance_checks', 'route_risk_results',
    ]

    let channelBuilder = client.channel(`bigv-ctrl-sync-${organisationId}`)
    for (const tbl of TABLES_TO_WATCH) {
      channelBuilder = channelBuilder.on('postgres_changes', { event: '*', schema: 'public', table: tbl, filter: `organisation_id=eq.${organisationId}` },
        p => onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, table: tbl, payload: p }))
    }

    channelBuilder.subscribe((sub) => {
      if (sub === 'SUBSCRIBED') {
        _realtimeChannel = channelBuilder
        onUpdate?.({ status: LIVE_SYNC_STATUS.REALTIME_CONNECTED, connected: true })
      } else if (sub === 'CHANNEL_ERROR' || sub === 'TIMED_OUT') {
        _realtimeChannel = null
        _startPolling(organisationId, onUpdate)
      }
    })

    _realtimeChannel = channelBuilder
    return () => {
      try { client.removeChannel(channelBuilder) } catch {}
      _realtimeChannel = null
    }
  } catch (e) {
    console.warn('[BigV:CtrlSync] Realtime subscribe failed, polling fallback:', e.message)
    _startPolling(organisationId, onUpdate)
    return () => _stopPolling()
  }
}

function _startPolling(organisationId, onUpdate) {
  if (_pollingInterval) return
  _pollingInterval = setInterval(async () => {
    const result = await fetchControllerLiveTrips(organisationId)
    onUpdate?.({ status: LIVE_SYNC_STATUS.POLLING_FALLBACK, data: result.data, readAt: result.readAt })
  }, 30000)
  onUpdate?.({ status: LIVE_SYNC_STATUS.POLLING_FALLBACK })
}
function _stopPolling() {
  if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null }
}

// ════════════════════════════════════════════════════════════════
// HELPERS (re-exports)
// ════════════════════════════════════════════════════════════════

export function queueControllerOfflineUpdate(type, payload, opts) { return queueItem(type, payload, opts) }
export function markControllerSyncSuccess(id, supabaseId) { markSynced(id, supabaseId) }
export function markControllerSyncFailure(id, error)      { markFailed(id, error)      }
export { getPendingCount, getQueueSummary }

export default {
  getControllerLiveSyncStatus,
  isLiveControllerSyncAvailable,
  fetchControllerOperationalView,
  fetchControllerLiveTrips,
  fetchControllerDriverStatuses,
  fetchControllerIncidentReviews,
  fetchDashboardControllerActions,
  pushControllerStatus,
  pushControllerAction,
  pushControllerNote,
  pushIncidentReview,
  pushRouteReviewFlag,
  pushDriverCheckInRequest,
  pushComplianceExceptionReview,
  pushVehicleReadinessReview,
  retryControllerPendingSync,
  queueControllerOfflineUpdate,
  markControllerSyncSuccess,
  markControllerSyncFailure,
  normaliseSupabaseError,
  subscribeControllerToLiveUpdates,
  getPendingCount,
  getQueueSummary,
  LIVE_SYNC_STATUS,
  QUEUE_ITEM_TYPES,
}
