
// ─── Role constants (mirrors authService USER_ROLES) ─────────
export const ROLES = {
  FLEET_ADMIN:      'fleet_admin',
  FLEET_MANAGER:    'fleet_manager',
  DRIVER:           'driver',
  FLEET_CONTROLLER: 'fleet_controller',
  DISPATCHER:       'dispatcher',
  COMPLIANCE:       'compliance',
  VIEWER:           'viewer',
}

// ─── Route Role Map ───────────────────────────────────────────
export const ROUTE_ROLES = {
  '/dashboard':           ROLES.FLEET_ADMIN,
  '/fleet':               ROLES.FLEET_ADMIN,
  '/drivers':             ROLES.FLEET_ADMIN,
  '/vehicles':            ROLES.FLEET_ADMIN,
  '/dispatch':            ROLES.FLEET_ADMIN,
  '/navigation':          ROLES.FLEET_ADMIN,
  '/ai':                  ROLES.FLEET_ADMIN,
  '/safety':              ROLES.FLEET_ADMIN,
  '/compliance':          ROLES.FLEET_ADMIN,
  '/analytics':           ROLES.FLEET_ADMIN,
  '/incidents':           ROLES.FLEET_ADMIN,
  '/messaging':           ROLES.FLEET_ADMIN,
  '/reports':             ROLES.FLEET_ADMIN,
  '/pwa-deployment':      ROLES.FLEET_ADMIN,
  '/api-settings':        ROLES.FLEET_ADMIN,
  '/backend-settings':    ROLES.FLEET_ADMIN,
  '/settings':            ROLES.FLEET_ADMIN,
  '/driver-app':          ROLES.DRIVER,
  '/ap3x':                ROLES.DRIVER,
  '/fleet-controller-pwa': ROLES.FLEET_CONTROLLER,
}

/**
 * ============================================================
 * APEX AI — Route Registry (Run 15 — AI route added)
 * /src/config/routes.js
 * ============================================================
 */

export const ROUTES = {
  // ── Core ──────────────────────────────────────────────────
  ROOT:       '/',
  DASHBOARD:  '/dashboard',

  // ── Fleet ─────────────────────────────────────────────────
  FLEET:          '/fleet',
  FLEET_VEHICLE:  '/fleet/:vehicleId',

  // ── Drivers ───────────────────────────────────────────────
  DRIVERS:         '/drivers',
  DRIVER_PROFILE:  '/drivers/:driverId',

  // ── Vehicles ──────────────────────────────────────────────
  VEHICLES:        '/vehicles',
  VEHICLE_DETAIL:  '/vehicles/:vehicleId',

  // ── Dispatch ──────────────────────────────────────────────
  DISPATCH: '/dispatch',

  // ── Driver Setup ──────────────────────────────────────────
  DRIVER_SETUP: '/driver-setup',

  // ── Navigation / AP3X ─────────────────────────────────────
  NAVIGATION: '/navigation',
  AP3X:       '/ap3x',

  // ── AI Intelligence ───────────────────────────────────────
  AI: '/ai',    // Run 15

  // ── Compliance ────────────────────────────────────────────
  COMPLIANCE: '/compliance',

  // ── Safety AI ─────────────────────────────────────────────
  SAFETY: '/safety',

  // ── Analytics ─────────────────────────────────────────────
  ANALYTICS: '/analytics',

  // ── Incidents ─────────────────────────────────────────────
  INCIDENTS:        '/incidents',
  INCIDENT_DETAIL:  '/incidents/:incidentId',

  // ── Messaging ─────────────────────────────────────────────
  MESSAGING: '/messaging',

  // ── Settings ──────────────────────────────────────────────
  SETTINGS:               '/settings',
  SETTINGS_PROFILE:       '/settings/profile',
  SETTINGS_FLEET:         '/settings/fleet',
  SETTINGS_AI:            '/settings/ai',
  SETTINGS_SECURITY:      '/settings/security',
  SETTINGS_INTEGRATIONS:  '/settings/integrations',


  // ── Reports ───────────────────────────────────────────────
  REPORTS: '/reports',

  // ── PWA Deployment Centre ─────────────────────────────────
  PWA_DEPLOYMENT: '/pwa-deployment',

  // ── Fleet Controller PWA ──────────────────────────────────
  FLEET_CONTROLLER: '/fleet-controller-pwa',

  // ── API / Backend Settings (reserved — Run 3/4) ───────────
  API_SETTINGS:     '/api-settings',
  BACKEND_SETTINGS: '/backend-settings',

  // ── Driver PWA alias (routes/driver-app already registered) 
  DRIVER_PWA: '/driver-app',
  // ── Auth ──────────────────────────────────────────────────
  AUTH_LOGIN:   '/auth/login',
  AUTH_LOGOUT:  '/auth/logout',
  AUTH_DRIVER:  '/auth/driver',

  // ── Error ─────────────────────────────────────────────────
  NOT_FOUND: '*'
}

// ─── Nav structure for sidebar ────────────────────────────────
export const NAV_ITEMS = [
  {
    id:    'dashboard',
    label: 'Dashboard',
    route: ROUTES.DASHBOARD,
    icon:  'LayoutDashboard',
    group: 'core'
  },
  {
    id:    'fleet',
    label: 'Fleet Control',
    route: ROUTES.FLEET,
    icon:  'Truck',
    group: 'operations',
  },
  {
    id:    'drivers',
    label: 'Drivers',
    route: ROUTES.DRIVERS,
    icon:  'Users',
    group: 'operations'
  },
  {
    id:    'vehicles',
    label: 'Vehicles',
    route: ROUTES.VEHICLES,
    icon:  'Car',
    group: 'operations'
  },
  {
    id:    'dispatch',
    label: 'Dispatch',
    route: ROUTES.DISPATCH,
    icon:  'Radio',
    group: 'operations'
  },
  {
    id:        'driver-setup',
    label:     'Set Driver Up With App',
    route:     ROUTES.DRIVER_SETUP,
    icon:      'Smartphone',
    group:     'operations',
    highlight: true,
  },
  {
    id:    'navigation',
    label: 'Live Map',
    route: ROUTES.NAVIGATION,
    icon:  'Map',
    group: 'navigation'
  },
  // AP3X is a standalone driver-facing app — not a fleet ops nav item
  // Accessed at /#/driver-app or /#/ap3x (public, no auth required)
  {
    id:        'ai',
    label:     'AI Command',
    route:     ROUTES.AI,
    icon:      'Brain',
    group:     'intelligence',
    highlight: true   // glows in sidebar
  },
  {
    id:    'safety',
    label: 'Safety AI',
    route: ROUTES.SAFETY,
    icon:  'ShieldCheck',
    group: 'intelligence'
  },
  {
    id:    'compliance',
    label: 'Compliance',
    route: ROUTES.COMPLIANCE,
    icon:  'ClipboardCheck',
    group: 'intelligence'
  },
  {
    id:    'analytics',
    label: 'Analytics',
    route: ROUTES.ANALYTICS,
    icon:  'BarChart3',
    group: 'intelligence'
  },
  {
    id:    'incidents',
    label: 'Incidents',
    route: ROUTES.INCIDENTS,
    icon:  'AlertTriangle',
    group: 'reporting'
  },
  {
    id:    'messaging',
    label: 'Messaging',
    route: ROUTES.MESSAGING,
    icon:  'MessageSquare',
    group: 'reporting'
  },
  {
    id:    'reports',
    label: 'Reports',
    route: ROUTES.REPORTS,
    icon:  'FileText',
    group: 'reporting'
  },
  {
    id:    'pwa-deployment',
    label: 'PWA Deployment',
    route: ROUTES.PWA_DEPLOYMENT,
    icon:  'Download',
    group: 'system'
  },
  {
    id:    'fleet-controller-pwa',
    label: 'Fleet Controller PWA',
    route: ROUTES.FLEET_CONTROLLER,
    icon:  'Tablet',
    group: 'pwa'
  },
  {
    id:    'settings',
    label: 'Settings',
    route: ROUTES.SETTINGS,
    icon:  'Settings',
    group: 'system'
  }
]

export const NAV_GROUPS = {
  core:         { label: null,            order: 0 },
  operations:   { label: 'Operations',    order: 1 },
  navigation:   { label: 'Navigation',    order: 2 },
  intelligence: { label: 'Intelligence',  order: 3 },
  reporting:    { label: 'Reporting',     order: 4 },
  system:       { label: 'System',        order: 5 },
  pwa:          { label: 'PWA Apps',       order: 6 }
}

export default ROUTES
