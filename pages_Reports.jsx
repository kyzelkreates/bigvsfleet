/**
 * ============================================================
 * Big V's Best Routes™ — Reports & Evidence Centre
 * /src/pages/Reports.jsx
 *
 * RUN 10 — Production Polish + Validation + Deployment Readiness
 *
 * Provides advisory evidence summary, system readiness report,
 * and structured export-ready summary objects.
 *
 * ADVISORY:
 *   All outputs are advisory only and evidence-preserving.
 *   No report confirms legal compliance.
 *   No route is approved as legally certified.
 *   Drivers, fleet managers, and controllers remain responsible.
 *
 * SECURITY:
 *   No API keys. No backend secrets.
 *   Reads: useComplianceAIStore, useDemoLiveStore,
 *          Driver PWA + Controller PWA SSOT (localStorage snapshot).
 * ============================================================
 */

import React, { useState, useCallback } from 'react'
import Icon from './components_ui_Icon'
import { useComplianceAIStore, useDemoLiveStore, usePwaDeployStore } from './core_storage'
import { collectDashboardSyncPayload } from './services_sync_syncManager'
import { ADVISORY_DISCLAIMER, HUMAN_VERIFICATION_REQUIRED, NO_GUARANTEE, RISK_DISPLAY } from './intel_bigv_complianceEngine'

const clsx = (...a) => a.filter(Boolean).join(' ')
const now  = () => new Date().toISOString()
const tsAgo = (ts) => { if (!ts) return '—'; const m=Math.round((Date.now()-new Date(ts).getTime())/60000); if(m<1) return 'just now'; if(m<60) return `${m}m ago`; const h=Math.round(m/60); return h<24?`${h}h ago`:`${Math.round(h/24)}d ago` }

function AdvisoryBox({ children }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-xs text-slate-400 leading-relaxed">{children}</p>
    </div>
  )
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-[#0d1426] border border-slate-800/60 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-800/40">
        <Icon name={icon} size={14} className="text-slate-500" />
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function RiskBadge({ level }) {
  const d = RISK_DISPLAY[level] || RISK_DISPLAY.unknown
  return (
    <span className={clsx('flex items-center gap-1.5 text-xs font-bold', d.color)}>
      <span className={clsx('inline-flex rounded-full h-2 w-2 flex-shrink-0', d.dot)} />
      {d.label}
    </span>
  )
}

function KVRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-800/30 last:border-0">
      <span className="text-2xs text-slate-600 flex-shrink-0">{label}</span>
      <span className={clsx('text-2xs text-right', mono ? 'text-cyan-400 font-mono' : 'text-slate-300')}>{value ?? '—'}</span>
    </div>
  )
}

export default function Reports() {
  const [snapshot,   setSnapshot]   = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied,     setCopied]     = useState(false)

  const demoLiveMode    = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const backendReadiness = useDemoLiveStore(s => s.backendReadiness)
  const latestSafety    = useComplianceAIStore(s => s.safetyResults?.[0] || null)
  const latestLegal     = useComplianceAIStore(s => s.legalResults?.[0]  || null)
  const deployStore     = usePwaDeployStore(s => ({ profiles: s.generatedProfiles, syncAll: s.syncAll, offlineQueue: s.offlineQueue }))

  const generate = useCallback(async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 500))
    const payload = collectDashboardSyncPayload()
    const report = {
      id:            `rpt-${Date.now()}`,
      title:         "Big V's Best Routes™ — Advisory Evidence & System Report",
      generatedAt:   now(),
      mode:          demoLiveMode,
      isDemo:        demoLiveMode === 'demo',
      backendProvider: backendReadiness?.provider || 'none',
      backendStatus:   backendReadiness?.backendStatus || 'not_configured',
      safetyAdvisory:  latestSafety ? {
        riskLevel:     latestSafety.riskLevel,
        confidence:    latestSafety.confidenceScore,
        missingData:   latestSafety.missingData,
        warnings:      latestSafety.warnings?.length || 0,
        generatedAt:   latestSafety.generatedAt,
        isDemo:        latestSafety.isDemo,
      } : null,
      legalAdvisory: latestLegal ? {
        riskLevel:     latestLegal.advisoryRiskLevel,
        confidence:    latestLegal.confidenceScore,
        missingData:   latestLegal.missingLegalCriticalData,
        restrictionConcerns: latestLegal.routeRestrictionConcerns?.length || 0,
        generatedAt:   latestLegal.generatedAt,
        isDemo:        latestLegal.isDemo,
      } : null,
      driverPwa:      payload.driverPwa,
      controllerPwa:  payload.controllerPwa,
      deploymentProfiles: deployStore.profiles?.length || 0,
      offlineQueue:   deployStore.offlineQueue?.length || 0,
      systemRun:      'Run 10 — Production Polish + Validation + Deployment Readiness',
      disclaimer:     ADVISORY_DISCLAIMER,
      noGuarantee:    NO_GUARANTEE,
      advisoryOnly:   true,
    }
    setSnapshot(report)
    setGenerating(false)
  }, [demoLiveMode, backendReadiness, latestSafety, latestLegal])

  const copyReport = useCallback(async () => {
    if (!snapshot) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setCopied(false)
    }
  }, [snapshot])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bold text-xl text-white">Reports & Evidence Centre</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Big V's Best Routes™ · 4P3X Intelligent AI™ Created by Kyzel Kreates™ · Advisory only
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium', demoLiveMode === 'demo' ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300')}>
              <Icon name={demoLiveMode === 'demo' ? 'Eye' : 'Radio'} size={11} />
              {demoLiveMode === 'demo' ? 'Demo Mode' : 'Live Mode'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <AdvisoryBox>
          {ADVISORY_DISCLAIMER} All reports are advisory evidence summaries only. {NO_GUARANTEE} Production export, legal evidence packs, and PDF generation belong to a future run.
        </AdvisoryBox>

        {/* Generate button */}
        <SectionCard title="Generate Advisory Report" icon="FileText">
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates a structured advisory evidence summary from current SSOT state (Driver PWA, Controller PWA, AI advisory outputs, sync status, deployment records). Advisory only — does not confirm legal compliance.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button onClick={generate} disabled={generating}
                className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                  generating ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                             : 'border-cyan-500/20 bg-cyan-500/8 text-cyan-300 hover:bg-cyan-500/12 active:scale-95')}>
                <Icon name={generating ? 'Loader2' : 'Zap'} size={14} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generating…' : 'Generate Advisory Report'}
              </button>
              {snapshot && (
                <button onClick={copyReport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 text-sm text-slate-300 hover:text-white transition-colors">
                  <Icon name={copied ? 'CheckCircle' : 'Copy'} size={14} className={copied ? 'text-emerald-400' : ''} />
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              )}
            </div>
            <p className="text-2xs text-slate-700">{HUMAN_VERIFICATION_REQUIRED} · Production PDF/export belongs to a future run.</p>
          </div>
        </SectionCard>

        {/* Report output */}
        {snapshot && (
          <div className="space-y-4">
            <SectionCard title="Report Summary" icon="ClipboardList">
              <div className="space-y-1">
                <KVRow label="Report ID"      value={snapshot.id}            mono />
                <KVRow label="Generated"      value={new Date(snapshot.generatedAt).toLocaleString()} />
                <KVRow label="Mode"           value={snapshot.mode === 'demo' ? 'Demo Mode — local/demo data only' : 'Live Mode'} />
                <KVRow label="Backend"        value={snapshot.backendProvider === 'none' ? 'None — local/offline only' : snapshot.backendProvider} />
                <KVRow label="System Run"     value={snapshot.systemRun} />
                <KVRow label="Advisory Only"  value="Yes — no legal compliance guaranteed" />
              </div>
            </SectionCard>

            {/* AI advisory summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Safety Oversight AI" icon="Shield">
                {snapshot.safetyAdvisory ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Advisory Risk</p>
                      <RiskBadge level={snapshot.safetyAdvisory.riskLevel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Confidence</p>
                      <p className="text-xs font-bold text-white">{snapshot.safetyAdvisory.confidence}%</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Warnings</p>
                      <p className="text-xs text-amber-300">{snapshot.safetyAdvisory.warnings}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Missing data items</p>
                      <p className="text-xs text-amber-300">{snapshot.safetyAdvisory.missingData?.length || 0}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Generated</p>
                      <p className="text-2xs text-slate-500">{tsAgo(snapshot.safetyAdvisory.generatedAt)}</p>
                    </div>
                    {snapshot.safetyAdvisory.isDemo && <span className="text-2xs text-violet-400">Demo advisory output</span>}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-600">No safety check run yet.</p>
                    <a href="/#/compliance" className="text-2xs text-violet-400 hover:text-violet-300 mt-1 inline-block">Run advisory checks →</a>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Legal Compliance Oversight AI" icon="Scale">
                {snapshot.legalAdvisory ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Advisory Risk</p>
                      <RiskBadge level={snapshot.legalAdvisory.riskLevel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Confidence</p>
                      <p className="text-xs font-bold text-white">{snapshot.legalAdvisory.confidence}%</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Restriction concerns</p>
                      <p className="text-xs text-amber-300">{snapshot.legalAdvisory.restrictionConcerns}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Missing legal-critical</p>
                      <p className="text-xs text-amber-300">{snapshot.legalAdvisory.missingData?.length || 0}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-slate-600">Generated</p>
                      <p className="text-2xs text-slate-500">{tsAgo(snapshot.legalAdvisory.generatedAt)}</p>
                    </div>
                    {snapshot.legalAdvisory.isDemo && <span className="text-2xs text-violet-400">Demo advisory output</span>}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-600">No legal compliance check run yet.</p>
                    <a href="/#/compliance" className="text-2xs text-violet-400 hover:text-violet-300 mt-1 inline-block">Run advisory checks →</a>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Driver + Controller reads */}
            <SectionCard title="PWA Data Snapshot" icon="Activity">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold mb-2">Driver PWA</p>
                  {snapshot.driverPwa?.available ? (
                    <div className="space-y-1">
                      <KVRow label="Status"    value={snapshot.driverPwa.driverStatus?.status || '—'} />
                      <KVRow label="Trip"      value={snapshot.driverPwa.tripStatus?.status || '—'} />
                      <KVRow label="GPS"       value={snapshot.driverPwa.gpsStatus?.permission || '—'} />
                      <KVRow label="Checklist" value={snapshot.driverPwa.preTripChecklist?.completedAt ? 'Completed' : 'Not completed'} />
                      <KVRow label="Incidents" value={`${snapshot.driverPwa.incidentReports?.length || 0}`} />
                    </div>
                  ) : <p className="text-xs text-slate-600">{snapshot.driverPwa?.reason || 'No Driver PWA data yet.'}</p>}
                </div>
                <div>
                  <p className="text-2xs text-slate-600 uppercase tracking-wider font-semibold mb-2">Controller PWA</p>
                  {snapshot.controllerPwa?.available ? (
                    <div className="space-y-1">
                      <KVRow label="Actions" value={`${snapshot.controllerPwa.controllerActions?.length || 0}`} />
                      <KVRow label="Notes"   value={`${snapshot.controllerPwa.controllerNotes?.length || 0}`} />
                      <KVRow label="Reviewed" value={`${Object.keys(snapshot.controllerPwa.reviewedItems || {}).length}`} />
                      <KVRow label="Flagged" value={`${Object.keys(snapshot.controllerPwa.flaggedRoutes || {}).length}`} />
                    </div>
                  ) : <p className="text-xs text-slate-600">{snapshot.controllerPwa?.reason || 'No Controller PWA data yet.'}</p>}
                </div>
              </div>
            </SectionCard>

            {/* Raw JSON */}
            <SectionCard title="Raw Advisory Report (JSON)" icon="Code">
              <div className="space-y-2">
                <p className="text-2xs text-slate-600">Advisory evidence summary — not legally certified. Copy to use externally.</p>
                <pre className="text-2xs text-slate-400 bg-slate-950 rounded-xl p-4 overflow-x-auto max-h-60 leading-relaxed scrollbar-none font-mono">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
                <p className="text-2xs text-slate-700">{NO_GUARANTEE}</p>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Future runs notice */}
        <SectionCard title="Future Report Features" icon="Clock">
          <div className="space-y-2">
            {[
              'Run 16 — Report Export Pack / PDF Evidence Pack',
              'Run 11 — Supabase Live Backend + real trip/incident records',
              'Run 13 — Overpass restriction data in reports',
              'Run 14 — GraphHopper route compliance data in reports',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <Icon name="Clock" size={11} className="text-slate-700 flex-shrink-0 mt-0.5" />
                <p className="text-2xs text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <p className="text-center text-2xs text-slate-800 pb-2">
          Big V's Best Routes™ · Reports & Evidence Centre · Advisory only · Human verification required
        </p>
      </div>
    </div>
  )
}
