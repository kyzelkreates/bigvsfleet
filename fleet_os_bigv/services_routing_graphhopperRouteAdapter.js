/**
 * ============================================================
 * Big V's Best Routes™ — GraphHopper Production Route Adapter
 * /src/services/routing/graphhopperRouteAdapter.js
 *
 * COMBINED RUN 15–16 — Production GraphHopper Route Optimisation
 *
 * PURPOSE:
 *   Production-grade GraphHopper routing adapter.
 *   Builds route requests, handles profiles, decodes geometry,
 *   extracts instructions/alternatives, confidence-scores results.
 *   Integrates with API Settings Centre key storage.
 *
 * ADVISORY:
 *   "GraphHopper routing is advisory and provider-dependent. It does
 *    not guarantee legal suitability for vehicle dimensions, load,
 *    permits, bridge limits, local access rules, or road restrictions."
 *
 * SECURITY:
 *   No hardcoded API keys. Key read via getRuntimeKey only.
 *   Key never logged or exposed in responses.
 *   Masked display only in UI.
 *
 * DEMO MODE:
 *   Returns labelled demo route. Never calls GH API in Demo Mode.
 * ============================================================
 */

import { getRuntimeKey, RUNTIME_KEYS } from './services_maps_runtimeKeys'
import { DEMO_ROUTE }                   from './services_maps_routeProviderManager'
import { getSupabaseClient, isSupabaseConfigured } from './services_supabase_supabaseClient'

// ── Advisory constant ─────────────────────────────────────────
export const GH_ADVISORY =
  'GraphHopper routing is advisory and provider-dependent. It does not guarantee legal suitability ' +
  'for vehicle dimensions, load, permits, bridge limits, local access rules, or road restrictions.'

export const GH_HGV_WARNING =
  'This provider/profile may not fully account for all legal vehicle restrictions. Human verification is required.'

// ── Status constants ──────────────────────────────────────────
export const GH_STATUS = {
  NOT_CONFIGURED:   'not_configured',
  NO_KEY:           'no_key',
  REQUESTING:       'requesting',
  ROUTE_FOUND:      'route_found',
  NO_ROUTE:         'no_route',
  INVALID_KEY:      'invalid_key',
  RATE_LIMITED:     'rate_limited',
  PROFILE_ERROR:    'profile_error',
  NETWORK_ERROR:    'network_error',
  CORS_ERROR:       'cors_error',
  DEMO_RESULT:      'demo_result',
  FALLBACK_ACTIVE:  'fallback_active',
  ERROR:            'error',
}

// ── GH API base ───────────────────────────────────────────────
const GH_BASE = 'https://graphhopper.com/api/1'

// ── Local SSOT key ────────────────────────────────────────────
const STORAGE_KEY = 'bigv:routing:graphhopperResults'

// ── Mode helper ───────────────────────────────────────────────
function _getMode() {
  try { return JSON.parse(localStorage.getItem('bigv:mode:demoLive') || '{}')?.demoLiveMode?.mode ?? 'demo' } catch { return 'demo' }
}

// ════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════

/**
 * getGraphHopperConfig()
 * Reads GH config from API Settings / SSOT.
 * Never returns the raw API key.
 */
export function getGraphHopperConfig() {
  try {
    const raw = localStorage.getItem('bigv:config:apiConfig')
    const cfg = raw ? JSON.parse(raw) : {}
    return {
      profile:            cfg?.graphHopper?.profile        || 'car',
      vehicleProfile:     cfg?.graphHopper?.vehicleProfile || 'car',
      apiKeyStoredSafely: cfg?.graphHopper?.apiKeyStoredSafely || false,
      apiKeyMasked:       cfg?.graphHopper?.apiKeyMasked   || '',
      status:             cfg?.graphHopper?.status         || 'not_configured',
    }
  } catch { return { profile: 'car', vehicleProfile: 'car', apiKeyStoredSafely: false, apiKeyMasked: '', status: 'not_configured' } }
}

/**
 * isGraphHopperConfigured()
 */
export function isGraphHopperConfigured() {
  const key = getRuntimeKey ? getRuntimeKey(RUNTIME_KEYS.GRAPHHOPPER) : ''
  return !!(key && key.trim().length > 5)
}

// ════════════════════════════════════════════════════════════════
// PROFILE NORMALISATION
// ════════════════════════════════════════════════════════════════

const GH_PROFILES = ['car', 'truck', 'small_truck', 'van', 'bike', 'foot', 'hike', 'mt_bike', 'racingbike', 'scooter']

/**
 * normaliseVehicleProfileForGraphHopper()
 * Maps BigV vehicle profile to GH profile string.
 */
export function normaliseVehicleProfileForGraphHopper(profile) {
  const p = (profile || 'car').toLowerCase()
  if (['truck', 'lorry', 'hgv'].includes(p))      return 'truck'
  if (['small_truck', 'van', 'lgv'].includes(p))   return 'small_truck'
  if (['van_light', 'transit'].includes(p))         return 'van'
  if (['bike', 'bicycle'].includes(p))              return 'bike'
  if (['foot', 'walk', 'pedestrian'].includes(p))   return 'foot'
  return GH_PROFILES.includes(p) ? p : 'car'
}

/**
 * selectRoutingProfile()
 * Returns the best GH profile for a vehicle/scenario.
 */
export function selectRoutingProfile(vehicleProfile, ghConfig) {
  const fromConfig = ghConfig?.profile || ghConfig?.vehicleProfile || 'car'
  return vehicleProfile
    ? normaliseVehicleProfileForGraphHopper(vehicleProfile)
    : normaliseVehicleProfileForGraphHopper(fromConfig)
}

// ════════════════════════════════════════════════════════════════
// REQUEST BUILDER
// ════════════════════════════════════════════════════════════════

/**
 * buildGraphHopperRouteRequest()
 * Builds the GH /route API request payload.
 * @param {Object} params
 *   - origin: { lat, lng }
 *   - destination: { lat, lng }
 *   - waypoints: Array<{ lat, lng }>
 *   - profile: string
 *   - alternatives: boolean
 *   - instructions: boolean
 */
export function buildGraphHopperRouteRequest(params) {
  const { origin, destination, waypoints = [], profile = 'car', alternatives = false, instructions = true } = params

  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng)
    throw new Error('Origin and destination lat/lng are required')

  const points = [
    [origin.lng, origin.lat],
    ...waypoints.filter(w => w?.lat && w?.lng).map(w => [w.lng, w.lat]),
    [destination.lng, destination.lat],
  ]

  return {
    points,
    profile:            normaliseVehicleProfileForGraphHopper(profile),
    instructions,
    calc_points:        true,
    points_encoded:     true,
    elevation:          false,
    optimize:           false,
    algorithm:          alternatives ? 'alternative_route' : 'dijkstra',
    'alternative_route.max_paths':             alternatives ? 2 : 1,
    'alternative_route.max_weight_factor':     1.6,
    'alternative_route.max_share_factor':      0.6,
  }
}

// ════════════════════════════════════════════════════════════════
// FETCH ROUTE
// ════════════════════════════════════════════════════════════════

/**
 * fetchGraphHopperRoute()
 * Calls GH /route API and returns normalised result.
 */
export async function fetchGraphHopperRoute(params) {
  const mode = _getMode()
  if (mode === 'demo') return createDemoGHRoute(params)

  const key = getRuntimeKey ? getRuntimeKey(RUNTIME_KEYS.GRAPHHOPPER) : ''
  if (!key || key.trim().length < 5) {
    return createFallbackGHRoute(params, GH_STATUS.NO_KEY, 'GraphHopper API key not configured. Add key in API Settings Centre.')
  }

  const ghConfig = getGraphHopperConfig()
  const profile  = selectRoutingProfile(params.vehicleProfile, ghConfig)

  let reqBody
  try { reqBody = buildGraphHopperRouteRequest({ ...params, profile, alternatives: true }) }
  catch (e) { return createFallbackGHRoute(params, GH_STATUS.ERROR, e.message) }

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(`${GH_BASE}/route?key=${key}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(reqBody),
      signal:  controller.signal,
    })
    clearTimeout(timer)

    if (res.status === 401) return createFallbackGHRoute(params, GH_STATUS.INVALID_KEY, 'GraphHopper key invalid or expired.')
    if (res.status === 429) return createFallbackGHRoute(params, GH_STATUS.RATE_LIMITED, 'GraphHopper rate limit reached.')
    if (res.status === 400) {
      const errBody = await res.json().catch(() => ({}))
      const msg = errBody?.message || `Unsupported profile or request error (${profile})`
      if (msg.toLowerCase().includes('profile') || msg.toLowerCase().includes('unknown'))
        return createFallbackGHRoute(params, GH_STATUS.PROFILE_ERROR, `Profile "${profile}" not supported: ${msg}`)
      return createFallbackGHRoute(params, GH_STATUS.ERROR, msg)
    }
    if (!res.ok) return createFallbackGHRoute(params, GH_STATUS.NETWORK_ERROR, `HTTP ${res.status}`)

    const data = await res.json()
    return parseGraphHopperResponse(data, params, profile, ghConfig)

  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') return createFallbackGHRoute(params, GH_STATUS.NETWORK_ERROR, 'GraphHopper request timed out.')
    const isCors = e.message?.toLowerCase().includes('cors') || e.message?.toLowerCase().includes('fetch')
    return createFallbackGHRoute(params, isCors ? GH_STATUS.CORS_ERROR : GH_STATUS.NETWORK_ERROR, e.message)
  }
}

// ════════════════════════════════════════════════════════════════
// RESPONSE PARSER
// ════════════════════════════════════════════════════════════════

/**
 * parseGraphHopperResponse()
 * Normalises raw GH /route response.
 */
export function parseGraphHopperResponse(data, params, profile, config) {
  if (!data?.paths?.length) {
    return createFallbackGHRoute(params, GH_STATUS.NO_ROUTE, 'No route paths returned by GraphHopper.')
  }

  const primary  = data.paths[0]
  const coords   = decodePolylineIfNeeded(primary.points)
  const alts     = data.paths.slice(1).map((p, i) => ({
    index:         i + 1,
    distanceMeters: p.distance,
    durationMs:    p.time,
    coordinates:   decodePolylineIfNeeded(p.points),
    instructions:  extractInstructions(p.instructions),
  }))

  const result = {
    id:              `gh-${Date.now()}`,
    routeId:         params.routeId || null,
    provider:        'graphhopper',
    profile,
    vehicleProfile:  params.vehicleProfile || profile,
    distanceMeters:  primary.distance,
    durationMs:      primary.time,
    coordinates:     coords,            // [lng, lat] pairs — caller swaps for Leaflet
    instructions:    extractInstructions(primary.instructions),
    alternatives:    alts,
    ascendMeters:    primary.ascend  || 0,
    descendMeters:   primary.descend || 0,
    providerStatus:  GH_STATUS.ROUTE_FOUND,
    confidenceScore: calculateRouteProviderConfidence(data, profile),
    advisory:        GH_ADVISORY,
    hgvWarning:      ['truck', 'small_truck'].includes(profile) ? GH_HGV_WARNING : null,
    error:           null,
    isDemo:          false,
    is_demo:         false,
    advisoryOnly:    true,
    noGuarantee:     true,
    generatedAt:     new Date().toISOString(),
    ghInfos:         data.info || {},
  }

  saveGHRouteResult(result)
  _saveToSupabase(result).catch(() => {})
  return result
}

/**
 * decodePolylineIfNeeded()
 * Decodes GH encoded polyline string to [lng, lat] array.
 * If already an object with coordinates, extracts them.
 */
export function decodePolylineIfNeeded(pointsOrEncoded) {
  if (!pointsOrEncoded) return []

  // Already GeoJSON-style
  if (pointsOrEncoded?.coordinates) return pointsOrEncoded.coordinates
  if (Array.isArray(pointsOrEncoded)) return pointsOrEncoded

  // Encoded polyline string (GH format)
  if (typeof pointsOrEncoded === 'string') {
    return _decodePolyline(pointsOrEncoded, 1e6)
  }
  return []
}

/**
 * _decodePolyline()
 * Decodes a Google/GH encoded polyline string.
 * GH uses precision 1e6 (6 decimal places).
 */
function _decodePolyline(encoded, precision = 1e6) {
  const coords = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    coords.push([lng / precision, lat / precision])  // [lng, lat]
  }
  return coords
}

/**
 * extractDistanceDuration()
 */
export function extractDistanceDuration(path) {
  return {
    distanceMeters: path?.distance || 0,
    durationMs:     path?.time     || 0,
    distanceKm:     ((path?.distance || 0) / 1000).toFixed(1),
    durationMin:    Math.round((path?.time || 0) / 60000),
  }
}

/**
 * extractInstructions()
 * Normalises GH turn-by-turn instructions.
 */
export function extractInstructions(instructions) {
  if (!Array.isArray(instructions)) return []
  return instructions.map((ins, i) => ({
    index:        i,
    text:         ins.text || '',
    distanceM:    ins.distance || 0,
    timeMs:       ins.time     || 0,
    sign:         ins.sign     || 0,   // GH turn sign: 0=straight, 2=right, -2=left etc.
    streetName:   ins.street_name || '',
    exitNumber:   ins.exit_number || null,
    annotation:   ins.annotation?.text || null,
  }))
}

/**
 * extractRouteAlternatives()
 */
export function extractRouteAlternatives(paths) {
  return (paths || []).slice(1).map((p, i) => ({
    index: i + 1,
    distanceMeters: p.distance,
    durationMs:     p.time,
    coordinates:    decodePolylineIfNeeded(p.points),
    instructions:   extractInstructions(p.instructions),
  }))
}

/**
 * calculateRouteProviderConfidence()
 * Returns 0–100 confidence for this GH route result.
 */
export function calculateRouteProviderConfidence(data, profile) {
  if (!data?.paths?.length) return 0
  let score = 60
  if (data.paths.length > 1)          score += 10   // alternatives found
  if (data.paths[0]?.instructions?.length > 3) score += 15  // instructions
  if (['truck', 'small_truck'].includes(profile)) score -= 15  // HGV profiles less certain
  return Math.min(Math.max(score, 10), 90)
}

// ════════════════════════════════════════════════════════════════
// FALLBACK + DEMO
// ════════════════════════════════════════════════════════════════

export function createFallbackGHRoute(params, status, errorMsg) {
  const fallbackCoords = DEMO_ROUTE?.coordinates || []
  return {
    id:              `gh-fallback-${Date.now()}`,
    routeId:         params?.routeId || null,
    provider:        'graphhopper',
    profile:         params?.vehicleProfile || 'car',
    vehicleProfile:  params?.vehicleProfile || 'car',
    distanceMeters:  DEMO_ROUTE?.distance   || 0,
    durationMs:      (DEMO_ROUTE?.duration  || 0) * 1000,
    coordinates:     fallbackCoords,
    instructions:    [],
    alternatives:    [],
    providerStatus:  status || GH_STATUS.FALLBACK_ACTIVE,
    confidenceScore: 0,
    advisory:        GH_ADVISORY,
    hgvWarning:      null,
    fallbackUsed:    true,
    fallbackReason:  errorMsg || 'GraphHopper unavailable — demo route shown.',
    error:           errorMsg || null,
    isDemo:          false,
    is_demo:         false,
    advisoryOnly:    true,
    noGuarantee:     true,
    generatedAt:     new Date().toISOString(),
  }
}

export function createDemoGHRoute(params) {
  const demoCoords = DEMO_ROUTE?.coordinates || [[-0.118092, 51.509865], [-0.076132, 51.508530]]
  return {
    id:              `gh-demo-${Date.now()}`,
    routeId:         params?.routeId || 'demo-route',
    provider:        'graphhopper',
    profile:         params?.vehicleProfile || 'car',
    vehicleProfile:  params?.vehicleProfile || 'car',
    distanceMeters:  DEMO_ROUTE?.distance   || 8500,
    durationMs:      (DEMO_ROUTE?.duration  || 1200) * 1000,
    coordinates:     demoCoords,
    instructions:    [
      { index: 0, text: 'Demo: Head east on route',   distanceM: 2000, timeMs: 180000, sign: 0,  streetName: 'Demo Road' },
      { index: 1, text: 'Demo: Turn right',           distanceM: 3500, timeMs: 420000, sign: 2,  streetName: 'Demo High Street' },
      { index: 2, text: 'Demo: Continue to destination', distanceM: 3000, timeMs: 360000, sign: 0, streetName: '' },
    ],
    alternatives:    [],
    providerStatus:  GH_STATUS.DEMO_RESULT,
    confidenceScore: 40,
    advisory:        GH_ADVISORY,
    hgvWarning:      null,
    fallbackUsed:    false,
    error:           null,
    isDemo:          true,
    is_demo:         true,
    advisoryOnly:    true,
    noGuarantee:     true,
    generatedAt:     new Date().toISOString(),
  }
}

export function normaliseGHError(error) {
  if (!error) return null
  const msg = String(error?.message || error)
  if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) return { type: GH_STATUS.INVALID_KEY, message: 'GraphHopper key invalid.' }
  if (msg.includes('429'))   return { type: GH_STATUS.RATE_LIMITED,  message: 'Rate limit reached.' }
  if (msg.includes('timeout') || error.name === 'AbortError') return { type: GH_STATUS.NETWORK_ERROR, message: 'Request timed out.' }
  return { type: GH_STATUS.ERROR, message: msg.slice(0, 200) }
}

// ── Local SSOT ────────────────────────────────────────────────
export function saveGHRouteResult(result) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    localStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...existing].slice(0, 20)))
  } catch (e) { console.warn('[BigV:GH] saveResult failed:', e) }
}

export function getLatestGHRouteResult(routeId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return routeId ? all.find(r => r.routeId === routeId) : all[0] || null
  } catch { return null }
}

// ── Supabase save ─────────────────────────────────────────────
async function _saveToSupabase(result) {
  if (!isSupabaseConfigured()) return
  const client = getSupabaseClient()
  if (!client) return
  try {
    await client.from('route_risk_results').insert({
      organisation_id:  null,
      route_id:         result.routeId || null,
      provider:         result.provider,
      risk_level:       result.hgvWarning ? 'advisory' : 'low',
      confidence_score: result.confidenceScore,
      advisory_only:    true,
      is_demo:          false,
      metadata: {
        providerStatus:  result.providerStatus,
        profile:         result.profile,
        distanceMeters:  result.distanceMeters,
        durationMs:      result.durationMs,
        alternatives:    result.alternatives?.length || 0,
        instructions:    result.instructions?.length || 0,
        generatedAt:     result.generatedAt,
        run:             1516,
      },
    })
  } catch (e) { console.warn('[BigV:GH] Supabase save skipped:', e.message) }
}

export default {
  getGraphHopperConfig,
  isGraphHopperConfigured,
  buildGraphHopperRouteRequest,
  normaliseVehicleProfileForGraphHopper,
  selectRoutingProfile,
  fetchGraphHopperRoute,
  parseGraphHopperResponse,
  decodePolylineIfNeeded,
  extractDistanceDuration,
  extractInstructions,
  extractRouteAlternatives,
  calculateRouteProviderConfidence,
  createFallbackGHRoute,
  createDemoGHRoute,
  saveGHRouteResult,
  getLatestGHRouteResult,
  normaliseGHError,
  GH_STATUS,
  GH_ADVISORY,
  GH_HGV_WARNING,
}
