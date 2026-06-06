/**
 * ============================================================
 * APEX AI — Root App Component (Run 16 — System status wired)
 * /src/app/App.jsx
 * ============================================================
 */

import { RouterProvider, useLocation } from 'react-router-dom'
import { router }         from './app_Router'
import AuthProvider       from './providers_AuthProvider'
import { useSystemStatus } from './hooks_useSystemStatus'
import { useEffect }      from 'react'
import { mountDashboardBridge } from './services_apex_apexBridge'

// ── Global scroll-to-top on every route change ────────────────
// Restores window + any main scroll container to the top
// whenever the URL pathname changes. Does not break intentional
// anchor-link scrolling because that runs after this fires.
function ScrollRestoration() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Scroll the window
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    // Also scroll the main content area in the AppShell (#main-content)
    try {
      const el = document.getElementById('main-content')
      if (el) el.scrollTop = 0
    } catch {}
  }, [pathname])
  return null
}

// Inner wrapper — hooks must be inside a component tree
function AppCore() {
  useSystemStatus()

  // ── Apex Command Center Bridge (additive — never breaks existing logic) ──
  useEffect(() => {
    const cleanup = mountDashboardBridge()
    return cleanup
  }, [])

  return (
    <RouterProvider
      router={router}
      future={{ v7_startTransition: true }}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppCore />
    </AuthProvider>
  )
}
