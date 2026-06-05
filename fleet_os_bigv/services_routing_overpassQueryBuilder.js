/**
 * ============================================================
 * Big V's Best Routes™ — Overpass Query Builder
 * /src/services/routing/overpassQueryBuilder.js
 *
 * COMBINED RUN 15–16 — Advanced Overpass Restriction Query Engine
 *
 * PURPOSE:
 *   Builds safe, conservative Overpass QL queries for advisory
 *   vehicle restriction lookup along a route corridor or bbox.
 *
 * SAFETY:
 *   All outputs are advisory only. Public Overpass data may be
 *   incomplete, outdated, or unavailable. No query result means
 *   no restrictions known — NOT that no restrictions exist.
 *
 * ADVISORY:
 *   "Route and restriction outputs are advisory only. Public map/
 *    routing data may be incomplete, outdated, missing, or inaccurate.
 *    Always verify current signage, restrictions, bridge limits, permits,
 *    access rules, road conditions, vehicle suitability, and company
 *    policy before travel."
 *
 * SECURITY:
 *   No API keys. No secrets. Reads public Overpass endpoint only.
 *   Endpoint configurable via API Settings Centre.
 * ============================================================
 */

// ── Advisory constant ─────────────────────────────────────────
export const OVERPASS_ADVISORY =
  'Overpass/OSM restriction data is advisory only. Data may be incomplete, outdated, missing, or unavailable. ' +
  'Verify current road signage, official sources, permits, bridge limits, access rules, and road conditions before travel.'

export const NO_DATA_WARNING =
  'No Overpass restriction data was returned. This does not mean there are no restrictions. ' +
  'Verify current signage, official sources, permits, bridge limits, access rules, and road conditions.'

// ── Restriction tags relevant to vehicles ─────────────────────
const BASE_RESTRICTION_TAGS = [
  'maxheight', 'maxweight', 'maxwidth', 'maxlength', 'maxaxleload',
  'access', 'hgv', 'goods', 'motor_vehicle', 'vehicle',
  'bridge', 'tunnel', 'hazmat', 'hazard',
  'width', 'lanes', 'lit', 'surface', 'smoothness',
  'toll', 'charge', 'ford',
]

const HGV_TAGS = [
  'hgv', 'hgv:state_road', 'hgv:advisory', 'maxweight',
  'maxaxleload', 'maxheight', 'maxwidth', 'maxlength',
  'access', 'goods', 'vehicle',
]

const BRIDGE_TAGS = [
  'bridge', 'tunnel', 'maxheight', 'maxweight', 'maxwidth',
  'layer', 'ford',
]

/**
 * getRestrictionTagsForVehicleType()
 * Returns OSM tag key list relevant to a given vehicle class.
 * @param {string} vehicleType - 'hgv' | 'lgv' | 'car' | 'van' | 'bus' | 'any'
 * @returns {string[]}
 */
export function getRestrictionTagsForVehicleType(vehicleType) {
  switch ((vehicleType || 'any').toLowerCase()) {
    case 'hgv':
    case 'truck':
    case 'lorry':
      return [...new Set([...HGV_TAGS, ...BRIDGE_TAGS, ...BASE_RESTRICTION_TAGS])]
    case 'van':
    case 'lgv':
      return [...new Set(['maxheight', 'maxweight', 'maxwidth', 'access', 'hgv', 'vehicle', 'bridge', 'tunnel', 'toll', ...BASE_RESTRICTION_TAGS])]
    case 'bus':
      return [...new Set(['maxheight', 'maxwidth', 'access', 'vehicle', 'motor_vehicle', 'bridge', 'tunnel', ...BASE_RESTRICTION_TAGS])]
    default:
      return BASE_RESTRICTION_TAGS
  }
}

/**
 * buildBoundingBoxFromRoute()
 * Creates a conservative bbox from route coordinates with padding.
 * @param {Array<[number,number]>} coords - array of [lat, lng] or [lng, lat]
 * @param {number} paddingDeg - padding in degrees (default 0.01 ≈ ~1km)
 * @returns {{ south, west, north, east, valid: boolean }}
 */
export function buildBoundingBoxFromRoute(coords, paddingDeg = 0.01) {
  if (!Array.isArray(coords) || coords.length < 2) {
    return { south: 0, west: 0, north: 0, east: 0, valid: false }
  }
  // Accept [lat,lng] or [lng,lat] — detect by value range
  // lat range: -90 to 90; lng range: -180 to 180
  const isLngLat = Math.abs(coords[0][0]) > 90
  const lats = coords.map(c => isLngLat ? c[1] : c[0])
  const lngs = coords.map(c => isLngLat ? c[0] : c[1])

  return {
    south: Math.min(...lats) - paddingDeg,
    west:  Math.min(...lngs) - paddingDeg,
    north: Math.max(...lats) + paddingDeg,
    east:  Math.max(...lngs) + paddingDeg,
    valid: true,
  }
}

/**
 * buildBoundingBoxRestrictionQuery()
 * Builds Overpass QL for restriction tags within a bbox.
 * Conservative — only ways with known restriction tags.
 * @param {{ south, west, north, east }} bbox
 * @param {Object} options
 *   - vehicleType: 'hgv' | 'lgv' | 'car' | 'any'
 *   - outputFormat: 'json' (default)
 *   - timeoutSecs: number
 * @returns {string} Overpass QL query
 */
export function buildBoundingBoxRestrictionQuery(bbox, options = {}) {
  if (!bbox?.valid) return ''
  const { south, west, north, east } = bbox
  const timeout  = Math.min(options.timeoutSecs || 20, 30)   // max 30s on public endpoint
  const bboxStr  = `${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)}`
  const vType    = options.vehicleType || 'any'
  const tags     = getRestrictionTagsForVehicleType(vType)

  // Build tag filters — look for ways with ANY of these keys
  const tagFilters = tags.slice(0, 10)  // limit to 10 to avoid oversized queries
    .map(t => `way["${t}"](${bboxStr});`)
    .join('\n  ')

  return `
[out:json][timeout:${timeout}];
(
  ${tagFilters}
  node["maxheight"](${bboxStr});
  node["maxweight"](${bboxStr});
  node["barrier"](${bboxStr});
  relation["restriction"](${bboxStr});
);
out body;
>;
out skel qt;`
}

/**
 * buildRouteCorridorQuery()
 * Builds a query using a simplified route corridor (sampled points).
 * For complex routes, falls back to bbox approach.
 * @param {Array<[number,number]>} coords
 * @param {Object} options
 * @returns {string} Overpass QL
 */
export function buildRouteCorridorQuery(coords, options = {}) {
  if (!Array.isArray(coords) || coords.length < 2) return ''
  // Sample up to 8 points from the route to avoid oversized poly
  const step    = Math.max(1, Math.floor(coords.length / 8))
  const sampled = coords.filter((_, i) => i % step === 0 || i === coords.length - 1).slice(0, 8)
  const bbox    = buildBoundingBoxFromRoute(sampled, 0.008)
  return buildBoundingBoxRestrictionQuery(bbox, options)
}

/**
 * buildVehicleRelevantRestrictionQuery()
 * Master query selector — uses corridor or bbox depending on coords length.
 */
export function buildVehicleRelevantRestrictionQuery(vehicleProfile, routeCoords, options = {}) {
  const vType = normaliseVehicleTypeForOverpass(vehicleProfile)
  if (!Array.isArray(routeCoords) || routeCoords.length < 2) return ''
  // Short routes: corridor query; long routes: bbox
  if (routeCoords.length <= 50) {
    return buildRouteCorridorQuery(routeCoords, { ...options, vehicleType: vType })
  }
  const bbox = buildBoundingBoxFromRoute(routeCoords, 0.01)
  return buildBoundingBoxRestrictionQuery(bbox, { ...options, vehicleType: vType })
}

/**
 * normaliseVehicleTypeForOverpass()
 * Maps vehicle profile strings to Overpass vehicle type.
 */
export function normaliseVehicleTypeForOverpass(profile) {
  const p = (profile || 'car').toLowerCase()
  if (['truck', 'lorry', 'hgv', 'small_truck'].includes(p)) return 'hgv'
  if (['van', 'lgv', 'transit'].includes(p))                 return 'lgv'
  if (['bus', 'coach'].includes(p))                           return 'bus'
  return 'any'
}

/**
 * normaliseOverpassQueryOptions()
 * Returns safe defaults for query options.
 */
export function normaliseOverpassQueryOptions(config = {}) {
  return {
    vehicleType:  config.vehicleType  || 'any',
    timeoutSecs:  Math.min(config.timeoutSecs || 20, 30),
    outputFormat: 'json',
    maxBboxSize:  config.maxBboxSize  || 0.5,   // deg — refuse queries over this
  }
}

/**
 * validateOverpassEndpoint()
 * Checks endpoint URL is safe and not a secret.
 */
export function validateOverpassEndpoint(url) {
  if (!url || typeof url !== 'string') return { valid: false, reason: 'No endpoint URL provided.' }
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))
    return { valid: false, reason: 'Endpoint must start with http:// or https://' }
  if (trimmed.includes('key=') || trimmed.includes('token=') || trimmed.includes('secret'))
    return { valid: false, reason: 'Endpoint URL must not contain API keys, tokens, or secrets.' }
  return { valid: true }
}

/**
 * buildSafeTimeoutConfig()
 * Returns AbortController + signal for fetch timeout.
 */
export function buildSafeTimeoutConfig(timeoutMs = 15000) {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), Math.min(timeoutMs, 30000))
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

export default {
  buildBoundingBoxFromRoute,
  buildBoundingBoxRestrictionQuery,
  buildRouteCorridorQuery,
  buildVehicleRelevantRestrictionQuery,
  getRestrictionTagsForVehicleType,
  normaliseVehicleTypeForOverpass,
  normaliseOverpassQueryOptions,
  validateOverpassEndpoint,
  buildSafeTimeoutConfig,
  OVERPASS_ADVISORY,
  NO_DATA_WARNING,
}
