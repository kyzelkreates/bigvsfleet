/**
 * ============================================================
 * Big V's Best Routes™ — Driver Trip Panel
 * /src/modules/ap3x/DriverTripPanel.jsx
 *
 * RUN 6 — Driver PWA GPS + 3D Navigation View
 *
 * Renders all Run 6 driver journey screens as a tab panel:
 *   1. Trip Status Controls (start / pause / resume / complete)
 *   2. GPS Status Panel
 *   3. Pre-Trip Checklist
 *   4. Compliance Acknowledgement
 *   5. Incident Report Form
 *   6. Driver Notes
 *   7. Offline / Sync Status
 *   8. Driver Install Guide
 *
 * Reads from / writes to: useDriverPwaStore (Run 6 SSOT)
 * Does NOT expose admin settings, API keys, or backend credentials.
 * All saves are local/offline-safe.
 *
 * SAFETY:
 *   All outputs include advisory warnings per directive.
 *   Displayed route is advisory only.
 *   GPS accuracy can vary.
 *   Driver is responsible for checking road signs, laws, permits,
 *   restrictions, bridge limits, and road conditions.
 * ============================================================
 */

import { useState, useCallback } from 'react'
import { DriverComplianceAlerts } from './components_ui_ComplianceAIPanels'
import DriverPwaSyncStatus from './components_ui_DriverPwaSyncStatus'
import Icon from './components_ui_Icon'
import { useDriverPwaStore, useDemoLiveStore } from './core_storage'
import { GPS_PERMISSION, GPS_WARNINGS, gpsConfidenceDisplay } from './services_maps_gpsManager'

// ─── Colours / helpers ────────────────────────────────────────
const clsx = (...args) => args.filter(Boolean).join(' ')

function SectionCard({ title, icon, children, className = '' }) {
  return (
    <div className={clsx('bg-[#0d1426] border border-slate-800/60 rounded-xl overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/40">
        <Icon name={icon} size={14} className="text-slate-500" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function AdvisoryBox({ children, className = '' }) {
  return (
    <div className={clsx('flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5', className)}>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-2xs text-slate-400 leading-relaxed">{children}</p>
    </div>
  )
}

function CheckItem({ label, sub, checked, onChange, disabled }) {
  return (
    <label className={clsx(
      'flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer',
      checked
        ? 'border-emerald-500/25 bg-emerald-500/5'
        : 'border-slate-800/60 hover:border-slate-700/60'
    )}>
      <div className={clsx(
        'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
        checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-transparent'
      )}>
        {checked && <Icon name="Check" size={11} className="text-white" />}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <div>
        <p className={clsx('text-xs font-medium', checked ? 'text-emerald-300' : 'text-slate-300')}>{label}</p>
        {sub && <p className="text-2xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </label>
  )
}

// ─────────────────────────────────────────────────────────────
// 1. Trip Status Controls
// ─────────────────────────────────────────────────────────────
function TripStatusControls({ onGpsRequest, gpsPermission, profile }) {
  const tripStatus       = useDriverPwaStore(s => s.tripStatus)
  const compliance       = useDriverPwaStore(s => s.complianceAcknowledgement)
  const checklist        = useDriverPwaStore(s => s.preTripChecklist)
  const startTrip        = useDriverPwaStore(s => s.startTrip)
  const pauseTrip        = useDriverPwaStore(s => s.pauseTrip)
  const resumeTrip       = useDriverPwaStore(s => s.resumeTrip)
  const completeTrip     = useDriverPwaStore(s => s.completeTrip)
  const driverStatus     = useDriverPwaStore(s => s.driverStatus)
  const updateDriverId   = useDriverPwaStore(s => s.updateDriverIdentity)

  const [confirmComplete, setConfirmComplete] = useState(false)
  const [overrideWarn,    setOverrideWarn]    = useState(false)

  const status       = tripStatus.status
  const complianceDone = compliance.acknowledged
  const checklistDone  = checklist.completedAt != null

  // Trip can only start with compliance ack — checklist completion advised but not hard-blocked
  const canStart  = status === 'not_started' && complianceDone
  const canPause  = status === 'started'
  const canResume = status === 'paused'
  const canComplete = status === 'started' || status === 'paused'

  const handleStart = () => {
    if (!checklistDone && !overrideWarn) {
      setOverrideWarn(true)
      return
    }
    if (!complianceDone) return
    const driverId = profile?.id || profile?.driverId || null
    updateDriverId({ driverId, name: profile?.full_name || profile?.name || null })
    startTrip(null, null)
    setOverrideWarn(false)
    onGpsRequest?.()
  }

  const handleComplete = () => {
    if (!confirmComplete) { setConfirmComplete(true); return }
    completeTrip()
    setConfirmComplete(false)
  }

  const statusCfg = {
    not_started: { label: 'Not Started', dot: 'bg-slate-600', color: 'text-slate-500' },
    started:     { label: 'En Route',    dot: 'bg-emerald-400 animate-pulse', color: 'text-emerald-300' },
    paused:      { label: 'Paused',      dot: 'bg-amber-400',  color: 'text-amber-300' },
    completed:   { label: 'Completed',   dot: 'bg-violet-400', color: 'text-violet-300' },
  }
  const sc = statusCfg[status] ?? statusCfg.not_started

  return (
    <SectionCard title="Trip Status" icon="Navigation">
      <div className="space-y-4">
        {/* Status pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={clsx('inline-flex rounded-full h-2 w-2 flex-shrink-0', sc.dot)} />
            <span className={clsx('text-sm font-semibold', sc.color)}>{sc.label}</span>
          </div>
          {gpsPermission === GPS_PERMISSION.GRANTED && (
            <span className="text-2xs text-emerald-400 flex items-center gap-1">
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 animate-pulse" />
              GPS Active
            </span>
          )}
          {gpsPermission === GPS_PERMISSION.DENIED && (
            <span className="text-2xs text-amber-400">GPS Denied — Demo Route</span>
          )}
        </div>

        {/* ── RUN 9: 4P3X Driver Compliance Alerts ─────────────── */}
        <DriverComplianceAlerts
          preTripChecklist={checklist}
          complianceAcknowledgement={compliance}
          routeAcknowledgement={useDriverPwaStore.getState().routeAcknowledgement}
          gpsStatus={useDriverPwaStore.getState().gpsStatus}
          tripStatus={useDriverPwaStore.getState().tripStatus}
          incidentReports={useDriverPwaStore.getState().incidentReports}
        />

        {/* Checklist / compliance pre-checks */}
        {status === 'not_started' && (
          <div className="space-y-1.5">
            <div className={clsx('flex items-center gap-2 px-2.5 py-1.5 rounded text-2xs', checklistDone ? 'text-emerald-400' : 'text-amber-400')}>
              <Icon name={checklistDone ? 'CheckCircle' : 'AlertCircle'} size={11} />
              {checklistDone ? 'Pre-trip checklist completed' : 'Pre-trip checklist not completed — advised before travel'}
            </div>
            <div className={clsx('flex items-center gap-2 px-2.5 py-1.5 rounded text-2xs', complianceDone ? 'text-emerald-400' : 'text-red-400')}>
              <Icon name={complianceDone ? 'CheckCircle' : 'XCircle'} size={11} />
              {complianceDone ? 'Compliance acknowledged' : 'Compliance acknowledgement required to start trip'}
            </div>
          </div>
        )}

        {/* Checklist override warning */}
        {overrideWarn && (
          <div className="px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <p className="text-xs text-amber-300 font-medium mb-1">Pre-trip checklist not completed</p>
            <p className="text-2xs text-slate-400 mb-2">Completing the checklist before starting a trip is strongly advised. You may continue, but you are responsible for verifying vehicle, route, and load safety.</p>
            <div className="flex gap-2">
              <button onClick={handleStart} className="px-3 py-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 hover:bg-amber-500/20">
                Continue without checklist
              </button>
              <button onClick={() => setOverrideWarn(false)} className="px-3 py-1.5 rounded bg-slate-800/60 border border-slate-700/40 text-xs text-slate-400">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {status === 'not_started' && (
            <button
              onClick={handleStart}
              disabled={!complianceDone}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
                complianceDone
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:scale-95'
                  : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed'
              )}
            >
              <Icon name="Play" size={15} />
              Start Trip
            </button>
          )}

          {canPause && (
            <button
              onClick={pauseTrip}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/15 active:scale-95 transition-all"
            >
              <Icon name="Pause" size={15} />
              Pause
            </button>
          )}

          {canResume && (
            <button
              onClick={resumeTrip}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15 active:scale-95 transition-all"
            >
              <Icon name="Play" size={15} />
              Resume
            </button>
          )}

          {canComplete && (
            <button
              onClick={handleComplete}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95',
                confirmComplete
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300 animate-pulse'
                  : 'bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600/60'
              )}
            >
              <Icon name="CheckCircle" size={15} />
              {confirmComplete ? 'Tap again to confirm' : 'Complete Trip'}
            </button>
          )}
        </div>

        {/* Timestamps */}
        {tripStatus.startedAt && (
          <div className="space-y-1 border-t border-slate-800/40 pt-3">
            {tripStatus.startedAt  && <p className="text-2xs text-slate-600">Started: <span className="font-mono">{new Date(tripStatus.startedAt).toLocaleTimeString()}</span></p>}
            {tripStatus.pausedAt   && <p className="text-2xs text-slate-600">Paused:  <span className="font-mono">{new Date(tripStatus.pausedAt).toLocaleTimeString()}</span></p>}
            {tripStatus.completedAt && <p className="text-2xs text-slate-600">Completed: <span className="font-mono">{new Date(tripStatus.completedAt).toLocaleTimeString()}</span></p>}
          </div>
        )}

        <AdvisoryBox>
          Displayed route is advisory only. GPS accuracy can vary. Driver updates are saved locally/offline-safe in this run. Real dashboard/PWA backend sync is completed in the later PWA sync run.
        </AdvisoryBox>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 2. GPS Status Panel
// ─────────────────────────────────────────────────────────────
function GpsStatusPanel({ gpsPermission, accuracy, onRequestGps }) {
  const gpsStatus   = useDriverPwaStore(s => s.gpsStatus)
  const confidence  = gpsConfidenceDisplay(gpsStatus.confidence)

  const permCfg = {
    [GPS_PERMISSION.UNKNOWN]:     { label: 'Not requested',    color: 'text-slate-500',   dot: 'bg-slate-600' },
    [GPS_PERMISSION.REQUESTING]:  { label: 'Requesting…',      color: 'text-cyan-300',    dot: 'bg-cyan-400 animate-pulse' },
    [GPS_PERMISSION.GRANTED]:     { label: 'GPS Active',       color: 'text-emerald-300', dot: 'bg-emerald-400 animate-pulse' },
    [GPS_PERMISSION.DENIED]:      { label: 'Permission Denied', color: 'text-red-300',    dot: 'bg-red-400' },
    [GPS_PERMISSION.UNAVAILABLE]: { label: 'GPS Unavailable',  color: 'text-slate-500',   dot: 'bg-slate-600' },
    [GPS_PERMISSION.ERROR]:       { label: 'GPS Error',        color: 'text-red-300',     dot: 'bg-red-400' },
    [GPS_PERMISSION.STOPPED]:     { label: 'GPS Stopped',      color: 'text-slate-500',   dot: 'bg-slate-600' },
  }
  const pc = permCfg[gpsPermission] ?? permCfg[GPS_PERMISSION.UNKNOWN]

  return (
    <SectionCard title="GPS Status" icon="Crosshair">
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <span className={clsx('inline-flex rounded-full h-2 w-2 flex-shrink-0', pc.dot)} />
            <span className={clsx('text-sm font-semibold', pc.color)}>{pc.label}</span>
          </div>
          {accuracy != null && (
            <span className="text-2xs text-slate-500 font-mono">±{accuracy}m</span>
          )}
        </div>

        {/* Confidence row */}
        {gpsPermission === GPS_PERMISSION.GRANTED && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', confidence.dot)} />
            <span className={clsx('text-2xs', confidence.color)}>{confidence.label}</span>
          </div>
        )}

        {/* Permission states */}
        {gpsPermission === GPS_PERMISSION.UNKNOWN && (
          <div className="space-y-2">
            <p className="text-2xs text-slate-500">GPS permission has not been requested yet.</p>
            <button
              onClick={onRequestGps}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-sm text-violet-300 hover:bg-violet-500/15 active:scale-95 transition-all font-medium"
            >
              <Icon name="Crosshair" size={14} />
              Use My Current Location
            </button>
          </div>
        )}

        {gpsPermission === GPS_PERMISSION.REQUESTING && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Icon name="Loader2" size={13} className="animate-spin text-cyan-400" />
            Requesting GPS permission…
          </div>
        )}

        {gpsPermission === GPS_PERMISSION.DENIED && (
          <div className="space-y-2">
            <p className="text-2xs text-red-400/80">{GPS_WARNINGS.denied}</p>
            <p className="text-2xs text-slate-600">To enable location: open browser settings → Site Settings → Location → Allow for this site. Then reload the page.</p>
            <button
              onClick={onRequestGps}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Icon name="RefreshCw" size={12} />
              Try again
            </button>
          </div>
        )}

        {gpsPermission === GPS_PERMISSION.UNAVAILABLE && (
          <div className="space-y-1">
            <p className="text-2xs text-amber-400/80">{GPS_WARNINGS.unavailable}</p>
            <p className="text-2xs text-slate-600">Demo/manual route view remains active. You can still use Big V's Best Routes™ without GPS.</p>
          </div>
        )}

        {gpsPermission === GPS_PERMISSION.GRANTED && (
          <div className="space-y-1.5">
            {gpsStatus.lastUpdatedAt && (
              <p className="text-2xs text-slate-600">Updated: <span className="font-mono">{new Date(gpsStatus.lastUpdatedAt).toLocaleTimeString()}</span></p>
            )}
            <button
              onClick={onRequestGps}
              className="text-2xs text-slate-600 hover:text-slate-400 underline transition-colors"
            >
              Recenter on current location
            </button>
          </div>
        )}

        <AdvisoryBox>{GPS_WARNINGS.general}</AdvisoryBox>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 3. Pre-Trip Checklist
// ─────────────────────────────────────────────────────────────
function PreTripChecklist() {
  const checklist       = useDriverPwaStore(s => s.preTripChecklist)
  const updateChecklist = useDriverPwaStore(s => s.updateChecklist)
  const completeChecklist = useDriverPwaStore(s => s.completeChecklist)
  const resetChecklist  = useDriverPwaStore(s => s.resetChecklist)
  const [notes, setNotes] = useState(checklist.notes || '')

  const items = [
    { key: 'vehicleChecked',          label: 'Vehicle inspected', sub: 'Lights, tyres, fluids, mirrors, horn, wipers' },
    { key: 'routeReviewed',           label: 'Route reviewed', sub: 'Aware of route, stops, distance, time estimate' },
    { key: 'restrictionsReviewed',    label: 'Restrictions reviewed', sub: 'Height, width, weight, hazmat, bridge limits, access rules — verified manually' },
    { key: 'loadChecked',             label: 'Load checked', sub: 'Load secured, weight limits complied with, manifest reviewed' },
    { key: 'safetyEquipmentChecked',  label: 'Safety equipment checked', sub: 'Hi-vis, first aid, fire extinguisher, warning triangles' },
    { key: 'notesReviewed',           label: 'Job/delivery notes reviewed', sub: 'Special instructions, access codes, contact details' },
    { key: 'companyPolicyAcknowledged', label: 'Company policy acknowledged', sub: 'Driving policy, shift hours, break requirements' },
  ]

  const allDone = items.every(i => checklist[i.key])
  const doneCnt = items.filter(i => checklist[i.key]).length

  const handleComplete = () => {
    updateChecklist({ notes })
    completeChecklist()
  }

  return (
    <SectionCard title="Pre-Trip Checklist" icon="ClipboardCheck">
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-2xs text-slate-500">{doneCnt}/{items.length} completed</p>
          {checklist.completedAt ? (
            <span className="text-2xs text-emerald-400 flex items-center gap-1">
              <Icon name="CheckCircle" size={10} />
              Completed {new Date(checklist.completedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>

        <div className="space-y-2">
          {items.map(({ key, label, sub }) => (
            <CheckItem
              key={key}
              label={label}
              sub={sub}
              checked={!!checklist[key]}
              onChange={e => updateChecklist({ [key]: e.target.checked })}
            />
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Checklist Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional vehicle or route notes…"
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:border-slate-500 focus:outline-none resize-none h-20"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleComplete}
            disabled={!allDone}
            className={clsx(
              'flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all',
              allDone
                ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed'
            )}
          >
            {checklist.completedAt ? '✓ Checklist Saved' : 'Save & Mark Complete'}
          </button>
          <button
            onClick={resetChecklist}
            className="px-3 py-2.5 rounded-lg text-xs text-slate-600 hover:text-slate-300 border border-slate-800/60 bg-slate-900/40 transition-colors"
          >
            Reset
          </button>
        </div>

        <AdvisoryBox>
          Checking each item does not guarantee legal route compliance. Drivers must verify restrictions, signage, permits, bridge limits, and road conditions independently.
        </AdvisoryBox>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 4. Compliance Acknowledgement
// ─────────────────────────────────────────────────────────────
function ComplianceAcknowledgement({ profile }) {
  const ack           = useDriverPwaStore(s => s.complianceAcknowledgement)
  const acknowledgeCompliance = useDriverPwaStore(s => s.acknowledgeCompliance)
  const resetAck      = useDriverPwaStore(s => s.resetComplianceAck)
  const [checked, setChecked] = useState(false)

  const handleAck = () => {
    if (!checked) return
    acknowledgeCompliance(profile?.id || null, null)
  }

  return (
    <SectionCard title="Compliance Acknowledgement" icon="ShieldCheck">
      <div className="space-y-3">
        {ack.acknowledged ? (
          <div className="flex items-start gap-3 px-3 py-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <Icon name="CheckCircle" size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">Acknowledged</p>
              <p className="text-2xs text-slate-500 mt-0.5">{new Date(ack.acknowledgedAt).toLocaleString()}</p>
              <p className="text-2xs text-slate-600 mt-1 leading-relaxed">{ack.message}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="px-3 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{ack.message}</p>
            </div>
            <label className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-700/60 hover:border-slate-600/60 cursor-pointer transition-colors">
              <div className={clsx(
                'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                checked ? 'bg-violet-500 border-violet-500' : 'border-slate-600'
              )}>
                {checked && <Icon name="Check" size={11} className="text-white" />}
              </div>
              <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="sr-only" />
              <p className="text-xs text-slate-400">I have read and I understand the above statement.</p>
            </label>
            <button
              onClick={handleAck}
              disabled={!checked}
              className={clsx(
                'w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                checked
                  ? 'bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20'
                  : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed'
              )}
            >
              Acknowledge & Continue
            </button>
          </div>
        )}

        {ack.acknowledged && (
          <button onClick={resetAck} className="text-2xs text-slate-700 hover:text-slate-500 underline transition-colors">
            Reset acknowledgement (for new trip)
          </button>
        )}

        <p className="text-2xs text-slate-700 text-center">
          This acknowledgement does not create a legal guarantee of route compliance.
        </p>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 5. Incident Report Form
// ─────────────────────────────────────────────────────────────
function IncidentReportForm({ routeId, currentPos, isDemo }) {
  const addIncident   = useDriverPwaStore(s => s.addIncidentReport)
  const incidents     = useDriverPwaStore(s => s.incidentReports)
  const tripStatus    = useDriverPwaStore(s => s.tripStatus)
  const [showForm, setShowForm] = useState(false)
  const [type,     setType]     = useState('other')
  const [desc,     setDesc]     = useState('')
  const [severity, setSeverity] = useState('medium')
  const [saved,    setSaved]    = useState(false)

  const TYPES = [
    { value: 'road_restriction', label: 'Road restriction concern' },
    { value: 'bridge_concern',   label: 'Bridge/height/weight concern' },
    { value: 'access_issue',     label: 'Access issue' },
    { value: 'route_blocked',    label: 'Route blocked' },
    { value: 'gps_map_issue',    label: 'GPS/map issue' },
    { value: 'vehicle_issue',    label: 'Vehicle issue' },
    { value: 'safety_concern',   label: 'Safety concern' },
    { value: 'delivery_note',    label: 'Delivery/access note' },
    { value: 'other',            label: 'Other' },
  ]

  const handleSubmit = () => {
    if (!desc.trim()) return
    addIncident({
      type, description: desc.trim(), severity, routeId,
      location: currentPos ? { lat: currentPos[0], lng: currentPos[1] } : null,
      tripId: tripStatus.tripId,
      isDemo,
    })
    setDesc('')
    setType('other')
    setSeverity('medium')
    setSaved(true)
    setShowForm(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <SectionCard title="Incident Report" icon="AlertTriangle">
      <div className="space-y-3">
        {saved && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs">
            <Icon name="CheckCircle" size={11} />
            Incident report saved locally.
          </div>
        )}

        {!showForm ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 text-sm text-amber-300 hover:bg-amber-500/12 transition-colors font-medium"
            >
              <Icon name="Plus" size={14} />
              Report an Incident / Concern
            </button>

            {incidents.length > 0 && (
              <div>
                <p className="text-2xs text-slate-600 mb-2 uppercase tracking-wider font-semibold">Recent Reports</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-none">
                  {incidents.slice(0, 5).map(inc => (
                    <div key={inc.id} className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-slate-900/40 border border-slate-800/40">
                      <span className={clsx('text-2xs font-mono mt-0.5', inc.severity === 'high' ? 'text-red-400' : inc.severity === 'medium' ? 'text-amber-400' : 'text-slate-500')}>
                        {inc.severity.toUpperCase()}
                      </span>
                      <div>
                        <p className="text-2xs text-slate-400 line-clamp-1">{inc.description}</p>
                        <p className="text-2xs text-slate-700">{new Date(inc.timestamp).toLocaleTimeString()}</p>
                      </div>
                      {inc.isDemo && <span className="ml-auto text-2xs text-violet-500">Demo</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Incident Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-500">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Severity</label>
              <div className="flex gap-2">
                {['low','medium','high'].map(s => (
                  <button key={s} onClick={() => setSeverity(s)}
                    className={clsx('flex-1 py-1.5 rounded text-2xs font-semibold border transition-colors', severity === s
                      ? s === 'high' ? 'bg-red-500/15 border-red-500/30 text-red-300'
                        : s === 'medium' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-slate-700/60 border-slate-600/60 text-slate-300'
                      : 'bg-slate-900/40 border-slate-800/40 text-slate-600')}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Describe the incident or concern…"
                className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-slate-500 resize-none h-24" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={!desc.trim()}
                className={clsx('flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all', desc.trim()
                  ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed')}>
                Save Incident
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-3 py-2.5 rounded-lg text-xs text-slate-600 hover:text-slate-400 border border-slate-800/60 bg-slate-900/40 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-2xs text-slate-700">
          Incident reports saved locally. {isDemo && 'Demo mode — not real incident data. '}
          Sync to dashboard in a later run.
        </p>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 6. Driver Notes
// ─────────────────────────────────────────────────────────────
function DriverNotes({ routeId }) {
  const addNote = useDriverPwaStore(s => s.addDriverNote)
  const notes   = useDriverPwaStore(s => s.driverNotes)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!text.trim()) return
    addNote(text.trim(), routeId || null)
    setText('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <SectionCard title="Driver Notes" icon="FileText">
      <div className="space-y-3">
        {saved && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs">
            <Icon name="CheckCircle" size={11} />
            Note saved locally.
          </div>
        )}
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a route, delivery, or trip note…"
            className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-slate-500 resize-none h-20" />
          <button onClick={handleSave} disabled={!text.trim()}
            className={clsx('w-full py-2 rounded-lg text-xs font-semibold transition-all', text.trim()
              ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/15'
              : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed')}>
            Save Note
          </button>
        </div>
        {notes.length > 0 && (
          <div className="max-h-40 overflow-y-auto scrollbar-none space-y-1.5">
            {notes.slice(0, 10).map(n => (
              <div key={n.id} className="px-2.5 py-2 rounded bg-slate-900/40 border border-slate-800/40">
                <p className="text-xs text-slate-300 leading-relaxed">{n.text}</p>
                <p className="text-2xs text-slate-700 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-2xs text-slate-700">Notes saved locally. Sync in a later run.</p>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 7. Offline / Sync Status
// ─────────────────────────────────────────────────────────────
function SyncStatusSection({ backendStatus }) {
  // RUN 12: DriverPwaSyncStatus handles live backend status
  // Original local-only UI preserved below as fallback
  const syncStatus  = useDriverPwaStore(s => s.syncStatus)
  const [showFull, setShowFull] = React.useState(false)
  const demoMode    = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const isOffline   = useDemoLiveStore(s => s.offlineStatus?.isOffline ?? false)

  const isLive = demoMode === 'live'

  return (
    <SectionCard title="Offline / Sync Status" icon="Wifi">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Mode', value: demoMode === 'demo' ? 'Demo Mode' : 'Live Mode', highlight: isLive },
            { label: 'Save mode', value: 'Local / Offline-safe', highlight: false },
            { label: 'Connection', value: isOffline ? 'Offline' : backendStatus === 'connected' ? 'Connected' : 'Checking…', highlight: !isOffline && backendStatus === 'connected' },
            { label: 'Backend', value: syncStatus.backendConfigured ? 'Configured' : 'Not configured', highlight: syncStatus.backendConfigured },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="px-2.5 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <p className="text-2xs text-slate-600 mb-0.5">{label}</p>
              <p className={clsx('text-xs font-medium', highlight ? 'text-emerald-300' : 'text-slate-400')}>{value}</p>
            </div>
          ))}
        </div>

        {syncStatus.lastLocalSaveAt && (
          <p className="text-2xs text-slate-600">
            Last saved: <span className="font-mono">{new Date(syncStatus.lastLocalSaveAt).toLocaleTimeString()}</span>
          </p>
        )}

        {isLive && !syncStatus.backendConfigured && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <Icon name="AlertCircle" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-2xs text-amber-400/80">
              Live Mode is selected but backend provider is not configured. Driver updates are saved locally only. Configure the backend in Backend Settings (admin) to enable live sync.
            </p>
          </div>
        )}

        <AdvisoryBox>
          Driver updates are saved locally/offline-safe in this run. Real dashboard/PWA backend sync is completed in the later PWA sync run. Demo Mode shows the product. Live Mode runs the product.
        </AdvisoryBox>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// 8. Driver Install Guide
// ─────────────────────────────────────────────────────────────
function DriverInstallGuide() {
  const [expanded, setExpanded] = useState(null)

  const platforms = [
    {
      id: 'android',
      name: 'Android (Chrome)',
      icon: 'Smartphone',
      steps: [
        'Open the Driver PWA link in Chrome on your Android device.',
        'Tap the ⋮ menu (three dots) in the top-right corner.',
        'Tap "Add to Home Screen" or "Install app".',
        'Confirm the install prompt.',
        'The Big V\'s Best Routes™ Driver app icon will appear on your home screen.',
      ],
    },
    {
      id: 'ios',
      name: 'iPhone / iPad (Safari)',
      icon: 'Apple',
      steps: [
        'Open the Driver PWA link in Safari on your iPhone or iPad.',
        'Tap the Share button (square with an arrow at the bottom of the screen).',
        'Scroll down and tap "Add to Home Screen".',
        'Tap "Add" to confirm.',
        'The Big V\'s Best Routes™ Driver app icon will appear on your home screen.',
      ],
    },
    {
      id: 'desktop',
      name: 'Desktop (Chrome / Edge)',
      icon: 'Monitor',
      steps: [
        'Open the Driver PWA link in Chrome or Edge on your desktop or laptop.',
        'Look for the install icon in the address bar (computer with arrow), or use the browser menu.',
        'Click "Install app" or "Install Big V\'s Best Routes™ Driver".',
        'Confirm the install prompt.',
        'The app opens as a standalone window and can be launched from your taskbar or desktop.',
      ],
    },
  ]

  return (
    <SectionCard title="Install Driver App" icon="Download">
      <div className="space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          Big V's Best Routes™ Driver app is a Progressive Web App (PWA). Install it on your device for offline access and a full-screen navigation experience.
        </p>

        <div className="space-y-2">
          {platforms.map(p => (
            <div key={p.id} className="rounded-lg border border-slate-800/60 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/40 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon name={p.icon} size={13} className="text-slate-500" />
                  <span className="text-xs font-medium text-slate-300">{p.name}</span>
                </div>
                <Icon name={expanded === p.id ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-slate-600" />
              </button>
              {expanded === p.id && (
                <div className="px-3 py-3 bg-slate-950/40 space-y-1.5">
                  {p.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-2xs text-violet-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-2xs text-slate-400 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-2xs text-slate-700">
          Note: The fleet dashboard cannot remotely install the PWA onto another device. Each driver installs independently using the steps above. Remote deployment tools are available in a later run.
        </p>
      </div>
    </SectionCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Main: DriverTripPanel
// ─────────────────────────────────────────────────────────────
const PANEL_TABS = [
  { key: 'trip',      label: 'Trip',      icon: 'Navigation' },
  { key: 'checklist', label: 'Checklist', icon: 'ClipboardCheck' },
  { key: 'incident',  label: 'Incident',  icon: 'AlertTriangle' },
  { key: 'notes',     label: 'Notes',     icon: 'FileText' },
  { key: 'sync',      label: 'Sync',      icon: 'Wifi' },
  { key: 'install',   label: 'Install',   icon: 'Download' },
]

export default function DriverTripPanel({
  gpsPermission = GPS_PERMISSION.UNKNOWN,
  accuracy      = null,
  currentPos    = null,
  onRequestGps  = () => {},
  profile       = null,
  backendStatus = 'unknown',
  routeId       = null,
  isDemo        = false,
}) {
  const [panel, setPanel] = useState('trip')

  const compliance = useDriverPwaStore(s => s.complianceAcknowledgement)
  const tripStatus = useDriverPwaStore(s => s.tripStatus)
  const checklist  = useDriverPwaStore(s => s.preTripChecklist)

  // Badge logic
  const needsCompliance = !compliance.acknowledged
  const needsChecklist  = !checklist.completedAt
  const hasIncidents    = useDriverPwaStore(s => s.incidentReports.length > 0)

  return (
    <div className="flex flex-col h-full bg-[#060b18]">
      {/* Sub-tab bar */}
      <div className="flex border-b border-slate-800/60 flex-shrink-0 bg-[#0a1020] overflow-x-auto scrollbar-none">
        {PANEL_TABS.map(t => {
          const hasBadge =
            (t.key === 'checklist' && needsChecklist) ||
            (t.key === 'trip' && needsCompliance)
          return (
            <button
              key={t.key}
              onClick={() => setPanel(t.key)}
              className={clsx(
                'flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider transition-colors border-b-2 relative',
                panel === t.key
                  ? 'text-violet-400 border-violet-400 bg-violet-500/5'
                  : 'text-slate-600 border-transparent hover:text-slate-400'
              )}
            >
              <Icon name={t.icon} size={11} />
              {t.label}
              {hasBadge && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {panel === 'trip' && (
          <>
            <TripStatusControls onGpsRequest={onRequestGps} gpsPermission={gpsPermission} profile={profile} />
            <GpsStatusPanel gpsPermission={gpsPermission} accuracy={accuracy} onRequestGps={onRequestGps} />
            <ComplianceAcknowledgement profile={profile} />
          </>
        )}
        {panel === 'checklist' && <PreTripChecklist />}
        {panel === 'incident' && <IncidentReportForm routeId={routeId} currentPos={currentPos} isDemo={isDemo} />}
        {panel === 'notes' && <DriverNotes routeId={routeId} />}
        {panel === 'sync' && <SyncStatusSection backendStatus={backendStatus} />}
        {panel === 'install' && <DriverInstallGuide />}
      </div>
    </div>
  )
}
