/**
 * ============================================================
 * Big V's Best Routes™ — Driver Live Sync Panel
 * /src/components/ui/DriverLiveSyncPanel.jsx
 *
 * RUN 12 — Real-Time Dashboard ↔ Driver PWA Sync
 *
 * PURPOSE:
 *   Fleet Dashboard widget showing live Driver PWA sync status,
 *   driver statuses, active trips, GPS summary, checklist state,
 *   incidents, and assignment controls (when backend configured).
 *
 * ADVISORY:
 *   "Driver live sync uses Supabase when Live Mode is active and
 *    backend configuration is valid. If backend is missing or
 *    unavailable, updates remain local/offline-safe."
 *
 * SECURITY:
 *   No API keys. No backend secrets. Admin dashboard only.
 *   Controller PWA live sync belongs to Run 13.
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Icon from './components_ui_Icon'
import { useDemoLiveStore, useDriverPwaStore, useBackendConfigStore } from './core_storage'
import {
  isLiveDriverSyncAvailable,
  getDriverLiveSyncStatus,
  fetchDashboardDriverStatuses,
  fetchDashboardActiveTrips,
  fetchDashboardLiveIncidents,
  subscribeDashboardToDriverUpdates,
  LIVE_SYNC_STATUS,
} from './services_sync_driverLiveSyncManager'
import { getQueueSummary } from './services_sync_offlineQueueManager'

const clsx = (...a) => a.filter(Boolean).join(' ')
const tsAgo = (ts) => { if (!ts) return '—'; const m=Math.round((Date.now()-new Date(ts).getTime())/60000); if(m<1) return 'just now'; if(m<60) return `${m}m ago`; const h=Math.round(m/60); return h<24?`${h}h ago`:`${Math.round(h/24)}d ago` }
const tsStale = (ts, thresholdMin = 5) => { if (!ts) return true; return (Date.now() - new Date(ts).getTime()) > thresholdMin * 60000 }

const SYNC_STATUS_DISPLAY = {
  [LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY]:        { label: 'Demo Mode — Local Only',   color: 'text-violet-300',  dot: 'bg-violet-400',  border: 'border-violet-500/20' },
  [LIVE_SYNC_STATUS.BACKEND_MISSING]:        { label: 'Backend Missing',           color: 'text-amber-300',   dot: 'bg-amber-400',   border: 'border-amber-500/20'  },
  [LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR]: { label: 'Schema / Policy Error',     color: 'text-red-300',     dot: 'bg-red-400',     border: 'border-red-500/20'    },
  [LIVE_SYNC_STATUS.OFFLINE_QUEUE]:          { label: 'Offline — Queue Active',    color: 'text-amber-300',   dot: 'bg-amber-400',   border: 'border-amber-500/20'  },
  [LIVE_SYNC_STATUS.POLLING_FALLBACK]:       { label: 'Polling Fallback',          color: 'text-cyan-300',    dot: 'bg-cyan-400 animate-pulse',    border: 'border-cyan-500/20'   },
  [LIVE_SYNC_STATUS.REALTIME_CONNECTED]:     { label: 'Realtime Connected',        color: 'text-emerald-300', dot: 'bg-emerald-400 animate-pulse', border: 'border-emerald-500/20'},
  [LIVE_SYNC_STATUS.CONNECTED]:              { label: 'Connected',                 color: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-500/20'},
  [LIVE_SYNC_STATUS.ERROR]:                  { label: 'Sync Error',                color: 'text-red-300',     dot: 'bg-red-400',     border: 'border-red-500/20'    },
  [LIVE_SYNC_STATUS.NOT_CONFIGURED]:         { label: 'Not Configured',            color: 'text-slate-500',   dot: 'bg-slate-600',   border: 'border-slate-800/40'  },
}

function SyncStatusPill({ status }) {
  const d = SYNC_STATUS_DISPLAY[status] || SYNC_STATUS_DISPLAY[LIVE_SYNC_STATUS.NOT_CONFIGURED]
  return (
    <span className={clsx('flex items-center gap-1.5 text-xs font-semibold', d.color)}>
      <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', d.dot)} />
      {d.label}
    </span>
  )
}

function StatTile({ label, value, sub, accent = false, warn = false }) {
  return (
    <div className={clsx('px-3 py-2.5 rounded-xl border text-center',
      warn   ? 'border-amber-500/20 bg-amber-500/5' :
      accent ? 'border-emerald-500/20 bg-emerald-500/5' :
               'border-slate-800/40 bg-slate-900/20')}>
      <p className={clsx('text-lg font-bold', warn ? 'text-amber-300' : accent ? 'text-emerald-300' : 'text-white')}>{value ?? '—'}</p>
      <p className="text-2xs text-slate-600">{label}</p>
      {sub && <p className="text-2xs text-slate-700 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DriverLiveSyncPanel() {
  const [open,        setOpen]        = useState(false)
  const [syncStatus,  setSyncStatus]  = useState(() => getDriverLiveSyncStatus())
  const [driverRows,  setDriverRows]  = useState([])
  const [activeTrips, setActiveTrips] = useState([])
  const [incidents,   setIncidents]   = useState([])
  const [lastRead,    setLastRead]    = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [queueSum,    setQueueSum]    = useState(() => getQueueSummary())
  const unsubRef = useRef(null)

  const demoLiveMode  = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const bcConfig      = useBackendConfigStore()
  const localDriverSt = useDriverPwaStore(s => s.driverStatus)
  const localTrip     = useDriverPwaStore(s => s.tripStatus)
  const localIncidents = useDriverPwaStore(s => s.incidentReports || [])

  const isDemo  = demoLiveMode === 'demo'
  const isLive  = !isDemo
  const orgId   = null // real org ID comes from Supabase auth — null for demo/unauth

  // Refresh queue summary
  const refreshQueue = useCallback(() => setQueueSum(getQueueSummary()), [])

  // Load live data
  const loadLiveData = useCallback(async () => {
    if (!isLive || !isLiveDriverSyncAvailable() || !orgId) {
      setSyncStatus(isDemo ? LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY : LIVE_SYNC_STATUS.BACKEND_MISSING)
      setDriverRows([])
      setActiveTrips([])
      setIncidents([])
      refreshQueue()
      return
    }
    setLoading(true); setError(null)
    try {
      const [ds, at, inc] = await Promise.all([
        fetchDashboardDriverStatuses(orgId),
        fetchDashboardActiveTrips(orgId),
        fetchDashboardLiveIncidents(orgId, 10),
      ])
      if (ds.error?.isRLS)    setSyncStatus(LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR)
      else if (ds.error)      setSyncStatus(LIVE_SYNC_STATUS.ERROR)
      else                    setSyncStatus(LIVE_SYNC_STATUS.CONNECTED)
      setDriverRows(ds.data || [])
      setActiveTrips(at.data || [])
      setIncidents(inc.data || [])
      setLastRead(ds.readAt || new Date().toISOString())
      setError(ds.error?.message || at.error?.message || null)
    } catch (e) { setError(e.message); setSyncStatus(LIVE_SYNC_STATUS.ERROR) }
    setLoading(false)
    refreshQueue()
  }, [isDemo, isLive, orgId])

  // Subscribe to realtime when panel opens in Live Mode
  useEffect(() => {
    if (!open) { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null } return }
    loadLiveData()
    if (isLive && isLiveDriverSyncAvailable() && orgId) {
      const unsub = subscribeDashboardToDriverUpdates(orgId, ({ status }) => {
        setSyncStatus(status)
        loadLiveData()
      })
      unsubRef.current = unsub
    }
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null } }
  }, [open, isLive])

  // Refresh queue every 10s
  useEffect(() => {
    const id = setInterval(refreshQueue, 10000)
    return () => clearInterval(id)
  }, [])

  const sd = SYNC_STATUS_DISPLAY[syncStatus] || SYNC_STATUS_DISPLAY[LIVE_SYNC_STATUS.NOT_CONFIGURED]

  return (
    <div className="bg-[#0d1426] border border-slate-800/60 rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Truck" size={13} className="text-emerald-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Driver Live Sync</p>
          <p className="text-2xs text-slate-600">
            Run 12 · {isDemo ? 'Demo Mode — local data' : 'Live Mode'} · Advisory only
            {queueSum.pending > 0 && <span className="text-amber-400 ml-2">· {queueSum.pending} pending</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatusPill status={syncStatus} />
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-slate-600" />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-800/40 space-y-4">
          {/* Sync advisory */}
          <div className="mt-3 px-3 py-2 rounded-xl border border-slate-800/40 bg-slate-900/20">
            <p className="text-2xs text-slate-600 leading-relaxed">
              Driver live sync uses Supabase when Live Mode is active and backend configuration is valid. If backend is missing or unavailable, updates remain local/offline-safe.
            </p>
          </div>

          {/* Demo Mode notice */}
          {isDemo && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-violet-500/15 bg-violet-500/5">
              <Icon name="Eye" size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-violet-300">Demo Mode — Local data only</p>
                <p className="text-2xs text-slate-500 mt-0.5">Showing local Driver PWA state. Switch to Live Mode and configure Supabase for real-time sync.</p>
              </div>
            </div>
          )}

          {/* Backend missing */}
          {isLive && !isLiveDriverSyncAvailable() && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5">
              <Icon name="AlertTriangle" size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Live Mode is selected, but Supabase is not configured or available. Driver PWA updates are being saved locally/offline-safe until live backend sync is available.
              </p>
            </div>
          )}

          {/* RLS/schema error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5">
              <Icon name="XCircle" size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-300 font-semibold">Sync Error</p>
                <p className="text-2xs text-slate-500 mt-0.5">{error}</p>
                {syncStatus === LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR && (
                  <p className="text-2xs text-amber-300 mt-1">RLS policy blocked the request. Check Supabase policies for driver_statuses, active_trips, and incident_reports.</p>
                )}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile label="Active Drivers"   value={isDemo ? localTrip.status !== 'not_started' ? '1' : '0' : driverRows.length} accent={driverRows.length > 0 || (isDemo && localTrip.status !== 'not_started')} />
            <StatTile label="Active Trips"     value={isDemo ? localTrip.status !== 'not_started' && localTrip.status !== 'completed' ? '1' : '0' : activeTrips.length} />
            <StatTile label="Live Incidents"   value={isDemo ? localIncidents.length : incidents.length} warn={isDemo ? localIncidents.length > 0 : incidents.length > 0} />
            <StatTile label="Pending Queue"    value={queueSum.pending} warn={queueSum.pending > 0} sub={queueSum.failed > 0 ? `${queueSum.failed} failed` : null} />
          </div>

          {/* Demo local state */}
          {isDemo && (
            <div className="space-y-2">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Local Driver PWA State (Demo)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Driver Status', localDriverSt.status || '—'],
                  ['Trip Status',   localTrip.status     || '—'],
                  ['Last Seen',     tsAgo(localDriverSt.lastSeenAt)],
                  ['Incidents',     `${localIncidents.length}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800/30 bg-slate-900/20">
                    <span className="text-2xs text-slate-600">{l}</span>
                    <span className="text-2xs text-slate-300 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live driver rows */}
          {isLive && driverRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Live Driver Statuses</p>
              {driverRows.slice(0, 5).map(dr => (
                <div key={dr.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/20">
                  <Icon name="User" size={12} className="text-slate-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-semibold truncate">{dr.drivers?.full_name || dr.driver_id || 'Unknown driver'}</p>
                    <p className="text-2xs text-slate-600">{dr.status} · {tsAgo(dr.last_seen_at)}</p>
                  </div>
                  {tsStale(dr.last_seen_at, 10) && (
                    <span className="text-2xs text-amber-400 flex-shrink-0">Stale</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active trips */}
          {isLive && activeTrips.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Active Trips</p>
              {activeTrips.slice(0, 3).map(trip => (
                <div key={trip.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
                  <Icon name="Navigation" size={12} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{trip.fleet_routes?.name || 'Route'} → {trip.fleet_routes?.destination_label || '—'}</p>
                    <p className="text-2xs text-slate-600">{trip.drivers?.full_name} · {trip.vehicles?.reg} · {trip.status}</p>
                  </div>
                  <span className="text-2xs text-slate-600 flex-shrink-0">{tsAgo(trip.started_at)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Live incidents */}
          {isLive && incidents.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-amber-400 uppercase tracking-wider font-semibold">Recent Incidents</p>
              {incidents.slice(0, 3).map(inc => (
                <div key={inc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5">
                  <Icon name="AlertTriangle" size={12} className="text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{inc.title || inc.incident_type}</p>
                    <p className="text-2xs text-slate-600">{inc.severity} · {inc.drivers?.full_name} · {tsAgo(inc.incident_at)}</p>
                  </div>
                  {!inc.reviewed && <span className="text-2xs text-amber-400 flex-shrink-0">Unreviewed</span>}
                </div>
              ))}
            </div>
          )}

          {/* Queue details */}
          {queueSum.total > 0 && (
            <div className="space-y-1">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Offline Queue</p>
              <div className="grid grid-cols-3 gap-2">
                {[['Pending', queueSum.pending, 'text-amber-300'], ['Synced', queueSum.synced, 'text-emerald-300'], ['Failed', queueSum.failed, 'text-red-300']].map(([l, v, c]) => (
                  <div key={l} className="px-2 py-1.5 rounded-lg border border-slate-800/30 bg-slate-900/20 text-center">
                    <p className={clsx('text-sm font-bold', c)}>{v}</p>
                    <p className="text-2xs text-slate-700">{l}</p>
                  </div>
                ))}
              </div>
              {queueSum.incidents > 0 && (
                <p className="text-2xs text-amber-300">⚠ {queueSum.incidents} incident report(s) preserved in queue — evidence not lost.</p>
              )}
            </div>
          )}

          {/* Last read + refresh */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-2xs text-slate-700">{lastRead ? `Last read: ${tsAgo(lastRead)}` : 'Not yet read from backend'}</p>
            <button onClick={loadLiveData} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/40 text-2xs text-slate-400 hover:text-white transition-colors">
              <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Run 13 notice */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-800/30 bg-slate-900/20">
            <Icon name="Clock" size={11} className="text-slate-700 flex-shrink-0 mt-0.5" />
            <p className="text-2xs text-slate-700">Fleet Controller live sync is completed in Run 13.</p>
          </div>

          <p className="text-2xs text-slate-800 text-center">Driver live sync · Advisory only · Human verification required</p>
        </div>
      )}
    </div>
  )
}
