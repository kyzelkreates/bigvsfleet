/**
 * ============================================================
 * Big V's Best Routes™ Fleet — About Kyzel Kreates™
 * /about  (public route, no auth)
 *
 * Creator bio, vision, and product philosophy.
 * Advisory disclaimer retained as per platform rules.
 *
 * Created by Kyzel Kreates™ | Powered by 4P3X Intelligent AI™
 * ============================================================
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Inline SVG icon helper ────────────────────────────────────
const ICONS = {
  shield:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  brain:   'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.77-3.04A3 3 0 0 1 4.5 11a3 3 0 0 1 .27-1.27 2.5 2.5 0 0 1 1.23-4.7z',
  truck:   'M1 3h15v13H1z M16 8h4l3 3v5h-7V8z',
  zap:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  globe:   'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M2 12h20',
  code:    'M16 18l6-6-6-6M8 6l-6 6 6 6',
  layers:  'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  home:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
}

function SvgIco({ name, size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

const timeline = [
  {
    year: '2024',
    title: 'The Concept',
    icon: 'zap',
    color: '#f59e0b',
    desc: "Identified a critical gap in the commercial fleet industry: existing routing software prioritised speed over safety and compliance. Kyzel Kreates™ began architecting a platform from the ground up that would put safety, legal compliance, and driver wellbeing first.",
  },
  {
    year: '2025',
    title: '4P3X Intelligent AI™ Architecture',
    icon: 'brain',
    color: '#8b5cf6',
    desc: "Developed the 4P3X Intelligent AI™ architecture — a modular, layered AI oversight system designed specifically for fleet operations. The system separates Safety Oversight, Legal Compliance, Route Intelligence, and Predictive Analytics into distinct AI agents that work in concert.",
  },
  {
    year: '2025',
    title: "Big V's Best Routes™ Fleet",
    icon: 'truck',
    color: '#3b82f6',
    desc: "Launched the first full-stack fleet management platform built on the 4P3X architecture. Fleet OS Dashboard, Driver PWA, Fleet Controller PWA, real-time OSM navigation with multi-route intelligence (fastest, safest, alternative), and a complete compliance tracking system.",
  },
  {
    year: '2026',
    title: 'Platform at Scale',
    icon: 'globe',
    color: '#22c55e',
    desc: "Multi-tenant SaaS architecture completed. The platform is now capable of supporting fleet operators of any size — from independent owner-operators to enterprise logistics networks. White-label and sector-specific deployments in active development.",
  },
]

const values = [
  { icon: 'shield', color: '#22c55e', title: 'Safety First',      desc: 'Every feature, every route, every decision — safety is the non-negotiable first layer.' },
  { icon: 'layers', color: '#8b5cf6', title: 'AI With Integrity', desc: 'AI provides advisory guidance only. Human judgment, responsibility, and override are always preserved.' },
  { icon: 'code',   color: '#3b82f6', title: 'Engineering Depth', desc: 'No shortcuts. Every system is built to production quality — offline-safe, privacy-first, and resilient.' },
  { icon: 'globe',  color: '#f59e0b', title: 'Open Standards',    desc: 'Built on OpenStreetMap, OSRM, and open routing APIs. No vendor lock-in. No closed ecosystems.' },
]

export default function About() {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#e2e8f0', fontFamily: 'Inter,system-ui,sans-serif', overflowX: 'hidden' }}>

      {/* ── Top nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(5,8,16,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => nav('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚛</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>Big V's Best Routes™</span>
        </button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => nav('/')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <SvgIco name="home" size={14} color="#94a3b8" /> Home
          </button>
          <button onClick={() => nav('/investor')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 8 }}>
            Investor
          </button>
          <button onClick={() => nav('/driver-app')}
            style={{ padding: '7px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            Try Demo
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(124,58,237,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* Avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, boxShadow: '0 0 60px rgba(124,58,237,0.4)', margin: '0 auto' }}>🚛</div>
          <div style={{ position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: '#22c55e', border: '3px solid #050810', boxShadow: '0 0 12px rgba(34,197,94,0.6)' }} />
        </div>

        <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#7c3aed', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Creator & Platform Architect</div>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 12, color: '#fff' }}>Kyzel Kreates™</h1>
        <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Founder of Big V's Best Routes™ Fleet and creator of the 4P3X Intelligent AI™ architecture. Building the safety-first future of fleet operations.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 20, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.8)' }} />
          <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Actively building · 2026</span>
        </div>
      </section>

      {/* ── Bio ── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(13,20,38,0.9),rgba(15,23,42,0.8))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, padding: '36px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.08) 0%,transparent 70%)' }} />
          <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>About</div>
          <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 20 }}>
            Kyzel Kreates™ is a UK-based independent platform engineer and product architect with a deep focus on fleet safety, AI-assisted compliance, and real-world logistics technology. With a background spanning product design, full-stack engineering, and fleet operations advisory, Kyzel built Big V's Best Routes™ Fleet as a response to a fundamental problem: <strong style={{ color: '#e2e8f0' }}>existing fleet software treats safety as a feature, not a foundation.</strong>
          </p>
          <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 20 }}>
            The platform was conceived, designed, and engineered independently — from the multi-tenant backend architecture to the Driver PWA, Fleet Controller interface, and 4P3X Intelligent AI™ oversight layer. Every component was built with a single operating principle: <strong style={{ color: '#e2e8f0' }}>the system advises, the human decides.</strong> No AI output in this platform is a legal guarantee. It is a tool that empowers better decisions, not one that replaces human judgment.
          </p>
          <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, margin: 0 }}>
            Kyzel's engineering philosophy centres on offline resilience, privacy-first architecture, and open-standard tooling. The entire routing and mapping layer runs on OpenStreetMap and OSRM — no closed APIs, no vendor dependency, no data lock-in. The same architecture that powers a single-driver fleet today is designed to scale to enterprise logistics networks tomorrow.
          </p>
        </div>
      </section>

      {/* ── Values ── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Engineering Philosophy</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Core Values</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          {values.map((v, i) => (
            <div key={i} style={{ background: 'rgba(13,20,38,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '22px 18px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${v.color}18`, border: `1px solid ${v.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: v.color }}>
                <SvgIco name={v.icon} size={20} color={v.color} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{v.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Timeline ── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Journey</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Platform Timeline</h2>
        </div>
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom,rgba(124,58,237,0.4),rgba(124,58,237,0.05))' }} />
          {timeline.map((item, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 32 }}>
              <div style={{ position: 'absolute', left: -21, top: 18, width: 14, height: 14, borderRadius: '50%', background: item.color, boxShadow: `0 0 12px ${item.color}80`, border: '2px solid #050810' }} />
              <div style={{ background: 'rgba(13,20,38,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.color, padding: '3px 10px', borderRadius: 20, background: `${item.color}18`, border: `1px solid ${item.color}30` }}>{item.year}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.title}</span>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Advisory ── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ color: '#f59e0b', fontSize: 16, flexShrink: 0 }}>⚠</span>
          <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.6 }}>
            <strong style={{ color: '#94a3b8' }}>Advisory only.</strong> Big V's Best Routes™ Fleet and all 4P3X Intelligent AI™ outputs are advisory tools only. They do not constitute legal advice, route compliance guarantees, or driver certification. All operational decisions remain the sole responsibility of the driver, fleet manager, and operator. Always obey road signs, local laws, permit restrictions, and vehicle-specific limitations.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign: 'center', padding: '0 24px 80px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10 }}>See the platform in action</div>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Try the Driver PWA — OSM tiles, 3-route intelligence, live navigation simulation.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => nav('/driver-app')}
            style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
            ▶ Driver PWA Demo
          </button>
          <button onClick={() => nav('/')}
            style={{ padding: '12px 28px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', color: '#a78bfa', fontWeight: 600, fontSize: 14, border: '1px solid rgba(124,58,237,0.25)', cursor: 'pointer' }}>
            ← Back to Home
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#334155' }}>© 2026 Big V's Best Routes™ Fleet · Created by Kyzel Kreates™ · Powered by 4P3X Intelligent AI™</p>
      </footer>
    </div>
  )
}
