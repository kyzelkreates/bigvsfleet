/**
 * ============================================================
 * Big V's Best Routes™ — Demo/Live Mode Toggle
 * /src/components/ui/DemoLiveToggle.jsx
 *
 * RUN 3 — SSOT + Demo/Live Mode Core
 *
 * Reads from / writes to: useDemoLiveStore (core_storage.js)
 * ONE store. NO duplicate state.
 *
 * Variants:
 *   DemoLiveToggle       — full panel (Dashboard header)
 *   DemoLivePill         — compact pill (TopNav / PWA header)
 *   DemoLiveWarningBanner — live-mode no-backend warning
 *
 * LOCKED WORDING:
 *   "Demo Mode shows the product. Live Mode runs the product."
 *
 * SECURITY:
 *   No API keys. No secrets. No backend credentials.
 *   Backend provider names only (strings).
 * ============================================================
 */

import { useState } from 'react'
import { useDemoLiveStore } from './core_storage'
import Icon from './components_ui_Icon'

// ─── Shared wording (locked per directive) ────────────────────
const LOCKED_LABEL = 'Demo Mode shows the product. Live Mode runs the product.'
const LIVE_NO_BACKEND_WARNING =
  "Live Mode is selected, but no backend provider is configured yet. The system is running in local/offline-safe mode until Supabase, Firebase, AWS/custom backend, or another supported backend is configured."

// ─── Provider display names ───────────────────────────────────
const PROVIDER_LABELS = {
  none:       'None configured',
  supabase:   'Supabase',
  firebase:   'Firebase',
  aws_custom: 'AWS / Custom',
  rest_custom:'REST / Custom Endpoint',
  local_only: 'Local Only',
}

const BACKEND_STATUS_CONFIG = {
  not_configured: { label: 'Not configured', color: 'text-slate-500', dot: 'bg-slate-700' },
  configured:     { label: 'Configured',      color: 'text-amber-400', dot: 'bg-amber-400' },
  testing:        { label: 'Testing…',        color: 'text-cyan-400',  dot: 'bg-cyan-400'  },
  connected:      { label: 'Connected',       color: 'text-emerald-400', dot: 'bg-emerald-400' },
  error:          { label: 'Error',           color: 'text-red-400',   dot: 'bg-red-400'   },
  offline_fallback: { label: 'Offline fallback', color: 'text-amber-400', dot: 'bg-amber-500' },
}

// ─────────────────────────────────────────────────────────────
// DemoLiveToggle — full panel for Dashboard
// ─────────────────────────────────────────────────────────────
export function DemoLiveToggle({ compact = false, className = '' }) {
  const mode            = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const backendProvider = useDemoLiveStore(s => s.backendReadiness?.provider ?? 'none')
  const backendStatus   = useDemoLiveStore(s => s.backendReadiness?.backendStatus ?? 'not_configured')
  const syncMode        = useDemoLiveStore(s => s.backendReadiness?.syncMode ?? 'demo_local')
  const lastDemoSyncAt  = useDemoLiveStore(s => s.syncStatus?.lastDemoSyncAt)
  const isOffline       = useDemoLiveStore(s => s.offlineStatus?.isOffline ?? false)
  const setMode         = useDemoLiveStore(s => s.setMode)
  const refreshDemoSync = useDemoLiveStore(s => s.refreshDemoSync)

  const isDemo       = mode === 'demo'
  const isLive       = mode === 'live'
  const noBackend    = isLive && backendProvider === 'none'
  const bsCfg        = BACKEND_STATUS_CONFIG[backendStatus] ?? BACKEND_STATUS_CONFIG.not_configured

  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshDemo = () => {
    if (!isDemo) return
    setRefreshing(true)
    setTimeout(() => {
      refreshDemoSync()
      setRefreshing(false)
    }, 600)
  }

  if (compact) {
    // Compact variant — used in PWA headers / TopNav
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
          isDemo
            ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
            : noBackend
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
        }`}>
          <span className={`inline-flex rounded-full h-1.5 w-1.5 ${
            isDemo ? 'bg-violet-400' : noBackend ? 'bg-amber-400' : 'bg-emerald-400'
          }`} />
          {isDemo ? 'Demo Mode' : noBackend ? 'Live · No Backend' : 'Live Mode'}
        </span>
      </div>
    )
  }

  // ── Full panel ──────────────────────────────────────────────
  return (
    <div className={`bg-[#0d1426] border border-slate-800/60 rounded-xl p-4 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="ToggleLeft" size={14} className="text-slate-500" />
          <span className="text-sm font-semibold text-white">System Mode</span>
        </div>
        {/* Mode badge */}
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold border ${
          isDemo
            ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
            : noBackend
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
        }`}>
          <span className={`relative flex h-1.5 w-1.5 ${isDemo ? '' : 'animate-pulse'}`}>
            <span className={`inline-flex rounded-full h-1.5 w-1.5 ${
              isDemo ? 'bg-violet-400' : noBackend ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
          </span>
          {isDemo ? 'DEMO' : noBackend ? 'LIVE · LOCAL' : 'LIVE'}
        </span>
      </div>

      {/* Locked wording */}
      <p className="text-2xs text-slate-500 mb-3 leading-relaxed italic">
        "{LOCKED_LABEL}"
      </p>

      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode('demo')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
            isDemo
              ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
              : 'bg-slate-900/60 border-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
          }`}
        >
          <Icon name="Monitor" size={11} className="inline mr-1.5 -mt-0.5" />
          Demo Mode
        </button>
        <button
          onClick={() => setMode('live')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
            isLive
              ? noBackend
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-slate-900/60 border-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
          }`}
        >
          <Icon name="Radio" size={11} className="inline mr-1.5 -mt-0.5" />
          Live Mode
        </button>
      </div>

      {/* Status rows */}
      <div className="space-y-2">
        {/* Backend provider */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="Database" size={11} className="text-slate-600" />
            <span className="text-2xs text-slate-600">Backend provider</span>
          </div>
          <div className={`flex items-center gap-1.5 ${bsCfg.color}`}>
            <span className={`inline-flex rounded-full h-1.5 w-1.5 ${bsCfg.dot}`} />
            <span className="text-2xs font-medium">{PROVIDER_LABELS[backendProvider] ?? backendProvider}</span>
          </div>
        </div>

        {/* Sync mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="RefreshCw" size={11} className="text-slate-600" />
            <span className="text-2xs text-slate-600">Sync mode</span>
          </div>
          <span className="text-2xs font-mono text-slate-400">{syncMode}</span>
        </div>

        {/* Offline/fallback */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="WifiOff" size={11} className="text-slate-600" />
            <span className="text-2xs text-slate-600">Offline/fallback</span>
          </div>
          <span className={`text-2xs font-medium ${isOffline ? 'text-amber-400' : 'text-slate-500'}`}>
            {isOffline ? 'Offline — local safe mode' : 'Local/offline-safe mode active'}
          </span>
        </div>

        {/* Last demo sync */}
        {isDemo && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="Clock" size={11} className="text-slate-600" />
              <span className="text-2xs text-slate-600">Last demo refresh</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono text-slate-500">
                {lastDemoSyncAt
                  ? new Date(lastDemoSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
              <button
                onClick={handleRefreshDemo}
                disabled={refreshing}
                title="Refresh demo local state"
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <Icon name="RefreshCw" size={10} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Oversight status (reserved) */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
          <Icon name="ShieldCheck" size={10} className="text-slate-700" />
          <span className="text-2xs text-slate-700">Safety AI · Run 9</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
          <Icon name="Scale" size={10} className="text-slate-700" />
          <span className="text-2xs text-slate-700">Compliance AI · Run 9</span>
        </div>
      </div>

      {/* Backend config note */}
      <p className="text-2xs text-slate-700 mt-2.5 text-center">
        Full backend &amp; API config · Run 4 &nbsp;·&nbsp; Map engine · Run 5
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DemoLivePill — ultra-compact pill for PWA headers / TopNav
// ─────────────────────────────────────────────────────────────
export function DemoLivePill({ className = '' }) {
  return <DemoLiveToggle compact className={className} />
}

// ─────────────────────────────────────────────────────────────
// DemoLiveWarningBanner — live mode + no backend alert
// ─────────────────────────────────────────────────────────────
export function DemoLiveWarningBanner({ context = 'dashboard', className = '' }) {
  const mode            = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const backendProvider = useDemoLiveStore(s => s.backendReadiness?.provider ?? 'none')

  const noBackend = mode === 'live' && backendProvider === 'none'
  if (!noBackend) return null

  const contextMessages = {
    dashboard:   'No live fleet records are currently available. Demo records are hidden from live operational views.',
    driver:      'No live route assignment is available yet. Driver PWA will receive live route assignments once backend/PWA sync is configured.',
    controller:  'No live trips are currently available. Controller live monitoring will activate once backend/PWA sync is configured.',
  }

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 border-b border-amber-500/20 bg-amber-500/8 ${className}`}>
      <Icon name="AlertTriangle" size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-amber-300 mb-0.5">Live Mode — No Backend Configured</p>
        <p className="text-2xs text-slate-400 leading-relaxed">{LIVE_NO_BACKEND_WARNING}</p>
        {contextMessages[context] && (
          <p className="text-2xs text-slate-500 mt-1">{contextMessages[context]}</p>
        )}
        <p className="text-2xs text-slate-600 mt-1">
          Backend &amp; API configuration · Run 4 &nbsp;·&nbsp; Supported: Supabase · Firebase · AWS/Custom · REST Endpoint · Local-only fallback
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DemoLiveModePanel — role-safe minimal view for PWA pages
// Shows mode + warning only. No toggle. No admin controls.
// ─────────────────────────────────────────────────────────────
export function DemoLiveModePanel({ role = 'driver', className = '' }) {
  const mode            = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const backendProvider = useDemoLiveStore(s => s.backendReadiness?.provider ?? 'none')
  const isOffline       = useDemoLiveStore(s => s.offlineStatus?.isOffline ?? false)

  const isDemo    = mode === 'demo'
  const noBackend = mode === 'live' && backendProvider === 'none'

  const contextLabel = {
    driver:     'Driver PWA',
    controller: 'Fleet Controller PWA',
  }

  return (
    <div className={`${className}`}>
      {/* Mode indicator */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
        isDemo
          ? 'bg-violet-500/5 border-violet-500/20'
          : noBackend
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-emerald-500/5 border-emerald-500/20'
      }`}>
        <span className={`inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0 ${
          isDemo ? 'bg-violet-400' : noBackend ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${
            isDemo ? 'text-violet-300' : noBackend ? 'text-amber-300' : 'text-emerald-300'
          }`}>
            {isDemo ? 'Demo Mode' : noBackend ? 'Live Mode · No Backend' : 'Live Mode'}
          </p>
          <p className="text-2xs text-slate-600 mt-0.5 truncate">
            {isDemo
              ? `${contextLabel[role] ?? 'PWA'} · local/demo data · no backend required`
              : noBackend
                ? 'No backend configured · local/offline-safe mode active'
                : 'Live mode active'}
          </p>
        </div>
        {isOffline && (
          <Icon name="WifiOff" size={12} className="text-amber-500 flex-shrink-0" />
        )}
      </div>

      {/* Live no-backend warning */}
      {noBackend && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <Icon name="Info" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-slate-500 leading-relaxed">
            {mode === 'live' && role === 'driver' && 'No live route assignment is available yet. Driver PWA will receive live route assignments once backend/PWA sync is configured.'}
            {mode === 'live' && role === 'controller' && 'No live trips are currently available. Controller live monitoring will activate once backend/PWA sync is configured.'}
          </p>
        </div>
      )}

      {/* Demo records notice */}
      {isDemo && (
        <p className="mt-1.5 text-2xs text-slate-700 text-center">
          Demo records are clearly marked and are not live operational records.
        </p>
      )}
    </div>
  )
}

export default DemoLiveToggle
