# Big V's Best Routes™ — Deployment & Live Backend Guide

**Safety & Legal Compliance First Navigation Platform**
**4P3X Intelligent AI™ Created by Kyzel Kreates™**
**Runs 1–14 Complete**

> **Advisory only — not production-legally certified.**
> Human verification required before any operational deployment.
> Compliance AI provides advisory guidance only.

---

## 1. Overview

Big V's Best Routes™ is a safety-first, legal-compliance-first fleet navigation platform combining:

- **Fleet Dashboard** — admin/dispatch/manager oversight
- **Driver PWA** — standalone mobile GPS navigation, checklist, trip management
- **Fleet Controller PWA** — mobile/tablet real-time operational oversight
- **PWA Deployment Centre** — sync, install guide, deployment management
- **Safety Oversight AI** — 4P3X advisory risk monitoring
- **Legal Compliance Oversight AI** — 4P3X advisory compliance review
- **Supabase Live Backend** — Run 11–14 real-time sync layer

---

## 2. Demo Mode vs Live Mode

> **"Demo Mode shows the product. Live Mode runs the product."**

| | Demo Mode | Live Mode |
|-|-----------|-----------|
| Data | Local/demo records, clearly labelled | Live records from Supabase backend |
| Backend | Not required | Required for live sync |
| Demo records in operational views | Shown with Demo badge | **Filtered out** |
| Sync timestamps | Labelled demo/local | Real backend timestamps |
| GPS/maps | OSM public / demo simulation | OSM public / device GPS |
| PWA Install | Works | Works |
| Offline fallback | Yes — always | Yes — when backend unavailable |

**Hard separation rule:** In Live Mode, demo records are filtered from all active operational views. Live Mode with no backend configured shows empty/live-ready states and warnings — never demo data presented as live operational data.

---

## 3. Build Scripts

```bash
npm install          # Install dependencies
npm run dev          # Local development (Vite, port 3000)
npm run build        # Production build → /dist
npm run preview      # Preview production build
```

Hash routing (`createHashRouter`) — all routes use `/#/` prefix. No server-side routing configuration required.

---

## 4. Supabase Live Backend Setup

### 4.1 Required Environment Variables

```env
# .env.local — NEVER commit to public repository
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Only these two variables are allowed in frontend code.**

### 4.2 Security Rules

> "Only frontend-safe Supabase anon/public configuration is allowed in the app. Service role keys, database URLs, JWT secrets, private keys, webhook secrets, and admin tokens must never be stored in frontend code."

| Secret | Allowed in frontend? |
|--------|---------------------|
| `VITE_SUPABASE_URL` | ✅ Yes — public project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes — public anon key (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Never — bypasses RLS |
| `DATABASE_URL` | ❌ Never — backend only |
| `JWT_SECRET` | ❌ Never — backend only |
| `PRIVATE_KEY` | ❌ Never — backend only |
| `WEBHOOK_SECRET` | ❌ Never — backend only |
| OpenAI/Groq/Stripe keys | ❌ Never — backend only |
| AWS/Firebase private keys | ❌ Never — backend only |

### 4.3 SQL Schema Files

| File | Purpose |
|------|---------|
| `supabase/big-vs-best-routes-schema.sql` | Run 11 — Full schema (29 tables, RLS, policies) |
| `supabase/run-14-demo-live-validation-patch.sql` | Run 14 — Additive patch (sync_conflicts table, record_source columns, reviewed fields) |
| `supabase/rollback-run-11.sql` | Run 11 rollback |

### 4.4 SQL Execution Order

Execute in Supabase SQL Editor:

1. `supabase/big-vs-best-routes-schema.sql` — full Run 11 schema
2. `supabase/run-14-demo-live-validation-patch.sql` — Run 14 additive patch

**SQL within each file is ordered:**
1. Extensions
2. Helper functions
3. Tables (dependency order)
4. Indexes
5. Triggers
6. Enable RLS
7. Policies
8. Verification query
9. Rollback notes

### 4.5 RLS Status

> **"RLS is enabled on all operational Supabase tables."**

RLS (Row Level Security) is enabled on all 30 operational tables. Policies enforce:
- Organisation/member read access
- Fleet admin management access
- Driver own-record access
- Fleet controller organisation-scoped operational access
- Controller action/note insert access
- No public open operational policies

---

## 5. Driver PWA Live Sync (Run 12)

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and Live Mode is active:

**Driver PWA pushes to Supabase:**
- Driver status → `driver_statuses`
- GPS location summaries → `gps_location_updates`
- Trip events → `trip_events`
- Pre-trip checklist → `pre_trip_checklists`
- Route acknowledgement → `route_acknowledgements`
- Compliance acknowledgement → `compliance_acknowledgements` (advisory_only: true)
- Incident reports → `incident_reports` (evidence-preserving, priority high)
- Driver notes → `driver_notes`

**Driver PWA reads from Supabase:**
- Route assignment → `route_assignments`
- Active trip → `active_trips`

**If backend unavailable:** updates queue locally in `services_sync_offlineQueueManager.js`.

> "Synced driver data supports fleet visibility only. It does not replace driver responsibility, road signage, current laws, permits, restrictions, bridge checks, road conditions, or company policy."

---

## 6. Fleet Controller PWA Live Sync (Run 13)

When backend is configured and Live Mode active:

**Controller PWA pushes to Supabase:**
- Controller status/actions → `controller_actions`
- Controller notes → `controller_notes` (evidence-preserving)
- Incident reviews → `incident_reports` (UPDATE reviewed fields only — evidence never deleted)
- Route review flags → `controller_actions`
- Driver check-in requests → `controller_actions`
- Compliance exception reviews → `compliance_checks` (advisory_only: true)
- Vehicle readiness reviews → `vehicle_readiness` (advisory_only: true)

**Controller PWA reads from Supabase:**
- Active trips, driver statuses, incidents, controller actions/notes

> "Synced controller data supports fleet visibility and review workflow only. It does not replace driver responsibility, fleet manager responsibility, road signage, current laws, permits, restrictions, bridge checks, road conditions, or company policy."

---

## 7. PWA Deployment Centre Sync (Run 8 + 12 + 13)

| State | Behaviour |
|-------|-----------|
| Demo Mode | Local/demo sync only — timestamps labelled demo/local |
| Live Mode + Supabase configured | Attempts Driver + Controller sync — real result reported |
| Live Mode + backend missing | No fake sync — local/offline-safe warning |

> "The dashboard cannot remotely install a PWA onto another user's device. It can create/share/open links, show QR codes or QR placeholders, and provide install instructions. The driver/controller installs the PWA from their own browser/device."

---

## 8. Offline Queue (Run 12 + 13)

Driver and Controller updates are queued locally when backend is unavailable.

**Queue item types — Driver:**
`driver_status`, `gps_location_update`, `trip_event`, `pre_trip_checklist`,
`route_acknowledgement`, `compliance_acknowledgement`, `incident_report`, `driver_note`

**Queue item types — Controller:**
`controller_status`, `controller_action`, `controller_note`, `incident_review`,
`route_review_flag`, `driver_check_in_request`, `compliance_exception_review`,
`vehicle_readiness_review`

**Evidence-safe rules:**
- Incident reports are never auto-deleted from the queue
- Controller notes and incident reviews are never auto-deleted
- Unresolved conflicts are never auto-deleted
- Failed items keep retry count (max 10 per item)
- Newer local records are not silently overwritten by older backend records

---

## 9. Sync Conflict Handling (Run 14)

Conflicts are detected when:
- Local has unsaved changes AND backend record is newer
- Two devices changed the same record simultaneously
- Record changed while offline

Conflict output:
> "Sync conflict detected. Local and backend records differ. Human review required."

Conflict records include both local and backend versions. Neither version is auto-deleted. Stored in:
- Frontend: `localStorage bigv:sync:conflicts`
- Backend: `public.sync_conflicts` table (when Supabase configured)

---

## 10. 4P3X API Config Guard™ (Run 4)

Blocks dangerous values before they can be saved to frontend config:

| Pattern | Reason |
|---------|--------|
| `postgres://`, `mysql://`, `mongodb://` | Database connection strings |
| `sk-…` (20+ chars) | OpenAI/LLM secret key |
| `ghp_…` | GitHub Personal Access Token |
| `xoxb-…` | Slack bot token |
| JWT `eyJ…` pattern | Signed JWT / Supabase service role |
| `service_role` | Supabase service role key |
| `aws_secret_access_key` | AWS secret |
| `-----BEGIN PRIVATE KEY` | PEM private key |
| `firebase_private_key` | Firebase private key |
| `stripe_secret` / `rk_live_` | Stripe secret key |

> "4P3X API Config Guard™ blocked this value because it looks like a backend-only secret. Do not store service role keys, private API keys, database URLs, JWT secrets, webhook secrets, private keys, or admin tokens in frontend code."

Safe values (allowed): Public map tile URLs, OSM URLs, Overpass URLs, Supabase project URL (not service role key), GraphHopper API key (user-provided, advisory warning shown).

---

## 11. Safety / Legal Compliance AI (Run 9)

**Safety Oversight AI (4P3X Intelligent AI™ #1):**
Advisory risk monitoring — GPS freshness, checklist status, incidents, route flags, pending queues.

**Legal Compliance Oversight AI (4P3X Intelligent AI™ #2):**
Advisory compliance review — route restrictions, driver acknowledgements, controller reviews, OSM/Overpass data freshness, backend sync status.

Both AI agents:
- Remain advisory only — human verification required
- Reduce confidence when backend/live data is missing, stale, or offline
- Show missing data clearly
- Recommend human checks
- Do not approve routes as legally suitable
- Do not guarantee compliance
- Do not make final legal decisions

---

## 12. Map / GPS / Provider Notes (Run 5)

| Provider | Status |
|----------|--------|
| OpenStreetMap (OSM) | ✅ Default 2D map — public, attribution required |
| MapLibre GL | ✅ 3D/tilt navigation-style view where supported |
| 2D Fallback | ✅ Always available if MapLibre/3D unsupported |
| GraphHopper | Optional — user-provided API key, advisory routing only |
| Overpass API | Optional — advisory restriction data, may be incomplete |
| Google Maps | Future optional — not installed, no key/script added |

**OSM Advisory:** OpenStreetMap data may be incomplete, outdated, missing, or unavailable. Map data does not guarantee road suitability, legal vehicle access, or restriction accuracy.

**GPS Advisory:** GPS accuracy can vary due to device, signal, weather, buildings, battery-saver mode, and network conditions. GPS output is not legal proof of route suitability.

---

## 13. Demo/Live Hard Separation (Run 14)

The `services_sync_demoLiveSeparator.js` module provides:

- `filterForActiveOperationalView()` — filters demo records from Live Mode operational views
- `getLiveReadyEmptyState()` — empty-state descriptor for Live Mode with no backend data
- `tagRecord()` / `tagSyncPayload()` — adds `recordSource`, `syncMode`, `modeVisibility`, `isDemo` to records
- `detectSyncConflict()` — compares local vs backend records for conflict detection
- `storeConflict()` / `getConflicts()` / `getConflictCount()` — conflict management
- `validateSyncPayload()` — validates payload before Supabase write

---

## 14. Vercel Deployment

```
1. Push to GitHub repository
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel Dashboard:
   VITE_SUPABASE_URL = https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-public-key-here
4. Deploy
5. Set custom domain if required
```

All routes use hash routing (`/#/`). No Vercel rewrites required.

---

## 15. Known Limitations

- **Compliance AI is advisory only.** It does not guarantee legal vehicle suitability or route legality.
- **Live sync does not guarantee safety or legal compliance.** Synced data supports visibility only.
- **OSM/Overpass data** may be incomplete, outdated, missing, or unavailable.
- **GraphHopper routing** does not guarantee legal vehicle suitability. Output is advisory only.
- **GPS accuracy can vary** due to device, signal, environment, and network conditions.
- **Supabase live operation** requires correct env vars and executed SQL schema in Supabase.
- **RLS/auth policies** must be tested against real authenticated user roles before production use.
- **Public OSM/Overpass endpoints** may not be suitable for production fleet query volumes.
- **Google Maps** is future optional — not installed in this build.
- **Real-world deployment** requires field testing, provider validation, legal review, operational procedures, and fleet policy review.
- **This system is not production-legally certified.** Advisory demo — not a substitute for professional legal, safety, or fleet compliance review.

---

## 16. Final Validation Checklist

Before deploying to production users, verify:

### Security
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in environment
- [ ] Service role key never in frontend code
- [ ] RLS enabled and tested with real authenticated users
- [ ] RLS policies tested for each role: fleet_admin, fleet_controller, driver
- [ ] 4P3X API Config Guard™ tested with dangerous input patterns
- [ ] PWA URLs contain no credentials
- [ ] Console logging does not print credentials

### Data
- [ ] Run 11 SQL schema executed in Supabase
- [ ] Run 14 SQL patch executed in Supabase
- [ ] Verification query passes (all 30 tables present)
- [ ] Demo records labelled `is_demo = true`
- [ ] Live records labelled `is_demo = false`
- [ ] Offline queue retains evidence on network failure

### Sync
- [ ] Driver PWA live sync tested in Live Mode with configured Supabase
- [ ] Controller PWA live sync tested in Live Mode with configured Supabase
- [ ] Offline fallback tested when backend unavailable
- [ ] Retry pending sync tested
- [ ] Sync conflict detection tested
- [ ] No demo data appears in live operational views

### AI / Compliance
- [ ] Safety Oversight AI checked — outputs advisory only
- [ ] Legal Compliance Oversight AI checked — outputs advisory only
- [ ] AI confidence reduces when backend/live data missing or stale
- [ ] No legal guarantee wording in AI outputs

### Legal / Operational
- [ ] Safety/legal disclaimer visible in all compliance/AI/map areas
- [ ] Driver PWA safety warnings visible
- [ ] Controller PWA advisory wording visible
- [ ] OSM/Overpass advisory wording visible
- [ ] Field testing completed with real vehicles
- [ ] Legal review of compliance outputs completed
- [ ] Fleet operational procedures documented
- [ ] Driver/controller training completed

---

## 17. Portfolio-Ready Explanation

> "With demo mode switched off and a backend such as Supabase connected, Big V's Best Routes™ can move from presentation demo to live operational product with real users, persistent records, authentication-ready tables, dashboards, Driver PWA sync, Fleet Controller PWA sync, incident tracking, advisory compliance outputs, and offline-safe sync handling."

Big V's Best Routes™ demonstrates:

- **Safety-first architecture** — advisory-only AI, no unsafe legal guarantees, driver/controller responsibility maintained at every layer
- **Local-first, offline-safe** — works without backend, falls back gracefully, evidence preserved
- **Live backend-ready** — Supabase RLS, real-time subscriptions, offline queue, conflict detection, demo/live hard separation
- **PWA-ready** — installable on Android, iOS, and desktop from browser
- **Role-separated** — Driver PWA, Fleet Controller PWA, and Dashboard never share backend secrets or admin controls
- **Production-path architecture** — structured in numbered runs for incremental delivery, testable at each stage
- **4P3X Intelligent AI™** — dual AI oversight agents (Safety + Legal Compliance) with honest confidence scoring and advisory-only outputs

**Created by Kyzel Kreates™**

---

## 18. Optional Future Runs

| Run | Topic |
|-----|-------|
| Run 15 | Advanced Overpass Restriction Query Engine |
| Run 16 | Production GraphHopper Route Optimisation |
| Run 17 | Google Maps Optional Provider Integration |
| Run 18 | Report Export Pack / PDF Evidence Pack |
| Run 19 | APK/TWA Packaging Readiness |
| Run 20 | Investor Demo / Portfolio Case Study Polish |
| Run 21 | Multi-Organisation / White-Label Fleet Tenant Layer |
| Run 22 | Advanced Driver Alerts / Fatigue / Sensor Readiness |
| Run 23 | Field Testing + Real Vehicle Validation Pack |
