/**
 * ============================================================
 * Big V's Best Routes™ — Overpass Restriction Adapter
 * /src/services/routing/overpassAdapter.js
 *
 * COMBINED RUN 15–16 — Advanced Overpass Restriction Query Engine
 *
 * PURPOSE:
 *   Fetches, parses, and stores advisory OSM/Overpass restriction
 *   data for a route. Integrates with SSOT and Supabase where
 *   configured. Falls back to no-data state safely.
 *
 * ADVISORY:
 *   "Route and restriction outputs are advisory only. Public map/
 *    routing data may be incomplete, outdated, missing, or inaccurate.
 *    Always verify current signage, restrictions, bridge limits, permits,
 *    access rules, road conditions, vehicle suitability, and company
 *    policy before travel."
 *
 * SECURITY:
 *   No API keys. No secrets. Public Overpass endpoint only.
 *   Endpoint from API Settings Centre only.
 *
 * DEMO MODE:
 *   Returns demo restriction result — clearly labelled.
 *   Never writes to Supabase in Demo Mode.
 * ============================================================
 */

import {
  buildVehicleRelevantRestrictionQuery,
  validateOverpassEndpoint,
  buildSafeTimeoutConfig,
  buildBoundingBoxFromRoute,
  OVERPASS_ADVISORY,
  NO_DATA_WARNING,
} from './services_routing_overpassQueryBuilder'
import { getSupabaseClient, isSupabaseConfigured } from './services_supabase_supabaseClient'

// ── Status constants ──────────────────────────────────────────
export const OVERPASS_STATUS = {
  NOT_CONFIGURED:  'not_configured',
  QUERYING:        'querying',
  DATA_RETURNED:   'data_returned',
  NO_DATA:         'no_data',
  TIMEOUT:         'timeout',
  RATE_LIMITED:    'rate_limited',
  CORS_ERROR:      'cors_error',
  NETWORK_ERROR:   'network_error',
  FALLBACK_ACTIVE: 'fallback_active',
  DEMO_RESULT:     'demo_result',
  ENDPOINT_INVALID:'endpoint_invalid',
}

// ── Local SSOT key ────────────────────────────────────────────
const STORAGE_KEY = 'bigv:routing:overpassResults'

// ── Mode helper (no circular import) ─────────────────────────
function _getMode() {
  try { return JSON.parse(localStorage.getItem('bigv:mode:demoLive') || '{}')?.demoLiveMode?.mode ?? 'demo' } catch { return 'demo' }
}

// ── Get configured Overpass endpoint ─────────────────────────
export function getOverpassConfig() {
  try {
    const raw = localStorage.getItem('bigv:config:apiConfig')
    const cfg = raw ? JSON.parse(raw) : {}
    return {
      endpointUrl:  cfg?.overpass?.endpointUrl  || 'https://overpass-api.de/api/interpreter',
      timeoutMs:    cfg?.overpass?.timeoutMs     || 12000,
      status:       cfg?.overpass?.status        || 'not_configured',
    }
  } catch { return { endpointUrl: 'https://overpass-api.de/api/interpreter', timeoutMs: 12000, status: 'not_configured' } }
}

/**
 * testOverpassEndpoint()
 * Sends a minimal probe query to check if endpoint is reachable.
 */
export async function testOverpassEndpoint(endpointUrl) {
  const validation = validateOverpassEndpoint(endpointUrl)
  if (!validation.valid) return { ok: false, reason: validation.reason }
  const probe = '[out:json][timeout:5]; node(51.5,-0.12,51.51,-0.10)["name"="London"]; out 1;'
  const { signal, clear } = buildSafeTimeoutConfig(8000)
  try {
    const res = await fetch(endpointUrl, {
      method: 'POST', body: probe,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal,
    })
    clear()
    if (res.status === 429) return { ok: false, reason: 'Rate limited', status: OVERPASS_STATUS.RATE_LIMITED }
    if (!res.ok)             return { ok: false, reason: `HTTP ${res.status}`, status: OVERPASS_STATUS.NETWORK_ERROR }
    return { ok: true, status: OVERPASS_STATUS.DATA_RETURNED }
  } catch (e) {
    clear()
    if (e.name === 'AbortError')   return { ok: false, reason: 'Timeout — endpoint too slow', status: OVERPASS_STATUS.TIMEOUT }
    if (e.message?.toLowerCase().includes('cors') || e.message?.toLowerCase().includes('fetch'))
                                    return { ok: false, reason: 'CORS or network error', status: OVERPASS_STATUS.CORS_ERROR }
    return { ok: false, reason: e.message, status: OVERPASS_STATUS.NETWORK_ERROR }
  }
}

/**
 * fetchRestrictionDataForRoute()
 * Main function — runs Overpass query for route, parses, stores, returns result.
 * @param {Object} params
 *   - routeId: string
 *   - coords: Array<[lat,lng]> or Array<[lng,lat]>
 *   - vehicleProfile: string
 *   - vehicleSpec: Object (height, weight, width for context)
 */
export async function fetchRestrictionDataForRoute({ routeId, coords, vehicleProfile, vehicleSpec }) {
  const mode = _getMode()

  // Demo Mode — return demo result
  if (mode === 'demo') return createDemoRestrictionResult(routeId, vehicleProfile)

  const config     = getOverpassConfig()
  const validation = validateOverpassEndpoint(config.endpointUrl)
  if (!validation.valid) {
    return createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.ENDPOINT_INVALID, validation.reason)
  }

  if (!Array.isArray(coords) || coords.length < 2) {
    return createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.NO_DATA, 'No route coordinates provided')
  }

  const query = buildVehicleRelevantRestrictionQuery(vehicleProfile, coords, {
    timeoutSecs: Math.floor(config.timeoutMs / 1000),
  })
  if (!query.trim()) {
    return createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.NO_DATA, 'Could not build valid query from route')
  }

  const { signal, clear } = buildSafeTimeoutConfig(config.timeoutMs + 3000)
  let rawData = null
  try {
    const res = await fetch(config.endpointUrl, {
      method:  'POST',
      body:    `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal,
    })
    clear()
    if (res.status === 429) return createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.RATE_LIMITED, 'Overpass rate limited. Try again later.')
    if (!res.ok)            return createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.NETWORK_ERROR, `HTTP ${res.status}`)
    rawData = await res.json()
  } catch (e) {
    clear()
    if (e.name === 'AbortError') return createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.TIMEOUT, 'Overpass query timed out.')
    const isCors = e.message?.toLowerCase().includes('cors') || e.message?.toLowerCase().includes('fetch')
    return createNoDataResult(routeId, vehicleProfile, isCors ? OVERPASS_STATUS.CORS_ERROR : OVERPASS_STATUS.NETWORK_ERROR, e.message)
  }

  if (!rawData?.elements || rawData.elements.length === 0) {
    const result = createNoDataResult(routeId, vehicleProfile, OVERPASS_STATUS.NO_DATA)
    saveOverpassRestrictionResult(result)
    return result
  }

  const parsed = parseOverpassElements(rawData.elements, vehicleProfile, vehicleSpec)
  const result = {
    id:                   `ovp-${Date.now()}`,
    routeId:              routeId   || null,
    provider:             'overpass',
    endpointUsed:         config.endpointUrl.replace(/https?:\/\//, '').split('/')[0],  // host only — no secrets
    queryType:            coords.length > 50 ? 'bbox' : 'route_corridor',
    bbox:                 buildBoundingBoxFromRoute(coords, 0.01),
    routeCorridorUsed:    coords.length <= 50,
    restrictionsFound:    parsed.restrictionCount,
    parsedTags:           parsed.tags,
    restrictionConcerns:  parsed.concerns,
    confidenceScore:      calculateRestrictionConfidence(parsed, rawData.elements.length),
    dataFreshnessWarning: 'OSM/Overpass data may be incomplete or outdated. Verify with current official sources.',
    providerStatus:       OVERPASS_STATUS.DATA_RETURNED,
    advisory:             OVERPASS_ADVISORY,
    noDataWarning:        null,
    error:                null,
    isDemo:               false,
    is_demo:              false,
    advisoryOnly:         true,
    noGuarantee:          true,
    generatedAt:          new Date().toISOString(),
    vehicleProfile:       vehicleProfile || 'unknown',
    elementCount:         rawData.elements.length,
    rawElementSample:     rawData.elements.slice(0, 3).map(e => ({ type: e.type, tags: e.tags })),  // sample only
  }

  saveOverpassRestrictionResult(result)
  await _saveToSupabase(result)
  return result
}

/**
 * parseOverpassElements()
 * Extracts restriction tags from Overpass elements.
 * Advisory only — never claims data is complete.
 */
export function parseOverpassElements(elements, vehicleProfile, vehicleSpec = {}) {
  const tags      = {}
  const concerns  = []
  let   restrictionCount = 0

  const CONCERN_THRESHOLD = {
    maxheight:  vehicleSpec?.heightM  || 4.0,
    maxweight:  vehicleSpec?.weightT  || 7.5,
    maxwidth:   vehicleSpec?.widthM   || 2.5,
    maxlength:  vehicleSpec?.lengthM  || 12.0,
  }

  for (const el of elements) {
    if (!el.tags) continue
    const t = el.tags

    // Height
    if (t.maxheight) {
      const h = parseTagValue(t.maxheight)
      tags.maxheight = tags.maxheight ? Math.min(tags.maxheight, h || 99) : (h || 99)
      restrictionCount++
      if (h && h < CONCERN_THRESHOLD.maxheight)
        concerns.push({ tag: 'maxheight', value: t.maxheight, concern: `Possible height restriction: ${t.maxheight}m` })
    }
    // Weight
    if (t.maxweight) {
      const w = parseTagValue(t.maxweight)
      tags.maxweight = tags.maxweight ? Math.min(tags.maxweight, w || 99) : (w || 99)
      restrictionCount++
      if (w && w < CONCERN_THRESHOLD.maxweight)
        concerns.push({ tag: 'maxweight', value: t.maxweight, concern: `Possible weight restriction: ${t.maxweight}t` })
    }
    // Width
    if (t.maxwidth) {
      const wd = parseTagValue(t.maxwidth)
      tags.maxwidth = wd; restrictionCount++
      if (wd && wd < CONCERN_THRESHOLD.maxwidth)
        concerns.push({ tag: 'maxwidth', value: t.maxwidth, concern: `Possible width restriction: ${t.maxwidth}m` })
    }
    // Length
    if (t.maxlength) { tags.maxlength = parseTagValue(t.maxlength); restrictionCount++ }
    // HGV/access
    if (t.hgv && t.hgv !== 'yes' && t.hgv !== 'designated') {
      tags.hgv = t.hgv; restrictionCount++
      if (['no', 'restricted', 'private', 'local', 'destination'].includes(t.hgv))
        concerns.push({ tag: 'hgv', value: t.hgv, concern: `HGV restriction tagged: ${t.hgv}` })
    }
    if (t.access && !['yes', 'public', 'permissive'].includes(t.access)) {
      tags.access = t.access; restrictionCount++
      concerns.push({ tag: 'access', value: t.access, concern: `Access restriction: ${t.access}` })
    }
    if (t.goods) { tags.goods = t.goods; restrictionCount++ }
    // Bridge/Tunnel
    if (t.bridge && t.bridge !== 'no') { tags.bridge = t.bridge }
    if (t.tunnel && t.tunnel !== 'no') { tags.tunnel = t.tunnel }
    // Toll
    if (t.toll && t.toll !== 'no') { tags.toll = t.toll }
    // Hazmat
    if (t.hazmat || t.hazard) { tags.hazmat = t.hazmat || t.hazard; restrictionCount++ }
  }

  return { tags, concerns, restrictionCount }
}

/**
 * parseTagValue()
 * Converts "3.5" or "3" to number safely.
 */
function parseTagValue(val) {
  if (!val) return null
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? null : n
}

/**
 * extractRestrictionTags()
 * Returns array of human-readable restriction strings from parsed tags.
 */
export function extractRestrictionTags(parsedTags = {}) {
  return Object.entries(parsedTags).map(([k, v]) => `${k}: ${v}`)
}

/**
 * classifyRestrictionConcern()
 * Returns high/medium/low concern level for a set of parsed concerns.
 */
export function classifyRestrictionConcern(concerns = []) {
  if (!concerns.length)                               return 'none'
  if (concerns.some(c => ['hgv', 'access'].includes(c.tag) && ['no', 'private'].includes(c.value))) return 'high'
  if (concerns.some(c => ['maxheight', 'maxweight', 'maxwidth'].includes(c.tag))) return 'medium'
  return 'low'
}

/**
 * calculateRestrictionConfidence()
 * Returns 0–100 confidence for restriction data quality.
 */
export function calculateRestrictionConfidence(parsed, elementCount) {
  if (!elementCount)              return 10   // no data returned
  if (!parsed.restrictionCount)   return 30   // data returned but no restriction tags
  if (parsed.restrictionCount > 5) return 70  // multiple tagged restrictions
  return 50                                   // some data found
}

/**
 * createNoDataResult()
 * Returns a safe no-data advisory result. Never claims no restrictions.
 */
export function createNoDataResult(routeId, vehicleProfile, status, errorMsg) {
  return {
    id:                   `ovp-nodata-${Date.now()}`,
    routeId:              routeId       || null,
    provider:             'overpass',
    endpointUsed:         null,
    queryType:            'none',
    restrictionsFound:    0,
    parsedTags:           {},
    restrictionConcerns:  [],
    confidenceScore:      0,
    providerStatus:       status || OVERPASS_STATUS.NO_DATA,
    dataFreshnessWarning: 'No Overpass data available.',
    noDataWarning:        NO_DATA_WARNING,
    advisory:             OVERPASS_ADVISORY,
    error:                errorMsg || null,
    isDemo:               false,
    is_demo:              false,
    advisoryOnly:         true,
    noGuarantee:          true,
    generatedAt:          new Date().toISOString(),
    vehicleProfile:       vehicleProfile || 'unknown',
    elementCount:         0,
  }
}

/**
 * createDemoRestrictionResult()
 * Returns a realistic demo result clearly labelled as demo.
 */
export function createDemoRestrictionResult(routeId, vehicleProfile) {
  return {
    id:                   `ovp-demo-${Date.now()}`,
    routeId:              routeId       || 'demo-route',
    provider:             'overpass',
    endpointUsed:         'demo_local',
    queryType:            'demo',
    restrictionsFound:    2,
    parsedTags:           { maxheight: 4.2, hgv: 'yes', bridge: 'yes' },
    restrictionConcerns:  [
      { tag: 'maxheight', value: '4.2m', concern: 'Demo: maxheight restriction tagged on this corridor' },
    ],
    confidenceScore:      40,
    providerStatus:       OVERPASS_STATUS.DEMO_RESULT,
    dataFreshnessWarning: 'Demo result — not real Overpass data.',
    noDataWarning:        null,
    advisory:             OVERPASS_ADVISORY,
    error:                null,
    isDemo:               true,
    is_demo:              true,
    advisoryOnly:         true,
    noGuarantee:          true,
    generatedAt:          new Date().toISOString(),
    vehicleProfile:       vehicleProfile || 'demo',
    elementCount:         5,
  }
}

/**
 * normaliseOverpassError()
 * Returns safe error description. Never echoes sensitive data.
 */
export function normaliseOverpassError(error) {
  if (!error) return null
  const msg = String(error?.message || error)
  if (msg.toLowerCase().includes('timeout') || error.name === 'AbortError')
    return { type: OVERPASS_STATUS.TIMEOUT, message: 'Overpass query timed out. Try again or use a faster endpoint.' }
  if (msg.toLowerCase().includes('cors'))
    return { type: OVERPASS_STATUS.CORS_ERROR, message: 'CORS error — public Overpass endpoint may block browser requests. Try a self-hosted endpoint.' }
  if (msg.toLowerCase().includes('429'))
    return { type: OVERPASS_STATUS.RATE_LIMITED, message: 'Rate limited. Wait before retrying.' }
  return { type: OVERPASS_STATUS.NETWORK_ERROR, message: msg.slice(0, 200) }
}

// ── Local SSOT store ──────────────────────────────────────────
export function saveOverpassRestrictionResult(result) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const updated  = [result, ...existing].slice(0, 20)  // keep last 20
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) { console.warn('[BigV:Overpass] saveResult failed:', e) }
}

export function getLatestRestrictionResultForRoute(routeId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return routeId ? all.find(r => r.routeId === routeId) : all[0] || null
  } catch { return null }
}

export function getAllRestrictionResults() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

// ── Supabase save (optional — only if configured) ──────────────
async function _saveToSupabase(result) {
  if (!isSupabaseConfigured()) return
  const client = getSupabaseClient()
  if (!client) return
  try {
    await client.from('route_risk_results').insert({
      organisation_id:  null,   // Set by RLS from auth context
      route_id:         result.routeId || null,
      provider:         result.provider,
      restrictions_raw: result.parsedTags,
      risk_level:       classifyRestrictionConcern(result.restrictionConcerns) || 'unknown',
      confidence_score: result.confidenceScore,
      advisory_only:    true,
      is_demo:          false,
      metadata: {
        providerStatus:    result.providerStatus,
        vehicleProfile:    result.vehicleProfile,
        restrictionCount:  result.restrictionsFound,
        concerns:          result.restrictionConcerns,
        generatedAt:       result.generatedAt,
        run:               1516,
      },
    })
  } catch (e) { console.warn('[BigV:Overpass] Supabase save skipped:', e.message) }
}

export default {
  getOverpassConfig,
  testOverpassEndpoint,
  fetchRestrictionDataForRoute,
  parseOverpassElements,
  extractRestrictionTags,
  classifyRestrictionConcern,
  calculateRestrictionConfidence,
  createNoDataResult,
  createDemoRestrictionResult,
  createFallbackRestrictionResult: createNoDataResult,
  saveOverpassRestrictionResult,
  getLatestRestrictionResultForRoute,
  getAllRestrictionResults,
  normaliseOverpassError,
  OVERPASS_STATUS,
  OVERPASS_ADVISORY,
  NO_DATA_WARNING,
}
