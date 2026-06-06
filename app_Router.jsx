/**
 * ============================================================
 * Big V's Best Routes™ — Application Router
 * /src/app/Router.jsx
 *
 * RUN 1 — Identity Refactor (preserved)
 * RUN 2 — Dashboard Shell + Role Routing + Responsive Wrap
 *
 * Routing strategy: Hash routing (preserved from original)
 * Role separation:
 *   Fleet Dashboard  → fleet_admin / fleet_manager / dispatcher
 *   Driver PWA       → driver (standalone, no auth guard)
 *   Fleet Controller → fleet_controller (standalone, no admin controls)
 * ============================================================
 */

import { createHashRouter, Navigate, Outlet } from 'react-router-dom'
import ScrollToTop from './components_ScrollToTop'

// Root layout — applies ScrollToTop globally across all routes
function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  )
}

import AppShell      from './layouts_AppShell'
import AuthGuard     from './components_auth_AuthGuard'

// ── Auth Pages ────────────────────────────────────────────────
import Login         from './pages_auth_Login'
import DriverLogin   from './pages_auth_DriverLogin'
import ResetConfirm  from './pages_auth_ResetConfirm'
import Setup         from './pages_auth_Setup'

// ── Standalone PWA Routes (no auth guard — role-separated) ────
import DriverImport         from './pages_DriverImport'
import DriverSetup          from './pages_DriverSetup'
import DriverApp            from './pages_DriverApp'          // Driver PWA
import AP3X                 from './pages_AP3X'               // AP3X Driver Platform
import FleetControllerPwa   from './pages_FleetControllerPwa' // RUN 2 — Fleet Controller PWA

// ── Fleet Dashboard Pages (admin-guarded) ────────────────────
import Dashboard     from './pages_Dashboard'
import Fleet         from './pages_Fleet'
import Drivers       from './pages_Drivers'
import Vehicles      from './pages_Vehicles'
import Dispatch      from './pages_Dispatch'
import Navigation    from './pages_Navigation'
import Compliance    from './pages_Compliance'
import Safety        from './pages_Safety'
import Analytics     from './pages_Analytics'
import Incidents     from './pages_Incidents'
import Messaging     from './pages_Messaging'
import Settings      from './pages_Settings'
import AIPage        from './pages_AI'
import NotFound      from './pages_NotFound'

// ── RUN 2 New Routes (admin-guarded) ─────────────────────────
import Reports          from './pages_Reports'           // RUN 2
import PwaDeployment    from './pages_PwaDeployment'     // RUN 2
import ApiSettings      from './pages_ApiSettings'       // RUN 2
import BackendSettings  from './pages_BackendSettings'   // RUN 2
import Landing        from './pages_Landing'              // LANDING PAGE RUN
import About         from './pages_About'               // About Kyzel Kreates™
import InvestorSafetyCase from './pages_InvestorSafetyCase' // Investor & Safety Case

// ─── Helpers ──────────────────────────────────────────────────

// Root redirect: first-run → setup, authenticated → dashboard
// Root redirect:
//  - First-ever visit (no setup) → /auth/setup
//  - Has setup, but hasn't seen landing → /landing (investor/demo entry)
//  - Has setup + seen landing → /dashboard
// Demo-safe: treat as already set up unless explicitly in first-run setup flow
// New visitors on Vercel won't have 'apex:setup_complete' so default to true (demo build)
const setupDoneFlag  = () => {
  const val = localStorage.getItem('apex:setup_complete')
  return val === null ? true : val === 'true'  // null = first deploy = treat as done
}
const seenLandingFlag = () => localStorage.getItem('bigv:landing:seen') === 'true'

const RootRedirect = () => {
  if (!setupDoneFlag()) return <Navigate to="/auth/setup" replace />
  if (!seenLandingFlag()) return <Navigate to="/landing" replace />
  return <Navigate to="/dashboard" replace />
}

// Login gate: if setup not done, redirect to setup
const LoginOrSetup = ({ element }) =>
  !setupDoneFlag() ? <Navigate to="/auth/setup" replace /> : element

// ─── Router ───────────────────────────────────────────────────
export const router = createHashRouter([
  {
    // Root layout — ScrollToTop fires on every route change
    path: '/',
    element: <RootLayout />,
    children: [

  // ── HOME: Landing page (always public — the home page) ──────
  { path: '',                       element: <Landing /> },
  // Legacy /landing alias → redirect to /
  { path: '/landing',               element: <Navigate to="/" replace /> },

  // ── About page (public) ───────────────────────────────────
  { path: '/about',                 element: <About /> },

  // ── Investor & Safety Case (public — dedicated page) ────────────
  { path: '/investor-safety-case',  element: <InvestorSafetyCase /> },
  { path: '/investor',              element: <Navigate to="/investor-safety-case" replace /> },

  // ── First-run Setup (public) ──────────────────────────────
  { path: '/auth/setup',            element: <Setup /> },

  // ── Auth Routes (public) ──────────────────────────────────
  { path: '/auth/login',            element: <LoginOrSetup element={<Login />} /> },
  { path: '/auth/driver',           element: <LoginOrSetup element={<DriverLogin />} /> },
  { path: '/auth/reset-confirm',    element: <ResetConfirm /> },

  // ── Standalone Driver Routes (public — no admin controls) ──
  { path: '/driver-import',         element: <DriverImport /> },
  { path: '/driver-app',            element: <DriverApp /> },
  { path: '/ap3x',                  element: <AP3X /> },

  // ── Fleet Controller PWA (standalone) ─────────────────────
  { path: '/fleet-controller-pwa',  element: <FleetControllerPwa /> },

  // ── Protected Fleet Dashboard Shell (at /app/*) ───────────
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },

      // ── Core ──────────────────────────────────────────────
      { path: 'dashboard',              element: <Dashboard /> },

      // ── Operations ────────────────────────────────────────
      { path: 'fleet',                  element: <Fleet /> },
      { path: 'fleet/:vehicleId',       element: <Fleet /> },
      { path: 'drivers',                element: <Drivers /> },
      { path: 'drivers/:driverId',      element: <Drivers /> },
      { path: 'vehicles',               element: <Vehicles /> },
      { path: 'vehicles/:vehicleId',    element: <Vehicles /> },
      { path: 'dispatch',               element: <Dispatch /> },
      { path: 'driver-setup',           element: <DriverSetup /> },

      // ── Navigation / Map ──────────────────────────────────
      { path: 'navigation',             element: <Navigation /> },
      { path: 'routes',                 element: <Navigation /> },
      { path: 'map',                    element: <Navigation /> },

      // ── Intelligence ──────────────────────────────────────
      { path: 'ai',                     element: <AIPage /> },
      { path: 'safety',                 element: <Safety /> },
      { path: 'compliance',             element: <Compliance /> },
      { path: 'analytics',              element: <Analytics /> },

      // ── Reporting ─────────────────────────────────────────
      { path: 'incidents',              element: <Incidents /> },
      { path: 'incidents/:incidentId',  element: <Incidents /> },
      { path: 'messaging',              element: <Messaging /> },
      { path: 'reports',                element: <Reports /> },

      // ── System ────────────────────────────────────────────
      { path: 'settings',               element: <Settings /> },
      { path: 'settings/:section',      element: <Settings /> },
      { path: 'pwa-deployment',         element: <PwaDeployment /> },
      { path: 'api-settings',           element: <ApiSettings /> },
      { path: 'backend-settings',       element: <BackendSettings /> },
    ]
  },

  // ── Legacy /dashboard → /app/dashboard ────────────────────
  { path: '/dashboard',             element: <Navigate to="/app/dashboard" replace /> },
  { path: '/fleet',                 element: <Navigate to="/app/fleet" replace /> },
  { path: '/drivers',               element: <Navigate to="/app/drivers" replace /> },
  { path: '/vehicles',              element: <Navigate to="/app/vehicles" replace /> },
  { path: '/dispatch',              element: <Navigate to="/app/dispatch" replace /> },
  { path: '/navigation',            element: <Navigate to="/app/navigation" replace /> },
  { path: '/routes',                element: <Navigate to="/app/routes" replace /> },
  { path: '/safety',                element: <Navigate to="/app/safety" replace /> },
  { path: '/compliance',            element: <Navigate to="/app/compliance" replace /> },
  { path: '/analytics',             element: <Navigate to="/app/analytics" replace /> },
  { path: '/incidents',             element: <Navigate to="/app/incidents" replace /> },
  { path: '/messaging',             element: <Navigate to="/app/messaging" replace /> },
  { path: '/reports',               element: <Navigate to="/app/reports" replace /> },
  { path: '/settings',              element: <Navigate to="/app/settings" replace /> },
  { path: '/pwa-deployment',        element: <Navigate to="/app/pwa-deployment" replace /> },
  { path: '/api-settings',          element: <Navigate to="/app/api-settings" replace /> },
  { path: '/backend-settings',      element: <Navigate to="/app/backend-settings" replace /> },
  { path: '/ai',                    element: <Navigate to="/app/ai" replace /> },

  // ── 404 ───────────────────────────────────────────────────
  { path: '*', element: <NotFound /> },

    ] // end children of RootLayout
  }  // end RootLayout route
])

export default router
