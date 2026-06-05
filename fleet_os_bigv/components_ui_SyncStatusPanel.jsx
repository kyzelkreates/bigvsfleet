/**
 * ============================================================
 * Big V's Best Routes™ — Sync Status Panel (Run 3)
 * /src/components/ui/SyncStatusPanel.jsx
 *
 * RUN 3 — SSOT + Demo/Live Mode Core
 *
 * Reads from: useDemoLiveStore (core_storage.js)
 * ONE store. NO duplicate state. NO backend connections.
 *
 * Shows:
 *   - current sync mode (demo/local vs live backend)
 *   - backend readiness
 *   - last demo/local sync timestamp
 *   - sync error list (if any)
 *   - offline/local fallback state
 *   - API config summary (provider names only — no keys)
 *   - 4P3X AI oversight slots (reserved Run 9)
 *
 * SECURITY:
 *   No API keys. No secrets. No backend credentials.
 *   Provider names only.
 *
 * NOTE: The Dashboard already has an internal SyncStatusPanel
 * that is Supabase-gated (shows only when Supabase is configured).
 * This component is the RUN 3 SSOT-backed equivalent — it always
 * renders based on the demo/live store, not Supabase settings.
 * It does NOT conflict with the existing Dashboard-internal panel.
 * ============================================================
 */

import { useDemoLiveStore } from './core_storage'
import Icon from './components_ui_Icon'

// ─── Sync mode display config ─────────────────────────────────
const SYNC_MODE_CONFIG = {
  demo_local:     { label: 'Demo / Local',      color: 'text-violet-400', dot: 'bg-violet-400',  bg: 'bg-violet-500/5',  border: 'border-violet-500/15' },
  live_backend:   { label: 'Live / Backend',    color: 'text-emerald-400',dot: 'bg-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/15' },
  local_only:     { label: 'Local Only',        color: 'text-slate-400',  dot: 'bg-slate-500',   bg: 'bg-slate-900/40',  border: 'border-slate-800/60'  },
  offline_queue:  { label: 'Offline / Queued',  color: 'text-amber-400',  dot: 'bg-amber-400',   bg: 'bg-amber-500/5',   border: 'border-amber-500/15'  },
}

// ─── API provider display config ─────────────────────────────
const API_PROVIDER_LABELS = {
  osm_public:                                       'OSM Public (no key required)',
  maplibre:                                         'MapLibre GL (Run 5)',
  demo_local:                                       'Demo / Local (Run 5)',
  graphhopper:                                      'GraphHopper (Run 5)',
  none:                                             'Not configured',
  overpass:                                         'Overpass API (Run 5)',
  google_maps_optional_after_concept_verification:  'Google Maps (optional · post concept verify)',
}

// ─── PWA sync readiness display ───────────────────────────────
const PWA_STATUS_CONFIG = {
  demo_local_ready:  { label: 'Demo / Local ready', color: 'text-violet-400', icon: 'CheckCircle' },
  live_backend_ready:{ label: 'Live ready',         color: 'text-emerald-400',icon: 'CheckCircle' },
  not_ready:         { label: 'Not ready',          color: 'text-slate-600',  icon: 'Circle'      },
  error:             { label: 'Error',              color: 'text-red-400',    icon: 'XCircle'     },
}

// ─────────────────────────────────────────────────────────────
// SyncStatusPanel — full system sync status overview
// ─────────────────────────────────────────────────────────────
export function SyncStatusPanel({ compact = false, className = '' }) {
  const syncMode          = useDemoLiveStore(s => s.backendReadiness?.syncMode ?? 'demo_local')
  const backendStatus     = useDemoLiveStore(s => s.backendReadiness?.backendStatus ?? 'not_configured')
  const backendProvider   = useDemoLiveStore(s => s.backendReadiness?.provider ?? 'none')
  const lastDemoSyncAt    = useDemoLiveStore(s => s.syncStatus?.lastDemoSyncAt)
  const lastBackendSyncAt = useDemoLiveStore(s => s.syncStatus?.lastBackendSyncAt)
  const syncErrors        = useDemoLiveStore(s => s.backendReadiness?.syncErrors ?? [])
  const isOffline         = useDemoLiveStore(s => s.offlineStatus?.isOffline ?? false)
  const offlineWarning    = useDemoLiveStore(s => s.offlineStatus?.warning)
  const dashStatus        = useDemoLiveStore(s => s.syncStatus?.dashboard ?? 'demo_local_ready')
  const driverStatus      = useDemoLiveStore(s => s.syncStatus?.driverPwa ?? 'demo_local_ready')
  const controllerStatus  = useDemoLiveStore(s => s.syncStatus?.controllerPwa ?? 'demo_local_ready')
  const systemHealth      = useDemoLiveStore(s => s.systemHealth ?? {})
  const apiConfig         = useDemoLiveStore(s => s.apiConfigSummary ?? {})
  const safetyAI          = useDemoLiveStore(s => s.safetyOversightStatus ?? {})
  const complianceAI      = useDemoLiveStore(s => s.legalComplianceOversightStatus ?? {})

  const syncCfg = SYNC_MODE_CONFIG[syncMode] ?? SYNC_MODE_CONFIG.demo_local

  const formatTs = (ts) => {
    if (!ts) return '—'
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
    catch { return '—' }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${syncCfg.bg} ${syncCfg.border} ${className}`}>
        <span className={`relative flex h-2 w-2`}>
          <span className={`inline-flex rounded-full h-2 w-2 ${syncCfg.dot}`} />
        </span>
        <span className={`text-xs font-semibold ${syncCfg.color}`}>{syncCfg.label}</span>
        <span className="text-2xs text-slate-600 ml-1">
          {lastDemoSyncAt ? `Demo refresh: ${formatTs(lastDemoSyncAt)}` : 'No backend configured'}
        </span>
      </div>
    )
  }

  return (
    <div className={`bg-[#0d1426] border border-slate-800/60 rounded-xl p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Activity" size={14} className="text-slate-500" />
          <span className="text-sm font-semibold text-white">Sync &amp; System Status</span>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold border ${syncCfg.bg} ${syncCfg.border} ${syncCfg.color}`}>
          <span className={`inline-flex rounded-full h-1.5 w-1.5 ${syncCfg.dot}`} />
          {syncCfg.label}
        </span>
      </div>

      {/* Offline warning */}
      {(isOffline || offlineWarning) && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <Icon name="WifiOff" size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-300">
            {offlineWarning ?? 'Device is offline. Operating in local/offline-safe mode.'}
          </p>
        </div>
      )}

      {/* Sync timestamps */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name="Monitor" size={10} className="text-violet-500" />
            <span className="text-2xs text-slate-600 font-medium">Demo / Local sync</span>
          </div>
          <p className="text-xs font-mono text-slate-400">{formatTs(lastDemoSyncAt)}</p>
          <p className="text-2xs text-slate-700 mt-0.5">Local state refresh only</p>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name="Database" size={10} className="text-slate-600" />
            <span className="text-2xs text-slate-600 font-medium">Backend sync</span>
          </div>
          <p className="text-xs font-mono text-slate-600">{formatTs(lastBackendSyncAt)}</p>
          <p className="text-2xs text-slate-700 mt-0.5">
            {backendProvider === 'none' ? 'Not configured · Run 4' : backendStatus}
          </p>
        </div>
      </div>

      {/* PWA sync readiness */}
      <div>
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">PWA Sync Readiness</p>
        <div className="space-y-1.5">
          {[
            { label: 'Fleet Dashboard',       status: dashStatus },
            { label: 'Driver PWA',            status: driverStatus },
            { label: 'Fleet Controller PWA',  status: controllerStatus },
          ].map(({ label, status }) => {
            const cfg = PWA_STATUS_CONFIG[status] ?? PWA_STATUS_CONFIG['not_ready']
            return (
              <div key={label} className="flex items-center justify-between">
                <span className="text-2xs text-slate-500">{label}</span>
                <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                  <Icon name={cfg.icon} size={11} />
                  <span className="text-2xs font-medium">{cfg.label}</span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-2xs text-slate-700 mt-1.5">Full PWA sync · Run 8</p>
      </div>

      {/* System health */}
      <div>
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">System Health</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {[
            { key: 'modeReady',    label: 'Mode',      run: null   },
            { key: 'backendReady', label: 'Backend',   run: 'Run 4'},
            { key: 'apiReady',     label: 'API',       run: 'Run 4'},
            { key: 'mapReady',     label: 'Map',       run: 'Run 5'},
            { key: 'pwaSyncReady', label: 'PWA Sync',  run: 'Run 8'},
          ].map(({ key, label, run }) => {
            const ready = systemHealth[key] ?? false
            return (
              <div key={key} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                <span className={`inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0 ${ready ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                <span className={`text-2xs font-medium ${ready ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
                {!ready && run && <span className="text-2xs text-slate-800 ml-auto font-mono">{run}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* API config summary — provider names only, no keys */}
      <div>
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">API Config Summary</p>
        <div className="space-y-1.5">
          {[
            { label: '2D Map',      value: apiConfig.map2dProvider },
            { label: '3D Map',      value: apiConfig.map3dProvider },
            { label: 'Routing',     value: apiConfig.routingProvider },
            { label: 'Restrictions',value: apiConfig.restrictionProvider },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-2xs text-slate-600">{label}</span>
              <span className="text-2xs font-mono text-slate-500">
                {API_PROVIDER_LABELS[value] ?? value ?? '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-2xs text-slate-700 mt-1.5">
          No API keys stored · 4P3X API Config Guard™ · Run 4
        </p>
      </div>

      {/* 4P3X AI oversight (reserved) */}
      <div>
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">
          4P3X Intelligent AI™ Oversight
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <div className="flex items-center gap-2">
              <Icon name="ShieldCheck" size={11} className="text-slate-700" />
              <span className="text-2xs text-slate-700">Safety Oversight AI</span>
            </div>
            <span className="text-2xs text-slate-800 font-mono">{safetyAI.run ?? 'Run 9'}</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <div className="flex items-center gap-2">
              <Icon name="Scale" size={11} className="text-slate-700" />
              <span className="text-2xs text-slate-700">Legal Compliance AI</span>
            </div>
            <span className="text-2xs text-slate-800 font-mono">{complianceAI.run ?? 'Run 9'}</span>
          </div>
        </div>
        <p className="text-2xs text-slate-800 mt-1.5 text-center">
          Advisory only · Human override required at all times
        </p>
      </div>

      {/* Sync errors */}
      {syncErrors.length > 0 && (
        <div>
          <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">Sync Errors</p>
          <div className="space-y-1">
            {syncErrors.slice(0, 5).map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-2xs text-red-400">
                <Icon name="AlertCircle" size={10} className="flex-shrink-0 mt-0.5" />
                <span>{typeof err === 'string' ? err : JSON.stringify(err)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-2xs text-slate-800 text-center pt-1 border-t border-slate-800/60">
        Big V's Best Routes™ · Safety &amp; Legal Compliance First · Local/offline-safe mode active
      </p>
    </div>
  )
}

export default SyncStatusPanel
