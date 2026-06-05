/**
 * ============================================================
 * Big V's Best Routes™ — App Configuration
 * /src/config/app.js
 *
 * RUN 1 — Identity Refactor
 * Previously: Apex Intelligent AI Fleet Control OS
 * Now:        Big V's Best Routes™ Safety & Legal Compliance First
 *             Fleet Navigation Platform — 4P3X Intelligent AI™
 *             Created by Kyzel Kreates™
 * ============================================================
 */

export const APP_CONFIG = {
  name:        "Big V's Best Routes™",
  shortName:   'Big V Routes',
  version:     '15.1.0',
  buildStage:  'Run 15-16 — Advanced Overpass Restriction Engine + Production GraphHopper Route Optimisation',
  tagline:     'Safety & Legal Compliance First Fleet Navigation Platform',

  brand: {
    full:       "Big V's Best Routes™",
    subtitle:   'Safety & Legal Compliance First Navigation Platform',
    brandLine:  '4P3X Intelligent AI™ Created by Kyzel Kreates™',
    credit:     'Created by Kyzel Kreates™',
    aiLabel:    '4P3X Intelligent AI™',
  },

  // ── Legal / Safety Disclaimer (advisory — not a guarantee) ──
  compliance: {
    disclaimer:
      "Compliance AI provides advisory guidance only. Drivers, fleet managers, and controllers remain responsible for checking current laws, signage, permits, restrictions, road conditions, bridge limits, access rules, and company policy before travel.",
    notices: [
      'Human override required.',
      'Route data may be incomplete or outdated.',
      'GPS accuracy can vary.',
      'OpenStreetMap and public map data are not legally authoritative.',
      'The system does not guarantee legal route compliance.',
      'Drivers, fleet managers, and controllers remain responsible for final decisions.',
    ],
  },

  // ── Product positioning ──────────────────────────────────
  positioning:
    "Big V's Best Routes™ is a safety and legal compliance first fleet navigation platform for fleets, drivers, and fleet controllers. It is designed to support vehicle-aware routing, driver readiness, fleet oversight, route risk awareness, advisory compliance checks, and future dashboard-to-PWA sync. All compliance outputs remain advisory and explainable.",

  products: {
    fleetOS: {
      name:   "Big V's Best Routes™ Fleet Control",
      short:  'Fleet Control',
      route:  '/dashboard',
    },
    navPlatform: {
      name:   '4P3X Intelligent AI Navigation Platform',
      short:  '4P3X Navigation',
      route:  '/ap3x',
    },
  },

  theme: {
    default: 'dark',
    options: ['dark'],
  },

  features: {
    // Enabled in Run 1
    sidebar:      true,
    topnav:       true,
    pwa:          true,
    routing:      true,

    // Run 3
    demoLiveMode: true,
    ssotExtended: true,

    // Run 4
    apiSettingsCentre: true,
    apiConfigGuard:    true,

    // Run 5
    mapEngineFoundation:      true,

    // Run 6
    driverPwaGps:             true,

    // Run 7
    fleetControllerPwa:       true,

    // Run 8
    pwaDeploymentCentre:      true,

    // Run 9
    safetyOversightAI:        true,

    // Run 10
    systemReadinessPanel:     true,

    // Run 11
    supabaseBackendFoundation: true,

    // Run 12
    driverLiveSyncManager:    true,

    // Run 13
    controllerSyncManager:          true,

    // Run 14
    demoLiveSeparator:              true,

    // Run 15-16
    overpassQueryBuilder:           true,
    overpassAdapter:                true,
    graphhopperRouteAdapter:        true,
    routeProviderResultCard:        true,
    navigationRoutePlannerUpgrade:  true,
    complianceAIProviderIntegration:true,
    // temp placeholder:              true,
    syncConflictDetection:          true,
    systemReadinessPanelV14:        true,
    deploymentDocsFinal:            true,
    run14SqlValidationPatch:        true,
    liveBackendUpgradeComplete:     true,
    controllerLiveSyncPanel:        true,
    controllerPwaSyncStatus:        true,
    controllerOfflineQueue:         true,
    controllerRealtimeOrPolling:    true,
    evidencePreservingCtrlQueue:    true,
    offlineQueueManager:      true,
    driverLiveSyncPanel:      true,
    driverPwaSyncStatus:      true,
    realtimeOrPollingFallback:true,
    evidencePreservingQueue:  true,
    sqlSchemaRun11:           true,
    rlsEnabledAllTables:      true,
    backendSettingsCentre:    true,
    backendConfigStore:       true,
    envExample:               true,
    reportsEvidenceCentre:    true,
    pwaIcons:                 true,
    readmeDeploymentDocs:     true,
    run10ValidationComplete:  true,
    legalComplianceAI:        true,
    complianceEngine:         true,
    routeRiskChecks:          true,
    vehicleProfileChecker:    true,
    driverAlerts:             true,
    controllerAISummary:      true,
    evidenceSummary:          true,
    oneButtonSync:            true,
    syncManager:              true,
    driverPwaCard:            true,
    controllerPwaCard:        true,
    qrPlaceholder:            true,
    profileGeneration:        true,
    dashboardReadsPanel:      true,
    offlineQueue:             true,
    controllerActionManager:  true,
    controllerHome:           true,
    controllerTrips:          true,
    controllerDrivers:        true,
    controllerVehicles:       true,
    controllerCompliance:     true,
    controllerIncidents:      true,
    controllerNotes:          true,
    controllerMapPreview:     true,
    controllerInstallGuide:   true,
    driverTripPanel:          true,
    gpsPermissionFlow:        true,
    preTriplChecklist:        true,
    complianceAck:            true,
    incidentReport:           true,
    driverNotes:              true,
    driverInstallGuide:       true,
    osmTileConfigured:        true,
    mapLibreReadiness:        true,
    routeProviderManager:     true,
    graphhopperAdapterFacade: true,
    demoRouteFallback:        true,

    // Future runs
    auth:         false,
    maps:         false,
    ai:           false,
    realtime:     false,
    offline:      false,
    notifications: false,
  },

  // ── Run 3: Demo/Live mode config ────────────────────────────
  demoLive: {
    defaultMode:    'demo',
    lockedLabel:    'Demo Mode shows the product. Live Mode runs the product.',
    liveWarning:    'Live Mode is selected, but no backend provider is configured yet. The system is running in local/offline-safe mode until Supabase, Firebase, AWS/custom backend, or another supported backend is configured.',
    supportedBackends: ['supabase', 'firebase', 'aws_custom', 'rest_custom', 'local_only'],
    firstRecommendedBackend: 'supabase',
    aiOversightRun: 'Run 9',
    backendConfigRun: 'Run 4',
    mapEngineRun: 'Run 5',
    pwaSyncRun: 'Run 8',
  },
}

export default APP_CONFIG
