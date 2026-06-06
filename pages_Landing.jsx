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
  Clock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  PoundSign:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 7a4 4 0 0 0-4-4 4 4 0 0 0-4 4v3H5"/><path d="M5 14h10"/><path d="M5 18h14"/></svg>,
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
    <div className="min-h-[100dvh] bg-[#050810] text-white overflow-x-hidden" style={{ overflowY: "auto", height: "auto" }}>

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

            <button
              onClick={openControllerPwa}
              data-testid="hero-btn-controller"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0d1426] hover:bg-[#111827] border border-violet-500/35 hover:border-violet-500/60 text-violet-300 font-semibold rounded-xl text-sm transition-all duration-200">
              <Ico name="Activity" size={15} />
              Controller PWA
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
          INVESTOR & SAFETY CASE CARD  (replaces heavy inline sections)
      ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 border-t border-slate-800/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Why It Matters</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
              The Safety &amp; Legal Case
            </h2>
          </div>

          {/* Investor & Safety Case card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Ico name="ShieldCheck" size={22} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-xl leading-tight">Investor &amp; Safety Case</h3>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  See why Big V&apos;s Best Routes Fleet OS™ was built, how vehicle-aware routing can reduce avoidable
                  route risk, why bridge strikes matter, and how the platform supports safer, more compliant commercial navigation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { icon:'AlertTri',   c:'red',    t:'1,666 bridge strikes',       s:'UK rail network 2024–25 — Network Rail' },
                { icon:'Clock',      c:'amber',  t:'~5 strikes per day',          s:'Average frequency — Network Rail' },
                { icon:'PoundSign',  c:'amber',  t:'£23m per year',              s:'Estimated annual cost — Network Rail' },
                { icon:'Leaf',       c:'emerald',t:'Measurable CO₂ impact',      s:'Extra mileage = extra emissions' },
              ].map(item => {
                const bc = { red:'border-red-500/15 bg-red-500/5', amber:'border-amber-500/15 bg-amber-500/5', emerald:'border-emerald-500/15 bg-emerald-500/5' }[item.c]
                const tc = { red:'text-red-400', amber:'text-amber-400', emerald:'text-emerald-400' }[item.c]
                return (
                  <div key={item.t} className={`p-4 rounded-xl border ${bc} text-center`}>
                    <Ico name={item.icon} size={16} className={`${tc} mx-auto mb-2`} />
                    <p className={`font-display font-bold text-sm ${tc} leading-tight mb-1`}>{item.t}</p>
                    <p className="text-slate-600 text-xs leading-snug">{item.s}</p>
                  </div>
                )
              })}
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/investor-safety-case')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
              >
                <Ico name="ShieldCheck" size={16} />
                Read Investor &amp; Safety Case
                <Ico name="ArrowRight" size={16} />
              </button>
            </div>
          </div>

          {/* Safety boundary note */}
          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/3 text-center">
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl mx-auto">
              <strong className="text-slate-500">Advisory Platform Only.</strong> Big V&apos;s Best Routes Fleet OS™ does not guarantee legal compliance or replace official checks, professional judgement, or driver responsibility.
              All AI features are advisory only and do not replace human decision-making.
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
