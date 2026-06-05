
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
  '/app/dashboard':           ROLES.FLEET_ADMIN,
  '/app/fleet':               ROLES.FLEET_ADMIN,
  '/app/drivers':             ROLES.FLEET_ADMIN,
  '/app/vehicles':            ROLES.FLEET_ADMIN,
  '/app/dispatch':            ROLES.FLEET_ADMIN,
  '/app/navigation':          ROLES.FLEET_ADMIN,
  '/app/ai':                  ROLES.FLEET_ADMIN,
  '/app/safety':              ROLES.FLEET_ADMIN,
  '/app/compliance':          ROLES.FLEET_ADMIN,
  '/app/analytics':           ROLES.FLEET_ADMIN,
  '/app/incidents':           ROLES.FLEET_ADMIN,
  '/app/messaging':           ROLES.FLEET_ADMIN,
  '/app/reports':             ROLES.FLEET_ADMIN,
  '/app/pwa-deployment':      ROLES.FLEET_ADMIN,
  '/app/api-settings':        ROLES.FLEET_ADMIN,
  '/app/backend-settings':    ROLES.FLEET_ADMIN,
  '/app/settings':            ROLES.FLEET_ADMIN,
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
  DASHBOARD:  '/app/dashboard',

  // ── Fleet ─────────────────────────────────────────────────
  FLEET:          '/app/fleet',
  FLEET_VEHICLE:  '/app/fleet/:vehicleId',

  // ── Drivers ───────────────────────────────────────────────
  DRIVERS:         '/app/drivers',
  DRIVER_PROFILE:  '/app/drivers/:driverId',

  // ── Vehicles ──────────────────────────────────────────────
  VEHICLES:        '/app/vehicles',
  VEHICLE_DETAIL:  '/app/vehicles/:vehicleId',

  // ── Dispatch ──────────────────────────────────────────────
  DISPATCH: '/app/dispatch',

  // ── Driver Setup ──────────────────────────────────────────
  DRIVER_SETUP: '/app/driver-setup',

  // ── Navigation / AP3X ─────────────────────────────────────
  NAVIGATION: '/app/navigation',
  AP3X:       '/ap3x',

  // ── AI Intelligence ───────────────────────────────────────
  AI: '/app/ai',    // Run 15

  // ── Compliance ────────────────────────────────────────────
  COMPLIANCE: '/app/compliance',

  // ── Safety AI ─────────────────────────────────────────────
  SAFETY: '/app/safety',

  // ── Analytics ─────────────────────────────────────────────
  ANALYTICS: '/app/analytics',

  // ── Incidents ─────────────────────────────────────────────
  INCIDENTS:        '/app/incidents',
  INCIDENT_DETAIL:  '/app/incidents/:incidentId',

  // ── Messaging ─────────────────────────────────────────────
  MESSAGING: '/app/messaging',

  // ── Settings ──────────────────────────────────────────────
  SETTINGS:               '/app/settings',
  SETTINGS_PROFILE:       '/app/settings/profile',
  SETTINGS_FLEET:         '/app/settings/fleet',
  SETTINGS_AI:            '/app/settings/ai',
  SETTINGS_SECURITY:      '/app/settings/security',
  SETTINGS_INTEGRATIONS:  '/app/settings/integrations',


  // ── Reports ───────────────────────────────────────────────
  REPORTS: '/app/reports',

  // ── PWA Deployment Centre ─────────────────────────────────
  PWA_DEPLOYMENT: '/app/pwa-deployment',

  // ── Fleet Controller PWA ──────────────────────────────────
  FLEET_CONTROLLER: '/fleet-controller-pwa',

  // ── API / Backend Settings (reserved — Run 3/4) ───────────
  API_SETTINGS:     '/app/api-settings',
  BACKEND_SETTINGS: '/app/backend-settings',

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
