/**
 * ============================================================
 * Big V's Best Routes™ — Sync Manager
 * /src/services/sync/syncManager.js
 *
 * RUN 8 — PWA Deployment Centre + One-Button Sync
 *
 * PURPOSE:
 *   Safe, local-first sync manager for dashboard ↔ Driver PWA
 *   ↔ Fleet Controller PWA data flow.
 *
 *   All functions are mode-aware (demo/live), backend-aware,
 *   and offline-safe. No backend secrets. No hardcoded keys.
 *   No fake backend sync claims.
 *
 * SYNC MODES:
 *   demo_local  — updates SSOT only, no backend attempt
 *   live_backend — attempts real backend (if adapter exists)
 *   local_only  — queues items, no backend
 *   offline_queue — offline, items queued for later
 *   backend_missing — live mode, no provider configured
 *   not_implemented — provider configured, no adapter yet
 *
 * SAFETY:
 *   No sync result guarantees legal compliance.
 *   Sync status is advisory only.
 *   Drivers/controllers/fleet remain responsible for all decisions.
 *
 * SECURITY:
 *   No API keys. No backend secrets. No credentials in URLs.
 *   Credentials are handled by 4P3X API Config Guard™ (Run 4).
 * ============================================================
 */

// ─── Sync advisory messages ───────────────────────────────────
export const SYNC_MESSAGES = {
  demoSuccess:      'Demo/local sync complete. No backend sync was attempted.',
  liveMissingBE:    'Live Mode is selected, but no backend provider is configured yet. PWA sync is running in local/offline-safe mode until Supabase, Firebase, AWS/custom backend, or REST backend is configured.',
  backendNotImpl:   'Backend provider is configured, but live sync adapter is not implemented in this build layer.',
  offlineQueued:    'Device appears offline. Sync items have been queued locally for when connection is restored.',
  localOnly:        'Operating in local/offline-safe mode. All updates are saved locally.',
  syncAdvisory:     'Sync status is advisory only. Sync does not guarantee legal compliance or route suitability.',
  noRemoteInstall:  'The dashboard cannot remotely install a PWA onto another user\'s device. It can create, share, and open links. The driver/controller installs the PWA from their own browser/device.',
  profilesAdvisory: 'Profiles generated in this run are local/demo or backend-ready records only. Real account provisioning requires configured live backend/auth.',
}

// ─── PWA URL builder ─────────────────────────────────────────
/**
 * Build a safe PWA URL from current origin + role path.
 * Uses hash routing (#/) — matches app_Router.jsx createHashRouter.
 * No secrets, no tokens, no API keys in URL.
 * @param {'driver'|'controller'} role
 * @returns {string}
 */
export function buildPwaUrl(role) {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const base   = origin || 'http://localhost:5173'
    const paths  = {
      driver:     '/#/driver-app',         // existing Driver PWA route
      controller: '/#/fleet-controller-pwa', // existing Controller PWA route
    }
    return `${base}${paths[role] || paths.driver}`
  } catch {
    return role === 'controller' ? '/#/fleet-controller-pwa' : '/#/driver-app'
  }
}

/**
 * Copy a PWA URL to clipboard.
 * Returns { success: boolean, message: string }
 */
export async function copyPwaLink(url) {
  if (!url) return { success: false, message: 'No URL to copy.' }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return { success: true, message: 'Link copied to clipboard.' }
    }
    // Fallback: execCommand (deprecated but works in older browsers)
    const el = document.createElement('textarea')
    el.value = url
    el.style.position = 'fixed'
    el.style.opacity  = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
      ? { success: true,  message: 'Link copied to clipboard.' }
      : { success: false, message: 'Copy not supported in this browser. Please copy the URL manually.' }
  } catch {
    return { success: false, message: 'Copy failed. Please copy the URL manually.' }
  }
}

/**
 * Open a PWA URL in a new tab.
 * Returns { success: boolean, message: string }
 */
export function openPwaLink(url) {
  if (!url) return { success: false, message: 'No URL to open.' }
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) { win.focus(); return { success: true, message: '' } }
    return { success: false, message: 'Popup was blocked. Please allow popups for this page or copy the URL and open it manually.' }
  } catch {
    return { success: false, message: 'Could not open the URL. Please copy it and paste into your browser.' }
  }
}

// ─── Backend readiness check ─────────────────────────────────
/**
 * Check backend readiness from existing SSOT state.
 * @param {object} backendReadiness — from useDemoLiveStore
 * @param {string} demoLiveMode — 'demo' | 'live'
 * @returns {{ configured: boolean, provider: string, syncMode: string, message: string }}
 */
export function checkBackendReadiness(backendReadiness, demoLiveMode) {
  const provider = backendReadiness?.provider ?? 'none'
  const status   = backendReadiness?.backendStatus ?? 'not_configured'
  const isDemo   = demoLiveMode === 'demo'
  const isLive   = demoLiveMode === 'live'

  if (isDemo) {
    return { configured: false, provider, syncMode: 'demo_local', message: SYNC_MESSAGES.demoSuccess }
  }
  if (isLive && (provider === 'none' || status === 'not_configured')) {
    return { configured: false, provider, syncMode: 'backend_missing', message: SYNC_MESSAGES.liveMissingBE }
  }
  if (isLive && provider !== 'none' && status === 'configured') {
    return { configured: true, provider, syncMode: 'not_implemented', message: SYNC_MESSAGES.backendNotImpl }
  }
  if (isLive && provider !== 'none' && status === 'connected') {
    return { configured: true, provider, syncMode: 'live_backend', message: '' }
  }
  return { configured: false, provider, syncMode: 'local_only', message: SYNC_MESSAGES.localOnly }
}

// ─── Collect PWA state snapshots ─────────────────────────────
/**
 * Collect current Driver PWA state from useDriverPwaStore.
 * Read-only snapshot — no writes to Driver PWA store.
 * @returns {DriverPwaSnapshot}
 */
export function collectDriverPwaState() {
  try {
    // Import lazily to avoid circular dep — read from localStorage SSOT directly
    const raw = localStorage.getItem('bigv:driver:state')
    const state = raw ? JSON.parse(raw) : null
    if (!state) return { available: false, reason: 'No Driver PWA local state found.' }

    return {
      available:            true,
      driverStatus:         state.driverStatus   ?? null,
      gpsStatus:            state.gpsStatus      ?? null,
      preTripChecklist:     state.preTripChecklist ?? null,
      tripStatus:           state.tripStatus      ?? null,
      routeAcknowledgement: state.routeAcknowledgement ?? null,
      complianceAcknowledgement: state.complianceAcknowledgement ?? null,
      incidentReports:      Array.isArray(state.incidentReports) ? state.incidentReports : [],
      driverNotes:          Array.isArray(state.driverNotes)     ? state.driverNotes     : [],
      syncStatus:           state.syncStatus      ?? null,
      pendingCount:         (state.syncStatus?.pendingSync ? 1 : 0),
      snapshotAt:           new Date().toISOString(),
    }
  } catch (e) {
    return { available: false, reason: `Error reading Driver PWA state: ${e.message}` }
  }
}

/**
 * Collect current Fleet Controller PWA state from useControllerStore.
 * Read-only snapshot — no writes to Controller store.
 * @returns {ControllerPwaSnapshot}
 */
export function collectControllerPwaState() {
  try {
    const raw = localStorage.getItem('bigv:controller:state')
    const state = raw ? JSON.parse(raw) : null
    if (!state) return { available: false, reason: 'No Fleet Controller PWA local state found.' }

    return {
      available:         true,
      controllerActions: Array.isArray(state.controllerActions) ? state.controllerActions : [],
      controllerNotes:   Array.isArray(state.controllerNotes)   ? state.controllerNotes   : [],
      reviewedItems:     state.reviewedItems  ?? {},
      flaggedRoutes:     state.flaggedRoutes   ?? {},
      syncStatus:        state.syncStatus      ?? null,
      pendingCount:      (state.syncStatus?.pendingSync ? 1 : 0),
      snapshotAt:        new Date().toISOString(),
    }
  } catch (e) {
    return { available: false, reason: `Error reading Controller PWA state: ${e.message}` }
  }
}

/**
 * Build full dashboard sync payload (all local state, no secrets).
 */
export function collectDashboardSyncPayload() {
  return {
    driverPwa:     collectDriverPwaState(),
    controllerPwa: collectControllerPwaState(),
    collectedAt:   new Date().toISOString(),
  }
}

// ─── Sync functions ───────────────────────────────────────────
/**
 * Sync Driver PWA (demo/local mode only in Run 8).
 * @param {object} opts — { demoLiveMode, backendReadiness, markDriverSynced, updateSyncStatus, refreshDemoSync, queueOfflineItem, setPendingCount }
 * @returns {{ success: boolean, type: string, message: string }}
 */
export async function syncDriverPwa({ demoLiveMode, backendReadiness, markDriverSynced, refreshDemoSync, updateSyncStatus, queueOfflineItem, setPendingCount }) {
  const readiness = checkBackendReadiness(backendReadiness, demoLiveMode)
  const driverState = collectDriverPwaState()
  const pendingCount = driverState.pendingCount ?? 0

  if (readiness.syncMode === 'demo_local') {
    refreshDemoSync?.()
    markDriverSynced?.('demo_local')
    updateSyncStatus?.({ driverPwa: 'demo_local_ready', lastDemoSyncAt: new Date().toISOString() })
    setPendingCount?.('driver', 0)
    return { success: true, type: 'demo_local', message: SYNC_MESSAGES.demoSuccess }
  }

  if (readiness.syncMode === 'backend_missing') {
    // Queue locally, do not fake backend
    if (driverState.available) {
      queueOfflineItem?.({ pwa: 'driver', snapshot: driverState, reason: 'backend_missing', queuedAt: new Date().toISOString() })
    }
    markDriverSynced?.('local_only')
    setPendingCount?.('driver', pendingCount)
    return { success: false, type: 'backend_missing', message: readiness.message }
  }

  if (readiness.syncMode === 'not_implemented') {
    markDriverSynced?.('not_implemented', SYNC_MESSAGES.backendNotImpl)
    return { success: false, type: 'not_implemented', message: SYNC_MESSAGES.backendNotImpl }
  }

  // local_only fallback
  markDriverSynced?.('local_only')
  return { success: true, type: 'local_only', message: SYNC_MESSAGES.localOnly }
}

/**
 * Sync Fleet Controller PWA (demo/local mode only in Run 8).
 */
export async function syncControllerPwa({ demoLiveMode, backendReadiness, markControllerSynced, refreshDemoSync, updateSyncStatus, queueOfflineItem, setPendingCount }) {
  const readiness = checkBackendReadiness(backendReadiness, demoLiveMode)
  const ctrlState = collectControllerPwaState()
  const pendingCount = ctrlState.pendingCount ?? 0

  if (readiness.syncMode === 'demo_local') {
    refreshDemoSync?.()
    markControllerSynced?.('demo_local')
    updateSyncStatus?.({ controllerPwa: 'demo_local_ready', lastDemoSyncAt: new Date().toISOString() })
    setPendingCount?.('controller', 0)
    return { success: true, type: 'demo_local', message: SYNC_MESSAGES.demoSuccess }
  }

  if (readiness.syncMode === 'backend_missing') {
    if (ctrlState.available) {
      queueOfflineItem?.({ pwa: 'controller', snapshot: ctrlState, reason: 'backend_missing', queuedAt: new Date().toISOString() })
    }
    markControllerSynced?.('local_only')
    setPendingCount?.('controller', pendingCount)
    return { success: false, type: 'backend_missing', message: readiness.message }
  }

  if (readiness.syncMode === 'not_implemented') {
    markControllerSynced?.('not_implemented', SYNC_MESSAGES.backendNotImpl)
    return { success: false, type: 'not_implemented', message: SYNC_MESSAGES.backendNotImpl }
  }

  markControllerSynced?.('local_only')
  return { success: true, type: 'local_only', message: SYNC_MESSAGES.localOnly }
}

/**
 * Sync all PWAs (driver + controller).
 */
export async function syncAllPwas(opts) {
  const [driverResult, controllerResult] = await Promise.all([
    syncDriverPwa(opts),
    syncControllerPwa(opts),
  ])

  const success = driverResult.success && controllerResult.success
  const type    = driverResult.type === controllerResult.type ? driverResult.type : 'mixed'
  const message = driverResult.success && controllerResult.success
    ? driverResult.message
    : [!driverResult.success ? `Driver: ${driverResult.message}` : null, !controllerResult.success ? `Controller: ${controllerResult.message}` : null].filter(Boolean).join(' | ')

  opts.markAllSynced?.(type, success ? null : message)
  return { success, type, message, driver: driverResult, controller: controllerResult }
}

// ─── Normalise sync error ─────────────────────────────────────
export function normaliseSyncError(error) {
  if (!error) return null
  const msg = typeof error === 'string' ? error : error.message || 'Unknown sync error.'
  return { message: msg, timestamp: new Date().toISOString() }
}

// ─── Sync status display helpers ─────────────────────────────
export function syncStatusDisplay(syncStatus) {
  return {
    demo_local:      { label: 'Demo/Local',      color: 'text-violet-300', dot: 'bg-violet-400'  },
    synced:          { label: 'Synced',           color: 'text-emerald-300',dot: 'bg-emerald-400 animate-pulse' },
    local_only:      { label: 'Local Only',       color: 'text-slate-400',  dot: 'bg-slate-500'   },
    not_synced:      { label: 'Not Synced',       color: 'text-slate-500',  dot: 'bg-slate-600'   },
    backend_missing: { label: 'Backend Missing',  color: 'text-amber-300',  dot: 'bg-amber-400'   },
    not_implemented: { label: 'Adapter Missing',  color: 'text-amber-400',  dot: 'bg-amber-500'   },
    error:           { label: 'Sync Error',       color: 'text-red-300',    dot: 'bg-red-400'     },
    idle:            { label: 'Idle',             color: 'text-slate-600',  dot: 'bg-slate-700'   },
    pending:         { label: 'Pending',          color: 'text-cyan-300',   dot: 'bg-cyan-400 animate-pulse' },
  }[syncStatus] ?? { label: 'Unknown', color: 'text-slate-600', dot: 'bg-slate-700' }
}

export function syncTypeLabel(type) {
  return {
    demo_local:      'Demo/Local sync',
    local_only:      'Local only (no backend)',
    backend_missing: 'Local — backend missing',
    not_implemented: 'Local — adapter not built yet',
    backend:         'Live backend sync',
    mixed:           'Mixed sync result',
    none:            'Not synced yet',
  }[type] ?? 'Unknown'
}

export default {
  SYNC_MESSAGES,
  buildPwaUrl, copyPwaLink, openPwaLink,
  checkBackendReadiness,
  collectDriverPwaState, collectControllerPwaState, collectDashboardSyncPayload,
  syncDriverPwa, syncControllerPwa, syncAllPwas,
  normaliseSyncError, syncStatusDisplay, syncTypeLabel,
}
