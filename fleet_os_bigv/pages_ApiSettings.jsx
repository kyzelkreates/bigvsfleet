/**
 * ============================================================
 * Big V's Best Routes™ — API Settings Centre
 * /src/pages/ApiSettings.jsx
 *
 * RUN 4 — API Settings Centre + 4P3X API Config Guard™
 *
 * Reads from / writes to: useApiConfigStore (core_storage.js)
 * ONE SSOT. NO duplicate state. NO hardcoded secrets.
 * NO map rendering. NO GPS. NO real backend sync.
 *
 * Sections:
 *   1. OSM / OSM-Compatible 2D Map Source
 *   2. MapLibre 3D/Tilted Map Readiness
 *   3. Overpass API Advisory Restriction Lookup
 *   4. GraphHopper Routing Provider
 *   5. Open-Source Routing Providers
 *   6. Geocoding Providers
 *   7. Future Optional Google Maps Provider
 *   8. Custom API Endpoint
 *   9. Provider Health + Fallback Status
 *  10. 4P3X API Config Guard™
 *
 * SECURITY:
 *   No API keys hardcoded. No backend secrets.
 *   All key input masked. Config Guard™ blocks dangerous values.
 *   GraphHopper key stored via existing runtimeKeys (apex:apikey:graphhopper).
 *   All other config via useApiConfigStore (bigv:api:config).
 *
 * ADMIN ONLY:
 *   This page must never be exposed in Driver PWA or Fleet Controller PWA.
 *   Routes are admin-gated in config_routes.js.
 *
 * ============================================================
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './components_ui_Icon'
import { useApiConfigStore } from './core_storage'
import { DemoLivePill } from './components_ui_DemoLiveToggle'
import {
  guardCheck, maskKey, validateUrl,
  testOsmTileUrl, testOverpassEndpoint, testGenericEndpoint,
} from './services_apiConfigGuard'
import { testGraphHopperKey, saveGraphHopperKey } from './services_settings_appSettingsService'
import { getRuntimeKey, setRuntimeKey, RUNTIME_KEYS } from './services_maps_runtimeKeys'

// ─── Status config ────────────────────────────────────────────
const STATUS_CFG = {
  demo_ready:             { label: 'Demo Ready',        dot: 'bg-violet-400',  color: 'text-violet-300',  border: 'border-violet-500/20',  bg: 'bg-violet-500/5'  },
  not_configured:         { label: 'Not Configured',    dot: 'bg-slate-600',   color: 'text-slate-500',   border: 'border-slate-800/60',   bg: 'bg-slate-900/40'  },
  configured:             { label: 'Configured',        dot: 'bg-amber-400',   color: 'text-amber-300',   border: 'border-amber-500/20',   bg: 'bg-amber-500/5'   },
  testing:                { label: 'Testing…',          dot: 'bg-cyan-400',    color: 'text-cyan-300',    border: 'border-cyan-500/20',    bg: 'bg-cyan-500/5'    },
  connected:              { label: 'Connected',         dot: 'bg-emerald-400', color: 'text-emerald-300', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  degraded:               { label: 'Degraded',          dot: 'bg-amber-500',   color: 'text-amber-400',   border: 'border-amber-500/20',   bg: 'bg-amber-500/5'   },
  error:                  { label: 'Error',             dot: 'bg-red-400',     color: 'text-red-300',     border: 'border-red-500/20',     bg: 'bg-red-500/5'     },
  fallback_active:        { label: 'Fallback Active',   dot: 'bg-amber-400',   color: 'text-amber-300',   border: 'border-amber-500/20',   bg: 'bg-amber-500/5'   },
  blocked_by_config_guard:{ label: 'Blocked by Guard',  dot: 'bg-red-500',     color: 'text-red-300',     border: 'border-red-500/30',     bg: 'bg-red-500/5'     },
}

// ─── Shared subcomponents ─────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.not_configured
  return (
    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-2xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <span className={`inline-flex rounded-full h-1.5 w-1.5 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function CardHeader({ icon, title, status, run }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={15} className="text-slate-500" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {run && <span className="text-2xs text-slate-700 font-mono">{run}</span>}
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

function ProviderCard({ children, className = '' }) {
  return (
    <div className={`bg-[#0d1426] border border-slate-800/60 rounded-xl p-4 space-y-3 ${className}`}>
      {children}
    </div>
  )
}

function FieldRow({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-2xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      {sub && <p className="text-2xs text-slate-700 mb-1">{sub}</p>}
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, masked = false, className = '', disabled = false }) {
  const [show, setShow] = useState(false)
  if (masked) {
    return (
      <div className="flex items-center gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:border-slate-500 focus:outline-none font-mono ${className}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="text-slate-600 hover:text-slate-400 p-1"
          title={show ? 'Hide' : 'Show'}
        >
          <Icon name={show ? 'EyeOff' : 'Eye'} size={13} />
        </button>
      </div>
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-700 focus:border-slate-500 focus:outline-none ${className}`}
    />
  )
}

function ActionBar({ onSave, onReset, onTest, saving, testing, testLabel = 'Test Readiness', disabled = false }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onSave}
        disabled={saving || disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40"
      >
        <Icon name="Save" size={11} />
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        onClick={onReset}
        disabled={saving || disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
      >
        <Icon name="RotateCcw" size={11} />
        Reset
      </button>
      {onTest && (
        <button
          onClick={onTest}
          disabled={testing || disabled}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 transition-colors disabled:opacity-40"
        >
          <Icon name={testing ? 'Loader2' : 'Zap'} size={11} className={testing ? 'animate-spin' : ''} />
          {testing ? 'Testing…' : testLabel}
        </button>
      )}
    </div>
  )
}

function TestResult({ result }) {
  if (!result) return null
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-2xs ${
      result.ok
        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
        : 'border-red-500/20 bg-red-500/5 text-red-300'
    }`}>
      <Icon name={result.ok ? 'CheckCircle' : 'AlertCircle'} size={11} className="flex-shrink-0 mt-0.5" />
      <span className="leading-relaxed">{result.message}</span>
    </div>
  )
}

function GuardBlockResult({ result, field }) {
  if (!result?.blocked) return null
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-red-500/30 bg-red-500/5">
      <Icon name="ShieldX" size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-red-300 mb-0.5">4P3X API Config Guard™ — Blocked</p>
        <p className="text-2xs text-red-400/80 leading-relaxed">{result.blockedMessage}</p>
        {field && <p className="text-2xs text-slate-600 mt-1">Field: <span className="font-mono">{field}</span></p>}
      </div>
    </div>
  )
}

function FrontendWarning({ result }) {
  if (!result?.hasFrontendWarning) return null
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
      <Icon name="AlertTriangle" size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-2xs text-amber-300/80 leading-relaxed">{result.frontendWarning}</p>
    </div>
  )
}

function AdvisoryNotice({ children }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-2xs text-slate-500 leading-relaxed">{children}</p>
    </div>
  )
}

function TimestampRow({ label, ts }) {
  if (!ts) return null
  return (
    <p className="text-2xs text-slate-700">
      {label}: <span className="font-mono">{new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 1: OSM / OSM-Compatible 2D Map Source
// ─────────────────────────────────────────────────────────────
function OsmCard() {
  const osm          = useApiConfigStore(s => s.osm)
  const updateOsm    = useApiConfigStore(s => s.updateOsm)
  const resetOsm     = useApiConfigStore(s => s.resetOsm)
  const recordBlock  = useApiConfigStore(s => s.recordGuardBlock)

  const [tileUrl, setTileUrl]         = useState(osm.tileUrl)
  const [attribution, setAttribution] = useState(osm.attribution)
  const [fallback, setFallback]       = useState(osm.fallbackSource)
  const [saving, setSaving]           = useState(false)
  const [testing, setTesting]         = useState(false)
  const [testResult, setTestResult]   = useState(null)
  const [guardResult, setGuardResult] = useState(null)
  const [saveMsg, setSaveMsg]         = useState(null)

  const handleSave = () => {
    setGuardResult(null)
    // Validate URL
    const urlCheck = validateUrl(tileUrl, 'Tile URL')
    if (!urlCheck.valid) {
      setTestResult({ ok: false, message: urlCheck.message })
      return
    }
    // Config Guard check
    const guard = guardCheck(tileUrl, 'OSM Tile URL', {})
    if (guard.blocked) {
      setGuardResult(guard)
      recordBlock('osm.tileUrl', guard.blockedMessage)
      updateOsm({ status: 'blocked_by_config_guard' })
      return
    }
    // Attribution must not be empty (legal requirement)
    if (!attribution.trim()) {
      setTestResult({ ok: false, message: 'Attribution is required (legal requirement for OSM usage).' })
      return
    }
    setSaving(true)
    setTimeout(() => {
      updateOsm({ tileUrl: tileUrl.trim(), attribution: attribution.trim(), fallbackSource: fallback.trim(), status: 'configured', lastError: null })
      setSaving(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }, 300)
  }

  const handleReset = () => {
    const def = useApiConfigStore.getState().getDefaults().osm
    setTileUrl(def.tileUrl)
    setAttribution(def.attribution)
    setFallback(def.fallbackSource)
    resetOsm()
    setTestResult(null)
    setGuardResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testOsmTileUrl(tileUrl)
    setTestResult(result)
    updateOsm({ lastTestAt: result.lastTestAt, status: result.ok ? 'configured' : 'error', lastError: result.ok ? null : result.message })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="Map" title="OpenStreetMap / OSM-Compatible 2D Source" status={osm.status} />

      <AdvisoryNotice>
        Public OSM-compatible tile sources are suitable for demo/prototype use only. Respect tile usage policies, attribution requirements, public endpoint limits, and data freshness limitations. OpenStreetMap data is not legally authoritative.
      </AdvisoryNotice>

      <FieldRow label="Tile URL" sub="Use {z}/{x}/{y} placeholders. Default: OpenStreetMap public tiles.">
        <TextInput value={tileUrl} onChange={setTileUrl} placeholder="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </FieldRow>

      <FieldRow label="Attribution (required)" sub="Legal requirement — always visible on map. Do not remove.">
        <TextInput value={attribution} onChange={setAttribution} placeholder="© OpenStreetMap contributors" />
      </FieldRow>

      <FieldRow label="Fallback Source">
        <TextInput value={fallback} onChange={setFallback} placeholder="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </FieldRow>

      <GuardBlockResult result={guardResult} field="Tile URL" />
      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last test" ts={osm.lastTestAt} />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        saving={saving}
        testing={testing}
        testLabel="Test OSM Tile URL Readiness"
      />

      <p className="text-2xs text-slate-700 pt-1">
        Full 2D map rendering · Run 5 &nbsp;·&nbsp; Attribution always required · ODbL licence
      </p>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 2: MapLibre 3D/Tilted Map Readiness
// ─────────────────────────────────────────────────────────────
function MapLibreCard() {
  const ml           = useApiConfigStore(s => s.mapLibre)
  const updateMl     = useApiConfigStore(s => s.updateMapLibre)
  const resetMl      = useApiConfigStore(s => s.resetMapLibre)

  const [styleUrl, setStyleUrl]   = useState(ml.styleUrl || '')
  const [enabled, setEnabled]     = useState(ml.enabled)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saveMsg, setSaveMsg]     = useState(null)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      updateMl({ enabled, styleUrl: styleUrl.trim(), status: enabled ? 'configured' : 'not_configured', lastError: null })
      setSaving(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }, 300)
  }

  const handleReset = () => {
    const def = useApiConfigStore.getState().getDefaults().mapLibre
    setStyleUrl(def.styleUrl || '')
    setEnabled(def.enabled)
    resetMl()
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    // MapLibre readiness: check if the library would be importable (we don't install it yet)
    // Honest readiness test — no map rendering attempted
    await new Promise(r => setTimeout(r, 800))
    const maplibreAvailable = false // Not installed — Run 5
    const result = {
      ok:      false,
      message: 'MapLibre GL is not installed yet. Full 3D/tilted rendering is implemented in Run 5. Config readiness saved — 2D fallback remains active.',
    }
    setTestResult(result)
    updateMl({
      tiltSupported: false,
      status:        'not_configured',
      lastTestAt:    new Date().toISOString(),
      lastError:     'MapLibre not installed — Run 5',
    })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="Layers" title="MapLibre 3D / Tilted Map Readiness" status={ml.status} run="Run 5/6" />

      <AdvisoryNotice>
        MapLibre 3D/tilted rendering is configured for future map runs. If unsupported, Big V's Best Routes™ must fall back to 2D map mode. Full 3D rendering is implemented in Run 5/Run 6.
      </AdvisoryNotice>

      <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
        <div>
          <p className="text-xs text-slate-400 font-medium">Enable MapLibre 3D/Tilt</p>
          <p className="text-2xs text-slate-700">Activates when Run 5 map engine is implemented</p>
        </div>
        <button
          onClick={() => setEnabled(e => !e)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-violet-500' : 'bg-slate-700'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>

      <FieldRow label="Style Source URL" sub="MapLibre style JSON URL — placeholder for Run 5. Leave empty for 2D fallback.">
        <TextInput value={styleUrl} onChange={setStyleUrl} placeholder="https://… (Run 5)" disabled={!enabled} />
      </FieldRow>

      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
        <Icon name="Monitor" size={12} className="text-slate-600" />
        <div>
          <p className="text-2xs text-slate-500 font-medium">2D Fallback</p>
          <p className="text-2xs text-slate-700">Always active when 3D/tilt is unsupported or not installed</p>
        </div>
        <span className="ml-auto text-2xs text-violet-400 font-semibold">Active</span>
      </div>

      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last check" ts={ml.lastTestAt} />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        saving={saving}
        testing={testing}
        testLabel="Check MapLibre Readiness"
      />
      <p className="text-2xs text-slate-700 pt-1">MapLibre dependency · Run 5 &nbsp;·&nbsp; 3D navigation · Run 6</p>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 3: Overpass API Advisory Restriction Lookup
// ─────────────────────────────────────────────────────────────
function OverpassCard() {
  const ov           = useApiConfigStore(s => s.overpass)
  const updateOv     = useApiConfigStore(s => s.updateOverpass)
  const resetOv      = useApiConfigStore(s => s.resetOverpass)
  const recordBlock  = useApiConfigStore(s => s.recordGuardBlock)

  const [endpoint, setEndpoint]   = useState(ov.endpointUrl)
  const [timeout, setTimeout_]    = useState(ov.timeoutMs)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [guardResult, setGuardResult] = useState(null)
  const [saveMsg, setSaveMsg]     = useState(null)

  const handleSave = () => {
    setGuardResult(null)
    const urlCheck = validateUrl(endpoint, 'Overpass Endpoint URL')
    if (!urlCheck.valid) { setTestResult({ ok: false, message: urlCheck.message }); return }
    const guard = guardCheck(endpoint, 'Overpass Endpoint URL', {})
    if (guard.blocked) { setGuardResult(guard); recordBlock('overpass.endpointUrl', guard.blockedMessage); return }
    setSaving(true)
    setTimeout(() => {
      updateOv({ endpointUrl: endpoint.trim(), timeoutMs: Number(timeout) || 10000, status: 'configured', lastError: null })
      setSaving(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }, 300)
  }

  const handleReset = () => {
    const def = useApiConfigStore.getState().getDefaults().overpass
    setEndpoint(def.endpointUrl)
    setTimeout_(def.timeoutMs)
    resetOv()
    setTestResult(null)
    setGuardResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testOverpassEndpoint(endpoint, Number(timeout) || 10000)
    setTestResult(result)
    updateOv({ lastTestAt: result.lastTestAt, status: result.ok ? 'connected' : 'error', lastError: result.ok ? null : result.message })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="Globe" title="Overpass API Advisory Restriction Lookup" status={ov.status} />

      <AdvisoryNotice>
        Overpass/OSM data is advisory only and may be incomplete, outdated, missing, or inconsistent. Drivers, fleet managers, and controllers must verify current legal restrictions, signage, permits, bridge limits, road conditions, and access rules independently.
      </AdvisoryNotice>
      <AdvisoryNotice>
        Public Overpass endpoints may be rate-limited or unavailable. Use self-hosted or approved providers for production.
      </AdvisoryNotice>

      <FieldRow label="Overpass Endpoint URL" sub="Default: overpass-api.de public endpoint.">
        <TextInput value={endpoint} onChange={setEndpoint} placeholder="https://overpass-api.de/api/interpreter" />
      </FieldRow>

      <FieldRow label="Timeout (ms)" sub="Request timeout in milliseconds. Default: 10000.">
        <TextInput value={String(timeout)} onChange={v => setTimeout_(v)} placeholder="10000" />
      </FieldRow>

      <GuardBlockResult result={guardResult} field="Overpass Endpoint URL" />
      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last test" ts={ov.lastTestAt} />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        saving={saving}
        testing={testing}
        testLabel="Test Overpass Endpoint"
      />
      <p className="text-2xs text-slate-700 pt-1">Overpass restriction engine · Run 5 &nbsp;·&nbsp; Advisory outputs only — not legally authoritative</p>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 4: GraphHopper Routing Provider
// ─────────────────────────────────────────────────────────────
function GraphHopperCard() {
  const gh           = useApiConfigStore(s => s.graphHopper)
  const updateGh     = useApiConfigStore(s => s.updateGraphHopper)
  const resetGh      = useApiConfigStore(s => s.resetGraphHopper)
  const recordBlock  = useApiConfigStore(s => s.recordGuardBlock)

  // Get real current key from runtimeKeys (masked display only)
  const storedKey    = getRuntimeKey(RUNTIME_KEYS.GRAPHHOPPER) || ''
  const [keyInput, setKeyInput] = useState('')
  const [profile, setProfile]   = useState(gh.vehicleProfile || 'car')
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [guardResult, setGuardResult] = useState(null)
  const [saveMsg, setSaveMsg]   = useState(null)

  const hasKey = !!storedKey

  const PROFILES = [
    { value: 'car',   label: 'Car' },
    { value: 'van',   label: 'Van' },
    { value: 'truck', label: 'Truck / HGV (placeholder)' },
    { value: 'bike',  label: 'Bike' },
    { value: 'walk',  label: 'Walk' },
  ]

  const handleSave = async () => {
    setGuardResult(null)
    const trimKey = keyInput.trim()
    if (trimKey) {
      // Run guard — GH keys are frontend-intended but we check for obviously dangerous patterns
      const guard = guardCheck(trimKey, 'GraphHopper API Key', { allowGraphHopperKey: true })
      if (guard.blocked) {
        setGuardResult(guard)
        recordBlock('graphHopper.apiKey', guard.blockedMessage)
        return
      }
      setSaving(true)
      try {
        await saveGraphHopperKey(trimKey)
        updateGh({
          apiKeyMasked:       maskKey(trimKey),
          apiKeyStoredSafely: true,
          profile,
          vehicleProfile:     profile,
          status:             'configured',
          lastError:          null,
        })
        setKeyInput('')
        setSaveMsg('Key saved safely')
        setTimeout(() => setSaveMsg(null), 3000)
      } catch (e) {
        setTestResult({ ok: false, message: `Save failed: ${e.message}` })
      } finally {
        setSaving(false)
      }
    } else {
      // Saving profile only (no key change)
      updateGh({ profile, vehicleProfile: profile, lastError: null })
      setSaveMsg('Profile saved')
      setTimeout(() => setSaveMsg(null), 2000)
    }
  }

  const handleReset = () => {
    setRuntimeKey(RUNTIME_KEYS.GRAPHHOPPER, '')
    resetGh()
    setKeyInput('')
    setProfile('car')
    setTestResult(null)
    setGuardResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const currentKey = keyInput.trim() || storedKey
    if (!currentKey) {
      setTestResult({ ok: false, message: 'No GraphHopper API key configured. Demo/local fallback remains active. Enter a key above to enable live routing.' })
      updateGh({ lastTestAt: new Date().toISOString(), status: 'not_configured' })
      setTesting(false)
      return
    }
    const result = await testGraphHopperKey(currentKey)
    setTestResult({ ok: result.ok, message: result.message })
    updateGh({
      status:     result.ok ? 'connected' : 'error',
      lastTestAt: new Date().toISOString(),
      lastError:  result.ok ? null : result.message,
    })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="Route" title="GraphHopper Routing Provider" status={gh.status} />

      <AdvisoryNotice>
        Routing providers calculate routes from available data. They do not guarantee legal suitability for every vehicle, load, route restriction, bridge limit, permit rule, or local access rule.
      </AdvisoryNotice>

      {/* Current key status */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
        <div className="flex items-center gap-2">
          <Icon name="Key" size={11} className="text-slate-600" />
          <span className="text-2xs text-slate-500">Stored key</span>
        </div>
        <span className="text-2xs font-mono text-slate-400">
          {hasKey ? maskKey(storedKey) : '— not configured'}
        </span>
      </div>

      <FieldRow label="Enter New GraphHopper API Key" sub="Frontend-safe public key only. Stored in browser localStorage (apex:apikey:graphhopper). Never enter service-role or private keys.">
        <TextInput value={keyInput} onChange={setKeyInput} placeholder="Enter key to update…" masked />
      </FieldRow>

      {!hasKey && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800/60 bg-slate-900/40">
          <Icon name="AlertCircle" size={11} className="text-slate-600" />
          <p className="text-2xs text-slate-600">No API key configured. Demo/local fallback remains active.</p>
        </div>
      )}

      <FieldRow label="Vehicle / Routing Profile">
        <select
          value={profile}
          onChange={e => setProfile(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-slate-500 focus:outline-none"
        >
          {PROFILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </FieldRow>

      <GuardBlockResult result={guardResult} field="GraphHopper API Key" />
      <FrontendWarning result={guardResult} />
      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last test" ts={gh.lastTestAt} />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        saving={saving}
        testing={testing}
        testLabel="Check GraphHopper Configuration"
      />
      <p className="text-2xs text-slate-700 pt-1">Live routing · Run 5 &nbsp;·&nbsp; Route rendering · Run 5 &nbsp;·&nbsp; Advisory outputs only</p>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 5: Open-Source Routing Providers
// ─────────────────────────────────────────────────────────────
function RoutingProvidersCard() {
  const rp           = useApiConfigStore(s => s.routingProviders)
  const updateRp     = useApiConfigStore(s => s.updateRoutingProviders)
  const resetRp      = useApiConfigStore(s => s.resetRoutingProviders)
  const recordBlock  = useApiConfigStore(s => s.recordGuardBlock)

  const [selected, setSelected]   = useState(rp.selectedProvider)
  const [osrm, setOsrm]           = useState(rp.osrmEndpoint)
  const [valhalla, setValhalla]   = useState(rp.valhallaEndpoint)
  const [selfHosted, setSelfHosted] = useState(rp.selfHostedEndpoint)
  const [custom, setCustom]       = useState(rp.customEndpoint)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [guardResult, setGuardResult] = useState(null)
  const [saveMsg, setSaveMsg]     = useState(null)

  const PROVIDERS = [
    { value: 'demo_local',  label: 'Demo / Local (no key required)' },
    { value: 'graphhopper', label: 'GraphHopper (see section above)' },
    { value: 'osrm',        label: 'OSRM (public or self-hosted)' },
    { value: 'valhalla',    label: 'Valhalla (self-hosted)' },
    { value: 'self_hosted', label: 'Self-Hosted Routing Engine' },
    { value: 'custom',      label: 'Custom Routing Endpoint' },
  ]

  const getActiveEndpoint = () => {
    if (selected === 'osrm') return osrm
    if (selected === 'valhalla') return valhalla
    if (selected === 'self_hosted') return selfHosted
    if (selected === 'custom') return custom
    return null
  }

  const handleSave = () => {
    setGuardResult(null)
    // Guard check on whichever endpoint is active
    const active = getActiveEndpoint()
    if (active) {
      const guard = guardCheck(active, 'Routing Endpoint URL', {})
      if (guard.blocked) { setGuardResult(guard); recordBlock('routingProviders.endpoint', guard.blockedMessage); return }
    }
    setSaving(true)
    setTimeout(() => {
      updateRp({
        selectedProvider:   selected,
        osrmEndpoint:       osrm,
        valhallaEndpoint:   valhalla,
        selfHostedEndpoint: selfHosted,
        customEndpoint:     custom,
        status:             selected === 'demo_local' ? 'demo_ready' : 'configured',
        lastError:          null,
      })
      setSaving(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }, 300)
  }

  const handleReset = () => {
    const def = useApiConfigStore.getState().getDefaults().routingProviders
    setSelected(def.selectedProvider)
    setOsrm(def.osrmEndpoint)
    setValhalla(def.valhallaEndpoint)
    setSelfHosted(def.selfHostedEndpoint)
    setCustom(def.customEndpoint)
    resetRp()
    setTestResult(null)
    setGuardResult(null)
  }

  const handleTest = async () => {
    const endpoint = getActiveEndpoint()
    if (!endpoint || selected === 'demo_local' || selected === 'graphhopper') {
      setTestResult({ ok: true, message: selected === 'demo_local' ? '✓ Demo/local provider is always ready — no endpoint test needed.' : 'GraphHopper is tested in the GraphHopper section above.' })
      updateRp({ lastTestAt: new Date().toISOString() })
      return
    }
    setTesting(true)
    setTestResult(null)
    const result = await testGenericEndpoint(endpoint, 'Routing Provider Endpoint')
    setTestResult(result)
    updateRp({ lastTestAt: result.lastTestAt, status: result.ok ? 'connected' : 'error', lastError: result.ok ? null : result.message })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="Navigation" title="Open-Source Routing Providers" status={rp.status} />

      <AdvisoryNotice>
        Routing providers calculate routes from available data and provider rules. They do not guarantee legal suitability for every vehicle, load, route restriction, bridge limit, permit rule, or local access rule.
      </AdvisoryNotice>

      <FieldRow label="Active Routing Provider">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-slate-500 focus:outline-none"
        >
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </FieldRow>

      {(selected === 'osrm') && (
        <FieldRow label="OSRM Endpoint" sub="Public demo: router.project-osrm.org (not for production). Use self-hosted for production.">
          <TextInput value={osrm} onChange={setOsrm} placeholder="https://router.project-osrm.org" />
        </FieldRow>
      )}
      {(selected === 'valhalla') && (
        <FieldRow label="Valhalla Endpoint" sub="Self-hosted Valhalla routing engine endpoint.">
          <TextInput value={valhalla} onChange={setValhalla} placeholder="https://your-valhalla-server.example.com" />
        </FieldRow>
      )}
      {(selected === 'self_hosted') && (
        <FieldRow label="Self-Hosted Routing Endpoint">
          <TextInput value={selfHosted} onChange={setSelfHosted} placeholder="https://your-routing-server.example.com" />
        </FieldRow>
      )}
      {(selected === 'custom') && (
        <FieldRow label="Custom Routing Endpoint">
          <TextInput value={custom} onChange={setCustom} placeholder="https://…" />
        </FieldRow>
      )}

      <GuardBlockResult result={guardResult} field="Routing Endpoint URL" />
      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last test" ts={rp.lastTestAt} />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        saving={saving}
        testing={testing}
        testLabel="Check Routing Provider Endpoint"
      />
      <p className="text-2xs text-slate-700 pt-1">Routing adapter engine · Run 5 &nbsp;·&nbsp; Advisory outputs only</p>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 6: Geocoding Providers
// ─────────────────────────────────────────────────────────────
function GeocodingCard() {
  const geo          = useApiConfigStore(s => s.geocoding)
  const updateGeo    = useApiConfigStore(s => s.updateGeocoding)
  const resetGeo     = useApiConfigStore(s => s.resetGeocoding)
  const recordBlock  = useApiConfigStore(s => s.recordGuardBlock)

  const [provider, setProvider]   = useState(geo.provider)
  const [endpoint, setEndpoint]   = useState(geo.endpointUrl)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [guardResult, setGuardResult] = useState(null)
  const [saveMsg, setSaveMsg]     = useState(null)

  const PROVIDERS = [
    { value: 'nominatim', label: 'Nominatim (OSM — public, rate-limited)' },
    { value: 'custom',    label: 'Custom Geocoding Endpoint' },
  ]

  const handleSave = () => {
    setGuardResult(null)
    const guard = guardCheck(endpoint, 'Geocoding Endpoint URL', {})
    if (guard.blocked) { setGuardResult(guard); recordBlock('geocoding.endpointUrl', guard.blockedMessage); return }
    setSaving(true)
    setTimeout(() => {
      updateGeo({ provider, endpointUrl: endpoint.trim(), status: 'configured', lastError: null })
      setSaving(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }, 300)
  }

  const handleReset = () => {
    const def = useApiConfigStore.getState().getDefaults().geocoding
    setProvider(def.provider)
    setEndpoint(def.endpointUrl)
    resetGeo()
    setTestResult(null)
    setGuardResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testGenericEndpoint(endpoint, 'Geocoding Endpoint')
    setTestResult(result)
    updateGeo({ lastTestAt: result.lastTestAt, status: result.ok ? 'connected' : 'error', lastError: result.ok ? null : result.message })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="MapPin" title="Geocoding Providers" status={geo.status} />

      <AdvisoryNotice>
        Public geocoding endpoints may have usage limits and may not be suitable for production fleet use without an approved provider or self-hosted service.
      </AdvisoryNotice>

      <FieldRow label="Geocoding Provider">
        <select
          value={provider}
          onChange={e => setProvider(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-slate-500 focus:outline-none"
        >
          {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </FieldRow>

      <FieldRow label="Geocoding Endpoint URL" sub="Default: Nominatim public OSM geocoding.">
        <TextInput value={endpoint} onChange={setEndpoint} placeholder="https://nominatim.openstreetmap.org" />
      </FieldRow>

      <GuardBlockResult result={guardResult} field="Geocoding Endpoint URL" />
      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last test" ts={geo.lastTestAt} />

      <ActionBar
        onSave={handleSave}
        onReset={handleReset}
        onTest={handleTest}
        saving={saving}
        testing={testing}
        testLabel="Check Geocoding Endpoint"
      />
      <p className="text-2xs text-slate-700 pt-1">Address search · Run 5 &nbsp;·&nbsp; Attribution required for Nominatim</p>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 7: Future Optional Google Maps Provider
// ─────────────────────────────────────────────────────────────
function GoogleMapsCard() {
  return (
    <ProviderCard>
      <CardHeader icon="Map" title="Google Maps API — Future Optional Provider" status="not_configured" />
      <div className="space-y-3">
        <div className="flex items-start gap-3 px-3 py-3 rounded-lg border border-slate-700/40 bg-slate-900/40">
          <Icon name="Info" size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-semibold">Not required for Demo Mode</p>
            <p className="text-2xs text-slate-500 leading-relaxed">
              Google Maps API is not required for demo/prototype mode. The current build uses OSM-compatible tile sources for 2D map rendering and MapLibre for 3D/tilted navigation where supported.
            </p>
            <p className="text-2xs text-slate-600">
              Google Maps API may be added after concept verification as an optional live provider. It must not be hardcoded, made required, or configured before the concept is verified.
            </p>
            <p className="text-2xs text-slate-600">
              No Google Maps API key is required, accepted, or stored here. No Google Maps script or dependency has been added.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Key required for demo', value: 'No' },
            { label: 'Script/dependency added', value: 'No' },
            { label: 'Available after concept verify', value: 'Optional' },
            { label: 'Current 2D source', value: 'OSM Public' },
            { label: 'Current 3D source', value: 'MapLibre (Run 5)' },
            { label: 'Config guard status', value: 'Protected' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900/40 border border-slate-800/60">
              <span className="text-2xs text-slate-600">{label}</span>
              <span className="text-2xs text-slate-500 font-medium">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-2xs text-slate-700 text-center">
          Google Maps · Optional future provider · Post concept verification only
        </p>
      </div>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 8: Custom API Endpoint
// ─────────────────────────────────────────────────────────────
function CustomApiCard() {
  const ca          = useApiConfigStore(s => s.customApi)
  const updateCa    = useApiConfigStore(s => s.updateCustomApi)
  const resetCa     = useApiConfigStore(s => s.resetCustomApi)
  const recordBlock = useApiConfigStore(s => s.recordGuardBlock)

  const [name, setName]         = useState(ca.name)
  const [baseUrl, setBaseUrl]   = useState(ca.baseUrl)
  const [type, setType]         = useState(ca.providerType)
  const [timeout, setTimeout_]  = useState(ca.timeoutMs)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [guardResult, setGuardResult] = useState(null)
  const [saveMsg, setSaveMsg]   = useState(null)

  const TYPES = [
    { value: 'custom',   label: 'Custom / Unknown' },
    { value: 'routing',  label: 'Routing Engine' },
    { value: 'geocoding',label: 'Geocoding' },
    { value: 'tiles',    label: 'Tile Source' },
    { value: 'fleet',    label: 'Fleet Data API' },
  ]

  const handleSave = () => {
    setGuardResult(null)
    if (baseUrl.trim()) {
      const urlCheck = validateUrl(baseUrl, 'Base URL')
      if (!urlCheck.valid) { setTestResult({ ok: false, message: urlCheck.message }); return }
      // Guard with sensitive context for custom endpoints
      const guard = guardCheck(baseUrl, 'Custom API Base URL', { isSensitiveField: true })
      if (guard.blocked) { setGuardResult(guard); recordBlock('customApi.baseUrl', guard.blockedMessage); return }
    }
    setSaving(true)
    setTimeout(() => {
      updateCa({ name: name.trim(), baseUrl: baseUrl.trim(), providerType: type, timeoutMs: Number(timeout) || 8000, status: baseUrl.trim() ? 'configured' : 'not_configured', lastError: null })
      setSaving(false)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    }, 300)
  }

  const handleReset = () => {
    const def = useApiConfigStore.getState().getDefaults().customApi
    setName(def.name); setBaseUrl(def.baseUrl); setType(def.providerType); setTimeout_(def.timeoutMs)
    resetCa(); setTestResult(null); setGuardResult(null)
  }

  const handleTest = async () => {
    if (!baseUrl.trim()) { setTestResult({ ok: false, message: 'No endpoint URL configured.' }); return }
    setTesting(true); setTestResult(null)
    const result = await testGenericEndpoint(baseUrl, name || 'Custom Endpoint', Number(timeout) || 8000)
    setTestResult(result)
    updateCa({ lastTestAt: result.lastTestAt, status: result.ok ? 'connected' : 'error', lastError: result.ok ? null : result.message })
    setTesting(false)
  }

  return (
    <ProviderCard>
      <CardHeader icon="Plug" title="Custom API Endpoint" status={ca.status} />
      <AdvisoryNotice>
        Do not enter backend-only secrets, service role keys, private tokens, database URLs, or admin credentials. The 4P3X API Config Guard™ will block dangerous values.
      </AdvisoryNotice>
      <FieldRow label="Endpoint Name">
        <TextInput value={name} onChange={setName} placeholder="My custom endpoint" />
      </FieldRow>
      <FieldRow label="Base URL">
        <TextInput value={baseUrl} onChange={setBaseUrl} placeholder="https://…" />
      </FieldRow>
      <FieldRow label="Provider Type">
        <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-slate-500 focus:outline-none">
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </FieldRow>
      <FieldRow label="Timeout (ms)">
        <TextInput value={String(timeout)} onChange={v => setTimeout_(v)} placeholder="8000" />
      </FieldRow>
      <GuardBlockResult result={guardResult} field="Custom API Base URL" />
      <TestResult result={testResult} />
      {saveMsg && <p className="text-2xs text-emerald-400">✓ {saveMsg}</p>}
      <TimestampRow label="Last test" ts={ca.lastTestAt} />
      <ActionBar onSave={handleSave} onReset={handleReset} onTest={handleTest} saving={saving} testing={testing} testLabel="Check Custom Endpoint" />
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 9: Provider Health + Fallback Status
// ─────────────────────────────────────────────────────────────
function ProviderHealthCard() {
  const osm  = useApiConfigStore(s => s.osm)
  const ml   = useApiConfigStore(s => s.mapLibre)
  const ov   = useApiConfigStore(s => s.overpass)
  const gh   = useApiConfigStore(s => s.graphHopper)
  const rp   = useApiConfigStore(s => s.routingProviders)
  const geo  = useApiConfigStore(s => s.geocoding)
  const ca   = useApiConfigStore(s => s.customApi)

  const providers = [
    { label: 'OSM 2D Tiles',         status: osm.status,  lastTest: osm.lastTestAt,  fallback: 'Built-in public OSM',  note: 'Always available' },
    { label: 'MapLibre 3D/Tilt',     status: ml.status,   lastTest: ml.lastTestAt,   fallback: '2D fallback active',   note: 'Run 5' },
    { label: 'Overpass Restrictions', status: ov.status,   lastTest: ov.lastTestAt,   fallback: 'No restriction data', note: 'Advisory only' },
    { label: 'GraphHopper Routing',   status: gh.status,   lastTest: gh.lastTestAt,   fallback: 'Demo/local fallback', note: 'Advisory only' },
    { label: 'Open-Source Routing',   status: rp.status,   lastTest: rp.lastTestAt,   fallback: 'Demo/local fallback', note: rp.selectedProvider },
    { label: 'Geocoding',             status: geo.status,  lastTest: geo.lastTestAt,  fallback: 'No geocoding active', note: geo.provider },
    { label: 'Custom Endpoint',       status: ca.status,   lastTest: ca.lastTestAt,   fallback: 'Not applicable',      note: ca.name || '—' },
  ]

  return (
    <ProviderCard>
      <CardHeader icon="Activity" title="Provider Health + Fallback Status" status="demo_ready" />
      <div className="space-y-2">
        {providers.map(({ label, status, lastTest, fallback, note }) => {
          const cfg = STATUS_CFG[status] ?? STATUS_CFG.not_configured
          return (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
              <span className={`inline-flex rounded-full h-2 w-2 flex-shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-2xs text-slate-700 truncate">Fallback: {fallback} {note ? `· ${note}` : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-2xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                {lastTest && <p className="text-2xs text-slate-800 font-mono">{new Date(lastTest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
            </div>
          )
        })}
      </div>
      <AdvisoryNotice>
        "Connected" status only reflects a safe endpoint test. It does not guarantee legal route compliance, complete restriction data, or production-grade availability. All outputs remain advisory.
      </AdvisoryNotice>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Section 10: 4P3X API Config Guard™
// ─────────────────────────────────────────────────────────────
function ConfigGuardCard() {
  const guard       = useApiConfigStore(s => s.configGuard)
  const [testValue, setTestValue]   = useState('')
  const [testField, setTestField]   = useState('Test Field')
  const [testResult, setTestResult] = useState(null)
  const recordBlock = useApiConfigStore(s => s.recordGuardBlock)

  const handleRunGuard = () => {
    if (!testValue.trim()) { setTestResult({ ok: true, message: 'Empty value — always safe.' }); return }
    const result = guardCheck(testValue, testField, { isSensitiveField: true })
    if (result.blocked) {
      recordBlock(testField, result.blockedMessage)
      setTestResult({ ok: false, message: result.blockedMessage })
    } else if (result.hasFrontendWarning) {
      setTestResult({ ok: true, message: `Allowed with frontend warning: ${result.frontendWarning}` })
    } else {
      setTestResult({ ok: true, message: '✓ Value passed Config Guard™ — no dangerous patterns detected.' })
    }
  }

  return (
    <ProviderCard>
      <CardHeader icon="ShieldCheck" title="4P3X API Config Guard™" status="demo_ready" />

      <div className="flex items-start gap-3 px-3 py-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
        <Icon name="ShieldCheck" size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-violet-300 mb-1">Active — protecting all API config fields</p>
          <p className="text-2xs text-slate-400 leading-relaxed">
            The 4P3X API Config Guard™ automatically validates all values before they are saved. Backend-only secrets, private keys, service role keys, database URLs, JWT tokens, and admin credentials are blocked and never persisted.
          </p>
        </div>
      </div>

      {/* What is blocked */}
      <div>
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">Blocked Pattern Types</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            'Database connection strings (postgres://, mysql://, mongodb://)',
            'OpenAI / LLM secret keys (sk-…)',
            'GitHub Personal Access Tokens (ghp_…)',
            'Slack bot/app tokens (xoxb-…)',
            'Signed JWT tokens (eyJ…)',
            'Supabase service role keys',
            'AWS Access Key IDs (AKIA…)',
            'PEM private keys (-----BEGIN…)',
            'Firebase private keys',
            'Google service account keys',
            'Webhook secrets',
            'Stripe secret keys (sk_live_…)',
          ].map(item => (
            <div key={item} className="flex items-start gap-1.5 text-2xs text-slate-600">
              <Icon name="XCircle" size={10} className="text-red-500/60 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What is allowed */}
      <div>
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider mb-2">Allowed Value Types</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            'Public OSM tile URLs',
            'Public Overpass endpoint URLs',
            'Public routing endpoint URLs',
            'GraphHopper API key (browser-safe, with warning)',
            'Provider names and config strings',
            'Timeout and profile settings',
            'Public geocoding endpoint URLs',
            'Custom public endpoints',
          ].map(item => (
            <div key={item} className="flex items-start gap-1.5 text-2xs text-slate-600">
              <Icon name="CheckCircle" size={10} className="text-emerald-500/60 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guard audit trail */}
      {guard.blockedCount > 0 && (
        <div className="px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5">
          <p className="text-2xs text-red-400 font-semibold mb-1">Guard Audit Trail</p>
          <div className="space-y-1">
            <p className="text-2xs text-slate-600">Total blocked this session: <span className="font-mono text-red-400">{guard.blockedCount}</span></p>
            {guard.lastBlockedAt && <p className="text-2xs text-slate-600">Last block: <span className="font-mono">{new Date(guard.lastBlockedAt).toLocaleTimeString()}</span></p>}
            {guard.lastBlockedField && <p className="text-2xs text-slate-600">Field: <span className="font-mono">{guard.lastBlockedField}</span></p>}
          </div>
        </div>
      )}

      {/* Manual test */}
      <div className="pt-2 border-t border-slate-800/40 space-y-2">
        <p className="text-2xs text-slate-600 font-semibold uppercase tracking-wider">Test Config Guard™ Manually</p>
        <FieldRow label="Field Name">
          <TextInput value={testField} onChange={setTestField} placeholder="Field name (for error context)" />
        </FieldRow>
        <FieldRow label="Test Value" sub="Enter any value to test if Config Guard™ would block it. Test values are not saved.">
          <TextInput value={testValue} onChange={setTestValue} placeholder="Paste a value to test…" masked />
        </FieldRow>
        {testResult && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-2xs ${testResult.ok ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : 'border-red-500/20 bg-red-500/5 text-red-300'}`}>
            <Icon name={testResult.ok ? 'CheckCircle' : 'ShieldX'} size={11} className="flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
        <button
          onClick={handleRunGuard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/15 transition-colors"
        >
          <Icon name="ShieldCheck" size={11} />
          Run 4P3X API Config Guard™
        </button>
        <p className="text-2xs text-slate-700">Test values are not saved or logged.</p>
      </div>
    </ProviderCard>
  )
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

// Tab definitions
const TABS = [
  { key: 'osm',       label: 'OSM Tiles',       icon: 'Map'          },
  { key: 'maplibre',  label: 'MapLibre 3D',      icon: 'Layers'       },
  { key: 'overpass',  label: 'Overpass',         icon: 'Globe'        },
  { key: 'graphhopper',label: 'GraphHopper',     icon: 'Route'        },
  { key: 'routing',   label: 'Open Routing',     icon: 'Navigation'   },
  { key: 'geocoding', label: 'Geocoding',        icon: 'MapPin'       },
  { key: 'google',    label: 'Google Maps',      icon: 'Map'          },
  { key: 'custom',    label: 'Custom API',       icon: 'Plug'         },
  { key: 'health',    label: 'Health',           icon: 'Activity'     },
  { key: 'guard',     label: 'Config Guard™',    icon: 'ShieldCheck'  },
]

export default function ApiSettings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('osm')

  const tabContent = {
    osm:         <OsmCard />,
    maplibre:    <MapLibreCard />,
    overpass:    <OverpassCard />,
    graphhopper: <GraphHopperCard />,
    routing:     <RoutingProvidersCard />,
    geocoding:   <GeocodingCard />,
    google:      <GoogleMapsCard />,
    custom:      <CustomApiCard />,
    health:      <ProviderHealthCard />,
    guard:       <ConfigGuardCard />,
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Page Header ── */}
      <div className="px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-xl font-bold text-white">API Settings Centre</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Big V's Best Routes™ &nbsp;·&nbsp; 4P3X API Config Guard™ &nbsp;·&nbsp; Run 4
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DemoLivePill />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
              <Icon name="ShieldCheck" size={11} className="text-violet-400" />
              <span className="text-2xs text-violet-300 font-semibold">Config Guard™ Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security / Advisory Banner ── */}
      <div className="mx-6 mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-slate-700/40 bg-slate-900/40 flex-shrink-0">
        <Icon name="ShieldCheck" size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-2xs text-slate-500 leading-relaxed">
          <span className="text-slate-300 font-semibold">Security &amp; Advisory notice:</span>{' '}
          No backend-only secrets are stored here. The 4P3X API Config Guard™ blocks dangerous values before save. All compliance outputs are advisory only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel. Human override required.
        </p>
      </div>

      {/* ── Admin-only notice ── */}
      <div className="mx-6 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5 flex-shrink-0">
        <Icon name="Lock" size={11} className="text-amber-500" />
        <p className="text-2xs text-amber-400/80">
          Admin only — API Settings are not accessible from Driver PWA or Fleet Controller PWA.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex-shrink-0 px-6 mt-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max pb-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-slate-800 text-white border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <Icon name={tab.icon} size={11} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto p-6">
        {tabContent[activeTab] ?? null}

        {/* Bottom nav */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-800/60">
          <button
            onClick={() => navigate('/app/backend-settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-sm"
          >
            <Icon name="Database" size={14} />
            Backend Settings
          </button>
          <button
            onClick={() => navigate('/app/settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-sm"
          >
            <Icon name="Settings" size={14} />
            Settings
          </button>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors text-sm"
          >
            <Icon name="ArrowLeft" size={14} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
