/**
 * ============================================================
 * Big V's Best Routes™ — ScrollToTop
 * Restores scroll position to top on every route change.
 * Uses useLocation hook — must live inside RouterProvider.
 * ============================================================
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // 1. Scroll the browser window
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    try { window.scroll(0, 0) } catch {}

    // 2. Scroll the AppShell main content area (has id="main-content")
    try {
      const main = document.getElementById('main-content')
      if (main) main.scrollTop = 0
    } catch {}

    // 3. Scroll any overflow-auto containers at root level
    try {
      document.querySelectorAll('[data-scroll-reset]').forEach(el => {
        el.scrollTop = 0
      })
    } catch {}
  }, [pathname])

  return null
}
