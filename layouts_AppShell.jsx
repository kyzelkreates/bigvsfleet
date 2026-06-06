/**
 * ============================================================
 * APEX AI — Application Shell
 * Burger menu mode: sidebar is a slide-over drawer on all sizes.
 * Overlay dims the page when drawer is open.
 * ============================================================
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import Sidebar from './layouts_Sidebar'
import TopNav  from './layouts_TopNav'
import { useAppStore } from './core_storage'
import { BackendWarningBanner } from './components_ui_ConnectionStatus'

export default function AppShell() {
  const sidebarExpanded = useAppStore(s => s.sidebarExpanded)
  const closeSidebar    = useAppStore(s => s.closeSidebar  || (() => s.sidebarExpanded && s.toggleSidebar?.()))
  const location        = useLocation()

  // Close drawer + scroll main content to top on route change
  const mainRef = useRef(null)
  useEffect(() => {
    useAppStore.getState().closeSidebar?.()
    // Scroll the main content area to the top
    try {
      if (mainRef.current) mainRef.current.scrollTop = 0
    } catch {}
  }, [location.pathname])

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#050810]">

      {/* Drawer overlay */}
      {sidebarExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => useAppStore.getState().closeSidebar?.()}
        />
      )}

      {/* Sidebar drawer */}
      <Sidebar />

      {/* Main content — always full width */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav />
        <BackendWarningBanner />
        <main id="main-content" ref={mainRef} className="flex-1 overflow-auto scrollbar-none" data-scroll-reset>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
