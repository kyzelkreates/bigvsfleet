/**
 * ============================================================
 * Big V's Best Routes™ — PWA Deployment Centre
 * /src/pages/PwaDeployment.jsx
 *
 * RUN 8 — PWA Deployment Centre + One-Button Sync
 *
 * ROLE: Fleet Admin / Dashboard only — never exposed in PWAs.
 *
 * SECTIONS:
 *   Overview | Driver PWA Card | Controller PWA Card |
 *   Sync Centre | Profiles | Dashboard Reads | Sync Status
 *
 * SAFETY:
 *   The dashboard cannot remotely install a PWA onto another device.
 *   Sync status is advisory only.
 *   Compliance AI provides advisory guidance only.
 *
 * SECURITY:
 *   No API keys. No backend secrets. No credentials in URLs.
 *   Uses: usePwaDeployStore (Run 8), useDemoLiveStore (Run 3),
 *         useDriverPwaStore (Run 6 read-only), useControllerStore (Run 7 read-only).
 * ============================================================
 */

import React, { useState, useCallback, useEffect } from 'react'
import Icon from './components_ui_Icon'
import {
  usePwaDeployStore, useDemoLiveStore, useDriverPwaStore, useControllerStore,
} from './core_storage'
import {
  buildPwaUrl, copyPwaLink, openPwaLink,
  checkBackendReadiness,
  collectDriverPwaState, collectControllerPwaState,
  syncDriverPwa, syncControllerPwa, syncAllPwas,
  syncStatusDisplay, syncTypeLabel,
  SYNC_MESSAGES,
} from './services_sync_syncManager'

// ── Helpers ───────────────────────────────────────────────────
const clsx = (...a) => a.filter(Boolean).join(' ')
const tsAgo = (ts) => {
  if (!ts) return null
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
}

// ── Common components ─────────────────────────────────────────
function AdvisoryBox({ children, className = '' }) {
  return (
    <div className={clsx('flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5', className)}>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-xs text-slate-400 leading-relaxed">{children}</p>
    </div>
  )
}

function SectionCard({ title, icon, children, className = '' }) {
  return (
    <div className={clsx('bg-[#0d1426] border border-slate-800/60 rounded-xl overflow-hidden', className)}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-800/40">
        <Icon name={icon} size={14} className="text-slate-500" />
        <span className="text-sm font-bold text-white flex-1">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FeedbackBanner({ type, message, onClose }) {
  if (!message) return null
  const styles = {
    success: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-300',
    warning: 'border-amber-500/25 bg-amber-500/8 text-amber-300',
    error:   'border-red-500/25 bg-red-500/8 text-red-300',
    info:    'border-slate-700/40 bg-slate-900/40 text-slate-400',
  }
  const icons = { success: 'CheckCircle', warning: 'AlertCircle', error: 'XCircle', info: 'Info' }
  return (
    <div className={clsx('flex items-start gap-2 px-4 py-3 rounded-xl border', styles[type] || styles.info)}>
      <Icon name={icons[type] || 'Info'} size={14} className="flex-shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed flex-1">{message}</p>
      {onClose && <button onClick={onClose} className="text-xs opacity-50 hover:opacity-100 flex-shrink-0 ml-2"><Icon name="X" size={11} /></button>}
    </div>
  )
}

function SyncStatusPill({ status }) {
  const d = syncStatusDisplay(status)
  return (
    <span className={clsx('flex items-center gap-1.5 text-2xs font-semibold', d.color)}>
      <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', d.dot)} />
      {d.label}
    </span>
  )
}

// ── Install Instructions Component ────────────────────────────
function InstallInstructions({ pwaUrl }) {
  const [expanded, setExpanded] = useState(null)
  const platforms = [
    { id: 'android', name: 'Android — Chrome', icon: 'Smartphone', steps: [
      'Open the PWA link in Chrome on the Android device.',
      'Tap the ⋮ menu (top-right corner).',
      'Tap "Add to Home Screen" or "Install app".',
      'Confirm the prompt.',
      'Big V\'s Best Routes™ app icon appears on the home screen.',
    ]},
    { id: 'ios', name: 'iPhone / iPad — Safari', icon: 'Tablet', steps: [
      'Open the PWA link in Safari on the iPhone or iPad.',
      'Tap the Share button (square with upward arrow) at the bottom.',
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" to confirm.',
      'The app icon appears on the home screen.',
    ]},
    { id: 'desktop', name: 'Desktop — Chrome / Edge', icon: 'Monitor', steps: [
      'Open the PWA link in Chrome or Edge.',
      'Look for the install icon (computer with arrow) in the address bar, or use the browser menu.',
      'Click "Install app" or "Install Big V\'s Best Routes™".',
      'Confirm the prompt.',
      'The app opens as a standalone window.',
    ]},
  ]

  return (
    <div className="space-y-2">
      <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold mb-2">Install Guide</p>
      {platforms.map(p => (
        <div key={p.id} className="rounded-lg border border-slate-800/60 overflow-hidden">
          <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/30 hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-2">
              <Icon name={p.icon} size={12} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-300">{p.name}</span>
            </div>
            <Icon name={expanded === p.id ? 'ChevronUp' : 'ChevronDown'} size={12} className="text-slate-600" />
          </button>
          {expanded === p.id && (
            <div className="px-3 py-3 bg-slate-950/30 space-y-1.5">
              {p.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-2xs text-violet-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-2xs text-slate-400 leading-relaxed">{step}</p>
                </div>
              ))}
              {pwaUrl && (
                <div className="mt-2 px-2.5 py-1.5 rounded bg-slate-900/60 border border-slate-800/40">
                  <p className="text-2xs text-slate-600 mb-0.5">PWA Link</p>
                  <p className="text-2xs text-cyan-400 font-mono break-all">{pwaUrl}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <p className="text-2xs text-slate-700 mt-2">{SYNC_MESSAGES.noRemoteInstall}</p>
    </div>
  )
}

// ── QR Placeholder ────────────────────────────────────────────
function QrPlaceholder({ url }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4 rounded-xl border border-slate-800/60 bg-slate-900/30">
      <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-700/60 flex flex-col items-center justify-center gap-2 bg-slate-900/40">
        <Icon name="QrCode" size={28} className="text-slate-600" />
        <p className="text-2xs text-slate-700 text-center px-2">QR Placeholder</p>
      </div>
      <p className="text-2xs text-slate-600 text-center leading-relaxed max-w-xs">
        QR code placeholder — scan/share support can be upgraded with a QR library in a later run.
      </p>
      {url && (
        <p className="text-2xs text-cyan-400 font-mono break-all text-center px-2">{url}</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// PWA DEPLOYMENT CARD
// ═══════════════════════════════════════════════════════════════
function PwaCard({ role, card, url, demoMode, isLive, backendConfigured, readiness,
                   onOpen, onCopy, onGenerateProfile, onSync,
                   syncBusy, feedback, label, roleDescription, icon }) {
  const [showInstall, setShowInstall] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const sd = syncStatusDisplay(card.syncStatus || 'not_synced')

  return (
    <div className="bg-[#0d1426] border border-slate-800/60 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/40">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Icon name={icon} size={18} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">{label}</div>
          <div className="text-2xs text-slate-500">{roleDescription}</div>
        </div>
        <SyncStatusPill status={card.syncStatus || 'not_synced'} />
      </div>

      <div className="p-5 space-y-4">
        {/* Demo/live badge */}
        <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs',
          demoMode === 'demo' ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : backendConfigured ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : 'border-amber-500/20 bg-amber-500/5 text-amber-300')}>
          <Icon name={demoMode === 'demo' ? 'Eye' : 'Radio'} size={11} />
          {demoMode === 'demo' ? 'Demo Mode — local/demo data only' : backendConfigured ? 'Live Mode — backend configured' : 'Live Mode — no backend configured'}
        </div>

        {/* RUN 12: Driver live sync status strip */}
        {role === 'driver' && (
          <div className="px-0 pt-1">
            <DriverPwaSyncStatus />
          </div>
        )}
        {/* RUN 13: Controller live sync status strip */}
        {role === 'controller' && (
          <div className="px-0 pt-1">
            <ControllerPwaSyncStatus />
          </div>
        )}
        {/* Backend missing warning */}
        {isLive && !backendConfigured && (
          <FeedbackBanner type="warning" message={SYNC_MESSAGES.liveMissingBE} />
        )}

        {/* URL display */}
        <div className="space-y-1">
          <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">PWA URL</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-900/40 overflow-hidden">
            <Icon name="Link" size={11} className="text-slate-600 flex-shrink-0" />
            <p className="text-xs text-cyan-400 font-mono truncate flex-1">{url}</p>
          </div>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onOpen(url)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-500/25 bg-violet-500/8 text-sm text-violet-300 hover:bg-violet-500/12 transition-colors active:scale-95 font-medium">
            <Icon name="ExternalLink" size={13} />
            Open PWA
          </button>
          <button onClick={() => onCopy(url)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 text-sm text-slate-300 hover:text-white hover:border-slate-600/60 transition-colors active:scale-95 font-medium">
            <Icon name="Copy" size={13} />
            {feedback.copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Feedback banners */}
        {feedback.open  && <FeedbackBanner type={feedback.openOk  ? 'info'    : 'warning'} message={feedback.open}  />}
        {feedback.copy  && <FeedbackBanner type={feedback.copyOk  ? 'success' : 'warning'} message={feedback.copy}  />}
        {feedback.sync  && <FeedbackBanner type={feedback.syncOk  ? 'success' : 'warning'} message={feedback.sync}  />}
        {feedback.prof  && <FeedbackBanner type={feedback.profOk  ? 'success' : 'info'}    message={feedback.prof}  />}

        {/* Secondary actions */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowQr(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 text-2xs text-slate-400 hover:text-white transition-colors">
            <Icon name="QrCode" size={11} />
            {showQr ? 'Hide QR' : 'Show QR'}
          </button>
          <button onClick={() => setShowInstall(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 text-2xs text-slate-400 hover:text-white transition-colors">
            <Icon name="HelpCircle" size={11} />
            {showInstall ? 'Hide Guide' : 'Install Guide'}
          </button>
        </div>

        {showQr && <QrPlaceholder url={url} />}
        {showInstall && <InstallInstructions pwaUrl={url} />}

        {/* Profile section */}
        <div className="border-t border-slate-800/40 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Profile Generation</p>
              {card.profileGenerated && (
                <p className="text-2xs text-emerald-400 mt-0.5">
                  ✓ {card.profileName} {card.isDemo ? '(demo)' : ''} — generated
                </p>
              )}
              {!card.profileGenerated && <p className="text-2xs text-slate-600">No profile generated yet</p>}
            </div>
            <button onClick={onGenerateProfile}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/8 text-xs text-cyan-300 hover:bg-cyan-500/12 transition-colors active:scale-95 font-medium">
              <Icon name="UserPlus" size={12} />
              Generate Profile
            </button>
          </div>
          <p className="text-2xs text-slate-700">{SYNC_MESSAGES.profilesAdvisory}</p>
        </div>

        {/* Sync section */}
        <div className="border-t border-slate-800/40 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Sync</p>
              {card.lastSyncAt && (
                <p className="text-2xs text-slate-500 mt-0.5">
                  Last: {tsAgo(card.lastSyncAt)} · {syncTypeLabel(card.lastSyncType)}
                </p>
              )}
              {!card.lastSyncAt && <p className="text-2xs text-slate-600">Not synced yet</p>}
            </div>
            <button onClick={onSync} disabled={syncBusy}
              className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-95',
                syncBusy ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                         : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300 hover:bg-emerald-500/12')}>
              <Icon name={syncBusy ? 'Loader2' : 'RefreshCw'} size={12} className={syncBusy ? 'animate-spin' : ''} />
              {syncBusy ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>

          {/* Pending count */}
          {card.pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 text-2xs text-amber-400">
              <Icon name="Clock" size={11} />
              {card.pendingSyncCount} item{card.pendingSyncCount > 1 ? 's' : ''} pending sync
            </div>
          )}

          <p className="text-2xs text-slate-700">{SYNC_MESSAGES.syncAdvisory}</p>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD READS PANEL — shows Driver/Controller PWA data
// ═══════════════════════════════════════════════════════════════
function DashboardReadsPanel() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading]   = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      const driver     = collectDriverPwaState()
      const controller = collectControllerPwaState()
      setSnapshot({ driver, controller, refreshedAt: new Date().toISOString() })
      setLoading(false)
    }, 300)
  }, [])

  useEffect(() => { refresh() }, [])

  const driver = snapshot?.driver
  const ctrl   = snapshot?.controller

  return (
    <SectionCard title="Dashboard Reads — PWA Data" icon="Activity">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Read-only view of Driver PWA and Controller PWA local state from SSOT.
            {snapshot?.refreshedAt && ` Last read: ${tsAgo(snapshot.refreshedAt)}.`}
          </p>
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 text-2xs text-slate-400 hover:text-white transition-colors">
            <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Driver PWA reads */}
        <div className="rounded-xl border border-slate-800/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/40 border-b border-slate-800/40">
            <Icon name="Truck" size={12} className="text-slate-500" />
            <span className="text-xs font-semibold text-white">Driver PWA — Local State</span>
            {driver?.available
              ? <span className="ml-auto text-2xs text-emerald-400">✓ Data found</span>
              : <span className="ml-auto text-2xs text-slate-600">No data yet</span>}
          </div>
          <div className="px-4 py-3 space-y-2">
            {driver?.available ? (
              <>
                {[
                  { label: 'Driver',      value: driver.driverStatus?.name || driver.driverStatus?.driverId || '—' },
                  { label: 'Trip status', value: driver.tripStatus?.status || '—' },
                  { label: 'GPS',         value: driver.gpsStatus?.permission || '—' },
                  { label: 'Checklist',   value: driver.preTripChecklist?.completedAt ? 'Completed' : 'Not completed' },
                  { label: 'Compliance',  value: driver.complianceAcknowledgement?.acknowledged ? 'Acknowledged' : 'Not acknowledged' },
                  { label: 'Incidents',   value: `${driver.incidentReports?.length ?? 0} reports` },
                  { label: 'Notes',       value: `${driver.driverNotes?.length ?? 0} notes` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-2xs text-slate-600">{label}</span>
                    <span className="text-2xs text-slate-300 font-medium">{value}</span>
                  </div>
                ))}
                <p className="text-2xs text-slate-700 mt-2">Read at: {tsAgo(driver.snapshotAt)}</p>
              </>
            ) : (
              <p className="text-xs text-slate-600">{driver?.reason || 'Open the Driver PWA and start using it to see data here.'}</p>
            )}
          </div>
        </div>

        {/* Controller PWA reads */}
        <div className="rounded-xl border border-slate-800/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/40 border-b border-slate-800/40">
            <Icon name="Tablet" size={12} className="text-slate-500" />
            <span className="text-xs font-semibold text-white">Fleet Controller PWA — Local State</span>
            {ctrl?.available
              ? <span className="ml-auto text-2xs text-emerald-400">✓ Data found</span>
              : <span className="ml-auto text-2xs text-slate-600">No data yet</span>}
          </div>
          <div className="px-4 py-3 space-y-2">
            {ctrl?.available ? (
              <>
                {[
                  { label: 'Actions',         value: `${ctrl.controllerActions?.length ?? 0} saved` },
                  { label: 'Notes',           value: `${ctrl.controllerNotes?.length ?? 0} notes` },
                  { label: 'Reviewed items',  value: `${Object.keys(ctrl.reviewedItems ?? {}).length} reviewed` },
                  { label: 'Flagged routes',  value: `${Object.keys(ctrl.flaggedRoutes ?? {}).length} flagged` },
                  { label: 'Pending sync',    value: ctrl.syncStatus?.pendingSync ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-2xs text-slate-600">{label}</span>
                    <span className="text-2xs text-slate-300 font-medium">{value}</span>
                  </div>
                ))}
                <p className="text-2xs text-slate-700 mt-2">Read at: {tsAgo(ctrl.snapshotAt)}</p>
              </>
            ) : (
              <p className="text-xs text-slate-600">{ctrl?.reason || 'Open the Fleet Controller PWA and add notes/actions to see data here.'}</p>
            )}
          </div>
        </div>

        <AdvisoryBox>
          Dashboard reads are from local/SSOT state only. Real cross-device data requires backend sync (Run 8 sync foundation) with a configured backend provider. Full AI analysis of this data belongs to Run 9.
        </AdvisoryBox>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function PwaDeployment() {
  // ── SSOT reads ─────────────────────────────────────────────
  const demoLiveMode      = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const isLive            = demoLiveMode === 'live'
  const backendReadiness  = useDemoLiveStore(s => s.backendReadiness)
  const syncStatusGlobal  = useDemoLiveStore(s => s.syncStatus)
  const refreshDemoSync   = useDemoLiveStore(s => s.refreshDemoSync)
  const updateSyncStatus  = useDemoLiveStore(s => s.updateSyncStatus)
  const backendConfigured = backendReadiness?.provider !== 'none' && backendReadiness?.backendStatus !== 'not_configured'

  const driverCard         = usePwaDeployStore(s => s.driverPwa)
  const controllerCard     = usePwaDeployStore(s => s.controllerPwa)
  const syncAll            = usePwaDeployStore(s => s.syncAll)
  const markDriverSynced   = usePwaDeployStore(s => s.markDriverSynced)
  const markControllerSynced = usePwaDeployStore(s => s.markControllerSynced)
  const markAllSynced      = usePwaDeployStore(s => s.markAllSynced)
  const generateDriverProfile = usePwaDeployStore(s => s.generateDriverProfile)
  const generateControllerProfile = usePwaDeployStore(s => s.generateControllerProfile)
  const setPendingCount    = usePwaDeployStore(s => s.setPendingCount)
  const queueOfflineItem   = usePwaDeployStore(s => s.queueOfflineItem)
  const generatedProfiles  = usePwaDeployStore(s => s.generatedProfiles)
  const offlineQueue       = usePwaDeployStore(s => s.offlineQueue)

  // ── URL generation ─────────────────────────────────────────
  const [driverUrl]     = useState(() => buildPwaUrl('driver'))
  const [controllerUrl] = useState(() => buildPwaUrl('controller'))

  // ── Sync busy state ────────────────────────────────────────
  const [driverBusy, setDriverBusy]         = useState(false)
  const [controllerBusy, setControllerBusy] = useState(false)
  const [allBusy, setAllBusy]               = useState(false)

  // ── Per-card feedback ──────────────────────────────────────
  const [driverFb,     setDriverFb]     = useState({})
  const [controllerFb, setControllerFb] = useState({})
  const [allFb,        setAllFb]        = useState(null)
  const [allFbType,    setAllFbType]    = useState('info')

  const showFb = useCallback((setter, patch, ms = 5000) => {
    setter(f => ({ ...f, ...patch }))
    setTimeout(() => setter(f => {
      const next = { ...f }
      Object.keys(patch).forEach(k => { if (next[k] === patch[k]) delete next[k] })
      return next
    }), ms)
  }, [])

  // ── Sync opts builder ──────────────────────────────────────
  const syncOpts = {
    demoLiveMode, backendReadiness,
    refreshDemoSync, updateSyncStatus,
    markDriverSynced, markControllerSynced, markAllSynced,
    setPendingCount, queueOfflineItem,
  }

  // ── Handlers ───────────────────────────────────────────────
  const handleOpen = useCallback(async (url, role) => {
    const result = openPwaLink(url)
    const setter = role === 'driver' ? setDriverFb : setControllerFb
    const markOpened = role === 'driver' ? usePwaDeployStore.getState().markDriverOpened : usePwaDeployStore.getState().markControllerOpened
    markOpened()
    if (!result.success) showFb(setter, { open: result.message, openOk: false })
  }, [showFb])

  const handleCopy = useCallback(async (url, role) => {
    const setter = role === 'driver' ? setDriverFb : setControllerFb
    const markCopied = role === 'driver' ? usePwaDeployStore.getState().markDriverCopied : usePwaDeployStore.getState().markControllerCopied
    const result = await copyPwaLink(url)
    markCopied()
    if (result.success) {
      showFb(setter, { copy: result.message, copyOk: true, copied: true }, 3000)
    } else {
      showFb(setter, { copy: result.message, copyOk: false, copied: false }, 6000)
    }
  }, [showFb])

  const handleGenerateProfile = useCallback((role) => {
    const isDemo = demoLiveMode === 'demo'
    const fn     = role === 'driver' ? generateDriverProfile : generateControllerProfile
    const profile = fn(isDemo)
    const setter  = role === 'driver' ? setDriverFb : setControllerFb
    showFb(setter, { prof: `Profile generated: ${profile.name}${isDemo ? ' (demo)' : ''}. ${SYNC_MESSAGES.profilesAdvisory}`, profOk: true }, 8000)
  }, [demoLiveMode, generateDriverProfile, generateControllerProfile, showFb])

  const handleSyncDriver = useCallback(async () => {
    setDriverBusy(true)
    try {
      const result = await syncDriverPwa(syncOpts)
      showFb(setDriverFb, { sync: result.message, syncOk: result.success }, 7000)
    } catch (e) {
      showFb(setDriverFb, { sync: `Sync error: ${e.message}`, syncOk: false }, 7000)
    } finally { setDriverBusy(false) }
  }, [demoLiveMode, backendReadiness])

  const handleSyncController = useCallback(async () => {
    setControllerBusy(true)
    try {
      const result = await syncControllerPwa(syncOpts)
      showFb(setControllerFb, { sync: result.message, syncOk: result.success }, 7000)
    } catch (e) {
      showFb(setControllerFb, { sync: `Sync error: ${e.message}`, syncOk: false }, 7000)
    } finally { setControllerBusy(false) }
  }, [demoLiveMode, backendReadiness])

  const handleSyncAll = useCallback(async () => {
    setAllBusy(true)
    try {
      const result = await syncAllPwas(syncOpts)
      setAllFb(result.message)
      setAllFbType(result.success ? 'success' : 'warning')
      setTimeout(() => setAllFb(null), 8000)
    } catch (e) {
      setAllFb(`Sync error: ${e.message}`)
      setAllFbType('error')
      setTimeout(() => setAllFb(null), 8000)
    } finally { setAllBusy(false) }
  }, [demoLiveMode, backendReadiness])

  // ── Readiness check ────────────────────────────────────────
  const readiness = checkBackendReadiness(backendReadiness, demoLiveMode)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-bold text-xl text-white">PWA Deployment Centre</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Big V's Best Routes™ · Driver PWA + Fleet Controller PWA deployment &amp; sync
            </p>
          </div>
          <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium',
            demoLiveMode === 'demo' ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300')}>
            <Icon name={demoLiveMode === 'demo' ? 'Eye' : 'Radio'} size={12} />
            {demoLiveMode === 'demo' ? 'Demo Mode' : 'Live Mode'}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Advisory */}
        <AdvisoryBox>
          Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel.
          The dashboard cannot remotely install a PWA onto another user's device. It can create, share, and open links. The driver/controller installs the PWA from their own browser/device.
        </AdvisoryBox>

        {/* Backend missing warning */}
        {isLive && !backendConfigured && (
          <FeedbackBanner type="warning" message={SYNC_MESSAGES.liveMissingBE} />
        )}

        {/* ── Sync All ─────────────────────────────────────── */}
        <SectionCard title="One-Button Sync — All PWAs" icon="RefreshCw">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Sync Driver PWA and Fleet Controller PWA local state in one action.</p>
                {syncAll.lastSyncAt && (
                  <p className="text-2xs text-slate-600">Last sync all: {tsAgo(syncAll.lastSyncAt)} · {syncTypeLabel(syncAll.lastSyncType)}</p>
                )}
              </div>
              <button onClick={handleSyncAll} disabled={allBusy}
                className={clsx('flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95',
                  allBusy ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                           : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15')}>
                <Icon name={allBusy ? 'Loader2' : 'Zap'} size={15} className={allBusy ? 'animate-spin' : ''} />
                {allBusy ? 'Syncing All…' : 'Sync All PWAs'}
              </button>
            </div>
            {allFb && <FeedbackBanner type={allFbType} message={allFb} onClose={() => setAllFb(null)} />}
            <div className="flex items-center gap-3 flex-wrap text-2xs text-slate-600">
              <span>Offline queue: {offlineQueue.length} items</span>
              <span>·</span>
              <span>Profiles generated: {generatedProfiles.length}</span>
              <span>·</span>
              <SyncStatusPill status={syncAll.status || 'idle'} />
            </div>
            <p className="text-2xs text-slate-700">{SYNC_MESSAGES.syncAdvisory} {SYNC_MESSAGES.noRemoteInstall}</p>
          </div>
        </SectionCard>

        {/* ── PWA Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PwaCard
            role="driver"
            card={driverCard}
            url={driverUrl}
            demoMode={demoLiveMode}
            isLive={isLive}
            backendConfigured={backendConfigured}
            readiness={readiness}
            onOpen={(url) => handleOpen(url, 'driver')}
            onCopy={(url) => handleCopy(url, 'driver')}
            onGenerateProfile={() => handleGenerateProfile('driver')}
            onSync={handleSyncDriver}
            syncBusy={driverBusy}
            feedback={driverFb}
            label="Driver PWA"
            roleDescription="Standalone driver navigation, GPS, checklist, and trip management"
            icon="Truck"
          />
          <PwaCard
            role="controller"
            card={controllerCard}
            url={controllerUrl}
            demoMode={demoLiveMode}
            isLive={isLive}
            backendConfigured={backendConfigured}
            readiness={readiness}
            onOpen={(url) => handleOpen(url, 'controller')}
            onCopy={(url) => handleCopy(url, 'controller')}
            onGenerateProfile={() => handleGenerateProfile('controller')}
            onSync={handleSyncController}
            syncBusy={controllerBusy}
            feedback={controllerFb}
            label="Fleet Controller PWA"
            roleDescription="Mobile/tablet fleet oversight, driver status, incidents, and notes"
            icon="Tablet"
          />
        </div>

        {/* ── Dashboard Reads Panel ─────────────────────────── */}
        <DashboardReadsPanel />

        {/* ── Offline Queue & Profiles ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Offline Queue" icon="Clock">
            <div className="space-y-2">
              {offlineQueue.length === 0 ? (
                <p className="text-xs text-slate-600">No items in offline queue.</p>
              ) : (
                <>
                  <p className="text-xs text-amber-300">{offlineQueue.length} item{offlineQueue.length > 1 ? 's' : ''} queued for sync</p>
                  <div className="max-h-32 overflow-y-auto scrollbar-none space-y-1.5">
                    {offlineQueue.slice(0, 10).map(item => (
                      <div key={item.id} className="px-2.5 py-1.5 rounded bg-slate-900/40 border border-slate-800/40">
                        <p className="text-2xs text-slate-400">{item.pwa} PWA — {item.reason}</p>
                        <p className="text-2xs text-slate-700">{tsAgo(item.queuedAt)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <AdvisoryBox>{SYNC_MESSAGES.offlineQueued}</AdvisoryBox>
            </div>
          </SectionCard>

          <SectionCard title="Generated Profiles" icon="Users">
            <div className="space-y-2">
              {generatedProfiles.length === 0 ? (
                <p className="text-xs text-slate-600">No profiles generated yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto scrollbar-none space-y-1.5">
                  {generatedProfiles.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-900/40 border border-slate-800/40">
                      <Icon name={p.role === 'driver' ? 'Truck' : 'Tablet'} size={11} className="text-slate-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-2xs text-slate-300 font-medium">{p.name}</p>
                        <p className="text-2xs text-slate-600">{p.role} · {p.isDemo ? 'demo' : 'live'} · {tsAgo(p.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-2xs text-slate-700">{SYNC_MESSAGES.profilesAdvisory}</p>
            </div>
          </SectionCard>
        </div>

        {/* ── Footer disclaimer ─────────────────────────────── */}
        <div className="text-center py-2">
          <p className="text-2xs text-slate-700">
            Big V's Best Routes™ · PWA Deployment Centre is dashboard/admin-only · Sync status is advisory · Human override required
          </p>
          <p className="text-2xs text-slate-800 mt-0.5">
            Compliance AI provides advisory guidance only · Demo Mode shows the product · Live Mode runs the product
          </p>
        </div>
      </div>
    </div>
  )
}
