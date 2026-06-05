/**
 * ============================================================
 * Big V's Best Routes™ — Route Provider Result Card
 * /src/components/ui/RouteProviderResultCard.jsx
 *
 * COMBINED RUN 15–16 — Advisory provider result display
 *
 * Displays Overpass restriction result AND GraphHopper route result
 * as advisory-only cards. Used in Route Planner and compliance panels.
 *
 * ADVISORY: All provider outputs are advisory only.
 * SECURITY: No API keys, no secrets shown.
 * ============================================================
 */

import React, { useState } from 'react'
import Icon from './components_ui_Icon'
import { OVERPASS_STATUS } from './services_routing_overpassAdapter'
import { GH_STATUS }       from './services_routing_graphhopperRouteAdapter'

const clsx = (...a) => a.filter(Boolean).join(' ')

const fmt = {
  dist: (m) => m ? (m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`) : '—',
  dur:  (ms) => { if (!ms) return '—'; const m=Math.round(ms/60000); return m<60?`${m} min`:`${Math.floor(m/60)}h ${m%60}m` },
  conf: (s) => s ? `${Math.round(s)}%` : '—',
}

const STATUS_COLOR = {
  [OVERPASS_STATUS.DATA_RETURNED]:   'text-emerald-400',
  [OVERPASS_STATUS.NO_DATA]:         'text-amber-400',
  [OVERPASS_STATUS.TIMEOUT]:         'text-red-400',
  [OVERPASS_STATUS.RATE_LIMITED]:    'text-red-400',
  [OVERPASS_STATUS.CORS_ERROR]:      'text-red-400',
  [OVERPASS_STATUS.NETWORK_ERROR]:   'text-red-400',
  [OVERPASS_STATUS.FALLBACK_ACTIVE]: 'text-amber-400',
  [OVERPASS_STATUS.DEMO_RESULT]:     'text-violet-400',
  [OVERPASS_STATUS.NOT_CONFIGURED]:  'text-slate-500',
  [OVERPASS_STATUS.ENDPOINT_INVALID]:'text-red-400',
  [GH_STATUS.ROUTE_FOUND]:           'text-emerald-400',
  [GH_STATUS.NO_KEY]:                'text-amber-400',
  [GH_STATUS.INVALID_KEY]:           'text-red-400',
  [GH_STATUS.RATE_LIMITED]:          'text-red-400',
  [GH_STATUS.NO_ROUTE]:              'text-amber-400',
  [GH_STATUS.PROFILE_ERROR]:         'text-amber-400',
  [GH_STATUS.FALLBACK_ACTIVE]:       'text-amber-400',
  [GH_STATUS.DEMO_RESULT]:           'text-violet-400',
  [GH_STATUS.NETWORK_ERROR]:         'text-red-400',
  [GH_STATUS.CORS_ERROR]:            'text-red-400',
  [GH_STATUS.NOT_CONFIGURED]:        'text-slate-500',
}

const CONCERN_COLOR = { high: 'text-red-300 border-red-500/20 bg-red-500/5', medium: 'text-amber-300 border-amber-500/20 bg-amber-500/5', low: 'text-cyan-300 border-cyan-500/20 bg-cyan-500/5', none: 'text-slate-500 border-slate-800/30 bg-slate-900/10' }

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center px-2.5 py-2 rounded-lg border border-slate-800/40 bg-slate-900/20 min-w-0">
      <span className={clsx('text-sm font-bold font-mono', color || 'text-white')}>{value}</span>
      <span className="text-2xs text-slate-600 mt-0.5">{label}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// OVERPASS RESTRICTION RESULT CARD
// ════════════════════════════════════════════════════════════════

export function OverpassResultCard({ result, onClose }) {
  const [expanded, setExpanded] = useState(false)
  if (!result) return null

  const status       = result.providerStatus || OVERPASS_STATUS.NOT_CONFIGURED
  const concerns     = result.restrictionConcerns || []
  const tags         = result.parsedTags || {}
  const hasConcerns  = concerns.length > 0
  const isDemo       = result.isDemo || result.is_demo
  const concernLevel = hasConcerns ? (concerns.some(c => ['hgv','access'].includes(c.tag) && ['no','private'].includes(c.value)) ? 'high' : 'medium') : (status === OVERPASS_STATUS.DATA_RETURNED ? 'low' : 'none')
  const cc           = CONCERN_COLOR[concernLevel]

  return (
    <div className={clsx('rounded-xl border p-3 space-y-2', cc)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="MapPin" size={12} className="text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-bold text-white">Overpass Restriction Scan</span>
          {isDemo && <span className="px-1.5 py-0.5 text-2xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded">DEMO</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('text-2xs font-semibold uppercase tracking-wider', STATUS_COLOR[status] || 'text-slate-500')}>{status?.replace(/_/g,' ')}</span>
          <button onClick={() => setExpanded(v=>!v)} className="text-slate-600 hover:text-slate-400 p-0.5">
            <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={12} />
          </button>
          {onClose && <button onClick={onClose} className="text-slate-700 hover:text-slate-400 p-0.5"><Icon name="X" size={11} /></button>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5">
        <StatPill label="Restrictions" value={result.restrictionsFound ?? 0}    color={hasConcerns ? 'text-amber-300' : 'text-emerald-300'} />
        <StatPill label="Confidence"  value={fmt.conf(result.confidenceScore)} color="text-slate-300" />
        <StatPill label="Concerns"    value={concerns.length}                  color={hasConcerns ? 'text-red-300' : 'text-slate-400'} />
      </div>

      {/* No-data warning */}
      {result.noDataWarning && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <Icon name="AlertTriangle" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-300 leading-relaxed">{result.noDataWarning}</p>
        </div>
      )}

      {/* Concerns */}
      {hasConcerns && (
        <div className="space-y-1">
          {concerns.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5">
              <Icon name="AlertCircle" size={10} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-amber-300 leading-relaxed">{c.concern}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-slate-800/30">
          {Object.keys(tags).length > 0 && (
            <div>
              <p className="text-2xs text-slate-600 uppercase tracking-wider mb-1">Tags Found</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(tags).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 text-2xs bg-slate-900/40 border border-slate-800/40 rounded font-mono text-slate-400">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.dataFreshnessWarning && (
            <p className="text-2xs text-slate-600">{result.dataFreshnessWarning}</p>
          )}
          <p className="text-2xs text-slate-700 leading-relaxed">{result.advisory}</p>
        </div>
      )}

      {/* Advisory footer — always visible */}
      <div className="px-2 py-1.5 rounded-lg border border-slate-800/30 bg-slate-900/10">
        <p className="text-2xs text-slate-700 leading-relaxed">
          Advisory only — human verification required. Verify current signage, bridge limits, permits, and restrictions.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// GRAPHHOPPER ROUTE RESULT CARD
// ════════════════════════════════════════════════════════════════

export function GraphHopperResultCard({ result, onClose, onUseRoute }) {
  const [showInstructions, setShowInstructions] = useState(false)
  const [showAlts,         setShowAlts]         = useState(false)
  if (!result) return null

  const status      = result.providerStatus || GH_STATUS.NOT_CONFIGURED
  const isDemo      = result.isDemo || result.is_demo
  const isFallback  = result.fallbackUsed
  const hasRoute    = [GH_STATUS.ROUTE_FOUND, GH_STATUS.DEMO_RESULT].includes(status) || result.coordinates?.length > 0
  const instructions = result.instructions || []
  const alts         = result.alternatives || []

  return (
    <div className="rounded-xl border border-slate-800/40 bg-[#0a1020] p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Route" size={12} className="text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-bold text-white">GraphHopper Route</span>
          {isDemo     && <span className="px-1.5 py-0.5 text-2xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded">DEMO</span>}
          {isFallback && <span className="px-1.5 py-0.5 text-2xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded">FALLBACK</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('text-2xs font-semibold uppercase tracking-wider', STATUS_COLOR[status] || 'text-slate-500')}>{status?.replace(/_/g,' ')}</span>
          {onClose && <button onClick={onClose} className="text-slate-700 hover:text-slate-400 p-0.5"><Icon name="X" size={11} /></button>}
        </div>
      </div>

      {/* Missing key */}
      {[GH_STATUS.NO_KEY, GH_STATUS.INVALID_KEY].includes(status) && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <Icon name="Key" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-300 leading-relaxed">{result.fallbackReason || 'GraphHopper API key not configured. Add key in API Settings Centre.'} Demo/local route shown as fallback.</p>
        </div>
      )}

      {/* Profile error */}
      {status === GH_STATUS.PROFILE_ERROR && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg border border-red-500/15 bg-red-500/5">
          <Icon name="AlertCircle" size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-red-300 leading-relaxed">{result.error || 'Routing profile not supported.'}</p>
        </div>
      )}

      {/* HGV warning */}
      {result.hgvWarning && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <Icon name="Truck" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-300 leading-relaxed">{result.hgvWarning}</p>
        </div>
      )}

      {/* Route stats */}
      {hasRoute && (
        <div className="grid grid-cols-3 gap-1.5">
          <StatPill label="Distance"   value={fmt.dist(result.distanceMeters)} color="text-white" />
          <StatPill label="Duration"   value={fmt.dur(result.durationMs)}      color="text-white" />
          <StatPill label="Confidence" value={fmt.conf(result.confidenceScore)}color="text-slate-300" />
        </div>
      )}

      {/* Profile */}
      {result.profile && (
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-slate-800/30 bg-slate-900/20">
          <span className="text-2xs text-slate-600">Profile</span>
          <span className="text-2xs font-mono text-slate-300">{result.profile}</span>
        </div>
      )}

      {/* Alternatives */}
      {alts.length > 0 && (
        <div>
          <button onClick={() => setShowAlts(v=>!v)}
            className="flex items-center gap-1.5 text-2xs text-cyan-400 hover:text-cyan-300 transition-colors">
            <Icon name="GitBranch" size={10} />
            {alts.length} alternative{alts.length > 1 ? 's' : ''} available
            <Icon name={showAlts ? 'ChevronUp' : 'ChevronDown'} size={10} />
          </button>
          {showAlts && (
            <div className="mt-1 space-y-1">
              {alts.map(alt => (
                <div key={alt.index} className="flex items-center gap-3 px-2 py-1.5 rounded-lg border border-slate-800/30 bg-slate-900/10">
                  <span className="text-2xs text-slate-600">Alt {alt.index}</span>
                  <span className="text-2xs text-slate-400">{fmt.dist(alt.distanceMeters)}</span>
                  <span className="text-2xs text-slate-500">{fmt.dur(alt.durationMs)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {instructions.length > 0 && (
        <div>
          <button onClick={() => setShowInstructions(v=>!v)}
            className="flex items-center gap-1.5 text-2xs text-slate-400 hover:text-slate-300 transition-colors">
            <Icon name="List" size={10} />
            {instructions.length} turn-by-turn instructions
            <Icon name={showInstructions ? 'ChevronUp' : 'ChevronDown'} size={10} />
          </button>
          {showInstructions && (
            <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5">
              {instructions.slice(0, 10).map((ins, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded border border-slate-800/20 bg-slate-900/10">
                  <span className="text-2xs text-slate-700 w-4 flex-shrink-0">{i+1}.</span>
                  <span className="text-2xs text-slate-400 leading-relaxed flex-1">{ins.text}</span>
                  <span className="text-2xs text-slate-700 flex-shrink-0">{fmt.dist(ins.distanceM)}</span>
                </div>
              ))}
              {instructions.length > 10 && <p className="text-2xs text-slate-700 px-2">+{instructions.length-10} more…</p>}
            </div>
          )}
        </div>
      )}

      {/* No instructions empty state */}
      {hasRoute && !instructions.length && (
        <p className="text-2xs text-slate-600 italic">Turn-by-turn instructions not available for this route. Follow the route overview and verify road signs, restrictions, and route suitability manually.</p>
      )}

      {/* Use Route CTA */}
      {onUseRoute && hasRoute && (
        <button onClick={() => onUseRoute(result)}
          className="w-full py-1.5 text-2xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/15 transition-colors flex items-center justify-center gap-1.5 font-semibold">
          <Icon name="Check" size={10} /> Use This Route
        </button>
      )}

      {/* Advisory footer */}
      <div className="px-2 py-1.5 rounded-lg border border-slate-800/30 bg-slate-900/10">
        <p className="text-2xs text-slate-700 leading-relaxed">{result.advisory}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// COMBINED PROVIDER STATUS STRIP
// ════════════════════════════════════════════════════════════════

export function ProviderStatusStrip({ ghResult, overpassResult, ghConfigured, overpassConfigured }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* GH status */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-800/30 bg-slate-900/20">
        <span className={clsx('inline-flex rounded-full h-1.5 w-1.5',
          ghResult?.providerStatus === GH_STATUS.ROUTE_FOUND ? 'bg-emerald-500' :
          ghResult?.providerStatus === GH_STATUS.DEMO_RESULT ? 'bg-violet-500' :
          ghConfigured ? 'bg-amber-500' : 'bg-slate-700')} />
        <span className="text-2xs text-slate-500 font-semibold">GH</span>
        <span className={clsx('text-2xs', STATUS_COLOR[ghResult?.providerStatus] || 'text-slate-600')}>
          {ghResult?.providerStatus?.replace(/_/g,' ') || (ghConfigured ? 'configured' : 'no key')}
        </span>
      </div>

      {/* Overpass status */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-800/30 bg-slate-900/20">
        <span className={clsx('inline-flex rounded-full h-1.5 w-1.5',
          overpassResult?.providerStatus === OVERPASS_STATUS.DATA_RETURNED ? 'bg-emerald-500' :
          overpassResult?.providerStatus === OVERPASS_STATUS.DEMO_RESULT   ? 'bg-violet-500' :
          overpassConfigured ? 'bg-amber-500' : 'bg-slate-700')} />
        <span className="text-2xs text-slate-500 font-semibold">Overpass</span>
        <span className={clsx('text-2xs', STATUS_COLOR[overpassResult?.providerStatus] || 'text-slate-600')}>
          {overpassResult?.providerStatus?.replace(/_/g,' ') || (overpassConfigured ? 'configured' : 'not configured')}
        </span>
      </div>

      <p className="text-2xs text-slate-700 ml-auto">Advisory only — human verification required</p>
    </div>
  )
}

export default { OverpassResultCard, GraphHopperResultCard, ProviderStatusStrip }
