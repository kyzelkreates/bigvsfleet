# Big V's Best Routes™ Fleet

**Safety & Legal Compliance First Navigation Platform**
**Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™**

---

> **Demo Mode shows the product. Live Mode runs the product.**

---

## What Big V's Best Routes™ Fleet Is

Big V's Best Routes™ Fleet is a safety-first fleet command dashboard and driver PWA system designed for route planning, vehicle suitability checks, driver route assignment, map-based navigation, trip reporting, safety oversight, legal/compliance awareness, and dashboard-to-device visibility.

It is built as a **demo/live-ready product architecture**:

- **Demo Mode** — shows the product using labelled demo data. No backend required. Runs fully local/offline. Suitable for investor demos, stakeholder presentations, and product concept verification.
- **Live Mode** — runs the product. Connects a real backend (Supabase, Firebase, AWS/custom, REST/custom endpoint). Supports real users, persistent records, authentication, live vehicle data, driver syncing, route assignments, and operational dashboards.

The platform was created to help fleet operators, transport businesses, mobile teams, logistics planners, specialist vehicle operators, and vehicle-based services plan safer and more suitable routes — and to demonstrate how a modular 4P3X Intelligent AI™ platform can be turned into a serious transport, fleet, routing, compliance, and safety-support product.

---

## Why It Was Created

Many fleet problems come from:

- Poor route planning
- Missing vehicle information and legal-critical data
- Unclear driver communication and task assignment
- Lack of dashboard-to-driver visibility
- Weak evidence and report capture
- Route suitability risks (height, weight, restrictions)
- Missing legal/compliance checks
- Poor data freshness
- Manual disconnected workflows

Big V's Best Routes™ Fleet demonstrates how a modular architecture can address all of these with a single deployable platform.

---

## Core App Structure

### A — Fleet Command Dashboard

Used by the operator, fleet manager, or controller to manage:

- Vehicles and vehicle profiles
- Drivers and driver assignments
- Routes and route planning
- Route-to-driver assignments
- Trip status and progress monitoring
- Safety warnings and compliance checks
- Backend and API settings
- Sync status
- Reports and evidence
- Demo/live mode switching
- PWA deployment and install flows

**Route:** `/#/dashboard` (and all `/#/` sub-routes)

---

### B — Driver PWA

Installable on the driver's mobile device.

Used for:

- Assigned route display
- GPS position and current location
- Trip status updates (start / pause / resume / complete)
- Route following with map
- Safety prompts and driver checklists
- Driver compliance acknowledgements
- Incident notes and reports
- Trip evidence capture
- Offline-safe local submission
- Syncing information back to the dashboard

**Route:** `/#/driver-app`

Install: Open the link on the driver device → browser menu → Add to Home Screen / Install App.

---

### C — Fleet Controller PWA

Installable mobile companion for supervisors and controllers.

Used for:

- Mobile fleet supervision
- Quick route and driver status checks
- Safety and sync update visibility
- Controller notes and actions
- Mobile oversight access

**Route:** `/#/fleet-controller-pwa`

---

### D — Map & Routing Engine

- **Demo mode:** OpenStreetMap-compatible public tiles for 2D map rendering
- **3D/tilt:** MapLibre GL used for 3D/tilted rendering where browser-supported; falls back to 2D safely
- **Routing:** GraphHopper can be configured as a routing provider (API key required for live use)
- **Restrictions:** Overpass API used for restriction scanning (advisory — data may be incomplete)
- **Future optional:** Google Maps API — not required for demo; future optional after concept verification only

**Important:** Public OSM/Overpass/OSRM endpoints are not intended for production fleet load. A dedicated map and routing provider should be configured for live operation.

---

### E — Demo / Live Backend Layer

| Mode | Behaviour |
|------|-----------|
| Demo Mode | Local/offline state, labelled demo data, one-button local sync, no backend required |
| Live Mode | Backend-connected, real users, persistent records, live sync, auth required |

Switching to Live Mode requires configuring a backend provider through:
- **Backend Settings** → `/#/backend-settings`
- **API Settings Centre** → `/#/api-settings`

Supported backend providers:
- Supabase (RLS-enabled SQL schema included — see `sql_*.sql` files)
- Firebase
- AWS / custom backend
- Generic REST / custom endpoint
- Local-only fallback

---

### F — 4P3X Intelligent AI™ Oversight

Two onboard advisory AI agents:

**Agent 1 — Route Safety AI**
Reviews route suitability, vehicle profile, route risk, GPS confidence, restricted areas, missing vehicle data, map confidence, and active trip state.

**Agent 2 — Legal & Compliance AI**
Reviews vehicle legal/physical fields, missing legal-critical data, route evidence completeness, controller acknowledgement status, data freshness, and safety/legal documentation gaps.

> **⚠ Advisory only — human verification required.**
> These agents do not replace driver responsibility, transport management duties, legal advice, professional judgement, or official compliance checks.

---

## Safety & Legal Disclaimer

> **Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel.**

> Big V's Best Routes™ does not guarantee legal compliance. It does not replace professional judgement, legal advice, official safety checks, or driver responsibility. Route and map outputs are advisory only and require human verification.

> Public map and routing data (OSM, Overpass, GraphHopper) may be incomplete, outdated, missing, or inaccurate.

---

## PWA Install Notes

### Fleet Dashboard PWA
- Open the app in Chrome or Edge on desktop
- Look for the install icon in the address bar, or use the browser menu → Install app
- Short name: `Big V Routes`
- Start URL: `/#/dashboard`

### Driver PWA
- Open `/#/driver-app` on the driver's device in Chrome (Android) or Safari (iOS)
- **Android/Chrome:** Browser menu → Add to Home Screen / Install app
- **iPhone/Safari:** Share button ⎙ → Add to Home Screen
- **Desktop Chrome/Edge:** Install icon in address bar

### Fleet Controller PWA
- Open `/#/fleet-controller-pwa` on the controller's device
- Same install process as Driver PWA

> Remote installation from another device is not possible. The install must be triggered from the device the PWA will run on.

---

## Demo / Live Mode

### Demo Mode (default)
- All data is labelled as demo/local
- No backend required
- One-button local sync from the PWA Deployment Centre
- Driver and Controller PWAs work fully in demo mode
- AI panels show advisory demo outputs

### Live Mode
- Requires a configured backend provider
- Demo records are separated from live operational data
- Auth is enforced when `demoPublicAccess = false` in config
- Backend missing → warning shown, fallback to local/offline mode
- App never crashes if backend is unavailable

---

## Auth & Demo Access

By default, the demo build runs with **public demo access** enabled:

- `demoPublicAccess = true` in `core_storage.js` (`bigv:config:demoPublicAccess` in localStorage)
- While this flag is `true` and the app is in Demo Mode, the AuthGuard allows access without login
- All Auth files, login screens, register flows, and Auth providers remain **fully intact** in the codebase
- Auth can be re-enabled at any time by setting `demoPublicAccess = false`

**To re-enable Auth for live use:**
1. Set backend provider in Backend Settings
2. Switch to Live Mode
3. Set `localStorage.setItem('bigv:config:demoPublicAccess', 'false')` or expose a settings toggle
4. Auth will enforce login for all protected routes immediately

---

## Map Providers

| Provider | Status | Notes |
|----------|--------|-------|
| OpenStreetMap tiles | ✅ Active (demo) | Public tiles — not for production load |
| MapLibre GL (3D) | ✅ Ready | Falls back to 2D if unsupported |
| GraphHopper | ⚙ Configurable | Requires API key for live routing |
| Overpass API | ⚙ Advisory | Restriction scanning — may be incomplete |
| Google Maps | 🔮 Future optional | Not implemented — future provider after concept verification |

---

## Backend Readiness Options

| Provider | Notes |
|----------|-------|
| Supabase | RLS-enabled SQL schema included (`sql_*.sql`). Recommended for MVP live. |
| Firebase | REST/SDK compatible — configure in backend settings |
| AWS / custom backend | Generic REST endpoint supported |
| REST / custom endpoint | Flexible — configure base URL in API settings |
| Local only | Offline-first — no backend required for demo |

---

## Environment & API Safety Notes

- **No backend-only secrets in frontend.** Ever.
- **No hardcoded API keys.** All keys entered through the 4P3X API Config Guard™ in API Settings Centre.
- **4P3X API Config Guard™** blocks: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `STRIPE_SECRET_KEY`, `DATABASE_URL`, `JWT_SECRET`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, `sk-`, `postgres://`, `mongodb://`, and similar backend-only patterns from being stored in frontend config.
- GraphHopper API key is masked in the UI when configured.
- Google Maps API key: not implemented, not required.
- Supabase anon key (client-safe): acceptable in frontend config. Service role key: blocked.

**Required environment variables for Vercel deployment (Live Mode only):**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

These are optional for demo mode — the app runs fully without them.

---

## Deployment Notes

### Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`

### Production Build

```bash
npm run build
```

Output: `dist/` directory. All assets are hashed and cache-safe.

### Preview Build Locally

```bash
npm run preview
```

### Vercel Deployment

1. Connect the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Vercel auto-detects Vite — no framework config changes needed
3. Add environment variables if using Live Mode with Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — hash routing means no rewrites config required
5. PWA install requires HTTPS — Vercel provides this automatically

### HTTPS Requirement

PWA installation requires HTTPS. Vercel deployments are HTTPS by default.
For local testing with HTTPS: use `vite --https` or a tunnel (e.g. ngrok).

### GitHub Repo

```
https://github.com/kyzelkreates/bigvsfleet
```

### Rollback

If a deployment breaks:
1. Revert only the specific files changed in that run
2. Do not revert the full project
3. Re-run `npm run build` to confirm clean build before pushing

---

## Supabase SQL Schema

SQL migration files are included in the project root:

| File | Contents |
|------|----------|
| `sql_1_original_schema.txt` | Core schema — vehicles, drivers, routes, trips |
| `sql_2_pwa_sync_additions.txt` | PWA sync tables |
| `sql_3_contract_tables.txt` | Contract/compliance tables |
| `sql_4_job_execution_layer.sql` | Job execution layer |
| `sql_5_driver_safety_layer.sql` | Driver safety layer |
| `sql_6_federation_layer.sql` | Federation / multi-tenant layer |
| `supabase/big-vs-best-routes-schema.sql` | Combined schema |

Run these in order in the Supabase SQL editor to initialise a live backend.

---

## Known Limitations

- Compliance AI is **advisory only** — does not guarantee legal compliance
- OSM/Overpass data may be incomplete, outdated, or unavailable in some areas
- GraphHopper routing does not guarantee legal vehicle suitability for specific load types
- GPS accuracy varies by device, signal, and environment
- Demo Mode is not live backend operation — demo data is local only
- Live Mode requires a configured backend for real cross-device sync
- Public OSM/Overpass endpoints are not rated for production fleet traffic volume
- Google Maps is a future optional provider — not implemented
- Production/legal deployment requires live backend setup, legal review, field testing, and operational validation beyond this demo scope
- The `beforeinstallprompt` PWA install event is not supported on iOS Safari — manual Add to Home Screen required

---

## Build Runs Reference

| Run | Scope |
|-----|-------|
| Run 1 | Identity Refactor + Preserve Fleet OS |
| Run 2 | Dashboard Shell + Role Routing + Responsive Wrap |
| Run 3 | SSOT + Demo/Live Mode Core |
| Run 4 | API Settings Centre + 4P3X API Config Guard™ |
| Run 5 | Map Engine Foundation |
| Run 6 | Driver PWA GPS + 3D Navigation View |
| Run 7 | Fleet Controller PWA |
| Run 8 | PWA Deployment Centre + One-Button Sync |
| Run 9 | Safety & Legal Compliance AI Layer |
| Run 10 | Production Polish + Validation + Deployment Readiness |
| Landing Page Run | Premium Investor/Demo Landing Page + Demo Auth Bypass |

---

## Optional Future Runs

| Run | Scope |
|-----|-------|
| Run 11 | Supabase Live Backend + SQL + Auth + RLS |
| Run 12 | Real-Time Fleet/Driver/Controller Sync |
| Run 13 | Advanced Overpass Restriction Query Engine |
| Run 14 | Production GraphHopper Route Optimisation |
| Run 15 | Google Maps Optional Provider (after concept verification) |
| Run 16 | Report Export Pack / PDF Evidence Pack |
| Run 17 | APK/TWA Packaging Readiness |
| Run 18 | Investor Demo / Portfolio Case Study Polish |

---

## Final Validation Checklist

| Check | Status |
|-------|--------|
| Landing page loads without login | ✅ |
| Big V's Best Routes™ branding globally visible | ✅ |
| Safety & Legal Compliance First wording present | ✅ |
| 4P3X Intelligent AI™ Created by Kyzel Kreates™ appears | ✅ |
| Advisory disclaimer visible | ✅ |
| No legal guarantee wording | ✅ |
| Demo Mode works without backend | ✅ |
| Live Mode warns when backend missing | ✅ |
| API Settings Centre works | ✅ |
| OSM config/warning/attribution exists | ✅ |
| MapLibre readiness/fallback exists | ✅ |
| GraphHopper config foundation exists | ✅ |
| Overpass config foundation exists | ✅ |
| Google Maps documented as future only — not implemented | ✅ |
| Map/Routes page works | ✅ |
| Driver PWA opens independently | ✅ |
| Driver GPS permission flow exists | ✅ |
| Fleet Controller PWA opens independently | ✅ |
| PWA Deployment Centre opens | ✅ |
| Install instructions exist | ✅ |
| Safety Oversight AI panel exists | ✅ |
| Legal Compliance Oversight AI panel exists | ✅ |
| AI outputs advisory only | ✅ |
| No hardcoded API keys | ✅ |
| 4P3X API Config Guard™ active | ✅ |
| Mobile/tablet/desktop responsive | ✅ |
| PWA manifest branded | ✅ |
| Auth files intact | ✅ |
| Auth re-enableable without rebuild | ✅ |
| Build: zero errors | ✅ |
| README exists | ✅ |

---

## Portfolio-Ready Explanation

> Big V's Best Routes™ Fleet is a safety and legal compliance-first navigation platform that demonstrates how a fleet control system can be architected into a deployable dashboard + Driver PWA + Fleet Controller PWA ecosystem. It uses a local-first demo mode, OSM-compatible 2D mapping, MapLibre-ready 3D/tilted map support, advisory 4P3X Intelligent AI™ compliance checks, GPS-aware driver workflows, controller oversight, PWA deployment tools, and a backend-ready sync architecture.

> **Demo Mode shows the product. Live Mode runs the product.**

> With demo mode switched off and a backend such as Supabase, Firebase, AWS/custom, or another suitable system connected, Big V's Best Routes™ Fleet can move from an investor/product demo into a working live product with real users, persistent records, authentication, live vehicle data, driver syncing, route assignment, reports, and operational dashboards.

> This project demonstrates the 4P3X Intelligent AI™ product engineering capability of Kyzel Kreates™ — and the ability to take a single modular architecture and refactor it into a serious, sector-specific, deployable product.

---

**Big V's Best Routes™ Fleet**
*Safety & Legal Compliance First Navigation Platform*
*Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™*
