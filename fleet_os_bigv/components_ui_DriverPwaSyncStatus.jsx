/**
 * ============================================================
 * Big V's Best Routes™ — Driver PWA Sync Status Strip
 * /src/components/ui/DriverPwaSyncStatus.jsx
 *
 * RUN 12 — Real-Time Dashboard ↔ Driver PWA Sync
 *
 * PURPOSE:
 *   Compact sync status strip for Driver PWA.
 *   Shows: mode, backend status, pending count, last sync,
 *   retry button, and advisory wording.
 *
 * SECURITY:
 *   Never exposes Supabase URL, anon key, backend settings,
 *   API settings, admin controls, or any secrets.
 *
 * ADVISORY:
 *   "Synced driver data supports fleet visibility only.
 *    It does not replace driver responsibility, road signage,
 *    current laws, permits, restrictions, bridge checks,
 *    road conditions, or company policy."
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react'
import Icon from './components_ui_Icon'
import { useDriverPwaStore } from './core_storage'
import {
  getDriverLiveSyncStatus,
  isLiveDriverSyncAvailable,
  retryDriverPendingSync,
  LIVE_SYNC_STATUS,
} from './services_sync_driverLiveSyncManager'
import { getPendingCount, getQueueSummary } from './services_sync_offlineQueueManager'

const clsx = (...a) => a.filter(Boolean).join(' ')
const tsAgo = (ts) => { if (!ts) return null; const m=Math.round((Date.now()-new Date(ts).getTime())/60000); if(m<1) return 'just now'; if(m<60) return `${m}m ago`; return `${Math.round(m/60)}h ago` }

function _getMode() {
  try { const r = localStorage.getItem('bigv:mode:demoLive'); if (!r) return 'demo'; const p = JSON.parse(r); return p?.demoLiveMode?.mode ?? 'demo' } catch { return 'demo' }
}

const STATUS_MINI = {
  [LIVE_SYNC_STATUS.LOCAL_DEMO_ONLY]:        { label: 'Demo',         color: 'text-violet-400',  dot: 'bg-violet-500'  },
  [LIVE_SYNC_STATUS.BACKEND_MISSING]:        { label: 'No Backend',   color: 'text-amber-400',   dot: 'bg-amber-500'   },
  [LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR]: { label: 'Policy Error', color: 'text-red-400',     dot: 'bg-red-500'     },
  [LIVE_SYNC_STATUS.OFFLINE_QUEUE]:          { label: 'Offline',      color: 'text-amber-400',   dot: 'bg-amber-500'   },
  [LIVE_SYNC_STATUS.POLLING_FALLBACK]:       { label: 'Polling',      color: 'text-cyan-400',    dot: 'bg-cyan-500 animate-pulse'   },
  [LIVE_SYNC_STATUS.REALTIME_CONNECTED]:     { label: 'Live',         color: 'text-emerald-400', dot: 'bg-emerald-500 animate-pulse'},
  [LIVE_SYNC_STATUS.CONNECTED]:              { label: 'Connected',    color: 'text-emerald-400', dot: 'bg-emerald-500' },
  [LIVE_SYNC_STATUS.ERROR]:                  { label: 'Error',        color: 'text-red-400',     dot: 'bg-red-500'     },
  [LIVE_SYNC_STATUS.NOT_CONFIGURED]:         { label: 'Offline',      color: 'text-slate-600',   dot: 'bg-slate-700'   },
}

export default function DriverPwaSyncStatus({ compact = false }) {
  const syncStatus = useDriverPwaStore(s => s.syncStatus)
  const [liveSyncStatus, setLiveSyncStatus] = useState(() => getDriverLiveSyncStatus())
  const [pending,        setPending]        = useState(() => getPendingCount())
  const [retrying,       setRetrying]       = useState(false)
  const [retryResult,    setRetryResult]    = useState(null)
  const [mode,           setMode]           = useState(() => _getMode())

  // Refresh every 8s
  useEffect(() => {
    const refresh = () => {
      setLiveSyncStatus(getDriverLiveSyncStatus())
      setPending(getPendingCount())
      setMode(_getMode())
    }
    refresh()
    const id = setInterval(refresh, 8000)
    return () => clearInterval(id)
  }, [])

  const handleRetry = useCallback(async () => {
    if (retrying) return
    setRetrying(true); setRetryResult(null)
    const result = await retryDriverPendingSync()
    setRetrying(false)
    setRetryResult(result)
    setPending(getPendingCount())
    setTimeout(() => setRetryResult(null), 5000)
  }, [retrying])

  const sd   = STATUS_MINI[liveSyncStatus] || STATUS_MINI[LIVE_SYNC_STATUS.NOT_CONFIGURED]
  const isDemo = mode === 'demo'
  const isLive = !isDemo
  const isBackendMissing = isLive && !isLiveDriverSyncAvailable()

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', sd.dot)} />
        <span className={clsx('text-2xs font-semibold', sd.color)}>{sd.label}</span>
        {pending > 0 && <span className="text-2xs text-amber-400">{pending} pending</span>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Status row */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/20">
        <div className="flex items-center gap-2">
          <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', sd.dot)} />
          <span className={clsx('text-xs font-semibold', sd.color)}>{sd.label}</span>
          <span className="text-2xs text-slate-600">·</span>
          <span className="text-2xs text-slate-600">{isDemo ? 'Demo Mode' : 'Live Mode'}</span>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <span className="text-2xs text-amber-300 font-semibold">{pending} pending</span>
          )}
          {syncStatus.lastLocalSaveAt && (
            <span className="text-2xs text-slate-700">{tsAgo(syncStatus.lastLocalSaveAt)}</span>
          )}
        </div>
      </div>

      {/* Backend missing warning */}
      {isBackendMissing && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-amber-500/15 bg-amber-500/5">
          <Icon name="AlertTriangle" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-amber-300 leading-relaxed">
            Live Mode is selected, but Supabase is not configured or available. Driver PWA updates are being saved locally/offline-safe until live backend sync is available.
          </p>
        </div>
      )}

      {/* Policy / schema error */}
      {liveSyncStatus === LIVE_SYNC_STATUS.SCHEMA_OR_POLICY_ERROR && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-red-500/15 bg-red-500/5">
          <Icon name="ShieldX" size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-red-300 leading-relaxed">
            Sync blocked by Supabase policy. Check RLS policies for driver tables. Updates saved locally.
          </p>
        </div>
      )}

      {/* Demo local-only notice */}
      {isDemo && (
        <p className="text-2xs text-slate-700 text-center">
          Demo Mode — updates saved locally only. Switch to Live Mode to enable Supabase sync.
        </p>
      )}

      {/* Retry button */}
      {isLive && pending > 0 && !isBackendMissing && (
        <div className="flex items-center justify-between">
          <button onClick={handleRetry} disabled={retrying}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-2xs font-semibold transition-all',
              retrying ? 'border-slate-800/40 text-slate-600 cursor-not-allowed' : 'border-cyan-500/20 bg-cyan-500/8 text-cyan-300 hover:bg-cyan-500/12')}>
            <Icon name={retrying ? 'Loader2' : 'RefreshCw'} size={10} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Retrying…' : `Retry ${pending} pending`}
          </button>
          {retryResult && (
            <p className={clsx('text-2xs', retryResult.ok ? 'text-emerald-400' : 'text-amber-400')}>
              {retryResult.ok ? `✓ ${retryResult.synced} synced` : `${retryResult.synced} synced, ${retryResult.failed} failed`}
            </p>
          )}
        </div>
      )}

      {/* Advisory */}
      <p className="text-2xs text-slate-800 leading-relaxed text-center">
        Synced driver data supports fleet visibility only. It does not replace driver responsibility, road signage, current laws, permits, restrictions, bridge checks, road conditions, or company policy.
      </p>
    </div>
  )
}
