/**
 * ============================================================
 * Big V's Best Routes Fleet OS™
 * Investor & Safety Case — Dedicated Page
 * Route: /investor-safety-case (public, no auth)
 *
 * RULES: No auth, no secrets, no legal guarantee, no certified
 *   route language, no fake live claims. Advisory only.
 * Created by Kyzel Kreates™ | Powered by 4P3X Intelligent AI™
 * ============================================================
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── inline SVG icons ──────────────────────────────────────── */
const ICONS = {
  Shield:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  ShieldCheck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  ShieldAlert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  AlertTri:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  AlertCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Check:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Truck:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Map:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
  Brain:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.77-3.04A3 3 0 0 1 4.5 11a3 3 0 0 1 .27-1.27 2.5 2.5 0 0 1 1.23-4.7z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.77-3.04A3 3 0 0 0 19.5 11a3 3 0 0 0-.27-1.27 2.5 2.5 0 0 0-1.23-4.7z"/></svg>,
  Smartphone:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  LayoutDash:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  ArrowRight:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  ArrowLeft:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  TrendingUp:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Leaf:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Clock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Train:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8.5" cy="19" r="1.5"/><circle cx="15.5" cy="19" r="1.5"/><path d="M9.5 19h5"/></svg>,
  Building:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22V12h6v10"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M16 11h.01"/></svg>,
  Users:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Server:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Lock:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Zap:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Layers:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Route:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  Activity:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Navigation:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  Info:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Home:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Download:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

function Ico({ name, size = 20, className = '' }) {
  const svg = ICONS[name]
  if (!svg) return null
  return (
    <span className={`inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {svg}
    </span>
  )
}

/* ── reusable stat block ───────────────────────────────────── */
function Stat({ value, sub, label, source, accent = 'red' }) {
  const C = {
    red:    ['text-red-400',    'bg-red-500/8',    'border-red-500/20'],
    amber:  ['text-amber-400',  'bg-amber-500/8',  'border-amber-500/20'],
    emerald:['text-emerald-400','bg-emerald-500/8','border-emerald-500/20'],
    cyan:   ['text-cyan-400',   'bg-cyan-500/8',   'border-cyan-500/20'],
    violet: ['text-violet-400', 'bg-violet-500/8', 'border-violet-500/20'],
  }[accent] || ['text-red-400','bg-red-500/8','border-red-500/20']
  return (
    <div className={`p-5 rounded-2xl border ${C[2]} ${C[1]} text-center flex flex-col items-center gap-1`}>
      <span className={`font-display font-black text-3xl sm:text-4xl ${C[0]} leading-none`}>{value}</span>
      {sub && <span className={`font-display font-semibold text-lg ${C[0]} leading-none`}>{sub}</span>}
      <span className="text-slate-300 text-sm font-medium mt-1 leading-snug">{label}</span>
      {source && <span className="text-slate-600 text-xs mt-1 leading-snug italic">{source}</span>}
    </div>
  )
}

/* ── section heading ───────────────────────────────────────── */
function SH({ tag, title, subtitle, accent = 'amber' }) {
  const tagC = {
    amber: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    red:   'text-red-400 border-red-500/20 bg-red-500/5',
    emerald:'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    cyan:  'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
    violet:'text-violet-400 border-violet-500/20 bg-violet-500/5',
  }[accent] || 'text-amber-400 border-amber-500/20 bg-amber-500/5'
  return (
    <div className="text-center mb-10 sm:mb-12">
      {tag && <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-[0.18em] uppercase mb-4 ${tagC}`}>{tag}</div>}
      <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm sm:text-base max-w-3xl mx-auto mt-4 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

/* ── check list ────────────────────────────────────────────── */
function CL({ items, c = 'emerald' }) {
  const ic = { emerald:'text-emerald-400', amber:'text-amber-400', red:'text-red-400', cyan:'text-cyan-400', violet:'text-violet-400' }[c] || 'text-emerald-400'
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400 leading-relaxed">
          <Ico name="Check" size={12} className={`${ic} flex-shrink-0 mt-1`} />{t}
        </li>
      ))}
    </ul>
  )
}

/* ── cross list ────────────────────────────────────────────── */
function XL({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400 leading-relaxed">
          <Ico name="X" size={12} className="text-red-400 flex-shrink-0 mt-1" />{t}
        </li>
      ))}
    </ul>
  )
}

/* ── advisory banner ───────────────────────────────────────── */
function Adv({ children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 mb-6">
      <Ico name="AlertTri" size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-amber-200/70 leading-relaxed">{children}</div>
    </div>
  )
}

/* ── top nav ───────────────────────────────────────────────── */
function TopBar({ nav }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#050810]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <button onClick={() => nav('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
          <Ico name="ArrowLeft" size={15} /><span className="hidden sm:inline">Home</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-display font-black text-amber-400 text-xs">BV</span>
          </div>
          <span className="font-display font-bold text-white text-sm hidden sm:block">Big V&apos;s Best Routes™ <span className="text-amber-400">Fleet</span></span>
        </div>
        <button onClick={() => nav('/app/dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors flex-shrink-0">
          <Ico name="LayoutDash" size={13} /><span className="hidden sm:inline">Dashboard</span>
        </button>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function InvestorSafetyCase() {
  const nav = useNavigate()

  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) } catch {}
    try { window.scroll(0, 0) } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100" style={{ overflowX: 'hidden' }}>
      <TopBar nav={nav} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden" style={{ background: 'linear-gradient(180deg,#050810 0%,#0a0f1e 60%,#050810 100%)' }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400/80 text-xs font-semibold tracking-[0.18em] uppercase mb-6">
            <Ico name="ShieldCheck" size={11} />Investor &amp; Safety Case
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-white leading-tight mb-6">
            Why Vehicle-Aware Routing<br className="hidden sm:block" /><span className="text-amber-400"> Matters</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-4">
            Big V&apos;s Best Routes Fleet OS™ is a safety-first, vehicle-aware navigation and compliance platform
            designed to help drivers, operators, and route planners reduce avoidable route risk before a journey begins.
          </p>
          <p className="text-slate-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed mb-10">
            Instead of treating every vehicle like a standard car, the platform is built around the real-world details
            that matter: vehicle height, width, weight, load type, access restrictions, bridge risk, road suitability,
            route confidence, and safety and legal compliance prompts.
          </p>
          {/* quick-jump pills */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {[['The Problem','#s1'],['Bridge Strikes','#s2'],['Infrastructure Cost','#s3'],['CO₂ & Detours','#s4'],['Vehicle Profile','#s5'],['Compliance AI','#s6'],['Demo vs Live','#s7'],['Architecture','#s8'],['Investor Case','#s9']].map(([l,h]) => (
              <a key={l} href={h} className="px-2.5 py-1 rounded-full border border-slate-700/40 bg-slate-800/20 text-slate-500 hover:text-slate-300 hover:border-slate-600/60 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </section>

      {/* ── S1: THE PROBLEM ───────────────────────────────────── */}
      <section id="s1" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 1 — The Problem" title="Route Planning Cannot Ignore the Vehicle"
            subtitle="Most everyday navigation tools are designed to get a user from A to B quickly. That is not enough for larger, taller, heavier, restricted, or specialist vehicles." accent="red" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-2xl border border-slate-700/30 bg-slate-800/10">
              <div className="flex items-center gap-2.5 mb-4"><Ico name="Navigation" size={15} className="text-slate-400" /><h3 className="font-display font-semibold text-slate-300 text-sm">Standard Navigation Asks</h3></div>
              <p className="text-2xl sm:text-3xl font-display font-bold text-slate-400 leading-tight mb-3">"What is the fastest route?"</p>
              <p className="text-slate-500 text-sm leading-relaxed">Optimises for speed and traffic. Does not consider vehicle dimensions, load type, bridge clearance, weight restrictions, or route suitability for the specific vehicle.</p>
            </div>
            <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2.5 mb-4"><Ico name="ShieldCheck" size={15} className="text-amber-400" /><h3 className="font-display font-semibold text-white text-sm">Big V&apos;s Best Routes Fleet OS™ Asks</h3></div>
              <p className="text-xl sm:text-2xl font-display font-bold text-amber-300 leading-tight mb-3">"Is this route suitable for <em>this</em> vehicle, <em>this</em> load, <em>this</em> height, <em>this</em> weight, and <em>this</em> compliance context?"</p>
              <p className="text-slate-400 text-sm leading-relaxed">Vehicle-aware. Restriction-aware. Safety-evidence driven. Built around the operational question that matters most.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-700/20 bg-slate-800/10 mb-4">
            <h3 className="font-display font-semibold text-slate-300 text-sm mb-4">Real-World Risks the Platform Addresses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
              {['Low bridge collisions','Narrow road suitability','Weight-restricted roads','Height-restricted access','Unsuitable rural lanes','Restricted access areas','Sharp turns for longer vehicles','Delivery access problems','Missed route restriction checks','Driver stress and last-minute rerouting','Infrastructure strikes','Avoidable detour mileage','Increased fuel use from poor routing','Increased CO₂ from failed routes','Business delays and reputational damage'].map((r,i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-400 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />{r}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/3 text-center">
            <p className="text-slate-400 text-sm leading-relaxed"><strong className="text-amber-400">Big V&apos;s Best Routes Fleet OS™ exists because route planning should not ignore the vehicle.</strong></p>
          </div>
        </div>
      </section>

      {/* ── S2: BRIDGE STRIKES ───────────────────────────────── */}
      <section id="s2" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6 bg-gradient-to-b from-[#050810] to-[#0a0f1e]">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 2 — Evidence" title="Bridge Strikes Are a Real UK Infrastructure Problem"
            subtitle="Bridge strikes are not minor incidents. They can damage infrastructure, disrupt rail passengers, delay deliveries, create road closures, increase operator costs, and place drivers and the public at risk." accent="red" />

          <div className="p-5 rounded-2xl border border-red-500/15 bg-red-500/5 mb-8">
            <div className="flex items-center gap-2.5 mb-3">
              <Ico name="AlertTri" size={15} className="text-red-400" />
              <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">Official Network Rail Evidence — 2024–25</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">The following statistics are sourced from official Network Rail publications and campaigns. They illustrate the scale of the bridge strike problem across the UK rail network.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat value="1,666" label="Bridge strikes reported across the UK rail network" source="Network Rail — 1 Apr 2024 to 31 Mar 2025" accent="red" />
              <Stat value="~5" sub="per day" label="Average bridge strike frequency" source="Network Rail Wise Up, Size Up campaign" accent="amber" />
              <Stat value="~2 hrs" label="Average train delay per strike" source="Network Rail guidance" accent="amber" />
              <Stat value="£23m" sub="per year" label="Estimated annual cost of bridge strikes" source="Network Rail — approx. £13,000 per strike" accent="red" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-5 rounded-2xl border border-slate-700/30 bg-slate-800/10">
              <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Ico name="AlertCircle" size={13} className="text-red-400" />Why Bridge Strikes Happen</h3>
              <XL items={['Driver does not know the true running height of the vehicle and load','Trailer height differs from cab height','Load changes the vehicle profile mid-journey','Route planner does not check low-bridge restrictions','Driver follows generic sat-nav without vehicle-specific checks','Diversions followed without re-checking route suitability','Bridge signs missed or misunderstood','Vehicle height not clearly displayed in cab','Fleet records incomplete or unavailable to route planners']} />
            </div>
            <div className="p-5 rounded-2xl border border-amber-500/15 bg-amber-500/5">
              <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Ico name="Info" size={13} className="text-amber-400" />What the Guidance Says</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-amber-300 mb-1">DfT Bridge Strike Guidance</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Commercial vehicle operators and drivers have a duty to take practical steps to avoid colliding with infrastructure. This includes knowing and recording vehicle and trailer running heights, and making that information available to route planners and drivers.</p>
                  <p className="text-xs text-slate-600 italic mt-1">Source: Department for Transport bridge strike guidance</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-300 mb-1">GOV.UK Know Your Traffic Signs</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Bridges with a clearance below 16 feet 6 inches (approximately 5 metres) are normally signed. Drivers must check their vehicle height against signed clearances before using a route.</p>
                  <p className="text-xs text-slate-600 italic mt-1">Source: GOV.UK — Know Your Traffic Signs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-amber-500/10 bg-amber-500/3 text-center">
            <p className="text-slate-300 text-sm leading-relaxed max-w-3xl mx-auto"><strong className="text-amber-400">Big V&apos;s Best Routes Fleet OS™ is designed around this principle:</strong> route suitability starts with the vehicle profile. Every route check should begin with the vehicle — not a generic map line.</p>
          </div>
        </div>
      </section>

      {/* ── S3: INFRASTRUCTURE COST ───────────────────────────── */}
      <section id="s3" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 3 — Impact" title="Infrastructure, Business, and Public Cost"
            subtitle="A bridge strike creates several layers of cost — from direct infrastructure damage to public disruption, lasting business consequences, and measurable environmental impact." accent="amber" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon:'Building', a:'red',    t:'Direct Infrastructure Cost',   items:['Bridge inspection and structural checks','Repair costs to infrastructure','Rail or road disruption','Emergency response mobilisation','Asset downtime and network disruption','Network Rail and highway authority involvement'] },
              { icon:'Truck',   a:'amber',   t:'Business Cost to Operator',    items:['Delayed deliveries and missed appointments','Driver downtime and lost time','Vehicle damage and repair costs','Insurance claims and investigation','Compliance investigation costs','Reputational damage and contract penalties'] },
              { icon:'Train',   a:'cyan',    t:'Public Cost',                  items:['Train delays affecting passengers','Road closures and diversions','Community congestion from rerouting','Public transport disruption','Emergency service pressure','Local area and community disruption'] },
              { icon:'Leaf',    a:'emerald', t:'Environmental Cost',           items:['Detours increase total journey mileage','Extra mileage increases fuel use','Extra fuel increases CO₂ emissions','Congestion increases vehicle idling time','Repeated failed route attempts waste energy','Unnecessary rerouting is a measurable emissions event'] },
            ].map(col => {
              const bMap = { red:'border-red-500/20 bg-red-500/5', amber:'border-amber-500/20 bg-amber-500/5', cyan:'border-cyan-500/20 bg-cyan-500/5', emerald:'border-emerald-500/20 bg-emerald-500/5' }
              const tMap = { red:'text-red-400', amber:'text-amber-400', cyan:'text-cyan-400', emerald:'text-emerald-400' }
              return (
                <div key={col.t} className={`p-5 rounded-2xl border ${bMap[col.a]}`}>
                  <div className="flex items-center gap-2 mb-3"><Ico name={col.icon} size={14} className={tMap[col.a]} /><h3 className="font-display font-semibold text-white text-xs leading-tight">{col.t}</h3></div>
                  <ul className="space-y-1.5">
                    {col.items.map((item,i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                        <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: tMap[col.a].replace('text-','').replace('-400','') === 'red' ? '#f87171' : tMap[col.a].replace('text-','').replace('-400','') === 'amber' ? '#fbbf24' : tMap[col.a].replace('text-','').replace('-400','') === 'cyan' ? '#22d3ee' : '#34d399' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/3 text-center">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl mx-auto">This is why Big V&apos;s Best Routes Fleet OS™ treats route planning as a <strong className="text-emerald-400">safety</strong>, <strong className="text-emerald-400">legal</strong>, <strong className="text-emerald-400">operational</strong>, and <strong className="text-emerald-400">environmental</strong> problem — not just a mapping problem.</p>
          </div>
        </div>
      </section>

      {/* ── S4: CO₂ & DETOURS ────────────────────────────────── */}
      <section id="s4" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6 bg-gradient-to-b from-[#050810] to-[#0a0f1e]">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 4 — Environment" title="Extra CO₂ From Bad Routing and Detours"
            subtitle="When a vehicle is sent down an unsuitable route, the cost is not only time. A failed route can force a driver to stop, turn around, reroute, or take a much longer diversion — and every extra mile is a measurable emissions event." accent="emerald" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5">
              <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Ico name="Leaf" size={14} className="text-emerald-400" />Emissions Chain: Bad Route → Extra CO₂</h3>
              <div className="space-y-3">
                {[['1','Vehicle sent down unsuitable route','amber'],['2','Driver must stop, turn around, or divert','amber'],['3','Extra mileage added to the journey','red'],['4','Extra fuel burned by heavier commercial vehicle','red'],['5','Extra CO₂ emitted — a measurable emissions event','red'],['6','Congestion from diversions increases idling time','red']].map(([n,t,c]) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${c==='red'?'bg-red-500/15 text-red-400 border border-red-500/20':'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>{n}</div>
                    <p className="text-sm text-slate-400 leading-relaxed pt-0.5">{t}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-700/30 bg-slate-800/10">
              <h3 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
                <Ico name="Activity" size={14} className="text-cyan-400" />
                Future Route Impact Layer <span className="text-2xs text-slate-600 font-normal ml-1">(Planned)</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">A future-ready route impact layer is planned. This would estimate and display:</p>
              <CL c="cyan" items={['Planned route distance vs safer alternative distance','Avoided risk and restriction points','Estimated additional mileage avoided','Estimated CO₂ impact from avoided detours (advisory)','Route confidence score','Evidence summary for operator or driver']} />
              <div className="mt-4 p-3 rounded-xl border border-slate-700/20 bg-slate-900/40">
                <p className="text-xs text-slate-600 leading-relaxed"><strong className="text-slate-500">Advisory note:</strong> CO₂ estimates would use UK Government greenhouse gas conversion factors for activity data. Results would be estimates only — not certified emissions calculations — unless connected to official conversion factors and verified vehicle data.</p>
              </div>
            </div>
          </div>

          <Adv><strong className="text-amber-300">UK Government Greenhouse Gas Conversion Factors</strong> are used by organisations to report emissions from activity data such as distance travelled. Unnecessary detours can therefore be measured as a real emissions impact — not just an inconvenience. Big V&apos;s Best Routes Fleet OS™ plans to include an advisory emissions-impact layer using these factors in a future development phase.</Adv>
        </div>
      </section>

      {/* ── S5: VEHICLE PROFILE ──────────────────────────────── */}
      <section id="s5" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 5 — Vehicle Profile" title="Vehicle Profile First"
            subtitle="The vehicle profile is the foundation of route planning. Every route suitability check, restriction scan, and compliance assessment should be anchored to the actual vehicle making the journey." accent="amber" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-5 rounded-2xl border border-amber-500/15 bg-amber-500/5">
              <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Ico name="Truck" size={14} className="text-amber-400" />Vehicle Information the Platform Can Use</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {['Vehicle type','Height (running height)','Width','Length','Weight','Axle weight (where relevant)','Trailer attached yes/no','Trailer dimensions','Load type','Hazardous or special load flag','Low bridge sensitivity','Narrow road sensitivity','Weight restriction sensitivity','Access restriction needs','Preferred route type','Avoidance preferences'].map((f,i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-0.5">
                    <div className="w-1 h-1 rounded-full bg-amber-500/60 flex-shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-2xl border border-slate-700/30 bg-slate-800/10">
              <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Ico name="Zap" size={14} className="text-cyan-400" />Modular Vehicle Input Design</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">Vehicle input pages are designed to be modular — only showing the fields relevant to the selected vehicle type. This prevents input overload and ensures drivers and operators focus on what actually affects their route.</p>
              <CL c="cyan" items={['Progressive disclosure — show only what matters for this vehicle type','Required / optional field labels','Legal-critical field labels','Missing information warnings','Route confidence impact indicators','No irrelevant input overload for simpler vehicles']} />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/3 text-center">
            <p className="text-slate-500 text-xs leading-relaxed max-w-3xl mx-auto">Without a complete vehicle profile, route suitability cannot be properly assessed. Incomplete vehicle data reduces route confidence and should trigger an advisory warning before a trip begins.</p>
          </div>
        </div>
      </section>

      {/* ── S6: COMPLIANCE AI ────────────────────────────────── */}
      <section id="s6" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6 bg-gradient-to-b from-[#050810] to-[#0a0f1e]">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 6 — 4P3X Intelligent AI™" title="Compliance AI Advisory Layer"
            subtitle="Big V's Best Routes Fleet OS™ includes 4P3X Intelligent AI™ as an advisory compliance and route-suitability layer. It helps surface risk, highlight missing data, and support safer decisions — without replacing human responsibility." accent="violet" />

          <Adv><strong className="text-amber-300">Advisory Only — Always.</strong> Compliance AI supports safer decision-making by highlighting possible risk, missing data, and route suitability concerns. It does not guarantee that a route is legal, safe, or suitable. Drivers and operators remain responsible for obeying road signs, checking route restrictions, following the law, and using professional judgement at all times.</Adv>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {[
              { n:'01', c:'emerald', t:'Route Safety AI', purpose:'Reviews route suitability, vehicle profile compatibility, route risk flags, GPS confidence, restricted area awareness, and map data reliability.', items:['Route geometry and restriction scan','Vehicle height and weight suitability awareness','GPS confidence monitoring','Driver checklist and trip status','Overpass restriction concern detection','Map provider confidence scoring','Advisory route risk level output'] },
              { n:'02', c:'violet',  t:'Legal & Compliance AI', purpose:'Reviews vehicle legal and physical fields, missing legal-critical data, route evidence completeness, controller acknowledgement status, and data freshness.', items:['Vehicle legal document expiry awareness','Missing compliance field detection','Route evidence and report completeness','Controller review status monitoring','Data freshness and OSM reliability flags','Advisory compliance gap output','Driver pre-journey checklist status'] },
            ].map(a => {
              const bc = { emerald:'border-emerald-500/20 bg-emerald-500/5', violet:'border-violet-500/20 bg-violet-500/5' }[a.c]
              const tc = { emerald:'text-emerald-400', violet:'text-violet-400' }[a.c]
              return (
                <div key={a.n} className={`p-5 rounded-2xl border ${bc}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-lg border ${bc} flex items-center justify-center flex-shrink-0`}><span className={`font-display font-black text-sm ${tc}`}>{a.n}</span></div>
                    <div><h3 className="font-display font-bold text-white text-sm">{a.t}</h3><p className="text-xs text-slate-500 leading-relaxed mt-1">{a.purpose}</p></div>
                  </div>
                  <CL c={a.c} items={a.items} />
                </div>
              )
            })}
          </div>
          <div className="p-5 rounded-2xl border border-violet-500/10 bg-violet-500/3 text-center">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl mx-auto">4P3X Intelligent AI™ agents are explainable and transparent. They support better decisions — they do not make final decisions. Human operators, drivers, and transport managers remain responsible for all route choices, compliance checks, and safety decisions.</p>
          </div>
        </div>
      </section>

      {/* ── SAFETY & LEGAL BOUNDARY ──────────────────────────── */}
      <section className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <SH tag="Section 7 — Safety Boundary" title="Advisory Platform — Safety and Legal Responsibility" accent="red" />
          <div className="p-6 rounded-2xl border border-red-500/15 bg-red-500/5 mb-6">
            <div className="flex items-center gap-2.5 mb-4"><Ico name="ShieldAlert" size={17} className="text-red-400" /><h3 className="font-display font-bold text-white text-base">Safety &amp; Legal Boundary — Always Clear</h3></div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">Big V&apos;s Best Routes Fleet OS™ is advisory software. It does not replace:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {['The Highway Code','Road signs and mandatory instructions','Legal vehicle restrictions','Professional transport management','Driver responsibility','Operator legal responsibility','Insurance requirements','Local authority restrictions','Network Rail or highway authority guidance','Human judgement in all circumstances'].map((item,i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-400"><Ico name="ShieldCheck" size={11} className="text-red-400/60 flex-shrink-0" />{item}</div>
              ))}
            </div>
            <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5">
              <p className="text-xs text-amber-200/80 leading-relaxed"><strong className="text-amber-300">Important:</strong> If road signs, police instructions, local restrictions, physical road conditions, or official route requirements conflict with the app, the real-world official instruction must always take priority. The platform helps identify and reduce avoidable risk — it does not certify routes as legal or safe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── S7: DEMO vs LIVE ─────────────────────────────────── */}
      <section id="s7" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6 bg-gradient-to-b from-[#050810] to-[#0a0f1e]">
        <div className="max-w-5xl mx-auto">
          <SH tag="Section 8 — Architecture" title="Demo Mode Shows the Product. Live Mode Runs the Product." accent="cyan" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">Demo Mode</span>
                <span className="text-xs text-slate-500">No backend required</span>
              </div>
              <CL c="amber" items={['Labelled demo data throughout the platform','Local and offline-safe state management','One-button local sync in demo context','No API keys needed to demonstrate','Full product logic demonstrable','All routes and features accessible','Suitable for investor and stakeholder demos','No real legal route guarantee from demo data','No live operational decisions should depend on demo data']} />
            </div>
            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">Live Mode</span>
                <span className="text-xs text-slate-500">Backend connected</span>
              </div>
              <CL c="emerald" items={['Demo data switched off globally','Real vehicle records can be connected','Supabase, Firebase, AWS, or custom REST backend','Real route sessions synced between dashboard and PWA','Backend-connected records for route history and evidence','Compliance evidence and reporting','Backend-only secrets never exposed in frontend code','4P3X API Config Guard™ blocks unsafe key exposure','Real user authentication when live mode active']} />
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-700/20 bg-slate-800/10 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto">Switching from demo to live requires connecting a real backend through the existing <strong className="text-slate-300">Backend Settings</strong> and <strong className="text-slate-300">API Settings Centre</strong> in the Fleet Dashboard. Auth, RLS, and user provisioning are ready to activate when a live backend is configured.</p>
          </div>
        </div>
      </section>

      {/* ── S8: ARCHITECTURE ─────────────────────────────────── */}
      <section id="s8" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 9 — 4P3X Verse™" title="Modular Product Architecture"
            subtitle="Big V's Best Routes Fleet OS™ demonstrates the 4P3X modular product architecture: one reusable software foundation that can be adapted into different sector-specific systems through controlled refactoring." accent="violet" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              { icon:'LayoutDash', c:'amber',   l:'Fleet Command Dashboard',         b:'Vehicle and driver management, route planning, assignment, trip status, GPS visibility, safety warnings, and compliance checks.' },
              { icon:'Smartphone', c:'emerald', l:'Driver PWA',                      b:'Installable on driver device. Route display, GPS, trip status, safety prompts, checklists, acknowledgements, and offline-safe submission.' },
              { icon:'Activity',   c:'violet',  l:'Fleet Controller PWA',            b:'Mobile fleet supervision, route status checks, driver visibility, safety and sync status updates, and route flags.' },
              { icon:'Map',        c:'cyan',    l:'Map and Routing Engine',          b:'OSM public tiles, MapLibre rendering, GraphHopper optimisation, Overpass restriction scanning, and polyline rendering.' },
              { icon:'Server',     c:'amber',   l:'Demo / Live Backend',             b:'Demo Mode needs no backend. Live Mode connects Supabase, Firebase, AWS, or custom REST with RLS-enabled schemas.' },
              { icon:'Brain',      c:'violet',  l:'4P3X Intelligent AI™ Oversight', b:'Advisory compliance and route-safety AI agents. Explainable, transparent, and never replacing human responsibility.' },
            ].map(card => {
              const bc = { amber:'border-amber-500/15 bg-amber-500/4', emerald:'border-emerald-500/15 bg-emerald-500/4', violet:'border-violet-500/15 bg-violet-500/4', cyan:'border-cyan-500/15 bg-cyan-500/4' }[card.c]
              const tc = { amber:'text-amber-400', emerald:'text-emerald-400', violet:'text-violet-400', cyan:'text-cyan-400' }[card.c]
              const ic = { amber:'bg-amber-500/10 border-amber-500/20', emerald:'bg-emerald-500/10 border-emerald-500/20', violet:'bg-violet-500/10 border-violet-500/20', cyan:'bg-cyan-500/10 border-cyan-500/20' }[card.c]
              return (
                <div key={card.l} className={`p-5 rounded-2xl border ${bc}`}>
                  <div className={`w-9 h-9 rounded-xl border ${ic} flex items-center justify-center mb-3`}><Ico name={card.icon} size={16} className={tc} /></div>
                  <h3 className="font-display font-semibold text-white text-sm mb-2">{card.l}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{card.b}</p>
                </div>
              )
            })}
          </div>
          <div className="p-5 rounded-2xl border border-violet-500/10 bg-violet-500/3 text-center">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl mx-auto">This means the platform is not only one product. It is also a proof of architecture: a reusable base capable of becoming multiple serious operational systems across different sectors and use cases.</p>
          </div>
        </div>
      </section>

      {/* ── S9: INVESTOR CASE ────────────────────────────────── */}
      <section id="s9" className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6 bg-gradient-to-b from-[#050810] to-[#0a0f1e]">
        <div className="max-w-6xl mx-auto">
          <SH tag="Section 10 — Opportunity" title="Investor and Funder Opportunity"
            subtitle="Big V's Best Routes Fleet OS™ has investment potential because it targets a real operational problem with clear safety, cost, compliance, infrastructure, and environmental consequences." accent="violet" />

          <div className="mb-8">
            <h3 className="font-display font-semibold text-slate-300 text-sm mb-4 text-center">Markets the Platform Can Serve</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {['Commercial Vehicle Operators','Delivery Companies','HGV and Van Operators','Local Authorities','Infrastructure Risk Reduction','Insurance and Claims Prevention','Driver Safety Technology','Route Planning Compliance','Fleet Management Software','Specialist Transport','Training and Evidence Systems','Carbon Reporting Support','Public-Sector Safety Innovation','Mobile Workforce Management','Construction and Site Transport','Recovery Services','Community and Council Transport','Courier and Logistics Teams'].map(m => (
                <span key={m} className="px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300/70 text-xs font-medium">{m}</span>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-display font-semibold text-slate-300 text-sm mb-5 text-center">Platform Development Roadmap</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { s:'1', l:'Demo / Proof of Concept',            st:'current', b:'Working demo platform with full product logic, PWA structure, AI oversight concepts, and demo/live switching.' },
                { s:'2', l:'Live Single-User Navigation',         st:'planned', b:'Backend-connected live vehicle-aware navigation for single operators. Real vehicle profiles, live route sessions.' },
                { s:'3', l:'Operator Dashboard and PWA Sync',     st:'planned', b:'Live sync between fleet dashboard, driver PWA, and controller PWA. Real-time trip status and updates.' },
                { s:'4', l:'Route Evidence System',               st:'planned', b:'Backend-connected route evidence capture, compliance record keeping, and incident documentation.' },
                { s:'5', l:'Compliance AI and Reporting',         st:'planned', b:'Full advisory AI compliance reporting layer, safety audit trail, and operator compliance summaries.' },
                { s:'6', l:'API-Connected Professional Product',  st:'planned', b:'Integrated with professional routing providers, official restriction data, and real-time road condition feeds.' },
                { s:'7', l:'Infrastructure Risk and Carbon Impact',st:'future', b:'Wider infrastructure-risk mapping and carbon-impact reporting using official UK Government emissions conversion factors.' },
              ].map(step => {
                const ss = { current:'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', planned:'bg-amber-500/10 border-amber-500/20 text-amber-400', future:'bg-slate-700/20 border-slate-700/30 text-slate-500' }[step.st]
                const sl = { current:'Current', planned:'Planned', future:'Future' }[step.st]
                return (
                  <div key={step.s} className="p-4 rounded-xl border border-slate-700/25 bg-slate-800/10">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0"><span className="text-violet-400 text-xs font-bold">{step.s}</span></div>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${ss}`}>{sl}</span>
                    </div>
                    <h4 className="font-display font-semibold text-white text-xs mb-1.5">{step.l}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.b}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-violet-500/15 bg-violet-500/4 mb-6">
            <h3 className="font-display font-bold text-white text-base mb-4 text-center">Why This Is Different</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4 text-center max-w-3xl mx-auto">Big V&apos;s Best Routes Fleet OS™ is not only trying to draw a route on a map. It is trying to understand whether the route makes sense for the vehicle.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['Vehicle-specific routing logic','Bridge-strike awareness','Safety and legal prompts','Route confidence scoring','Compliance evidence capture','Driver PWA workflow','Dashboard oversight','Demo and live architecture','Advisory AI oversight','Backend-ready deployment','Modular product engineering','4P3X Verse™ reusable base'].map((item,i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-400"><Ico name="Check" size={12} className="text-violet-400 flex-shrink-0" />{item}</div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-700/20 bg-slate-800/5 text-center">
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto italic">Big V&apos;s Best Routes Fleet OS™ is a working product direction — not a visual prototype. It demonstrates real dashboard logic, installable PWA structure, route workflow, AI oversight concepts, and a clear path toward operational deployment.</p>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────── */}
      <section className="py-16 sm:py-20 border-t border-slate-800/30 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <SH tag="Explore" title="Explore the Platform"
            subtitle="Access the live demo, open the Fleet Dashboard, install the Driver PWA, or explore the system architecture." accent="amber" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon:'LayoutDash', l:'Open Fleet Dashboard',         s:'Fleet command, vehicles, routes, and settings',   a:'amber',   fn:()=>nav('/app/dashboard') },
              { icon:'Smartphone', l:'Driver PWA Demo',              s:'Driver app — navigate to /driver-app',           a:'emerald', fn:()=>nav('/driver-app') },
              { icon:'Activity',   l:'Fleet Controller PWA',         s:'Mobile fleet supervision and route monitoring',  a:'cyan',    fn:()=>nav('/fleet-controller-pwa') },
              { icon:'Brain',      l:'Compliance AI',                s:'Advisory route safety and legal compliance agents',a:'violet',  fn:()=>nav('/app/compliance') },
              { icon:'Shield',     l:'Route Safety Dashboard',       s:'Safety AI, incident tracking, and evidence',     a:'amber',   fn:()=>nav('/app/safety') },
              { icon:'Home',       l:'Back to Home',                 s:'Return to the main landing page',                a:'cyan',    fn:()=>nav('/') },
            ].map(btn => {
              const bc = { amber:'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20', emerald:'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20', cyan:'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20', violet:'bg-violet-500/10 border-violet-500/25 text-violet-400 hover:bg-violet-500/20' }[btn.a]
              return (
                <button key={btn.l} onClick={btn.fn} className={`flex items-center gap-3 p-4 rounded-2xl border ${bc} transition-colors w-full text-left`}>
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 bg-${btn.a}-500/10 border-${btn.a}-500/20`}><Ico name={btn.icon} size={17} /></div>
                  <div className="min-w-0 flex-1"><p className="font-semibold text-sm leading-tight">{btn.l}</p><p className="text-xs text-slate-500 mt-0.5">{btn.s}</p></div>
                  <Ico name="ArrowRight" size={14} className="flex-shrink-0 opacity-50" />
                </button>
              )
            })}
          </div>

          <div className="p-5 rounded-2xl border border-slate-700/20 bg-slate-800/8 mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <Ico name="TrendingUp" size={14} className="text-violet-400" />
              <h3 className="font-display font-semibold text-white text-sm">Investor / Funder Enquiry</h3>
              <span className="text-xs text-slate-600 border border-slate-700/30 rounded px-1.5 py-0.5">Contact Form — Coming Soon</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">A formal investor and funder enquiry contact form will be added in a future development phase. In the meantime, enquiries about the platform, pilot discussions, investment interest, or funding conversations can be directed through Kyzel Kreates™ directly.</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/40 py-10 bg-[#03060e]/80 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-center">
                  <span className="font-display font-bold text-amber-400 text-xs">BV</span>
                </div>
                <span className="font-display font-bold text-white text-sm">Big V&apos;s Best Routes™ Fleet</span>
              </div>
              <p className="text-xs text-slate-600">Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™</p>
            </div>
            <button onClick={() => nav('/')} className="flex items-center gap-2 px-4 py-2 bg-amber-500/8 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/15 transition-colors flex-shrink-0">
              <Ico name="Home" size={12} />Back to Home<Ico name="ArrowRight" size={12} />
            </button>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/3 mb-6">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-500">Advisory Platform Only.</strong> Big V&apos;s Best Routes Fleet OS™ supports route planning, driver visibility, safety awareness, and compliance evidence workflows. It does not guarantee legal compliance, certify routes as legal or safe, replace official checks, professional judgement, driver responsibility, or transport manager duties. All route decisions, safety checks, and compliance obligations remain the responsibility of the operator, driver, and transport manager. 4P3X Intelligent AI™ agents provide advisory guidance only. If official road signs, police instructions, local restrictions, or physical road conditions conflict with the app, the official real-world instruction takes priority.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700">
            <p>© 2026 Big V&apos;s Best Routes™ Fleet. Created by Kyzel Kreates™. All rights reserved.</p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <button onClick={() => nav('/')} className="hover:text-slate-500 transition-colors">Home</button>
              <button onClick={() => nav('/about')} className="hover:text-slate-500 transition-colors">About</button>
              <button onClick={() => nav('/driver-app')} className="hover:text-slate-500 transition-colors">Driver Demo</button>
              <span className="text-slate-800">Powered by 4P3X Intelligent AI™</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
