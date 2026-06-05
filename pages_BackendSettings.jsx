/**
 * ============================================================
 * Big V's Best Routes™ — Backend Settings Centre
 * /src/pages/BackendSettings.jsx
 *
 * RUN 11 — Supabase Live Backend Foundation + SQL + RLS
 *
 * PURPOSE:
 *   Configure, test, and manage the Supabase backend connection.
 *   Frontend-safe anon/public key only.
 *   No service role key. No database URL. No private tokens.
 *
 * SECURITY:
 *   - Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend
 *   - 4P3X API Config Guard™ validates before save
 *   - No backend-only secrets stored or displayed
 *   - No credentials logged
 *   - Masked key display only
 *
 * ADVISORY:
 *   Demo Mode remains local/demo — no backend required.
 *   Live Mode with Supabase configured enables backend foundation.
 *   Real-time sync is completed in Run 12 (Driver PWA) and Run 13 (Controller PWA).
 * ============================================================
 */

import React, { useState, useCallback, useEffect } from 'react'
import Icon from './components_ui_Icon'
import { useDemoLiveStore, useBackendConfigStore } from './core_storage'
import { DemoLiveToggle } from './components_ui_DemoLiveToggle'
import { SyncStatusPanel } from './components_ui_SyncStatusPanel'
import {
  getSupabaseSettings, saveSupabaseSettings, testSupabaseConnection,
  isSupabaseConfigured, getSupabaseStatus, getSchemaStatus,
} from './services_supabase_supabaseClient'
import { guardCheck } from './services_apiConfigGuard'

const clsx = (...a) => a.filter(Boolean).join(' ')
const maskKey = (k) => { if (!k || k.length < 8) return '••••••••'; return k.slice(0,4) + '•'.repeat(Math.min(20, k.length - 8)) + k.slice(-4) }
const tsAgo = (ts) => { if (!ts) return null; const m=Math.round((Date.now()-new Date(ts).getTime())/60000); if(m<1) return 'just now'; if(m<60) return `${m}m ago`; const h=Math.round(m/60); return h<24?`${h}h ago`:`${Math.round(h/24)}d ago` }

// ── Status display ────────────────────────────────────────────
const STATUS_DISPLAY = {
  not_configured: { label: 'Not Configured', color: 'text-slate-500',   dot: 'bg-slate-600',  border: 'border-slate-800/40'  },
  configured:     { label: 'Configured',     color: 'text-cyan-300',    dot: 'bg-cyan-400',   border: 'border-cyan-500/20'   },
  testing:        { label: 'Testing…',       color: 'text-amber-300',   dot: 'bg-amber-400 animate-pulse', border: 'border-amber-500/20' },
  connected:      { label: 'Connected',      color: 'text-emerald-300', dot: 'bg-emerald-400 animate-pulse', border: 'border-emerald-500/20' },
  schema_missing: { label: 'Schema Missing', color: 'text-amber-300',   dot: 'bg-amber-400',  border: 'border-amber-500/20'  },
  schema_ready:   { label: 'Schema Ready',   color: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
  error:          { label: 'Error',          color: 'text-red-300',     dot: 'bg-red-400',    border: 'border-red-500/20'    },
  local_fallback: { label: 'Local Fallback', color: 'text-violet-300',  dot: 'bg-violet-400', border: 'border-violet-500/20' },
  unknown:        { label: 'Unknown',        color: 'text-slate-600',   dot: 'bg-slate-700',  border: 'border-slate-800/40'  },
}

function StatusPill({ status }) {
  const d = STATUS_DISPLAY[status] || STATUS_DISPLAY.unknown
  return (
    <span className={clsx('flex items-center gap-1.5 text-xs font-semibold', d.color)}>
      <span className={clsx('inline-flex rounded-full h-1.5 w-1.5 flex-shrink-0', d.dot)} />
      {d.label}
    </span>
  )
}

function AdvisoryBox({ children, variant = 'amber' }) {
  const styles = { amber: 'border-amber-500/20 bg-amber-500/5 text-slate-400', red: 'border-red-500/20 bg-red-500/5 text-red-300', green: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' }
  return (
    <div className={clsx('flex items-start gap-2 px-3 py-2.5 rounded-xl border', styles[variant] || styles.amber)}>
      <Icon name="AlertTriangle" size={12} className={variant === 'green' ? 'text-emerald-400 flex-shrink-0 mt-0.5' : 'text-amber-400 flex-shrink-0 mt-0.5'} />
      <p className="text-2xs leading-relaxed">{children}</p>
    </div>
  )
}

function SectionCard({ title, icon, iconColor = 'text-slate-500', children }) {
  return (
    <div className="bg-[#0d1426] border border-slate-800/60 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-800/40">
        <Icon name={icon} size={13} className={iconColor} />
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Safe input that masks sensitive text on blur ──────────────
function SecureInput({ label, value, onChange, placeholder, hint, readOnly, masked }) {
  const [focused, setFocused] = useState(false)
  const displayVal = (!focused && masked && value) ? maskKey(value) : value
  return (
    <div className="space-y-1.5">
      <label className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">{label}</label>
      <input
        type={masked && !focused ? 'password' : 'text'}
        value={displayVal}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={clsx(
          'w-full bg-slate-900/60 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-700',
          'focus:outline-none focus:border-cyan-500/40 transition-colors font-mono',
          readOnly ? 'border-slate-800/30 opacity-60 cursor-not-allowed' : 'border-slate-700/40 hover:border-slate-600/40'
        )}
      />
      {hint && <p className="text-2xs text-slate-700 leading-relaxed">{hint}</p>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function BackendSettings() {
  const demoLiveMode    = useDemoLiveStore(s => s.demoLiveMode?.mode ?? 'demo')
  const setBackendProvider = useDemoLiveStore(s => s.setBackendProvider)
  const setBackendStatus   = useDemoLiveStore(s => s.setBackendStatus)
  const backendReadiness   = useDemoLiveStore(s => s.backendReadiness)

  const bcStore = useBackendConfigStore()

  // ── Local form state ──────────────────────────────────────
  const [url,    setUrl]    = useState('')
  const [key,    setKey]    = useState('')
  const [saveMsg, setSaveMsg] = useState(null)
  const [testMsg, setTestMsg] = useState(null)
  const [guardMsg, setGuardMsg] = useState(null)
  const [provider, setProvider] = useState(bcStore.provider || 'none')

  // Load persisted Supabase settings into form on mount
  useEffect(() => {
    const s = getSupabaseSettings()
    setUrl(s.url || '')
    // Don't load raw key into form — show empty, let user re-enter or see masked
    setKey('')
    setProvider(bcStore.provider || 'none')
  }, [])

  // ── Guard + Save ──────────────────────────────────────────
  const handleSave = useCallback(() => {
    setSaveMsg(null); setGuardMsg(null)

    // 4P3X API Config Guard™ — validate URL
    if (url) {
      const urlGuard = guardCheck(url, 'supabase_url')
      if (urlGuard.blocked) {
        setGuardMsg(`4P3X API Config Guard™ blocked the URL: ${urlGuard.reason}`)
        return
      }
    }
    // 4P3X API Config Guard™ — validate key (allow anon key, block service role)
    if (key) {
      const keyGuard = guardCheck(key, 'supabase_anon_key')
      if (keyGuard.blocked) {
        setGuardMsg(`4P3X API Config Guard™ blocked this key: ${keyGuard.reason}`)
        return
      }
    }

    // Validate URL format
    if (url && url.trim()) {
      try { new URL(url.trim()) } catch {
        setSaveMsg({ type: 'error', text: 'Invalid Supabase URL format. Should be https://your-project.supabase.co' }); return
      }
    }

    // Save to supabaseClient SSOT
    saveSupabaseSettings({
      enabled:  !!(url.trim() && key.trim()),
      url:      url.trim(),
      anonKey:  key.trim(),
    })

    // Update backend config store (metadata only — no raw key)
    const configured = !!(url.trim() && key.trim())
    bcStore.markConfigured(!!url.trim(), !!key.trim(), key ? maskKey(key.trim()) : '')
    bcStore.setProvider(provider)

    // Update SSOT backendReadiness
    setBackendProvider(provider)
    if (!configured) setBackendStatus('not_configured')
    else setBackendStatus('configured')

    setSaveMsg({ type: 'success', text: 'Backend configuration saved safely. Key is stored locally — never transmitted.' })
    setKey('') // clear raw key from form after save
  }, [url, key, provider, bcStore, setBackendProvider, setBackendStatus])

  // ── Test connection ───────────────────────────────────────
  const handleTest = useCallback(async () => {
    setTestMsg(null)
    const settings = getSupabaseSettings()

    if (!settings.url || !settings.anonKey) {
      setTestMsg({ type: 'error', text: 'No configuration saved yet. Save your Supabase URL and anon key first.' }); return
    }

    bcStore.setTesting(true)
    setBackendStatus('testing')
    setTestMsg({ type: 'info', text: 'Testing connection…' })

    try {
      const result = await testSupabaseConnection(settings.url, settings.anonKey)
      if (result.ok) {
        // Check schema
        const schemaStatus = await getSchemaStatus()
        bcStore.setTestResult('connected', null, schemaStatus)
        setBackendStatus('connected')
        setTestMsg({
          type: 'success',
          text: schemaStatus === 'schema_ready'
            ? '✓ Connected. Schema ready. Backend foundation active.'
            : schemaStatus === 'schema_missing'
              ? '✓ Connected — but schema is not deployed yet. Run the SQL file in your Supabase SQL Editor.'
              : '✓ Connected to Supabase.'
        })
      } else {
        bcStore.setTestResult('error', result.error || 'Unknown error', 'unknown')
        setBackendStatus('error')
        setTestMsg({ type: 'error', text: `Connection failed: ${result.error || 'Check URL, anon key, network, and CORS settings.'}` })
      }
    } catch (e) {
      bcStore.setTestResult('error', e.message, 'unknown')
      setBackendStatus('error')
      setTestMsg({ type: 'error', text: `Test error: ${e.message}` })
    }
  }, [bcStore, setBackendStatus])

  // ── Reset config ──────────────────────────────────────────
  const handleReset = useCallback(() => {
    saveSupabaseSettings({ enabled: false, url: '', anonKey: '' })
    bcStore.resetConfig()
    setBackendProvider('none')
    setBackendStatus('not_configured')
    setUrl(''); setKey(''); setProvider('none')
    setSaveMsg({ type: 'info', text: 'Configuration reset. Demo/local fallback remains active.' })
    setTestMsg(null); setGuardMsg(null)
  }, [bcStore, setBackendProvider, setBackendStatus])

  const cs  = bcStore.connectionStatus
  const csd = STATUS_DISPLAY[cs] || STATUS_DISPLAY.unknown
  const isDemo = demoLiveMode === 'demo'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bold text-xl text-white">Backend Settings</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Big V's Best Routes™ · Supabase Foundation · Run 11 · 4P3X API Config Guard™
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusPill status={cs} />
            <DemoLiveToggle />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Global advisory */}
        <AdvisoryBox>
          Only frontend-safe Supabase anon/public configuration is allowed in the app. Service role keys, database URLs, JWT secrets, private keys, webhook secrets, and admin tokens must never be stored in frontend code.
        </AdvisoryBox>

        {/* Demo Mode notice */}
        {isDemo && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <Icon name="Eye" size={13} className="text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-300">Demo Mode — backend not required</p>
              <p className="text-2xs text-slate-500 mt-0.5">Switch to Live Mode to activate the backend connection. Demo Mode always remains local/demo-safe.</p>
            </div>
            <DemoLiveToggle compact />
          </div>
        )}

        {/* ── Backend Provider Card ───────────────────────── */}
        <SectionCard title="Backend Provider" icon="Database" iconColor="text-cyan-400">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-2xs text-slate-500 font-semibold uppercase tracking-wider">Provider</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40"
              >
                <option value="none">None — local/demo fallback</option>
                <option value="supabase">Supabase (recommended — Run 11)</option>
                <option value="firebase">Firebase (future run)</option>
                <option value="aws_custom">AWS / Custom Backend (future run)</option>
                <option value="rest_custom">Generic REST API / Custom Endpoint (future run)</option>
                <option value="local_only">Local-Only Fallback</option>
              </select>
            </div>

            {provider !== 'supabase' && provider !== 'none' && (
              <AdvisoryBox>
                Only Supabase is fully configured in Run 11. Other providers are listed for future runs. Selecting them will not enable real backend sync yet.
              </AdvisoryBox>
            )}

            <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border', csd.border)}>
              <span className={clsx('flex-shrink-0 inline-flex rounded-full h-2.5 w-2.5', STATUS_DISPLAY[cs]?.dot || 'bg-slate-700')} />
              <div className="flex-1">
                <p className={clsx('text-xs font-bold', STATUS_DISPLAY[cs]?.color || 'text-slate-400')}>{STATUS_DISPLAY[cs]?.label || 'Unknown'}</p>
                {bcStore.lastTestAt && <p className="text-2xs text-slate-700 mt-0.5">Last tested: {tsAgo(bcStore.lastTestAt)}</p>}
                {bcStore.lastTestError && <p className="text-2xs text-red-400 mt-0.5">{bcStore.lastTestError}</p>}
              </div>
              {bcStore.schemaStatus && bcStore.schemaStatus !== 'unknown' && (
                <StatusPill status={bcStore.schemaStatus === 'schema_ready' ? 'schema_ready' : 'schema_missing'} />
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Supabase Config Card ────────────────────────── */}
        {provider === 'supabase' && (
          <SectionCard title="Supabase Configuration" icon="Zap" iconColor="text-emerald-400">
            <div className="space-y-4">
              <SecureInput
                label="Supabase Project URL"
                value={url}
                onChange={setUrl}
                placeholder="https://your-project.supabase.co"
                hint="Your Supabase project URL. Found in Supabase Dashboard → Settings → API."
              />

              <SecureInput
                label="Supabase Anon / Public Key"
                value={key}
                onChange={setKey}
                placeholder="Enter anon/public key to update…"
                masked
                hint="Anon/public key only. Never the service role key. Found in Supabase Dashboard → Settings → API → anon public."
              />

              {bcStore.keyConfigured && !key && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/30 bg-slate-900/30">
                  <Icon name="Key" size={11} className="text-slate-600" />
                  <p className="text-2xs text-slate-600">Key configured: <span className="font-mono text-slate-500">{bcStore.keyMasked || '••••••••'}</span></p>
                </div>
              )}

              {/* Security note — no service role key */}
              <div className="px-3 py-2.5 rounded-xl border border-red-500/15 bg-red-500/5">
                <p className="text-2xs text-red-300 font-semibold mb-1">🔒 Never enter the Service Role Key here</p>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  The service role key bypasses Row Level Security and must never be stored in frontend code. Only the anon/public key is allowed. The 4P3X API Config Guard™ will block service-role-looking values.
                </p>
              </div>

              {/* Guard warning */}
              {guardMsg && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
                  <Icon name="ShieldX" size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{guardMsg}</p>
                </div>
              )}

              {/* Save message */}
              {saveMsg && (
                <div className={clsx('flex items-start gap-2 px-3 py-2.5 rounded-xl border', saveMsg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : saveMsg.type === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-slate-700/40 bg-slate-900/40')}>
                  <Icon name={saveMsg.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={12} className={saveMsg.type === 'success' ? 'text-emerald-400 flex-shrink-0 mt-0.5' : 'text-amber-400 flex-shrink-0 mt-0.5'} />
                  <p className={clsx('text-xs leading-relaxed', saveMsg.type === 'success' ? 'text-emerald-300' : 'text-amber-300')}>{saveMsg.text}</p>
                </div>
              )}

              {/* Test message */}
              {testMsg && (
                <div className={clsx('flex items-start gap-2 px-3 py-2.5 rounded-xl border', testMsg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' : testMsg.type === 'error' ? 'border-red-500/20 bg-red-500/5' : 'border-slate-700/40 bg-slate-900/40')}>
                  <Icon name={testMsg.type === 'success' ? 'CheckCircle' : testMsg.type === 'error' ? 'XCircle' : 'Loader2'} size={12} className={testMsg.type === 'success' ? 'text-emerald-400 flex-shrink-0 mt-0.5' : testMsg.type === 'error' ? 'text-red-400 flex-shrink-0 mt-0.5' : 'text-amber-400 flex-shrink-0 mt-0.5 animate-spin'} />
                  <p className={clsx('text-xs leading-relaxed', testMsg.type === 'success' ? 'text-emerald-300' : testMsg.type === 'error' ? 'text-red-300' : 'text-slate-400')}>{testMsg.text}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/8 text-sm text-cyan-300 hover:bg-cyan-500/12 font-semibold transition-all active:scale-95">
                  <Icon name="Save" size={13} /> Save Configuration
                </button>
                <button onClick={handleTest} disabled={bcStore.isTestingNow}
                  className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                    bcStore.isTestingNow ? 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300 hover:bg-emerald-500/12 active:scale-95')}>
                  <Icon name={bcStore.isTestingNow ? 'Loader2' : 'Wifi'} size={13} className={bcStore.isTestingNow ? 'animate-spin' : ''} />
                  {bcStore.isTestingNow ? 'Testing…' : 'Test Connection'}
                </button>
                <button onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/40 bg-slate-900/40 text-sm text-slate-400 hover:text-white transition-colors">
                  <Icon name="RotateCcw" size={13} /> Reset
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Schema Status Card ───────────────────────────── */}
        <SectionCard title="Database Schema Status" icon="Table" iconColor="text-violet-400">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-semibold">SQL Schema</p>
              <StatusPill status={bcStore.schemaStatus === 'schema_ready' ? 'schema_ready' : bcStore.schemaStatus === 'schema_missing' ? 'schema_missing' : 'unknown'} />
            </div>

            <p className="text-2xs text-slate-500 leading-relaxed">
              The Big V's Best Routes™ SQL schema (Run 11) includes 29 tables with Row Level Security (RLS) enabled on all operational tables.
            </p>

            <div className="px-3 py-3 rounded-xl border border-slate-800/40 bg-slate-900/30 space-y-2">
              <p className="text-2xs text-slate-500 font-semibold">To deploy the schema:</p>
              <ol className="space-y-1.5 list-none">
                {['Open your Supabase project dashboard', 'Go to SQL Editor', 'Open supabase/big-vs-best-routes-schema.sql from this project', 'Paste and run the full SQL file', 'Click "Test Connection" above to verify'].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xs text-slate-500 font-bold">{i+1}</span>
                    <p className="text-2xs text-slate-400 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
              <p className="text-2xs text-amber-300 font-semibold mb-0.5">RLS is enabled on all operational Supabase tables.</p>
              <p className="text-2xs text-slate-600">Row Level Security ensures users can only access data belonging to their organisation.</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[['29', 'Tables'], ['RLS', 'Enabled'], ['Run 12+', 'Real-Time']].map(([v, l]) => (
                <div key={l} className="px-3 py-2 rounded-lg border border-slate-800/40 bg-slate-900/30 text-center">
                  <p className="text-sm font-bold text-white">{v}</p>
                  <p className="text-2xs text-slate-600">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Local Fallback Status ────────────────────────── */}
        <SectionCard title="Local / Offline Fallback" icon="HardDrive" iconColor="text-emerald-400">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-300">Always Active</p>
            </div>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Demo Mode and local/offline fallback remain active regardless of backend configuration. All SSOT data is persisted in browser localStorage. No backend is required for Demo Mode operation.
            </p>
            <SyncStatusPanel />
          </div>
        </SectionCard>

        {/* ── Run 12 / 13 Notice ───────────────────────────── */}
        <SectionCard title="Real-Time Sync — Future Runs" icon="Clock" iconColor="text-slate-500">
          <div className="space-y-3">
            {[
              { run: 'Run 12', icon: 'Truck', title: 'Driver PWA Real-Time Sync', text: 'Real-time GPS, trip, checklist, and incident data from Driver PWA to dashboard. Requires Supabase backend configured above.' },
              { run: 'Run 13', icon: 'Tablet', title: 'Fleet Controller PWA Real-Time Sync', text: 'Real-time controller actions, notes, incident reviews, and compliance updates to dashboard. Requires Run 12.' },
            ].map(item => (
              <div key={item.run} className="flex items-start gap-3 px-3 py-3 rounded-xl border border-slate-800/40 bg-slate-900/20">
                <Icon name={item.icon} size={13} className="text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-2xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500 font-bold">{item.run}</span>
                    <p className="text-xs font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="text-2xs text-slate-600 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Env Vars Note ────────────────────────────────── */}
        <SectionCard title="Environment Variables (Optional)" icon="Terminal" iconColor="text-slate-500">
          <div className="space-y-3">
            <p className="text-2xs text-slate-500 leading-relaxed">
              For production/CI deployments, you can set env vars instead of using the Settings UI. These are baked into the build and used automatically if no localStorage config is found.
            </p>
            <div className="px-3 py-3 rounded-xl border border-slate-800/40 bg-slate-950/50 font-mono">
              <p className="text-xs text-cyan-300">VITE_SUPABASE_URL=https://your-project.supabase.co</p>
              <p className="text-xs text-cyan-300">VITE_SUPABASE_ANON_KEY=your-anon-public-key</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-red-500/15 bg-red-500/5">
              <p className="text-2xs text-red-300 leading-relaxed">Never add SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL to .env files that are committed to a public repository.</p>
            </div>
            <p className="text-2xs text-slate-700">See .env.example in the project root for the template.</p>
          </div>
        </SectionCard>

        <p className="text-center text-2xs text-slate-800 pb-2">
          Big V's Best Routes™ · Backend Settings · Run 11 · 4P3X API Config Guard™ · Advisory only
        </p>
      </div>
    </div>
  )
}
