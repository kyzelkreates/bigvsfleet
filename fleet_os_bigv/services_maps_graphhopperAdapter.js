/**
 * ============================================================
 * Big V's Best Routes™ — GraphHopper Adapter Foundation
 * /src/services/maps/graphhopperAdapter.js
 *
 * RUN 5 — Map Engine Foundation
 *
 * PURPOSE:
 *   Clean adapter façade over the existing mapService GraphHopper
 *   integration. Normalises GH route responses into a consistent
 *   map-friendly shape for polyline rendering and route display.
 *
 * Uses: getRuntimeKey (existing) — NO hardcoded API keys.
 * Falls back to demo route if no key / no response.
 *
 * SAFETY:
 *   Route data is advisory only and not legally authoritative.
 *   All outputs carry advisory warning.
 *
 * SECURITY:
 *   No API keys hardcoded. Key read via existing runtimeKeys only.
 *   No logging of key values.
 * ============================================================
 */

import { getRuntimeKey, RUNTIME_KEYS } from './services_maps_runtimeKeys'
import { MAP_ADVISORY } from './services_maps_mapProviderManager'

// ─── Adapter output statuses ──────────────────────────────────
export const GH_ADAPTER_STATUS = {
  PARSED:   'parsed',
  MISSING:  'missing',
  ERROR:    'error',
  FALLBACK: 'fallback',
  NO_KEY:   'no_key',
}

// ─── Advisory warning (mandatory on all outputs) ──────────────
const ROUTE_ADVISORY = MAP_ADVISORY.route

/**
 * Normalise a raw GraphHopper /route API response into the
 * standard Big V's Best Routes™ route shape.
 *
 * Coordinate convention: GH returns [lng, lat] pairs in
 * geometry.coordinates. We preserve [lng, lat] for Leaflet's
 * Polyline which expects [lat, lng] — the caller must swap.
 * This adapter returns coordinates as [lng, lat] arrays.
 * The ApexMap polyline renderer already handles the swap:
 *   positions={route.coordinates.map(c => [c[1], c[0]])}
 *
 * @param {object} raw — raw GH API response
 * @param {object} options
 * @returns {RouteShape}
 */
export function normaliseGraphHopperResponse(raw, options = {}) {
  try {
    if (!raw || typeof raw !== 'object') {
      return _fallback('Invalid or empty GraphHopper response.')
    }

    // GH error response
    if (raw.message && !raw.paths) {
      return _error(`GraphHopper error: ${raw.message}`)
    }

    const path = Array.isArray(raw.paths) ? raw.paths[0] : null
    if (!path) {
      return _fallback('No route path in GraphHopper response.')
    }

    // Extract coordinates — GH returns {type:"LineString",coordinates:[[lng,lat],...]}
    // or encoded polyline string. We handle the object form (points_encoded=false).
    let coordinates = []
    if (path.points?.coordinates && Array.isArray(path.points.coordinates)) {
      coordinates = path.points.coordinates  // already [lng, lat] pairs
    } else if (Array.isArray(path.points)) {
      coordinates = path.points
    }

    // Validate coordinates
    const validCoords = coordinates.filter(c =>
      Array.isArray(c) && c.length >= 2 &&
      isFinite(c[0]) && isFinite(c[1])
    )

    if (validCoords.length === 0) {
      return _fallback('No valid coordinates in GraphHopper response.')
    }

    // Normalise instructions
    const instructions = (path.instructions || []).map(inst => ({
      text:        inst.text || '',
      distance:    typeof inst.distance === 'number' ? inst.distance : 0,
      durationMs:  typeof inst.time     === 'number' ? inst.time     : 0,
      sign:        inst.sign            ?? 0,
      streetName:  inst.street_name     || '',
      exitNumber:  inst.exit_number     ?? null,
      interval:    Array.isArray(inst.interval) ? inst.interval : null,
    }))

    // Bounding box
    const bbox = path.bbox && path.bbox.length >= 4 ? {
      minLng: path.bbox[0], minLat: path.bbox[1],
      maxLng: path.bbox[2], maxLat: path.bbox[3],
    } : null

    return {
      coordinates,                    // [lng, lat] pairs — Leaflet swap applied by ApexMap
      distanceMeters:  path.distance  ?? null,
      durationMs:      path.time      ?? null,
      durationSeconds: path.time != null ? Math.round(path.time / 1000) : null,
      instructions,
      bbox,
      provider:        'graphhopper',
      profile:         options.profile || 'car',
      status:          GH_ADAPTER_STATUS.PARSED,
      isDemo:          false,
      warning:         ROUTE_ADVISORY,
      attribution:     'Routing by GraphHopper | Map data © OpenStreetMap contributors',
      advisoryNotice:  ROUTE_ADVISORY,
    }
  } catch (err) {
    return _error(`GraphHopper adapter error: ${err.message}`)
  }
}

/**
 * Attempt a GraphHopper route request.
 * Returns normalised route or safe fallback — never throws.
 *
 * @param {object} origin      — { lat, lng }
 * @param {object} destination — { lat, lng }
 * @param {object} options     — { profile: 'car'|'van'|'truck'|'bike'|'walk' }
 * @returns {Promise<RouteShape>}
 */
export async function fetchGraphHopperRoute(origin, destination, options = {}) {
  const key = getRuntimeKey(RUNTIME_KEYS.GRAPHHOPPER)

  if (!key || !key.trim()) {
    return {
      coordinates:     [],
      distanceMeters:  null,
      durationMs:      null,
      durationSeconds: null,
      instructions:    [],
      bbox:            null,
      provider:        'graphhopper',
      status:          GH_ADAPTER_STATUS.NO_KEY,
      isDemo:          false,
      warning:         ROUTE_ADVISORY,
      attribution:     'Map data © OpenStreetMap contributors',
      advisoryNotice:  ROUTE_ADVISORY,
      message:         'No GraphHopper API key configured. Demo/local fallback remains active.',
    }
  }

  // Validate coordinates
  if (!_validCoord(origin) || !_validCoord(destination)) {
    return _fallback('Invalid origin or destination coordinates.')
  }

  const profile = options.profile || 'car'

  try {
    const url = new URL('https://graphhopper.com/api/1/route')
    url.searchParams.set('key', key.trim())
    url.searchParams.set('vehicle', profile)
    url.searchParams.set('locale', 'en')
    url.searchParams.set('instructions', 'true')
    url.searchParams.set('calc_points', 'true')
    url.searchParams.set('points_encoded', 'false')
    url.searchParams.append('point', `${origin.lat},${origin.lng}`)
    url.searchParams.append('point', `${destination.lat},${destination.lng}`)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)

    try {
      const res = await fetch(url.toString(), { signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return _error(`GraphHopper HTTP ${res.status}${text ? ': ' + text.slice(0, 100) : ''}`)
      }

      const data = await res.json()
      return normaliseGraphHopperResponse(data, { profile })
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        return _error('GraphHopper request timed out.')
      }
      return _error(`GraphHopper network error: ${err.message}`)
    }
  } catch (err) {
    return _error(`GraphHopper adapter unexpected error: ${err.message}`)
  }
}

/**
 * Extract Leaflet-ready [lat, lng] positions from a normalised route.
 * Handles both [lng, lat] (GH convention) and { lat, lng } objects.
 * @param {RouteShape} route
 * @returns {[number, number][]} — Leaflet [lat, lng] pairs
 */
export function routeToLeafletPositions(route) {
  if (!route?.coordinates?.length) return []
  return route.coordinates
    .filter(c => {
      if (Array.isArray(c)) return c.length >= 2 && isFinite(c[0]) && isFinite(c[1])
      if (c && typeof c === 'object') return isFinite(c.lat) && isFinite(c.lng)
      return false
    })
    .map(c => {
      if (Array.isArray(c)) return [c[1], c[0]]  // [lng, lat] → [lat, lng] for Leaflet
      return [c.lat, c.lng]
    })
}

// ─── Private helpers ──────────────────────────────────────────

function _fallback(message) {
  return {
    coordinates: [], distanceMeters: null, durationMs: null, durationSeconds: null,
    instructions: [], bbox: null, provider: 'graphhopper',
    status: GH_ADAPTER_STATUS.FALLBACK, isDemo: false,
    warning: ROUTE_ADVISORY, attribution: 'Map data © OpenStreetMap contributors',
    advisoryNotice: ROUTE_ADVISORY, message,
  }
}

function _error(message) {
  return {
    coordinates: [], distanceMeters: null, durationMs: null, durationSeconds: null,
    instructions: [], bbox: null, provider: 'graphhopper',
    status: GH_ADAPTER_STATUS.ERROR, isDemo: false,
    warning: ROUTE_ADVISORY, attribution: 'Map data © OpenStreetMap contributors',
    advisoryNotice: ROUTE_ADVISORY, message,
  }
}

function _validCoord(c) {
  return c && typeof c === 'object' &&
    typeof c.lat === 'number' && typeof c.lng === 'number' &&
    isFinite(c.lat) && isFinite(c.lng)
}

export default {
  GH_ADAPTER_STATUS,
  normaliseGraphHopperResponse,
  fetchGraphHopperRoute,
  routeToLeafletPositions,
}
