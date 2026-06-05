/**
 * ============================================================
 * Big V's Best Routes™ — Route Provider Manager
 * /src/services/maps/routeProviderManager.js
 *
 * RUN 5 — Map Engine Foundation
 *
 * PURPOSE:
 *   Single entry point for route data used by the map engine.
 *   - Returns demo route if no provider configured.
 *   - Wraps GraphHopper adapter and existing localRoutingEngine.
 *   - Normalises all route data into map-friendly shape.
 *   - Reads provider selection from Run 4 useApiConfigStore SSOT.
 *   - Never creates duplicate state.
 *   - Never hardcodes API keys.
 *
 * Route shape (all routes):
 * {
 *   id:               string
 *   isDemo:           boolean
 *   name:             string
 *   provider:         'demo_local' | 'graphhopper' | 'osrm' | 'local' | ...
 *   status:           'demo' | 'parsed' | 'error' | 'fallback' | 'no_key'
 *   coordinates:      [[lng, lat], ...]  — [lng,lat] for GH compat
 *   start:            { label, lat, lng }
 *   destination:      { label, lat, lng }
 *   waypoints:        [{ label, lat, lng }, ...]
 *   distanceMeters:   number | null
 *   durationSeconds:  number | null
 *   instructions:     []
 *   warnings:         string[]
 *   advisoryNotice:   string
 * }
 *
 * COORDINATE CONVENTION:
 *   All routes use [lng, lat] pairs in `coordinates`.
 *   ApexMap polyline renderer handles the swap to Leaflet [lat,lng].
 *   Start/destination/waypoints use { lat, lng } objects.
 *
 * SAFETY:
 *   All outputs carry advisory warnings.
 *   Routes are advisory only — not legally compliant guidance.
 * ============================================================
 */

import { useApiConfigStore } from './core_storage'
import { getRuntimeKey, RUNTIME_KEYS } from './services_maps_runtimeKeys'
import { fetchGraphHopperRoute, GH_ADAPTER_STATUS } from './services_maps_graphhopperAdapter'
import { MAP_ADVISORY } from './services_maps_mapProviderManager'

// ─── Standard advisory warnings ──────────────────────────────
const ROUTE_WARNINGS = [
  MAP_ADVISORY.route,
  'Route data may be incomplete or outdated.',
  'Public map data is not legally authoritative.',
  'Drivers, controllers, and fleet managers must verify signage, permits, restrictions, bridge limits, access rules, and road conditions.',
]

const DEMO_WARNINGS = [
  'Demo route only — not live routing data.',
  'Not legal routing advice.',
  MAP_ADVISORY.route,
]

// ─── Demo route (Bristol, UK — realistic sample) ──────────────
// Clearly marked isDemo: true. Not live. Not legally approved.
// Coordinates: [lng, lat] (GH convention, Leaflet swap applied by ApexMap)
export const DEMO_ROUTE = {
  id:              'demo-route-001',
  isDemo:          true,
  name:            'Demo Fleet Route — Bristol City Centre',
  provider:        'demo_local',
  status:          'demo',
  coordinates: [
    [-2.5879, 51.4545],
    [-2.5843, 51.4556],
    [-2.5810, 51.4568],
    [-2.5775, 51.4580],
    [-2.5740, 51.4588],
    [-2.5715, 51.4592],
    [-2.5700, 51.4600],
  ],
  start: {
    label: 'Demo Start (Temple Meads area)',
    lng:   -2.5879,
    lat:   51.4545,
  },
  destination: {
    label: 'Demo Destination (City Centre)',
    lng:   -2.5700,
    lat:   51.4600,
  },
  waypoints: [
    { label: 'Demo Stop A', lng: -2.5810, lat: 51.4568 },
  ],
  distanceMeters:  1650,     // approximate
  durationSeconds: 420,      // approximate
  instructions:    [],
  warnings:        DEMO_WARNINGS,
  advisoryNotice:  MAP_ADVISORY.route,
  attribution:     'Demo data only · Map data © OpenStreetMap contributors',
}

// ─── Fallback empty route ─────────────────────────────────────
const EMPTY_ROUTE = {
  id:             'empty-route',
  isDemo:         false,
  name:           'No Route Available',
  provider:       'none',
  status:         'fallback',
  coordinates:    [],
  start:          null,
  destination:    null,
  waypoints:      [],
  distanceMeters: null,
  durationSeconds:null,
  instructions:   [],
  warnings:       ROUTE_WARNINGS,
  advisoryNotice: MAP_ADVISORY.route,
  attribution:    'Map data © OpenStreetMap contributors',
  message:        'No route coordinates available. Demo route fallback shown in demo mode.',
}

/**
 * Get the active route provider name from SSOT (Run 4 API config).
 * Falls back to 'demo_local' if unavailable.
 * @returns {string}
 */
export function getActiveRouteProvider() {
  try {
    return useApiConfigStore.getState()?.routingProviders?.selectedProvider || 'demo_local'
  } catch {
    return 'demo_local'
  }
}

/**
 * Get GraphHopper profile from SSOT.
 * @returns {string}
 */
export function getGraphHopperProfile() {
  try {
    return useApiConfigStore.getState()?.graphHopper?.vehicleProfile || 'car'
  } catch {
    return 'car'
  }
}

/**
 * Check if GraphHopper is configured (key in runtimeKeys).
 * @returns {boolean}
 */
export function isGraphHopperConfigured() {
  try {
    return !!(getRuntimeKey(RUNTIME_KEYS.GRAPHHOPPER))
  } catch {
    return false
  }
}

/**
 * Get a route for map display.
 *
 * Resolution order:
 *   1. If origin+destination provided + provider configured → try live routing
 *   2. GraphHopper if key exists and provider = 'graphhopper'
 *   3. OSRM/local for other open-source providers (via existing localRoutingEngine)
 *   4. Demo route fallback if demo mode
 *   5. Empty route if no data
 *
 * @param {object} options
 *   @param {object}  options.origin       — { lat, lng } or null
 *   @param {object}  options.destination  — { lat, lng } or null
 *   @param {boolean} options.isDemoMode   — current demo/live mode
 *   @param {object}  options.existingRoute — already-computed route to normalise
 *   @param {string}  options.profile      — routing profile override
 * @returns {Promise<RouteShape>}
 */
export async function getRouteForMap(options = {}) {
  const {
    origin         = null,
    destination    = null,
    isDemoMode     = true,
    existingRoute  = null,
    profile        = null,
  } = options

  // If an existing route was passed (e.g. from RoutePlanner), normalise and return it
  if (existingRoute) {
    return normaliseExistingRoute(existingRoute)
  }

  const provider      = getActiveRouteProvider()
  const activeProfile = profile || getGraphHopperProfile()

  // Try live routing if origin + destination provided
  if (origin && destination && _validCoord(origin) && _validCoord(destination)) {
    if (provider === 'graphhopper' && isGraphHopperConfigured()) {
      const result = await fetchGraphHopperRoute(origin, destination, { profile: activeProfile })
      if (result.status === GH_ADAPTER_STATUS.PARSED && result.coordinates.length > 0) {
        return {
          ...result,
          id:         `gh-route-${Date.now()}`,
          name:       'GraphHopper Route',
          start:      { label: 'Start', ...origin },
          destination:{ label: 'Destination', ...destination },
          waypoints:  [],
          warnings:   ROUTE_WARNINGS,
        }
      }
      // GH failed — fall through to demo/empty
    }

    // For OSRM / other providers — they're handled by existing localRoutingEngine
    // Return a structured stub with the coordinates for the caller to fill
    if (provider === 'osrm' || provider === 'demo_local') {
      // localRoutingEngine will be called by RoutePlanner — we return empty for now
      // The map will show markers without a polyline until route is computed
    }
  }

  // Demo mode → demo route
  if (isDemoMode) {
    return { ...DEMO_ROUTE }
  }

  // No route available
  return { ...EMPTY_ROUTE }
}

/**
 * Normalise an existing route (from RoutePlanner / mapService) into the
 * standard Run 5 route shape for map display.
 *
 * Handles:
 *   - GH-format routes (geometry.coordinates [lng,lat])
 *   - OSRM-format routes (geometry.coordinates or legacy format)
 *   - Already-normalised routes
 *
 * @param {object} route — raw or partially-normalised route
 * @returns {RouteShape}
 */
export function normaliseExistingRoute(route) {
  if (!route) return { ...EMPTY_ROUTE }

  try {
    // Extract coordinates — handle multiple formats
    let coordinates = []

    // Format 1: { geometry: { coordinates: [[lng,lat],...] } } — GH/OSRM GeoJSON
    if (route.geometry?.coordinates?.length) {
      coordinates = route.geometry.coordinates.filter(c =>
        Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])
      )
    }
    // Format 2: { coordinates: [[lng,lat],...] } — already normalised
    else if (route.coordinates?.length) {
      coordinates = route.coordinates.filter(c =>
        Array.isArray(c) ? (c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) :
        (c && isFinite(c.lat) && isFinite(c.lng))
      )
    }

    const distanceMeters  = route.distance     ?? route.distanceMeters  ?? null
    const durationSeconds = route.duration     ?? route.durationSeconds ??
                            (route.durationMs  ? Math.round(route.durationMs / 1000) : null)

    return {
      id:              route.id              || `route-${Date.now()}`,
      isDemo:          route.isDemo          || false,
      name:            route.name            || 'Route',
      provider:        route.activeProvider  || route.provider || route.source || 'unknown',
      status:          coordinates.length > 0 ? 'parsed' : 'fallback',
      coordinates,
      start:           route.start           || null,
      destination:     route.destination     || null,
      waypoints:       route.waypoints       || [],
      distanceMeters,
      durationSeconds,
      instructions:    route.instructions    || [],
      warnings:        ROUTE_WARNINGS,
      advisoryNotice:  MAP_ADVISORY.route,
      attribution:     route.attribution     || 'Map data © OpenStreetMap contributors',
    }
  } catch (err) {
    console.warn('[RouteProviderManager] normaliseExistingRoute error:', err.message)
    return { ...EMPTY_ROUTE }
  }
}

/**
 * Convert route coordinates to Leaflet-ready [lat, lng] positions.
 * Handles both [lng, lat] array pairs and { lat, lng } objects.
 * @param {RouteShape} route
 * @returns {[number, number][]}
 */
export function routeToLeafletPositions(route) {
  if (!route?.coordinates?.length) return []
  return route.coordinates
    .map(c => {
      if (Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) {
        // [lng, lat] → [lat, lng] for Leaflet
        return [c[1], c[0]]
      }
      if (c && typeof c === 'object' && isFinite(c.lat) && isFinite(c.lng)) {
        return [c.lat, c.lng]
      }
      return null
    })
    .filter(Boolean)
}

/**
 * Extract markers from a route for ApexMap.
 * Returns start, destination, and waypoint markers.
 * @param {RouteShape} route
 * @returns {object[]} — marker array for ApexMap
 */
export function routeToMarkers(route) {
  if (!route) return []
  const markers = []

  if (route.start && isFinite(route.start.lat) && isFinite(route.start.lng)) {
    markers.push({
      id:     'route-start',
      lat:    route.start.lat,
      lng:    route.start.lng,
      label:  route.isDemo ? '🅰 Demo' : 'A',
      sublabel: route.start.label || 'Start',
      status: 'active',
      _routePin: true,
      isDemo: route.isDemo || false,
    })
  }

  ;(route.waypoints || []).forEach((wp, i) => {
    if (isFinite(wp.lat) && isFinite(wp.lng)) {
      markers.push({
        id:      `route-wp-${i}`,
        lat:     wp.lat,
        lng:     wp.lng,
        label:   String(i + 1),
        sublabel:wp.label || `Stop ${i + 1}`,
        status:  'warning',
        _routePin: true,
        isDemo:  route.isDemo || false,
      })
    }
  })

  if (route.destination && isFinite(route.destination.lat) && isFinite(route.destination.lng)) {
    markers.push({
      id:           'route-destination',
      lat:          route.destination.lat,
      lng:          route.destination.lng,
      label:        route.isDemo ? '🅱 Demo' : 'B',
      sublabel:     route.destination.label || 'Destination',
      status:       'warning',
      isDestination:true,
      _routePin:    true,
      isDemo:       route.isDemo || false,
    })
  }

  return markers
}

// ─── Private helpers ──────────────────────────────────────────
function _validCoord(c) {
  return c && typeof c === 'object' &&
    typeof c.lat === 'number' && typeof c.lng === 'number' &&
    isFinite(c.lat) && isFinite(c.lng)
}

export default {
  DEMO_ROUTE,
  EMPTY_ROUTE,
  ROUTE_WARNINGS,
  getActiveRouteProvider,
  getGraphHopperProfile,
  isGraphHopperConfigured,
  getRouteForMap,
  normaliseExistingRoute,
  routeToLeafletPositions,
  routeToMarkers,
}
