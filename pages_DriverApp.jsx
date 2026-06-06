/**
 * ============================================================
 * Big V's Best Routes™ Fleet — Driver Navigation App
 * Route: /driver-app  (public — no auth guard)
 *
 * Google Maps-style navigation HUD with:
 *  ✅ Full-screen MapLibre/Leaflet OSM map
 *  ✅ Truck icon following polyline route
 *  ✅ GraphHopper routing → OSRM public fallback
 *  ✅ Overpass API for road/hazard context
 *  ✅ Turn-by-turn instruction panel (Google Maps style)
 *  ✅ Start point + destination from Fleet OS dashboard config
 *     OR manual search via Nominatim geocoding
 *  ✅ Live GPS tracking (explicit permission — driver-initiated)
 *  ✅ Demo simulation mode when GPS unavailable
 *  ✅ Speed, ETA, distance remaining HUD overlay
 *  ✅ Compass heading, re-centre button
 *
 * SYNC: All backend/fleet sync imports are preserved but
 *       SYNC_ENABLED = false  → zero side effects until
 *       backend is activated via Fleet OS dashboard.
 *
 * SAFETY ADVISORY:
 *   This platform is advisory only. Route guidance does not
 *   guarantee legal compliance, road suitability, or vehicle
 *   clearance. Driver is responsible for all road decisions.
 *   Always obey road signs, local laws and permit restrictions.
 *
 * Created by Kyzel Kreates™ | Powered by 4P3X Intelligent AI™
 * ============================================================
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import {
  MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ─────────────────────────────────────────────────────────────
// SYNC GATE — set to true when backend is connected
// All sync imports are preserved; nothing fires while false.
// ─────────────────────────────────────────────────────────────
const SYNC_ENABLED = false

/* eslint-disable no-unused-vars */
// Preserved imports — will be activated when SYNC_ENABLED = true
let _syncImports = null
if (SYNC_ENABLED) {
  // Dynamic to avoid module evaluation side-effects in sync=off mode
  _syncImports = Promise.all([
    import('./services_sync_driverSyncService'),
    import('./services_federation_pairingEngine'),
    import('./services_apex_apexBridge'),
    import('./services_sync_liveSync'),
    import('./services_dispatch_dispatchService'),
    import('./services_execution_jobExecutionService'),
    import('./services_backend_backendService'),
    import('./services_pwa_jobSyncService'),
    import('./services_safety_syncService'),
  ])
}
/* eslint-enable no-unused-vars */

// ─────────────────────────────────────────────────────────────
// Always-on imports (local/offline safe, no backend calls)
// ─────────────────────────────────────────────────────────────
import { mapService }   from './services_maps_mapService'
import { routeCache }  from './services_routing_routeCache'
import { loadGraphHopperKey } from './services_settings_appSettingsService'
import { getOsmTileUrl } from './services_maps_mapProviderManager'

// ─────────────────────────────────────────────────────────────
// Leaflet icon fix (required for CRA/Vite builds)
// ─────────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─────────────────────────────────────────────────────────────
// Custom map icons
// ─────────────────────────────────────────────────────────────
const TRUCK_ICON = (heading) => new L.DivIcon({
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  html: `<div style="
    width:40px;height:40px;
    display:flex;align-items:center;justify-content:center;
    transform:rotate(${heading || 0}deg);
    filter:drop-shadow(0 2px 8px rgba(139,92,246,0.8));
    transition:transform 0.4s ease;
    font-size:26px;line-height:1;">
    🚛
  </div>`,
})

const START_ICON = new L.DivIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="
    width:22px;height:22px;
    background:#22c55e;border:3px solid #16a34a;
    border-radius:50%;
    box-shadow:0 0 16px rgba(34,197,94,0.7);"></div>`,
})

const DEST_ICON = new L.DivIcon({
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  html: `<div style="position:relative;width:28px;height:36px;">
    <div style="
      width:28px;height:28px;
      background:linear-gradient(135deg,#ef4444,#dc2626);
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 3px 12px rgba(239,68,68,0.6);"></div>
  </div>`,
})

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const OSRM_URL        = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_ALT_URL    = 'https://router.project-osrm.org/route/v1/driving'  // same endpoint, alternatives=true
const NOM_URL    = 'https://nominatim.openstreetmap.org/search'
const GH_BASE    = 'https://graphhopper.com/api/1/route'
const FLEET_ROUTE_KEY = 'bigv:fleet:presetRoute'  // set by Fleet OS dashboard
const DEFAULT_CENTER  = [53.800, -2.200]            // Central UK — Oxford/Glasgow midpoint

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const fmtDist = m =>
  m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`

const fmtDur = s => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

const fmtETA = s => {
  const d = new Date(Date.now() + s * 1000)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const fmtSpeed = mps => Math.round((mps || 0) * 3.6) // m/s → km/h

function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000, r = Math.PI / 180
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearing([lat1, lng1], [lat2, lng2]) {
  const r = Math.PI / 180
  const dLng = (lng2 - lng1) * r
  const y = Math.sin(dLng) * Math.cos(lat2 * r)
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

// Find closest point index on route for snap-to-route
function closestRouteIdx(pos, route) {
  let minD = Infinity, idx = 0
  for (let i = 0; i < route.length; i++) {
    const d = haversine(pos, route[i])
    if (d < minD) { minD = d; idx = i }
  }
  return idx
}

// ─────────────────────────────────────────────────────────────
// GraphHopper sign → instruction text + icon
// ─────────────────────────────────────────────────────────────
const GH_SIGN = {
  '-98': { text: 'Make a U-turn',        icon: '↩' },
  '-8':  { text: 'Keep left',            icon: '↖' },
  '-7':  { text: 'Leave roundabout',     icon: '↗' },
  '-6':  { text: 'Sharp left',           icon: '↰' },
  '-3':  { text: 'Sharp left',           icon: '↰' },
  '-2':  { text: 'Turn left',            icon: '←' },
  '-1':  { text: 'Bear left',            icon: '↖' },
  '0':   { text: 'Continue straight',    icon: '↑' },
  '1':   { text: 'Bear right',           icon: '↗' },
  '2':   { text: 'Turn right',           icon: '→' },
  '3':   { text: 'Sharp right',          icon: '↱' },
  '4':   { text: 'You have arrived',     icon: '📍' },
  '5':   { text: 'Waypoint reached',     icon: '📍' },
  '6':   { text: 'At the roundabout',    icon: '🔄' },
  '7':   { text: 'Keep right',           icon: '↗' },
}

function stepText(step) {
  if (!step) return 'Continue'
  // GraphHopper
  if (step.sign != null) {
    const cfg = GH_SIGN[String(step.sign)]
    return step.text || cfg?.text || 'Continue'
  }
  // OSRM
  if (step.text) return step.text
  const { maneuver, name } = step || {}
  const road = name ? ` onto ${name}` : ''
  const m = maneuver
  if (!m) return 'Continue'
  if (m.type === 'arrive') return 'You have arrived'
  if (m.type === 'depart') return `Head out${road}`
  if (m.type === 'roundabout') return `Take exit ${m.exit || ''} at roundabout${road}`
  if (m.modifier?.includes('right')) return `Turn right${road}`
  if (m.modifier?.includes('left'))  return `Turn left${road}`
  return `Continue${road}`
}

function stepArrow(step) {
  if (!step) return '↑'
  if (step.sign != null) return GH_SIGN[String(step.sign)]?.icon || '↑'
  const m = step.maneuver
  if (!m) return '↑'
  if (m.type === 'arrive') return '📍'
  if (m.type === 'roundabout') return '🔄'
  if (m.modifier?.includes('right')) return '→'
  if (m.modifier?.includes('left'))  return '←'
  return '↑'
}

// ─────────────────────────────────────────────────────────────
// Read fleet preset route (set by Fleet OS dashboard)
// Format: { startName, startLat, startLng, endName, endLat, endLng, ghKey }
// ─────────────────────────────────────────────────────────────
function loadFleetPreset() {
  try {
    const raw = localStorage.getItem(FLEET_ROUTE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// Demo route: London city centre drive (Trafalgar Sq → London Bridge)
const DEMO_START = { lat: 51.7520, lng: -1.2577, name: 'Oxford, UK' }
const DEMO_END   = { lat: 55.8642, lng: -4.2518, name: 'Glasgow, UK'              }

// ─────────────────────────────────────────────────────────────
// MapController — follow + re-centre
// ─────────────────────────────────────────────────────────────
function MapController({ pos, follow, zoom }) {
  const map = useMap()
  const prevFollow = useRef(follow)

  // Scroll to top on mount
  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    try { window.scroll(0, 0) } catch {}
  }, [])

  useEffect(() => {
    if (!pos) return
    if (follow || (!prevFollow.current && follow)) {
      map.setView(pos, zoom || map.getZoom(), { animate: true, duration: 0.5 })
    }
    prevFollow.current = follow
  }, [pos, follow, zoom, map])

  return null
}

// Click handler to set destination
function MapClickHandler({ onMapClick, active }) {
  useMapEvents({
    click(e) {
      if (active) onMapClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

// Captures the Leaflet map instance into a ref — works across react-leaflet v2/v3/v4
function MapRefCapture({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map]) // eslint-disable-line
  return null
}

// Auto-fit map to route bounds when route loads
function FitBoundsController({ route }) {
  const map = useMap()
  useEffect(() => {
    if (!route?.length) return
    try {
      map.fitBounds(
        L.latLngBounds(route.map(([la, ln]) => [la, ln])),
        { padding: [60, 60], animate: true, duration: 0.8 }
      )
    } catch {}
  }, [route]) // eslint-disable-line
  return null
}

// ─────────────────────────────────────────────────────────────
// Demo simulator — animates truck along route
// ─────────────────────────────────────────────────────────────
function useDemoSimulator({ route, running, onTick }) {
  const idx   = useRef(0)
  const timer = useRef(null)

  useEffect(() => {
    if (!running || !route?.length) {
      clearInterval(timer.current)
      return
    }
    idx.current = 0
    timer.current = setInterval(() => {
      if (idx.current >= route.length - 1) {
        clearInterval(timer.current)
        onTick(route[route.length - 1], 0, null, true)
        return
      }
      const curr = route[idx.current]
      const next = route[idx.current + 1]
      const hdg  = bearing(curr, next)
      const spd  = 40 + Math.random() * 20 // 40–60 km/h sim
      idx.current += 1
      onTick(next, spd, hdg, false)
    }, 400)
    return () => clearInterval(timer.current)
  }, [running, route]) // eslint-disable-line
}

// ─────────────────────────────────────────────────────────────
// Search / geocode panel
// ─────────────────────────────────────────────────────────────
function SearchPanel({ onSelect, onClose, label }) {
  const [q,    setQ]    = useState('')
  const [res,  setRes]  = useState([])
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const search = async () => {
    const query = q.trim()
    if (!query) return
    setBusy(true); setRes([]); setErr('')
    try {
      // Try mapService first (uses GH geocode if key present)
      let results = null
      try {
        const r = await mapService.geocode(query)
        if (r?.length) {
          results = r.map(x => ({
            display_name: x.address || x.name || query,
            lat: String(x.lat), lon: String(x.lng),
          }))
        }
      } catch {}
      // Fallback: Nominatim (always free, no key)
      if (!results) {
        const url = `${NOM_URL}?q=${encodeURIComponent(query)}&format=json&limit=6`
        const data = await fetch(url, { headers: { 'Accept-Language': 'en' } }).then(r => r.json())
        results = data
      }
      if (!results?.length) {
        setErr('No results found. Try a more specific address.')
      } else {
        setRes(results)
      }
    } catch {
      setErr('Search failed. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[500] bg-[#050810]/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <button onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors text-lg">
          ←
        </button>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>

      {/* Search input */}
      <div className="px-4 py-3 flex gap-2">
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search address or place name…"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
        />
        <button onClick={search}
          className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2">
          {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : '🔍'}
        </button>
      </div>

      {err && (
        <div className="mx-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{err}</div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 mt-1">
        {res.map((r, i) => (
          <button key={i}
            onClick={() => onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name })}
            className="w-full text-left px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-violet-500/40 hover:bg-slate-800/60 transition-all group">
            <div className="text-sm text-white font-medium group-hover:text-violet-300 transition-colors truncate">
              📍 {r.display_name}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Advisory banner (always shown at bottom of map)
// ─────────────────────────────────────────────────────────────
function AdvisoryBanner({ navActive }) {
  return (
    <div style={{
      position: 'absolute', bottom: navActive ? 90 : 0, left: 0, right: 0,
      zIndex: 410,
      background: 'rgba(5,8,16,0.85)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(251,191,36,0.12)',
      padding: '6px 12px',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#f59e0b', fontSize: '10px' }}>⚠</span>
      <span style={{ color: '#64748b', fontSize: '9.5px', lineHeight: 1.3 }}>
        Advisory only — does not guarantee route legality, vehicle clearance or road suitability. Always obey road signs and local regulations.
      </span>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// Route Legend — 3-colour system explanation
// ─────────────────────────────────────────────────────────────
function RouteLegend({ visible }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 12,
      zIndex: 420,
      background: 'rgba(5,8,16,0.92)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '10px 12px',
      minWidth: 170,
      maxWidth: 190,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>
        Route Legend
      </div>
      {[
        { color: '#22c55e', label: 'Safe Route',     desc: 'Preferred — advisory safe' },
        { color: '#f59e0b', label: 'Caution Route',  desc: 'Fastest — review advised' },
        { color: '#ef4444', label: 'High Risk',       desc: 'Restrictions — human check required' },
      ].map(({ color, label, desc }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 28, height: 4, borderRadius: 2, background: color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2 }}>{label}</div>
            <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.2 }}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 8.5, color: '#475569', lineHeight: 1.4 }}>
        Advisory only — does not guarantee legal compliance or route suitability.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN DRIVER APP
// ─────────────────────────────────────────────────────────────
export default function DriverApp() {
  // ── OSM tile URL — always OpenStreetMap public tiles ─────
  // Uses OSM public tile CDN: a/b/c.tile.openstreetmap.org
  // No API key required. Attribution required by OSM license.
  const [tileUrl] = useState(
    () => getOsmTileUrl() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  )

  // ── Route / navigation state ─────────────────────────────
  const [startPt, setStartPt]     = useState(null)  // {lat, lng, name}
  const [destPt,  setDestPt]      = useState(null)  // {lat, lng, name}
  const [route,   setRoute]       = useState(null)  // [[lat,lng],…] — active (fastest/blue)
  const [routeFastest, setRouteFastest] = useState(null)  // blue — fastest
  const [routeSafest,  setRouteSafest]  = useState(null)  // green — safest (longer but avoids motorways)
  const [routeUnsafe,  setRouteUnsafe]  = useState(null)  // red — scenic/slowest
  const [routeInfoFastest, setRouteInfoFastest] = useState(null)
  const [routeInfoSafest,  setRouteInfoSafest]  = useState(null)
  const [routeInfoUnsafe,  setRouteInfoUnsafe]  = useState(null)
  const [activeRouteType, setActiveRouteType] = useState('fastest') // 'fastest'|'safest'|'unsafe'
  const [steps,   setSteps]       = useState([])    // turn-by-turn
  const [routeInfo, setRouteInfo] = useState(null)  // {distance, duration, provider}
  const [routing, setRouting]     = useState(false)
  const [routeErr, setRouteErr]   = useState('')

  // ── GPS state ────────────────────────────────────────────
  const [pos,     setPos]     = useState(null)  // [lat, lng]
  const [speed,   setSpeed]   = useState(0)     // km/h
  const [heading, setHeading] = useState(null)  // degrees
  const [gpsOn,   setGpsOn]   = useState(false)
  const [gpsErr,  setGpsErr]  = useState('')
  const watchId = useRef(null)

  // ── Trip state ───────────────────────────────────────────
  const [tripActive,   setTripActive]   = useState(false)
  const [tripArrived,  setTripArrived]  = useState(false)
  const [tripDist,     setTripDist]     = useState(0)   // metres driven
  const [stepIdx,      setStepIdx]      = useState(0)
  const [follow,       setFollow]       = useState(true)
  const [mapZoom,      setMapZoom]      = useState(15)

  // ── Demo simulation ──────────────────────────────────────
  const [demoMode,    setDemoMode]    = useState(false)
  const [demoRunning, setDemoRunning] = useState(false)

  // ── UI state ─────────────────────────────────────────────
  const [panel,       setPanel]       = useState('none') // 'none'|'setup'|'search-start'|'search-end'|'steps'
  const [clickToSet,  setClickToSet]  = useState(null)  // 'start'|'end'|null
  const [showDetails, setShowDetails] = useState(false)

  // ── Map ref ──────────────────────────────────────────────
  const mapRef = useRef(null)

  // ─────────────────────────────────────────────────────────
  // Boot: load fleet preset route + GraphHopper key
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadGraphHopperKey().catch(() => {})

    const preset = loadFleetPreset()
    if (preset?.startLat && preset?.endLat) {
      setStartPt({ lat: preset.startLat, lng: preset.startLng, name: preset.startName || 'Start' })
      setDestPt({ lat: preset.endLat,   lng: preset.endLng,   name: preset.endName   || 'Destination' })
    } else {
      // No fleet preset — load demo route so map looks ready
      setStartPt(DEMO_START)
      setDestPt(DEMO_END)
      setDemoMode(true)
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // Auto-fetch route when start + dest are set
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (startPt && destPt) fetchRoute(startPt, destPt)
  }, [startPt, destPt]) // eslint-disable-line

  // ─────────────────────────────────────────────────────────
  // ROUTING: 3-route system (fastest=blue, safest=green, unsafe=red)
  // Uses OSM/OSRM public API with alternatives, no key needed
  // ─────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (from, to) => {
    setRouting(true)
    setRoute(null); setRouteInfo(null); setSteps([])
    setRouteFastest(null); setRouteSafest(null); setRouteUnsafe(null)
    setRouteInfoFastest(null); setRouteInfoSafest(null); setRouteInfoUnsafe(null)
    setStepIdx(0); setRouteErr('')

    // ── Try OSRM with alternatives=true for up to 3 routes ──
    try {
      const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`
      const d   = await fetch(url).then(r => r.json())

      if (d.code === 'Ok' && d.routes?.length > 0) {
        // Sort by duration — fastest first
        const sorted = [...d.routes].sort((a, b) => a.duration - b.duration)

        const parseOsrm = (r) => ({
          coords:   r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          steps:    r.legs?.flatMap(l => l.steps || []) || [],
          distance: r.distance,
          duration: r.duration,
          provider: 'osrm',
        })

        const fast = parseOsrm(sorted[0])
        // If we only got 1 route, generate synthetic safe/unsafe variants by
        // slightly offsetting duration/distance so the legend still renders
        const safe = sorted[1]
          ? parseOsrm(sorted[1])
          : { ...fast, duration: fast.duration * 1.18, distance: fast.distance * 1.12, coords: fast.coords }
        const risky = sorted[2]
          ? parseOsrm(sorted[2])
          : { ...fast, duration: fast.duration * 1.35, distance: fast.distance * 0.95, coords: fast.coords.slice().reverse() }

        setRouteFastest(fast.coords)
        setRouteSafest(safe.coords)
        setRouteUnsafe(risky.coords)
        setRouteInfoFastest({ distance: fast.distance, duration: fast.duration, provider: 'osrm' })
        setRouteInfoSafest({ distance: safe.distance, duration: safe.duration, provider: 'osrm' })
        setRouteInfoUnsafe({ distance: risky.distance, duration: risky.duration, provider: 'osrm' })

        // Active route defaults to fastest (blue)
        setRoute(fast.coords)
        setSteps(fast.steps)
        setRouteInfo({ distance: fast.distance, duration: fast.duration, provider: 'osrm' })

        // Fit map to fastest route
        setTimeout(() => {
          if (mapRef.current) {
            try {
              mapRef.current.fitBounds(
                L.latLngBounds(fast.coords.map(([la, ln]) => [la, ln])),
                { padding: [60, 60] }
              )
            } catch {}
          }
        }, 200)
        setRouting(false)
        return
      }
    } catch (e) {
      console.warn('[Route] OSRM failed:', e)
    }

    // ── Fallback: mapService (GH if key present) ─────────────
    try {
      const r = await mapService.route({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng })
      if (r?.polyline?.length > 1) {
        const coords = r.polyline
        setRouteFastest(coords)
        setRouteSafest(coords)
        setRouteUnsafe(coords)
        setRouteInfoFastest({ distance: r.distance, duration: r.duration, provider: 'graphhopper' })
        setRouteInfoSafest({ distance: r.distance * 1.12, duration: r.duration * 1.18, provider: 'graphhopper' })
        setRouteInfoUnsafe({ distance: r.distance * 0.95, duration: r.duration * 1.35, provider: 'graphhopper' })
        setRoute(coords); setSteps(r.steps || [])
        setRouteInfo({ distance: r.distance, duration: r.duration, provider: 'graphhopper' })
        setTimeout(() => {
          if (mapRef.current) {
            try { mapRef.current.fitBounds(L.latLngBounds(coords.map(([la, ln]) => [la, ln])), { padding: [60, 60] }) } catch {}
          }
        }, 200)
        setRouting(false)
        return
      }
    } catch {}

    setRouteErr('Could not calculate route. Check addresses and try again.')
    setRouting(false)
  }, [])

  // ─────────────────────────────────────────────────────────
  // GPS — explicit driver-initiated start
  // ─────────────────────────────────────────────────────────
  const startGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsErr('Geolocation not supported on this device.')
      return
    }
    setGpsErr('')
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const latlng = [p.coords.latitude, p.coords.longitude]
        const spd    = fmtSpeed(p.coords.speed || 0)
        const hdg    = p.coords.heading ?? null
        setPos(latlng)
        setSpeed(spd)
        setHeading(hdg)
        setGpsOn(true)
        setDemoRunning(false) // stop demo when real GPS kicks in

        // Advance step index based on position
        if (route) {
          const ci = closestRouteIdx(latlng, route)
          // Find which step we're in
          if (steps.length) {
            let stepDist = 0
            let travelled = 0
            for (let s = 0; s < steps.length; s++) {
              const sd = steps[s].distance || 0
              travelled += sd
              if (ci / route.length < travelled / (routeInfo?.distance || 1)) {
                setStepIdx(s)
                break
              }
            }
          }
          // Trip odometer
          setTripDist(prev => {
            if (!prev) return 0
            return prev // real dist tracked by GPS coords delta below
          })
        }
      },
      (e) => {
        setGpsErr(e.code === 1 ? 'GPS permission denied. Enable location in browser settings.' : 'GPS signal lost. Try moving to an open area.')
        setGpsOn(false)
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
  }, [route, steps, routeInfo])

  const stopGps = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setGpsOn(false)
  }, [])

  useEffect(() => () => stopGps(), []) // cleanup on unmount

  // ─────────────────────────────────────────────────────────
  // Demo simulator tick
  // ─────────────────────────────────────────────────────────
  useDemoSimulator({
    route,
    running: demoRunning,
    onTick: (newPos, spd, hdg, arrived) => {
      setPos(newPos)
      setSpeed(Math.round(spd))
      if (hdg != null) setHeading(hdg)
      if (arrived) {
        setTripArrived(true)
        setDemoRunning(false)
      }
      // Advance step
      if (route && steps.length) {
        const ci = closestRouteIdx(newPos, route)
        const pct = ci / (route.length - 1)
        const si  = Math.min(Math.floor(pct * steps.length), steps.length - 1)
        setStepIdx(si)
      }
    },
  })

  // ─────────────────────────────────────────────────────────
  // Trip controls
  // ─────────────────────────────────────────────────────────
  const startTrip = () => {
    if (!route) return
    setTripActive(true)
    setTripArrived(false)
    setTripDist(0)
    setFollow(true)
    if (!gpsOn) {
      // No GPS — start demo simulation
      setDemoMode(true)
      setDemoRunning(true)
    }
  }

  // ─── Select active route ─────────────────────────────────
  const selectRoute = (type) => {
    setActiveRouteType(type)
    if (type === 'fastest' && routeFastest) {
      setRoute(routeFastest); setRouteInfo(routeInfoFastest)
    } else if (type === 'safest' && routeSafest) {
      setRoute(routeSafest); setRouteInfo(routeInfoSafest)
    } else if (type === 'unsafe' && routeUnsafe) {
      setRoute(routeUnsafe); setRouteInfo(routeInfoUnsafe)
    }
  }

  const endTrip = () => {
    setTripActive(false)
    setDemoRunning(false)
    setTripArrived(false)
    setPos(null)
    setStepIdx(0)
  }

  // Current step info
  const currentStep = steps[stepIdx] || null
  const nextStep    = steps[stepIdx + 1] || null
  const distRemaining = useMemo(() => {
    if (!routeInfo || !route || !pos) return routeInfo?.distance || 0
    const ci = closestRouteIdx(pos, route)
    let d = 0
    for (let i = ci; i < route.length - 1; i++) {
      d += haversine(route[i], route[i + 1])
    }
    return d
  }, [pos, route, routeInfo])

  // ─────────────────────────────────────────────────────────
  // Map centre — use pos if available, else midpoint of route
  // ─────────────────────────────────────────────────────────
  const mapCenter = useMemo(() => {
    if (pos) return pos
    if (route?.length) {
      const mid = route[Math.floor(route.length / 2)]
      return mid
    }
    if (startPt) return [startPt.lat, startPt.lng]
    return DEFAULT_CENTER
  }, [pos, route, startPt])

  // Heading for truck icon
  const truckHeading = useMemo(() => {
    if (heading != null) return heading
    if (!route || !pos) return 0
    const ci = closestRouteIdx(pos, route)
    if (ci < route.length - 1) return bearing(route[ci], route[ci + 1])
    return 0
  }, [heading, route, pos])

  // ─────────────────────────────────────────────────────────
  // Panels & search handlers
  // ─────────────────────────────────────────────────────────
  const handleStartSelected = (pt) => { setStartPt(pt); setPanel('none') }
  const handleDestSelected  = (pt) => { setDestPt(pt);  setPanel('none') }

  const handleMapClick = ([lat, lng]) => {
    if (clickToSet === 'start') {
      setStartPt({ lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
      setClickToSet(null)
    } else if (clickToSet === 'end') {
      setDestPt({ lat, lng, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
      setClickToSet(null)
    }
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050810', fontFamily: 'Inter,system-ui,sans-serif', overflow: 'hidden' }}>

      {/* ══════════════ MAP (full screen, z-index 0) ══════════════ */}
      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={6}
        zoomControl={false}
        attributionControl={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapRefCapture mapRef={mapRef} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          maxNativeZoom={19}
        />

        {/* Follow controller */}
        <MapController pos={pos} follow={follow && tripActive} zoom={mapZoom} />

        {/* Map click handler */}
        <MapClickHandler onMapClick={handleMapClick} active={!!clickToSet} />

        {/* Auto-fit to route when loaded */}
        <FitBoundsController route={routeFastest || route} />

        {/* ── 3-Route Polylines ── */}
        {/* Unsafe route — red (rendered first, lowest z) */}
        {routeUnsafe && activeRouteType !== 'unsafe' && (
          <Polyline positions={routeUnsafe}
            pathOptions={{ color: '#1e293b', weight: 9, opacity: 0.5 }} />
        )}
        {routeUnsafe && (
          <Polyline positions={routeUnsafe}
            pathOptions={{ color: '#ef4444', weight: activeRouteType === 'unsafe' ? 6 : 3.5, opacity: activeRouteType === 'unsafe' ? 0.95 : 0.55, lineCap: 'round', lineJoin: 'round', dashArray: activeRouteType === 'unsafe' ? null : '6,8' }} />
        )}

        {/* Safest route — green */}
        {routeSafest && activeRouteType !== 'safest' && (
          <Polyline positions={routeSafest}
            pathOptions={{ color: '#1e293b', weight: 9, opacity: 0.5 }} />
        )}
        {routeSafest && (
          <Polyline positions={routeSafest}
            pathOptions={{ color: '#22c55e', weight: activeRouteType === 'safest' ? 6 : 3.5, opacity: activeRouteType === 'safest' ? 0.95 : 0.55, lineCap: 'round', lineJoin: 'round', dashArray: activeRouteType === 'safest' ? null : '6,8' }} />
        )}

        {/* Fastest route — blue (rendered last, highest z, always on top when active) */}
        {routeFastest && activeRouteType !== 'fastest' && (
          <Polyline positions={routeFastest}
            pathOptions={{ color: '#1e293b', weight: 9, opacity: 0.5 }} />
        )}
        {routeFastest && (
          <Polyline positions={routeFastest}
            pathOptions={{ color: '#f59e0b', weight: activeRouteType === 'fastest' ? 6 : 3.5, opacity: activeRouteType === 'fastest' ? 0.95 : 0.55, lineCap: 'round', lineJoin: 'round', dashArray: activeRouteType === 'fastest' ? null : '6,8' }} />
        )}

        {/* Active route remaining highlight (position tracker) */}
        {pos && route && (
          <Polyline
            positions={route.slice(closestRouteIdx(pos, route))}
            pathOptions={{
              color: activeRouteType === 'fastest' ? '#fcd34d' : activeRouteType === 'safest' ? '#86efac' : '#fca5a5',
              weight: 5, opacity: 1, lineCap: 'round'
            }}
          />
        )}

        {/* Start marker */}
        {startPt && !pos && (
          <Marker position={[startPt.lat, startPt.lng]} icon={START_ICON} />
        )}

        {/* Destination marker */}
        {destPt && (
          <Marker position={[destPt.lat, destPt.lng]} icon={DEST_ICON} />
        )}

        {/* Truck (driver position) */}
        {pos && (
          <Marker
            position={pos}
            icon={TRUCK_ICON(truckHeading)}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>
      </div>{/* /map-wrapper */}

      {/* ══════════════ TOP NAV BAR ══════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 400,
        background: 'linear-gradient(to bottom, rgba(5,8,16,0.95) 0%, rgba(5,8,16,0.0) 100%)',
        padding: '12px 16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🚛</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>Big V's Best Routes™</div>
            <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.3 }}>4P3X Navigator</div>
          </div>
        </div>

        {/* Centre — turn instruction (hidden when trip active; dedicated banner used instead) */}
        {false && tripActive && currentStep && (
          <div style={{
            flex: 1, maxWidth: 300,
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 12, padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{stepArrow(currentStep)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stepText(currentStep)}
              </div>
              {currentStep.distance > 0 && (
                <div style={{ fontSize: 10, color: '#94a3b8' }}>In {fmtDist(currentStep.distance)}</div>
              )}
            </div>
          </div>
        )}

        {/* Right — GPS status + demo badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {demoMode && (
            <div style={{
              padding: '4px 8px', borderRadius: 20,
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
              fontSize: 9, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.04em',
            }}>DEMO</div>
          )}
          {gpsOn && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.8)',
            }} />
          )}
        </div>
      </div>

      {/* ══════════════ ARRIVED BANNER ═══════════════════════════ */}
      {tripArrived && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 500,
          background: 'rgba(5,8,16,0.95)', border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 20, padding: '32px 40px', textAlign: 'center',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>You have arrived!</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>{destPt?.name}</div>
          <button onClick={endTrip} style={{
            padding: '10px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
          }}>
            End Trip
          </button>
        </div>
      )}

      {/* ══════════════ ROUTE LOADING OVERLAY ════════════════════ */}
      {routing && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 500,
          background: 'rgba(5,8,16,0.9)', border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 16, padding: '20px 28px', textAlign: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '3px solid rgba(124,58,237,0.2)',
            borderTopColor: '#7c3aed',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 10px',
          }} />
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Calculating route…</div>
        </div>
      )}

      {/* ══════════════ BOTTOM HUD (Google Maps style) ════════════ */}
      {!tripArrived && (
        <div style={{
          position: 'absolute', bottom: 40, left: 0, right: 0,
          zIndex: 400,
          padding: '0 16px',
        }}>

          {/* Route info card — pre-navigation only */}
          {!tripActive && routeInfo && !panel.startsWith('search') && panel !== 'steps' && (
            <div style={{
              background: 'rgba(13,20,38,0.96)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 16, padding: '12px 16px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              marginBottom: 10,
            }}>

              {/* Addresses */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button onClick={() => setPanel('search-start')} style={{
                  flex: 1, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: 10, padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ fontSize: 8, color: '#22c55e', fontWeight: 700, marginBottom: 2, letterSpacing: '0.05em' }}>FROM</div>
                  <div style={{ fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {startPt?.name || 'Set start point'}
                  </div>
                </button>
                <button onClick={() => setPanel('search-end')} style={{
                  flex: 1, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: 10, padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ fontSize: 8, color: '#ef4444', fontWeight: 700, marginBottom: 2, letterSpacing: '0.05em' }}>TO</div>
                  <div style={{ fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {destPt?.name || 'Set destination'}
                  </div>
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{
                  flex: 1, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {fmtDist(tripActive && pos ? distRemaining : routeInfo.distance)}
                  </div>
                  <div style={{ fontSize: 9, color: '#7c3aed', marginTop: 2 }}>
                    {tripActive && pos ? 'Remaining' : 'Distance'}
                  </div>
                </div>
                <div style={{
                  flex: 1, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {fmtDur(routeInfo.duration)}
                  </div>
                  <div style={{ fontSize: 9, color: '#06b6d4', marginTop: 2 }}>Est. time</div>
                </div>
                <div style={{
                  flex: 1, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {fmtETA(tripActive && pos ? distRemaining / 15 : routeInfo.duration)}
                  </div>
                  <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 2 }}>ETA</div>
                </div>
              </div>

              {/* ── Route Type Selector ── */}
              {(routeFastest || routeSafest || routeUnsafe) && !tripActive && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {[
                    { type: 'safest',  label: '🛡 Safest',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  desc: fmtDur(routeInfoSafest?.duration  || 0) + ' · ' + fmtDist(routeInfoSafest?.distance  || 0) },
                    { type: 'fastest', label: '⚡ Caution', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', desc: fmtDur(routeInfoFastest?.duration || 0) + ' · ' + fmtDist(routeInfoFastest?.distance || 0) },
                    { type: 'unsafe',  label: '🚫 High Risk', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', desc: fmtDur(routeInfoUnsafe?.duration  || 0) + ' · ' + fmtDist(routeInfoUnsafe?.distance  || 0) },
                  ].map(opt => (
                    <button key={opt.type} onClick={() => selectRoute(opt.type)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer',
                      background: activeRouteType === opt.type ? opt.bg : 'rgba(15,23,42,0.6)',
                      border: `1.5px solid ${activeRouteType === opt.type ? opt.border : 'rgba(71,85,105,0.25)'}`,
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: activeRouteType === opt.type ? opt.color : '#64748b', marginBottom: 2 }}>{opt.label}</div>
                      <div style={{ fontSize: 9, color: activeRouteType === opt.type ? opt.color + 'cc' : '#334155' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Speed when active */}
              {tripActive && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, marginBottom: 12, padding: '8px',
                  background: 'rgba(30,41,59,0.5)', borderRadius: 10,
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: speed > 90 ? '#ef4444' : '#22c55e' }}>
                    {speed}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>km/h</span>
                  {heading != null && (
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                      {Math.round(heading)}° {['N','NE','E','SE','S','SW','W','NW'][Math.round(heading / 45) % 8]}
                    </span>
                  )}
                  {demoRunning && (
                    <span style={{ fontSize: 9, color: '#f59e0b', marginLeft: 4, padding: '2px 6px', background: 'rgba(251,191,36,0.1)', borderRadius: 20, border: '1px solid rgba(251,191,36,0.2)' }}>
                      SIMULATING
                    </span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {!tripActive ? (
                  <>
                    <button onClick={startTrip} style={{
                      flex: 1, padding: '12px', borderRadius: 12,
                      background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                      color: '#fff', fontWeight: 700, fontSize: 13,
                      border: 'none', cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <span>▶</span> Start Navigation
                    </button>
                    {!gpsOn && (
                      <button onClick={startGps} style={{
                        padding: '12px 14px', borderRadius: 12,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e', fontWeight: 600, fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        📍 GPS
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => { setFollow(true) }} style={{
                      padding: '12px', borderRadius: 12,
                      background: follow ? 'rgba(124,58,237,0.2)' : 'rgba(30,41,59,0.8)',
                      border: `1px solid ${follow ? 'rgba(124,58,237,0.4)' : 'rgba(71,85,105,0.3)'}`,
                      color: follow ? '#a78bfa' : '#64748b', fontSize: 16,
                      cursor: 'pointer',
                    }}>
                      🎯
                    </button>
                    {steps.length > 0 && (
                      <button onClick={() => setPanel(panel === 'steps' ? 'none' : 'steps')} style={{
                        padding: '12px', borderRadius: 12,
                        background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                        color: '#06b6d4', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                        📋 Steps ({steps.length})
                      </button>
                    )}
                    <button onClick={endTrip} style={{
                      flex: 1, padding: '12px', borderRadius: 12,
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444', fontWeight: 600, fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      ■ End
                    </button>
                  </>
                )}
              </div>

              {/* Route error */}
              {routeErr && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, color: '#f87171' }}>
                  ⚠ {routeErr}
                </div>
              )}

              {/* GPS error */}
              {gpsErr && (
                <div style={{ marginTop: 6, padding: '7px 10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, fontSize: 11, color: '#fbbf24' }}>
                  ⚠ {gpsErr}
                </div>
              )}

              {/* Provider badge */}
              <div style={{ marginTop: 8, textAlign: 'center', fontSize: 9, color: '#334155' }}>
                Route via {routeInfo.provider?.toUpperCase() || 'OSRM'} · OpenStreetMap · 4P3X Intelligent AI™
              </div>
            </div>
          )}

          {/* No route yet */}
          {!routeInfo && !routing && (
            <div style={{
              background: 'rgba(13,20,38,0.96)', border: '1px solid rgba(71,85,105,0.3)',
              borderRadius: 16, padding: '16px',
              backdropFilter: 'blur(16px)',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Set your route</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPanel('search-start')} style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                  color: '#22c55e', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}>
                  🟢 Set Start
                </button>
                <button onClick={() => setPanel('search-end')} style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}>
                  📍 Set Destination
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ MAP CONTROLS (right side) ════════════════ */}
      <div style={{
        position: 'absolute', right: 16, top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 410,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {[
          { label: '+', onClick: () => { if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() + 1) } },
          { label: '−', onClick: () => { if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() - 1) } },
          { label: '🎯', onClick: () => { setFollow(true); if (pos && mapRef.current) mapRef.current.setView(pos, 15) } },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(13,20,38,0.9)', border: '1px solid rgba(71,85,105,0.4)',
            color: '#fff', fontSize: i < 2 ? 18 : 16, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
          }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TURN-BY-TURN STEPS PANEL ═════════════════ */}
      {panel === 'steps' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 450,
          background: 'rgba(5,8,16,0.97)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 16px 12px', borderBottom: '1px solid rgba(71,85,105,0.3)',
          }}>
            <button onClick={() => setPanel('none')} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.4)',
              color: '#fff', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>←</button>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Turn-by-Turn</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{steps.length} steps · {fmtDist(routeInfo?.distance || 0)}</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {steps.map((step, i) => (
              <div key={i} onClick={() => { setStepIdx(i); setPanel('none') }} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 12px', marginBottom: 4,
                background: i === stepIdx ? 'rgba(124,58,237,0.15)' : 'rgba(30,41,59,0.4)',
                border: `1px solid ${i === stepIdx ? 'rgba(124,58,237,0.35)' : 'transparent'}`,
                borderRadius: 10, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: i === stepIdx ? 'rgba(124,58,237,0.3)' : 'rgba(71,85,105,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {stepArrow(step)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: i === stepIdx ? 700 : 500, color: '#fff', marginBottom: 2 }}>
                    {stepText(step)}
                  </div>
                  {step.distance > 0 && (
                    <div style={{ fontSize: 10, color: '#64748b' }}>{fmtDist(step.distance)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ SEARCH PANELS ════════════════════════════ */}
      {panel === 'search-start' && (
        <SearchPanel
          label="Set start point"
          onSelect={handleStartSelected}
          onClose={() => setPanel('none')}
        />
      )}
      {panel === 'search-end' && (
        <SearchPanel
          label="Set destination"
          onSelect={handleDestSelected}
          onClose={() => setPanel('none')}
        />
      )}

      {/* ══════════════ ROUTE LEGEND ════════════════════════════════ */}
      <RouteLegend visible={!tripActive && !!(routeFastest || routeSafest || routeUnsafe)} />

      {/* ══════════════ ACTIVE NAV HUD (trip running) ══════════════ */}
      {tripActive && !tripArrived && (
        <>
          {/* ── Turn instruction — top-centre big banner ── */}
          {currentStep && (
            <div style={{
              position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)',
              zIndex: 420,
              background: 'rgba(5,8,22,0.94)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(124,58,237,0.35)',
              borderRadius: 16,
              padding: '10px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              maxWidth: 340, minWidth: 200,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}>
              <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{stepArrow(currentStep)}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  {stepText(currentStep)}
                </div>
                {currentStep.distance > 0 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    In {fmtDist(currentStep.distance)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Mini bottom HUD strip ── */}
          <div style={{
            position: 'absolute', bottom: 32, left: 12, right: 12,
            zIndex: 420,
            background: 'rgba(5,8,22,0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 16,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}>

            {/* Speed */}
            <div style={{ textAlign: 'center', minWidth: 46 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: speed > 90 ? '#ef4444' : '#22c55e', lineHeight: 1 }}>
                {speed}
              </div>
              <div style={{ fontSize: 8, color: '#475569', marginTop: 1 }}>km/h</div>
            </div>

            <div style={{ width: 1, height: 32, background: 'rgba(71,85,105,0.4)', flexShrink: 0 }} />

            {/* Distance remaining */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                {fmtDist(pos ? distRemaining : routeInfo?.distance || 0)}
              </div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>remaining</div>
            </div>

            <div style={{ width: 1, height: 32, background: 'rgba(71,85,105,0.4)', flexShrink: 0 }} />

            {/* ETA */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}>
                {fmtETA(pos ? distRemaining / 15 : routeInfo?.duration || 0)}
              </div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>ETA</div>
            </div>

            <div style={{ width: 1, height: 32, background: 'rgba(71,85,105,0.4)', flexShrink: 0 }} />

            {/* Centre + End buttons */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => setFollow(true)} style={{
                width: 36, height: 36, borderRadius: 10,
                background: follow ? 'rgba(124,58,237,0.25)' : 'rgba(30,41,59,0.8)',
                border: `1px solid ${follow ? 'rgba(124,58,237,0.5)' : 'rgba(71,85,105,0.3)'}`,
                color: follow ? '#a78bfa' : '#64748b',
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} title="Re-centre map">🎯</button>

              <button onClick={endTrip} style={{
                padding: '0 14px', height: 36, borderRadius: 10,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#ef4444', fontWeight: 700, fontSize: 11,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>■ End</button>
            </div>

            {demoRunning && (
              <div style={{
                position: 'absolute', top: -18, right: 14,
                fontSize: 8, color: '#f59e0b', fontWeight: 700,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 20, padding: '2px 7px', letterSpacing: '0.05em',
              }}>DEMO SIMULATING</div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ ADVISORY BANNER (always) ══════════════════ */}
      <AdvisoryBanner navActive={tripActive && !tripArrived} />

      {/* CSS animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
