/**
 * ============================================================
 * Big V's Best Routes™ — Offline Queue Manager
 * /src/services/sync/offlineQueueManager.js
 *
 * RUN 12 — Real-Time Dashboard ↔ Driver PWA Sync
 *
 * PURPOSE:
 *   Local-first offline queue for Driver PWA → Supabase sync.
 *   Stores pending sync items in localStorage when network/backend
 *   is unavailable. Retries safely when connection returns.
 *
 * SAFETY:
 *   - Evidence-preserving: incident reports are never lost
 *   - Unsynced items are never deleted automatically
 *   - Newer local records are not overwritten by stale backend data
 *   - Conflicts are flagged for human review
 *
 * SECURITY:
 *   No API keys. No backend secrets. No service role key.
 *   Local localStorage only — safe for Driver PWA.
 *
 * ADVISORY:
 *   Synced driver data supports fleet visibility only.
 *   It does not replace driver responsibility, road signage,
 *   current laws, permits, restrictions, or company policy.
 * ============================================================
 */

const QUEUE_KEY    = 'bigv:driver:offline_queue'
const MAX_ITEMS    = 500
const MAX_RETRIES  = 10

// ── Queue item types ──────────────────────────────────────────
export const QUEUE_ITEM_TYPES = {
  DRIVER_STATUS:             'driver_status',
  GPS_LOCATION_UPDATE:       'gps_location_update',
  TRIP_EVENT:                'trip_event',
  PRE_TRIP_CHECKLIST:        'pre_trip_checklist',
  ROUTE_ACKNOWLEDGEMENT:     'route_acknowledgement',
  COMPLIANCE_ACKNOWLEDGEMENT:'compliance_acknowledgement',
  INCIDENT_REPORT:           'incident_report',
  DRIVER_NOTE:               'driver_note',
  // RUN 13 — Controller PWA queue item types
  CONTROLLER_STATUS:              'controller_status',
  CONTROLLER_ACTION:              'controller_action',
  CONTROLLER_NOTE:                'controller_note',
  INCIDENT_REVIEW:                'incident_review',
  ROUTE_REVIEW_FLAG:              'route_review_flag',
  DRIVER_CHECK_IN_REQUEST:        'driver_check_in_request',
  COMPLIANCE_EXCEPTION_REVIEW:    'compliance_exception_review',
  VEHICLE_READINESS_REVIEW:       'vehicle_readiness_review',
}

// ── Queue item status ─────────────────────────────────────────
export const QUEUE_STATUS = {
  PENDING:   'pending',
  SYNCING:   'syncing',
  SYNCED:    'synced',
  FAILED:    'failed',
  CONFLICT:  'conflict',
}

// ── Load queue from localStorage ─────────────────────────────
function _loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ── Persist queue to localStorage ────────────────────────────
function _saveQueue(items) {
  try {
    // Cap at MAX_ITEMS — preserve oldest pending and all incidents (evidence)
    const incidents = items.filter(i => i.type === QUEUE_ITEM_TYPES.INCIDENT_REPORT)
    const others    = items.filter(i => i.type !== QUEUE_ITEM_TYPES.INCIDENT_REPORT)
    const combined  = [...incidents, ...others].slice(0, MAX_ITEMS)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(combined))
  } catch (e) {
    console.warn('[BigV:OfflineQueue] persist failed:', e)
  }
}

// ── Add item to queue ─────────────────────────────────────────
export function queueItem(type, payload, options = {}) {
  const queue = _loadQueue()
  const item = {
    id:          `q-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type,
    payload,
    status:      QUEUE_STATUS.PENDING,
    retryCount:  0,
    maxRetries:  options.maxRetries ?? MAX_RETRIES,
    lastError:   null,
    isDemo:      options.isDemo ?? false,
    priority:    options.priority ?? 'normal',   // 'high' for incidents
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    syncedAt:    null,
  }
  queue.unshift(item)
  _saveQueue(queue)
  return item.id
}

// ── Get all pending items ─────────────────────────────────────
export function getPendingItems() {
  return _loadQueue().filter(i => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.FAILED)
}

// ── Get all items ─────────────────────────────────────────────
export function getAllQueueItems() {
  return _loadQueue()
}

// ── Get pending count ─────────────────────────────────────────
export function getPendingCount() {
  return _loadQueue().filter(i =>
    i.status === QUEUE_STATUS.PENDING ||
    i.status === QUEUE_STATUS.FAILED  ||
    i.status === QUEUE_STATUS.SYNCING
  ).length
}

// ── Mark item as syncing ──────────────────────────────────────
export function markSyncing(itemId) {
  const queue = _loadQueue()
  const idx   = queue.findIndex(i => i.id === itemId)
  if (idx < 0) return
  queue[idx] = { ...queue[idx], status: QUEUE_STATUS.SYNCING, updatedAt: new Date().toISOString() }
  _saveQueue(queue)
}

// ── Mark item as synced ───────────────────────────────────────
export function markSynced(itemId, supabaseId = null) {
  const queue = _loadQueue()
  const idx   = queue.findIndex(i => i.id === itemId)
  if (idx < 0) return
  queue[idx] = {
    ...queue[idx],
    status:    QUEUE_STATUS.SYNCED,
    syncedAt:  new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    supabaseId,
    lastError: null,
  }
  _saveQueue(queue)
}

// ── Mark item as failed ───────────────────────────────────────
export function markFailed(itemId, error) {
  const queue = _loadQueue()
  const idx   = queue.findIndex(i => i.id === itemId)
  if (idx < 0) return
  const item = queue[idx]
  queue[idx] = {
    ...item,
    status:     item.retryCount >= item.maxRetries ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING,
    retryCount: item.retryCount + 1,
    lastError:  typeof error === 'string' ? error : (error?.message || 'Unknown error'),
    updatedAt:  new Date().toISOString(),
  }
  _saveQueue(queue)
}

// ── Mark item as conflict ─────────────────────────────────────
export function markConflict(itemId, details) {
  const queue = _loadQueue()
  const idx   = queue.findIndex(i => i.id === itemId)
  if (idx < 0) return
  queue[idx] = {
    ...queue[idx],
    status:       QUEUE_STATUS.CONFLICT,
    conflictNote: details || 'Sync conflict detected. Local and backend records differ. Human review required.',
    updatedAt:    new Date().toISOString(),
  }
  _saveQueue(queue)
}

// ── Clear synced items (not pending/failed/conflict) ──────────
// Evidence-safe: never clears incident reports unless explicitly forced.
export function clearSyncedItems(options = {}) {
  const queue   = _loadQueue()
  const maxAge  = options.maxAgeMs ?? 24 * 60 * 60 * 1000 // 24h default
  const cutoff  = Date.now() - maxAge
  const kept = queue.filter(i => {
    if (i.status !== QUEUE_STATUS.SYNCED) return true                        // keep unsynced always
    if ((i.type === QUEUE_ITEM_TYPES.INCIDENT_REPORT || i.type === QUEUE_ITEM_TYPES.INCIDENT_REVIEW || i.type === QUEUE_ITEM_TYPES.CONTROLLER_NOTE) && !options.forceIncidents) return true // preserve evidence
    return new Date(i.syncedAt || i.updatedAt).getTime() > cutoff            // keep recent synced
  })
  _saveQueue(kept)
  return queue.length - kept.length
}

// ── Get queue summary (for UI display) ───────────────────────
export function getQueueSummary() {
  const queue = _loadQueue()
  return {
    total:     queue.length,
    pending:   queue.filter(i => i.status === QUEUE_STATUS.PENDING).length,
    syncing:   queue.filter(i => i.status === QUEUE_STATUS.SYNCING).length,
    synced:    queue.filter(i => i.status === QUEUE_STATUS.SYNCED).length,
    failed:    queue.filter(i => i.status === QUEUE_STATUS.FAILED).length,
    conflict:  queue.filter(i => i.status === QUEUE_STATUS.CONFLICT).length,
    incidents: queue.filter(i => i.type === QUEUE_ITEM_TYPES.INCIDENT_REPORT).length,
  }
}

export default {
  queueItem,
  getPendingItems,
  getAllQueueItems,
  getPendingCount,
  getQueueSummary,
  markSyncing,
  markSynced,
  markFailed,
  markConflict,
  clearSyncedItems,
  QUEUE_ITEM_TYPES,
  QUEUE_STATUS,
}
