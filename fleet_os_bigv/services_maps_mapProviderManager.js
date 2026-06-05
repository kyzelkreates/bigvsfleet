/**
 * ============================================================
 * Big V's Best Routes™ — Map Provider Manager
 * /src/services/maps/mapProviderManager.js
 *
 * RUN 5 — Map Engine Foundation
 *
 * PURPOSE:
 *   Single source of truth for active map mode, tile config,
 *   attribution, and fallback state. Reads from useApiConfigStore
 *   (Run 4 SSOT) — does NOT create duplicate state.
 *
 * Map modes:
 *   osm_2d         — OSM-compatible Leaflet 2D (primary demo mode)
 *   maplibre_3d    — MapLibre 3D/tilted (Run 5 readiness, Run 6 full)
 *   fallback_2d    — 2D fallback when 3D unavailable
 *   offline_fallback — local/offline safe mode
 *
 * Provider statuses:
 *   demo_ready | configured | unavailable | error | fallback_active
 *
 * SECURITY:
 *   No API keys. No secrets. No hardcoded credentials.
 *   Reads only from frontend-safe SSOT state.
 *
 * SAFETY:
 *   Map data is advisory only and not legally authoritative.
 *   All outputs include advisory warning.
 * ============================================================
 */

import { useApiConfigStore } from './core_storage'

// ─── Map mode constants ───────────────────────────────────────
export const MAP_MODE = {
  OSM_2D:           'osm_2d',
  MAPLIBRE_3D:      'maplibre_3d',
  FALLBACK_2D:      'fallback_2d',
  OFFLINE_FALLBACK: 'offline_fallback',
}

// ─── Provider status constants ────────────────────────────────
export const MAP_PROVIDER_STATUS = {
  DEMO_READY:      'demo_ready',
  CONFIGURED:      'configured',
  UNAVAILABLE:     'unavailable',
  ERROR:           'error',
  FALLBACK_ACTIVE: 'fallback_active',
}

// ─── Safe defaults ────────────────────────────────────────────
const OSM_DEFAULTS = {
  tileUrl:     'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  subdomains:  ['a', 'b', 'c'],
  maxZoom:     19,
}

// ─── Advisory warnings (locked per directive) ─────────────────
export const MAP_ADVISORY = {
  general: 'Map data is advisory only. Displayed routes do not guarantee legal compliance.',
  osm:     'OpenStreetMap-compatible data is advisory and may be incomplete, outdated, or unavailable. It is not legally authoritative. Always verify signage, restrictions, access rules, permits, bridge limits, and road conditions before travel.',
  maplibre:'MapLibre 3D/tilted rendering is advisory visual support only. If unsupported or unavailable, Big V\'s Best Routes™ falls back to 2D map mode.',
  route:   'Displayed route is advisory only and must be checked against current law, road signs, vehicle restrictions, permits, bridge limits, and road conditions.',
  safety:  'Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel.',
  data:    'Public map data is not legally authoritative. Route lines are advisory visual guidance only.',
}

/**
 * Get the safe OSM tile URL from SSOT (Run 4 API config) or fall back to default.
 * Never exposes secrets.
 * @returns {string} tile URL with {z}/{x}/{y} placeholders
 */
export function getOsmTileUrl() {
  try {
    const stored = useApiConfigStore.getState()?.osm?.tileUrl
    if (stored && stored.trim() && stored.includes('{z}')) return stored.trim()
  } catch {}
  return OSM_DEFAULTS.tileUrl
}

/**
 * Get OSM attribution text from SSOT or fall back to default.
 * Attribution is MANDATORY — ODbL licence requirement.
 * @returns {string}
 */
export function getOsmAttribution() {
  try {
    const stored = useApiConfigStore.getState()?.osm?.attribution
    if (stored && stored.trim()) return stored.trim()
  } catch {}
  return OSM_DEFAULTS.attribution
}

/**
 * Get OSM config object (tileUrl + attribution + subdomains + maxZoom).
 * Safe — always returns a valid object even if SSOT is unavailable.
 */
export function getOsmConfig() {
  return {
    tileUrl:     getOsmTileUrl(),
    attribution: getOsmAttribution(),
    subdomains:  OSM_DEFAULTS.subdomains,
    maxZoom:     OSM_DEFAULTS.maxZoom,
  }
}

/**
 * Check if MapLibre 3D mode is configured and potentially available.
 * Returns readiness state — does NOT attempt to load MapLibre.
 * MapLibre dependency must be installed separately (Run 5/6 dep step).
 */
export function getMapLibreReadiness() {
  try {
    const ml = useApiConfigStore.getState()?.mapLibre
    return {
      enabled:          ml?.enabled ?? false,
      styleUrl:         ml?.styleUrl || '',
      tiltSupported:    ml?.tiltSupported ?? null, // null = not tested
      status:           ml?.status ?? 'not_configured',
      lastTestAt:       ml?.lastTestAt ?? null,
      lastError:        ml?.lastError ?? null,
      available:        false,  // MapLibre not installed yet — Run 5/6 dep step
      fallbackReason:   'MapLibre GL is not installed. 2D fallback is active. Full 3D rendering: Run 5/6.',
    }
  } catch {
    return {
      enabled: false, styleUrl: '', tiltSupported: false,
      status: 'not_configured', available: false,
      fallbackReason: 'MapLibre readiness unavailable. 2D fallback is active.',
    }
  }
}

/**
 * Determine the active map mode based on SSOT + runtime state.
 *
 * @param {object} options
 *   @param {boolean} options.prefer3d   — user requested 3D mode
 *   @param {boolean} options.isOffline  — device is offline
 * @returns {{ mode: string, reason: string, advisory: string }}
 */
export function resolveMapMode({ prefer3d = false, isOffline = false } = {}) {
  if (isOffline) {
    return {
      mode:     MAP_MODE.OFFLINE_FALLBACK,
      reason:   'Device is offline. Operating in local/offline-safe map mode.',
      advisory: MAP_ADVISORY.general,
    }
  }

  if (prefer3d) {
    const ml = getMapLibreReadiness()
    if (ml.available && ml.enabled) {
      return {
        mode:     MAP_MODE.MAPLIBRE_3D,
        reason:   '3D/tilted map mode active.',
        advisory: MAP_ADVISORY.maplibre,
      }
    }
    return {
      mode:     MAP_MODE.FALLBACK_2D,
      reason:   ml.fallbackReason,
      advisory: MAP_ADVISORY.maplibre,
    }
  }

  return {
    mode:     MAP_MODE.OSM_2D,
    reason:   'OSM-compatible 2D map mode active.',
    advisory: MAP_ADVISORY.osm,
  }
}

/**
 * Get full provider status summary for display in MapStatusPanel.
 * Reads from Run 4 API config SSOT.
 * @returns {object} status summary
 */
export function getMapProviderStatus() {
  let osmStatus = 'demo_ready'
  let osmLastTest = null
  let osmLastError = null
  let mlStatus = 'not_configured'

  try {
    const s = useApiConfigStore.getState()
    osmStatus    = s?.osm?.status ?? 'demo_ready'
    osmLastTest  = s?.osm?.lastTestAt ?? null
    osmLastError = s?.osm?.lastError ?? null
    mlStatus     = s?.mapLibre?.status ?? 'not_configured'
  } catch {}

  const ml = getMapLibreReadiness()

  return {
    osm: {
      name:       'OpenStreetMap / OSM-Compatible',
      tileUrl:    getOsmTileUrl(),
      attribution: getOsmAttribution(),
      status:     osmStatus,
      lastTestAt: osmLastTest,
      lastError:  osmLastError,
      advisory:   MAP_ADVISORY.osm,
      always_available: true,
    },
    mapLibre: {
      name:          'MapLibre 3D/Tilt',
      installed:     false,           // not installed yet
      enabled:       ml.enabled,
      status:        mlStatus,
      fallbackReason: ml.fallbackReason,
      advisory:      MAP_ADVISORY.maplibre,
      runTarget:     'Run 5/6',
    },
    activeMode:     resolveMapMode().mode,
    activeAdvisory: MAP_ADVISORY.general,
    safetyAdvisory: MAP_ADVISORY.safety,
  }
}

export default {
  MAP_MODE,
  MAP_PROVIDER_STATUS,
  MAP_ADVISORY,
  OSM_DEFAULTS,
  getOsmTileUrl,
  getOsmAttribution,
  getOsmConfig,
  getMapLibreReadiness,
  resolveMapMode,
  getMapProviderStatus,
}
