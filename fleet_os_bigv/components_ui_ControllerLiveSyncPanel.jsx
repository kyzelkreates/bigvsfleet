/**
 * ============================================================
 * Big V's Best Routes™ — Controller Live Sync Panel
 * /src/components/ui/ControllerLiveSyncPanel.jsx
 *
 * RUN 13 — Real-Time Dashboard ↔ Fleet Controller PWA Sync
 *
 * PURPOSE:
 *   Fleet Dashboard collapsible widget showing live Controller PWA
 *   sync status, controller actions/notes, incident reviews,
 *   route review flags, check-in requests, and compliance reviews.
 *
 * ADVISORY:
 *   "Fleet Controller live sync uses Supabase when Live Mode is
 *    active and backend configuration is valid. If backend is
 *    missing or unavailable, updates remain local/offline-safe."
 *
 * SECURITY:
 *   Admin dashboard only. No credentials exposed.
 * ============================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Icon from './components_ui_Icon'
import { useDemoLiveStore, useControllerStore, useBackendConfigStore } from './core_storage'
import {
  getControllerLiveSyncStatus,
  isLiveControllerSyncAvailable,
  fetchDashboardControllerActions,
  fetchControllerLiveTrips,
  fetchControllerIncidentReviews,
  subscribeControllerToLiveUpdates,
  LIVE_SYNC_STATUS,
} from './services_sync_controllerSyncManager'
import { getQueueSummary } from './services_sync_offlineQueueManager'

const clsx = (...a) => a.filter(Boolean).join(' ')
const tsAgo = (ts) => { if (!ts) return '—'; const m=Math.round((Date.now()-new Date(ts).getTime())/60000); if(m<1) return 'just now'; if(m<60) return `${m}m ago`; const h=Math.round(m/60); return h<24?`${h}h ago`:`${Math.round(h/24)}d ago` }
const tsStale = (ts, thresholdMin = 10) => { if (!ts) return true; return (Date.now()-new Date(ts).getTime()) > thresholdMin*60000 }

const SYNC_DISPLAY = {
  [LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY]:        { label:'Demo — Local Only',    color:'text-violet-300',  dot:'bg-violet-400',  border:'border-violet-500/20' },
  [LIVE_SYNC_STATUS.BACKEND_MISSING]:        { label:'Backend Missing',       color:'text-amber-300',   dot:'bg-amber-400',   border:'border-amber-500/20'  },
  [LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR]: { label:'Schema / Policy Error', color:'text-red-300',     dot:'bg-red-400',     border:'border-red-500/20'    },
  [LIVE_SYNC_STATUS.OFFLINE_QUEUE]:          { label:'Offline Queue',         color:'text-amber-300',   dot:'bg-amber-400',   border:'border-amber-500/20'  },
  [LIVE_SYNC_STATUS.POLLING_FALLBACK]:       { label:'Polling Fallback',      color:'text-cyan-300',    dot:'bg-cyan-400 animate-pulse',    border:'border-cyan-500/20'   },
  [LIVE_SYNC_STATUS.REALTIME_CONNECTED]:     { label:'Realtime Connected',    color:'text-emerald-300', dot:'bg-emerald-400 animate-pulse', border:'border-emerald-500/20'},
  [LIVE_SYNC_STATUS.CONNECTED]:              { label:'Connected',             color:'text-emerald-300', dot:'bg-emerald-400', border:'border-emerald-500/20'},
  [LIVE_SYNC_STATUS.ERROR]:                  { label:'Sync Error',            color:'text-red-300',     dot:'bg-red-400',     border:'border-red-500/20'    },
  [LIVE_SYNC_STATUS.NOT_CONFIGURED]:         { label:'Not Configured',        color:'text-slate-500',   dot:'bg-slate-600',   border:'border-slate-800/40'  },
}

function SyncPill({ status }) {
  const d = SYNC_DISPLAY[status] || SYNC_DISPLAY[LIVE_SYNC_STATUS.NOT_CONFIGURED]
  return (
    <span className={clsx('flex items-center gap-1.5 text-xs font-semibold', d.color)}>
      <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', d.dot)} />
      {d.label}
    </span>
  )
}

function Tile({ label, value, warn, accent }) {
  return (
    <div className={clsx('px-3 py-2.5 rounded-xl border text-center',
      warn ? 'border-amber-500/20 bg-amber-500/5' : accent ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800/40 bg-slate-900/20')}>
      <p className={clsx('text-lg font-bold', warn ? 'text-amber-300' : accent ? 'text-emerald-300' : 'text-white')}>{value ?? '—'}</p>
      <p className="text-2xs text-slate-600">{label}</p>
    </div>
  )
}

function ActionRow({ action }) {
  const typeLabel = {
    request_check_in: 'Check-in Request', mark_reviewed: 'Mark Reviewed', flag_route_review: 'Route Flag',
    add_note: 'Note', incident_review: 'Incident Review', compliance_exception_review: 'Compliance Review',
    vehicle_readiness_review: 'Vehicle Review', status_update: 'Status Update',
  }
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/20">
      <Icon name="CheckSquare" size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{typeLabel[action.action_type] || action.action_type}</p>
        {action.notes && <p className="text-2xs text-slate-500 mt-0.5 truncate">{action.notes}</p>}
      </div>
      <span className="text-2xs text-slate-700 flex-shrink-0">{tsAgo(action.created_at)}</span>
    </div>
  )
}

export default function ControllerLiveSyncPanel() {
  const [open,        setOpen]        = useState(false)
  const [syncStatus,  setSyncStatus]  = useState(() => getControllerLiveSyncStatus())
  const [liveActions, setLiveActions] = useState({ actions: [], notes: [] })
  const [liveTrips,   setLiveTrips]   = useState([])
  const [incidents,   setIncidents]   = useState([])
  const [lastRead,    setLastRead]    = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [queueSum,    setQueueSum]    = useState(() => getQueueSummary())
  const unsubRef = useRef(null)

  const demoLiveMode    = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const localCtrlActions = useControllerStore(s => s.controllerActions || [])
  const localCtrlNotes   = useControllerStore(s => s.controllerNotes   || [])
  const localFlagged     = useControllerStore(s => s.flaggedRoutes      || {})
  const localSyncStatus  = useControllerStore(s => s.syncStatus)

  const isDemo = demoLiveMode === 'demo'
  const isLive = !isDemo
  const orgId  = null // real org ID comes from Supabase auth session

  const refreshQueue = useCallback(() => setQueueSum(getQueueSummary()), [])

  const loadLiveData = useCallback(async () => {
    if (!isLive || !isLiveControllerSyncAvailable() || !orgId) {
      setSyncStatus(isDemo ? LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY : LIVE_SYNC_STATUS.BACKEND_MISSING)
      refreshQueue(); return
    }
    setLoading(true); setError(null)
    try {
      const [actRes, tripsRes, incRes] = await Promise.all([
        fetchDashboardControllerActions(orgId, 20),
        fetchControllerLiveTrips(orgId),
        fetchControllerIncidentReviews(orgId, 10),
      ])
      if (actRes.error?.isRLS) setSyncStatus(LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR)
      else if (actRes.error)   setSyncStatus(LIVE_SYNC_STATUS.ERROR)
      else                     setSyncStatus(LIVE_SYNC_STATUS.CONNECTED)
      setLiveActions(actRes.data || { actions: [], notes: [] })
      setLiveTrips(tripsRes.data || [])
      setIncidents(incRes.data || [])
      setLastRead(actRes.readAt || new Date().toISOString())
      setError(actRes.error?.message || null)
    } catch (e) { setError(e.message); setSyncStatus(LIVE_SYNC_STATUS.ERROR) }
    setLoading(false); refreshQueue()
  }, [isDemo, isLive, orgId])

  useEffect(() => {
    if (!open) { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null } return }
    loadLiveData()
    if (isLive && isLiveControllerSyncAvailable() && orgId) {
      const unsub = subscribeControllerToLiveUpdates(orgId, ({ status }) => { setSyncStatus(status); loadLiveData() })
      unsubRef.current = unsub
    }
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null } }
  }, [open, isLive])

  useEffect(() => { const id = setInterval(refreshQueue, 10000); return () => clearInterval(id) }, [])

  const unreviewedIncidents = isDemo ? 0 : incidents.filter(i => !i.reviewed).length
  const routeFlags = isDemo ? Object.keys(localFlagged).length : 0
  const ctrlActCount = isDemo ? localCtrlActions.length : (liveActions.actions?.length || 0)
  const ctrlNoteCount = isDemo ? localCtrlNotes.length  : (liveActions.notes?.length  || 0)

  return (
    <div className="bg-[#0d1426] border border-slate-800/60 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Tablet" size={13} className="text-cyan-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Controller Live Sync</p>
          <p className="text-2xs text-slate-600">
            Run 13 · {isDemo ? 'Demo Mode — local data' : 'Live Mode'} · Advisory only
            {queueSum.pending > 0 && <span className="text-amber-400 ml-2">· {queueSum.pending} pending</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncPill status={syncStatus} />
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-slate-600" />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-800/40 space-y-4">
          {/* Advisory */}
          <div className="mt-3 px-3 py-2 rounded-xl border border-slate-800/40 bg-slate-900/20">
            <p className="text-2xs text-slate-600 leading-relaxed">
              Fleet Controller live sync uses Supabase when Live Mode is active and backend configuration is valid. If backend is missing or unavailable, updates remain local/offline-safe.
            </p>
          </div>

          {/* Demo notice */}
          {isDemo && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-violet-500/15 bg-violet-500/5">
              <Icon name="Eye" size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-violet-300">Demo Mode — Local data only</p>
                <p className="text-2xs text-slate-500 mt-0.5">Showing local Controller PWA state. Switch to Live Mode and configure Supabase for real-time sync.</p>
              </div>
            </div>
          )}

          {/* Backend missing */}
          {isLive && !isLiveControllerSyncAvailable() && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5">
              <Icon name="AlertTriangle" size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Live Mode is selected, but Supabase is not configured or available. Fleet Controller PWA updates are being saved locally/offline-safe until live backend sync is available.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5">
              <Icon name="XCircle" size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-300 font-semibold">Sync Error</p>
                <p className="text-2xs text-slate-500 mt-0.5">{error}</p>
                {syncStatus === LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR && (
                  <p className="text-2xs text-amber-300 mt-1">RLS blocked the request. Check Supabase policies for controller_actions, controller_notes, incident_reports.</p>
                )}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Actions"    value={ctrlActCount}           accent={ctrlActCount > 0} />
            <Tile label="Notes"      value={ctrlNoteCount}          accent={ctrlNoteCount > 0} />
            <Tile label="Unreviewed" value={unreviewedIncidents}    warn={unreviewedIncidents > 0} />
            <Tile label="Route Flags" value={routeFlags}            warn={routeFlags > 0} />
          </div>

          {/* Demo local state */}
          {isDemo && (
            <div className="space-y-2">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Local Controller State (Demo)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Actions',      `${localCtrlActions.length} saved`],
                  ['Notes',        `${localCtrlNotes.length} notes`],
                  ['Route Flags',  `${Object.keys(localFlagged).length} flagged`],
                  ['Pending Sync', `${localSyncStatus.pendingSync ? 'Yes' : 'No'}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800/30 bg-slate-900/20">
                    <span className="text-2xs text-slate-600">{l}</span>
                    <span className="text-2xs text-slate-300 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live controller actions */}
          {isLive && Array.isArray(liveActions.actions) && liveActions.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Recent Controller Actions (Live)</p>
              {liveActions.actions.slice(0, 4).map(a => <ActionRow key={a.id} action={a} />)}
            </div>
          )}

          {/* Live controller notes */}
          {isLive && Array.isArray(liveActions.notes) && liveActions.notes.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Recent Controller Notes (Live)</p>
              {liveActions.notes.slice(0, 3).map(n => (
                <div key={n.id} className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/20">
                  <Icon name="MessageSquare" size={12} className="text-cyan-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-slate-300 leading-relaxed truncate">{n.note_text}</p>
                  </div>
                  <span className="text-2xs text-slate-700 flex-shrink-0">{tsAgo(n.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Unreviewed incidents */}
          {isLive && incidents.filter(i => !i.reviewed).length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs text-amber-400 uppercase tracking-wider font-semibold">Unreviewed Incidents</p>
              {incidents.filter(i => !i.reviewed).slice(0, 3).map(inc => (
                <div key={inc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5">
                  <Icon name="AlertTriangle" size={12} className="text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{inc.title || inc.incident_type}</p>
                    <p className="text-2xs text-slate-600">{inc.severity} · {inc.drivers?.full_name || '—'} · {tsAgo(inc.incident_at)}</p>
                  </div>
                  <span className="text-2xs text-amber-400 flex-shrink-0">Unreviewed</span>
                </div>
              ))}
            </div>
          )}

          {/* Queue summary */}
          {queueSum.total > 0 && (
            <div className="space-y-1">
              <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Controller Offline Queue</p>
              <div className="grid grid-cols-3 gap-2">
                {[['Pending', queueSum.pending, 'text-amber-300'], ['Synced', queueSum.synced, 'text-emerald-300'], ['Failed', queueSum.failed, 'text-red-300']].map(([l, v, c]) => (
                  <div key={l} className="px-2 py-1.5 rounded-lg border border-slate-800/30 bg-slate-900/20 text-center">
                    <p className={clsx('text-sm font-bold', c)}>{v}</p>
                    <p className="text-2xs text-slate-700">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-2xs text-slate-700">{lastRead ? `Last read: ${tsAgo(lastRead)}` : 'Not yet read from backend'}</p>
            <button onClick={loadLiveData} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/40 text-2xs text-slate-400 hover:text-white transition-colors">
              <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <p className="text-2xs text-slate-800 text-center">Controller live sync · Advisory only · Human verification required</p>
        </div>
      )}
    </div>
  )
}
