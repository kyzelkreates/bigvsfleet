/**
 * ============================================================
 * APEX AI — SINGLE SOURCE OF TRUTH
 * /src/core/storage.js
 *
 * ALL system state reads and writes through this module.
 * NO secondary state engines.
 * NO duplicate localStorage keys.
 * NO hard-coded UI state outside this file.
 * ============================================================
 */

import { create } from 'zustand'

// ─── Storage Keys ─────────────────────────────────────────────
export const STORAGE_KEYS = {
  // App
  APP_THEME:          'apex:app:theme',
  APP_SIDEBAR:        'apex:app:sidebar',
  APP_LOCALE:         'apex:app:locale',

  // Auth
  AUTH_SESSION:       'apex:auth:session',
  AUTH_USER:          'apex:auth:user',
  AUTH_ROLE:          'apex:auth:role',

  // Fleet
  FLEET_ACTIVE_VIEW:  'apex:fleet:activeView',
  FLEET_FILTERS:      'apex:fleet:filters',
  FLEET_SELECTED:     'apex:fleet:selected',

  // Map
  MAP_PROVIDER:       'apex:map:provider',
  MAP_CENTER:         'apex:map:center',
  MAP_ZOOM:           'apex:map:zoom',
  MAP_LAYER:          'apex:map:layer',

  // AI
  AI_PROVIDER:        'apex:ai:provider',
  AI_MODEL:           'apex:ai:model',
  AI_CONFIG:          'apex:ai:config',

  // ── RUN 4: API Config ─────────────────────────────────────────
  API_CONFIG:         'bigv:api:config',

  // ── RUN 6: Driver PWA State ─────────────────────────────────────
  DRIVER_STATE:       'bigv:driver:state',
  // ── RUN 7: Fleet Controller PWA State ──────────────────────────
  CONTROLLER_STATE:   'bigv:controller:state',
  // ── RUN 8: PWA Deployment Centre ─────────────────────────────
  PWA_DEPLOY_STATE:   'bigv:pwa:deployment',
  // ── RUN 9: Compliance AI State ─────────────────────────────
  COMPLIANCE_AI_STATE: 'bigv:compliance:ai',
  // ── RUN 11: Backend Config persistence ─────────────────────
  BACKEND_CONFIG:      'bigv:backend:config',

  // ── RUN 3: Demo/Live Mode ───────────────────────────────────
  DEMO_LIVE_MODE:     'bigv:mode:demoLive',
  BACKEND_READINESS:  'bigv:mode:backendReadiness',
  SYNC_STATUS:        'bigv:mode:syncStatus',
  DEMO_PUBLIC_ACCESS: 'bigv:config:demoPublicAccess',

  // Driver
  DRIVER_SELECTED:    'apex:driver:selected',
  DRIVER_SESSION:     'apex:driver:session',

  // Navigation
  NAV_ROUTE:          'apex:nav:route',
  NAV_DESTINATION:    'apex:nav:destination',
  NAV_MODE:           'apex:nav:mode',

  // Notifications
  NOTIF_QUEUE:        'apex:notif:queue',
  NOTIF_PREFS:        'apex:notif:prefs',
}

// ─── Persist Helpers ──────────────────────────────────────────
const persist = {
  get: (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('[Apex:Storage] persist.set failed:', key, e)
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // silent
    }
  },
  clear: (prefix = 'apex:') => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k))
    } catch {
      // silent
    }
  }
}

// ─── App Store ────────────────────────────────────────────────
export const useAppStore = create((set, get) => ({
  // ── State ──
  theme:           persist.get(STORAGE_KEYS.APP_THEME, 'dark'),
  sidebarExpanded: false, // burger mode — always starts closed
  locale:          persist.get(STORAGE_KEYS.APP_LOCALE, 'en'),
  systemStatus:    'online',   // 'online' | 'offline' | 'degraded'
  notifications:   [],
  alerts:          [],

  // ── Actions ──
  setTheme: (theme) => {
    persist.set(STORAGE_KEYS.APP_THEME, theme)
    set({ theme })
  },
  toggleSidebar: () => {
    const next = !get().sidebarExpanded
    persist.set(STORAGE_KEYS.APP_SIDEBAR, next)
    set({ sidebarExpanded: next })
  },
  setSidebarExpanded: (val) => {
    persist.set(STORAGE_KEYS.APP_SIDEBAR, val)
    set({ sidebarExpanded: val })
  },
  closeSidebar: () => set({ sidebarExpanded: false }),
  openSidebar:  () => set({ sidebarExpanded: true }),
  setSystemStatus: (status) => set({ systemStatus: status }),
  addNotification: (notif) => set(s => ({
    notifications: [{ id: Date.now(), ...notif }, ...s.notifications].slice(0, 50)
  })),
  clearNotifications: () => set({ notifications: [] }),
  addAlert: (alert) => set(s => ({
    alerts: [{ id: Date.now(), ...alert }, ...s.alerts].slice(0, 20)
  })),
  dismissAlert: (id) => set(s => ({
    alerts: s.alerts.filter(a => a.id !== id)
  })),
}))

// ─── Auth Store ───────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  // ── State ──
  session:       persist.get(STORAGE_KEYS.AUTH_SESSION, null),
  user:          persist.get(STORAGE_KEYS.AUTH_USER, null),
  role:          persist.get(STORAGE_KEYS.AUTH_ROLE, null),
  isLoading:     false,
  isAuthenticated: false,
  // demoPublicAccess: true = allow through AuthGuard in demo mode (no login needed)
  // Defaults to TRUE on fresh deploy so demo/investor visitors are never blocked
  // Set to false to enforce real authentication for live deployments
  demoPublicAccess: (() => {
    const stored = localStorage.getItem('bigv:config:demoPublicAccess')
    return stored === null ? true : stored === 'true'
  })(),

  // ── Actions ──
  setSession: (session) => {
    persist.set(STORAGE_KEYS.AUTH_SESSION, session)
    set({ session, isAuthenticated: !!session })
  },
  setUser: (user) => {
    persist.set(STORAGE_KEYS.AUTH_USER, user)
    set({ user })
  },
  setRole: (role) => {
    persist.set(STORAGE_KEYS.AUTH_ROLE, role)
    set({ role })
  },
  setLoading: (isLoading) => set({ isLoading }),
  setDemoPublicAccess: (val) => {
    persist.set('bigv:config:demoPublicAccess', val)
    set({ demoPublicAccess: val })
  },
  clearAuth: () => {
    persist.remove(STORAGE_KEYS.AUTH_SESSION)
    persist.remove(STORAGE_KEYS.AUTH_USER)
    persist.remove(STORAGE_KEYS.AUTH_ROLE)
    set({ session: null, user: null, role: null, isAuthenticated: false })
  }
}))

// ─── Fleet Store ──────────────────────────────────────────────
export const useFleetStore = create((set) => ({
  // ── State ──
  vehicles:      [],
  activeVehicle: null,
  activeView:    persist.get(STORAGE_KEYS.FLEET_ACTIVE_VIEW, 'grid'),
  filters:       persist.get(STORAGE_KEYS.FLEET_FILTERS, {}),
  selectedIds:   persist.get(STORAGE_KEYS.FLEET_SELECTED, []),
  isLoading:     false,
  telemetry:     {},

  // ── Actions ──
  setVehicles: (vehicles) => set({ vehicles }),
  setActiveVehicle: (v) => set({ activeVehicle: v }),
  setActiveView: (view) => {
    persist.set(STORAGE_KEYS.FLEET_ACTIVE_VIEW, view)
    set({ activeView: view })
  },
  setFilters: (filters) => {
    persist.set(STORAGE_KEYS.FLEET_FILTERS, filters)
    set({ filters })
  },
  setSelectedIds: (ids) => {
    persist.set(STORAGE_KEYS.FLEET_SELECTED, ids)
    set({ selectedIds: ids })
  },
  setLoading: (isLoading) => set({ isLoading }),
  updateTelemetry: (vehicleId, data) => set(s => ({
    telemetry: { ...s.telemetry, [vehicleId]: { ...s.telemetry[vehicleId], ...data, ts: Date.now() } }
  }))
}))

// ─── Map Store ────────────────────────────────────────────────
export const useMapStore = create((set) => ({
  // ── State ──
  provider:   persist.get(STORAGE_KEYS.MAP_PROVIDER, 'osm'),  // OSM is always-on; upgrades auto when GH/Google key set
  center:     persist.get(STORAGE_KEYS.MAP_CENTER, { lat: 51.5074, lng: -0.1278 }),
  zoom:       persist.get(STORAGE_KEYS.MAP_ZOOM, 11),
  layer:      persist.get(STORAGE_KEYS.MAP_LAYER, 'tactical'),
  isLoaded:   false,
  markers:    [],
  routes:     [],
  geofences:  [],

  // ── Actions ──
  setProvider: (provider) => {
    persist.set(STORAGE_KEYS.MAP_PROVIDER, provider)
    set({ provider })
  },
  setCenter: (center) => {
    persist.set(STORAGE_KEYS.MAP_CENTER, center)
    set({ center })
  },
  setZoom: (zoom) => {
    persist.set(STORAGE_KEYS.MAP_ZOOM, zoom)
    set({ zoom })
  },
  setLayer: (layer) => {
    persist.set(STORAGE_KEYS.MAP_LAYER, layer)
    set({ layer })
  },
  setLoaded: (isLoaded) => set({ isLoaded }),
  setMarkers: (markers) => set({ markers }),
  addMarker: (m) => set(s => ({ markers: [...s.markers, m] })),
  setRoutes: (routes) => set({ routes }),
  setGeofences: (geofences) => set({ geofences })
}))

// ─── AI Store ─────────────────────────────────────────────────
export const useAIStore = create((set) => ({
  // ── State ──
  provider:       persist.get(STORAGE_KEYS.AI_PROVIDER, 'openai'),
  model:          persist.get(STORAGE_KEYS.AI_MODEL, null),
  config:         persist.get(STORAGE_KEYS.AI_CONFIG, {}),
  status:         'idle',   // 'idle' | 'loading' | 'streaming' | 'error'
  activeModule:   null,
  tokenUsage:     { prompt: 0, completion: 0, total: 0 },
  costEstimate:   0,
  fallbackActive: false,

  // ── Actions ──
  setProvider: (provider) => {
    persist.set(STORAGE_KEYS.AI_PROVIDER, provider)
    set({ provider })
  },
  setModel: (model) => {
    persist.set(STORAGE_KEYS.AI_MODEL, model)
    set({ model })
  },
  setConfig: (config) => {
    persist.set(STORAGE_KEYS.AI_CONFIG, config)
    set({ config })
  },
  setStatus: (status) => set({ status }),
  setActiveModule: (module) => set({ activeModule: module }),
  updateTokenUsage: (usage) => set(s => ({
    tokenUsage: {
      prompt:     s.tokenUsage.prompt + (usage.prompt || 0),
      completion: s.tokenUsage.completion + (usage.completion || 0),
      total:      s.tokenUsage.total + (usage.total || 0)
    }
  })),
  setCostEstimate: (cost) => set({ costEstimate: cost }),
  setFallbackActive: (val) => set({ fallbackActive: val })
}))

// ─── Driver Store ─────────────────────────────────────────────
export const useDriverStore = create((set) => ({
  // ── State ──
  drivers:        [],
  activeDriver:   persist.get(STORAGE_KEYS.DRIVER_SELECTED, null),
  driverSession:  persist.get(STORAGE_KEYS.DRIVER_SESSION, null),
  scores:         {},
  isLoading:      false,

  // ── Actions ──
  setDrivers: (drivers) => set({ drivers }),
  setActiveDriver: (driver) => {
    persist.set(STORAGE_KEYS.DRIVER_SELECTED, driver)
    set({ activeDriver: driver })
  },
  setDriverSession: (session) => {
    persist.set(STORAGE_KEYS.DRIVER_SESSION, session)
    set({ driverSession: session })
  },
  updateScore: (driverId, score) => set(s => ({
    scores: { ...s.scores, [driverId]: score }
  })),
  setLoading: (isLoading) => set({ isLoading })
}))

// ─── Navigation Store ─────────────────────────────────────────
export const useNavStore = create((set) => ({
  // ── State ──
  route:          persist.get(STORAGE_KEYS.NAV_ROUTE, null),
  destination:    persist.get(STORAGE_KEYS.NAV_DESTINATION, null),
  mode:           persist.get(STORAGE_KEYS.NAV_MODE, 'drive'),
  isNavigating:   false,
  currentPosition: null,
  eta:            null,
  distanceLeft:   null,
  turnInstructions: [],

  // ── Actions ──
  setRoute: (route) => {
    persist.set(STORAGE_KEYS.NAV_ROUTE, route)
    set({ route })
  },
  setDestination: (dest) => {
    persist.set(STORAGE_KEYS.NAV_DESTINATION, dest)
    set({ destination: dest })
  },
  setMode: (mode) => {
    persist.set(STORAGE_KEYS.NAV_MODE, mode)
    set({ mode })
  },
  setNavigating: (val) => set({ isNavigating: val }),
  setCurrentPosition: (pos) => set({ currentPosition: pos }),
  setEta: (eta) => set({ eta }),
  setDistanceLeft: (dist) => set({ distanceLeft: dist }),
  setTurnInstructions: (instr) => set({ turnInstructions: instr }),
  clearNavigation: () => {
    persist.remove(STORAGE_KEYS.NAV_ROUTE)
    persist.remove(STORAGE_KEYS.NAV_DESTINATION)
    set({ route: null, destination: null, isNavigating: false, eta: null, distanceLeft: null, turnInstructions: [] })
  }
}))

// ─── Realtime Store ───────────────────────────────────────────
export const useRealtimeStore = create((set) => ({
  connected:       false,
  channelStatuses: {},
  livePositions:   {},
  liveEvents:      [],

  setConnected: (connected) => set({ connected }),
  setChannelStatus: (channel, status) => set(s => ({
    channelStatuses: { ...s.channelStatuses, [channel]: status }
  })),
  updateLivePosition: (vehicleId, position) => set(s => ({
    livePositions: { ...s.livePositions, [vehicleId]: { ...position, ts: Date.now() } }
  })),
  addLiveEvent: (event) => set(s => ({
    liveEvents: [{ id: Date.now(), ...event }, ...s.liveEvents].slice(0, 100)
  })),
  clearLiveEvents: () => set({ liveEvents: [] })
}))


// ─── RUN 3 ─── Demo/Live Mode Store ───────────────────────────
// Big V's Best Routes™ — SSOT extension for demo/live mode core.
// NO duplicate state. NO backend connection. NO secrets.
// This store is the single source of truth for:
//   - current mode (demo / live)
//   - backend readiness state
//   - API config summary (provider names only — no keys)
//   - sync status (demo/local vs live backend)
//   - offline/fallback state
//   - 4P3X AI oversight status (reserved for Run 9)
// ──────────────────────────────────────────────────────────────

const DEMO_LIVE_DEFAULTS = {
  // ── Identity ────────────────────────────────────────────────
  appIdentity: {
    name:      "Big V's Best Routes™",
    subtitle:  'Safety & Legal Compliance First Navigation Platform',
    brandLine: '4P3X Intelligent AI™ Created by Kyzel Kreates™',
  },

  // ── Demo/Live Mode ──────────────────────────────────────────
  demoLiveMode: {
    mode:         'demo',       // 'demo' | 'live'
    demoEnabled:  true,
    liveEnabled:  false,
    label:        'Demo Mode shows the product. Live Mode runs the product.',
    lastChangedAt: null,
  },

  // ── Backend Readiness ────────────────────────────────────────
  backendReadiness: {
    provider:      'none',          // 'none' | 'supabase' | 'firebase' | 'aws_custom' | 'rest_custom' | 'local_only'
    backendStatus: 'not_configured', // 'not_configured' | 'configured' | 'testing' | 'connected' | 'error' | 'offline_fallback'
    syncMode:      'demo_local',    // 'demo_local' | 'live_backend' | 'local_only' | 'offline_queue'
    lastSyncAt:    null,
    lastSyncType:  'none',          // 'none' | 'demo_local' | 'backend' | 'offline_queue'
    syncErrors:    [],
  },

  // ── API Config Summary (provider names only — no keys) ───────
  apiConfigSummary: {
    map2dProvider:          'osm_public',       // OSM public — no key required for demo
    map3dProvider:          'maplibre',          // MapLibre — Run 5
    routingProvider:        'demo_local',        // GraphHopper needs key — Run 4/5
    restrictionProvider:    'none',              // Overpass — Run 5
    futureOptionalProvider: 'google_maps_optional_after_concept_verification',
    apiStatus:              'demo_ready',        // 'not_configured' | 'demo_ready' | 'configured' | 'error'
  },

  // ── Offline/Fallback State ───────────────────────────────────
  offlineStatus: {
    isOffline:    false,
    fallbackMode: 'local_safe',
    warning:      null,
  },

  // ── Sync Status Foundation ───────────────────────────────────
  syncStatus: {
    dashboard:          'demo_local_ready',
    driverPwa:          'demo_local_ready',
    controllerPwa:      'demo_local_ready',
    lastDemoSyncAt:     null,
    lastBackendSyncAt:  null,
    errors:             [],
  },

  // ── System Health ────────────────────────────────────────────
  systemHealth: {
    modeReady:      true,
    backendReady:   false,
    apiReady:       false,
    mapReady:       false,
    pwaSyncReady:   false,
  },

  // ── 4P3X AI Oversight (reserved for Run 9) ───────────────────
  safetyOversightStatus: {
    reserved:  true,
    active:    false,
    run:       'Run 9',
    note:      'Safety Oversight AI logic reserved for Run 9.',
  },
  legalComplianceOversightStatus: {
    reserved:  true,
    active:    false,
    run:       'Run 9',
    note:      'Legal Compliance Oversight AI logic reserved for Run 9.',
  },
}

export const useDemoLiveStore = create((set, get) => {
  // ── Load from localStorage safely ─────────────────────────
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEMO_LIVE_MODE)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })()

  const initial = saved
    ? {
        ...DEMO_LIVE_DEFAULTS,
        demoLiveMode:     { ...DEMO_LIVE_DEFAULTS.demoLiveMode,     ...(saved.demoLiveMode     || {}) },
        backendReadiness: { ...DEMO_LIVE_DEFAULTS.backendReadiness, ...(saved.backendReadiness || {}) },
        syncStatus:       { ...DEMO_LIVE_DEFAULTS.syncStatus,       ...(saved.syncStatus       || {}) },
        offlineStatus:    { ...DEMO_LIVE_DEFAULTS.offlineStatus,    ...(saved.offlineStatus    || {}) },
      }
    : { ...DEMO_LIVE_DEFAULTS }

  // ── Helper — persist current state ────────────────────────
  const _persist = (state) => {
    try {
      const { appIdentity: _i, apiConfigSummary: _a, systemHealth: _h,
              safetyOversightStatus: _s, legalComplianceOversightStatus: _l, ...safe } = state
      localStorage.setItem(STORAGE_KEYS.DEMO_LIVE_MODE, JSON.stringify(safe))
    } catch (e) {
      console.warn('[BigV:DemoLive] persist failed:', e)
    }
  }

  return {
    ...initial,

    // ── Toggle Demo/Live mode ──────────────────────────────
    setMode: (mode) => {
      if (mode !== 'demo' && mode !== 'live') return
      const isDemo  = mode === 'demo'
      const next = {
        demoLiveMode: {
          ...get().demoLiveMode,
          mode,
          demoEnabled:   isDemo,
          liveEnabled:   !isDemo,
          lastChangedAt: new Date().toISOString(),
        },
        backendReadiness: {
          ...get().backendReadiness,
          syncMode: isDemo ? 'demo_local' : (get().backendReadiness.provider === 'none' ? 'local_only' : get().backendReadiness.syncMode),
        },
      }
      set(next)
      _persist({ ...get(), ...next })
    },

    toggleMode: () => {
      get().setMode(get().demoLiveMode.mode === 'demo' ? 'live' : 'demo')
    },

    // ── Backend readiness (no real connection — state only) ──
    setBackendProvider: (provider) => {
      const next = {
        backendReadiness: {
          ...get().backendReadiness,
          provider,
          backendStatus: provider === 'none' ? 'not_configured' : 'configured',
        },
        systemHealth: {
          ...get().systemHealth,
          backendReady: provider !== 'none',
        },
      }
      set(next)
      _persist({ ...get(), ...next })
    },

    setBackendStatus: (backendStatus) => {
      const next = {
        backendReadiness: { ...get().backendReadiness, backendStatus },
        systemHealth: {
          ...get().systemHealth,
          backendReady: backendStatus === 'connected',
        },
      }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Demo sync timestamp (local only) ──────────────────────
    refreshDemoSync: () => {
      const ts = new Date().toISOString()
      const next = {
        syncStatus: {
          ...get().syncStatus,
          lastDemoSyncAt: ts,
          dashboard:      'demo_local_ready',
          driverPwa:      'demo_local_ready',
          controllerPwa:  'demo_local_ready',
        },
        backendReadiness: {
          ...get().backendReadiness,
          lastSyncAt:   ts,
          lastSyncType: 'demo_local',
        },
      }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Offline state ─────────────────────────────────────────
    setOffline: (isOffline) => {
      set(s => ({
        offlineStatus: {
          ...s.offlineStatus,
          isOffline,
          fallbackMode: isOffline ? 'local_safe' : 'local_safe',
          warning: isOffline ? 'Device is offline. Operating in local/offline-safe mode.' : null,
        }
      }))
    },

    // ── Selectors ─────────────────────────────────────────────
    isDemo: () => get().demoLiveMode.mode === 'demo',
    isLive: () => get().demoLiveMode.mode === 'live',
    hasBackend: () => get().backendReadiness.provider !== 'none',
    backendMissing: () => {
      const { mode }     = get().demoLiveMode
      const { provider } = get().backendReadiness
      return mode === 'live' && provider === 'none'
    },
  }
})

// ─── RUN 3 ─── Selectors extension ───────────────────────────
export const run3Selectors = {
  mode:             s => s.demoLiveMode?.mode,
  demoEnabled:      s => s.demoLiveMode?.demoEnabled,
  backendProvider:  s => s.backendReadiness?.provider,
  backendStatus:    s => s.backendReadiness?.backendStatus,
  syncMode:         s => s.backendReadiness?.syncMode,
  lastDemoSyncAt:   s => s.syncStatus?.lastDemoSyncAt,
  isOffline:        s => s.offlineStatus?.isOffline,
  systemHealth:     s => s.systemHealth,
}


// ─── RUN 4 ─── API Config Store ───────────────────────────────
// Big V's Best Routes™ — SSOT extension for API Settings Centre.
// No duplicate state. No secrets. No backend connection.
// This store is the single source of truth for:
//   - OSM/OSM-compatible 2D tile config
//   - MapLibre 3D/tilt readiness
//   - Overpass API endpoint config
//   - GraphHopper routing config (masked key)
//   - Open-source routing provider options
//   - Geocoding provider config
//   - Custom API endpoint
//   - Future optional Google Maps placeholder
//   - 4P3X API Config Guard™ audit trail
// ──────────────────────────────────────────────────────────────

const API_CONFIG_DEFAULTS = {
  osm: {
    tileUrl:       'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:   '© OpenStreetMap contributors',
    fallbackSource:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    status:        'demo_ready',   // demo_ready | configured | error | blocked_by_config_guard
    lastTestAt:    null,
    lastError:     null,
  },
  mapLibre: {
    enabled:       false,           // full rendering → Run 5/6
    styleUrl:      '',              // placeholder — Run 5
    tiltSupported: null,            // null = not tested yet
    status:        'not_configured',
    lastTestAt:    null,
    lastError:     null,
  },
  overpass: {
    endpointUrl:   'https://overpass-api.de/api/interpreter',
    timeoutMs:     10000,
    status:        'not_configured',
    lastTestAt:    null,
    lastError:     null,
  },
  graphHopper: {
    apiKeyMasked:       '',         // masked display only — real key in runtimeKeys (apex:apikey:graphhopper)
    apiKeyStoredSafely: false,
    profile:            'car',      // car | van | truck | bike | walk
    vehicleProfile:     'car',
    status:             'not_configured',
    lastTestAt:         null,
    lastError:          null,
  },
  routingProviders: {
    selectedProvider: 'demo_local', // demo_local | graphhopper | osrm | valhalla | self_hosted | custom
    osrmEndpoint:     'https://router.project-osrm.org',
    valhallaEndpoint: '',
    selfHostedEndpoint: '',
    customEndpoint:   '',
    status:           'demo_ready',
    lastTestAt:       null,
    lastError:        null,
  },
  geocoding: {
    provider:     'nominatim',      // nominatim | custom
    endpointUrl:  'https://nominatim.openstreetmap.org',
    status:       'demo_ready',
    lastTestAt:   null,
    lastError:    null,
  },
  futureProviders: {
    googleMapsOptionalAfterConceptVerification: true,
    googleMapsEnabled: false,
    googleMapsNote:    'Google Maps API is not required for demo mode. May be added after concept verification.',
  },
  customApi: {
    name:         '',
    baseUrl:      '',
    providerType: 'custom',
    timeoutMs:    8000,
    status:       'not_configured',
    lastTestAt:   null,
    lastError:    null,
  },
  configGuard: {
    lastBlockedAt:   null,
    lastBlockedField: null,
    lastWarning:     null,
    blockedCount:    0,
  },
}

export const useApiConfigStore = create((set, get) => {
  // ── Load from localStorage safely ─────────────────────────
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.API_CONFIG)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })()

  const _merge = (def, sav) => sav ? { ...def, ...sav } : { ...def }

  const initial = saved ? {
    osm:              _merge(API_CONFIG_DEFAULTS.osm,              saved.osm),
    mapLibre:         _merge(API_CONFIG_DEFAULTS.mapLibre,         saved.mapLibre),
    overpass:         _merge(API_CONFIG_DEFAULTS.overpass,         saved.overpass),
    graphHopper:      _merge(API_CONFIG_DEFAULTS.graphHopper,      saved.graphHopper),
    routingProviders: _merge(API_CONFIG_DEFAULTS.routingProviders, saved.routingProviders),
    geocoding:        _merge(API_CONFIG_DEFAULTS.geocoding,        saved.geocoding),
    futureProviders:  { ...API_CONFIG_DEFAULTS.futureProviders },  // never persist future flags from old data
    customApi:        _merge(API_CONFIG_DEFAULTS.customApi,        saved.customApi),
    configGuard:      _merge(API_CONFIG_DEFAULTS.configGuard,      saved.configGuard),
  } : { ...API_CONFIG_DEFAULTS }

  // ── Helper — persist (strip runtime secrets from saved state) ─
  const _persist = (state) => {
    try {
      // NEVER persist the actual GH key here — it lives in runtimeKeys
      // We only store masked display + status
      const safe = {
        osm:              state.osm,
        mapLibre:         state.mapLibre,
        overpass:         state.overpass,
        graphHopper:      { ...state.graphHopper, apiKeyMasked: state.graphHopper.apiKeyMasked },
        routingProviders: state.routingProviders,
        geocoding:        state.geocoding,
        // futureProviders intentionally not persisted — always use defaults
        customApi:        state.customApi,
        configGuard:      state.configGuard,
      }
      localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(safe))
    } catch (e) {
      console.warn('[BigV:ApiConfig] persist failed:', e)
    }
  }

  return {
    ...initial,

    // ── OSM ────────────────────────────────────────────────────
    updateOsm: (patch) => {
      const next = { osm: { ...get().osm, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetOsm: () => {
      const next = { osm: { ...API_CONFIG_DEFAULTS.osm } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── MapLibre ───────────────────────────────────────────────
    updateMapLibre: (patch) => {
      const next = { mapLibre: { ...get().mapLibre, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetMapLibre: () => {
      const next = { mapLibre: { ...API_CONFIG_DEFAULTS.mapLibre } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Overpass ───────────────────────────────────────────────
    updateOverpass: (patch) => {
      const next = { overpass: { ...get().overpass, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetOverpass: () => {
      const next = { overpass: { ...API_CONFIG_DEFAULTS.overpass } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── GraphHopper ────────────────────────────────────────────
    updateGraphHopper: (patch) => {
      const next = { graphHopper: { ...get().graphHopper, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetGraphHopper: () => {
      const next = { graphHopper: { ...API_CONFIG_DEFAULTS.graphHopper } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Routing Providers ──────────────────────────────────────
    updateRoutingProviders: (patch) => {
      const next = { routingProviders: { ...get().routingProviders, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetRoutingProviders: () => {
      const next = { routingProviders: { ...API_CONFIG_DEFAULTS.routingProviders } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Geocoding ──────────────────────────────────────────────
    updateGeocoding: (patch) => {
      const next = { geocoding: { ...get().geocoding, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetGeocoding: () => {
      const next = { geocoding: { ...API_CONFIG_DEFAULTS.geocoding } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Custom API ─────────────────────────────────────────────
    updateCustomApi: (patch) => {
      const next = { customApi: { ...get().customApi, ...patch } }
      set(next)
      _persist({ ...get(), ...next })
    },
    resetCustomApi: () => {
      const next = { customApi: { ...API_CONFIG_DEFAULTS.customApi } }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Config Guard audit ─────────────────────────────────────
    recordGuardBlock: (field, warning) => {
      const next = {
        configGuard: {
          ...get().configGuard,
          lastBlockedAt:    new Date().toISOString(),
          lastBlockedField: field,
          lastWarning:      warning,
          blockedCount:     (get().configGuard.blockedCount || 0) + 1,
        }
      }
      set(next)
      _persist({ ...get(), ...next })
    },

    // ── Defaults accessor ──────────────────────────────────────
    getDefaults: () => ({ ...API_CONFIG_DEFAULTS }),
  }
})

export const API_CONFIG_DEFAULTS_EXPORT = API_CONFIG_DEFAULTS


// ─── RUN 6 ─── Driver PWA State Store ────────────────────────
const DRIVER_STATE_DEFAULTS = {
  driverStatus: {
    driverId: null, name: null, role: 'driver', status: 'available',
    lastSeenAt: null, lastLocationAt: null,
  },
  gpsStatus: {
    permission: 'unknown', accuracyMeters: null, lastUpdatedAt: null,
    error: null, confidence: 'unknown',
    warning: 'GPS accuracy can vary. Do not rely on GPS as legal proof of route suitability.',
  },
  preTripChecklist: {
    vehicleChecked: false, routeReviewed: false, restrictionsReviewed: false,
    loadChecked: false, safetyEquipmentChecked: false, notesReviewed: false,
    companyPolicyAcknowledged: false, notes: '', completedAt: null,
    overrideStartedWithout: false, overrideNote: '',
  },
  routeAcknowledgement: {
    acknowledged: false, acknowledgedAt: null, routeId: null,
  },
  complianceAcknowledgement: {
    acknowledged: false, acknowledgedAt: null, driverId: null, routeId: null,
    message: 'I understand that route and compliance guidance is advisory only. I remain responsible for checking current road signs, laws, restrictions, bridge limits, permits, road conditions, vehicle suitability, and company policy before and during travel.',
  },
  tripStatus: {
    status: 'not_started', startedAt: null, pausedAt: null,
    resumedAt: null, completedAt: null, tripId: null, routeId: null,
  },
  navigationState: {
    active: false, mapMode: 'osm_2d', followMode: true, routeId: null,
    offRouteStatus: 'unknown', nextInstructionIndex: 0, demoMovementActive: false,
  },
  incidentReports: [],
  driverNotes: [],
  syncStatus: {
    lastLocalSaveAt: null, pendingSync: false, mode: 'local', backendConfigured: false,
  },
}

export const useDriverPwaStore = create((set, get) => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DRIVER_STATE)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })()
  const _m = (def, sav) => sav && typeof sav === 'object' ? { ...def, ...sav } : { ...def }
  const initial = saved ? {
    driverStatus: _m(DRIVER_STATE_DEFAULTS.driverStatus, saved.driverStatus),
    gpsStatus: _m(DRIVER_STATE_DEFAULTS.gpsStatus, saved.gpsStatus),
    preTripChecklist: _m(DRIVER_STATE_DEFAULTS.preTripChecklist, saved.preTripChecklist),
    routeAcknowledgement: _m(DRIVER_STATE_DEFAULTS.routeAcknowledgement, saved.routeAcknowledgement),
    complianceAcknowledgement: _m(DRIVER_STATE_DEFAULTS.complianceAcknowledgement, saved.complianceAcknowledgement),
    tripStatus: _m(DRIVER_STATE_DEFAULTS.tripStatus, saved.tripStatus),
    navigationState: _m(DRIVER_STATE_DEFAULTS.navigationState, saved.navigationState),
    incidentReports: Array.isArray(saved.incidentReports) ? saved.incidentReports : [],
    driverNotes: Array.isArray(saved.driverNotes) ? saved.driverNotes : [],
    syncStatus: _m(DRIVER_STATE_DEFAULTS.syncStatus, saved.syncStatus),
  } : { ...DRIVER_STATE_DEFAULTS }

  const _persist = (state) => {
    try {
      localStorage.setItem(STORAGE_KEYS.DRIVER_STATE, JSON.stringify({
        driverStatus: state.driverStatus, gpsStatus: state.gpsStatus,
        preTripChecklist: state.preTripChecklist,
        routeAcknowledgement: state.routeAcknowledgement,
        complianceAcknowledgement: state.complianceAcknowledgement,
        tripStatus: state.tripStatus, navigationState: state.navigationState,
        incidentReports: (state.incidentReports || []).slice(0, 200),
        driverNotes: (state.driverNotes || []).slice(0, 200),
        syncStatus: state.syncStatus,
      }))
    } catch (e) { console.warn('[BigV:DriverStore] persist failed:', e) }
  }

  const _now = () => new Date().toISOString()

  return {
    ...initial,
    updateGpsStatus: (patch) => { const n = { gpsStatus: { ...get().gpsStatus, ...patch, lastUpdatedAt: _now() } }; set(n); _persist({ ...get(), ...n }) },
    updateChecklist: (patch) => { const n = { preTripChecklist: { ...get().preTripChecklist, ...patch } }; set(n); _persist({ ...get(), ...n }) },
    completeChecklist: () => { const n = { preTripChecklist: { ...get().preTripChecklist, completedAt: _now() } }; set(n); _persist({ ...get(), ...n }) },
    resetChecklist: () => { const n = { preTripChecklist: { ...DRIVER_STATE_DEFAULTS.preTripChecklist } }; set(n); _persist({ ...get(), ...n }) },
    acknowledgeRoute: (routeId = null) => { const n = { routeAcknowledgement: { acknowledged: true, acknowledgedAt: _now(), routeId } }; set(n); _persist({ ...get(), ...n }) },
    acknowledgeCompliance: (driverId = null, routeId = null) => { const n = { complianceAcknowledgement: { ...get().complianceAcknowledgement, acknowledged: true, acknowledgedAt: _now(), driverId, routeId } }; set(n); _persist({ ...get(), ...n }) },
    resetComplianceAck: () => { const n = { complianceAcknowledgement: { ...DRIVER_STATE_DEFAULTS.complianceAcknowledgement } }; set(n); _persist({ ...get(), ...n }) },
    startTrip: (tripId = null, routeId = null) => { const n = { tripStatus: { status: 'started', startedAt: _now(), pausedAt: null, completedAt: null, tripId, routeId }, driverStatus: { ...get().driverStatus, status: 'en_route', lastSeenAt: _now() }, navigationState: { ...get().navigationState, active: true }, syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }; set(n); _persist({ ...get(), ...n }) },
    pauseTrip: () => { const n = { tripStatus: { ...get().tripStatus, status: 'paused', pausedAt: _now() }, driverStatus: { ...get().driverStatus, status: 'paused', lastSeenAt: _now() }, syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }; set(n); _persist({ ...get(), ...n }) },
    resumeTrip: () => { const n = { tripStatus: { ...get().tripStatus, status: 'started', resumedAt: _now() }, driverStatus: { ...get().driverStatus, status: 'en_route', lastSeenAt: _now() }, syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }; set(n); _persist({ ...get(), ...n }) },
    completeTrip: () => { const n = { tripStatus: { ...get().tripStatus, status: 'completed', completedAt: _now() }, driverStatus: { ...get().driverStatus, status: 'available', lastSeenAt: _now() }, navigationState: { ...get().navigationState, active: false, demoMovementActive: false }, syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }; set(n); _persist({ ...get(), ...n }) },
    resetTrip: () => { const n = { tripStatus: { ...DRIVER_STATE_DEFAULTS.tripStatus }, navigationState: { ...DRIVER_STATE_DEFAULTS.navigationState } }; set(n); _persist({ ...get(), ...n }) },
    updateNavigation: (patch) => { const n = { navigationState: { ...get().navigationState, ...patch } }; set(n); _persist({ ...get(), ...n }) },
    addIncidentReport: (report) => {
      const inc = { id: `incident-${Date.now()}`, type: report.type || 'other', description: report.description || '', severity: report.severity || 'medium', routeId: report.routeId || null, location: report.location || null, timestamp: _now(), tripId: report.tripId || null, isDemo: report.isDemo || false, localSaved: true, syncedAt: null }
      const n = { incidentReports: [inc, ...get().incidentReports].slice(0, 200), syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }
      set(n); _persist({ ...get(), ...n }); return inc.id
    },
    addDriverNote: (text, routeId = null) => {
      if (!text || !text.trim()) return
      const note = { id: `note-${Date.now()}`, text: text.trim(), routeId, timestamp: _now(), localSaved: true, syncedAt: null }
      const n = { driverNotes: [note, ...get().driverNotes].slice(0, 200), syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }
      set(n); _persist({ ...get(), ...n })
    },
    updateDriverIdentity: (patch) => { const n = { driverStatus: { ...get().driverStatus, ...patch, lastSeenAt: _now() } }; set(n); _persist({ ...get(), ...n }) },
    updateSyncStatus: (patch) => { const n = { syncStatus: { ...get().syncStatus, ...patch } }; set(n); _persist({ ...get(), ...n }) },
    getDefaults: () => ({ ...DRIVER_STATE_DEFAULTS }),
  }
})


// ─── RUN 7 ─── Fleet Controller PWA State Store ──────────────
// SSOT for all Fleet Controller PWA local state:
//   controller actions, notes, reviewed items, flagged routes.
// Reads Driver PWA state (useDriverPwaStore) for driver status.
// NO backend sync — local/offline safe per directive.
// NO admin settings, API keys, or backend credentials.
// ─────────────────────────────────────────────────────────────

const CONTROLLER_STATE_DEFAULTS = {
  controllerActions: [],
  controllerNotes: [],
  reviewedItems: {},   // { [itemId]: { reviewedAt, controllerId, note } }
  flaggedRoutes: {},   // { [routeId]: { flaggedAt, controllerId, reason } }
  syncStatus: {
    lastLocalSaveAt: null, pendingSync: false, mode: 'local', backendConfigured: false,
  },
}

export const useControllerStore = create((set, get) => {
  const saved = (() => {
    try { const r = localStorage.getItem(STORAGE_KEYS.CONTROLLER_STATE); return r ? JSON.parse(r) : null } catch { return null }
  })()
  const _m = (def, sav) => sav && typeof sav === 'object' ? { ...def, ...sav } : { ...def }
  const initial = saved ? {
    controllerActions: Array.isArray(saved.controllerActions) ? saved.controllerActions : [],
    controllerNotes:   Array.isArray(saved.controllerNotes)   ? saved.controllerNotes   : [],
    reviewedItems:     (saved.reviewedItems && typeof saved.reviewedItems === 'object') ? saved.reviewedItems : {},
    flaggedRoutes:     (saved.flaggedRoutes && typeof saved.flaggedRoutes === 'object') ? saved.flaggedRoutes : {},
    syncStatus:        _m(CONTROLLER_STATE_DEFAULTS.syncStatus, saved.syncStatus),
  } : { ...CONTROLLER_STATE_DEFAULTS }

  const _persist = (state) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTROLLER_STATE, JSON.stringify({
        controllerActions: (state.controllerActions || []).slice(0, 500),
        controllerNotes:   (state.controllerNotes   || []).slice(0, 500),
        reviewedItems:     state.reviewedItems || {},
        flaggedRoutes:     state.flaggedRoutes || {},
        syncStatus:        state.syncStatus,
      }))
    } catch (e) { console.warn('[BigV:ControllerStore] persist failed:', e) }
  }
  const _now = () => new Date().toISOString()

  return {
    ...initial,

    // ── Controller Actions ──────────────────────────────────────
    saveAction: (action) => {
      const a = {
        id:           `ca-${Date.now()}`,
        type:         action.type || 'add_note',
        controllerId: action.controllerId || null,
        driverId:     action.driverId     || null,
        tripId:       action.tripId       || null,
        routeId:      action.routeId      || null,
        vehicleId:    action.vehicleId    || null,
        targetType:   action.targetType   || null,
        targetId:     action.targetId     || null,
        note:         action.note         || '',
        status:       'local_saved',
        isDemo:       action.isDemo       || false,
        createdAt:    _now(),
        updatedAt:    _now(),
      }
      const n = { controllerActions: [a, ...get().controllerActions].slice(0, 500), syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }
      set(n); _persist({ ...get(), ...n }); return a.id
    },

    // ── Controller Notes ────────────────────────────────────────
    addNote: (note) => {
      if (!note.text || !note.text.trim()) return
      const n2 = {
        id:           `cn-${Date.now()}`,
        controllerId: note.controllerId || null,
        driverId:     note.driverId     || null,
        tripId:       note.tripId       || null,
        routeId:      note.routeId      || null,
        vehicleId:    note.vehicleId    || null,
        incidentId:   note.incidentId   || null,
        text:         note.text.trim(),
        severity:     note.severity     || 'info',
        isDemo:       note.isDemo       || false,
        createdAt:    _now(),
        localSaved:   true,
      }
      const next = { controllerNotes: [n2, ...get().controllerNotes].slice(0, 500), syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true } }
      set(next); _persist({ ...get(), ...next }); return n2.id
    },

    // ── Mark Reviewed ───────────────────────────────────────────
    markReviewed: (itemId, controllerId = null, note = '') => {
      const n = {
        reviewedItems: { ...get().reviewedItems, [itemId]: { reviewedAt: _now(), controllerId, note } },
        syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true },
      }
      set(n); _persist({ ...get(), ...n })
    },

    // ── Flag Route for Review ───────────────────────────────────
    flagRoute: (routeId, controllerId = null, reason = '') => {
      const n = {
        flaggedRoutes: { ...get().flaggedRoutes, [routeId]: { flaggedAt: _now(), controllerId, reason } },
        syncStatus: { ...get().syncStatus, lastLocalSaveAt: _now(), pendingSync: true },
      }
      set(n); _persist({ ...get(), ...n })
    },
    unflagRoute: (routeId) => {
      const { [routeId]: _, ...rest } = get().flaggedRoutes
      const n = { flaggedRoutes: rest }
      set(n); _persist({ ...get(), ...n })
    },

    // ── Sync status ─────────────────────────────────────────────
    updateSyncStatus: (patch) => { const n = { syncStatus: { ...get().syncStatus, ...patch } }; set(n); _persist({ ...get(), ...n }) },
    getDefaults: () => ({ ...CONTROLLER_STATE_DEFAULTS }),
  }
})


// ─── RUN 8 ─── PWA Deployment Centre Store ───────────────────
// SSOT for all PWA Deployment Centre state:
//   deployment cards, profile generation, sync timestamps.
// No backend secrets. No API keys. No remote install claims.
// ─────────────────────────────────────────────────────────────

const PWA_DEPLOY_DEFAULTS = {
  driverPwa: {
    enabled: true,
    url: null,
    lastOpenedAt: null,
    lastCopiedAt: null,
    profileGenerated: false,
    profileId: null,
    profileName: null,
    lastSyncAt: null,
    lastSyncType: 'none',
    syncStatus: 'not_synced',
    pendingSyncCount: 0,
    lastError: null,
    installInstructionsVisible: false,
    isDemo: true,
  },
  controllerPwa: {
    enabled: true,
    url: null,
    lastOpenedAt: null,
    lastCopiedAt: null,
    profileGenerated: false,
    profileId: null,
    profileName: null,
    lastSyncAt: null,
    lastSyncType: 'none',
    syncStatus: 'not_synced',
    pendingSyncCount: 0,
    lastError: null,
    installInstructionsVisible: false,
    isDemo: true,
  },
  syncAll: {
    lastSyncAt: null,
    lastSyncType: 'none',
    status: 'idle',
    lastError: null,
  },
  generatedProfiles: [],
  offlineQueue: [],
}

export const usePwaDeployStore = create((set, get) => {
  const saved = (() => {
    try { const r = localStorage.getItem(STORAGE_KEYS.PWA_DEPLOY_STATE); return r ? JSON.parse(r) : null } catch { return null }
  })()
  const _m = (def, sav) => sav && typeof sav === 'object' ? { ...def, ...sav } : { ...def }
  const initial = saved ? {
    driverPwa:          _m(PWA_DEPLOY_DEFAULTS.driverPwa,      saved.driverPwa),
    controllerPwa:      _m(PWA_DEPLOY_DEFAULTS.controllerPwa,  saved.controllerPwa),
    syncAll:            _m(PWA_DEPLOY_DEFAULTS.syncAll,         saved.syncAll),
    generatedProfiles:  Array.isArray(saved.generatedProfiles) ? saved.generatedProfiles : [],
    offlineQueue:       Array.isArray(saved.offlineQueue)       ? saved.offlineQueue       : [],
  } : { ...PWA_DEPLOY_DEFAULTS }

  const _persist = (state) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PWA_DEPLOY_STATE, JSON.stringify({
        driverPwa:         state.driverPwa,
        controllerPwa:     state.controllerPwa,
        syncAll:           state.syncAll,
        generatedProfiles: (state.generatedProfiles || []).slice(0, 100),
        offlineQueue:      (state.offlineQueue || []).slice(0, 500),
      }))
    } catch (e) { console.warn('[BigV:PwaDeployStore] persist failed:', e) }
  }
  const _now = () => new Date().toISOString()

  return {
    ...initial,

    // ── URL helpers ─────────────────────────────────────────────
    setDriverPwaUrl: (url) => { const n = { driverPwa: { ...get().driverPwa, url } }; set(n); _persist({ ...get(), ...n }) },
    setControllerPwaUrl: (url) => { const n = { controllerPwa: { ...get().controllerPwa, url } }; set(n); _persist({ ...get(), ...n }) },

    // ── Opened / Copied ─────────────────────────────────────────
    markDriverOpened: () => { const n = { driverPwa: { ...get().driverPwa, lastOpenedAt: _now() } }; set(n); _persist({ ...get(), ...n }) },
    markControllerOpened: () => { const n = { controllerPwa: { ...get().controllerPwa, lastOpenedAt: _now() } }; set(n); _persist({ ...get(), ...n }) },
    markDriverCopied: () => { const n = { driverPwa: { ...get().driverPwa, lastCopiedAt: _now() } }; set(n); _persist({ ...get(), ...n }) },
    markControllerCopied: () => { const n = { controllerPwa: { ...get().controllerPwa, lastCopiedAt: _now() } }; set(n); _persist({ ...get(), ...n }) },

    // ── Profile generation ───────────────────────────────────────
    generateDriverProfile: (isDemo = true) => {
      const profileId = `drv-${Date.now()}`
      const profile = { id: profileId, role: 'driver', name: `Driver ${get().generatedProfiles.filter(p => p.role === 'driver').length + 1}`, createdAt: _now(), isDemo }
      const n = {
        driverPwa: { ...get().driverPwa, profileGenerated: true, profileId, profileName: profile.name, isDemo },
        generatedProfiles: [profile, ...get().generatedProfiles].slice(0, 100),
      }
      set(n); _persist({ ...get(), ...n }); return profile
    },
    generateControllerProfile: (isDemo = true) => {
      const profileId = `ctrl-${Date.now()}`
      const profile = { id: profileId, role: 'fleet_controller', name: `Controller ${get().generatedProfiles.filter(p => p.role === 'fleet_controller').length + 1}`, createdAt: _now(), isDemo }
      const n = {
        controllerPwa: { ...get().controllerPwa, profileGenerated: true, profileId, profileName: profile.name, isDemo },
        generatedProfiles: [profile, ...get().generatedProfiles].slice(0, 100),
      }
      set(n); _persist({ ...get(), ...n }); return profile
    },

    // ── Sync ────────────────────────────────────────────────────
    markDriverSynced: (type, error = null) => {
      const ts = _now()
      const n = {
        driverPwa: { ...get().driverPwa, lastSyncAt: ts, lastSyncType: type, syncStatus: error ? 'error' : 'synced', lastError: error, pendingSyncCount: 0 },
      }
      set(n); _persist({ ...get(), ...n })
    },
    markControllerSynced: (type, error = null) => {
      const ts = _now()
      const n = {
        controllerPwa: { ...get().controllerPwa, lastSyncAt: ts, lastSyncType: type, syncStatus: error ? 'error' : 'synced', lastError: error, pendingSyncCount: 0 },
      }
      set(n); _persist({ ...get(), ...n })
    },
    markAllSynced: (type, error = null) => {
      const ts = _now()
      const n = { syncAll: { lastSyncAt: ts, lastSyncType: type, status: error ? 'error' : 'synced', lastError: error } }
      set(n); _persist({ ...get(), ...n })
    },

    // ── Pending sync count ─────────────────────────────────────
    setPendingCount: (pwa, count) => {
      if (pwa === 'driver')     { const n = { driverPwa: { ...get().driverPwa, pendingSyncCount: count } }; set(n); _persist({ ...get(), ...n }) }
      if (pwa === 'controller') { const n = { controllerPwa: { ...get().controllerPwa, pendingSyncCount: count } }; set(n); _persist({ ...get(), ...n }) }
    },

    // ── Offline queue ───────────────────────────────────────────
    queueOfflineItem: (item) => {
      const n = { offlineQueue: [{ ...item, id: `oq-${Date.now()}`, queuedAt: _now() }, ...get().offlineQueue].slice(0, 500) }
      set(n); _persist({ ...get(), ...n })
    },
    clearOfflineQueue: () => { const n = { offlineQueue: [] }; set(n); _persist({ ...get(), ...n }) },

    getDefaults: () => ({ ...PWA_DEPLOY_DEFAULTS }),
  }
})


// ─── RUN 9 ─── 4P3X Intelligent AI Compliance Store ─────────
// SSOT for Safety Oversight AI + Legal Compliance Oversight AI.
// Advisory only — never guarantees compliance.
// No external AI APIs. Deterministic local engine only.
// ─────────────────────────────────────────────────────────────

const COMPLIANCE_AI_DEFAULTS = {
  safetyResults:    [],
  legalResults:     [],
  lastRunAt:        null,
  lastRunMode:      null,
  isRunning:        false,
}

export const useComplianceAIStore = create((set, get) => {
  const saved = (() => {
    try { const r = localStorage.getItem(STORAGE_KEYS.COMPLIANCE_AI_STATE); return r ? JSON.parse(r) : null } catch { return null }
  })()
  const initial = saved ? {
    safetyResults: Array.isArray(saved.safetyResults) ? saved.safetyResults.slice(0, 50) : [],
    legalResults:  Array.isArray(saved.legalResults)  ? saved.legalResults.slice(0, 50)  : [],
    lastRunAt:     saved.lastRunAt  || null,
    lastRunMode:   saved.lastRunMode || null,
    isRunning:     false,
  } : { ...COMPLIANCE_AI_DEFAULTS }

  const _persist = (state) => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLIANCE_AI_STATE, JSON.stringify({
        safetyResults: (state.safetyResults || []).slice(0, 50),
        legalResults:  (state.legalResults  || []).slice(0, 50),
        lastRunAt:     state.lastRunAt,
        lastRunMode:   state.lastRunMode,
      }))
    } catch (e) { console.warn('[BigV:ComplianceAI] persist failed:', e) }
  }
  const _now = () => new Date().toISOString()

  return {
    ...initial,
    setRunning: (v) => set({ isRunning: v }),
    setSafetyResult: (result) => {
      const n = { safetyResults: [result, ...get().safetyResults].slice(0, 50), lastRunAt: _now(), lastRunMode: result.isDemo ? 'demo' : 'live' }
      set(n); _persist({ ...get(), ...n })
    },
    setLegalResult: (result) => {
      const n = { legalResults: [result, ...get().legalResults].slice(0, 50), lastRunAt: _now(), lastRunMode: result.isDemo ? 'demo' : 'live' }
      set(n); _persist({ ...get(), ...n })
    },
    clearResults: () => {
      const n = { safetyResults: [], legalResults: [], lastRunAt: null }
      set(n); _persist({ ...get(), ...n })
    },
    getLatestSafety: () => get().safetyResults[0] || null,
    getLatestLegal:  () => get().legalResults[0]  || null,
  }
})


// ─── RUN 11 ─── Backend Config Store ─────────────────────────
// Persists Supabase config metadata (masked key status, test result,
// schema status). Never stores raw credentials — those live in
// services_supabase_supabaseClient.js (apex:supabase:settings).
// ─────────────────────────────────────────────────────────────

const BACKEND_CONFIG_DEFAULTS = {
  provider:         'none',           // 'none' | 'supabase' | 'firebase' | 'aws_custom' | 'rest_custom' | 'local_only'
  urlConfigured:    false,
  keyConfigured:    false,
  keyMasked:        '',               // masked display only
  connectionStatus: 'not_configured', // 'not_configured' | 'configured' | 'testing' | 'connected' | 'schema_missing' | 'error' | 'local_fallback'
  schemaStatus:     'unknown',        // 'unknown' | 'schema_ready' | 'schema_missing' | 'error'
  lastTestAt:       null,
  lastTestError:    null,
  isTestingNow:     false,
}

export const useBackendConfigStore = create((set, get) => {
  const saved = (() => {
    try { const r = localStorage.getItem(STORAGE_KEYS.BACKEND_CONFIG); return r ? JSON.parse(r) : null } catch { return null }
  })()
  const initial = saved
    ? { ...BACKEND_CONFIG_DEFAULTS, ...saved, isTestingNow: false }
    : { ...BACKEND_CONFIG_DEFAULTS }

  const _persist = (s) => {
    try {
      const { isTestingNow: _, ...safe } = s
      localStorage.setItem(STORAGE_KEYS.BACKEND_CONFIG, JSON.stringify(safe))
    } catch (e) { console.warn('[BigV:BackendConfig] persist failed:', e) }
  }

  return {
    ...initial,
    setProvider: (provider) => {
      const n = { ...get(), provider }
      set(n); _persist(n)
    },
    markConfigured: (urlConfigured, keyConfigured, keyMasked) => {
      const n = { ...get(), urlConfigured, keyConfigured, keyMasked,
        connectionStatus: (urlConfigured && keyConfigured) ? 'configured' : 'not_configured' }
      set(n); _persist(n)
    },
    setTestResult: (status, error = null, schemaStatus = 'unknown') => {
      const n = { ...get(), connectionStatus: status, lastTestAt: new Date().toISOString(), lastTestError: error, schemaStatus, isTestingNow: false }
      set(n); _persist(n)
    },
    setTesting: (v) => set({ ...get(), isTestingNow: v }),
    resetConfig: () => {
      const n = { ...BACKEND_CONFIG_DEFAULTS }
      set(n); _persist(n)
    },
  }
})

// ─── Root Storage API ─────────────────────────────────────────
// Unified access to persist helpers
export const Storage = persist

// ─── Store Selectors (convenience) ───────────────────────────
export const selectors = {
  app: {
    theme:           s => s.theme,
    sidebarExpanded: s => s.sidebarExpanded,
    systemStatus:    s => s.systemStatus,
    notifications:   s => s.notifications,
    alerts:          s => s.alerts,
  },
  auth: {
    user:            s => s.user,
    role:            s => s.role,
    isAuthenticated: s => s.isAuthenticated,
    isLoading:       s => s.isLoading,
  },
  fleet: {
    vehicles:        s => s.vehicles,
    activeVehicle:   s => s.activeVehicle,
    telemetry:       s => s.telemetry,
    isLoading:       s => s.isLoading,
  },
  ai: {
    provider:        s => s.provider,
    model:           s => s.model,
    status:          s => s.status,
    fallbackActive:  s => s.fallbackActive,
    tokenUsage:      s => s.tokenUsage,
  }
}

export default {
  STORAGE_KEYS,
  Storage,
  useAppStore,
  useAuthStore,
  useFleetStore,
  useMapStore,
  useAIStore,
  useDriverStore,
  useNavStore,
  useRealtimeStore,
  useDemoLiveStore,
  useApiConfigStore,
  useDriverPwaStore,
  useControllerStore,
  usePwaDeployStore,
  useComplianceAIStore,
  useBackendConfigStore,
  selectors,
  run3Selectors,
}
