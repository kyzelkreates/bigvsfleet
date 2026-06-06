/**
 * ============================================================
 * Big V's Best Routes™ — Fleet Controller PWA
 * /src/pages/FleetControllerPwa.jsx
 *
 * RUN 7 — Fleet Controller PWA (full implementation)
 *
 * ROLE: fleet_controller — mobile/tablet oversight interface
 *
 * SCREENS:
 *   Home | Trips | Drivers | Vehicles | Compliance |
 *   Incidents | Notes | Map Preview | Sync | Install
 *
 * SAFETY:
 *   Controller monitoring is advisory only.
 *   GPS/map/status data may be delayed, incomplete, inaccurate, or offline.
 *   Controller review does not guarantee legal compliance.
 *   Drivers and fleet managers remain responsible for final decisions.
 *
 * SECURITY:
 *   No API keys. No backend secrets. No admin controls.
 *   No Google Maps. No Supabase credentials.
 *   Reads: useDriverPwaStore (Run 6), useControllerStore (Run 7),
 *          useDemoLiveStore (Run 3), useFleetStore (existing).
 *   Writes: useControllerStore (local/offline-safe only).
 * ============================================================
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import Icon from './components_ui_Icon'
import { useControllerStore, useDriverPwaStore, useDemoLiveStore, useFleetStore } from './core_storage'
import { getOsmTileUrl } from './services_maps_mapProviderManager'
import { routeToLeafletPositions, DEMO_ROUTE } from './services_maps_routeProviderManager'
import {
  getControllerViewModel, requestDriverCheckIn,
  statusLabel, severityStyle, gpsPermissionLabel, readinessStyle,
  CONTROLLER_WARNINGS,
} from './services_maps_controllerActionManager'
import { ControllerComplianceBlock } from './components_ui_ComplianceAIPanels'
import ControllerPwaSyncStatus from './components_ui_ControllerPwaSyncStatus'
import { useComplianceAIStore } from './core_storage'

// ── Fix Leaflet default marker icons ─────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const OSM_TILE = getOsmTileUrl() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// ── Utility helpers ───────────────────────────────────────────
const clsx = (...args) => args.filter(Boolean).join(' ')
const tsAgo = (ts) => {
  if (!ts) return 'Unknown'
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`
}

// ── Common components ─────────────────────────────────────────
function AdvisoryBox({ children, className = '' }) {
  return (
    <div className={clsx('flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5', className)}>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-2xs text-slate-400 leading-relaxed">{children}</p>
    </div>
  )
}

function SectionCard({ title, icon, children, badge, className = '' }) {
  return (
    <div className={clsx('bg-[#0d1426] border border-slate-800/60 rounded-xl overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/40">
        <Icon name={icon} size={13} className="text-slate-500" />
        <span className="text-sm font-semibold text-white flex-1">{title}</span>
        {badge != null && badge > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-2xs font-bold bg-amber-500/15 border border-amber-500/25 text-amber-300">{badge}</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EmptyState({ icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <Icon name={icon} size={28} className="text-slate-700" />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
      {sub && <p className="text-2xs text-slate-700 max-w-xs">{sub}</p>}
    </div>
  )
}

function StatusPill({ status }) {
  const s = statusLabel(status)
  return (
    <span className={clsx('flex items-center gap-1.5 text-2xs font-semibold', s.color)}>
      <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', s.dot)} />
      {s.label}
    </span>
  )
}

function DemoBadge({ isDemo }) {
  if (!isDemo) return null
  return <span className="px-1.5 py-0.5 rounded text-2xs bg-violet-500/10 border border-violet-500/20 text-violet-400">Demo</span>
}

// ── Action feedback hook ──────────────────────────────────────
function useActionFeedback() {
  const [feedback, setFeedback] = useState({}) // { [key]: message }
  const show = useCallback((key, msg, ms = 3000) => {
    setFeedback(f => ({ ...f, [key]: msg }))
    setTimeout(() => setFeedback(f => { const { [key]: _, ...rest } = f; return rest }), ms)
  }, [])
  return { feedback, show }
}

// ═══════════════════════════════════════════════════════════════
// 1. CONTROLLER HOME
// ═══════════════════════════════════════════════════════════════
function ControllerHome({ viewModel, demoMode, setTab, isLive, backendConfigured }) {
  const s = viewModel.summary

  const statCards = [
    { label: 'Active Trips',   value: s.activeTrips,      icon: 'Navigation',     color: 'text-emerald-300', tab: 'trips'      },
    { label: 'Active Drivers', value: s.activeDrivers,    icon: 'Users',          color: 'text-cyan-300',    tab: 'drivers'    },
    { label: 'Route Warnings', value: s.routeWarnings,    icon: 'AlertTriangle',  color: 'text-amber-300',   tab: 'compliance' },
    { label: 'Exceptions',     value: s.compExceptions,   icon: 'ShieldAlert',    color: 'text-red-300',     tab: 'compliance' },
    { label: 'Incidents',      value: s.incidents,        icon: 'Siren',          color: 'text-red-400',     tab: 'incidents'  },
    { label: 'Overdue Items',  value: s.overdueChecklists + s.overdueCheckIns, icon: 'Clock', color: 'text-orange-300', tab: 'compliance' },
  ]

  return (
    <div className="space-y-4">
      {/* Branding */}
      <div className="text-center pt-2">
        <p className="text-2xs text-slate-600 uppercase tracking-[0.18em] font-semibold">Safety &amp; Legal Compliance First Navigation</p>
        <h1 className="font-bold text-lg text-white mt-0.5">Fleet Controller PWA</h1>
        <p className="text-2xs text-slate-600 mt-0.5">4P3X Intelligent AI™ Created by Kyzel Kreates™</p>
      </div>

      {/* Demo/Live indicator */}
      <div className={clsx(
        'flex items-center justify-between px-3 py-2 rounded-lg border',
        demoMode === 'demo'
          ? 'border-violet-500/20 bg-violet-500/5'
          : backendConfigured
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : 'border-amber-500/20 bg-amber-500/5'
      )}>
        <div className="flex items-center gap-2">
          <Icon name={demoMode === 'demo' ? 'Eye' : 'Radio'} size={12} className={demoMode === 'demo' ? 'text-violet-400' : 'text-emerald-400'} />
          <span className={clsx('text-xs font-semibold', demoMode === 'demo' ? 'text-violet-300' : 'text-emerald-300')}>
            {demoMode === 'demo' ? 'Demo Mode' : 'Live Mode'}
          </span>
        </div>
        <span className="text-2xs text-slate-500">
          {demoMode === 'demo' ? 'Demo Mode shows the product.' : backendConfigured ? 'Backend configured.' : 'No backend — local only.'}
        </span>
      </div>

      {/* Advisory */}
      <AdvisoryBox>
        Controller monitoring is advisory only. GPS/map/status data may be delayed, incomplete, inaccurate, or offline. Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel.
      </AdvisoryBox>

      {/* Live mode no-backend warning */}
      {isLive && !backendConfigured && (
        <div className="px-3 py-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5">
          <p className="text-2xs text-amber-300 font-medium mb-0.5">No backend configured</p>
          <p className="text-2xs text-slate-500">{CONTROLLER_WARNINGS.noBackend}</p>
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {statCards.map(({ label, value, icon, color, tab }) => (
          <button key={label} onClick={() => setTab(tab)}
            className="flex flex-col items-start p-3 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60 transition-colors active:scale-95 text-left">
            <Icon name={icon} size={14} className={clsx(color, 'mb-1.5')} />
            <span className={clsx('text-2xl font-bold leading-none', color)}>{value}</span>
            <span className="text-2xs text-slate-600 mt-1">{label}</span>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        {[
          { label: 'View Live Trips',           icon: 'Navigation',     tab: 'trips'      },
          { label: 'Driver Status Monitor',     icon: 'Users',          tab: 'drivers'    },
          { label: 'Compliance Exceptions',     icon: 'ShieldAlert',    tab: 'compliance' },
          { label: 'Incident Review',           icon: 'AlertTriangle',  tab: 'incidents'  },
          { label: 'Controller Notes',          icon: 'FileText',       tab: 'notes'      },
          { label: 'Install Controller App',    icon: 'Download',       tab: 'install'    },
        ].map(({ label, icon, tab }) => (
          <button key={tab} onClick={() => setTab(tab)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60 transition-colors active:scale-95">
            <Icon name={icon} size={13} className="text-slate-500 flex-shrink-0" />
            <span className="text-sm text-slate-300">{label}</span>
            <Icon name="ChevronRight" size={12} className="text-slate-700 ml-auto" />
          </button>
        ))}
      </div>

      <div className="text-center text-2xs text-slate-800 pb-2">
        Big V's Best Routes™ · Human override required · Controller review does not guarantee compliance
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. LIVE TRIPS OVERVIEW
// ═══════════════════════════════════════════════════════════════
function TripsOverview({ viewModel, isLive, backendConfigured, onSelectTrip }) {
  const { trips } = viewModel

  return (
    <div className="space-y-3">
      {isLive && !backendConfigured && (
        <div className="px-3 py-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5">
          <p className="text-xs text-amber-300 font-medium mb-0.5">Live Mode — No backend configured</p>
          <p className="text-2xs text-slate-500">
            Live Mode is selected, but no backend provider is configured yet. Controller monitoring is running in local/offline-safe mode until backend sync is configured.
          </p>
        </div>
      )}

      {trips.length === 0 ? (
        <EmptyState icon="Navigation" message="No active trips" sub="No trip data found. In demo mode, demo trips will appear." />
      ) : (
        trips.map(trip => {
          const sl = statusLabel(trip.status)
          const gps = gpsPermissionLabel(trip.gpsPermission)
          return (
            <button key={trip.tripId} onClick={() => onSelectTrip(trip)}
              className="w-full text-left p-4 rounded-xl border border-slate-800/60 bg-[#0d1426] hover:border-slate-700/40 transition-colors active:scale-[0.99]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusPill status={trip.status} />
                    <DemoBadge isDemo={trip.isDemo} />
                  </div>
                  <p className="text-sm font-semibold text-white">{trip.driverName}</p>
                  <p className="text-2xs text-slate-500 mt-0.5">{trip.routeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-slate-600 font-mono">{trip.vehicleReg || '—'}</p>
                  <p className="text-2xs text-slate-700 mt-0.5">{tsAgo(trip.lastLocationAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={clsx('flex items-center gap-1 text-2xs', gps.color)}>
                  <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', gps.dot)} />
                  {gps.label}
                </span>
                {trip.gpsAccuracy && <span className="text-2xs text-slate-600 font-mono">±{trip.gpsAccuracy}m</span>}
                <span className={clsx('text-2xs', trip.checklistDone ? 'text-emerald-400' : 'text-amber-400')}>
                  {trip.checklistDone ? '✓ Checklist' : '⚠ Checklist'}
                </span>
                <span className={clsx('text-2xs', trip.complianceAck ? 'text-emerald-400' : 'text-red-400')}>
                  {trip.complianceAck ? '✓ Compliance' : '✗ Compliance'}
                </span>
                {trip.incidentCount > 0 && <span className="text-2xs text-red-400">{trip.incidentCount} incident{trip.incidentCount > 1 ? 's' : ''}</span>}
              </div>
            </button>
          )
        })
      )}

      <AdvisoryBox>Controller monitoring is advisory only. Data may be local/demo and may not reflect real-time status.</AdvisoryBox>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. ACTIVE DRIVERS
// ═══════════════════════════════════════════════════════════════
function ActiveDrivers({ viewModel, saveAction, feedback, showFeedback, demoMode }) {
  const { drivers } = viewModel
  const [expandedId, setExpandedId] = useState(null)

  const handleCheckIn = (driver) => {
    const result = requestDriverCheckIn(
      null, driver.driverId, driver.tripId || null, driver.isDemo, saveAction
    )
    showFeedback(`checkin-${driver.driverId}`, CONTROLLER_WARNINGS.checkin)
  }

  if (drivers.length === 0) {
    return <EmptyState icon="Users" message="No driver data" sub="No driver status available from local/demo state." />
  }

  return (
    <div className="space-y-3">
      {drivers.map(driver => {
        const gps = gpsPermissionLabel(driver.gpsPermission)
        const isOpen = expandedId === driver.driverId
        return (
          <div key={driver.driverId} className="rounded-xl border border-slate-800/60 bg-[#0d1426] overflow-hidden">
            <button
              onClick={() => setExpandedId(isOpen ? null : driver.driverId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Icon name="User" size={14} className="text-violet-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{driver.name}</p>
                  <DemoBadge isDemo={driver.isDemo} />
                </div>
                <StatusPill status={driver.status} />
              </div>
              <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-slate-600 flex-shrink-0" />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-800/40 pt-3">
                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Vehicle',    value: driver.vehicleReg || 'Not assigned' },
                    { label: 'Last seen',  value: tsAgo(driver.lastSeenAt) },
                    { label: 'Trip start', value: driver.tripStarted ? tsAgo(driver.tripStarted) : '—' },
                    { label: 'Incidents',  value: driver.incidentCount > 0 ? `${driver.incidentCount} reported` : 'None' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-2.5 py-2 rounded-lg bg-slate-900/40 border border-slate-800/40">
                      <p className="text-2xs text-slate-600 mb-0.5">{label}</p>
                      <p className="text-xs text-slate-300 font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Status indicators */}
                <div className="space-y-1.5">
                  <div className={clsx('flex items-center gap-2 text-2xs', gps.color)}>
                    <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', gps.dot)} />
                    {gps.label}
                    {driver.gpsAccuracy && <span className="text-slate-600 font-mono">±{driver.gpsAccuracy}m</span>}
                  </div>
                  <div className={clsx('flex items-center gap-2 text-2xs', driver.checklistDone ? 'text-emerald-400' : 'text-amber-400')}>
                    <Icon name={driver.checklistDone ? 'CheckCircle' : 'AlertCircle'} size={11} />
                    {driver.checklistDone ? 'Pre-trip checklist completed' : 'Pre-trip checklist not completed'}
                  </div>
                  <div className={clsx('flex items-center gap-2 text-2xs', driver.complianceAck ? 'text-emerald-400' : 'text-red-400')}>
                    <Icon name={driver.complianceAck ? 'ShieldCheck' : 'ShieldX'} size={11} />
                    {driver.complianceAck ? 'Compliance acknowledged' : 'Compliance acknowledgement missing'}
                  </div>
                </div>

                {/* Request check-in */}
                <div className="space-y-1">
                  <button
                    onClick={() => handleCheckIn(driver)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-cyan-500/25 bg-cyan-500/8 text-xs text-cyan-300 hover:bg-cyan-500/12 transition-colors"
                  >
                    <Icon name="Bell" size={12} />
                    Request Check-In (local)
                  </button>
                  {feedback[`checkin-${driver.driverId}`] && (
                    <p className="text-2xs text-amber-400 text-center px-2">{feedback[`checkin-${driver.driverId}`]}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <AdvisoryBox>Driver status data is from local/demo state. GPS accuracy can vary. Data may not reflect real-time status.</AdvisoryBox>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. VEHICLE READINESS
// ═══════════════════════════════════════════════════════════════
function VehicleReadiness({ viewModel }) {
  const { vehicles } = viewModel
  const [expandedId, setExpandedId] = useState(null)

  if (vehicles.length === 0) {
    return <EmptyState icon="Truck" message="No vehicle data" sub="Vehicle profiles will show here when available from fleet data or demo state." />
  }

  return (
    <div className="space-y-3">
      {vehicles.map(v => {
        const r = readinessStyle(v.readiness)
        const isOpen = expandedId === v.vehicleId
        return (
          <div key={v.vehicleId} className={clsx('rounded-xl border overflow-hidden', r.border, r.bg)}>
            <button
              onClick={() => setExpandedId(isOpen ? null : v.vehicleId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity"
            >
              <Icon name="Truck" size={16} className={r.color} />
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{v.name}</p>
                  <DemoBadge isDemo={v.isDemo} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xs text-slate-500 font-mono">{v.reg}</span>
                  <span className={clsx('text-2xs font-semibold', r.color)}>{r.label}</span>
                </div>
              </div>
              <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-slate-600 flex-shrink-0" />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Type',    value: v.type?.toUpperCase() || '—' },
                    { label: 'Driver',  value: v.assignedDriver || 'Not assigned' },
                    { label: 'Height',  value: v.heightM ? `${v.heightM}m` : '⚠ Missing' },
                    { label: 'Width',   value: v.widthM  ? `${v.widthM}m`  : '⚠ Missing' },
                    { label: 'Length',  value: v.lengthM ? `${v.lengthM}m` : '⚠ Missing' },
                    { label: 'Weight',  value: v.weightKg ? `${(v.weightKg/1000).toFixed(1)}t` : '⚠ Missing' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-2.5 py-2 rounded-lg bg-black/20 border border-white/5">
                      <p className="text-2xs text-slate-600 mb-0.5">{label}</p>
                      <p className={clsx('text-xs font-medium', value.startsWith('⚠') ? 'text-amber-400' : 'text-slate-300')}>{value}</p>
                    </div>
                  ))}
                </div>

                {v.missingFields?.length > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <Icon name="AlertCircle" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-2xs text-amber-400">Missing fields required for restriction checks: {v.missingFields.join(', ')}</p>
                  </div>
                )}

                <div className={clsx('flex items-center gap-2 text-2xs', v.checklistDone ? 'text-emerald-400' : 'text-amber-400')}>
                  <Icon name={v.checklistDone ? 'CheckCircle' : 'AlertCircle'} size={11} />
                  {v.checklistDone ? 'Vehicle checklist completed' : 'Vehicle checklist not completed'}
                </div>

                <p className="text-2xs text-slate-700">{CONTROLLER_WARNINGS.vehicle}</p>
              </div>
            )}
          </div>
        )
      })}

      <AdvisoryBox>Vehicle readiness is advisory. Data completeness depends on fleet profiles. Full compliance scoring belongs to a later run.</AdvisoryBox>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. COMPLIANCE EXCEPTIONS
// ═══════════════════════════════════════════════════════════════
function ComplianceExceptions({ viewModel, reviewedItems, markReviewed, flagRoute, flaggedRoutes, feedback, showFeedback }) {
  const exceptions = viewModel.complianceExceptions
  const overdue    = [...(viewModel.overdueChecklists || []), ...(viewModel.overdueCheckIns || [])]

  const allItems = [...exceptions, ...overdue.map(o => ({
    id: `od-${o.driverId}-${o.type}`,
    severity: o.severity || 'watch',
    type: o.type,
    label: o.label,
    detail: `Driver: ${o.name}. Advisory — overdue based on available local timestamp.`,
    driverId: o.driverId,
    status: 'open',
    isDemo: o.isDemo,
  }))]

  if (allItems.length === 0) {
    return <EmptyState icon="ShieldCheck" message="No exceptions found" sub="No compliance exceptions in current local/demo state." />
  }

  return (
    <div className="space-y-3">
      {allItems.map(exc => {
        const sev = severityStyle(exc.severity)
        const isReviewed = !!reviewedItems[exc.id]
        return (
          <div key={exc.id} className={clsx('rounded-xl border p-4 space-y-3', isReviewed ? 'border-slate-800/40 bg-slate-900/20 opacity-60' : clsx(sev.border, sev.bg))}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={clsx('text-2xs font-bold', sev.text)}>{sev.label}</span>
                  <DemoBadge isDemo={exc.isDemo} />
                  {isReviewed && <span className="text-2xs text-emerald-400">✓ Reviewed</span>}
                </div>
                <p className="text-xs font-semibold text-white">{exc.label}</p>
                <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">{exc.detail}</p>
                {isReviewed && reviewedItems[exc.id]?.reviewedAt && (
                  <p className="text-2xs text-slate-700 mt-0.5">Reviewed {tsAgo(reviewedItems[exc.id].reviewedAt)}</p>
                )}
              </div>
            </div>

            {!isReviewed && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { markReviewed(exc.id, null, ''); showFeedback(`rev-${exc.id}`, 'Marked reviewed locally.') }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-2xs text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                >
                  <Icon name="Check" size={10} />
                  Mark Reviewed
                </button>
                {exc.routeId && (
                  <button
                    onClick={() => { flagRoute(exc.routeId, null, exc.label); showFeedback(`flag-${exc.id}`, 'Route flagged for review locally.') }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-2xs text-amber-300 hover:bg-amber-500/10 transition-colors"
                  >
                    <Icon name="Flag" size={10} />
                    Flag Route
                  </button>
                )}
              </div>
            )}

            {feedback[`rev-${exc.id}`] && <p className="text-2xs text-emerald-400">{feedback[`rev-${exc.id}`]}</p>}
            {feedback[`flag-${exc.id}`] && <p className="text-2xs text-amber-400">{feedback[`flag-${exc.id}`]}</p>}
          </div>
        )
      })}

      <p className="text-2xs text-slate-700 text-center">
        Controller review does not guarantee legal compliance. Marking reviewed records the action locally. {CONTROLLER_WARNINGS.sync}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. INCIDENT REVIEW
// ═══════════════════════════════════════════════════════════════
function IncidentReview({ viewModel, reviewedItems, markReviewed, addNote, flagRoute, feedback, showFeedback }) {
  const { incidents } = viewModel
  const [noteFor, setNoteFor]   = useState(null)
  const [noteText, setNoteText] = useState('')

  if (incidents.length === 0) {
    return <EmptyState icon="AlertTriangle" message="No incidents reported" sub="No incident reports in current local/demo state." />
  }

  const handleAddNote = (inc) => {
    if (!noteText.trim()) return
    addNote({ driverId: inc.driverId, incidentId: inc.id, tripId: inc.tripId, routeId: inc.routeId,
              text: noteText.trim(), severity: 'info', isDemo: inc.isDemo })
    setNoteText('')
    setNoteFor(null)
    showFeedback(`note-inc-${inc.id}`, 'Review note saved locally.')
  }

  return (
    <div className="space-y-4">
      {incidents.map(inc => {
        const sev = severityStyle(inc.severity)
        const isReviewed = !!reviewedItems[inc.id]
        return (
          <div key={inc.id} className={clsx('rounded-xl border p-4 space-y-3', isReviewed ? 'border-slate-800/40 bg-slate-900/20 opacity-70' : clsx(sev.border, sev.bg))}>
            <div className="flex items-start gap-2">
              <Icon name="AlertTriangle" size={14} className={clsx(sev.text, 'flex-shrink-0 mt-0.5')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={clsx('text-2xs font-bold', sev.text)}>{sev.label}</span>
                  <span className="text-2xs text-slate-500">{inc.type?.replace(/_/g,' ')}</span>
                  <DemoBadge isDemo={inc.isDemo} />
                  {isReviewed && <span className="text-2xs text-emerald-400">✓ Reviewed</span>}
                </div>
                <p className="text-xs font-semibold text-white">{inc.description || inc.label}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-2xs text-slate-500">
                  {inc.driverName && <span>Driver: {inc.driverName}</span>}
                  {inc.vehicleReg && <span>Vehicle: {inc.vehicleReg}</span>}
                  {inc.timestamp  && <span>{tsAgo(inc.timestamp)}</span>}
                  {inc.localSaved && <span className="text-emerald-600">Local saved</span>}
                </div>
                {inc.location && (
                  <p className="text-2xs text-slate-700 mt-1 font-mono">
                    {inc.location.lat.toFixed(5)}, {inc.location.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Controller actions */}
            {!isReviewed && (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { markReviewed(inc.id, null, ''); showFeedback(`rev-${inc.id}`, 'Marked reviewed locally.') }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-2xs text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                    <Icon name="Check" size={10} /> Mark Reviewed
                  </button>
                  <button onClick={() => setNoteFor(noteFor === inc.id ? null : inc.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 text-2xs text-slate-400 hover:text-white transition-colors">
                    <Icon name="MessageSquare" size={10} /> Add Review Note
                  </button>
                  {inc.routeId && (
                    <button onClick={() => { flagRoute(inc.routeId, null, `Incident: ${inc.description}`); showFeedback(`flag-${inc.id}`, 'Route flagged.') }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-2xs text-amber-300 hover:bg-amber-500/10 transition-colors">
                      <Icon name="Flag" size={10} /> Flag Route
                    </button>
                  )}
                </div>

                {noteFor === inc.id && (
                  <div className="space-y-1.5">
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder="Controller review note… (appended only, not altering driver's original report)"
                      className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-slate-500 resize-none h-16" />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddNote(inc)} disabled={!noteText.trim()}
                        className={clsx('flex-1 py-1.5 rounded text-2xs font-semibold', noteText.trim() ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/15' : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed')}>
                        Save Note
                      </button>
                      <button onClick={() => { setNoteFor(null); setNoteText('') }} className="px-3 py-1.5 rounded text-2xs text-slate-600 hover:text-slate-400 border border-slate-800/40 bg-slate-900/40">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(feedback[`rev-${inc.id}`] || feedback[`note-inc-${inc.id}`] || feedback[`flag-${inc.id}`]) && (
              <p className="text-2xs text-emerald-400">{feedback[`rev-${inc.id}`] || feedback[`note-inc-${inc.id}`] || feedback[`flag-${inc.id}`]}</p>
            )}
          </div>
        )
      })}

      <p className="text-2xs text-slate-700 text-center">
        Controller review notes are appended only. Original driver incident evidence is not modified. {CONTROLLER_WARNINGS.sync}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 7. CONTROLLER NOTES
// ═══════════════════════════════════════════════════════════════
function ControllerNotes({ controllerNotes, addNote, viewModel, demoMode }) {
  const [noteText, setNoteText]   = useState('')
  const [severity, setSeverity]   = useState('info')
  const [linkedTo, setLinkedTo]   = useState('general')
  const [saved, setSaved]         = useState(false)

  const driverOptions = viewModel.drivers.map(d => ({ id: d.driverId, label: d.name, type: 'driver' }))

  const handleSave = () => {
    if (!noteText.trim()) return
    const linked = driverOptions.find(d => d.id === linkedTo) || null
    addNote({
      text: noteText.trim(), severity,
      driverId: linked?.type === 'driver' ? linked.id : null,
      isDemo: demoMode === 'demo',
    })
    setNoteText('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <SectionCard title="Add Controller Note" icon="Plus">
        <div className="space-y-3">
          {saved && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs">
              <Icon name="CheckCircle" size={11} /> Note saved locally.
            </div>
          )}
          <div className="space-y-1">
            <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Link to</label>
            <select value={linkedTo} onChange={e => setLinkedTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-500">
              <option value="general">General / Fleet</option>
              {driverOptions.map(d => <option key={d.id} value={d.id}>{d.label} (Driver)</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Severity</label>
            <div className="flex gap-2">
              {['info','watch','urgent'].map(s => {
                const sv = severityStyle(s)
                return (
                  <button key={s} onClick={() => setSeverity(s)}
                    className={clsx('flex-1 py-1.5 rounded text-2xs font-semibold border transition-colors', severity === s ? clsx(sv.bg, sv.border, sv.text) : 'bg-slate-900/40 border-slate-800/40 text-slate-600')}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-2xs text-slate-600 uppercase tracking-wider font-semibold">Note</label>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add a controller note, observation, or review action…"
              className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-slate-500 resize-none h-24" />
          </div>
          <button onClick={handleSave} disabled={!noteText.trim()}
            className={clsx('w-full py-2.5 rounded-xl text-sm font-semibold transition-all', noteText.trim() ? 'bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20' : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed')}>
            Save Note Locally
          </button>
        </div>
      </SectionCard>

      {/* Existing notes */}
      <SectionCard title="Recent Notes" icon="FileText" badge={controllerNotes.length}>
        {controllerNotes.length === 0 ? (
          <EmptyState icon="FileText" message="No notes yet" />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-none">
            {controllerNotes.slice(0, 20).map(n => {
              const sv = severityStyle(n.severity)
              return (
                <div key={n.id} className={clsx('px-3 py-2.5 rounded-lg border', sv.border, sv.bg)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('text-2xs font-bold', sv.text)}>{sv.label}</span>
                    {n.isDemo && <DemoBadge isDemo />}
                    <span className="text-2xs text-slate-600 ml-auto">{tsAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.text}</p>
                  {n.driverId && <p className="text-2xs text-slate-600 mt-0.5">Driver: {n.driverId}</p>}
                  <p className="text-2xs text-slate-700 mt-0.5">Saved locally · Sync in later run</p>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <AdvisoryBox>{CONTROLLER_WARNINGS.sync}</AdvisoryBox>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 8. MAP / TRIP PREVIEW
// ═══════════════════════════════════════════════════════════════
function MapTripPreview({ viewModel, selectedTrip }) {
  const trip = selectedTrip || viewModel.trips[0] || null
  const routePositions = useMemo(() => {
    if (!trip?.isDemo) return routeToLeafletPositions(DEMO_ROUTE)
    return routeToLeafletPositions(DEMO_ROUTE)
  }, [trip])

  const demoStart = [DEMO_ROUTE.start.lat, DEMO_ROUTE.start.lng]
  const demoDest  = [DEMO_ROUTE.destination.lat, DEMO_ROUTE.destination.lng]

  const ICON_A = new L.DivIcon({ className: '', html: `<div style="width:22px;height:22px;background:#a78bfa;border:3px solid #7c3aed;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;">A</div>`, iconSize:[22,22], iconAnchor:[11,11] })
  const ICON_B = new L.DivIcon({ className: '', html: `<div style="width:22px;height:22px;background:#22d3ee;border:3px solid #0891b2;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;">B</div>`, iconSize:[22,22], iconAnchor:[11,11] })

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-700/40 bg-slate-900/40">
        <Icon name="Info" size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-2xs text-slate-500 leading-relaxed">
          Controller map preview uses available local/demo data in this run. Real cross-device sync is completed in the later PWA sync run.
          3D/tilted map view is visual guidance only.
        </p>
      </div>

      {trip && (
        <div className="px-3 py-2 rounded-lg border border-slate-800/40 bg-slate-900/40 flex items-center gap-2 flex-wrap">
          <StatusPill status={trip.status} />
          <span className="text-xs text-slate-300">{trip.driverName}</span>
          <span className="text-2xs text-slate-500">{trip.routeName}</span>
          <DemoBadge isDemo={trip.isDemo} />
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-slate-800/60" style={{ height: 300 }}>
        <MapContainer
          center={demoStart}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
            url={OSM_TILE}
          />
          <Polyline positions={routePositions} color="#a78bfa" weight={4} opacity={0.7} dashArray="10 6" />
          <Marker position={demoStart} icon={ICON_A} />
          <Marker position={demoDest}  icon={ICON_B} />
        </MapContainer>
      </div>

      <AdvisoryBox>
        Map data is advisory only. Route shown is demo/local data. Controller monitoring is advisory only. Public map data is not legally authoritative. Route does not guarantee legal compliance or restriction accuracy.
      </AdvisoryBox>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 9. OFFLINE / SYNC STATUS
// ═══════════════════════════════════════════════════════════════
function SyncStatus({ controllerSyncStatus, demoMode, isLive, backendConfigured }) {
  return (
    <div className="space-y-4">
      {/* RUN 13: Live sync status strip */}
      <ControllerPwaSyncStatus />
      <SectionCard title="Offline / Sync Status (Local)" icon="Wifi">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Mode',      value: demoMode === 'demo' ? 'Demo Mode' : 'Live Mode', ok: demoMode === 'demo' || backendConfigured },
              { label: 'Save',      value: 'Local / Offline-safe', ok: true },
              { label: 'Backend',   value: backendConfigured ? 'Configured' : 'Not configured', ok: backendConfigured },
              { label: 'Sync',      value: controllerSyncStatus.pendingSync ? 'Pending (local)' : 'Up to date (local)', ok: !controllerSyncStatus.pendingSync },
            ].map(({ label, value, ok }) => (
              <div key={label} className="px-2.5 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
                <p className="text-2xs text-slate-600 mb-0.5">{label}</p>
                <p className={clsx('text-xs font-medium', ok ? 'text-emerald-300' : 'text-amber-300')}>{value}</p>
              </div>
            ))}
          </div>

          {controllerSyncStatus.lastLocalSaveAt && (
            <p className="text-2xs text-slate-600">Last saved: <span className="font-mono">{new Date(controllerSyncStatus.lastLocalSaveAt).toLocaleTimeString()}</span></p>
          )}

          {isLive && !backendConfigured && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <Icon name="AlertCircle" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-amber-400/80">{CONTROLLER_WARNINGS.noBackend}</p>
            </div>
          )}

          <AdvisoryBox>{CONTROLLER_WARNINGS.sync}</AdvisoryBox>
        </div>
      </SectionCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 10. CONTROLLER INSTALL GUIDE
// ═══════════════════════════════════════════════════════════════
function ControllerInstallGuide() {
  const [expanded, setExpanded] = useState(null)
  const platforms = [
    { id: 'android', name: 'Android (Chrome)', icon: 'Smartphone', steps: [
      'Open the Fleet Controller PWA link in Chrome on your Android device.',
      'Tap the ⋮ menu (three dots) in the top-right corner.',
      'Tap "Add to Home Screen" or "Install app".',
      'Confirm the install prompt.',
      'Big V\'s Best Routes™ Fleet Controller icon will appear on your home screen.',
    ]},
    { id: 'ios', name: 'iPhone / iPad (Safari)', icon: 'Tablet', steps: [
      'Open the Fleet Controller PWA link in Safari on your iPhone or iPad.',
      'Tap the Share button (square with arrow) at the bottom of the screen.',
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" to confirm.',
      'The Fleet Controller icon will appear on your home screen.',
    ]},
    { id: 'desktop', name: 'Desktop (Chrome / Edge)', icon: 'Monitor', steps: [
      'Open the Fleet Controller PWA link in Chrome or Edge on your desktop.',
      'Look for the install icon in the address bar, or use the browser menu.',
      'Click "Install app" or "Install Big V\'s Best Routes™ Fleet Controller".',
      'Confirm the install prompt.',
      'The app opens as a standalone window and can be launched from your taskbar.',
    ]},
  ]

  return (
    <div className="space-y-3">
      <SectionCard title="Install Fleet Controller App" icon="Download">
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            The Fleet Controller PWA is a Progressive Web App (PWA). Install it on your tablet or phone for offline oversight access.
          </p>
          {platforms.map(p => (
            <div key={p.id} className="rounded-lg border border-slate-800/60 overflow-hidden">
              <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
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
                      <span className="text-2xs text-emerald-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-2xs text-slate-400 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-2xs text-slate-700">
            The fleet dashboard cannot remotely install this PWA onto another device. Each controller installs independently. Remote deployment tools are available in a later run.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { key: 'home',       label: 'Home',       icon: 'LayoutDashboard' },
  { key: 'trips',      label: 'Trips',      icon: 'Navigation'      },
  { key: 'drivers',    label: 'Drivers',    icon: 'Users'           },
  { key: 'vehicles',   label: 'Vehicles',   icon: 'Truck'           },
  { key: 'compliance', label: 'Compliance', icon: 'ShieldAlert'     },
  { key: 'incidents',  label: 'Incidents',  icon: 'AlertTriangle'   },
  { key: 'notes',      label: 'Notes',      icon: 'FileText'        },
  { key: 'map',        label: 'Map',        icon: 'Map'             },
  { key: 'sync',       label: 'Sync',       icon: 'Wifi'            },
  { key: 'install',    label: 'Install',    icon: 'Download'        },
]

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

// ── RUN 9: Wrapper that injects AI results into controller compliance tab ──
function ControllerComplianceAIWrapper({ exceptions }) {
  const latestSafety = useComplianceAIStore(s => s.safetyResults?.[0] || null)
  const latestLegal  = useComplianceAIStore(s => s.legalResults?.[0]  || null)
  return <ControllerComplianceBlock safetyResult={latestSafety} legalResult={latestLegal} exceptions={exceptions} />
}

export default function FleetControllerPwa() {
  // Scroll to top on mount
  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    try { window.scroll(0, 0) } catch {}
  }, [])

  const [activeTab, setActiveTab] = useState('home')
  const [selectedTrip, setSelectedTrip] = useState(null)

  // ── SSOT reads ──────────────────────────────────────────────
  const demoLiveMode    = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const isLive          = demoLiveMode === 'live'
  const backendConfig   = useDemoLiveStore(s => s.backendReadiness)
  const backendConfigured = backendConfig?.configured ?? false

  const controllerActions = useControllerStore(s => s.controllerActions)
  const controllerNotes   = useControllerStore(s => s.controllerNotes)
  const reviewedItems     = useControllerStore(s => s.reviewedItems)
  const flaggedRoutes     = useControllerStore(s => s.flaggedRoutes)
  const controllerSync    = useControllerStore(s => s.syncStatus)
  const saveAction        = useControllerStore(s => s.saveAction)
  const addNote           = useControllerStore(s => s.addNote)
  const markReviewed      = useControllerStore(s => s.markReviewed)
  const flagRoute         = useControllerStore(s => s.flagRoute)

  // ── Driver PWA state (Run 6) — read-only ───────────────────
  const driverPwaState = useDriverPwaStore.getState()

  // ── Build view model ────────────────────────────────────────
  const viewModel = useMemo(
    () => getControllerViewModel(driverPwaState, demoLiveMode === 'demo'),
    [demoLiveMode] // rebuild on mode change
  )

  // ── Action feedback ─────────────────────────────────────────
  const { feedback, show: showFeedback } = useActionFeedback()

  // ── Badge counts ────────────────────────────────────────────
  const s = viewModel.summary
  const tabBadge = {
    trips:      s.activeTrips > 0 ? s.activeTrips : 0,
    compliance: s.compExceptions + s.overdueChecklists + s.overdueCheckIns,
    incidents:  s.incidents,
    notes:      controllerNotes.length,
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#050810] flex flex-col overflow-hidden text-white">

      {/* ── Header — NO admin controls ────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-[#090e1c]/95 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
            <Icon name="Tablet" size={13} className="text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Fleet Controller</div>
            <div className="text-slate-600 text-2xs">Big V's Best Routes™</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-full border text-2xs font-medium',
            demoLiveMode === 'demo' ? 'border-violet-500/20 bg-violet-500/5 text-violet-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300')}>
            <Icon name={demoLiveMode === 'demo' ? 'Eye' : 'Radio'} size={10} />
            {demoLiveMode === 'demo' ? 'Demo' : 'Live'}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <Icon name="Shield" size={10} className="text-emerald-400" />
            <span className="text-2xs text-emerald-400 font-medium">Controller</span>
          </div>
        </div>
      </header>

      {/* ── Tab Bar ───────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800/60 flex-shrink-0 bg-[#0a1020] overflow-x-auto scrollbar-none">
        {TABS.map(t => {
          const badge = tabBadge[t.key] || 0
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={clsx(
                'flex-shrink-0 flex items-center justify-center gap-1 px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider transition-colors border-b-2 relative',
                activeTab === t.key ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5' : 'text-slate-600 border-transparent hover:text-slate-400'
              )}>
              <Icon name={t.icon} size={11} />
              <span className="hidden sm:inline">{t.label}</span>
              {badge > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          )
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'home'       && <ControllerHome viewModel={viewModel} demoMode={demoLiveMode} setTab={setActiveTab} isLive={isLive} backendConfigured={backendConfigured} />}
        {activeTab === 'trips'      && <TripsOverview viewModel={viewModel} isLive={isLive} backendConfigured={backendConfigured} onSelectTrip={t => { setSelectedTrip(t); setActiveTab('map') }} />}
        {activeTab === 'drivers'    && <ActiveDrivers viewModel={viewModel} saveAction={saveAction} feedback={feedback} showFeedback={showFeedback} demoMode={demoLiveMode} />}
        {activeTab === 'vehicles'   && <VehicleReadiness viewModel={viewModel} />}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            {/* ── RUN 9: AI advisory summary strips ─────────── */}
            <ControllerComplianceAIWrapper
              exceptions={<ComplianceExceptions viewModel={viewModel} reviewedItems={reviewedItems} markReviewed={markReviewed} flagRoute={flagRoute} flaggedRoutes={flaggedRoutes} feedback={feedback} showFeedback={showFeedback} />}
            />
          </div>
        )}
        {activeTab === 'incidents'  && <IncidentReview viewModel={viewModel} reviewedItems={reviewedItems} markReviewed={markReviewed} addNote={addNote} flagRoute={flagRoute} feedback={feedback} showFeedback={showFeedback} />}
        {activeTab === 'notes'      && <ControllerNotes controllerNotes={controllerNotes} addNote={addNote} viewModel={viewModel} demoMode={demoLiveMode} />}
        {activeTab === 'map'        && <MapTripPreview viewModel={viewModel} selectedTrip={selectedTrip} />}
        {activeTab === 'sync'       && <SyncStatus controllerSyncStatus={controllerSync} demoMode={demoLiveMode} isLive={isLive} backendConfigured={backendConfigured} />}
        {activeTab === 'install'    && <ControllerInstallGuide />}
      </div>

      {/* ── Footer — branding only, no admin actions ──────────── */}
      <footer className="px-4 py-2 border-t border-slate-800/60 text-center flex-shrink-0">
        <p className="text-2xs text-slate-700">
          Big V's Best Routes™ · Controller monitoring is advisory only · GPS/map data may be delayed or inaccurate
        </p>
        <p className="text-2xs text-slate-800">
          Compliance AI provides advisory guidance only · Drivers and fleet managers remain responsible for final decisions
        </p>
      </footer>
    </div>
  )
}
