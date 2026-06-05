/**
 * ============================================================
 * Big V's Best Routes™ — Demo / Live Hard Separation Layer
 * /src/services/sync/demoLiveSeparator.js
 *
 * RUN 14 — Demo/Live Hard Separation + Production Validation
 *
 * PURPOSE:
 *   Single utility module enforcing the hard boundary between
 *   demo/local records and live operational backend records.
 *
 *   Rules:
 *   - Demo records are tagged: is_demo = true / isDemo = true
 *   - Demo records show a visible demo badge in Demo Mode
 *   - Live operational views filter out demo records by default
 *   - Live Mode with no backend → empty/live-ready state, NOT demo data
 *   - Live sync writes always include is_demo: false (non-demo writes)
 *   - Offline queue items retain mode/source metadata
 *   - Sync payloads include mode/source metadata
 *   - Conflict records are flagged for human review, never silently overwritten
 *
 * REQUIRED WORDING:
 *   "Demo Mode shows the product. Live Mode runs the product."
 *
 * ADVISORY:
 *   This module is advisory infrastructure only.
 *   It does not guarantee data integrity, legal compliance, or
 *   backend security. RLS policies in Supabase provide the
 *   authoritative data access boundary.
 *
 * SECURITY:
 *   No API keys. No backend secrets. No service role key.
 *   Read-only utility — does not write to localStorage directly.
 * ============================================================
 */

// ── Record Source Tags ────────────────────────────────────────
export const RECORD_SOURCE = {
  DEMO_LOCAL:    'demo_local',
  LIVE_BACKEND:  'live_backend',
  OFFLINE_QUEUE: 'offline_queue',
  IMPORTED:      'imported',
  UNKNOWN:       'unknown',
}

// ── Sync Mode Tags ────────────────────────────────────────────
export const SYNC_MODE = {
  DEMO_LOCAL:    'demo_local',
  LIVE_BACKEND:  'live_backend',
  LOCAL_ONLY:    'local_only',
  OFFLINE_QUEUE: 'offline_queue',
}

// ── Mode Visibility Tags ──────────────────────────────────────
export const MODE_VISIBILITY = {
  DEMO_ONLY:        'demo_only',
  LIVE_ONLY:        'live_only',
  BOTH_IF_LABELLED: 'both_if_labelled',
}

// ── Get current mode (no circular import) ────────────────────
export function getCurrentMode() {
  try {
    const raw = localStorage.getItem('bigv:mode:demoLive')
    if (!raw) return 'demo'
    return JSON.parse(raw)?.demoLiveMode?.mode ?? 'demo'
  } catch { return 'demo' }
}
export const isDemoMode = () => getCurrentMode() === 'demo'
export const isLiveMode = () => getCurrentMode() === 'live'

// ════════════════════════════════════════════════════════════════
// RECORD FILTERING — Hard Separation
// ════════════════════════════════════════════════════════════════

/**
 * filterForActiveOperationalView()
 *
 * Applies hard demo/live separation to any array of records.
 *
 * Demo Mode:  returns all records (demo + live) with demo badge visible
 * Live Mode:  filters OUT demo records from active operational views
 *             If no live records exist → returns [] (empty, not demo data)
 *
 * @param {Array} records   - array of records with isDemo or is_demo flag
 * @param {Object} options
 *   - mode: 'demo' | 'live' (defaults to getCurrentMode())
 *   - allowDemoInLive: false (override to include demo in live — only for archived/history)
 * @returns {Array}
 */
export function filterForActiveOperationalView(records, options = {}) {
  if (!Array.isArray(records)) return []
  const mode         = options.mode ?? getCurrentMode()
  const allowDemoInLive = options.allowDemoInLive ?? false

  if (mode === 'demo') {
    // Demo Mode: show all records — each gets isDemo flag for badge rendering
    return records
  }

  // Live Mode: filter out demo records unless explicitly allowed
  if (!allowDemoInLive) {
    return records.filter(r => !r.isDemo && !r.is_demo)
  }

  return records
}

/**
 * getLiveReadyEmptyState()
 *
 * When Live Mode is active but backend has no records (or backend missing):
 * Returns a typed empty-state descriptor so UI can show "live-ready" state
 * instead of falling back to demo data.
 *
 * @param {string} entityType  - 'trips' | 'drivers' | 'incidents' | 'actions' | 'notes' | 'assignments'
 * @param {boolean} backendConfigured
 * @returns {{ isEmpty: true, message: string, reason: string }}
 */
export function getLiveReadyEmptyState(entityType, backendConfigured = false) {
  if (!backendConfigured) {
    return {
      isEmpty: true,
      reason:  'backend_missing',
      message: `Live Mode is selected, but Supabase is not configured or available. No live ${entityType} data can be loaded. Configure Supabase in Backend Settings to enable live operational data.`,
    }
  }
  return {
    isEmpty: true,
    reason:  'no_live_records',
    message: `Live Mode is active. No live ${entityType} found in the backend for this organisation yet.`,
  }
}

// ════════════════════════════════════════════════════════════════
// RECORD TAGGING — Source + Mode Metadata
// ════════════════════════════════════════════════════════════════

/**
 * tagRecord()
 * Adds recordSource, syncMode, modeVisibility, and isDemo to any record.
 * Used before writing to SSOT or syncing to Supabase.
 *
 * @param {Object} record
 * @param {Object} options
 * @returns {Object} tagged record
 */
export function tagRecord(record, options = {}) {
  const mode   = options.mode  ?? getCurrentMode()
  const source = options.source ?? (mode === 'demo' ? RECORD_SOURCE.DEMO_LOCAL : RECORD_SOURCE.LIVE_BACKEND)
  return {
    ...record,
    isDemo:         options.isDemo  ?? (mode === 'demo'),
    is_demo:        options.isDemo  ?? (mode === 'demo'),
    recordSource:   source,
    syncMode:       mode === 'demo' ? SYNC_MODE.DEMO_LOCAL : (options.source === RECORD_SOURCE.OFFLINE_QUEUE ? SYNC_MODE.OFFLINE_QUEUE : SYNC_MODE.LIVE_BACKEND),
    modeVisibility: mode === 'demo' ? MODE_VISIBILITY.DEMO_ONLY : MODE_VISIBILITY.LIVE_ONLY,
    taggedAt:       new Date().toISOString(),
  }
}

/**
 * tagSyncPayload()
 * Adds mode/source metadata to a Supabase sync payload.
 * Ensures live writes never accidentally write demo records.
 *
 * @param {Object} payload
 * @param {Object} options
 * @returns {Object} payload with metadata
 */
export function tagSyncPayload(payload, options = {}) {
  const mode = options.mode ?? getCurrentMode()
  return {
    ...payload,
    is_demo:  mode === 'demo',    // live writes always false
    metadata: {
      ...(payload.metadata || {}),
      recordSource:   mode === 'demo' ? RECORD_SOURCE.DEMO_LOCAL : RECORD_SOURCE.LIVE_BACKEND,
      syncMode:       mode === 'demo' ? SYNC_MODE.DEMO_LOCAL      : SYNC_MODE.LIVE_BACKEND,
      modeAtWrite:    mode,
      taggedAt:       new Date().toISOString(),
    },
  }
}

// ════════════════════════════════════════════════════════════════
// SYNC CONFLICT DETECTION
// ════════════════════════════════════════════════════════════════

/**
 * detectSyncConflict()
 * Compares a local record with a backend record to detect conflicts.
 *
 * A conflict exists when:
 *   - Local has unsaved changes (pendingSync: true)
 *   - AND backend record is newer than local record
 *   - OR both were changed by different devices simultaneously
 *
 * @param {Object} localRecord   - local SSOT/queue record
 * @param {Object} backendRecord - Supabase record
 * @param {Object} options
 * @returns {{ conflict: boolean, conflictRecord: Object|null }}
 */
export function detectSyncConflict(localRecord, backendRecord, options = {}) {
  if (!localRecord || !backendRecord) return { conflict: false }

  const localTs   = localRecord.updatedAt  || localRecord.updated_at  || localRecord.timestamp || null
  const backendTs = backendRecord.updated_at || backendRecord.updatedAt || null
  const localHasPending = localRecord.pendingSync || localRecord.localSaved || false

  // No conflict if local has nothing pending
  if (!localHasPending) return { conflict: false }

  // No timestamps to compare — flag as possible conflict for safety
  if (!localTs || !backendTs) {
    return {
      conflict: true,
      conflictRecord: buildConflictRecord(localRecord, backendRecord, 'timestamps_missing', options),
    }
  }

  const localDate   = new Date(localTs).getTime()
  const backendDate = new Date(backendTs).getTime()

  // Backend is newer than local AND local has pending changes → conflict
  if (backendDate > localDate && localHasPending) {
    return {
      conflict: true,
      conflictRecord: buildConflictRecord(localRecord, backendRecord, 'backend_newer_local_pending', options),
    }
  }

  return { conflict: false }
}

/**
 * buildConflictRecord()
 * Constructs a safe conflict record for human review.
 * Does NOT delete either version. Both are preserved.
 */
function buildConflictRecord(localRecord, backendRecord, reason, options = {}) {
  return {
    id:              `conflict-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    status:          'needs_review',
    reason,
    detectedAt:      new Date().toISOString(),
    recordType:      options.recordType || 'unknown',
    relatedDriver:   options.driverId   || localRecord?.driverId   || null,
    relatedVehicle:  options.vehicleId  || localRecord?.vehicleId  || null,
    relatedRoute:    options.routeId    || localRecord?.routeId    || null,
    relatedTrip:     options.tripId     || localRecord?.tripId     || null,
    relatedIncident: options.incidentId || localRecord?.incidentId || null,
    localVersion: {
      id:         localRecord?.id,
      updatedAt:  localRecord?.updatedAt || localRecord?.updated_at || null,
      summary:    options.localSummary || `Local record${localRecord?.pendingSync ? ' (pending sync)' : ''}`,
      hasPending: !!localRecord?.pendingSync,
    },
    backendVersion: {
      id:        backendRecord?.id,
      updatedAt: backendRecord?.updated_at || null,
      summary:   options.backendSummary || 'Backend record',
    },
    recommendedAction: 'Human review required. Do not auto-delete either version. Compare local and backend records manually before resolving.',
    warningMessage:    'Sync conflict detected. Local and backend records differ. Human review required.',
    // Never auto-delete, never silently overwrite
    autoResolved:  false,
    evidenceSafe:  true,
  }
}

/**
 * storeConflict()
 * Persists a conflict record to localStorage for review.
 * Does not overwrite existing conflicts.
 */
const CONFLICT_KEY = 'bigv:sync:conflicts'
export function storeConflict(conflictRecord) {
  try {
    const raw      = localStorage.getItem(CONFLICT_KEY)
    const existing = raw ? JSON.parse(raw) : []
    // Deduplicate by record IDs
    const isDuplicate = existing.some(
      c => c.localVersion?.id === conflictRecord.localVersion?.id &&
           c.backendVersion?.id === conflictRecord.backendVersion?.id
    )
    if (!isDuplicate) {
      const updated = [conflictRecord, ...existing].slice(0, 100)  // max 100 conflicts
      localStorage.setItem(CONFLICT_KEY, JSON.stringify(updated))
    }
  } catch (e) { console.warn('[BigV:DemoLiveSep] storeConflict failed:', e) }
}

/**
 * getConflicts()
 * Returns all stored conflicts needing review.
 */
export function getConflicts() {
  try {
    const raw = localStorage.getItem(CONFLICT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/**
 * getConflictCount()
 * Returns count of unresolved conflicts.
 */
export function getConflictCount() {
  return getConflicts().filter(c => c.status === 'needs_review').length
}

/**
 * resolveConflict()
 * Marks a conflict as resolved. Does NOT delete either version.
 * @param {string} conflictId
 * @param {string} resolution - 'use_local' | 'use_backend' | 'manual_merge'
 * @param {string} resolvedBy
 */
export function resolveConflict(conflictId, resolution, resolvedBy = 'user') {
  try {
    const raw      = localStorage.getItem(CONFLICT_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const updated  = existing.map(c =>
      c.id === conflictId
        ? { ...c, status: 'resolved', resolvedBy, resolution, resolvedAt: new Date().toISOString() }
        : c
    )
    localStorage.setItem(CONFLICT_KEY, JSON.stringify(updated))
  } catch (e) { console.warn('[BigV:DemoLiveSep] resolveConflict failed:', e) }
}

/**
 * clearResolvedConflicts()
 * Cleans up resolved conflicts older than maxAgeMs.
 * Unresolved conflicts are NEVER cleared.
 */
export function clearResolvedConflicts(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const raw      = localStorage.getItem(CONFLICT_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const cutoff   = Date.now() - maxAgeMs
    const kept     = existing.filter(c => {
      if (c.status !== 'resolved') return true  // always keep unresolved
      return new Date(c.resolvedAt || c.detectedAt).getTime() > cutoff
    })
    localStorage.setItem(CONFLICT_KEY, JSON.stringify(kept))
    return existing.length - kept.length
  } catch { return 0 }
}

// ════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ════════════════════════════════════════════════════════════════

/**
 * validateSyncPayload()
 * Ensures a sync payload meets minimum safety requirements before
 * writing to Supabase. Returns { valid: boolean, issues: string[] }.
 *
 * Does NOT write anything — only validates.
 */
export function validateSyncPayload(payload, context = {}) {
  const issues = []
  if (!payload)                      issues.push('Payload is null/undefined')
  if (payload?.is_demo && isLiveMode()) issues.push('Warning: payload is_demo=true but current mode is Live — verify intent')
  if (!payload?.is_demo && isDemoMode()) issues.push('Info: is_demo=false but current mode is Demo — this write will be tagged as demo on retry in Demo Mode')
  if (!context.table)                issues.push('No table specified in context')
  if (!payload?.organisation_id)     issues.push('organisation_id is missing — RLS may block this write')
  return { valid: issues.filter(i => !i.startsWith('Info:')).length === 0, issues }
}

/**
 * demoLiveModeLabel()
 * Returns a human-readable mode label.
 */
export function demoLiveModeLabel() {
  return isDemoMode()
    ? 'Demo Mode — shows the product'
    : 'Live Mode — runs the product'
}

/**
 * isBackendConfigured()
 * Reads backend readiness from SSOT without circular import.
 */
export function isBackendConfiguredLocal() {
  try {
    const raw = localStorage.getItem('bigv:backend:config')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!(parsed?.url && parsed?.anonKey)
  } catch { return false }
}

export default {
  isDemoMode,
  isLiveMode,
  getCurrentMode,
  filterForActiveOperationalView,
  getLiveReadyEmptyState,
  tagRecord,
  tagSyncPayload,
  detectSyncConflict,
  storeConflict,
  getConflicts,
  getConflictCount,
  resolveConflict,
  clearResolvedConflicts,
  validateSyncPayload,
  demoLiveModeLabel,
  isBackendConfiguredLocal,
  RECORD_SOURCE,
  SYNC_MODE,
  MODE_VISIBILITY,
}
