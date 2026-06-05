/**
 * ============================================================
 * Big V's Best Routes™ — 4P3X API Config Guard™
 * /src/services/apiConfigGuard.js
 *
 * RUN 4 — API Settings Centre + 4P3X API Config Guard™
 *
 * PURPOSE:
 *   Prevent unsafe frontend storage of backend-only secrets
 *   and dangerous credentials before they are persisted.
 *
 * BLOCKED VALUES:
 *   - Service role keys, private API keys, database URLs
 *   - JWT secrets, webhook secrets, private keys, admin tokens
 *   - Known dangerous patterns: sk-, ghp_, xoxb-, eyJ JWTs
 *   - Database connection strings (postgres://, mysql://, mongodb://)
 *   - Cloud provider secrets (AWS, Firebase, Google private keys)
 *
 * ALLOWED VALUES:
 *   - Public map tile URLs (tile.openstreetmap.org/…)
 *   - Public Overpass endpoint URLs
 *   - Public routing endpoint URLs
 *   - GraphHopper API key (user-entered, frontend-intended, with warning)
 *   - Provider names and non-secret settings
 *   - Timeout values, profile selectors
 *   - Public anon keys (not service role keys)
 *
 * BEHAVIOUR:
 *   1. Validate before save.
 *   2. Block dangerous values.
 *   3. Return clear explanation.
 *   4. Do NOT log the actual unsafe value.
 *   5. Do NOT persist the unsafe value.
 *   6. Never block safe public URLs.
 *
 * SECURITY NOTICE:
 *   This guard protects frontend config only.
 *   Backend-only secrets must NEVER be entered here.
 *   This is not a server-side security boundary.
 * ============================================================
 */

// ─── Blocked patterns ─────────────────────────────────────────
// Each entry: { pattern: RegExp, reason: string, id: string }
const BLOCKED_PATTERNS = [
  // Database connection strings
  {
    id:      'db_url_postgres',
    pattern: /^postgres(?:ql)?:\/\//i,
    reason:  'PostgreSQL database connection strings are backend-only secrets.',
  },
  {
    id:      'db_url_mysql',
    pattern: /^mysql:\/\//i,
    reason:  'MySQL database connection strings are backend-only secrets.',
  },
  {
    id:      'db_url_mongodb',
    pattern: /^mongodb(?:\+srv)?:\/\//i,
    reason:  'MongoDB connection strings are backend-only secrets.',
  },

  // Known secret key prefixes
  {
    id:      'openai_sk',
    pattern: /^sk-[A-Za-z0-9_-]{20,}/,
    reason:  'This looks like an OpenAI or LLM provider secret key (sk-…). These are backend-only secrets and must not be stored in frontend config.',
  },
  {
    id:      'github_pat',
    pattern: /^ghp_[A-Za-z0-9_]{20,}/,
    reason:  'This looks like a GitHub Personal Access Token (ghp_…). Do not store this in frontend config.',
  },
  {
    id:      'slack_bot_token',
    pattern: /^xoxb-[0-9-]{10,}/,
    reason:  'This looks like a Slack bot token (xoxb-…). Do not store this in frontend config.',
  },
  {
    id:      'slack_token',
    pattern: /^xox[prs]-[0-9-]{10,}/,
    reason:  'This looks like a Slack OAuth token. Do not store this in frontend config.',
  },

  // JWT-style tokens (base64 encoded header.payload.signature)
  // Only block if it looks like a full signed JWT — not all base64 strings
  {
    id:      'jwt_token',
    pattern: /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/,
    reason:  'This looks like a JWT token (eyJ…). JWTs are typically backend-only secrets. If this is a Supabase anon key, enter it in Backend Settings, not API Settings.',
  },

  // Supabase service role key (typically long base64, JWT-like)
  {
    id:      'supabase_service_role',
    pattern: /service[_.-]?role/i,
    reason:  'Supabase service role keys are backend-only secrets and must never be stored in frontend config.',
  },

  // AWS patterns
  {
    id:      'aws_secret',
    pattern: /AKIA[A-Z0-9]{16}/,
    reason:  'This looks like an AWS Access Key ID. AWS secrets are backend-only and must not be stored in frontend config.',
  },
  {
    id:      'aws_secret_key',
    pattern: /aws[_.-]?secret[_.-]?access[_.-]?key/i,
    reason:  'AWS Secret Access Keys are backend-only secrets.',
  },

  // Private key blocks
  {
    id:      'pem_private',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    reason:  'PEM private keys are backend-only secrets and must not be stored in frontend config.',
  },

  // Firebase private key
  {
    id:      'firebase_private',
    pattern: /firebase[^a-z]*private[^a-z]*key/i,
    reason:  'Firebase private keys are backend-only secrets.',
  },

  // Google service account private key
  {
    id:      'google_private',
    pattern: /google[^a-z]*private[^a-z]*key/i,
    reason:  'Google service account private keys are backend-only secrets.',
  },

  // Generic webhook secrets
  {
    id:      'webhook_secret',
    pattern: /webhook[_.-]?secret/i,
    reason:  'Webhook secrets are backend-only secrets.',
  },

  // Stripe secret key
  {
    id:      'stripe_secret',
    pattern: /^sk_(?:live|test)_[A-Za-z0-9]{20,}/,
    reason:  'This looks like a Stripe secret key. Stripe secret keys are backend-only and must not be stored in frontend config.',
  },

  // Generic "secret" keyword in what looks like a key value (short, dense)
  {
    id:      'generic_secret',
    pattern: /^[A-Za-z0-9_-]{40,}$/,  // Applied only for fields labelled as "secret" in context
    reason:  'This looks like a long opaque secret. If this is a backend-only secret, do not store it here.',
    contextOnly: true,  // Only applied when field is flagged as sensitive by caller
  },
]

// ─── Allowed URL prefixes (never block these) ─────────────────
const SAFE_URL_PREFIXES = [
  'https://tile.openstreetmap.org/',
  'https://a.tile.openstreetmap.org/',
  'https://b.tile.openstreetmap.org/',
  'https://c.tile.openstreetmap.org/',
  'https://overpass-api.de/',
  'https://lz4.overpass-api.de/',
  'https://z.overpass-api.de/',
  'https://overpass.kumi.systems/',
  'https://router.project-osrm.org/',
  'https://routing.openstreetmap.de/',
  'https://graphhopper.com/api/',
  'https://nominatim.openstreetmap.org/',
  'https://api.maptiler.com/',
  'http://localhost',
  'http://127.0.0.1',
]

// ─── Blocked result type ──────────────────────────────────────
/**
 * @typedef {Object} GuardResult
 * @property {boolean} blocked      — true if value was blocked
 * @property {string}  reason       — human-readable reason (empty if not blocked)
 * @property {string}  patternId    — which pattern triggered (empty if not blocked)
 * @property {boolean} hasFrontendWarning — true if value is allowed but has a frontend exposure warning
 * @property {string}  frontendWarning   — warning text (e.g. for GH API key)
 */

/**
 * Run the 4P3X API Config Guard™ against a value.
 *
 * @param {string} value       — the value to check
 * @param {string} fieldName   — human-readable field name (for error messages)
 * @param {object} options
 *   @param {boolean} options.isSensitiveField — treat as sensitive for generic-secret pattern
 *   @param {boolean} options.allowGraphHopperKey — if true, GH key gets a warning but is not blocked
 * @returns {GuardResult}
 */
export function guardCheck(value, fieldName = 'field', options = {}) {
  const val = (value || '').trim()

  // Empty values are always safe
  if (!val) return { blocked: false, reason: '', patternId: '', hasFrontendWarning: false, frontendWarning: '' }

  // Safe URLs — never block
  const isSafeUrl = SAFE_URL_PREFIXES.some(prefix => val.startsWith(prefix))
  if (isSafeUrl) return { blocked: false, reason: '', patternId: '', hasFrontendWarning: false, frontendWarning: '' }

  // Also allow generic http/https URLs that look like endpoints (contain ://  and a valid domain)
  // but don't match any dangerous pattern
  const looksLikeUrl = /^https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?(?:\/.*)?$/.test(val)

  // Run patterns
  for (const p of BLOCKED_PATTERNS) {
    // Skip contextOnly patterns unless field is sensitive
    if (p.contextOnly && !options.isSensitiveField) continue

    // Don't apply short-value generic secret check to plain URLs
    if (p.id === 'generic_secret' && looksLikeUrl) continue

    // Don't block JWT check for plain URLs
    if (p.id === 'jwt_token' && looksLikeUrl) continue

    if (p.pattern.test(val)) {
      // GraphHopper key special case: if caller allows it, warn but don't block
      if (p.id === 'openai_sk' && options.allowGraphHopperKey) {
        // GH keys don't start with sk- in practice, but guard anyway
      }

      return {
        blocked:           true,
        reason:            p.reason,
        patternId:         p.id,
        hasFrontendWarning: false,
        frontendWarning:   '',
        blockedMessage:    `4P3X API Config Guard™ blocked this value because it looks like a backend-only secret. Do not store service role keys, private API keys, database URLs, JWT secrets, webhook secrets, private keys, or admin tokens in frontend code. Reason: ${p.reason}`,
      }
    }
  }

  // GraphHopper API key — allowed but with frontend exposure warning
  // GH keys are intentionally browser-used (GH has a browser-safe key type)
  const isGraphHopperKeyField = fieldName.toLowerCase().includes('graphhopper') ||
                                 fieldName.toLowerCase().includes('gh_key') ||
                                 fieldName.toLowerCase().includes('routing key')
  if (isGraphHopperKeyField && val.length > 10 && options.allowGraphHopperKey) {
    return {
      blocked:            false,
      reason:             '',
      patternId:          '',
      hasFrontendWarning: true,
      frontendWarning:    'GraphHopper API keys are intended for browser use (public key). Note that this key will be visible in browser storage. Use a key with appropriate rate limits and ensure it is a frontend-safe public key, not a service-role or admin key.',
    }
  }

  return { blocked: false, reason: '', patternId: '', hasFrontendWarning: false, frontendWarning: '' }
}

/**
 * Mask a key for safe display.
 * Shows first 4 chars + *** + last 3 chars.
 * Returns '—' if empty.
 */
export function maskKey(key) {
  if (!key || key.trim().length === 0) return '—'
  const k = key.trim()
  if (k.length <= 8) return '••••••••'
  return `${k.slice(0, 4)}${'•'.repeat(Math.min(k.length - 7, 12))}${k.slice(-3)}`
}

/**
 * Validate a URL is safe and well-formed.
 * Returns { valid: boolean, message: string }
 */
export function validateUrl(url, label = 'URL') {
  if (!url || !url.trim()) return { valid: false, message: `${label} is empty.` }
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { valid: false, message: `${label} must use http:// or https://.` }
    }
    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: `${label} is not a valid URL. Check formatting.` }
  }
}

/**
 * Safe fetch with timeout and error handling.
 * Returns { ok: boolean, status: number|null, message: string, data: any }
 */
export async function safeFetch(url, options = {}, timeoutMs = 8000) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      return { ok: res.ok, status: res.status, message: res.ok ? 'OK' : `HTTP ${res.status}`, data: null }
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        return { ok: false, status: null, message: `Request timed out after ${timeoutMs / 1000}s.`, data: null }
      }
      const isCors = err.message?.toLowerCase().includes('cors') || err.message?.toLowerCase().includes('fetch')
      return {
        ok:      false,
        status:  null,
        message: isCors
          ? 'Endpoint test failed — CORS restriction or network error. The endpoint may be valid but not accessible from the browser. Check the URL, provider docs, and your network.'
          : `Network error: ${err.message}`,
        data: null,
      }
    }
  } catch (err) {
    return { ok: false, status: null, message: `Unexpected error: ${err.message}`, data: null }
  }
}

/**
 * Test an OSM tile URL by requesting a single tile (z=1, x=0, y=0).
 * Returns { ok, message, lastTestAt }
 */
export async function testOsmTileUrl(tileUrl) {
  if (!tileUrl || !tileUrl.trim()) return { ok: false, message: 'Tile URL is empty.' }
  const url = tileUrl.trim().replace('{z}', '1').replace('{x}', '0').replace('{y}', '0').replace('{s}', 'a')
  const result = await safeFetch(url, { method: 'HEAD' }, 8000)
  return {
    ok:         result.ok || result.status === 200,
    message:    result.ok
      ? '✓ OSM tile source responded. Demo/prototype ready. Respect tile usage policy and attribution requirements.'
      : `Tile test: ${result.message} — tile source may still be valid. CORS may prevent browser HEAD requests.`,
    lastTestAt: new Date().toISOString(),
  }
}

/**
 * Test an Overpass API endpoint with a minimal status query.
 * Returns { ok, message, lastTestAt }
 */
export async function testOverpassEndpoint(endpointUrl, timeoutMs = 10000) {
  if (!endpointUrl || !endpointUrl.trim()) return { ok: false, message: 'Overpass endpoint URL is empty.' }
  // Minimal safe query — just check if the endpoint is reachable
  const testQuery = '[out:json][timeout:5];node(51.5,-0.1,51.51,-0.09)[name="London"];out 1;'
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(endpointUrl.trim(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(testQuery)}`,
        signal:  controller.signal,
      })
      clearTimeout(timer)
      if (res.ok) {
        return {
          ok:         true,
          message:    '✓ Overpass endpoint responded. Advisory data only — not legally authoritative. Respect rate limits. Public endpoints may be unavailable in production.',
          lastTestAt: new Date().toISOString(),
        }
      }
      return {
        ok:         false,
        message:    `Overpass endpoint returned HTTP ${res.status}. Check URL and provider availability.`,
        lastTestAt: new Date().toISOString(),
      }
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        return { ok: false, message: `Overpass request timed out after ${timeoutMs / 1000}s.`, lastTestAt: new Date().toISOString() }
      }
      return {
        ok:         false,
        message:    `Overpass endpoint test failed — CORS or network error. The endpoint may be valid but not browser-accessible. ${err.message}`,
        lastTestAt: new Date().toISOString(),
      }
    }
  } catch (err) {
    return { ok: false, message: `Unexpected error: ${err.message}`, lastTestAt: new Date().toISOString() }
  }
}

/**
 * Test a generic endpoint (routing, geocoding, custom).
 * Returns { ok, message, lastTestAt }
 */
export async function testGenericEndpoint(url, label = 'Endpoint', timeoutMs = 8000) {
  if (!url || !url.trim()) return { ok: false, message: `${label} URL is empty.` }
  const result = await safeFetch(url.trim(), { method: 'HEAD' }, timeoutMs)
  return {
    ok:         result.ok,
    message:    result.ok
      ? `✓ ${label} responded. Check provider docs for usage limits and correct configuration.`
      : `${label} test: ${result.message}`,
    lastTestAt: new Date().toISOString(),
  }
}

export default {
  guardCheck,
  maskKey,
  validateUrl,
  safeFetch,
  testOsmTileUrl,
  testOverpassEndpoint,
  testGenericEndpoint,
}
