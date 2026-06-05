/**
 * ============================================================
 * Big V's Best Routes™ — Map Status Panel
 * /src/components/ui/MapStatusPanel.jsx
 *
 * RUN 5 — Map Engine Foundation
 *
 * Displays:
 *   - Active map mode (OSM 2D / MapLibre 3D / fallback)
 *   - OSM tile source status
 *   - MapLibre 3D readiness
 *   - 2D/3D toggle (where supported)
 *   - Provider status summary
 *   - OSM advisory warning
 *   - Safety/legal notice
 *   - Route advisory warning
 *   - Attribution confirmation
 *   - Offline/fallback state
 *
 * Reads from:
 *   - mapProviderManager.js (Run 5 SSOT façade)
 *   - useDemoLiveStore (Run 3 SSOT)
 *   - useApiConfigStore (Run 4 SSOT)
 *   All reads are read-only — no writes.
 *
 * Props:
 *   compact       — minimal pill view for overlay use
 *   showAdvisory  — show/hide full advisory text
 *   prefer3d      — controlled 3D preference from parent
 *   onToggle3d    — callback when user toggles 3D mode
 *   activeRoute   — current RouteShape for summary display
 *   className     — additional classes
 *
 * ADMIN ONLY:
 *   Full status panel should not be shown in Driver PWA.
 *   Use compact={true} for PWA overlays.
 * ============================================================
 */

import { useDemoLiveStore, useApiConfigStore } from './core_storage'
import Icon from './components_ui_Icon'
import {
  getMapProviderStatus,
  getMapLibreReadiness,
  MAP_ADVISORY,
  MAP_MODE,
} from './services_maps_mapProviderManager'
import { DEMO_ROUTE } from './services_maps_routeProviderManager'

// ─── Status colour config ─────────────────────────────────────
const STATUS_CFG = {
  demo_ready:      { dot: 'bg-violet-400',  color: 'text-violet-300',  label: 'Demo Ready'   },
  configured:      { dot: 'bg-amber-400',   color: 'text-amber-300',   label: 'Configured'   },
  connected:       { dot: 'bg-emerald-400', color: 'text-emerald-300', label: 'Connected'     },
  not_configured:  { dot: 'bg-slate-600',   color: 'text-slate-500',   label: 'Not Config.'  },
  error:           { dot: 'bg-red-400',     color: 'text-red-300',     label: 'Error'        },
  fallback_active: { dot: 'bg-amber-400',   color: 'text-amber-300',   label: 'Fallback'     },
  unavailable:     { dot: 'bg-slate-700',   color: 'text-slate-600',   label: 'Unavailable'  },
}

// ─── Map mode config ──────────────────────────────────────────
const MODE_CFG = {
  [MAP_MODE.OSM_2D]:           { label: 'OSM 2D',        icon: 'Map',      color: 'text-violet-300', dot: 'bg-violet-400'  },
  [MAP_MODE.MAPLIBRE_3D]:      { label: 'MapLibre 3D',   icon: 'Layers',   color: 'text-cyan-300',   dot: 'bg-cyan-400'    },
  [MAP_MODE.FALLBACK_2D]:      { label: '2D Fallback',   icon: 'Map',      color: 'text-amber-300',  dot: 'bg-amber-400'   },
  [MAP_MODE.OFFLINE_FALLBACK]: { label: 'Offline',       icon: 'WifiOff',  color: 'text-slate-500',  dot: 'bg-slate-600'   },
}

function StatusDot({ status, size = 'h-1.5 w-1.5' }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.not_configured
  return <span className={`inline-flex rounded-full flex-shrink-0 ${size} ${cfg.dot}`} />
}

function StatusText({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.not_configured
  return <span className={`text-2xs font-semibold ${cfg.color}`}>{cfg.label}</span>
}

// ─── Format distance/duration ─────────────────────────────────
function fmtDist(m) {
  if (m == null) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${Math.round(m)} m`
}
function fmtDur(s) {
  if (s == null) return '—'
  const m = Math.floor(s / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m} min`
}

// ─────────────────────────────────────────────────────────────
// MapStatusPanel — Full panel (admin / dashboard use)
// ─────────────────────────────────────────────────────────────
export function MapStatusPanel({
  compact      = false,
  showAdvisory = true,
  prefer3d     = false,
  onToggle3d   = null,
  activeRoute  = null,
  className    = '',
}) {
  const demoMode   = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const isOffline  = useDemoLiveStore(s => s.offlineStatus?.isOffline ?? false)
  const osmStatus  = useApiConfigStore(s => s.osm?.status ?? 'demo_ready')
  const osmTileUrl = useApiConfigStore(s => s.osm?.tileUrl ?? '')
  const mlStatus   = useApiConfigStore(s => s.mapLibre?.status ?? 'not_configured')
  const mlEnabled  = useApiConfigStore(s => s.mapLibre?.enabled ?? false)

  const providerStatus = getMapProviderStatus()
  const mlReadiness    = getMapLibreReadiness()

  // Determine active mode
  const activeMode = isOffline
    ? MAP_MODE.OFFLINE_FALLBACK
    : prefer3d && mlReadiness.available && mlEnabled
      ? MAP_MODE.MAPLIBRE_3D
      : prefer3d
        ? MAP_MODE.FALLBACK_2D
        : MAP_MODE.OSM_2D

  const modeCfg = MODE_CFG[activeMode] ?? MODE_CFG[MAP_MODE.OSM_2D]

  // ── Compact pill ──────────────────────────────────────────
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border bg-slate-900/60 border-slate-700/40 ${modeCfg.color}`}>
          <Icon name={modeCfg.icon} size={10} />
          {modeCfg.label}
        </span>
        <StatusDot status={osmStatus} />
        {demoMode === 'demo' && (
          <span className="text-2xs text-violet-400 font-medium">Demo</span>
        )}
      </div>
    )
  }

  // ── Full panel ────────────────────────────────────────────
  return (
    <div className={`bg-[#0d1426] border border-slate-800/60 rounded-xl p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Activity" size={14} className="text-slate-500" />
          <span className="text-sm font-semibold text-white">Map Engine Status</span>
        </div>
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-2xs font-semibold border bg-slate-900/40 border-slate-800/40 ${modeCfg.color}`}>
          <span className={`inline-flex rounded-full h-1.5 w-1.5 ${modeCfg.dot}`} />
          {modeCfg.label}
        </span>
      </div>

      {/* Mode + 3D toggle row */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <Icon name={modeCfg.icon} size={12} className="text-slate-500" />
          <span className="text-xs text-slate-400">Active map mode</span>
        </div>
        <div className="flex items-center gap-2">
          {onToggle3d && (
            <button
              onClick={onToggle3d}
              disabled={!mlReadiness.available}
              title={mlReadiness.available ? 'Toggle 3D mode' : mlReadiness.fallbackReason}
              className={`text-2xs px-2 py-0.5 rounded-full border transition-colors ${
                prefer3d && mlReadiness.available
                  ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
              }`}
            >
              3D {mlReadiness.available ? (prefer3d ? 'On' : 'Off') : '(Run 5/6)'}
            </button>
          )}
          {demoMode === 'demo' && (
            <span className="text-2xs px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/20 text-violet-300 font-semibold">
              Demo
            </span>
          )}
        </div>
      </div>

      {/* Provider status rows */}
      <div className="space-y-2">
        {/* OSM 2D */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Map" size={11} className="text-slate-600" />
            <span className="text-2xs text-slate-500">OSM / 2D Tiles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status={osmStatus} />
            <StatusText status={osmStatus} />
          </div>
        </div>

        {/* MapLibre 3D */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Layers" size={11} className="text-slate-600" />
            <span className="text-2xs text-slate-500">MapLibre 3D/Tilt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status={mlReadiness.available ? mlStatus : 'not_configured'} />
            <span className="text-2xs text-slate-600">
              {mlReadiness.available ? <StatusText status={mlStatus} /> : 'Not installed · Run 5/6'}
            </span>
          </div>
        </div>

        {/* 2D fallback indicator */}
        {(activeMode === MAP_MODE.FALLBACK_2D || !mlReadiness.available) && prefer3d && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <Icon name="AlertCircle" size={10} className="text-amber-400 flex-shrink-0" />
            <p className="text-2xs text-amber-400/80">2D fallback active — {mlReadiness.fallbackReason}</p>
          </div>
        )}

        {/* Offline state */}
        {isOffline && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <Icon name="WifiOff" size={10} className="text-amber-400 flex-shrink-0" />
            <p className="text-2xs text-amber-400/80">Offline — local/offline-safe map mode active</p>
          </div>
        )}
      </div>

      {/* Active route summary */}
      {activeRoute && (
        <div className="pt-2 border-t border-slate-800/40">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Route" size={11} className="text-slate-500" />
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">Active Route</span>
            {activeRoute.isDemo && (
              <span className="text-2xs px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">Demo</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="px-2 py-1.5 rounded bg-slate-900/40 border border-slate-800/60 text-center">
              <p className="text-2xs text-slate-600">Provider</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{activeRoute.provider || '—'}</p>
            </div>
            <div className="px-2 py-1.5 rounded bg-slate-900/40 border border-slate-800/60 text-center">
              <p className="text-2xs text-slate-600">Distance</p>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{fmtDist(activeRoute.distanceMeters)}</p>
            </div>
            <div className="px-2 py-1.5 rounded bg-slate-900/40 border border-slate-800/60 text-center">
              <p className="text-2xs text-slate-600">Duration</p>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{fmtDur(activeRoute.durationSeconds)}</p>
            </div>
          </div>
          <p className="text-2xs text-amber-400/70 mt-1.5 text-center">
            {activeRoute.isDemo ? 'Demo route — not live routing data.' : MAP_ADVISORY.route}
          </p>
        </div>
      )}

      {/* Attribution */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/40">
        <Icon name="Info" size={10} className="text-slate-700 flex-shrink-0" />
        <p className="text-2xs text-slate-700">
          {providerStatus.osm.attribution} · ODbL licence · Attribution mandatory
        </p>
      </div>

      {/* Advisory warning */}
      {showAdvisory && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-2xs text-slate-500 leading-relaxed">{MAP_ADVISORY.safety}</p>
        </div>
      )}

      {/* OSM public usage notice */}
      <p className="text-2xs text-slate-700 text-center">
        Map data is advisory only · Not legally authoritative · Public map data freshness not guaranteed
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MapAdvisoryBanner — slim banner for map overlays
// ─────────────────────────────────────────────────────────────
export function MapAdvisoryBanner({ isDemo = false, className = '' }) {
  return (
    <div className={`flex items-start gap-2 px-3 py-2 border-b border-amber-500/15 bg-black/80 backdrop-blur-sm ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-2xs text-slate-400 leading-relaxed">
        {isDemo
          ? 'Demo map. Not live data. '
          : ''}
        Map data is advisory only. Displayed routes do not guarantee legal compliance. Drivers, controllers, and fleet managers must verify signage, permits, restrictions, bridge limits, access rules, and road conditions.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MapModePill — ultra-compact mode indicator for map overlays
// ─────────────────────────────────────────────────────────────
export function MapModePill({ activeMode, isDemo, className = '' }) {
  const cfg = MODE_CFG[activeMode] ?? MODE_CFG[MAP_MODE.OSM_2D]
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-slate-700/30 ${className}`}>
      <span className={`inline-flex rounded-full h-1.5 w-1.5 ${cfg.dot}`} />
      <span className={`text-2xs font-semibold ${cfg.color}`}>{cfg.label}</span>
      {isDemo && <span className="text-2xs text-violet-400 ml-1">· Demo</span>}
    </div>
  )
}

export default MapStatusPanel
