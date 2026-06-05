/**
 * ============================================================
 * Big V's Best Routes™ — 4P3X Intelligent AI Compliance Panels
 * /src/components/ui/ComplianceAIPanels.jsx
 *
 * RUN 9 — Safety & Legal Compliance AI Layer
 *
 * EXPORTS:
 *   SafetyOversightPanel   — 4P3X Intelligent AI 1
 *   LegalCompliancePanel   — 4P3X Intelligent AI 2
 *   ComplianceAIPanelPair  — both panels together (dashboard use)
 *   DriverComplianceAlerts — driver-safe advisory alerts
 *   ControllerComplianceBlock — controller advisory exceptions
 *
 * SAFETY:
 *   All panels are advisory only.
 *   No compliance guarantee wording anywhere.
 *   No route approval claims.
 *   Human verification required displayed on every panel.
 * ============================================================
 */

import React, { useState, useCallback } from 'react'
import Icon from './components_ui_Icon'
import {
  RISK_DISPLAY, ADVISORY_DISCLAIMER, HUMAN_VERIFICATION_REQUIRED,
  CONFIDENCE_DISCLAIMER, NO_GUARANTEE,
  runSafetyOversightCheck, runLegalComplianceOversightCheck,
  collectComplianceInputs,
} from './intel_bigv_complianceEngine'
// RUN 15-16: Provider adapters
import { getLatestRestrictionResultForRoute, OVERPASS_STATUS } from './services_routing_overpassAdapter'
import { getLatestGHRouteResult, isGraphHopperConfigured, GH_STATUS } from './services_routing_graphhopperRouteAdapter'
import { OverpassResultCard, GraphHopperResultCard } from './components_ui_RouteProviderResultCard'
import { useComplianceAIStore, useDemoLiveStore } from './core_storage'

// ── Helpers ───────────────────────────────────────────────────
const clsx = (...a) => a.filter(Boolean).join(' ')
const tsAgo = (ts) => {
  if (!ts) return null
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60); return h < 24 ? `${h}h ago` : `${Math.round(h/24)}d ago`
}

// ── Risk badge ────────────────────────────────────────────────
function RiskBadge({ level, size = 'sm' }) {
  const d = RISK_DISPLAY[level] || RISK_DISPLAY.unknown
  return (
    <span className={clsx('flex items-center gap-1.5 font-bold', size === 'sm' ? 'text-xs' : 'text-sm', d.color)}>
      <span className={clsx('inline-flex rounded-full flex-shrink-0', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5', d.dot)} />
      {d.label}
    </span>
  )
}

// ── Confidence meter ──────────────────────────────────────────
function ConfidenceMeter({ score }) {
  const color = score >= 70 ? 'bg-emerald-400' : score >= 45 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Confidence</span>
        <span className={clsx('text-xs font-bold', score >= 70 ? 'text-emerald-300' : score >= 45 ? 'text-amber-300' : 'text-red-300')}>{score}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-800">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-2xs text-slate-700">{CONFIDENCE_DISCLAIMER}</p>
    </div>
  )
}

// ── Warning row ───────────────────────────────────────────────
function WarningRow({ w }) {
  const sev = { critical: 'text-red-300', high: 'text-orange-300', medium: 'text-amber-300', low: 'text-slate-400' }
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon name="AlertCircle" size={12} className={clsx('flex-shrink-0 mt-0.5', sev[w.severity] || 'text-slate-500')} />
      <div className="min-w-0">
        <p className={clsx('text-2xs font-semibold leading-tight', sev[w.severity] || 'text-slate-400')}>{w.label}</p>
        {w.detail && <p className="text-2xs text-slate-600 leading-relaxed mt-0.5">{w.detail}</p>}
      </div>
    </div>
  )
}

// ── Collapsible section ───────────────────────────────────────
function CollapsibleSection({ title, icon, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-800/40 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-900/30 hover:bg-slate-800/30 transition-colors">
        <Icon name={icon} size={11} className="text-slate-500 flex-shrink-0" />
        <span className="text-2xs font-semibold text-slate-400 flex-1 text-left">{title}</span>
        {count != null && count > 0 && <span className="text-2xs text-amber-400 font-bold">{count}</span>}
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={11} className="text-slate-600 flex-shrink-0" />
      </button>
      {open && <div className="px-3 py-2 bg-slate-950/20">{children}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SAFETY OVERSIGHT AI PANEL
// ═══════════════════════════════════════════════════════════════
export function SafetyOversightPanel({ result, onRun, running, compact = false }) {
  const isStale = result?.generatedAt && (Date.now() - new Date(result.generatedAt).getTime()) > 15 * 60 * 1000
  const rd = result ? (RISK_DISPLAY[result.riskLevel] || RISK_DISPLAY.unknown) : null

  return (
    <div className={clsx('rounded-2xl border overflow-hidden', rd ? clsx(rd.border, rd.bg) : 'border-slate-800/60 bg-[#0d1426]')}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Shield" size={14} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">4P3X Intelligent AI 1</p>
          <p className="text-2xs text-emerald-400">Safety Oversight AI</p>
        </div>
        <div className="flex items-center gap-2">
          {result?.isDemo && <span className="text-2xs px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">Demo</span>}
          {isStale && <span className="text-2xs text-amber-400">Stale</span>}
          {result && <RiskBadge level={result.riskLevel} />}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Advisory + no guarantee */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <Icon name="Info" size={11} className="text-amber-400 flex-shrink-0" />
          <p className="text-2xs text-amber-300 font-semibold">{HUMAN_VERIFICATION_REQUIRED}</p>
        </div>

        {!result ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Icon name="Shield" size={28} className="text-slate-700" />
            <p className="text-xs text-slate-500">No safety advisory check run yet.</p>
            <p className="text-2xs text-slate-700">Click "Run Advisory Safety Check" to analyse available local data.</p>
          </div>
        ) : (
          <>
            {/* Risk + Confidence */}
            <div className="grid grid-cols-2 gap-3">
              <div className={clsx('px-3 py-2.5 rounded-xl border', rd.border, rd.bg)}>
                <p className="text-2xs text-slate-600 mb-1 uppercase tracking-wider">Safety Risk</p>
                <RiskBadge level={result.riskLevel} size="md" />
              </div>
              <div className="px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/40">
                <ConfidenceMeter score={result.confidenceScore} />
              </div>
            </div>

            {/* Explanation */}
            <div className="px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/30">
              <p className="text-2xs text-slate-500 leading-relaxed">{result.explanation}</p>
              {result.generatedAt && <p className="text-2xs text-slate-700 mt-1">Generated: {tsAgo(result.generatedAt)}</p>}
            </div>

            {/* Warnings */}
            {!compact && result.warnings?.length > 0 && (
              <CollapsibleSection title="Advisory Concerns" icon="AlertCircle" count={result.warnings.length} defaultOpen={result.warnings.length > 0}>
                <div className="divide-y divide-slate-800/30">
                  {result.warnings.map((w, i) => <WarningRow key={i} w={w} />)}
                </div>
              </CollapsibleSection>
            )}

            {/* Missing data */}
            {!compact && result.missingData?.length > 0 && (
              <CollapsibleSection title="Missing Data" icon="Database" count={result.missingData.length}>
                <div className="space-y-1">
                  {result.missingData.map((d, i) => (
                    <p key={i} className="text-2xs text-amber-400">• {d}</p>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Recommended checks */}
            {!compact && result.recommendedHumanChecks?.length > 0 && (
              <CollapsibleSection title="Recommended Human Checks" icon="CheckSquare" defaultOpen>
                <div className="space-y-1.5">
                  {result.recommendedHumanChecks.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-2xs text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                      <p className="text-2xs text-slate-400 leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Run button */}
        <button onClick={onRun} disabled={running}
          className={clsx('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all',
            running ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300 hover:bg-emerald-500/12 active:scale-95')}>
          <Icon name={running ? 'Loader2' : 'PlayCircle'} size={13} className={running ? 'animate-spin' : ''} />
          {running ? 'Running…' : 'Run Advisory Safety Check'}
        </button>

        <p className="text-2xs text-slate-800 text-center">{NO_GUARANTEE}</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// LEGAL COMPLIANCE OVERSIGHT AI PANEL
// ═══════════════════════════════════════════════════════════════
export function LegalCompliancePanel({ result, onRun, running, compact = false }) {
  const isStale = result?.generatedAt && (Date.now() - new Date(result.generatedAt).getTime()) > 15 * 60 * 1000
  const rd = result ? (RISK_DISPLAY[result.advisoryRiskLevel] || RISK_DISPLAY.unknown) : null

  return (
    <div className={clsx('rounded-2xl border overflow-hidden', rd ? clsx(rd.border, rd.bg) : 'border-slate-800/60 bg-[#0d1426]')}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Scale" size={14} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">4P3X Intelligent AI 2</p>
          <p className="text-2xs text-violet-400">Legal Compliance Oversight AI</p>
        </div>
        <div className="flex items-center gap-2">
          {result?.isDemo && <span className="text-2xs px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">Demo</span>}
          {isStale && <span className="text-2xs text-amber-400">Stale</span>}
          {result && <RiskBadge level={result.advisoryRiskLevel} />}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Advisory */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5">
          <Icon name="Info" size={11} className="text-amber-400 flex-shrink-0" />
          <p className="text-2xs text-amber-300 font-semibold">{HUMAN_VERIFICATION_REQUIRED}</p>
        </div>

        {!result ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Icon name="Scale" size={28} className="text-slate-700" />
            <p className="text-xs text-slate-500">No legal compliance advisory check run yet.</p>
            <p className="text-2xs text-slate-700">Click "Run Advisory Legal Compliance Check" to analyse available data.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className={clsx('px-3 py-2.5 rounded-xl border', rd.border, rd.bg)}>
                <p className="text-2xs text-slate-600 mb-1 uppercase tracking-wider">Compliance Risk</p>
                <RiskBadge level={result.advisoryRiskLevel} size="md" />
              </div>
              <div className="px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/40">
                <ConfidenceMeter score={result.confidenceScore} />
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-xl border border-slate-800/40 bg-slate-900/30">
              <p className="text-2xs text-slate-500 leading-relaxed">{result.explanation}</p>
              {result.generatedAt && <p className="text-2xs text-slate-700 mt-1">Generated: {tsAgo(result.generatedAt)}</p>}
            </div>

            {/* Missing legal-critical data */}
            {!compact && result.missingLegalCriticalData?.length > 0 && (
              <CollapsibleSection title="Missing Legal-Critical Data" icon="AlertTriangle" count={result.missingLegalCriticalData.length} defaultOpen>
                <div className="space-y-1">
                  {result.missingLegalCriticalData.map((d, i) => <p key={i} className="text-2xs text-red-400">• {d}</p>)}
                </div>
              </CollapsibleSection>
            )}

            {/* Route restriction concerns */}
            {!compact && result.routeRestrictionConcerns?.length > 0 && (
              <CollapsibleSection title="Route Restriction Concerns" icon="MapPin" count={result.routeRestrictionConcerns.length}>
                <div className="space-y-1.5">
                  {result.routeRestrictionConcerns.map((c, i) => <p key={i} className="text-2xs text-amber-400 leading-relaxed">• {c}</p>)}
                </div>
              </CollapsibleSection>
            )}

            {/* Data freshness */}
            {!compact && result.dataFreshnessWarnings?.length > 0 && (
              <CollapsibleSection title="Data Freshness Warnings" icon="Clock">
                <div className="space-y-1">
                  {result.dataFreshnessWarnings.map((w, i) => <p key={i} className="text-2xs text-slate-400">• {w}</p>)}
                </div>
              </CollapsibleSection>
            )}

            {/* Warnings */}
            {!compact && result.warnings?.length > 0 && (
              <CollapsibleSection title="Advisory Concerns" icon="AlertCircle" count={result.warnings.length}>
                <div className="divide-y divide-slate-800/30">
                  {result.warnings.map((w, i) => <WarningRow key={i} w={w} />)}
                </div>
              </CollapsibleSection>
            )}

            {/* Human checks */}
            {!compact && result.recommendedHumanChecks?.length > 0 && (
              <CollapsibleSection title="Recommended Human Checks" icon="CheckSquare" defaultOpen>
                <div className="space-y-1.5">
                  {result.recommendedHumanChecks.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-2xs text-violet-500 flex-shrink-0 mt-0.5">✓</span>
                      <p className="text-2xs text-slate-400 leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

        <button onClick={onRun} disabled={running}
          className={clsx('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all',
            running ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : 'border-violet-500/20 bg-violet-500/8 text-violet-300 hover:bg-violet-500/12 active:scale-95')}>
          <Icon name={running ? 'Loader2' : 'PlayCircle'} size={13} className={running ? 'animate-spin' : ''} />
          {running ? 'Running…' : 'Run Advisory Legal Compliance Check'}
        </button>

        <p className="text-2xs text-slate-800 text-center">{NO_GUARANTEE}</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE AI PANEL PAIR — dashboard use
// ═══════════════════════════════════════════════════════════════
export function ComplianceAIPanelPair() {
  const demoLiveMode = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const latestSafety = useComplianceAIStore(s => s.getLatestSafety?.() || s.safetyResults?.[0] || null)
  const latestLegal  = useComplianceAIStore(s => s.getLatestLegal?.()  || s.legalResults?.[0]  || null)
  const setSafetyResult = useComplianceAIStore(s => s.setSafetyResult)
  const setLegalResult  = useComplianceAIStore(s => s.setLegalResult)
  const lastRunAt    = useComplianceAIStore(s => s.lastRunAt)
  const [running, setRunning] = useState(false)

  const runSafety = useCallback(async () => {
    setRunning(true)
    try {
      const inputs = collectComplianceInputs(demoLiveMode)
      await new Promise(r => setTimeout(r, 400)) // brief UX pause
      const result = runSafetyOversightCheck(inputs)
      setSafetyResult(result)
    } catch (e) { console.warn('[BigV:SafetyAI] check failed:', e) }
    finally { setRunning(false) }
  }, [demoLiveMode, setSafetyResult])

  const runLegal = useCallback(async () => {
    setRunning(true)
    try {
      const inputs = collectComplianceInputs(demoLiveMode)
      await new Promise(r => setTimeout(r, 400))
      const result = runLegalComplianceOversightCheck(inputs)
      setLegalResult(result)
    } catch (e) { console.warn('[BigV:LegalAI] check failed:', e) }
    finally { setRunning(false) }
  }, [demoLiveMode, setLegalResult])

  const runBoth = useCallback(async () => {
    setRunning(true)
    try {
      const inputs = collectComplianceInputs(demoLiveMode)
      await new Promise(r => setTimeout(r, 500))
      setSafetyResult(runSafetyOversightCheck(inputs))
      setLegalResult(runLegalComplianceOversightCheck(inputs))
    } catch (e) { console.warn('[BigV:ComplianceAI] check failed:', e) }
    finally { setRunning(false) }
  }, [demoLiveMode, setSafetyResult, setLegalResult])

  return (
    <div className="space-y-4">
      {/* Global advisory */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-2xs text-slate-400 leading-relaxed">{ADVISORY_DISCLAIMER}</p>
      </div>

      {/* Run both button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-bold text-white">4P3X Intelligent AI™ Oversight</p>
          {lastRunAt && <p className="text-2xs text-slate-600">Last run: {tsAgo(lastRunAt)}</p>}
        </div>
        <button onClick={runBoth} disabled={running}
          className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all',
            running ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : 'border-cyan-500/20 bg-cyan-500/8 text-cyan-300 hover:bg-cyan-500/12 active:scale-95')}>
          <Icon name={running ? 'Loader2' : 'Zap'} size={13} className={running ? 'animate-spin' : ''} />
          {running ? 'Running Checks…' : 'Refresh Advisory Risk Summary'}
        </button>
      </div>

      {/* Two AI panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SafetyOversightPanel result={latestSafety} onRun={runSafety} running={running} />
        <LegalCompliancePanel result={latestLegal}  onRun={runLegal}  running={running} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// DRIVER COMPLIANCE ALERTS — driver-safe, role-restricted
// ═══════════════════════════════════════════════════════════════
export function DriverComplianceAlerts({ preTripChecklist, complianceAcknowledgement, routeAcknowledgement, gpsStatus, tripStatus, incidentReports }) {
  const alerts = []

  if (!preTripChecklist?.completedAt) {
    alerts.push({ severity: tripStatus?.status === 'started' ? 'critical' : 'high', label: 'Pre-trip checklist not completed', detail: 'Complete the pre-trip checklist before starting travel.' })
  }
  if (!complianceAcknowledgement?.acknowledged) {
    alerts.push({ severity: 'high', label: 'Compliance advisory not acknowledged', detail: 'Please read and acknowledge the compliance advisory before travel.' })
  }
  if (!routeAcknowledgement?.acknowledged && (tripStatus?.status === 'started')) {
    alerts.push({ severity: 'medium', label: 'Route not acknowledged', detail: 'Please acknowledge the assigned route before travel.' })
  }
  const gps = gpsStatus?.permission
  if (gps === 'denied' || gps === 'unavailable') {
    alerts.push({ severity: 'medium', label: `GPS ${gps}`, detail: 'GPS is unavailable. Monitor route progress manually.' })
  } else if (gps === 'unknown' || !gps) {
    alerts.push({ severity: 'info', label: 'GPS status unknown', detail: 'GPS permission not yet established.' })
  }
  if ((incidentReports || []).length > 0) {
    alerts.push({ severity: 'info', label: `${incidentReports.length} incident${incidentReports.length > 1 ? 's' : ''} submitted`, detail: 'Incident report(s) saved locally. Fleet manager and controller review required.' })
  }

  const sevColor = { critical: 'border-red-500/25 bg-red-500/5 text-red-300', high: 'border-orange-500/25 bg-orange-500/5 text-orange-300', medium: 'border-amber-500/20 bg-amber-500/5 text-amber-300', info: 'border-slate-700/40 bg-slate-900/40 text-slate-400' }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5">
        <Icon name="Info" size={11} className="text-amber-400 flex-shrink-0" />
        <p className="text-2xs text-amber-300 font-semibold">{HUMAN_VERIFICATION_REQUIRED}</p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
          <Icon name="CheckCircle" size={12} className="text-emerald-400" />
          <p className="text-xs text-emerald-300 font-medium">No immediate advisory alerts.</p>
        </div>
      ) : (
        alerts.map((a, i) => (
          <div key={i} className={clsx('flex items-start gap-2 px-3 py-2.5 rounded-lg border', sevColor[a.severity] || sevColor.info)}>
            <Icon name="AlertCircle" size={12} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">{a.label}</p>
              <p className="text-2xs opacity-70 leading-relaxed mt-0.5">{a.detail}</p>
            </div>
          </div>
        ))
      )}

      <div className="px-3 py-2 rounded-lg border border-slate-800/40 bg-slate-900/30">
        <p className="text-2xs text-slate-600 leading-relaxed">Before travelling, check current road signs, restrictions, bridge limits, permits, road conditions, vehicle suitability, and company policy. Advisory only — human verification required.</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER COMPLIANCE BLOCK — advisory exceptions + AI summary
// ═══════════════════════════════════════════════════════════════
// ── RUN 15-16: Provider Status Summary Component ─────────────
function ProviderRoutingStatus() {
  const [ghResult,  setGhResult]  = React.useState(() => getLatestGHRouteResult(null))
  const [ovpResult, setOvpResult] = React.useState(() => getLatestRestrictionResultForRoute(null))
  const ghConf    = isGraphHopperConfigured()
  const ovpConf   = !!(getLatestRestrictionResultForRoute(null)?.endpointUsed)

  if (!ghResult && !ovpResult) return (
    <div className="px-3 py-2.5 rounded-xl border border-slate-800/30 bg-slate-900/10">
      <p className="text-2xs text-slate-600">No provider route or restriction results yet. Use Route Planner on the Navigation page to generate advisory provider outputs.</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {ghResult  && <GraphHopperResultCard result={ghResult}  onClose={() => setGhResult(null)} />}
      {ovpResult && <OverpassResultCard    result={ovpResult} onClose={() => setOvpResult(null)} />}
    </div>
  )
}

export function ControllerComplianceBlock({ exceptions, safetyResult, legalResult }) {
  const safetyRisk = safetyResult?.riskLevel
  const legalRisk  = legalResult?.advisoryRiskLevel
  const sdSafety   = RISK_DISPLAY[safetyRisk] || RISK_DISPLAY.unknown
  const sdLegal    = RISK_DISPLAY[legalRisk]   || RISK_DISPLAY.unknown

  return (
    <div className="space-y-3">
      {/* AI summary strips */}
      {safetyResult && (
        <div className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl border', sdSafety.border, sdSafety.bg)}>
          <Icon name="Shield" size={13} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-bold text-white">Safety Oversight AI</p>
            <p className="text-2xs text-slate-500 truncate">{safetyResult.explanation?.slice(0,80)}…</p>
          </div>
          <RiskBadge level={safetyRisk} />
        </div>
      )}
      {legalResult && (
        <div className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl border', sdLegal.border, sdLegal.bg)}>
          <Icon name="Scale" size={13} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-bold text-white">Legal Compliance Oversight AI</p>
            <p className="text-2xs text-slate-500 truncate">{legalResult.explanation?.slice(0,80)}…</p>
          </div>
          <RiskBadge level={legalRisk} />
        </div>
      )}
      {(!safetyResult && !legalResult) && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-800/40 bg-slate-900/30">
          <Icon name="Info" size={11} className="text-slate-600" />
          <p className="text-2xs text-slate-600">Run advisory checks from the Fleet Dashboard Compliance page to see AI summaries here.</p>
        </div>
      )}
      {/* Standard exceptions */}
      {exceptions}
    </div>
  )
}

export default { SafetyOversightPanel, LegalCompliancePanel, ComplianceAIPanelPair, DriverComplianceAlerts, ControllerComplianceBlock }
