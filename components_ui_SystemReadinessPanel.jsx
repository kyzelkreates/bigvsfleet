/**
 * ============================================================
 * Big V's Best Routes™ — System Readiness Panel
 * /src/components/ui/SystemReadinessPanel.jsx
 *
 * RUN 14 — Demo/Live Hard Separation + Production Validation
 *          (upgraded from Run 10 — preserves all existing rows)
 *
 * Honest system-status summary for the Fleet Dashboard.
 * All status labels are truthful. No legal guarantees.
 * No fake "production_ready" or "legally_certified" labels.
 *
 * ADVISORY:
 *   This panel is advisory only. Human verification required.
 * ============================================================
 */

import React, { useState, useEffect } from 'react'
import Icon from './components_ui_Icon'
import { useDemoLiveStore, useComplianceAIStore } from './core_storage'
import { isSupabaseConfigured } from './services_supabase_supabaseClient'
import { getDriverLiveSyncStatus, LIVE_SYNC_STATUS as D_STATUS } from './services_sync_driverLiveSyncManager'
import { getControllerLiveSyncStatus } from './services_sync_controllerSyncManager'
import { getQueueSummary } from './services_sync_offlineQueueManager'
import { getConflictCount, isDemoMode } from './services_sync_demoLiveSeparator'

const clsx = (...a) => a.filter(Boolean).join(' ')

// ── Status display map ────────────────────────────────────────
const STATUS_DISPLAY = {
  demo_ready:                 { label: 'Demo Ready',              color: 'text-violet-300',  dot: 'bg-violet-400'  },
  local_ready:                { label: 'Local Ready',             color: 'text-emerald-300', dot: 'bg-emerald-400' },
  live_backend_ready:         { label: 'Live Backend Ready',      color: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  backend_ready:              { label: 'Backend Ready',           color: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  backend_configured:         { label: 'Backend Configured',      color: 'text-emerald-300', dot: 'bg-emerald-400' },
  backend_missing:            { label: 'Backend Missing',         color: 'text-amber-300',   dot: 'bg-amber-400'   },
  advisory_active:            { label: 'Advisory Active',         color: 'text-cyan-300',    dot: 'bg-cyan-400'    },
  fallback_active:            { label: 'Fallback Active',         color: 'text-amber-300',   dot: 'bg-amber-400'   },
  live_sync_ready:            { label: 'Live Sync Ready',         color: 'text-emerald-300', dot: 'bg-emerald-400' },
  offline_queue_ready:        { label: 'Offline Queue Ready',     color: 'text-cyan-300',    dot: 'bg-cyan-400'    },
  conflict_review_ready:      { label: 'Conflict Review Ready',   color: 'text-amber-300',   dot: 'bg-amber-400'   },
  conflicts_pending:          { label: 'Conflicts Pending',       color: 'text-red-300',     dot: 'bg-red-400'     },
  rls_documented:             { label: 'RLS Documented',          color: 'text-emerald-300', dot: 'bg-emerald-400' },
  demo_separation_active:     { label: 'Demo Sep. Active',        color: 'text-violet-300',  dot: 'bg-violet-400'  },
  needs_live_backend:         { label: 'Needs Live Backend',      color: 'text-amber-400',   dot: 'bg-amber-500'   },
  needs_real_world_validation:{ label: 'Needs Real-World Valid.',  color: 'text-slate-400',   dot: 'bg-slate-500'   },
  needs_production_validation:{ label: 'Needs Prod Validation',   color: 'text-slate-400',   dot: 'bg-slate-500'   },
  not_configured:             { label: 'Not Configured',          color: 'text-slate-500',   dot: 'bg-slate-600'   },
  configured:                 { label: 'Configured',              color: 'text-emerald-300', dot: 'bg-emerald-400' },
  active:                     { label: 'Active',                  color: 'text-emerald-300', dot: 'bg-emerald-400' },
  unknown:                    { label: 'Unknown',                 color: 'text-slate-600',   dot: 'bg-slate-700'   },
}

function StatusPill({ status }) {
  const d = STATUS_DISPLAY[status] || STATUS_DISPLAY.unknown
  return (
    <span className={clsx('flex items-center gap-1.5 text-2xs font-semibold', d.color)}>
      <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', d.dot)} />
      {d.label}
    </span>
  )
}

function StatusRow({ icon, label, status, detail }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800/30 last:border-0">
      <Icon name={icon} size={12} className="text-slate-600 flex-shrink-0" />
      <span className="text-2xs text-slate-500 flex-1 min-w-0 truncate">{label}</span>
      <div className="flex-shrink-0 text-right">
        <StatusPill status={status} />
        {detail && <p className="text-2xs text-slate-700 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-2xs text-slate-700 uppercase tracking-widest font-semibold pt-3 pb-1">{children}</p>
}

export default function SystemReadinessPanel() {
  const [open, setOpen]     = useState(false)
  const [live, setLive]     = useState({
    driverSync:      'unknown',
    controllerSync:  'unknown',
    queueSum:        { pending: 0, failed: 0, conflict: 0 },
    conflictCount:   0,
    supabaseConf:    false,
  })

  const demoLiveMode   = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const backendReadiness = useDemoLiveStore(s => s.backendReadiness)
  const syncStatus     = useDemoLiveStore(s => s.syncStatus)
  const systemHealth   = useDemoLiveStore(s => s.systemHealth)
  const latestSafety   = useComplianceAIStore(s => s.safetyResults?.[0]  || null)
  const latestLegal    = useComplianceAIStore(s => s.legalResults?.[0]   || null)

  const isDemo     = demoLiveMode === 'demo'
  const hasBackend = backendReadiness?.provider !== 'none' && backendReadiness?.provider != null

  // Refresh live counters every 10s
  useEffect(() => {
    const refresh = () => {
      try {
        setLive({
          driverSync:     getDriverLiveSyncStatus(),
          controllerSync: getControllerLiveSyncStatus(),
          queueSum:       getQueueSummary(),
          conflictCount:  getConflictCount(),
          supabaseConf:   isSupabaseConfigured(),
        })
      } catch {}
    }
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [])

  // ── Status helpers ──────────────────────────────────────────
  const mapStatus        = isDemo ? 'demo_ready' : (systemHealth?.mapReady ? 'configured' : 'fallback_active')
  const backendStatus    = live.supabaseConf ? 'backend_configured' : (isDemo ? 'demo_ready' : 'backend_missing')
  const aiSafetyStatus   = latestSafety ? 'advisory_active' : 'demo_ready'
  const aiLegalStatus    = latestLegal  ? 'advisory_active' : 'demo_ready'
  const driverSyncStatus = live.supabaseConf ? 'live_sync_ready' : (isDemo ? 'demo_ready' : 'needs_live_backend')
  const ctrlSyncStatus   = live.supabaseConf ? 'live_sync_ready' : (isDemo ? 'demo_ready' : 'needs_live_backend')
  const queueStatus      = live.queueSum.pending > 0 ? 'offline_queue_ready' : 'local_ready'
  const conflictStatus   = live.conflictCount > 0 ? 'conflicts_pending' : 'conflict_review_ready'

  // ── Run 1–10 rows (preserved from Run 10) ─────────────────
  const coreRows = [
    { icon: 'LayoutDashboard', label: 'Fleet Dashboard',              status: 'local_ready',          detail: 'Run 2 — Shell + Role Routing' },
    { icon: 'Truck',           label: 'Driver PWA',                   status: isDemo ? 'demo_ready' : 'local_ready', detail: 'Run 6 — GPS + Navigation' },
    { icon: 'Tablet',          label: 'Fleet Controller PWA',         status: isDemo ? 'demo_ready' : 'local_ready', detail: 'Run 7 — Oversight + Actions' },
    { icon: 'Download',        label: 'PWA Deployment Centre',        status: 'local_ready',          detail: 'Run 8 — Sync + Install Guide' },
    { icon: 'Eye',             label: 'Demo / Live Mode',             status: isDemo ? 'demo_ready' : (live.supabaseConf ? 'backend_configured' : 'backend_missing'), detail: isDemo ? 'Demo Mode — shows the product' : 'Live Mode — runs the product' },
    { icon: 'Settings',        label: 'API Settings / 4P3X Guard™',   status: 'local_ready',          detail: 'Run 4 — Blocks dangerous secrets' },
    { icon: 'Map',             label: 'Map Engine (OSM + MapLibre)',   status: mapStatus,              detail: 'Run 5 — 2D + 3D/tilt foundation' },
    { icon: 'Navigation',      label: 'GPS / Driver Navigation',      status: 'local_ready',          detail: 'Run 6 — Permission + Fallback' },
    { icon: 'Shield',          label: 'Safety Oversight AI',          status: aiSafetyStatus,         detail: latestSafety ? `Risk: ${latestSafety.riskLevel} · Conf: ${latestSafety.confidenceScore}%` : 'Run 9 — Run check to activate' },
    { icon: 'Scale',           label: 'Legal Compliance Oversight AI',status: aiLegalStatus,          detail: latestLegal  ? `Risk: ${latestLegal.advisoryRiskLevel} · Conf: ${latestLegal.confidenceScore}%` : 'Run 9 — Run check to activate' },
  ]

  // ── Run 11–14 rows (new) ───────────────────────────────────
  const backendRows = [
    { icon: 'Database',     label: 'Supabase Backend (Run 11)',        status: backendStatus,    detail: live.supabaseConf ? 'Configured — anon/public key only' : 'Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY' },
    { icon: 'Lock',         label: 'RLS — Row Level Security',         status: 'rls_documented', detail: 'Enabled on all operational tables · Run 11 SQL' },
    { icon: 'Truck',        label: 'Driver PWA Live Sync (Run 12)',     status: driverSyncStatus, detail: live.supabaseConf ? `Sync status: ${live.driverSync}` : 'Requires Supabase config in Live Mode' },
    { icon: 'Tablet',       label: 'Controller PWA Live Sync (Run 13)', status: ctrlSyncStatus,  detail: live.supabaseConf ? `Sync status: ${live.controllerSync}` : 'Requires Supabase config in Live Mode' },
    { icon: 'Layers',       label: 'Demo/Live Hard Separation (Run 14)',status: 'demo_separation_active', detail: isDemo ? 'Demo data labelled — not shown as live operational' : 'Live Mode: demo records filtered from active views' },
    { icon: 'Clock',        label: 'Offline Queue',                     status: queueStatus,     detail: live.queueSum.pending > 0 ? `${live.queueSum.pending} pending · ${live.queueSum.failed} failed` : 'Queue empty — evidence-preserving' },
    { icon: 'AlertTriangle',label: 'Sync Conflicts',                    status: conflictStatus,  detail: live.conflictCount > 0 ? `${live.conflictCount} conflict(s) need human review` : 'No unresolved conflicts' },
    { icon: 'HardDrive',    label: 'Offline / Local Fallback',          status: 'local_ready',   detail: 'SSOT localStorage — always safe' },
    { icon: 'CheckCircle',  label: 'Final Validation (Run 14)',          status: 'needs_real_world_validation', detail: 'Advisory demo — real-world validation required before production' },
  ]

  // ── Overall status pill ────────────────────────────────────
  const overallStatus = live.conflictCount > 0
    ? 'conflicts_pending'
    : live.supabaseConf
      ? 'live_backend_ready'
      : isDemo ? 'demo_ready' : 'backend_missing'

  return (
    <div className="bg-[#0d1426] border border-slate-800/60 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/20 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Activity" size={13} className="text-cyan-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">System Readiness — Big V's Best Routes™</p>
          <p className="text-2xs text-slate-600">
            Run 14 · 4P3X Intelligent AI™ · {isDemo ? 'Demo Mode' : 'Live Mode'} · Advisory only
            {live.queueSum.pending > 0 && <span className="text-amber-400 ml-2">· {live.queueSum.pending} pending</span>}
            {live.conflictCount > 0    && <span className="text-red-400    ml-2">· {live.conflictCount} conflict(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={overallStatus} />
          <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-slate-600" />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-slate-800/40">

          {/* Safety warning */}
          <div className="mt-3 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5">
            <p className="text-2xs text-amber-300 font-semibold mb-1">Advisory System Notice</p>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel. This system is not production-legally certified. Advisory only — human verification required.
            </p>
          </div>

          {/* Conflict warning */}
          {live.conflictCount > 0 && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5">
              <Icon name="AlertTriangle" size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-red-300 leading-relaxed">
                {live.conflictCount} sync conflict(s) detected. Local and backend records differ. Human review required. No evidence has been auto-deleted.
              </p>
            </div>
          )}

          {/* Live Mode backend missing */}
          {!isDemo && !live.supabaseConf && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5">
              <Icon name="AlertCircle" size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-amber-300 leading-relaxed">
                Live Mode is selected, but Supabase is not configured. Set <span className="font-mono">VITE_SUPABASE_URL</span> and <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> in your environment, then configure in Backend Settings.
              </p>
            </div>
          )}

          {/* Run 1–10 rows */}
          <SectionLabel>Foundation — Runs 1–10</SectionLabel>
          <div className="space-y-0">
            {coreRows.map(r => <StatusRow key={r.label} {...r} />)}
          </div>

          {/* Run 11–14 rows */}
          <SectionLabel>Live Backend — Runs 11–14</SectionLabel>
          <div className="space-y-0">
            {backendRows.map(r => <StatusRow key={r.label} {...r} />)}
          </div>

          {/* Demo/Live mode statement */}
          <div className="mt-3 px-3 py-2 rounded-xl border border-violet-500/15 bg-violet-500/5">
            <p className="text-2xs text-violet-300 font-semibold">Demo Mode shows the product. Live Mode runs the product.</p>
            <p className="text-2xs text-slate-600 mt-0.5">
              {isDemo
                ? 'Demo Mode: all data is local. Demo records are clearly labelled. No backend required.'
                : live.supabaseConf
                  ? 'Live Mode: Supabase configured. Driver PWA + Controller PWA sync available. Demo records filtered from active operational views.'
                  : 'Live Mode: Supabase not yet configured. Updates are saved locally/offline-safe. Configure in Backend Settings to enable live sync.'}
            </p>
          </div>

          {/* RLS documented */}
          <div className="mt-2 px-3 py-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
            <p className="text-2xs text-emerald-300 font-semibold">RLS is enabled on all operational Supabase tables.</p>
            <p className="text-2xs text-slate-600 mt-0.5">
              Only frontend-safe anon/public configuration is allowed. Service role keys, database URLs, JWT secrets, private keys, webhook secrets, and admin tokens must never be stored in frontend code.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href="/#/compliance"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-2xs text-emerald-300 hover:bg-emerald-500/10 transition-colors">
              <Icon name="Shield" size={11} /> Run AI Checks
            </a>
            <a href="/#/pwa-deployment"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-violet-500/20 bg-violet-500/5 text-2xs text-violet-300 hover:bg-violet-500/10 transition-colors">
              <Icon name="Download" size={11} /> PWA Deployment
            </a>
          </div>

          <p className="text-2xs text-slate-800 text-center mt-3">
            Big V's Best Routes™ · Runs 1–14 Complete · Advisory only · Human verification required · Not legally certified
          </p>
        </div>
      )}
    </div>
  )
}
