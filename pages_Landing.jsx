/**
 * ============================================================
 * Big V's Best Routes™ Fleet — Investor / Demo Landing Page
 * /src/pages/Landing.jsx
 *
 * LANDING PAGE RUN — Premium investor-ready entry point.
 *
 * RULES:
 *   - NO auth required (public route, outside AuthGuard)
 *   - NO backend secrets
 *   - NO legal guarantee wording
 *   - Links to existing routes only — no duplicate systems
 *   - Reads demo/live mode from existing SSOT (read-only)
 *   - PWA install uses beforeinstallprompt where available
 *   - Full mobile/tablet/desktop responsive
 *
 * ADVISORY:
 *   Advisory platform only. Does not guarantee legal compliance.
 *   Does not replace professional judgement or driver responsibility.
 *
 * Created by Kyzel Kreates™ | Powered by 4P3X Intelligent AI™
 * ============================================================
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Inline SVG icon helper (no import needed) ─────────────────
const icons = {
  Shield:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Map:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
  Smartphone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  Truck:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Brain:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.77-3.04A3 3 0 0 1 4.5 11a3 3 0 0 1 .27-1.27 2.5 2.5 0 0 1 1.23-4.7z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.77-3.04A3 3 0 0 0 19.5 11a3 3 0 0 0-.27-1.27 2.5 2.5 0 0 0-1.23-4.7z"/></svg>,
  ArrowRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Download:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  LayoutDash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  Check:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Zap:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Globe:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Server:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Users:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Route:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  AlertTri:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ChevronDown:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Layers:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Activity:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Lock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  ShieldCheck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  ShieldAlert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  AlertCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Lightbulb:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
  Navigation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  DollarSign: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Star:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  TrendingUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  X:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

function Ico({ name, size = 20, className = '' }) {
  const svg = icons[name]
  if (!svg) return null
  return (
    <span className={`inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {svg}
    </span>
  )
}

// ── PWA install hook ──────────────────────────────────────────
function usePWAInstall() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setInstalled(true); setPrompt(null) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const trigger = async () => {
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
    return outcome === 'accepted'
  }

  return { prompt, installed, trigger }
}

// ── Install fallback modal ────────────────────────────────────
function InstallModal({ onClose, title }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0d1426] border border-amber-500/20 rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Ico name="Download" size={16} className="text-amber-400" />
          </div>
          <h3 className="font-display font-bold text-white text-sm">{title}</h3>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/40">
            <p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5"><Ico name="Smartphone" size={12} />Android / Chrome</p>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>Tap the browser menu (⋮)</li>
              <li>Tap <strong className="text-white">Add to Home Screen</strong> or <strong className="text-white">Install app</strong></li>
              <li>Confirm install</li>
            </ol>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/40">
            <p className="text-xs font-semibold text-blue-400 mb-1.5 flex items-center gap-1.5"><Ico name="Smartphone" size={12} />iPhone / Safari</p>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>Open this link in <strong className="text-white">Safari</strong></li>
              <li>Tap the Share button <strong className="text-white">⎙</strong></li>
              <li>Tap <strong className="text-white">Add to Home Screen</strong></li>
              <li>Confirm</li>
            </ol>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/40">
            <p className="text-xs font-semibold text-violet-400 mb-1.5 flex items-center gap-1.5"><Ico name="Globe" size={12} />Desktop Chrome / Edge</p>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
              <li>Click the install icon in the address bar</li>
              <li>Or use the browser menu → <strong className="text-white">Install app</strong></li>
              <li>Confirm</li>
            </ol>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2.5 text-xs text-slate-400 border border-slate-700/40 rounded-xl hover:bg-slate-800/40 transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div className="flex flex-col items-center px-4 py-3">
      <span className="font-display text-2xl font-bold text-amber-400">{value}</span>
      <span className="text-xs text-slate-500 mt-0.5 text-center">{label}</span>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────
function SectionHeading({ label, title, accent = 'amber' }) {
  const colors = { amber: 'text-amber-400', violet: 'text-violet-400', emerald: 'text-emerald-400', cyan: 'text-cyan-400' }
  return (
    <div className="text-center mb-10">
      <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${colors[accent]}`}>{label}</span>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">{title}</h2>
    </div>
  )
}

// ── Feature card ─────────────────────────────────────────────
function FeatureCard({ icon, title, items, accent = 'cyan', badge }) {
  const borders = { cyan: 'border-cyan-500/15 hover:border-cyan-500/30', amber: 'border-amber-500/15 hover:border-amber-500/30', violet: 'border-violet-500/15 hover:border-violet-500/30', emerald: 'border-emerald-500/15 hover:border-emerald-500/30' }
  const iconBg  = { cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400', emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' }
  return (
    <div className={`relative p-5 rounded-2xl bg-[#0a1020]/80 border ${borders[accent]} transition-colors duration-300 backdrop-blur-sm`}>
      {badge && <span className={`absolute top-3 right-3 px-2 py-0.5 text-2xs font-bold rounded-full ${iconBg[accent]}`}>{badge}</span>}
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${iconBg[accent]}`}>
        <Ico name={icon} size={18} />
      </div>
      <h3 className="font-display font-bold text-white text-sm mb-3">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
            <span className={`mt-0.5 flex-shrink-0 ${iconBg[accent].split(' ')[2]}`}><Ico name="Check" size={10} /></span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── AI Agent card ─────────────────────────────────────────────
function AICard({ number, title, purpose, items, color }) {
  const styles = {
    violet: { border: 'border-violet-500/20 hover:border-violet-500/35', dot: 'bg-violet-500', num: 'bg-violet-500/10 text-violet-400 border-violet-500/20', bullet: 'text-violet-400' },
    emerald:{ border: 'border-emerald-500/20 hover:border-emerald-500/35', dot: 'bg-emerald-500', num: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', bullet: 'text-emerald-400' },
  }
  const s = styles[color]
  return (
    <div className={`p-6 rounded-2xl bg-[#0a1020]/80 border ${s.border} transition-colors duration-300 backdrop-blur-sm`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center ${s.num}`}>{number}</span>
        <h3 className="font-display font-bold text-white">{title}</h3>
        <span className={`ml-auto inline-block w-2 h-2 rounded-full ${s.dot} shadow-[0_0_8px_currentColor]`} />
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{purpose}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`flex items-start gap-2 text-xs text-slate-400 leading-relaxed`}>
            <Ico name="Check" size={10} className={`mt-0.5 flex-shrink-0 ${s.bullet}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Use-case chip ─────────────────────────────────────────────
function UseChip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-300 bg-slate-900/60 border border-slate-800/50 hover:border-amber-500/30 hover:text-amber-300 transition-colors cursor-default">
      <Ico name="Check" size={9} className="text-amber-400 flex-shrink-0" />
      {label}
    </span>
  )
}

// ── Potential card ────────────────────────────────────────────
function PotentialCard({ title }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 hover:border-violet-500/20 transition-colors">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
      <span className="text-xs text-slate-300">{title}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ════════════════════════════════════════════════════════════════

export default function Landing() {
  const navigate      = useNavigate()
  const [demoMode, setDemoMode] = useState(true)
  const heroRef = useRef(null)

  // ── Landing-page body class + scroll to top on mount ────────
  // Adds page-landing to <body> so CSS can override overflow for scrollable landing
  // Removes it when navigating away so dashboard stays overflow:hidden
  useEffect(() => {
    document.body.classList.add('page-landing')
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    try { window.scroll(0, 0) } catch {}
    return () => {
      document.body.classList.remove('page-landing')
    }
  }, [])

  // ── Sync demo/live mode from SSOT ──────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bigv:mode:demoLive')
      if (raw) setDemoMode(JSON.parse(raw)?.demoLiveMode?.mode !== 'live')
    } catch {}
  }, [])

  // ── Button handlers ─────────────────────────────────────────
  const markSeenAndGo = (path) => {
    try { localStorage.setItem('bigv:landing:seen', 'true') } catch {}
    // Scroll to top before navigating so destination page starts at top
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    navigate(path)
  }

  const openDashboard      = () => markSeenAndGo('/app/dashboard')
  const openDriverPwa      = () => markSeenAndGo('/driver-app')
  const openControllerPwa  = () => markSeenAndGo('/fleet-controller-pwa')

  return (
    <div className="min-h-[100dvh] bg-[#050810] text-white overflow-x-hidden">

      {/* ── Background grid overlay ──────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(251,191,36,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Sticky top bar ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#050810]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-amber-400 text-xs">BV</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-white text-sm">Big V's Best Routes™</span>
              <span className="text-slate-600 text-xs ml-2">Fleet</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {demoMode && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/8 border border-amber-500/20 text-2xs text-amber-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Demo Mode
              </span>
            )}
            <button
              onClick={openDashboard}
              data-testid="nav-btn-dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/18 transition-colors">
              <Ico name="LayoutDash" size={12} />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">⚡</span>
            </button>
            <button
              onClick={openDriverPwa}
              data-testid="nav-btn-driver"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/15 transition-colors">
              <Ico name="Smartphone" size={12} />
              <span className="hidden sm:inline">Driver</span>
              <span className="sm:hidden">🚗</span>
            </button>
            <button
              onClick={openControllerPwa}
              data-testid="nav-btn-controller"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/8 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/15 transition-colors">
              <Ico name="Activity" size={12} />
              <span className="hidden sm:inline">Controller</span>
              <span className="sm:hidden">📡</span>
            </button>
            <button
              onClick={() => markSeenAndGo('/about')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-semibold hover:bg-cyan-500/15 transition-colors">
              <Ico name="Users" size={12} />
              <span className="hidden sm:inline">About</span>
              <span className="sm:hidden">👤</span>
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/8 border border-violet-500/20 text-xs text-violet-300 font-semibold mb-6">
            <Ico name="Zap" size={11} className="text-violet-400" />
            Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            <span className="text-white">Big V's Best Routes</span>
            <span className="text-amber-400">™</span>
            <span className="block text-white mt-1">Fleet</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 font-medium mb-3">
            Safety &amp; Legal Compliance First Navigation Platform
          </p>

          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            A demo/live-ready fleet command dashboard and driver PWA system — designed to help operators plan safer routes, manage vehicle suitability, assign trips, monitor driver progress, capture evidence, and support safety &amp; legal awareness through advisory onboard 4P3X Intelligent AI™ agents.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
            <button
              onClick={openDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-all duration-200 shadow-[0_0_30px_rgba(251,191,36,0.25)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)]">
              <Ico name="LayoutDash" size={16} />
              Fleet Dashboard
            </button>

            <button
              onClick={openDriverPwa}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0d1426] hover:bg-[#111827] border border-emerald-500/35 hover:border-emerald-500/60 text-emerald-300 font-semibold rounded-xl text-sm transition-all duration-200">
              <Ico name="Map" size={15} />
              Driver PWA Demo
            </button>
          </div>

          {/* Advisory note under buttons */}
          <p className="text-2xs text-slate-700 mt-5 max-w-xl mx-auto leading-relaxed">
            Advisory platform only — does not guarantee legal compliance. Drivers, fleet managers, and controllers remain responsible for all safety, legal, and operational decisions.
          </p>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/50 border border-slate-800/40 rounded-2xl bg-[#0a1020]/50 backdrop-blur-sm overflow-hidden max-w-3xl mx-auto">
          <Stat value="16" label="Build Runs" />
          <Stat value="4P3X™" label="Intelligent AI" />
          <Stat value="3" label="Installable Apps" />
          <Stat value="Demo → Live" label="Ready Architecture" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SYSTEM STRUCTURE
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading label="Platform Architecture" title="The System Structure" accent="amber" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard accent="amber" icon="LayoutDash" badge="Dashboard" title="Fleet Command Dashboard"
              items={['Vehicle & driver management','Route planning & assignment','Trip status & GPS visibility','Safety warnings & compliance checks','PWA deployment & sync centre','Demo/live backend switching','Reports & evidence capture']} />
            <FeatureCard accent="emerald" icon="Smartphone" badge="Driver PWA" title="Driver PWA"
              items={['Installable on driver device','Assigned route display','GPS & trip status updates','Safety prompts & checklists','Driver acknowledgements','Incident notes & trip reports','Offline-safe submission']} />
            <FeatureCard accent="violet" icon="Activity" badge="Controller PWA" title="Fleet Controller PWA"
              items={['Mobile fleet supervision','Quick route status checks','Driver visibility & check-ins','Safety & sync status updates','Route review & flags','Controller notes & actions','Mobile operational access']} />
            <FeatureCard accent="cyan" icon="Map" badge="Map Engine" title="Map & Routing Engine"
              items={['OSM public tiles — 2D map foundation','MapLibre 3D/tilt rendering where supported','GraphHopper route optimisation — configurable','Advanced Overpass restriction scanning','Route polyline & marker rendering','Demo route fallback — no API key required','Google Maps optional — future only']} />
            <FeatureCard accent="amber" icon="Server" badge="Backend Layer" title="Demo / Live Backend"
              items={['Demo Mode — no backend required','Live Mode — connects real backend','Supabase, Firebase, AWS/custom, REST','RLS-enabled Supabase schema included','Driver & controller live sync','Real user auth when live mode active','One-button sync in demo mode']} />
            <FeatureCard accent="violet" icon="Brain" badge="4P3X AI™" title="4P3X Intelligent AI™ Oversight"
              items={['Route Safety AI — advisory risk review','Legal Compliance AI — gap awareness','Confidence-scored advisory outputs','Explainable — not black-box','Never replaces human responsibility','Supports better decisions; not final authority','Advisory only — human verification required']} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          4P3X AI OVERSIGHT
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading label="Safety-First AI" title="4P3X Intelligent AI™ Oversight Agents" accent="violet" />

          {/* Mandatory advisory banner */}
          <div className="max-w-3xl mx-auto mb-10 flex items-start gap-3 px-4 py-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <Ico name="AlertTri" size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300 mb-1">Advisory Support Layer Only</p>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                These AI agents are advisory support layers. They help highlight risk, missing information, route confidence issues, legal-critical gaps, data freshness issues, and evidence completeness. They do not replace human responsibility, official legal checks, professional judgement, transport management duties, legal advice, or safe driving decisions. They do not guarantee legal compliance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <AICard number="01" color="emerald" title="Route Safety AI"
              purpose="Reviews route suitability, vehicle profile compatibility, route risk flags, GPS confidence, restricted area awareness, map data freshness, and active trip status."
              items={['Route geometry & restriction scan','Vehicle height/weight suitability awareness','GPS confidence monitoring','Driver checklist & trip status','Overpass restriction concern detection','Map provider confidence scoring','Advisory route risk level output']} />
            <AICard number="02" color="violet" title="Legal & Compliance AI"
              purpose="Reviews vehicle legal/physical fields, missing legal-critical data, route evidence completeness, controller acknowledgement status, data freshness, and documentation gaps."
              items={['Vehicle legal document expiry checks','Missing HGV/compliance field detection','Driving hours & tachograph awareness','Route evidence & report completeness','Controller review status monitoring','Data freshness & OSM reliability flags','Advisory compliance gap output']} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          DEMO → LIVE
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Architecture</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
              Demo Mode shows the product.<br className="hidden sm:block" />
              <span className="text-amber-400"> Live Mode runs the product.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#0a1020]/80 border border-slate-800/40">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">Demo Mode</span>
                <span className="text-xs text-slate-600">No backend required</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                {['Labelled demo data throughout','Local/offline-safe state management','One-button local sync','No API keys needed','Product logic fully demonstrable','All routes & features accessible','Investor/stakeholder ready'].map((t,i) => (
                  <li key={i} className="flex items-start gap-2"><Ico name="Check" size={10} className="text-amber-400 flex-shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-[#0a1020]/80 border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">Live Mode</span>
                <span className="text-xs text-slate-600">Backend connected</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                {['Real user authentication','Persistent database records','Live driver ↔ dashboard sync','Real vehicles & route assignments','Supabase / Firebase / AWS / REST','RLS-secured backend schema','Production operational dashboard'].map((t,i) => (
                  <li key={i} className="flex items-start gap-2"><Ico name="Check" size={10} className="text-emerald-400 flex-shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/30 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Switching from demo to live requires connecting a real backend (Supabase, Firebase, AWS/custom, REST/custom endpoint) through the existing <strong className="text-slate-300">Backend Settings</strong> and <strong className="text-slate-300">API Settings Centre</strong> in the Fleet Dashboard. Auth, RLS, and user provisioning are ready to activate.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          WHY IT MATTERS
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading label="The Problem" title="Why Fleet Routing Needs a Safety-First Platform" accent="emerald" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              ['Poor route planning can create real risk','Vehicle restrictions get missed without proper checks'],
              ['Drivers need clear, device-ready instructions','Manual disconnected workflows lose critical evidence'],
              ['Controllers need dashboard-to-device visibility','Missing legal/vehicle data creates avoidable gaps'],
              ['Route suitability matters beyond just distance','Data freshness affects reliability of AI guidance'],
              ['Evidence and reports must be built into workflow','Safety prompts should reach drivers — not stay on paper'],
              ['Advisory AI can support better decisions','When kept explainable, transparent, and human-led'],
            ].map(([line1, line2], i) => (
              <div key={i} className="p-4 rounded-xl bg-[#0a1020]/60 border border-slate-800/30">
                <p className="text-xs font-semibold text-white mb-1 leading-relaxed">{line1}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{line2}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          WHO IT SERVES
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading label="Who It Serves" title="Built for Any Fleet Operation" accent="cyan" />
          <div className="flex flex-wrap gap-2.5 justify-center max-w-3xl mx-auto">
            {['Fleet operators','Delivery & logistics businesses','Van operators','HGV operators','Recovery & roadside services','Council & community mobile teams','Utility & maintenance teams','Mobile care & support fleets','Construction & site vehicles','Courier teams','Specialist vehicle operators','Mobile workforce teams','Route safety-focused organisations','Organisations needing evidence capture','Transport compliance support','Multi-driver dispatch operations'].map((label, i) => (
              <UseChip key={i} label={label} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          INVESTOR / DEMO VALUE
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHeading label="Product Potential" title="What This Demonstrates" accent="violet" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#0a1020]/80 border border-violet-500/15">
              <h3 className="font-display font-bold text-white text-sm mb-4 flex items-center gap-2">
                <Ico name="Layers" size={16} className="text-violet-400" />
                Product Architecture
              </h3>
              <ul className="space-y-2">
                {['Real dashboard + installable PWA product structure','Fleet command dashboard logic','Driver PWA workflow','Fleet Controller PWA structure','Demo/live-ready architecture','Backend-ready growth path','Multi-market refactor potential'].map((t,i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <Ico name="Check" size={10} className="text-violet-400 flex-shrink-0 mt-0.5" />{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-[#0a1020]/80 border border-amber-500/15">
              <h3 className="font-display font-bold text-white text-sm mb-4 flex items-center gap-2">
                <Ico name="Brain" size={16} className="text-amber-400" />
                Engineering Capability
              </h3>
              <ul className="space-y-2">
                {['4P3X Intelligent AI™ product engineering','AI-assisted safety & compliance support','Route planning & vehicle suitability concepts','Dashboard-to-device sync architecture','Modular base → sector-specific products','One architecture → SaaS, B2B, white-label','Kyzel Kreates™ product engineering depth'].map((t,i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <Ico name="Check" size={10} className="text-amber-400 flex-shrink-0 mt-0.5" />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          WHAT THIS CAN BECOME
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading label="Future Potential" title="What This Can Become" accent="amber" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {['Full fleet route planning product','Driver compliance & route evidence system','Multi-driver dispatch platform','Vehicle-specific safe route planner','Safety reporting platform','Transport compliance support dashboard','White-label fleet product','Specialist vehicle routing system','Council / charity / community platform','Backend-connected SaaS product','Safety-first mobile workforce system','Multi-organisation fleet product'].map((t, i) => (
              <PotentialCard key={i} title={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
            Explore the Platform
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Open the Fleet Dashboard, install the Driver PWA, or install the Controller PWA to explore the full demo architecture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
            <button
              onClick={openDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-all duration-200 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <Ico name="LayoutDash" size={16} />
              View Fleet Dashboard
            </button>
            <button
              onClick={openDriverPwa}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 rounded-xl text-sm font-semibold transition-colors bg-[#0d1426]">
              <Ico name="Smartphone" size={15} />
              Open Driver PWA
            </button>
            <button
              onClick={openControllerPwa}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 border border-violet-500/30 hover:border-violet-500/50 text-violet-300 rounded-xl text-sm font-semibold transition-colors bg-[#0d1426]">
              <Ico name="Activity" size={15} />
              Open Controller PWA
            </button>
          </div>

          {/* ── Shortcuts row ── */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => markSeenAndGo('/about')}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/6 border border-cyan-500/18 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/12 transition-colors">
              <Ico name="Users" size={13} />
              About Kyzel Kreates™
            </button>
            <button
              onClick={openDriverPwa}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/6 border border-blue-500/18 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/12 transition-colors">
              <Ico name="Map" size={13} />
              3-Route Driver Demo
            </button>
            <button
              onClick={openDashboard}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/6 border border-amber-500/18 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-500/12 transition-colors">
              <Ico name="LayoutDash" size={13} />
              Fleet Dashboard
            </button>
          </div>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════════
          SECTION: THE CORE CONCEPT
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-b from-[#050810] to-[#03060e]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="Lightbulb" size={11} />
              The Concept
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Navigation Built Around Vehicle Reality
            </h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto leading-relaxed">
              A route should not just be based on the shortest or fastest path. For fleet and specialist vehicle use,
              a route should also consider the vehicle, the driver, the job, the restrictions, the evidence,
              and the safety and legal context around the journey.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {[
              { icon: 'Map', color: 'amber', title: 'Beyond A to B', body: 'Most navigation tools are designed to get a user from A to B. Big V\'s Best Routes™ Fleet is designed to support safer, more accountable fleet movement.' },
              { icon: 'Layers', color: 'cyan', title: 'Structured Workflow', body: 'Combining route planning, vehicle profiles, driver PWA workflows, dashboard oversight, advisory AI checks, trip evidence, and backend-ready architecture.' },
              { icon: 'ShieldCheck', color: 'emerald', title: 'From Map to Decision', body: 'This turns routing from a basic map instruction into a structured safety, compliance-awareness, and operational visibility workflow.' },
            ].map(c => (
              <div key={c.title} className={`p-6 rounded-2xl border border-${c.color}-500/15 bg-${c.color}-500/4`}>
                <div className={`w-10 h-10 rounded-xl bg-${c.color}-500/10 border border-${c.color}-500/20 flex items-center justify-center mb-4`}>
                  <Ico name={c.icon} size={18} className={`text-${c.color}-400`} />
                </div>
                <h3 className="font-display font-semibold text-white text-base mb-2">{c.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl border border-slate-700/30 bg-slate-800/20">
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              <strong className="text-amber-400">Big V's Best Routes™ Fleet</strong> is not positioned as another consumer sat nav.
              It is positioned as a safety-first fleet routing and operational visibility platform. The value is not only in plotting a route —
              the value is in checking the context around the route, guiding the driver workflow, keeping the controller informed,
              recording evidence, and helping teams make better human-reviewed decisions.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION: WHY STANDARD NAV IS NOT ENOUGH
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#03060e]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="AlertCircle" size={11} />
              The Gap
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Standard Navigation Is Not Enough<br className="hidden sm:block" /> For Fleet Safety
            </h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto leading-relaxed">
              Many mainstream satellite navigation and map platforms are excellent for everyday point-to-point navigation,
              but they are not usually designed as complete fleet safety and legal-compliance support systems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {[
              'Limited vehicle-specific suitability checks',
              'Missing legal-critical vehicle detail prompts',
              'No structured evidence trail for route decisions',
              'No built-in dashboard-to-driver accountability workflow',
              'No advisory AI layer reviewing route risk and missing information',
              'No unified system combining route assignment, PWA navigation, driver acknowledgement, safety prompts, incident notes, and backend sync',
              'No clear demo/live product pathway for fleet operators',
              'No compliance-aware reporting in a single connected product',
            ].map((gap, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-orange-500/10 bg-orange-500/3">
                <div className="w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Ico name="X" size={10} className="text-orange-400" />
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{gap}</p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/4 text-center">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-emerald-400">Big V's Best Routes™ Fleet</strong> is positioned differently.
              It is not just trying to show a route. It is designed to support the full route decision workflow <em>around</em> the route —
              from vehicle profile and driver assignment through to trip evidence, incident notes, and advisory compliance checks.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION: THE SAFETY-FIRST DIFFERENCE
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-b from-[#03060e] to-[#050810]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="ShieldCheck" size={11} />
              The Difference
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              The Safety-First Difference
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {/* Standard nav */}
            <div className="p-6 rounded-2xl border border-slate-700/40 bg-slate-800/15">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-slate-700/30 border border-slate-700/40 flex items-center justify-center">
                  <Ico name="Navigation" size={15} className="text-slate-400" />
                </div>
                <h3 className="font-display font-semibold text-slate-300 text-base">Standard Navigation Focus</h3>
              </div>
              <ul className="space-y-2.5">
                {['Fastest route','Shortest route','Basic traffic view','General driver directions','Consumer-first journey guidance'].map(i => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>

            {/* Big V focus */}
            <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/4">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Ico name="ShieldCheck" size={15} className="text-amber-400" />
                </div>
                <h3 className="font-display font-semibold text-white text-base">Big V's Best Routes™ Fleet Focus</h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Vehicle profile awareness',
                  'Route suitability checks',
                  'Missing legal-critical field warnings',
                  'Driver PWA assignment flow',
                  'Fleet dashboard visibility',
                  'Advisory Route Safety AI',
                  'Advisory Legal & Compliance AI',
                  'Trip evidence and reporting',
                  'Demo/live backend-ready structure',
                  'Human-reviewed safety decisions',
                ].map(i => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-emerald-300/80">
                    <Ico name="Check" size={12} className="text-emerald-400 flex-shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-amber-500/10 bg-amber-500/3">
            <p className="text-slate-500 text-xs text-center leading-relaxed">
              <strong className="text-amber-400/80">Important:</strong> Big V's Best Routes™ Fleet does not claim to replace
              official legal checks, transport manager responsibility, driver judgement, or approved routing data. It adds an
              advisory safety and evidence layer around the route so better decisions can be made with clearer information.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION: INVESTOR POTENTIAL
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#050810]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="TrendingUp" size={11} />
              Investor Potential
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Why This Could Be Valuable
            </h2>
            <p className="text-slate-400 text-base max-w-3xl mx-auto leading-relaxed">
              Big V's Best Routes™ Fleet demonstrates a working product direction — not just a visual prototype. It shows dashboard logic,
              installable PWA structure, route workflow, AI oversight concepts, demo/live switching, and a clear path toward operational deployment.
            </p>
          </div>

          {/* Product positioning statement */}
          <div className="p-6 rounded-2xl border border-violet-500/15 bg-violet-500/4 mb-10 text-center">
            <p className="text-slate-300 text-sm leading-relaxed max-w-3xl mx-auto">
              Fleet routing is not only a map problem. It is a <strong className="text-violet-300">safety</strong>, <strong className="text-violet-300">responsibility</strong>, <strong className="text-violet-300">evidence</strong>, <strong className="text-violet-300">vehicle suitability</strong>, <strong className="text-violet-300">driver communication</strong>, and <strong className="text-violet-300">operational control</strong> problem.
              Big V's Best Routes™ Fleet is designed to sit in that gap — bringing together the map, vehicle, driver, controller, safety checks,
              evidence trail, and advisory 4P3X Intelligent AI™ oversight into one connected product direction.
            </p>
          </div>

          {/* Markets */}
          <h3 className="font-display font-semibold text-slate-300 text-lg text-center mb-6">Markets It Can Serve</h3>
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {[
              'Delivery Fleets','Van Fleets','HGV Support Workflows','Recovery Services',
              'Council & Community Transport','Utility & Maintenance Teams','Specialist Vehicle Operators',
              'Construction & Site Transport','Mobile Care & Support Fleets','Courier & Logistics Teams',
              'White-Label Fleet Software Providers','Mobile Workforce Management',
            ].map(m => (
              <span key={m} className="px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300/70 text-xs font-medium">
                {m}
              </span>
            ))}
          </div>

          {/* Growth paths */}
          <h3 className="font-display font-semibold text-slate-300 text-lg text-center mb-6">How It Could Grow</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: 'RefreshCw', label: 'SaaS Subscriptions' },
              { icon: 'Tag', label: 'White-Label Licensing' },
              { icon: 'Truck', label: 'Per-Fleet Setup' },
              { icon: 'Users', label: 'Per-Driver Pricing' },
              { icon: 'FileText', label: 'Compliance Add-Ons' },
              { icon: 'Building2', label: 'Enterprise Deployments' },
              { icon: 'Wrench', label: 'Custom Workflow Builds' },
              { icon: 'Globe', label: 'Public Sector Pilots' },
              { icon: 'Star', label: 'Specialist Packages' },
              { icon: 'Code2', label: 'API / Integration Tier' },
            ].map(g => (
              <div key={g.label} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700/30 bg-slate-800/15 text-center">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                  <Ico name={g.icon} size={14} className="text-violet-400" />
                </div>
                <span className="text-slate-400 text-xs font-medium leading-tight">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION: POSSIBLE REVENUE MODELS
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-b from-[#050810] to-[#03060e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="DollarSign" size={11} />
              Revenue Models
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Possible Revenue Models
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: 'RefreshCw', color: 'cyan', title: 'Fleet SaaS Subscription',
                body: 'Monthly or annual subscription for small, medium, and larger fleet operators. Recurring revenue model with tiered feature access.',
              },
              {
                icon: 'Sliders', color: 'emerald', title: 'Per Vehicle / Per Driver',
                body: 'Pricing scales with the number of active vehicles, drivers, or installed PWAs. Grows naturally as the customer\'s fleet grows.',
              },
              {
                icon: 'Layers', color: 'violet', title: 'White-Label Fleet Platform',
                body: 'Other businesses or consultants brand the system for their own fleet clients. "Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™" retained where required.',
              },
              {
                icon: 'Settings', color: 'amber', title: 'Setup & Configuration Service',
                body: 'A paid onboarding package to configure vehicle types, route workflows, backend provider, dashboard settings, PWA deployment, and safety prompts.',
              },
              {
                icon: 'Truck', color: 'orange', title: 'Specialist Sector Versions',
                body: 'Separate variants for councils, recovery operators, mobile care teams, construction vehicles, utility fleets, or specialist transport.',
              },
              {
                icon: 'Building2', color: 'pink', title: 'Enterprise / Custom Build',
                body: 'Custom dashboard, backend, reporting, and AI oversight extensions for larger organisations. Priced case by case based on scope.',
              },
            ].map(m => (
              <div key={m.title} className={`p-6 rounded-2xl border border-${m.color}-500/15 bg-${m.color}-500/4`}>
                <div className={`w-10 h-10 rounded-xl bg-${m.color}-500/10 border border-${m.color}-500/20 flex items-center justify-center mb-4`}>
                  <Ico name={m.icon} size={18} className={`text-${m.color}-400`} />
                </div>
                <h3 className="font-display font-semibold text-white text-base mb-2">{m.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION: ILLUSTRATIVE COMMERCIAL POTENTIAL
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#03060e]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="BarChart3" size={11} />
              Illustrative Only
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Illustrative Commercial Potential
            </h2>
          </div>

          {/* Mandatory disclaimer */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/4 mb-10">
            <p className="text-amber-300/70 text-xs text-center leading-relaxed">
              <strong className="text-amber-300">Illustrative examples only.</strong> These are not financial guarantees, forecasts, or investment advice.
              Actual revenue would depend on product completion, backend implementation, testing, compliance review, customer acquisition,
              pricing, retention, support costs, legal review, and market demand.
            </p>
          </div>

          {/* Pricing tiers */}
          <h3 className="font-display font-semibold text-slate-300 text-base mb-5 text-center">Illustrative Pricing Ranges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { tier: 'Small Fleet', range: '£49–£149/mo', desc: 'Per month package' },
              { tier: 'Growing Fleet', range: '£199–£499/mo', desc: 'Per month package' },
              { tier: 'Specialist Fleet', range: '£500–£1,500+/mo', desc: 'Compliance-support tier' },
              { tier: 'White-Label / Enterprise', range: '£1,500–£10,000+', desc: 'Setup or project basis' },
            ].map(t => (
              <div key={t.tier} className="p-5 rounded-2xl border border-slate-700/30 bg-slate-800/15 text-center">
                <p className="text-slate-500 text-xs mb-2">{t.tier}</p>
                <p className="font-display font-bold text-white text-lg mb-1">{t.range}</p>
                <p className="text-slate-600 text-xs">{t.desc}</p>
              </div>
            ))}
          </div>

          {/* Scenario cards */}
          <h3 className="font-display font-semibold text-slate-300 text-base mb-5 text-center">Illustrative Scenario Examples</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Scenario A', detail: '10 small fleet customers at £99/month', result: '£990/month recurring', color: 'emerald' },
              { label: 'Scenario B', detail: '25 growing fleet customers at £299/month', result: '£7,475/month recurring', color: 'cyan' },
              { label: 'Scenario C', detail: '10 specialist fleet customers at £999/month', result: '£9,990/month recurring', color: 'violet' },
              { label: 'Scenario D', detail: '5 white-label/custom setup projects at £5,000 each', result: '£25,000 project revenue', color: 'amber' },
            ].map(s => (
              <div key={s.label} className={`p-5 rounded-2xl border border-${s.color}-500/15 bg-${s.color}-500/4`}>
                <p className={`text-${s.color}-400 text-xs font-semibold uppercase tracking-wider mb-2`}>{s.label} — Illustrative</p>
                <p className="text-slate-400 text-sm mb-3">{s.detail}</p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-${s.color}-500/10 border border-${s.color}-500/20`}>
                  <Ico name="TrendingUp" size={11} className={`text-${s.color}-400`} />
                  <span className={`text-${s.color}-300 text-sm font-bold`}>{s.result}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-slate-600 text-xs text-center italic">
            All figures above are illustrative examples only. They are not commitments, forecasts, or financial projections of any kind.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION: WHY THIS COULD MATTER + SAFETY BOUNDARY
      ════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-b from-[#03060e] to-[#050810]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80 text-2xs font-semibold tracking-widest uppercase mb-5">
              <Ico name="Star" size={11} />
              Why It Matters
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
              Why This Could Matter
            </h2>
            <p className="text-slate-300 text-base max-w-3xl mx-auto leading-relaxed mb-6">
              Fleet routing is not only a map problem. It is a <strong className="text-amber-400">safety</strong>, <strong className="text-amber-400">responsibility</strong>, <strong className="text-amber-400">evidence</strong>, vehicle suitability, driver communication, and operational control problem.
            </p>
            <p className="text-slate-400 text-base max-w-3xl mx-auto leading-relaxed">
              Big V's Best Routes™ Fleet is designed to sit in that gap — bringing together the map, the vehicle, the driver, the controller,
              the safety checks, the evidence trail, and advisory 4P3X Intelligent AI™ oversight into one connected product direction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { icon: 'Presentation', color: 'violet', label: 'Investor Demo Ready', body: 'A working product direction with logic, PWA structure, AI concepts, demo/live switching, and deployment readiness.' },
              { icon: 'Users', color: 'cyan', label: 'Pilot Discussions', body: 'Suitable for fleet operator feedback, pilot conversations, and grant or funding discussions.' },
              { icon: 'Code2', color: 'amber', label: 'Product Dev Path', body: 'Clear architecture for connecting a real backend, adding live users, and scaling to operational deployment.' },
              { icon: 'Globe', color: 'emerald', label: 'Multi-Sector Applicable', body: 'Councils, logistics, specialists, mobile care, construction, recovery — the concept adapts to many fleet use cases.' },
            ].map(c => (
              <div key={c.label} className={`p-5 rounded-2xl border border-${c.color}-500/15 bg-${c.color}-500/4 text-center`}>
                <div className={`w-10 h-10 rounded-xl bg-${c.color}-500/10 border border-${c.color}-500/20 flex items-center justify-center mx-auto mb-3`}>
                  <Ico name={c.icon} size={17} className={`text-${c.color}-400`} />
                </div>
                <h3 className="font-display font-semibold text-white text-sm mb-2">{c.label}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>

          {/* Safety boundary reinforced */}
          <div className="p-6 rounded-2xl border border-amber-500/15 bg-amber-500/3">
            <div className="flex items-center gap-2.5 mb-3">
              <Ico name="ShieldAlert" size={16} className="text-amber-400 flex-shrink-0" />
              <h3 className="font-display font-semibold text-amber-300 text-sm">Safety Boundary — Always Clear</h3>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Big V's Best Routes™ Fleet is advisory and safety-supporting software. It does not guarantee legal compliance, route legality,
              road suitability, or journey safety. Drivers, fleet operators, transport managers, and organisations remain responsible for
              checking official restrictions, obeying road laws, using professional judgement, and making all final decisions.
              The 4P3X Intelligent AI™ agents provide advisory guidance only — they do not replace human responsibility, legal advice,
              transport manager duties, or official compliance checks.
            </p>
          </div>
        </div>
      </section>



      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-800/40 py-10 bg-[#03060e]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-center">
                  <span className="font-display font-bold text-amber-400 text-xs">BV</span>
                </div>
                <span className="font-display font-bold text-white text-sm">Big V's Best Routes™ Fleet</span>
              </div>
              <p className="text-xs text-slate-600">Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™</p>
            </div>
            <button
              onClick={openDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/8 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/15 transition-colors flex-shrink-0">
              <Ico name="LayoutDash" size={12} />
              Open Fleet Dashboard
              <Ico name="ArrowRight" size={12} />
            </button>
          </div>

          {/* Safety disclaimer */}
          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/3 mb-6">
            <p className="text-2xs text-slate-600 leading-relaxed">
              <strong className="text-slate-500">Advisory Platform Only.</strong> Big V's Best Routes™ supports route planning, driver visibility, safety awareness, and compliance evidence workflows, but it does not guarantee legal compliance or replace official checks, professional judgement, legal advice, transport management duties, or safe driving responsibility. Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel. Route and restriction outputs are advisory only. Public map/routing data may be incomplete, outdated, missing, or inaccurate.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-2xs text-slate-700">
            <span>© 2026 Big V's Best Routes™ Fleet. Created by Kyzel Kreates™.</span>
            <div className="flex items-center gap-4">
              <button onClick={() => markSeenAndGo('/about')} className="text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2">About Kyzel Kreates™</button>
              <button onClick={openDriverPwa} className="text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2">Driver Demo</button>
              <span>Powered by 4P3X Intelligent AI™</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Install modals ───────────────────────────────────── */}
{/* Install modals removed — buttons now navigate directly */}
    </div>
  )
}
