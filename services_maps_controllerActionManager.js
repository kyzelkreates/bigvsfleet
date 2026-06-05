/**
 * ============================================================
 * Big V's Best Routes™ — Controller Action Manager
 * /src/services/maps/controllerActionManager.js
 *
 * RUN 7 — Fleet Controller PWA
 *
 * PURPOSE:
 *   Safe, local-first controller action utilities.
 *   All functions operate on SSOT state (useControllerStore +
 *   useDriverPwaStore). No backend sync. No fake remote actions.
 *   No real-time push notification claims.
 *
 * SAFETY:
 *   Controller review does not guarantee legal compliance.
 *   All outputs are advisory only.
 *   Drivers and fleet managers remain responsible for decisions.
 *
 * SECURITY:
 *   No API keys. No backend calls. No secrets.
 * ============================================================
 */

import { DEMO_ROUTE } from './services_maps_routeProviderManager'

// ─── Controller advisory warnings ────────────────────────────
export const CONTROLLER_WARNINGS = {
  general:    'Controller monitoring is advisory only.',
  gps:        'GPS/map/status data may be delayed, incomplete, inaccurate, or offline.',
  review:     'Controller review does not guarantee legal compliance.',
  sync:       'Controller updates are saved locally/offline-safe. Live backend sync is available in Live Mode when Supabase is configured (Run 13).',
  noBackend:  'Live Mode is selected, but no backend provider is configured yet. Controller monitoring is running in local/offline-safe mode.',
  incidents:  'Controller review notes are appended only. Original driver incident evidence is not modified.',
  checkin:    'Check-in request saved locally and queued for backend sync when Live Mode + Supabase is configured.',
  vehicle:    'Vehicle readiness status is advisory and depends on available data.',
}

// ─── Demo data — shown when no real driver/trip data exists ──
const _now = () => new Date().toISOString()
const _ageMinutes = (ts) => ts ? Math.round((Date.now() - new Date(ts).getTime()) / 60000) : null

export const DEMO_DRIVERS = [
  {
    driverId:    'demo-driver-001',
    name:        'Alex Mercer',
    status:      'en_route',
    vehicleId:   'demo-vehicle-001',
    vehicleReg:  'BV22 XYZ',
    routeId:     'demo-route-001',
    tripStarted: new Date(Date.now() - 35 * 60000).toISOString(),
    lastSeenAt:  new Date(Date.now() - 4 * 60000).toISOString(),
    gpsPermission: 'granted',
    gpsAccuracy:   18,
    checklistDone: true,
    complianceAck: true,
    incidentCount: 0,
    isDemo: true,
  },
  {
    driverId:    'demo-driver-002',
    name:        'Sam Riley',
    status:      'paused',
    vehicleId:   'demo-vehicle-002',
    vehicleReg:  'BV21 ABC',
    routeId:     'demo-route-002',
    tripStarted: new Date(Date.now() - 90 * 60000).toISOString(),
    lastSeenAt:  new Date(Date.now() - 22 * 60000).toISOString(),
    gpsPermission: 'denied',
    gpsAccuracy:   null,
    checklistDone: false,
    complianceAck: true,
    incidentCount: 1,
    isDemo: true,
  },
  {
    driverId:    'demo-driver-003',
    name:        'Jordan Kim',
    status:      'available',
    vehicleId:   'demo-vehicle-003',
    vehicleReg:  'BV23 PQR',
    routeId:     null,
    tripStarted: null,
    lastSeenAt:  new Date(Date.now() - 2 * 60000).toISOString(),
    gpsPermission: 'unknown',
    gpsAccuracy:   null,
    checklistDone: false,
    complianceAck: false,
    incidentCount: 0,
    isDemo: true,
  },
]

export const DEMO_VEHICLES = [
  {
    vehicleId:   'demo-vehicle-001',
    name:        'Sprinter 001',
    reg:         'BV22 XYZ',
    type:        'van',
    assignedDriver: 'Alex Mercer',
    heightM:     2.4,
    widthM:      2.0,
    lengthM:     5.5,
    weightKg:    3500,
    profileComplete: true,
    checklistDone:   true,
    readiness:       'ready',
    isDemo: true,
  },
  {
    vehicleId:   'demo-vehicle-002',
    name:        'Transit 002',
    reg:         'BV21 ABC',
    type:        'van',
    assignedDriver: 'Sam Riley',
    heightM:     null,
    widthM:      null,
    lengthM:     5.2,
    weightKg:    3500,
    profileComplete: false,
    checklistDone:   false,
    readiness:       'needs_review',
    missingFields:   ['heightM', 'widthM'],
    isDemo: true,
  },
  {
    vehicleId:   'demo-vehicle-003',
    name:        'Truck 003',
    reg:         'BV23 PQR',
    type:        'hgv',
    assignedDriver: 'Jordan Kim',
    heightM:     3.9,
    widthM:      2.55,
    lengthM:     12.0,
    weightKg:    26000,
    profileComplete: true,
    checklistDone:   false,
    readiness:       'needs_review',
    isDemo: true,
  },
]

export const DEMO_TRIPS = [
  {
    tripId:    'demo-trip-001',
    driverId:  'demo-driver-001',
    driverName:'Alex Mercer',
    vehicleId: 'demo-vehicle-001',
    vehicleReg:'BV22 XYZ',
    routeId:   'demo-route-001',
    routeName: `${DEMO_ROUTE.start.name} → ${DEMO_ROUTE.destination.name}`,
    status:    'started',
    startedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    gpsPermission: 'granted',
    gpsAccuracy:  18,
    checklistDone: true,
    complianceAck: true,
    incidentCount: 0,
    routeWarnings: 0,
    lastLocationAt: new Date(Date.now() - 4 * 60000).toISOString(),
    isDemo: true,
  },
  {
    tripId:    'demo-trip-002',
    driverId:  'demo-driver-002',
    driverName:'Sam Riley',
    vehicleId: 'demo-vehicle-002',
    vehicleReg:'BV21 ABC',
    routeId:   'demo-route-002',
    routeName: 'City Centre → Southgate Industrial',
    status:    'paused',
    startedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    gpsPermission: 'denied',
    gpsAccuracy:   null,
    checklistDone: false,
    complianceAck: true,
    incidentCount: 1,
    routeWarnings: 1,
    lastLocationAt: new Date(Date.now() - 22 * 60000).toISOString(),
    isDemo: true,
  },
]

export const DEMO_INCIDENTS = [
  {
    id:          'demo-incident-001',
    type:        'bridge_concern',
    description: 'Low bridge sign at Station Road underpass. Clearance appears less than map data shows.',
    severity:    'high',
    driverId:    'demo-driver-002',
    driverName:  'Sam Riley',
    vehicleId:   'demo-vehicle-002',
    vehicleReg:  'BV21 ABC',
    tripId:      'demo-trip-002',
    routeId:     'demo-route-002',
    location:    { lat: 51.455, lng: -2.588 },
    timestamp:   new Date(Date.now() - 20 * 60000).toISOString(),
    isDemo:      true,
    localSaved:  true,
  },
]

export const DEMO_COMPLIANCE_EXCEPTIONS = [
  {
    id:       'exc-001',
    severity: 'high',
    type:     'missing_vehicle_dimensions',
    label:    'Missing vehicle dimensions',
    detail:   'Transit 002 (BV21 ABC) is missing height and width data required for restriction checks.',
    driverId: 'demo-driver-002',
    vehicleId:'demo-vehicle-002',
    tripId:   'demo-trip-002',
    status:   'open',
    isDemo:   true,
  },
  {
    id:       'exc-002',
    severity: 'medium',
    type:     'checklist_incomplete',
    label:    'Pre-trip checklist not completed',
    detail:   'Sam Riley (demo-trip-002) started a trip without completing the pre-trip checklist.',
    driverId: 'demo-driver-002',
    tripId:   'demo-trip-002',
    status:   'open',
    isDemo:   true,
  },
  {
    id:       'exc-003',
    severity: 'medium',
    type:     'gps_unavailable',
    label:    'GPS unavailable/denied',
    detail:   'Sam Riley GPS permission denied. Route tracking is unavailable for demo-trip-002.',
    driverId: 'demo-driver-002',
    tripId:   'demo-trip-002',
    status:   'open',
    isDemo:   true,
  },
  {
    id:       'exc-004',
    severity: 'info',
    type:     'checklist_incomplete',
    label:    'Pre-trip checklist not completed',
    detail:   'Jordan Kim has not completed a pre-trip checklist. No active trip assigned.',
    driverId: 'demo-driver-003',
    vehicleId:'demo-vehicle-003',
    status:   'open',
    isDemo:   true,
  },
  {
    id:       'exc-005',
    severity: 'info',
    type:     'compliance_ack_missing',
    label:    'Compliance acknowledgement missing',
    detail:   'Jordan Kim has not completed the compliance acknowledgement.',
    driverId: 'demo-driver-003',
    status:   'open',
    isDemo:   true,
  },
]

// ─── Controller view model ────────────────────────────────────

/**
 * Build the controller home view model from available local state.
 * Reads Driver PWA SSOT + demo fallback.
 * @param {object} driverPwaState - state from useDriverPwaStore.getState()
 * @param {boolean} isDemo - current demo/live mode
 * @returns {ControllerViewModel}
 */
export function getControllerViewModel(driverPwaState, isDemo = true) {
  // In demo mode or when no live driver state is available, return demo data
  const trips    = isDemo || !driverPwaState?.tripStatus?.tripId ? DEMO_TRIPS    : _buildLiveTrips(driverPwaState)
  const drivers  = isDemo ? DEMO_DRIVERS  : _buildLiveDrivers(driverPwaState)
  const vehicles = isDemo ? DEMO_VEHICLES : []
  const incidents = isDemo
    ? DEMO_INCIDENTS
    : (driverPwaState?.incidentReports || []).map(i => ({ ...i, driverName: driverPwaState?.driverStatus?.name || 'Driver' }))

  const overdueChecklists = _getOverdueChecklists(drivers)
  const overdueCheckIns   = _getOverdueCheckIns(drivers)
  const compExceptions    = isDemo
    ? DEMO_COMPLIANCE_EXCEPTIONS
    : _buildComplianceExceptions(driverPwaState)

  return {
    trips,
    drivers,
    vehicles,
    incidents,
    overdueChecklists,
    overdueCheckIns,
    complianceExceptions: compExceptions,
    routeWarnings: _buildRouteWarnings(trips, vehicles),
    summary: {
      activeTrips:      trips.filter(t => t.status === 'started' || t.status === 'paused').length,
      activeDrivers:    drivers.filter(d => d.status !== 'available' && d.status !== 'offline').length,
      routeWarnings:    trips.reduce((a, t) => a + (t.routeWarnings || 0), 0),
      compExceptions:   compExceptions.filter(e => e.status === 'open').length,
      incidents:        incidents.length,
      overdueChecklists: overdueChecklists.length,
      overdueCheckIns:   overdueCheckIns.length,
    },
  }
}

// ─── Private builders ─────────────────────────────────────────
function _buildLiveTrips(state) {
  if (!state?.tripStatus?.status || state.tripStatus.status === 'not_started') return []
  return [{
    tripId:     state.tripStatus.tripId || `live-trip-${Date.now()}`,
    driverId:   state.driverStatus?.driverId || 'unknown',
    driverName: state.driverStatus?.name || 'Current Driver',
    vehicleId:  null,
    vehicleReg: null,
    routeId:    state.tripStatus.routeId,
    routeName:  state.tripStatus.routeId ? `Route ${state.tripStatus.routeId}` : 'Active Route',
    status:     state.tripStatus.status,
    startedAt:  state.tripStatus.startedAt,
    gpsPermission: state.gpsStatus?.permission || 'unknown',
    gpsAccuracy:   state.gpsStatus?.accuracyMeters || null,
    checklistDone: !!state.preTripChecklist?.completedAt,
    complianceAck: !!state.complianceAcknowledgement?.acknowledged,
    incidentCount: (state.incidentReports || []).length,
    routeWarnings: 0,
    lastLocationAt: state.gpsStatus?.lastUpdatedAt || state.tripStatus.startedAt,
    isDemo: false,
  }]
}

function _buildLiveDrivers(state) {
  if (!state?.driverStatus?.driverId) return []
  return [{
    driverId:    state.driverStatus.driverId,
    name:        state.driverStatus.name || 'Current Driver',
    status:      state.driverStatus.status || 'unknown',
    vehicleId:   null,
    vehicleReg:  null,
    routeId:     state.tripStatus?.routeId || null,
    tripStarted: state.tripStatus?.startedAt || null,
    lastSeenAt:  state.driverStatus?.lastSeenAt || null,
    gpsPermission: state.gpsStatus?.permission || 'unknown',
    gpsAccuracy:   state.gpsStatus?.accuracyMeters || null,
    checklistDone: !!state.preTripChecklist?.completedAt,
    complianceAck: !!state.complianceAcknowledgement?.acknowledged,
    incidentCount: (state.incidentReports || []).length,
    isDemo: false,
  }]
}

function _getOverdueChecklists(drivers) {
  return drivers
    .filter(d => !d.checklistDone && (d.status === 'en_route' || d.status === 'started'))
    .map(d => ({
      driverId:  d.driverId,
      name:      d.name,
      type:      'checklist',
      label:     'Started trip without completing checklist',
      severity:  'medium',
      isDemo:    d.isDemo,
    }))
}

function _getOverdueCheckIns(drivers) {
  const OVERDUE_MINS = 30
  return drivers
    .filter(d => {
      if (!d.lastSeenAt) return d.status === 'en_route' || d.status === 'paused'
      const age = _ageMinutes(d.lastSeenAt)
      return age != null && age > OVERDUE_MINS && (d.status === 'en_route' || d.status === 'paused')
    })
    .map(d => ({
      driverId:  d.driverId,
      name:      d.name,
      type:      'check_in',
      label:     d.lastSeenAt
        ? `Last seen ${_ageMinutes(d.lastSeenAt)} min ago — overdue based on local timestamp`
        : 'Last seen time unknown',
      severity:  'watch',
      isDemo:    d.isDemo,
    }))
}

function _buildComplianceExceptions(state) {
  const exc = []
  if (!state) return exc

  if (!state.preTripChecklist?.completedAt && state.tripStatus?.status === 'started') {
    exc.push({ id: 'live-exc-checklist', severity: 'medium', type: 'checklist_incomplete',
      label: 'Pre-trip checklist not completed', detail: 'Trip started without checklist.', status: 'open', isDemo: false })
  }
  if (!state.complianceAcknowledgement?.acknowledged && state.tripStatus?.status === 'started') {
    exc.push({ id: 'live-exc-compliance', severity: 'high', type: 'compliance_ack_missing',
      label: 'Compliance acknowledgement missing', detail: 'Trip started without compliance acknowledgement.', status: 'open', isDemo: false })
  }
  if (state.gpsStatus?.permission === 'denied' || state.gpsStatus?.permission === 'unavailable') {
    exc.push({ id: 'live-exc-gps', severity: 'medium', type: 'gps_unavailable',
      label: 'GPS unavailable/denied', detail: 'Route tracking unavailable.', status: 'open', isDemo: false })
  }
  return exc
}

function _buildRouteWarnings(trips, vehicles) {
  const warnings = []
  trips.forEach(t => {
    if (!t.checklistDone) warnings.push({ tripId: t.tripId, driverName: t.driverName, label: 'Checklist incomplete', severity: 'medium' })
    if (t.gpsPermission === 'denied') warnings.push({ tripId: t.tripId, driverName: t.driverName, label: 'GPS unavailable', severity: 'info' })
  })
  vehicles.forEach(v => {
    if (v.readiness === 'needs_review') warnings.push({ vehicleId: v.vehicleId, vehicleReg: v.vehicleReg, label: 'Vehicle needs review', severity: 'medium' })
    if (v.missingFields?.length) warnings.push({ vehicleId: v.vehicleId, vehicleReg: v.vehicleReg, label: `Missing: ${v.missingFields.join(', ')}`, severity: 'high' })
  })
  return warnings
}

// ─── Public helpers ───────────────────────────────────────────
export function getOverdueChecklistItems(viewModel) {
  return viewModel?.overdueChecklists || []
}
export function getOverdueDriverCheckIns(viewModel) {
  return viewModel?.overdueCheckIns || []
}
export function getControllerSyncStatus(controllerState) {
  return controllerState?.syncStatus || CONTROLLER_STATE_DEFAULTS?.syncStatus || { mode: 'local', lastLocalSaveAt: null }
}
export function normaliseControllerAction(raw) {
  return {
    id:           raw.id || `ca-${Date.now()}`,
    type:         raw.type || 'add_note',
    controllerId: raw.controllerId || null,
    driverId:     raw.driverId || null,
    tripId:       raw.tripId || null,
    routeId:      raw.routeId || null,
    vehicleId:    raw.vehicleId || null,
    note:         raw.note || '',
    status:       raw.status || 'local_saved',
    isDemo:       raw.isDemo || false,
    createdAt:    raw.createdAt || new Date().toISOString(),
  }
}

export function requestDriverCheckIn(controllerId, driverId, tripId, isDemo, saveAction) {
  const id = saveAction({
    type: 'request_check_in', controllerId, driverId, tripId,
    note: `Check-in requested. ${CONTROLLER_WARNINGS.checkin}`,
    isDemo,
  })
  return { id, message: CONTROLLER_WARNINGS.checkin }
}

export function statusLabel(status) {
  return {
    en_route:    { label: 'En Route',   color: 'text-emerald-300', dot: 'bg-emerald-400 animate-pulse' },
    started:     { label: 'En Route',   color: 'text-emerald-300', dot: 'bg-emerald-400 animate-pulse' },
    paused:      { label: 'Paused',     color: 'text-amber-300',   dot: 'bg-amber-400'  },
    available:   { label: 'Available',  color: 'text-slate-400',   dot: 'bg-slate-500'  },
    completed:   { label: 'Completed',  color: 'text-violet-300',  dot: 'bg-violet-400' },
    offline:     { label: 'Offline',    color: 'text-red-400',     dot: 'bg-red-500'    },
    not_started: { label: 'Not Started',color: 'text-slate-500',   dot: 'bg-slate-600'  },
    unknown:     { label: 'Unknown',    color: 'text-slate-600',   dot: 'bg-slate-700'  },
  }[status] || { label: 'Unknown', color: 'text-slate-600', dot: 'bg-slate-700' }
}

export function severityStyle(severity) {
  return {
    high:   { label: 'HIGH',   bg: 'bg-red-500/10',    border: 'border-red-500/25',    text: 'text-red-300'    },
    medium: { label: 'MED',    bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  text: 'text-amber-300'  },
    watch:  { label: 'WATCH',  bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-300' },
    info:   { label: 'INFO',   bg: 'bg-slate-800/40',  border: 'border-slate-700/40',  text: 'text-slate-400'  },
    urgent: { label: 'URGENT', bg: 'bg-red-700/15',    border: 'border-red-700/30',    text: 'text-red-200'    },
  }[severity] || { label: 'INFO', bg: 'bg-slate-800/40', border: 'border-slate-700/40', text: 'text-slate-400' }
}

export function gpsPermissionLabel(perm) {
  return {
    granted:     { label: 'GPS Active',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
    denied:      { label: 'GPS Denied',   color: 'text-red-400',     dot: 'bg-red-400'     },
    unavailable: { label: 'GPS N/A',      color: 'text-slate-500',   dot: 'bg-slate-600'   },
    requesting:  { label: 'GPS Req…',     color: 'text-cyan-400',    dot: 'bg-cyan-400'    },
    unknown:     { label: 'GPS Unknown',  color: 'text-slate-600',   dot: 'bg-slate-700'   },
    stopped:     { label: 'GPS Stopped',  color: 'text-slate-500',   dot: 'bg-slate-600'   },
  }[perm] || { label: 'GPS Unknown', color: 'text-slate-600', dot: 'bg-slate-700' }
}

export function readinessStyle(readiness) {
  return {
    ready:        { label: 'Ready',        color: 'text-emerald-300', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5'  },
    needs_review: { label: 'Needs Review', color: 'text-amber-300',   border: 'border-amber-500/20',   bg: 'bg-amber-500/5'    },
    incomplete:   { label: 'Incomplete',   color: 'text-red-300',     border: 'border-red-500/20',     bg: 'bg-red-500/5'      },
    unknown:      { label: 'Unknown',      color: 'text-slate-500',   border: 'border-slate-700/40',   bg: 'bg-slate-900/40'   },
  }[readiness] || { label: 'Unknown', color: 'text-slate-500', border: 'border-slate-700/40', bg: 'bg-slate-900/40' }
}

export default {
  CONTROLLER_WARNINGS,
  DEMO_DRIVERS, DEMO_VEHICLES, DEMO_TRIPS, DEMO_INCIDENTS, DEMO_COMPLIANCE_EXCEPTIONS,
  getControllerViewModel,
  getOverdueChecklistItems,
  getOverdueDriverCheckIns,
  getControllerSyncStatus,
  normaliseControllerAction,
  requestDriverCheckIn,
  statusLabel, severityStyle, gpsPermissionLabel, readinessStyle,
}
