/**
 * ============================================================
 * Big V's Best Routes™ — GPS Manager
 * /src/services/maps/gpsManager.js
 *
 * RUN 6 — Driver PWA GPS + 3D Navigation View
 *
 * PURPOSE:
 *   Safe, explicit GPS permission/watch manager for the Driver PWA.
 *   GPS does NOT auto-start — driver must trigger it.
 *   Provides safe fallback states for all permission/error cases.
 *
 * SAFETY WARNINGS (mandatory):
 *   - GPS accuracy can vary.
 *   - GPS is not legal proof of route suitability.
 *   - GPS can be affected by device, signal, weather, buildings,
 *     battery saver mode, and network conditions.
 *   - Do not rely on GPS as legal proof of route suitability.
 *   - Drivers must obey current signage, traffic laws, permits,
 *     bridge limits, restrictions, access rules, and road conditions.
 *
 * PERMISSION STATES:
 *   unknown       — not requested yet
 *   requesting    — permission being requested
 *   granted       — GPS available, position streaming
 *   denied        — user denied or browser blocked
 *   unavailable   — geolocation API not available (non-HTTPS etc.)
 *   error         — watch active but error received
 *   stopped       — watch stopped by user/trip complete
 *
 * SECURITY:
 *   No API keys. No backend calls.
 *   All GPS data is device-local only (+ existing telemetry push).
 * ============================================================
 */

// ─── GPS permission state constants ──────────────────────────
export const GPS_PERMISSION = {
  UNKNOWN:     'unknown',
  REQUESTING:  'requesting',
  GRANTED:     'granted',
  DENIED:      'denied',
  UNAVAILABLE: 'unavailable',
  ERROR:       'error',
  STOPPED:     'stopped',
}

// ─── GPS advisory warnings (mandatory per directive) ─────────
export const GPS_WARNINGS = {
  general:    'GPS accuracy can vary. GPS is not legal proof of route suitability.',
  accuracy:   'GPS accuracy depends on device, signal strength, weather, buildings, battery saver mode, and network conditions.',
  legal:      'Drivers must obey current road signs, traffic laws, permits, bridge limits, restrictions, access rules, and road conditions.',
  denied:     'GPS permission was denied. You can continue with demo/manual route view, but live current-location tracking is unavailable.',
  unavailable:'GPS is unavailable on this device/browser or requires HTTPS. Check your browser settings and URL.',
  demo:       'Demo location marker shown. Enable GPS for real current location.',
}

// ─── Conservative GPS options ─────────────────────────────────
const GPS_OPTIONS_HIGH = {
  enableHighAccuracy: true,
  timeout:            20000,
  maximumAge:         3000,
}

const GPS_OPTIONS_LOW = {
  enableHighAccuracy: false,
  timeout:            30000,
  maximumAge:         10000,
}

/**
 * Check if the Geolocation API is available on this device/browser/context.
 * HTTPS is required for geolocation in most browsers.
 * @returns {{ supported: boolean, reason: string }}
 */
export function isGeolocationSupported() {
  if (typeof navigator === 'undefined') {
    return { supported: false, reason: 'No navigator object available.' }
  }
  if (!navigator.geolocation) {
    return {
      supported: false,
      reason: 'Geolocation API is not available. This may be because the page is served over HTTP (requires HTTPS), or the browser/device does not support GPS.',
    }
  }
  return { supported: true, reason: '' }
}

/**
 * Normalise a GeolocationPosition into a safe, consistent shape.
 * @param {GeolocationPosition} position
 * @returns {NormalisedPosition}
 */
export function normalisePosition(position) {
  if (!position?.coords) {
    return {
      lat:       null,
      lng:       null,
      heading:   null,
      speed:     null,
      accuracy:  null,
      altitude:  null,
      source:    'gps',
      updatedAt: new Date().toISOString(),
    }
  }
  const { latitude, longitude, heading, speed, accuracy, altitude } = position.coords
  return {
    lat:       isFinite(latitude)   ? latitude   : null,
    lng:       isFinite(longitude)  ? longitude  : null,
    heading:   heading != null && isFinite(heading)  ? Math.round(heading)  : null,
    speed:     speed   != null && isFinite(speed)    ? Math.round(speed * 3.6) : null, // m/s → km/h
    accuracy:  accuracy != null && isFinite(accuracy) ? Math.round(accuracy) : null,
    altitude:  altitude != null && isFinite(altitude) ? Math.round(altitude) : null,
    source:    'gps',
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Normalise a GeolocationPositionError into a readable form.
 * @param {GeolocationPositionError} error
 * @returns {{ code: number, message: string, permission: string }}
 */
export function normaliseGpsError(error) {
  if (!error) return { code: 0, message: 'Unknown GPS error.', permission: GPS_PERMISSION.ERROR }

  const codeMap = {
    1: {
      message: 'Location permission was denied by the user or browser.',
      permission: GPS_PERMISSION.DENIED,
    },
    2: {
      message: 'Location information is unavailable. Check device GPS, signal, and browser settings.',
      permission: GPS_PERMISSION.UNAVAILABLE,
    },
    3: {
      message: 'GPS request timed out. Check signal strength and try again.',
      permission: GPS_PERMISSION.ERROR,
    },
  }

  const mapped = codeMap[error.code] || {
    message: error.message || 'Unknown GPS error.',
    permission: GPS_PERMISSION.ERROR,
  }

  return { code: error.code ?? 0, ...mapped }
}

/**
 * Calculate a simple GPS confidence level from accuracy in metres.
 * Returns 'high' | 'medium' | 'low' | 'unknown'
 * This is advisory only — not a precision measurement.
 */
export function calculateGpsConfidence(accuracyMeters) {
  if (accuracyMeters == null || !isFinite(accuracyMeters)) return 'unknown'
  if (accuracyMeters <= 10)  return 'high'
  if (accuracyMeters <= 50)  return 'medium'
  if (accuracyMeters <= 200) return 'low'
  return 'very_low'
}

/**
 * GPS confidence label + colour for UI display.
 * @param {'high'|'medium'|'low'|'very_low'|'unknown'} confidence
 */
export function gpsConfidenceDisplay(confidence) {
  const map = {
    high:     { label: 'High accuracy',     color: 'text-emerald-400', dot: 'bg-emerald-400' },
    medium:   { label: 'Medium accuracy',   color: 'text-amber-400',   dot: 'bg-amber-400'   },
    low:      { label: 'Low accuracy',      color: 'text-orange-400',  dot: 'bg-orange-400'  },
    very_low: { label: 'Very low accuracy', color: 'text-red-400',     dot: 'bg-red-400'     },
    unknown:  { label: 'Accuracy unknown',  color: 'text-slate-500',   dot: 'bg-slate-600'   },
  }
  return map[confidence] ?? map.unknown
}

/**
 * GPS Manager — manages watch lifecycle and provides safe callbacks.
 *
 * Usage:
 *   const mgr = createGpsManager({ onPosition, onError, onPermission })
 *   mgr.start()     — requests permission + starts watch
 *   mgr.stop()      — stops watch
 *   mgr.getOne()    — get single current position (no watch)
 *   mgr.isRunning() — true if watch is active
 *
 * GPS does NOT start automatically — call mgr.start() explicitly.
 *
 * @param {object} callbacks
 *   onPosition(NormalisedPosition)   — called on each valid position
 *   onError({ code, message, permission }) — called on error
 *   onPermission(GPS_PERMISSION)     — called on permission state change
 *   highAccuracy                     — boolean, default true
 */
export function createGpsManager({
  onPosition   = () => {},
  onError      = () => {},
  onPermission = () => {},
  highAccuracy = true,
} = {}) {
  let watchId    = null
  let _running   = false

  const options = highAccuracy ? GPS_OPTIONS_HIGH : GPS_OPTIONS_LOW

  const _onSuccess = (position) => {
    const norm = normalisePosition(position)
    if (norm.lat == null || norm.lng == null) return
    onPermission(GPS_PERMISSION.GRANTED)
    onPosition(norm)
  }

  const _onError = (error) => {
    const norm = normaliseGpsError(error)
    onPermission(norm.permission)
    onError(norm)
  }

  return {
    /**
     * Start GPS watch. Driver must call this explicitly — not auto-started.
     * Returns true if watch started, false if geolocation unavailable.
     */
    start() {
      const check = isGeolocationSupported()
      if (!check.supported) {
        onPermission(GPS_PERMISSION.UNAVAILABLE)
        onError({ code: 0, message: check.reason, permission: GPS_PERMISSION.UNAVAILABLE })
        return false
      }
      if (_running) return true  // already running

      onPermission(GPS_PERMISSION.REQUESTING)

      try {
        watchId  = navigator.geolocation.watchPosition(_onSuccess, _onError, options)
        _running = true
        return true
      } catch (err) {
        onPermission(GPS_PERMISSION.ERROR)
        onError({ code: 0, message: `GPS start error: ${err.message}`, permission: GPS_PERMISSION.ERROR })
        return false
      }
    },

    /**
     * Stop GPS watch. Call on trip complete, unmount, or user stops tracking.
     */
    stop() {
      if (watchId != null) {
        try { navigator.geolocation.clearWatch(watchId) } catch {}
        watchId  = null
        _running = false
        onPermission(GPS_PERMISSION.STOPPED)
      }
    },

    /**
     * Get a single current position (one-shot, no ongoing watch).
     * Returns Promise<NormalisedPosition> or throws on error.
     */
    getOne() {
      return new Promise((resolve, reject) => {
        const check = isGeolocationSupported()
        if (!check.supported) {
          reject({ code: 0, message: check.reason, permission: GPS_PERMISSION.UNAVAILABLE })
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(normalisePosition(pos)),
          (err) => reject(normaliseGpsError(err)),
          options
        )
      })
    },

    isRunning() { return _running },
    getWatchId() { return watchId },
  }
}

export default {
  GPS_PERMISSION,
  GPS_WARNINGS,
  isGeolocationSupported,
  normalisePosition,
  normaliseGpsError,
  calculateGpsConfidence,
  gpsConfidenceDisplay,
  createGpsManager,
}
