/**
 * ============================================================
 * Big V's Best Routes™ — 4P3X Intelligent AI Compliance Engine
 * /src/intel/bigv_complianceEngine.js
 *
 * RUN 9 — Safety & Legal Compliance AI Layer
 *
 * PURPOSE:
 *   Deterministic, local-first advisory compliance engine.
 *   No external AI/LLM API calls. No secrets. No hardcoded keys.
 *   All outputs are advisory only and explicitly non-guaranteeing.
 *
 * AGENTS:
 *   Agent 1: 4P3X Intelligent AI 1 — Safety Oversight AI
 *   Agent 2: 4P3X Intelligent AI 2 — Legal Compliance Oversight AI
 *
 * ABSOLUTE SAFETY RULE:
 *   - Never guarantee compliance.
 *   - Never approve a route as legally safe.
 *   - Never delete or alter incident/driver evidence.
 *   - Never claim restrictions are confirmed absent.
 *   - Always expose missing data, not hide it.
 *   - Always recommend human verification.
 *   - Confidence decreases with missing/stale data.
 *
 * SECURITY:
 *   No OpenAI/Groq/Anthropic/Gemini/Mistral/DeepSeek keys.
 *   No backend secrets. No hardcoded API keys.
 *
 * ============================================================
 */

// ─── Advisory constants ───────────────────────────────────────
export const ADVISORY_DISCLAIMER =
  'Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel.'

export const HUMAN_VERIFICATION_REQUIRED = 'Advisory only — human verification required.'

export const NO_GUARANTEE =
  'This output does not confirm legal compliance, route suitability, or driver/fleet responsibility.'

export const CONFIDENCE_DISCLAIMER =
  'Confidence reflects available app data only. It does not confirm legal compliance.'

export const OSM_ADVISORY =
  'OSM/Overpass data is advisory only and may be incomplete, outdated, missing, or inconsistent. It is not a substitute for checking current signage, restrictions, permits, bridge limits, access rules, road conditions, or official sources.'

export const GRAPHHOPPER_ADVISORY =
  'GraphHopper route output is advisory routing data only. It does not guarantee legal suitability for a specific vehicle, load, permit, bridge limit, access restriction, or company policy.'

export const DRIVER_RESPONSIBILITY =
  'Before travelling, check current road signs, restrictions, bridge limits, permits, road conditions, vehicle suitability, and company policy.'

// ─── Risk levels ──────────────────────────────────────────────
export const RISK_LEVELS = {
  UNKNOWN:  'unknown',
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
}

export const RISK_DISPLAY = {
  unknown:  { label: 'Unknown',  color: 'text-slate-400',  border: 'border-slate-700/40',   bg: 'bg-slate-900/40',  dot: 'bg-slate-500'  },
  low:      { label: 'Low',      color: 'text-emerald-300',border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', dot: 'bg-emerald-400' },
  medium:   { label: 'Medium',   color: 'text-amber-300',  border: 'border-amber-500/20',   bg: 'bg-amber-500/5',   dot: 'bg-amber-400'  },
  high:     { label: 'High',     color: 'text-orange-300', border: 'border-orange-500/20',  bg: 'bg-orange-500/5',  dot: 'bg-orange-400' },
  critical: { label: 'Critical', color: 'text-red-300',    border: 'border-red-500/20',     bg: 'bg-red-500/5',     dot: 'bg-red-400 animate-pulse' },
}

// ─── Legal-critical fields by vehicle type ────────────────────
export const LEGAL_CRITICAL_FIELDS = {
  car:     [],
  van:     ['heightM', 'weightKg'],
  hgv:     ['heightM', 'widthM', 'lengthM', 'weightKg', 'axleWeightKg'],
  lorry:   ['heightM', 'widthM', 'lengthM', 'weightKg', 'axleWeightKg'],
  coach:   ['heightM', 'widthM', 'lengthM', 'weightKg'],
  minibus: ['heightM'],
  recovery:['heightM', 'widthM', 'lengthM', 'weightKg'],
  trailer: ['heightM', 'widthM', 'lengthM', 'weightKg', 'axleWeightKg', 'trailerStatus'],
  specialist: ['heightM', 'widthM', 'lengthM', 'weightKg', 'permitRequired'],
  default: ['heightM', 'weightKg'],
}

const _now = () => new Date().toISOString()
const _id  = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`

// ─── Individual checkers ──────────────────────────────────────

/**
 * Check vehicle profile completeness and legal-critical fields.
 * @param {object|null} vehicleProfile
 * @returns {CheckResult}
 */
export function checkVehicleProfileCompleteness(vehicleProfile, vehicleType = 'default') {
  if (!vehicleProfile) {
    return {
      passed: false, severity: 'high',
      label: 'No vehicle profile',
      detail: 'No vehicle profile data available. Legal-critical dimensions and weights cannot be checked.',
      missingFields: ['vehicleProfile'],
      confidencePenalty: 40,
    }
  }
  const criticalFields = LEGAL_CRITICAL_FIELDS[vehicleType?.toLowerCase()] || LEGAL_CRITICAL_FIELDS.default
  const missing = criticalFields.filter(f => vehicleProfile[f] == null || vehicleProfile[f] === '')
  const allFields = ['heightM', 'widthM', 'lengthM', 'weightKg', 'axleWeightKg', 'trailerStatus', 'hazardousGoods', 'permitRequired', 'emissionZone']
  const optMissing = allFields.filter(f => !criticalFields.includes(f) && (vehicleProfile[f] == null || vehicleProfile[f] === ''))
  const profileComplete = vehicleProfile.profileComplete ?? (missing.length === 0)

  if (missing.length > 0) {
    return {
      passed: false, severity: 'high',
      label: `Missing legal-critical fields: ${missing.join(', ')}`,
      detail: `Vehicle type "${vehicleType}" requires these fields for route restriction checks. Missing data means route suitability cannot be assessed.`,
      missingFields: missing, optionalMissing: optMissing,
      confidencePenalty: Math.min(45, missing.length * 12),
    }
  }
  return {
    passed: true, severity: 'low',
    label: 'Vehicle profile complete (legal-critical fields)',
    detail: profileComplete ? 'All legal-critical fields present.' : 'Core fields present. Some optional fields missing.',
    missingFields: [], optionalMissing: optMissing,
    confidencePenalty: optMissing.length > 0 ? 5 : 0,
  }
}

/**
 * Check pre-trip checklist status.
 */
export function checkDriverChecklist(preTripChecklist, tripStatus) {
  if (!preTripChecklist) {
    return { passed: false, severity: 'medium', label: 'No checklist data', detail: 'Pre-trip checklist data unavailable.', confidencePenalty: 15 }
  }
  const isTripActive = tripStatus?.status === 'started' || tripStatus?.status === 'en_route'
  const completed = !!preTripChecklist.completedAt
  const startedWithout = !!preTripChecklist.overrideStartedWithout

  if (isTripActive && !completed) {
    return {
      passed: false, severity: startedWithout ? 'critical' : 'high',
      label: startedWithout ? 'Trip started without checklist (override noted)' : 'Pre-trip checklist not completed during active trip',
      detail: 'A trip is active but the pre-trip checklist was not completed. ' +
        (startedWithout ? `Override note: "${preTripChecklist.overrideNote || '(none)'}"` : 'Driver should complete checklist before travel.'),
      missingFields: ['preTripChecklist.completedAt'], confidencePenalty: startedWithout ? 30 : 20,
    }
  }
  if (!completed) {
    return { passed: false, severity: 'medium', label: 'Pre-trip checklist not completed', detail: 'Checklist has not been completed yet.', confidencePenalty: 10 }
  }
  const allChecked = preTripChecklist.vehicleChecked && preTripChecklist.routeReviewed &&
    preTripChecklist.restrictionsReviewed && preTripChecklist.companyPolicyAcknowledged
  return {
    passed: true, severity: allChecked ? 'low' : 'medium',
    label: allChecked ? 'Checklist completed' : 'Checklist completed (some items unchecked)',
    detail: `Completed at: ${preTripChecklist.completedAt ? new Date(preTripChecklist.completedAt).toLocaleString() : 'Unknown'}`,
    confidencePenalty: allChecked ? 0 : 8,
  }
}

/**
 * Check driver compliance/route acknowledgements.
 */
export function checkDriverAcknowledgements(routeAcknowledgement, complianceAcknowledgement, tripStatus) {
  const isTripActive = tripStatus?.status === 'started' || tripStatus?.status === 'en_route'
  const issues = []
  let penalty = 0

  if (!complianceAcknowledgement?.acknowledged) {
    issues.push({ severity: isTripActive ? 'high' : 'medium', label: 'Compliance acknowledgement missing', detail: 'Driver has not acknowledged compliance advisory.' })
    penalty += isTripActive ? 20 : 10
  }
  if (!routeAcknowledgement?.acknowledged && isTripActive) {
    issues.push({ severity: 'medium', label: 'Route acknowledgement missing', detail: 'Driver has not acknowledged the active route.' })
    penalty += 10
  }

  if (issues.length === 0) {
    return { passed: true, severity: 'low', label: 'Acknowledgements complete', detail: 'Compliance and route acknowledgements confirmed.', confidencePenalty: 0 }
  }
  return {
    passed: false, severity: issues[0].severity,
    label: issues.map(i => i.label).join('; '),
    detail: issues.map(i => i.detail).join(' '),
    issues, confidencePenalty: penalty,
  }
}

/**
 * Check GPS status and confidence.
 */
export function checkGpsConfidence(gpsStatus, tripStatus) {
  if (!gpsStatus) {
    return { passed: false, severity: 'medium', label: 'No GPS status data', detail: 'GPS status unavailable.', confidencePenalty: 15 }
  }
  const perm     = gpsStatus.permission || 'unknown'
  const accuracy = gpsStatus.accuracyMeters
  const isTripActive = tripStatus?.status === 'started' || tripStatus?.status === 'en_route'
  const stale    = gpsStatus.lastUpdatedAt ? (Date.now() - new Date(gpsStatus.lastUpdatedAt).getTime()) > 5 * 60 * 1000 : true

  if (perm === 'denied' || perm === 'unavailable') {
    return {
      passed: false, severity: isTripActive ? 'high' : 'medium',
      label: `GPS ${perm}`, detail: `GPS permission is ${perm}. Route tracking unavailable. GPS accuracy can vary. Do not rely on GPS as legal proof of route suitability.`,
      confidencePenalty: isTripActive ? 25 : 12,
    }
  }
  if (perm === 'unknown' || perm === 'requesting') {
    return { passed: false, severity: 'medium', label: 'GPS status unknown', detail: 'GPS permission not yet established.', confidencePenalty: 10 }
  }
  if (perm === 'granted') {
    if (accuracy && accuracy > 50) {
      return { passed: false, severity: 'medium', label: `GPS low accuracy (±${accuracy}m)`, detail: `GPS accuracy is ${accuracy}m — high uncertainty. Route tracking may be unreliable.`, confidencePenalty: 10 }
    }
    if (stale) {
      return { passed: false, severity: 'medium', label: 'GPS data stale', detail: 'GPS data has not updated recently. Position may be outdated.', confidencePenalty: 8 }
    }
    const confLabel = accuracy ? (accuracy <= 10 ? 'high' : accuracy <= 30 ? 'medium' : 'low') : 'unknown'
    return { passed: true, severity: 'low', label: `GPS active (accuracy ±${accuracy ?? '?'}m, ${confLabel} confidence)`, detail: 'GPS is active and recent.', confidencePenalty: confLabel === 'unknown' ? 5 : 0 }
  }
  return { passed: false, severity: 'medium', label: 'GPS status unrecognised', detail: `GPS permission: "${perm}".`, confidencePenalty: 10 }
}

/**
 * Check map/routing/restriction API provider confidence.
 */
export function checkMapProviderConfidence(apiConfig, mapState) {
  const issues = []
  let penalty = 0

  const osmStatus = apiConfig?.osm?.status || 'unknown'
  if (!['demo_ready','configured'].includes(osmStatus)) {
    issues.push(`OSM map provider status: ${osmStatus}.`)
    penalty += 8
  }

  const overpassStatus = apiConfig?.overpass?.status || 'not_configured'
  if (overpassStatus === 'not_configured' || overpassStatus === 'error') {
    issues.push(`Restriction data (Overpass) status: ${overpassStatus}. ${OSM_ADVISORY}`)
    penalty += 15
  }

  const ghStatus = apiConfig?.graphHopper?.status || 'not_configured'
  const ghHasKey = apiConfig?.graphHopper?.apiKeyStoredSafely || false
  if (ghStatus === 'not_configured' || !ghHasKey) {
    issues.push(`Route provider (GraphHopper) not configured. ${GRAPHHOPPER_ADVISORY}`)
    penalty += 10
  }

  const routingStatus = apiConfig?.routingProviders?.status || 'demo_ready'
  const selectedProvider = apiConfig?.routingProviders?.selectedProvider || 'demo_local'
  if (selectedProvider === 'demo_local') {
    issues.push('Routing provider is demo/local only. Route instructions are not from a real routing engine.')
    penalty += 5
  }

  if (issues.length === 0) {
    return { passed: true, severity: 'low', label: 'Map/routing providers configured', detail: 'OSM, routing, and restriction providers are configured.', confidencePenalty: 0 }
  }
  return {
    passed: false, severity: penalty > 20 ? 'high' : 'medium',
    label: `Map/provider issues: ${issues.length} concern${issues.length > 1 ? 's' : ''}`,
    detail: issues.join(' '),
    confidencePenalty: Math.min(35, penalty),
  }
}

/**
 * Check backend/sync freshness.
 */
export function checkBackendSyncFreshness(syncStatus, backendReadiness, demoLiveMode) {
  const isDemo = demoLiveMode === 'demo'
  const provider = backendReadiness?.provider || 'none'
  const hasBackend = provider !== 'none'
  const lastSync = backendReadiness?.lastSyncAt || syncStatus?.lastDemoSyncAt

  if (isDemo) {
    return { passed: true, severity: 'low', label: 'Demo mode — local/demo sync', detail: 'Sync freshness is local/demo only.', confidencePenalty: 5, isDemo: true }
  }
  if (!hasBackend) {
    return { passed: false, severity: 'medium', label: 'No backend configured', detail: 'Live mode selected but no backend provider configured. Sync freshness cannot be verified.', confidencePenalty: 20 }
  }
  if (!lastSync) {
    return { passed: false, severity: 'medium', label: 'No sync timestamp', detail: 'Backend configured but no sync has occurred yet.', confidencePenalty: 15 }
  }
  const ageMins = Math.round((Date.now() - new Date(lastSync).getTime()) / 60000)
  if (ageMins > 60) {
    return { passed: false, severity: 'medium', label: `Sync stale (${ageMins}m ago)`, detail: `Last sync was ${ageMins} minutes ago. Data may be outdated.`, confidencePenalty: 10 }
  }
  return { passed: true, severity: 'low', label: `Backend sync recent (${ageMins}m ago)`, detail: `Last sync: ${new Date(lastSync).toLocaleString()}`, confidencePenalty: 0 }
}

/**
 * Check incident reports for safety/legal concerns.
 */
export function checkIncidentEvidence(incidentReports) {
  if (!incidentReports || incidentReports.length === 0) {
    return { passed: true, severity: 'low', label: 'No incidents recorded', detail: 'No incident reports in current local/demo state.', confidencePenalty: 0 }
  }
  const high = incidentReports.filter(i => i.severity === 'high' || i.severity === 'critical')
  const unreviewed = incidentReports.filter(i => !i.reviewed && !i.reviewedAt)
  return {
    passed: false, severity: high.length > 0 ? 'high' : 'medium',
    label: `${incidentReports.length} incident${incidentReports.length > 1 ? 's' : ''} recorded${unreviewed.length > 0 ? ` (${unreviewed.length} unreviewed)` : ''}`,
    detail: `${high.length > 0 ? `${high.length} high/critical severity. ` : ''}${unreviewed.length > 0 ? `${unreviewed.length} incident${unreviewed.length > 1 ? 's' : ''} require controller review. ` : ''}Evidence must not be deleted. Controller review recommended.`,
    incidentCount: incidentReports.length, highCount: high.length, unreviewedCount: unreviewed.length,
    confidencePenalty: Math.min(25, incidentReports.length * 5 + high.length * 8),
  }
}

/**
 * Check controller review status from controller store.
 */
export function checkControllerReview(controllerActions, controllerNotes, reviewedItems) {
  const reviewActions = (controllerActions || []).filter(a => a.type === 'mark_reviewed')
  const pendingSync   = (controllerActions || []).filter(a => a.status === 'local_saved' && a.type !== 'mark_reviewed')
  const noteCount     = (controllerNotes || []).length
  const reviewedCount = Object.keys(reviewedItems || {}).length

  return {
    passed: true, severity: 'low',
    label: `Controller: ${reviewedCount} reviewed, ${noteCount} note${noteCount !== 1 ? 's' : ''}, ${pendingSync.length} action${pendingSync.length !== 1 ? 's' : ''} pending sync`,
    detail: `Controller review actions are local/advisory. ${pendingSync.length > 0 ? 'Some actions pending backend sync.' : ''}`,
    confidencePenalty: pendingSync.length > 0 ? 5 : 0,
  }
}

// ─── Risk aggregation ─────────────────────────────────────────

/**
 * Calculate advisory risk level from list of check results.
 */
export function calculateAdvisoryRiskLevel(checks) {
  if (!checks || checks.length === 0) return RISK_LEVELS.UNKNOWN
  const severities = checks.map(c => c.severity)
  if (severities.includes('critical')) return RISK_LEVELS.CRITICAL
  if (severities.includes('high'))     return RISK_LEVELS.HIGH
  if (severities.includes('medium'))   return RISK_LEVELS.MEDIUM
  if (severities.includes('low'))      return RISK_LEVELS.LOW
  return RISK_LEVELS.UNKNOWN
}

/**
 * Calculate confidence score 0–100.
 * Starts at 80 (never 100 — data is always partially unknown).
 * Reduced by missing/stale data, demo mode, provider issues.
 */
export function calculateConfidenceScore(checks, isDemo = false) {
  let score = isDemo ? 65 : 80
  for (const c of (checks || [])) {
    if (c.confidencePenalty) score = Math.max(0, score - c.confidencePenalty)
  }
  return Math.round(Math.max(0, Math.min(95, score)))
}

/**
 * Build missing data list from all checks.
 */
export function buildMissingDataList(checks) {
  const missing = []
  for (const c of (checks || [])) {
    if (!c.passed && c.missingFields?.length) missing.push(...c.missingFields)
    if (!c.passed && c.label) missing.push(c.label)
  }
  return [...new Set(missing)]
}

/**
 * Build recommended human checks.
 */
export function buildRecommendedHumanChecks(checks) {
  const recs = [
    'Verify all route signs, restrictions, bridge limits, and access rules in person.',
    'Check company policy and operator guidance before travel.',
    'Confirm vehicle is roadworthy, insured, and documented.',
  ]
  const failed = checks.filter(c => !c.passed)
  if (failed.some(c => c.severity === 'high' || c.severity === 'critical')) {
    recs.unshift('PRIORITY: Resolve high/critical advisory concerns before travel.')
  }
  if (failed.some(c => c.label?.toLowerCase().includes('vehicle'))) {
    recs.push('Verify vehicle dimensions, weight, and legal-critical fields with vehicle documentation.')
  }
  if (failed.some(c => c.label?.toLowerCase().includes('gps'))) {
    recs.push('Verify route progress manually — GPS is unavailable or low confidence.')
  }
  if (failed.some(c => c.label?.toLowerCase().includes('restriction') || c.label?.toLowerCase().includes('overpass'))) {
    recs.push('Check current bridge heights, weight limits, access restrictions, and permits from official sources.')
  }
  if (failed.some(c => c.label?.toLowerCase().includes('incident'))) {
    recs.push('Review all incident reports with fleet manager and controller before resuming travel.')
  }
  return recs
}

/**
 * Build evidence summary.
 */
export function buildEvidenceSummary(inputs) {
  return {
    vehicleId:           inputs.vehicleProfile?.vehicleId   || null,
    vehicleType:         inputs.vehicleType                 || null,
    vehicleReg:          inputs.vehicleProfile?.reg         || null,
    driverId:            inputs.driverStatus?.driverId      || null,
    driverName:          inputs.driverStatus?.name          || null,
    tripId:              inputs.tripStatus?.tripId          || null,
    tripStatus:          inputs.tripStatus?.status          || null,
    tripStartedAt:       inputs.tripStatus?.startedAt       || null,
    checklistCompleted:  !!inputs.preTripChecklist?.completedAt,
    complianceAcked:     !!inputs.complianceAck?.acknowledged,
    routeAcked:          !!inputs.routeAck?.acknowledged,
    gpsPermission:       inputs.gpsStatus?.permission       || 'unknown',
    gpsAccuracy:         inputs.gpsStatus?.accuracyMeters   || null,
    mapProvider:         inputs.apiConfig?.osm?.status      || 'unknown',
    routingProvider:     inputs.apiConfig?.routingProviders?.selectedProvider || 'unknown',
    restrictionProvider: inputs.apiConfig?.overpass?.status  || 'not_configured',
    backendProvider:     inputs.backendReadiness?.provider  || 'none',
    incidentCount:       (inputs.incidentReports || []).length,
    controllerNoteCount: (inputs.controllerNotes || []).length,
    controllerActionCount: (inputs.controllerActions || []).length,
    generatedAt:         _now(),
    isDemo:              inputs.isDemo || false,
    disclaimer:          NO_GUARANTEE,
    advisoryOnly:        true,
  }
}

// ─── Main engine functions ────────────────────────────────────

/**
 * Run Safety Oversight AI check.
 * @param {object} state — all required inputs from SSOT
 * @returns {SafetyOversightResult}
 */
export function runSafetyOversightCheck(state = {}) {
  const {
    vehicleProfile, vehicleType, driverStatus, tripStatus,
    preTripChecklist, routeAcknowledgement, complianceAcknowledgement,
    gpsStatus, apiConfig, mapState, syncStatus, backendReadiness,
    incidentReports, controllerActions, controllerNotes, reviewedItems,
    demoLiveMode, isDemo,
  } = state

  const checks = [
    checkDriverChecklist(preTripChecklist, tripStatus),
    checkDriverAcknowledgements(routeAcknowledgement, complianceAcknowledgement, tripStatus),
    checkGpsConfidence(gpsStatus, tripStatus),
    checkVehicleProfileCompleteness(vehicleProfile, vehicleType),
    checkMapProviderConfidence(apiConfig, mapState),
    checkBackendSyncFreshness(syncStatus, backendReadiness, demoLiveMode),
    checkIncidentEvidence(incidentReports),
    checkControllerReview(controllerActions, controllerNotes, reviewedItems),
  ]

  const riskLevel      = calculateAdvisoryRiskLevel(checks)
  const confidence     = calculateConfidenceScore(checks, isDemo)
  const missingData    = buildMissingDataList(checks)
  const humanChecks    = buildRecommendedHumanChecks(checks)
  const evidence       = buildEvidenceSummary({ ...state })

  const warnings = checks.filter(c => !c.passed).map(c => ({
    severity: c.severity, label: c.label, detail: c.detail,
  }))

  const explanation = riskLevel === 'unknown'
    ? 'Insufficient data to complete safety advisory check. Key inputs are missing.'
    : riskLevel === 'low'
      ? 'No critical safety concerns found in available local data. Human verification of all road conditions, signage, and restrictions is still required.'
      : riskLevel === 'medium'
        ? `${warnings.length} advisory concern${warnings.length !== 1 ? 's' : ''} detected: missing or incomplete data reduces confidence. Human review required before travel.`
        : riskLevel === 'high'
          ? `${warnings.length} significant advisory concern${warnings.length !== 1 ? 's' : ''} detected. High-risk indicators present. Do not proceed without human review and resolution.`
          : `Critical advisory concerns detected. Immediate human review required. Do not proceed.`

  return {
    id:                   _id('saf'),
    agent:                '4P3X Intelligent AI 1 — Safety Oversight AI',
    scope:                'dashboard',
    riskLevel,
    confidenceScore:      confidence,
    missingData,
    warnings,
    explanation,
    recommendedHumanChecks: humanChecks,
    evidenceSummary:      [evidence],
    isDemo:               isDemo || demoLiveMode === 'demo',
    generatedAt:          _now(),
    advisoryOnly:         true,
    disclaimer:           ADVISORY_DISCLAIMER,
    noGuarantee:          NO_GUARANTEE,
    humanVerification:    HUMAN_VERIFICATION_REQUIRED,
  }
}

/**
 * Run Legal Compliance Oversight AI check.
 * @param {object} state — all required inputs from SSOT
 * @returns {LegalComplianceOversightResult}
 */
export function runLegalComplianceOversightCheck(state = {}) {
  const {
    vehicleProfile, vehicleType, driverStatus, tripStatus,
    preTripChecklist, routeAcknowledgement, complianceAcknowledgement,
    gpsStatus, apiConfig, backendReadiness, syncStatus,
    incidentReports, controllerActions, controllerNotes, reviewedItems,
    demoLiveMode, isDemo,
  } = state

  const vehicleCheck   = checkVehicleProfileCompleteness(vehicleProfile, vehicleType)
  const ackCheck       = checkDriverAcknowledgements(routeAcknowledgement, complianceAcknowledgement, tripStatus)
  const providerCheck  = checkMapProviderConfidence(apiConfig, null)
  const syncCheck      = checkBackendSyncFreshness(syncStatus, backendReadiness, demoLiveMode)
  const incidentCheck  = checkIncidentEvidence(incidentReports)
  const ctrlCheck      = checkControllerReview(controllerActions, controllerNotes, reviewedItems)
  const chklistCheck   = checkDriverChecklist(preTripChecklist, tripStatus)

  const checks = [vehicleCheck, ackCheck, providerCheck, syncCheck, incidentCheck, ctrlCheck, chklistCheck]

  // Extra legal-specific checks
  const routeRestrictionConcerns = []
  const dataFreshnessWarnings    = []
  const missingLegalCriticalData = []

  const overpassStatus = apiConfig?.overpass?.status || 'not_configured'
  if (overpassStatus !== 'configured') {
    routeRestrictionConcerns.push(`Restriction data (Overpass API) status: ${overpassStatus}. ${OSM_ADVISORY}`)
    missingLegalCriticalData.push('Route restriction data (Overpass/OSM)')
  }

  const ghHasKey = apiConfig?.graphHopper?.apiKeyStoredSafely
  if (!ghHasKey) {
    routeRestrictionConcerns.push(`GraphHopper route engine not configured. ${GRAPHHOPPER_ADVISORY}`)
    missingLegalCriticalData.push('GraphHopper routing key')
  }

  if (!vehicleCheck.passed && vehicleCheck.missingFields?.length) {
    missingLegalCriticalData.push(...vehicleCheck.missingFields)
  }

  // Hazardous goods
  if (vehicleProfile?.hazardousGoods && !vehicleProfile?.hazardousGoodsClass) {
    routeRestrictionConcerns.push('Hazardous goods flagged but hazardous goods class not specified.')
    missingLegalCriticalData.push('hazardousGoodsClass')
  }

  // Data freshness
  if (syncCheck && !syncCheck.passed) {
    dataFreshnessWarnings.push(syncCheck.label)
  }

  const advisoryRiskLevel = calculateAdvisoryRiskLevel([...checks, { severity: routeRestrictionConcerns.length > 1 ? 'high' : routeRestrictionConcerns.length === 1 ? 'medium' : 'low' }])
  const confidence        = calculateConfidenceScore(checks, isDemo || demoLiveMode === 'demo')
  const humanChecks       = buildRecommendedHumanChecks(checks)
  const evidence          = buildEvidenceSummary({ ...state })

  const explanation = advisoryRiskLevel === 'unknown'
    ? 'Insufficient data to complete legal compliance advisory check.'
    : advisoryRiskLevel === 'low'
      ? 'No significant legal/compliance concerns found in available data. Human verification of all applicable laws, restrictions, and permits is still required.'
      : advisoryRiskLevel === 'medium'
        ? `${missingLegalCriticalData.length} legal-concern indicator${missingLegalCriticalData.length !== 1 ? 's' : ''} detected. Compliance advisory score is reduced. Human review required.`
        : advisoryRiskLevel === 'high'
          ? `High-priority legal advisory concerns. Missing data or restriction provider unavailable. Human review and external verification required before travel.`
          : 'Critical legal advisory concerns detected. Do not proceed without human review, external legal/permit verification, and resolution of all missing data.'

  return {
    id:                    _id('leg'),
    agent:                 '4P3X Intelligent AI 2 — Legal Compliance Oversight AI',
    scope:                 'dashboard',
    advisoryRiskLevel,
    confidenceScore:       confidence,
    missingLegalCriticalData: [...new Set(missingLegalCriticalData)],
    routeRestrictionConcerns,
    dataFreshnessWarnings,
    warnings:              checks.filter(c => !c.passed).map(c => ({ severity: c.severity, label: c.label, detail: c.detail })),
    explanation,
    recommendedHumanChecks: humanChecks,
    evidenceSummary:       [evidence],
    isDemo:                isDemo || demoLiveMode === 'demo',
    generatedAt:           _now(),
    advisoryOnly:          true,
    noGuarantee:           NO_GUARANTEE,
    humanVerification:     HUMAN_VERIFICATION_REQUIRED,
    disclaimer:            ADVISORY_DISCLAIMER,
  }
}

/**
 * Collect all state inputs from localStorage SSOT snapshots.
 * Used by dashboard to gather cross-store data for checks.
 */
export function collectComplianceInputs(demoLiveMode = 'demo') {
  const safeRead = (key) => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null }
  }

  const driverState   = safeRead('bigv:driver:state')
  const controllerState = safeRead('bigv:controller:state')
  const apiConfigState  = safeRead('bigv:api:config')
  const modeState       = safeRead('bigv:mode:demoLive')
  const pwaState        = safeRead('bigv:pwa:deployment')

  // Demo vehicles — use from controller action manager if no live profile
  const DEMO_VEHICLE_TYPE = 'hgv'
  const DEMO_VEHICLE_PROFILE = {
    vehicleId: 'demo-vehicle-002', type: DEMO_VEHICLE_TYPE,
    heightM: null, widthM: null, lengthM: 5.2, weightKg: 3500, reg: 'BV21 ABC',
    profileComplete: false, hazardousGoods: false,
  }

  const isDemo = demoLiveMode === 'demo'

  return {
    vehicleProfile:          isDemo ? DEMO_VEHICLE_PROFILE : null,
    vehicleType:             isDemo ? DEMO_VEHICLE_TYPE : 'default',
    driverStatus:            driverState?.driverStatus || null,
    tripStatus:              driverState?.tripStatus   || null,
    preTripChecklist:        driverState?.preTripChecklist || null,
    routeAcknowledgement:    driverState?.routeAcknowledgement || null,
    complianceAcknowledgement: driverState?.complianceAcknowledgement || null,
    gpsStatus:               driverState?.gpsStatus    || null,
    incidentReports:         driverState?.incidentReports || [],
    controllerActions:       controllerState?.controllerActions || [],
    controllerNotes:         controllerState?.controllerNotes   || [],
    reviewedItems:           controllerState?.reviewedItems     || {},
    apiConfig:               apiConfigState,
    backendReadiness:        modeState?.backendReadiness || null,
    syncStatus:              modeState?.syncStatus      || null,
    demoLiveMode,
    isDemo,
  }
}

export default {
  ADVISORY_DISCLAIMER, HUMAN_VERIFICATION_REQUIRED, NO_GUARANTEE,
  CONFIDENCE_DISCLAIMER, OSM_ADVISORY, GRAPHHOPPER_ADVISORY, DRIVER_RESPONSIBILITY,
  RISK_LEVELS, RISK_DISPLAY, LEGAL_CRITICAL_FIELDS,
  runSafetyOversightCheck, runLegalComplianceOversightCheck, collectComplianceInputs,
  checkVehicleProfileCompleteness, checkDriverChecklist, checkDriverAcknowledgements,
  checkGpsConfidence, checkMapProviderConfidence, checkBackendSyncFreshness,
  checkIncidentEvidence, checkControllerReview,
  calculateAdvisoryRiskLevel, calculateConfidenceScore, buildMissingDataList,
  buildRecommendedHumanChecks, buildEvidenceSummary,
}
