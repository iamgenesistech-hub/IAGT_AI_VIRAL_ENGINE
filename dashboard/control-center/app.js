// EVICS Workspace Build: 2026-07-04T10:55:00Z
// ── API helpers ──
const API_BASE = "";

async function agentFetch(endpoint, body = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${endpoint} returned ${res.status}`);
  return res.json();
}

async function agentGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`${endpoint} returned ${res.status}`);
  return res.json();
}

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) throw new Error(`${endpoint} returned ${res.status}`);
  return res.json();
}

async function readErrorMessage(res, fallback = "Request failed.") {
  try {
    const payload = await res.json();
    if (payload && typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
    if (payload && typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
  } catch {}
  return fallback;
}

function getErrorMessage(error, fallback = "network error") {
  return error && error.message ? error.message : fallback;
}

function execControlClass(state) {
  if (state === "running") return "state-running";
  if (state === "completed") return "state-completed";
  return "state-off";
}

const EXEC_CONTROL_STANDBY_MS = 60000;

function execControlKey(el, index = 0) {
  if (!el) return "";
  if (el.id) return `id:${el.id}`;
  if (el.dataset && el.dataset.execControl) return el.dataset.execControl;
  if (el.dataset && el.dataset.mediaAction) return `media-action:${el.dataset.mediaId || "global"}:${el.dataset.mediaAction}`;
  if (el.dataset && el.dataset.mediaReviewId) return `media-review:${el.dataset.mediaReviewId}`;
  if (el.dataset && el.dataset.mediaFilter) return `media-filter:${el.dataset.mediaFilter}`;
  if (el.dataset && el.dataset.select) return `select:${el.dataset.select}`;
  if (el.dataset && el.dataset.targetSection) return `section:${el.dataset.targetSection}`;
  const text = String(el.textContent || el.value || "control").trim().toLowerCase().replace(/\s+/g, "-");
  return `inline:${text || "control"}:${index}`;
}

function applyExecControlState(el, state) {
  if (!el) return;
  el.classList.add("exec-control");
  if (el.tagName === "SELECT") {
    el.classList.add("exec-control-select");
  }
  el.classList.remove("state-running", "state-completed", "state-off");
  el.classList.add(execControlClass(state));
}

function setExecControlState(target, controlState, autoOffMs = 0) {
  const key = typeof target === "string" ? target : target?.dataset?.execControl;
  if (!key) return;
  state.execControlStates = state.execControlStates || {};
  state.execControlTimers = state.execControlTimers || {};
  state.execControlStates[key] = controlState;
  if (state.execControlTimers[key]) {
    clearTimeout(state.execControlTimers[key]);
    delete state.execControlTimers[key];
  }
  const escapedKey = (window.CSS && typeof window.CSS.escape === "function")
    ? window.CSS.escape(key)
    : String(key).replace(/["\\]/g, "\\$&");
  document.querySelectorAll(`[data-exec-control="${escapedKey}"]`).forEach((el) => applyExecControlState(el, controlState));
  const effectiveAutoOffMs = controlState === "completed"
    ? Math.max(EXEC_CONTROL_STANDBY_MS, Number(autoOffMs || 0))
    : Number(autoOffMs || 0);
  if (effectiveAutoOffMs > 0) {
    state.execControlTimers[key] = setTimeout(() => {
      state.execControlStates[key] = "off";
      document.querySelectorAll(`[data-exec-control="${escapedKey}"]`).forEach((el) => applyExecControlState(el, "off"));
    }, effectiveAutoOffMs);
  }
}

function registerExecControls(root = document) {
  const controls = root.querySelectorAll("button, select, .toggle-link, .quality-validate-btn, .media-action-btn, .media-review-action-btn");
  controls.forEach((el, index) => {
    if (!el.dataset.execControl) {
      el.dataset.execControl = execControlKey(el, index);
    }
    const current = (state.execControlStates && state.execControlStates[el.dataset.execControl]) || "off";
    applyExecControlState(el, current);
  });
}

function bindExecControlLiveStates(root = document) {
  const controls = root.querySelectorAll("button[data-exec-control], .toggle-link[data-exec-control], .quality-validate-btn[data-exec-control], .media-action-btn[data-exec-control], .media-review-action-btn[data-exec-control]");
  controls.forEach((controlEl) => {
    if (controlEl.dataset.execLiveBound === "true") return;
    controlEl.dataset.execLiveBound = "true";
    controlEl.addEventListener("click", () => {
      const key = controlEl.dataset.execControl;
      if (!key) return;
      setExecControlState(controlEl, "running");
      window.setTimeout(() => {
        const currentState = state.execControlStates && state.execControlStates[key];
        if (currentState === "running") {
          setExecControlState(controlEl, "completed", EXEC_CONTROL_STANDBY_MS);
        }
      }, 900);
    });
  });
}

function setState(patch) {
  Object.assign(state, patch);
  render();
  return state;
}

function getExecutiveAdminCode() {
  return window.IAGT_CONFIG && typeof window.IAGT_CONFIG.adminAccessCode === "string"
    ? window.IAGT_CONFIG.adminAccessCode
    : "";
}

function getRequestedSectionFromUrl() {
  try {
    const url = new URL(window.location.href);
    const querySection = url.searchParams.get("section");
    const hashSection = (window.location.hash || "").replace(/^#/, "").trim();
    return (querySection || hashSection || "").trim() || null;
  } catch (e) {
    return null;
  }
}

const state = {
  // ── Navigation ──
  currentSection: (() => {
    const requestedSection = getRequestedSectionFromUrl();
    if (requestedSection) return requestedSection;
    try {
      return localStorage.getItem("evics_current_section") || "viral-intelligence";
    } catch (e) {
      return "viral-intelligence";
    }
  })(),

  // ── Media Management ──
  selectedMediaType: "All",
  selectedRenderApp: "All",
  mediaList: [],
  selectedMediaId: null,
  mediaLoading: false,
  mediaActionStatus: null,

  // Filters
  category: "All",
  platform: "All",
  queueMode: "Ready",
  selectedAdId: null,
  approvals: new Set(["cr-001", "cr-003"]),
  dataSource: "Demo",
  syncLevel: "demo",
  syncMessage: "Add Supabase credentials in config.js to load live workspace data.",

  // Viral Ads Scan
  scanAmount: (() => {
    try {
      const storedScanAmount = Number(localStorage.getItem("evics_scan_amount"));
      if (Number.isFinite(storedScanAmount)) {
        return Math.max(100, Math.min(10000, Math.round(storedScanAmount)));
      }
    } catch (e) {
      // ignore storage errors
    }
    return 3000;
  })(),
  scanCount: 0,
  scanning: false,

  // Winning Hooks
  hookTarget: (() => {
    try {
      const storedHookTarget = Number(localStorage.getItem("evics_hook_target"));
      if (Number.isFinite(storedHookTarget)) {
        return Math.max(10, Math.min(500, Math.round(storedHookTarget)));
      }
    } catch (e) {
      // ignore storage errors
    }
    return 100;
  })(),
  hookSearching: false,
  hooksFound: 0,
  showHooksList: false,
  selectedHooks: new Set(),
  hookAutoSelect: false,
  hookSearchKeyword: "",

  // Creatives / Script Writer
  generatingCreative: false,
  lastGeneratedCreative: null,

  // Product Matching
  productsExpanded: false,
  selectedProducts: new Set(),
  creativeProductFilter: "All",
  matchingProducts: false,
  productMatchResults: null,

  // Video Assembly Workspace
  assemblyHookFilter: "All",
  assemblyScriptFilter: "All",
  assemblyProductFilter: "All",
  videoDuration: "20s",
  videoStyle: "UGC",
  videoVoice: "Female",
  videoBackground: "Music",
  videoAvatarPreset: "Jordan Avatar",
  videoVisualBackground: "Ocean Dawn",
  videoEffectPreset: "Ocean Reveal",
  videoEntryTiming: "Beat 2 product entrance",
  videoProductTreatment: "Background removed + AI ocean composite",
  videoGovernanceMode: "AI best judgment",
  videoEffectBrief: "",
  videoTimingBrief: "",
  videoBrandBrief: "",
  videoCompanyLabel: "I AM GENESIS TECH",
  videoProductTitle: "Sea Moss Capsules",
  videoProductMockupUrl: "",
  videoProductPageUrl: "https://iamgenesistech.myshopify.com/products/sea-moss-capsules",
  videoDestinationUrl: "",
  videoTextOverlayPosition: "bottom",
  videoTrackingProtocol: "UTM + purchase event",
  videoAspect: "9:16",
  renderStatus: "idle",
  renderMessage: "Waiting for submitted input.",
  renderUrl: null,
  renderJobId: null,
  renderRenderId: null,
  renderProgress: 0,
  renderVideoId: null,
  renderStatusUrl: null,
  exportMessage: "Generate a completed video before exporting.",
  heygenAuthMode: "checking",
  heygenAuthDetail: "Checking HeyGen auth route…",
  heygenAccount: null,
  heygenRecentSessions: [],

  // Legacy assembly data retained for non-video sections that still read shared creative state
  assemblyHookFilter: "All",
  assemblyScriptFilter: "All",
  assemblyProductFilter: "All",
  assemblyComponents: [],
  videoDrafts: [],
  showAssemblyWorkspace: false,
  compareDrafts: false,
  selectedDraftA: null,
  selectedDraftB: null,

  // Agent states
  agentRunning: null,
  agentResult: null,
  agentError: null,

  // Copilot panel
  showCopilot: false,
  copilotInput: "",
  copilotInputType: "hook",
  copilotSuggestions: [],
  copilotRefinements: [],
  copilotExplanation: null,
  copilotLoading: false,

  // Auto-generate pipeline
  autoGenerating: false,
  autoGenerateCount: 3,
  autoGeneratePipeline: [],
  autoGeneratePipelineSteps: [],
  autoGenerateResults: [],
  showAutoGenerateResult: false,
  autoGenerateResult: null,

  // Copilot (merged — was duplicated)
  copilotOpen: false,
  copilotQuestion: "",
  copilotAnswer: null,
  copilotNextActions: [],

  // Agent Orchestration Dashboard
  agentStatusOpen: false,
  agentStatuses: [],
  agentStatusLoading: false,
  agentStatusError: null,
  agentPipelineHealth: 98,
  vpMission: null,
  vpMissionLoading: false,
  vpMissionError: null,
  vpAssistantOpen: (() => {
    try { return localStorage.getItem("evics_vp_assistant_open") !== "false"; } catch (e) { return true; }
  })(),
  vpAssistantCollapsed: (() => {
    try { return localStorage.getItem("evics_vp_assistant_collapsed") === "true"; } catch (e) { return false; }
  })(),
  vpAssistantInput: "",
  vpAssistantMessages: [
    {
      role: "assistant",
      text: "VP online. You can talk to me or use the mission controls below.",
      createdAt: new Date().toISOString(),
      source: "system"
    }
  ],
  vpAssistantSending: false,
  vpAssistantListening: false,
  vpAssistantSpeaking: true,
  vpAssistantError: null,
  vpAssistantStatus: "Ready",
  vpAssistantOffsetX: (() => {
    try {
      const raw = localStorage.getItem("evics_vp_assistant_offset_x");
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (e) {
      return 0;
    }
  })(),
  vpAssistantOffsetY: (() => {
    try {
      const raw = localStorage.getItem("evics_vp_assistant_offset_y");
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (e) {
      return 0;
    }
  })(),

  // Published Media Gallery
  publishedMediaOpen: false,
  publishedMedia: [],
  publishedMediaLoading: false,
  publishedMediaFilter: "All",

  // Live EVICS media library (evics_renders) — real EVICS-created videos only, no placeholders
  mediaLibrary: [],
  mediaLibraryLoading: false,
  mediaLibraryError: false,
  selectedPublishedId: null,
  publishActionStatus: null,

  // Alerts / API management
  alerts: [],
  alertsUnread: 0,
  servicesConfig: [],
  servicesLoading: false,
  failoverMode: false,
  failoverStatus: {},
  failoverLog: [],
  selectedServiceId: null,
  serviceApiKeyInput: "",
  serviceApiKeyVisible: false,
  apiMgmtTab: "overview",
  addCreditsAmount: 100,
  serviceActionStatus: null,
  adminAccessGranted: (() => {
    try { return sessionStorage.getItem("evics_admin_access_granted") === "true"; } catch (e) { return false; }
  })(),
  adminAccessCodeInput: "",
  adminAccessError: null,

  // Analytics Dashboard
  analyticsOpen: false,
  analyticsData: null,
  analyticsLoading: false,
  analyticsTab: "overview",

  // Quality Thresholds & Validation
  qualityThresholds: {
    hookStrength: 75,
    pacingScore: 70,
    ctaClarity: 75,
    visualStyle: 80,
    overallQuality: 80
  },
  qualityValidating: false,
  qualityResult: null,
  qualityScores: {
    hookStrength: 80,
    pacingScore: 75,
    ctaClarity: 78,
    visualStyle: 82,
    overallQuality: 84
  },

  // Connect Sources modal
  connectSourcesOpen: false,
  connectSourcesSaving: false,
  connectSourcesSaved: false,
  connectSourcesError: null,
  connectSourcesFields: {
    supabaseUrl: localStorage.getItem("evics_supabase_url") || "",
    supabaseAnonKey: localStorage.getItem("evics_supabase_anon_key") || "",
    shopifyDomain: localStorage.getItem("evics_shopify_domain") || "",
    shopifyToken: localStorage.getItem("evics_shopify_token") || ""
  },

  // Phase 2 agent engine results
  profitAuditResult: null,
  profitAuditRunning: false,
  productTiersResult: null,
  productTiersLoading: false,
  budgetAllocResult: null,
  budgetAllocRunning: false,
  libraryCleanupResult: null,
  libraryCleanupRunning: false,
  execReportResult: null,
  execReportLoading: false,

  // Bulk creative selection
  selectedCreativeIds: new Set(),
  bulkActionStatus: null,

  // System health (from /status endpoint)
  systemHealth: null,
  systemHealthLoading: false,
  systemHealthLastFetch: null,
  excellenceStatus: null,
  excellenceObjectives: [],
  excellenceLoading: false,
  excellenceError: null,
  // Distribution channel publish state (keyed by dist-ch-{idx})
  distChannelStatus: {},
  distPublishingAll: false,

  // Phase 4 external integrations
  vizardRunning: false,
  vizardResult: null,
  predisRunning: false,
  predisResult: null,
  canvaRunning: false,
  canvaResult: null,
  geminiRunning: false,
  geminiResult: null,

  // Scheduler Activity Log
  schedulerLog: [],
  schedulerLogLoading: false,

  // Phone App Render Monitor
  phoneRenders: [],
  phoneRendersLoading: false,
  wisdomDaily: null,
  wisdomLoading: false,
  communityStats: null,
  communityStatsLoading: false,
  communityFeed: [],
  communityFeedLoading: false,
  wisdomDaily: null,
  wisdomLoading: false,

  // Viral workspace / media review runtime state
  mediaFilter: "all",
  mediaVideos: [],
  mediaStats: null,
  mediaLoading: false,
  mediaReviewOpen: false,
  mediaReviewVideo: null,
  mediaSelectedIds: new Set(),
  mediaAiSuggestions: [],
  mediaRejectionReason: "",
  mediaActionLoading: false,
  mediaGalleryOpen: false,
  mediaRenderQueue: [],
  viralLoading: false,
  viralScanInProgress: false,
  viralAnalysisLoading: false,
  viralBriefLoading: false,
  viralProductMatchLoading: false,
  viralFindInProgress: false,
  viralGalleryOpen: false,
  viralVideos: [],
  viralAnalysis: null,
  viralCreativeBrief: null,
  viralProductMatches: [],
  viralSelectedVideo: null,
  viralFilterCategory: "All",
  viralFilterPlatform: "All",
  viralMemoriesLoading: false,
  productViralMemories: [],
  pviError: null,
  selectedProductViral: null,
  viralScheduleResult: null,
  liveRenders: [],
  reproductionInProgress: false,
  reproductionResult: null,
  renderPollingActive: false,
  nextScanScheduled: null,
  lastScanDate: null,
  inputMessage: "",
  inputStatus: null,
  scriptInput: "",
  submittedScript: "",
  uploadedScriptName: "",
  showCopilotPanel: false,
  copilotExplanations: [],
  copilotOpen: false,
  copilotQuestion: "",
  copilotAnswer: null,
  copilotNextActions: [],
  copilotExplanations: [],
  copilotExplanationsLoading: false,
  copilotSuggestionsLoading: false,
  copilotSuggestions: [],
  copilotRefinements: [],
  copilotExplanation: null
};

const WORKSPACE_SECTIONS = [
  { id: "viral-intelligence", icon: "radar", label: "Viral Intelligence", desc: "Trend scanning, hook discovery, viral pattern analysis" },
  { id: "ai-reconstruction", icon: "spark", label: "AI Reconstruction", desc: "AI-powered creative reconstruction from viral ads" },
  { id: "video-generation", icon: "video", label: "Video Generation", desc: "Video rendering via HeyGen, Runway, and Kling" },
  { id: "media-output", icon: "film", label: "Media Output", desc: "Playback, render routing, QA instructions, and approvals" },
  { id: "distribution", icon: "send", label: "Distribution", desc: "Publishing queue and channel management" },
  { id: "analytics", icon: "chart", label: "Analytics", desc: "Performance metrics and learning loop" },
  { id: "executive-workspace", icon: "crown", label: "Executive Workspace", desc: "Executive controls, agent orchestration, and gated API access" }
];

window.state = state;

let viralAds = [
  {
    id: "ad-001",
    platform: "TikTok",
    category: "Weight loss",
    title: "7-day reset testimonial",
    hook: "Nobody talks about this morning habit...",
    views: 2400000,
    engagement: 12.8,
    velocity: 92,
    conversion: 84,
    cta: "Start your reset today",
    tags: ["before-after", "voiceover", "fast cuts", "testimonial"],
    productMatch: "Sea Moss + Metabolic Support",
    emotion: "Relief, curiosity, self-belief",
    structure: ["Hook", "Problem", "Personal proof", "Product ritual", "CTA"]
  },
  {
    id: "ad-002",
    platform: "Instagram",
    category: "Beauty",
    title: "Skin glow lifestyle edit",
    hook: "This changed my skin in 7 days...",
    views: 1180000,
    engagement: 10.4,
    velocity: 78,
    conversion: 76,
    cta: "Shop the glow stack",
    tags: ["luxury bathroom", "routine", "product reveal", "subtitles"],
    productMatch: "Collagen Beauty Blend",
    emotion: "Aspirational calm, confidence",
    structure: ["Hook", "Mirror proof", "Ingredient flash", "Routine", "CTA"]
  },
  {
    id: "ad-003",
    platform: "YouTube",
    category: "Testosterone",
    title: "Gym performance UGC",
    hook: "I felt flat until I fixed this...",
    views: 892000,
    engagement: 9.1,
    velocity: 69,
    conversion: 71,
    cta: "Build your foundation",
    tags: ["gym scene", "POV", "coach voice", "supplement pour"],
    productMatch: "Testosterone Support Complex",
    emotion: "Discipline, strength, control",
    structure: ["Hook", "Low-energy problem", "Workout proof", "Product reveal", "CTA"]
  },
  {
    id: "ad-004",
    platform: "Facebook",
    category: "Nootropics",
    title: "Founder desk focus ad",
    hook: "My 2 PM crash disappeared when...",
    views: 640000,
    engagement: 8.7,
    velocity: 64,
    conversion: 79,
    cta: "Upgrade your focus",
    tags: ["desk setup", "split screen", "caption led", "routine"],
    productMatch: "Nootropic Focus Capsules",
    emotion: "Clarity, ambition, momentum",
    structure: ["Hook", "Daily pain", "Ingredient cue", "Focus result", "CTA"]
  },
  {
    id: "ad-005",
    platform: "Pinterest",
    category: "Luxury wellness",
    title: "Premium supplement flatlay",
    hook: "Wellness that looks as good as it feels.",
    views: 420000,
    engagement: 7.9,
    velocity: 58,
    conversion: 73,
    cta: "Create your ritual",
    tags: ["flatlay", "gold label", "slow motion", "ambient"],
    productMatch: "Genesis Wellness Bundle",
    emotion: "Luxury, trust, identity",
    structure: ["Visual hook", "Ritual framing", "Product lineup", "Benefit stack", "CTA"]
  }
];

let products = [
  { name: "Sea Moss Capsules", category: "Sea moss", score: 96, angle: "daily mineral ritual" },
  { name: "Metabolic Ignite", category: "Weight loss", score: 91, angle: "morning reset" },
  { name: "Genesis Glow Collagen", category: "Beauty", score: 88, angle: "skin confidence" },
  { name: "Apex Testosterone Support", category: "Testosterone", score: 86, angle: "training foundation" },
  { name: "NeuroRise Focus", category: "Nootropics", score: 82, angle: "clean productive energy" }
];

let creatives = [
  {
    id: "cr-001",
    status: "Ready",
    product: "Sea Moss Capsules",
    format: "UGC TikTok",
    hook: "Nobody tells you minerals can change your whole morning.",
    script: "Open on bathroom counter. Hand picks up Sea Moss Capsules. VO: 'Nobody tells you minerals can change your whole morning. I started this ritual 30 days ago...' Cut to morning routine. Product close-up. CTA: 'Start your mineral ritual today.'",
    asset: "9:16 video, subtitles, thumbnail",
    channel: "TikTok + Reels",
    score: 94,
    approved: true,
    rejectionReason: ""
  },
  {
    id: "cr-002",
    status: "Review",
    product: "Genesis Glow Collagen",
    format: "Luxury routine",
    hook: "The glow routine that finally feels premium.",
    script: "Slow pan across marble bathroom. Product placement. VO: 'The glow routine that finally feels premium. Collagen, ceramides, and ritual in one.' Lifestyle cut. Mirror reveal. CTA: 'Shop the glow stack.'",
    asset: "9:16 lifestyle edit, caption set",
    channel: "Instagram + Pinterest",
    score: 89,
    approved: false,
    rejectionReason: "Hook lacks urgency. Needs stronger emotional trigger before product reveal. Rewrite opening 3 seconds."
  },
  {
    id: "cr-003",
    status: "Ready",
    product: "NeuroRise Focus",
    format: "Founder desk UGC",
    hook: "I stopped treating my focus like a willpower problem.",
    script: "Desk POV. Laptop, coffee, capsules. VO: 'I stopped treating my focus like a willpower problem. Turns out it was a nutrition gap.' Split screen: before/after productivity. CTA: 'Upgrade your focus stack.'",
    asset: "Script, HeyGen prompt, CTA variants",
    channel: "YouTube Shorts + X",
    score: 87,
    approved: true,
    rejectionReason: ""
  },
  {
    id: "cr-004",
    status: "Draft",
    product: "Apex Testosterone Support",
    format: "Gym commercial",
    hook: "Your training does not need more hype. It needs foundation.",
    script: "Gym floor. Athlete mid-set. VO: 'Your training does not need more hype. It needs foundation.' Supplement pour. Performance cut. CTA: 'Build your foundation.'",
    asset: "Runway prompt, shot list",
    channel: "TikTok + Facebook",
    score: 81,
    approved: false,
    rejectionReason: "Visual pacing too slow for TikTok. Needs faster cuts in first 2 seconds. Facebook version approved pending edit."
  }
];

let winningHooks = [
  { id: "h-001", text: "Nobody talks about this morning habit...", category: "Curiosity", platform: "TikTok", confidence: "High" },
  { id: "h-002", text: "I felt flat until I fixed this one thing.", category: "Problem-Solution", platform: "Instagram", confidence: "High" },
  { id: "h-003", text: "My 2 PM crash disappeared when I started doing this.", category: "Transformation", platform: "Facebook", confidence: "High" },
  { id: "h-004", text: "This changed my skin in 7 days — no filter.", category: "Proof", platform: "Instagram", confidence: "High" },
  { id: "h-005", text: "Wellness that looks as good as it feels.", category: "Aspirational", platform: "Pinterest", confidence: "Medium" },
  { id: "h-006", text: "I stopped treating my focus like a willpower problem.", category: "Reframe", platform: "YouTube", confidence: "High" },
  { id: "h-007", text: "Your training does not need more hype. It needs foundation.", category: "Authority", platform: "TikTok", confidence: "Medium" },
  { id: "h-008", text: "Nobody tells you minerals can change your whole morning.", category: "Curiosity", platform: "TikTok", confidence: "High" },
  { id: "h-009", text: "The glow routine that finally feels premium.", category: "Aspirational", platform: "Instagram", confidence: "Medium" },
  { id: "h-010", text: "What if your energy problem was never about sleep?", category: "Reframe", platform: "YouTube", confidence: "High" },
  { id: "h-011", text: "I tried every supplement. This is the only one I kept.", category: "Proof", platform: "TikTok", confidence: "High" },
  { id: "h-012", text: "The morning ritual that changed my entire output.", category: "Transformation", platform: "Instagram", confidence: "Medium" }
];

let workflow = [
  ["6:00 AM", "Scrape viral content", "TikTok, Reels, Shorts, Ads Library, Pinterest, X"],
  ["6:30 AM", "Analyze winning structures", "Hooks, pacing, CTAs, visual patterns, emotional tags"],
  ["7:00 AM", "Match products", "Connect trends to EVICS supplements and offers"],
  ["7:30 AM", "Generate new ads", "Scripts, videos, captions, thumbnails, A/B versions"],
  ["8:00 AM", "Quality review", "Optional human approval before publishing"],
  ["Nightly", "Learning loop", "Update best hooks, products, channels, and formats"]
];

let channels = [
  ["TikTok", "12:15 PM", "Sea Moss UGC", "Ready"],
  ["Instagram", "1:45 PM", "Glow Collagen Routine", "Review"],
  ["YouTube Shorts", "4:30 PM", "Focus Founder Desk", "Ready"],
  ["Pinterest", "7:00 PM", "Luxury Wellness Flatlay", "Queued"],
  ["Shopify Blog", "8:00 PM", "Best Morning Wellness Rituals", "Draft"]
];

async function hydrateFromSupabase() {
  const client = window.iagtSupabase;
  if (!client || !client.enabled) return;

  state.dataSource = "Supabase";
  state.syncLevel = "loading";
  state.syncMessage = "Connecting to Supabase...";
  render();

  try {
    const [adsRows, productRows, creativeRows, queueRows, workflowRows] = await Promise.all([
      client.select("viral_ads", "select=*&order=velocity.desc&limit=50"),
      client.select("products", "select=*&active=eq.true&order=score.desc&limit=50"),
      client.select("creatives", "select=*&order=score.desc&limit=50"),
      client.select("publishing_queue", "select=*&order=created_at.asc&limit=50"),
      client.select("workflow_steps", "select=*&order=sort_order.asc")
    ]);

    if (adsRows.length) {
      viralAds = adsRows.map(mapAd);
      state.selectedAdId = viralAds[0].id;
    }

    if (productRows.length) products = productRows.map(mapProduct);

    if (creativeRows.length) {
      creatives = creativeRows.map(mapCreative);
      state.approvals = new Set(creatives.filter((item) => item.approved).map((item) => item.id));
    }

    if (queueRows.length) channels = queueRows.map(mapQueueItem);
    if (workflowRows.length) workflow = workflowRows.map((item) => [item.step_time, item.title, item.description]);

    state.syncLevel = "connected";
    state.syncMessage = "Live Supabase data loaded.";
  } catch (error) {
    state.dataSource = "Demo";
    state.syncLevel = "error";
    state.syncMessage = "Supabase connection failed. Showing demo data.";
    console.error(error);
  }
}

async function hydrateFromServerApi() {
  try {
    const response = await fetch("/api/shopify/synced-products", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return;

    const payload = await response.json();
    if (!payload.success || !payload.products || !payload.products.length) return;

    products = payload.products.map(mapShopifyProduct);
    state.dataSource = "Shopify + Supabase";
    state.syncLevel = "connected";
    state.syncMessage = `${payload.products.length} Shopify products loaded into Product Matching.`;
  } catch (error) {
    console.warn("Shopify product API unavailable.", error);
  }
}

function formatHeyGenAuthModeLabel(mode) {
  if (!mode) return "Unknown";
  if (mode === "cli_api_key") return "CLI API Key (Priority 1)";
  if (mode === "oauth_bearer") return "OAuth Bearer (Priority 2)";
  if (mode === "cli_fallback_session") return "CLI Session Fallback (Priority 3)";
  if (mode === "not_configured") return "Not Configured";
  return mode;
}

function formatHeyGenCreditsLabel(account) {
  if (!account) return "Credits unavailable";
  if (account.credits_remaining !== null && account.credits_remaining !== undefined) {
    const total = account.credits_total !== null && account.credits_total !== undefined ? ` / ${account.credits_total}` : "";
    return `${account.credits_remaining}${total} credits`;
  }
  return "Credits reported by HeyGen plan UI";
}

async function hydrateHeyGenStatus() {
  try {
    const account = await apiFetch("/api/heygen/account-status");
    const sessions = await apiFetch("/api/heygen/video-agent-sessions?limit=5");
    state.heygenAccount = account.account || null;
    state.heygenRecentSessions = Array.isArray(sessions.sessions) ? sessions.sessions : [];
    state.heygenAuthMode = account.auth?.mode || "unknown";
    state.heygenAuthDetail = `${formatHeyGenAuthModeLabel(account.auth?.mode)} · ${formatHeyGenCreditsLabel(account.account)}`;
  } catch (error) {
    state.heygenAccount = null;
    state.heygenRecentSessions = [];
    state.heygenAuthMode = "error";
    state.heygenAuthDetail = error.message || "HeyGen status unavailable";
  }
}

function mapAd(row) {
  return {
    id: row.id,
    platform: row.platform || "Unknown",
    category: row.category || "Uncategorized",
    title: row.title || "Untitled viral ad",
    hook: row.hook || "",
    views: Number(row.views || 0),
    engagement: Number(row.engagement || 0),
    velocity: Number(row.velocity || 0),
    conversion: Number(row.conversion || 0),
    cta: row.cta || "",
    tags: row.tags || [],
    productMatch: row.product_match || "",
    emotion: row.emotion || "",
    format: row.format || row.content_format || row.contentFormat || "Unknown format",
    script: row.script || row.script_text || row.scriptText || "",
    structure: row.structure || []
  };
}

function mapProduct(row) {
  return {
    name: row.name || "Unnamed product",
    category: row.category || "General",
    score: Number(row.score || 0),
    angle: row.angle || "",
    imageUrl: row.image_url || "",
    source: row.source || "supabase"
  };
}

function mapShopifyProduct(row) {
  return {
    name: row.title || "Unnamed Shopify product",
    category: row.product_type || "Shopify",
    score: 75,
    angle: buildProductAngle(row.product_type, row.title, row.tags),
    imageUrl: row.image_url || "",
    source: "shopify"
  };
}

function buildProductAngle(category, title, tags) {
  const text = `${category || ""} ${title || ""} ${tags || ""}`.toLowerCase();

  if (text.includes("sea moss")) return "daily mineral ritual";
  if (text.includes("testosterone")) return "training foundation";
  if (text.includes("collagen") || text.includes("beauty")) return "skin confidence";
  if (text.includes("focus") || text.includes("nootropic")) return "clean productive energy";
  if (text.includes("weight") || text.includes("metabolic")) return "morning reset";
  if (text.includes("sleep")) return "nightly recovery";
  if (text.includes("sport") || text.includes("gym")) return "performance support";
  return "premium wellness ritual";
}

function mapCreative(row) {
  return {
    id: row.id,
    status: row.status || "Draft",
    product: row.product || "Unassigned product",
    format: row.format || "Creative",
    hook: row.hook || "",
    script: row.script || "",
    asset: row.asset || "",
    channel: row.channel || "",
    score: Number(row.score || 0),
    approved: Boolean(row.approved),
    rejectionReason: row.rejection_reason || row.rejectionReason || ""
  };
}

function mapQueueItem(row) {
  return [
    row.channel || "Channel",
    row.display_time || formatPublishTime(row.publish_at),
    row.content || "Scheduled content",
    row.status || "Draft"
  ];
}

function formatPublishTime(value) {
  if (!value) return "Queued";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmt(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return String(num);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Score bar — color-coded quality visualization used on creative/product cards
function scoreBar(score, showLabel = true) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const cls = s >= 90 ? "score-bar-elite" : s >= 80 ? "score-bar-strong" : s >= 70 ? "score-bar-good" : "score-bar-weak";
  const label = s >= 90 ? "Elite" : s >= 80 ? "Strong" : s >= 70 ? "Good" : "Needs Work";
  const badge = s >= 90 ? "score-badge-elite" : s >= 80 ? "score-badge-strong" : s >= 70 ? "score-badge-good" : "score-badge-weak";
  return `
    <div class="score-bar-wrap">
      <div class="score-bar-track"><div class="score-bar-fill ${cls}" style="width:${s}%"></div></div>
      ${showLabel ? `<span class="score-badge ${badge}">${s} · ${label}</span>` : `<span class="score-badge ${badge}">${s}</span>`}
    </div>`;
}

function renderStatusLabel(status) {
  const labels = {
    idle: "Idle",
    ready: "Input Ready",
    processing: "Processing",
    complete: "Complete",
    failed: "Failed"
  };
  return labels[status] || status;
}

function icon(name) {
  const paths = {
    radar: '<circle cx="12" cy="12" r="3"/><path d="M3 12a9 9 0 0 1 9-9"/><path d="M12 21a9 9 0 0 0 9-9"/><path d="m12 12 6-6"/>',
    spark: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    video: '<path d="m16 13 5 3V8l-5 3Z"/><rect x="3" y="6" width="13" height="12" rx="2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
    gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M4 12h2m12 0h2M12 4v2m0 12v2m5.66-13.66-1.42 1.42M7.76 16.24l-1.42 1.42m0-11.32 1.42 1.42m8.48 8.48 1.42 1.42"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    filter:  '<path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/>',
    shield:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    key:     '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    bell:    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    swap:    '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
    mic:     '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"/><path d="M19 12a7 7 0 0 1-14 0"/><path d="M12 19v3"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function selectedAd() {
  return viralAds.find((ad) => ad.id === state.selectedAdId) || viralAds[0];
}

function filteredAds() {
  return viralAds.filter((ad) => {
    const categoryMatch = state.category === "All" || ad.category === state.category;
    const platformMatch = state.platform === "All" || ad.platform === state.platform;
    return categoryMatch && platformMatch;
  });
}

function mergeViralAds(newAds = []) {
  if (!Array.isArray(newAds) || !newAds.length) return;
  const seen = new Set();
  const merged = [...newAds, ...viralAds].filter((item) => {
    const key = `${String(item.platform || "").toLowerCase()}|${String(item.category || "").toLowerCase()}|${String(item.hook || item.title || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  viralAds = merged.slice(0, 500);
}

function filteredCreatives() {
  return creatives.filter((item) => {
    const modeMatch = state.queueMode === "All" || item.status === state.queueMode;
    const productMatch = state.creativeProductFilter === "All" || item.product === state.creativeProductFilter;
    return modeMatch && productMatch;
  });
}

function filteredHooks() {
  return winningHooks.filter((h) => {
    const catMatch = state.assemblyHookFilter === "All" || h.category === state.assemblyHookFilter;
    return catMatch;
  });
}

function filteredAssemblyScripts() {
  return creatives.filter((c) => {
    const match = state.assemblyScriptFilter === "All" || c.product === state.assemblyScriptFilter;
    return match && c.script;
  });
}

function filteredAssemblyProducts() {
  const base = state.selectedProducts.size > 0
    ? products.filter((p) => state.selectedProducts.has(p.name))
    : products;
  return base.filter((p) => {
    return state.assemblyProductFilter === "All" || p.category === state.assemblyProductFilter;
  });
}

// ── Media Gallery helpers ──────────────────────────────────────────────────

function mediaApprovalLabel(status) {
  const map = {
    approved: "Approved",
    pending: "Pending Review",
    needs_rerender: "Needs Re-render",
    discarded: "Discarded",
    superseded: "Superseded",
    queued: "Queued"
  };
  return map[status] || "Pending Review";
}

function legacyFilteredMediaVideos() {
  const f = state.mediaFilter;
  if (f === "all") return state.mediaVideos;
  if (f === "pending") return state.mediaVideos.filter((v) => !v.approvalStatus || v.approvalStatus === "pending");
  return state.mediaVideos.filter((v) => v.approvalStatus === f);
}

function legacyRenderMediaStatusDashboard() {
  const s = state.mediaStats;
  return `
    <div class="media-stats-row">
      <div class="media-stat">
        <span>Total Videos</span>
        <strong>${s.total}</strong>
      </div>
      <div class="media-stat media-stat-approved">
        <span>Approved</span>
        <strong>${s.approved}</strong>
      </div>
      <div class="media-stat media-stat-pending">
        <span>Pending Review</span>
        <strong>${s.pending}</strong>
      </div>
      <div class="media-stat media-stat-rerender">
        <span>Re-render Queue</span>
        <strong>${s.rerender}</strong>
      </div>
      <div class="media-stat media-stat-discarded">
        <span>Discarded</span>
        <strong>${s.discarded}</strong>
      </div>
    </div>
  `;
}

function legacyRenderMediaCard(video) {
  const approvalStatus = video.approvalStatus || "pending";
  const isSelected = state.mediaSelectedIds.has(video.id);
  const params = video.parameters || {};
  const aspect = params.aspect || "9:16";
  const platform = video.platform || "Unknown";
  const iterBadge = video.iterationCount > 0
    ? `<span class="media-iter-badge">v${video.iterationCount + 1}</span>`
    : "";

  return `
    <div class="media-card ${isSelected ? "media-card-selected" : ""}" data-media-id="${video.id}">
      <div class="media-card-thumb media-thumb-${aspect.replace(":", "-")}">
        ${video.thumbnailUrl
          ? `<img src="${video.thumbnailUrl}" alt="Video thumbnail" />`
          : `<div class="media-thumb-placeholder">${icon("video")}<span>${platform}</span></div>`
        }
        <div class="media-card-overlay">
          <button class="media-review-btn" data-review-id="${video.id}">${icon("video")} Review</button>
        </div>
        <span class="media-approval-badge media-badge-${approvalStatus}">${mediaApprovalLabel(approvalStatus)}</span>
        ${iterBadge}
        <input type="checkbox" class="media-select-cb" data-media-select="${video.id}" ${isSelected ? "checked" : ""} />
      </div>
      <div class="media-card-meta">
        <div class="media-card-title">
          <strong>${video.product || platform + " Video"}</strong>
          <span class="media-platform-tag">${platform}</span>
        </div>
        ${video.hook ? `<p class="media-card-hook">"${video.hook.length > 80 ? video.hook.slice(0, 80) + "…" : video.hook}"</p>` : ""}
        <div class="media-card-details">
          <span>${params.style || "UGC"} · ${params.duration || "—"} · ${aspect}</span>
          ${video.qualityScore ? `<span class="media-quality-score">Q: ${video.qualityScore}</span>` : ""}
        </div>
        <div class="media-card-time">${formatRelativeTime(video.createdAt)}</div>
      </div>
    </div>
  `;
}

function renderReviewPanel(video) {
  if (!video) return "";
  const approvalStatus = video.approvalStatus || "pending";
  const params = typeof video.parameters === "string" ? (() => { try { return JSON.parse(video.parameters); } catch { return {}; } })() : (video.parameters || {});
  const mediaType = String(video.mediaType || video.media_type || "video").toLowerCase();
  const mediaUrl = video.videoUrl || video.video_url || video.previewUrl || video.preview_url || video.storageUrl || video.storage_url || null;
  const suggestions = state.mediaAiSuggestions || video.aiSuggestions;
  const isAtLimit = (video.iterationCount || 0) >= 3;

  return `
    <div class="media-review-overlay" id="media-review-overlay">
      <div class="media-review-panel">
        <div class="media-review-header">
          <div>
            <h2>${icon("video")} Media Review</h2>
            <p>${video.product || video.platform + " Video"} · ${mediaApprovalLabel(approvalStatus)}</p>
          </div>
          <button class="toggle-link media-review-close" id="media-review-close">✕ Close</button>
        </div>

        <div class="media-review-body">

          <!-- Video Player -->
          <div class="media-player-col">
            <div class="media-player-wrap media-player-${(params.aspect || "9:16").replace(":", "-")}">
              ${renderMediaPreviewSurface({ ...video, media_type: mediaType, video_url: mediaUrl }, "modal")}
            </div>

            <!-- Metadata -->
            <div class="media-meta-grid">
              <div class="media-meta-item"><dt>Platform</dt><dd>${video.platform}</dd></div>
              <div class="media-meta-item"><dt>Product</dt><dd>${video.product || "—"}</dd></div>
              <div class="media-meta-item"><dt>Media Type</dt><dd>${mediaTypeLabel(mediaType)}</dd></div>
              <div class="media-meta-item"><dt>Style</dt><dd>${params.style || "—"}</dd></div>
              <div class="media-meta-item"><dt>Duration</dt><dd>${params.duration || "—"}</dd></div>
              <div class="media-meta-item"><dt>Aspect</dt><dd>${params.aspect || "—"}</dd></div>
              <div class="media-meta-item"><dt>Voice</dt><dd>${params.voice || "—"}</dd></div>
              ${video.qualityScore ? `<div class="media-meta-item"><dt>Quality Score</dt><dd>${video.qualityScore}</dd></div>` : ""}
              <div class="media-meta-item"><dt>Iteration</dt><dd>${video.iterationCount > 0 ? `v${video.iterationCount + 1}` : "Original"}</dd></div>
              <div class="media-meta-item"><dt>Created</dt><dd>${formatRelativeTime(video.createdAt)}</dd></div>
            </div>
          </div>

          <!-- Review Actions Col -->
          <div class="media-actions-col">

            <!-- Hook -->
            ${video.hook ? `
            <div class="media-review-hook">
              <span>Hook</span>
              <strong>"${video.hook}"</strong>
            </div>
            ` : ""}

            <!-- Script preview -->
            ${video.script ? `
            <div class="media-script-preview">
              <div class="media-script-label">Script</div>
              <div class="media-script-body">${video.script.length > 300 ? video.script.slice(0, 300) + "…" : video.script}</div>
            </div>
            ` : ""}

            <!-- Current status -->
            <div class="media-current-status">
              <span>Status</span>
              <span class="media-approval-badge media-badge-${approvalStatus}">${mediaApprovalLabel(approvalStatus)}</span>
            </div>

            <!-- Rejection reason (if any) -->
            ${video.rejectionReason ? `
            <div class="media-rejection-note">
              <span class="media-rejection-label">⚠ Rejection note</span>
              <p>${video.rejectionReason}</p>
            </div>
            ` : ""}

            <!-- Action buttons -->
            <div class="media-action-buttons">
              <button class="media-action-btn media-btn-approve" id="media-btn-approve" ${state.mediaActionLoading ? "disabled" : ""}>
                ${icon("check")} Approve
              </button>
              <button class="media-action-btn media-btn-rerender" id="media-btn-rerender" ${state.mediaActionLoading || isAtLimit ? "disabled" : ""}>
                ${icon("radar")} Needs Re-render
              </button>
              <button class="media-action-btn media-btn-discard" id="media-btn-discard" ${state.mediaActionLoading ? "disabled" : ""}>
                ✕ Discard
              </button>
            </div>

            ${state.mediaActionLoading ? `<div class="media-action-loading">${icon("radar")} Processing…</div>` : ""}

            <!-- Rejection reason input -->
            ${approvalStatus !== "approved" && approvalStatus !== "discarded" ? `
            <div class="media-rejection-input-wrap">
              <label class="media-rejection-input-label">Rejection reason (optional — improves AI suggestions)</label>
              <textarea
                id="media-rejection-reason"
                class="media-rejection-textarea"
                placeholder="e.g. Hook lacks urgency, pacing too slow in first 3 seconds…"
                rows="3"
              >${state.mediaRejectionReason.replace(/</g, "&lt;")}</textarea>
            </div>
            ` : ""}

            <!-- Re-render queue button -->
            ${(approvalStatus === "needs_rerender") && !isAtLimit ? `
            <div class="media-requeue-wrap">
              <button class="media-requeue-btn" id="media-btn-requeue" ${state.mediaActionLoading ? "disabled" : ""}>
                ${icon("spark")} Queue for Re-render with AI Improvements
              </button>
              ${isAtLimit ? `<p class="media-requeue-limit">Maximum 3 re-render attempts reached.</p>` : ""}
            </div>
            ` : ""}

            ${isAtLimit ? `<p class="media-requeue-limit">⚠ Max re-render attempts (3) reached. Discard or manually revise.</p>` : ""}

            <!-- AI Suggestions -->
            ${suggestions ? `
            <div class="media-ai-suggestions">
              <div class="media-suggestions-header">
                ${icon("spark")} AI Improvement Suggestions
                <span class="media-suggestions-gain">${suggestions.expectedQualityGain}</span>
              </div>
              <div class="media-suggestions-focus">Focus: ${suggestions.focusArea}</div>
              <ul class="media-suggestions-list">
                ${suggestions.improvements.map((s) => `<li>${s}</li>`).join("")}
              </ul>
              <div class="media-suggestions-note">${suggestions.iterationNote}</div>
            </div>
            ` : ""}

          </div><!-- /media-actions-col -->
        </div><!-- /media-review-body -->
      </div><!-- /media-review-panel -->
    </div><!-- /media-review-overlay -->
  `;
}

function legacyRenderMediaGallery() {
  const filtered = legacyFilteredMediaVideos();
  const hasSelection = state.mediaSelectedIds.size > 0;

  return `
    <section class="media-gallery-section">
      <div class="media-gallery-header">
        <div>
          <h2>${icon("video")} Media Review &amp; Approval Workspace</h2>
          <p>Review all rendered videos, approve or reject with feedback, and trigger AI-powered re-renders.</p>
        </div>
        <div class="media-gallery-header-actions">
          <button class="ghost" id="media-refresh-btn">${icon("radar")} Refresh</button>
          <button class="ghost media-gallery-toggle" id="media-gallery-toggle">
            ${state.mediaGalleryOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
      </div>

      ${state.mediaGalleryOpen ? `

      ${legacyRenderMediaStatusDashboard()}

      <div class="media-gallery-controls">
        <div class="media-filter-tabs">
          ${["all", "pending", "approved", "needs_rerender", "discarded"].map((f) => `
            <button class="media-filter-tab ${state.mediaFilter === f ? "active" : ""}" data-media-filter="${f}">
              ${f === "all" ? "All" : f === "needs_rerender" ? "Re-render" : legacyMediaApprovalLabel(f)}
              <span class="media-filter-count">${
                f === "all" ? state.mediaVideos.length
                : f === "pending" ? state.mediaStats.pending
                : f === "approved" ? state.mediaStats.approved
                : f === "needs_rerender" ? state.mediaStats.rerender
                : state.mediaStats.discarded
              }</span>
            </button>
          `).join("")}
        </div>

        ${hasSelection ? `
        <div class="media-bulk-actions">
          <span class="media-bulk-count">${state.mediaSelectedIds.size} selected</span>
          <button class="ghost media-bulk-btn" id="media-bulk-approve">✓ Approve All</button>
          <button class="ghost media-bulk-btn" id="media-bulk-discard">✕ Discard All</button>
          <button class="toggle-link" id="media-clear-selection">Clear</button>
        </div>
        ` : ""}
      </div>

      ${state.mediaLoading ? `
        <div class="media-loading">${icon("radar")} Loading media gallery…</div>
      ` : filtered.length === 0 ? `
        <div class="media-empty">
          ${state.mediaVideos.length === 0
            ? `No videos yet. Generate your first video using the Video Assembly Workspace above.`
            : `No videos match the current filter.`
          }
        </div>
      ` : `
        <div class="media-grid">
          ${filtered.map(legacyRenderMediaCard).join("")}
        </div>
      `}

      <!-- Render Queue Status -->
      ${state.mediaStats.rerender > 0 ? `
      <div class="media-queue-status">
        <div class="media-queue-status-inner">
          ${icon("radar")}
          <span><strong>${state.mediaStats.rerender}</strong> video${state.mediaStats.rerender !== 1 ? "s" : ""} in re-render queue</span>
          <div class="media-queue-progress">
            <div class="media-queue-progress-fill" style="width: ${Math.min(100, (state.mediaStats.rerender / Math.max(1, state.mediaStats.total)) * 100)}%"></div>
          </div>
        </div>
      </div>
      ` : ""}

      ` : ""}
    </section>

    ${state.mediaReviewOpen && state.mediaReviewVideo ? renderReviewPanel(state.mediaReviewVideo) : ""}
  `;
}

function legacyFormatRelativeTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function legacyLoadMediaGallery() {
  state.mediaLoading = true;
  render();
  try {
    const [galleryRes, statsRes] = await Promise.all([
      fetch("/api/media/gallery"),
      fetch("/api/media/stats")
    ]);
    if (!galleryRes.ok) {
      const reason = await readErrorMessage(galleryRes, `Media gallery failed (HTTP ${galleryRes.status}).`);
      throw new Error(reason);
    }
    if (!statsRes.ok) {
      const reason = await readErrorMessage(statsRes, `Media stats failed (HTTP ${statsRes.status}).`);
      throw new Error(reason);
    }
    const galleryData = await galleryRes.json();
    const statsData = await statsRes.json();
    if (!Array.isArray(galleryData.items)) {
      throw new Error("Media gallery payload missing items array.");
    }
    state.mediaVideos = galleryData.items;
    state.mediaStats = statsData.stats || statsData.summary || state.mediaStats;
    state.syncLevel = "connected";
  } catch (err) {
    state.mediaVideos = [];
    state.mediaStats = { total: 0, approved: 0, pending: 0, rerender: 0, discarded: 0 };
    state.syncLevel = "error";
    state.syncMessage = `Media gallery unavailable: ${getErrorMessage(err, "Unknown backend error.")}`;
  }
  state.mediaLoading = false;
  render();
}

function legacyBuildDemoMediaVideos() {
  return [
    {
      id: "demo-v-001",
      platform: "HeyGen",
      videoUrl: null,
      thumbnailUrl: null,
      status: "complete",
      approvalStatus: "pending",
      script: "Open on bathroom counter. Hand picks up Sea Moss Capsules. VO: 'Nobody tells you minerals can change your whole morning.' Cut to morning routine. Product close-up. CTA: 'Start your mineral ritual today.'",
      parameters: { style: "UGC", duration: "15s", voice: "Female", background: "Music", aspect: "9:16" },
      rejectionReason: "",
      aiSuggestions: null,
      iterationCount: 0,
      qualityScore: 94,
      product: "Sea Moss Capsules",
      hook: "Nobody tells you minerals can change your whole morning.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "demo-v-002",
      platform: "Runway",
      videoUrl: null,
      thumbnailUrl: null,
      status: "complete",
      approvalStatus: "needs_rerender",
      script: "Slow pan across marble bathroom. Product placement. VO: 'The glow routine that finally feels premium.' Lifestyle cut. Mirror reveal. CTA: 'Shop the glow stack.'",
      parameters: { style: "Luxury", duration: "15s", voice: "Female", background: "Ambient", aspect: "9:16" },
      rejectionReason: "Hook lacks urgency. Needs stronger emotional trigger before product reveal.",
      aiSuggestions: {
        improvements: [
          "Rewrite the opening hook with a stronger curiosity or problem-agitation pattern",
          "Lead with a bold claim or surprising statistic in the first 2 seconds",
          "Move product reveal earlier — show it within the first 4 seconds",
          "Add dynamic text overlays to maintain viewer attention through the middle section",
          "Optimize for silent viewing — ensure all key messages appear as text overlays"
        ],
        expectedQualityGain: "+15% estimated quality improvement",
        focusArea: "Hook & Opening",
        iterationNote: "Attempt 1 of 3. AI improvements applied based on rejection feedback."
      },
      iterationCount: 1,
      qualityScore: 89,
      product: "Genesis Glow Collagen",
      hook: "The glow routine that finally feels premium.",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "demo-v-003",
      platform: "HeyGen",
      videoUrl: null,
      thumbnailUrl: null,
      status: "complete",
      approvalStatus: "approved",
      script: "Desk POV. Laptop, coffee, capsules. VO: 'I stopped treating my focus like a willpower problem.' Split screen: before/after productivity. CTA: 'Upgrade your focus stack.'",
      parameters: { style: "UGC", duration: "15s", voice: "Male", background: "None", aspect: "9:16" },
      rejectionReason: "",
      aiSuggestions: null,
      iterationCount: 0,
      qualityScore: 87,
      product: "NeuroRise Focus",
      hook: "I stopped treating my focus like a willpower problem.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "demo-v-004",
      platform: "Kling",
      videoUrl: null,
      thumbnailUrl: null,
      status: "complete",
      approvalStatus: "discarded",
      script: "Gym floor. Athlete mid-set. VO: 'Your training does not need more hype. It needs foundation.' Supplement pour. Performance cut. CTA: 'Build your foundation.'",
      parameters: { style: "Commercial", duration: "10s", voice: "Male", background: "Music", aspect: "9:16" },
      rejectionReason: "Visual pacing too slow for TikTok. Needs faster cuts in first 2 seconds.",
      aiSuggestions: null,
      iterationCount: 2,
      qualityScore: 81,
      product: "Apex Testosterone Support",
      hook: "Your training does not need more hype. It needs foundation.",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "demo-v-005",
      platform: "Runway",
      videoUrl: null,
      thumbnailUrl: null,
      status: "queued",
      approvalStatus: "pending",
      script: "[Re-render 2 — AI Improvements Applied]\n• Rewrite the opening hook with a stronger curiosity pattern\n• Increase visual cut frequency\n\nGym floor. Athlete mid-set. VO: 'Your training does not need more hype. It needs foundation.'",
      parameters: { style: "Commercial", duration: "10s", voice: "Male", background: "Music", aspect: "9:16" },
      rejectionReason: "",
      aiSuggestions: null,
      iterationCount: 2,
      qualityScore: null,
      product: "Apex Testosterone Support",
      hook: "Your training does not need more hype. It needs foundation.",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    }
  ];
}

// ── End Media Gallery helpers ──────────────────────────────────────────────

const MEDIA_TYPES = [
  { id: "All", label: "All Media" },
  { id: "video", label: "Video" },
  { id: "print_ad", label: "Print Ads" },
  { id: "email", label: "Email" },
  { id: "social_post", label: "Social Posts" },
  { id: "landing_page", label: "Landing Pages" },
  { id: "ugc", label: "UGC" },
  { id: "banner", label: "Banners" }
];

// Shared demo datasets are synchronized from render() for handlers that run outside render scope.
var RENDER_APPS = [];
var DEMO_MEDIA = [];
var DEMO_PUBLISHED_MEDIA = [];

function render() {
  const app = document.getElementById("app");
  const ad = selectedAd();
  const categories = ["All", ...new Set(viralAds.map((item) => item.category))];
  const platforms = ["All", ...new Set(viralAds.map((item) => item.platform))];
  const productNames = ["All", ...products.map((p) => p.name)];
  const hookCategories = ["All", ...new Set(winningHooks.map((h) => h.category))];
  const hookPlatforms = ["All", ...new Set(winningHooks.map((h) => h.platform))];
  const productCategories = ["All", ...new Set(products.map((p) => p.category))];
  const highConfidenceCount = winningHooks.filter((h) => h.confidence === "High").length;

const RENDER_APPS = [
  { id: "All",      label: "All Apps" },
  { id: "heygen",   label: "HeyGen" },
  { id: "runway",   label: "Runway" },
  { id: "kling",    label: "Kling" },
  { id: "internal", label: "Internal" },
  { id: "manual",   label: "Manual" },
  { id: "canva",    label: "Canva" },
  { id: "openai",   label: "OpenAI" }
];

// Demo media items used when Supabase is unavailable
const DEMO_MEDIA = [
  { id: "m-001", media_type: "video",       platform: "heygen",   status: "complete", script: "Sea Moss morning ritual — 15s UGC",          score: 94, created_at: "2025-01-15T08:00:00Z", video_url: null, product: "Sea Moss Capsules",        hook: "Nobody tells you minerals can change your whole morning." },
  { id: "m-002", media_type: "video",       platform: "runway",   status: "complete", script: "Collagen glow lifestyle edit — 9:16",         score: 89, created_at: "2025-01-15T09:30:00Z", video_url: null, product: "Genesis Glow Collagen",      hook: "This changed my skin in 7 days." },
  { id: "m-003", media_type: "video",       platform: "kling",    status: "pending",  script: "Testosterone gym commercial — 30s",           score: 81, created_at: "2025-01-15T10:00:00Z", video_url: null, product: "Apex Testosterone Support",  hook: "Your training needs foundation, not hype." },
  { id: "m-004", media_type: "print_ad",    platform: "canva",    status: "complete", script: "Sea Moss flatlay print — A4 portrait",        score: 87, created_at: "2025-01-14T14:00:00Z", video_url: null, product: "Sea Moss Capsules",        hook: "The mineral ritual your body has been missing." },
  { id: "m-005", media_type: "print_ad",    platform: "manual",   status: "complete", script: "Collagen beauty magazine spread",             score: 83, created_at: "2025-01-14T15:30:00Z", video_url: null, product: "Genesis Glow Collagen",      hook: "Glow from within." },
  { id: "m-006", media_type: "email",       platform: "internal", status: "complete", script: "Weekly wellness newsletter — Jan 15",         score: 76, created_at: "2025-01-14T16:00:00Z", video_url: null, product: "Genesis Wellness Bundle",    hook: "Your weekly ritual starts here." },
  { id: "m-007", media_type: "email",       platform: "internal", status: "draft",    script: "Flash sale email — 48hr offer",               score: 71, created_at: "2025-01-13T11:00:00Z", video_url: null, product: "Metabolic Ignite",           hook: "48 hours. Your reset starts now." },
  { id: "m-008", media_type: "social_post", platform: "canva",    status: "complete", script: "TikTok caption + hook card — Sea Moss",       score: 90, created_at: "2025-01-15T07:00:00Z", video_url: null, product: "Sea Moss Capsules",        hook: "Nobody talks about this morning habit..." },
  { id: "m-009", media_type: "social_post", platform: "openai",   status: "complete", script: "Instagram carousel — 5 slides, Collagen",     score: 85, created_at: "2025-01-14T12:00:00Z", video_url: null, product: "Genesis Glow Collagen",      hook: "5 reasons your skin needs collagen now." },
  { id: "m-010", media_type: "landing_page",platform: "internal", status: "complete", script: "Sea Moss product landing page — v3",          score: 92, created_at: "2025-01-13T09:00:00Z", video_url: null, product: "Sea Moss Capsules",        hook: "The mineral ritual trusted by 10,000+ customers." },
  { id: "m-011", media_type: "ugc",         platform: "heygen",   status: "complete", script: "UGC testimonial — weight loss journey",       score: 88, created_at: "2025-01-12T10:00:00Z", video_url: null, product: "Metabolic Ignite",           hook: "I lost 12 lbs in 30 days with this morning reset." },
  { id: "m-012", media_type: "banner",      platform: "canva",    status: "complete", script: "Google Display banner — 728x90 + 300x250",    score: 74, created_at: "2025-01-11T13:00:00Z", video_url: null, product: "NeuroRise Focus",            hook: "Upgrade your focus stack." }
];

// Demo published media items
const DEMO_PUBLISHED_MEDIA = [
  {
    id: "pub-001",
    title: "Sea Moss Morning Ritual — 15s UGC",
    platform: "heygen",
    publishedTo: ["TikTok", "Instagram Reels"],
    status: "live",
    videoUrl: null,
    product: "Sea Moss Capsules",
    hook: "Nobody tells you minerals can change your whole morning.",
    score: 94,
    views: 48200,
    engagement: 12.8,
    conversion: 4.2,
    createdAt: "2025-01-15T08:00:00Z",
    publishedAt: "2025-01-15T12:00:00Z"
  },
  {
    id: "pub-002",
    title: "Collagen Glow Lifestyle Edit — 9:16",
    platform: "runway",
    publishedTo: ["Instagram", "Pinterest"],
    status: "live",
    videoUrl: null,
    product: "Genesis Glow Collagen",
    hook: "This changed my skin in 7 days.",
    score: 89,
    views: 31500,
    engagement: 10.4,
    conversion: 3.8,
    createdAt: "2025-01-14T09:30:00Z",
    publishedAt: "2025-01-14T14:00:00Z"
  },
  {
    id: "pub-003",
    title: "Focus Founder Desk UGC — 30s",
    platform: "heygen",
    publishedTo: ["YouTube Shorts", "X"],
    status: "live",
    videoUrl: null,
    product: "NeuroRise Focus",
    hook: "I stopped treating my focus like a willpower problem.",
    score: 87,
    views: 22100,
    engagement: 9.1,
    conversion: 3.1,
    createdAt: "2025-01-13T10:00:00Z",
    publishedAt: "2025-01-13T16:00:00Z"
  },
  {
    id: "pub-004",
    title: "Metabolic Ignite Morning Reset — 15s",
    platform: "kling",
    publishedTo: ["TikTok", "Facebook"],
    status: "live",
    videoUrl: null,
    product: "Metabolic Ignite",
    hook: "My 2 PM crash disappeared when I started doing this.",
    score: 83,
    views: 18700,
    engagement: 8.7,
    conversion: 2.9,
    createdAt: "2025-01-12T11:00:00Z",
    publishedAt: "2025-01-12T15:00:00Z"
  },
  {
    id: "pub-005",
    title: "Testosterone Gym Commercial — 30s",
    platform: "runway",
    publishedTo: ["YouTube", "TikTok"],
    status: "scheduled",
    videoUrl: null,
    product: "Apex Testosterone Support",
    hook: "Your training does not need more hype. It needs foundation.",
    score: 81,
    views: 0,
    engagement: 0,
    conversion: 0,
    createdAt: "2025-01-15T10:00:00Z",
    publishedAt: "2025-01-16T09:00:00Z"
  },
  {
    id: "pub-006",
    title: "Sea Moss TikTok Caption Card",
    platform: "canva",
    publishedTo: ["TikTok"],
    status: "live",
    videoUrl: null,
    product: "Sea Moss Capsules",
    hook: "Nobody talks about this morning habit...",
    score: 90,
    views: 61400,
    engagement: 14.2,
    conversion: 5.1,
    createdAt: "2025-01-15T07:00:00Z",
    publishedAt: "2025-01-15T10:00:00Z"
  },
  {
    id: "pub-007",
    title: "Collagen Instagram Carousel — 5 Slides",
    platform: "openai",
    publishedTo: ["Instagram"],
    status: "live",
    videoUrl: null,
    product: "Genesis Glow Collagen",
    hook: "5 reasons your skin needs collagen now.",
    score: 85,
    views: 14300,
    engagement: 11.2,
    conversion: 3.4,
    createdAt: "2025-01-14T12:00:00Z",
    publishedAt: "2025-01-14T18:00:00Z"
  },
  {
    id: "pub-008",
    title: "UGC Testimonial — Weight Loss Journey",
    platform: "heygen",
    publishedTo: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    status: "archived",
    videoUrl: null,
    product: "Metabolic Ignite",
    hook: "I lost 12 lbs in 30 days with this morning reset.",
    score: 88,
    views: 94200,
    engagement: 13.6,
    conversion: 4.8,
    createdAt: "2025-01-10T10:00:00Z",
    publishedAt: "2025-01-10T14:00:00Z"
  }
];

// Sync render-scoped demo data to global scope for event handlers (bindEvents, delegated actions).
window.RENDER_APPS = RENDER_APPS;
window.DEMO_MEDIA = DEMO_MEDIA;
window.DEMO_PUBLISHED_MEDIA = DEMO_PUBLISHED_MEDIA;

// Demo analytics data
const DEMO_ANALYTICS = {
  totalVideosCreated: 114,
  totalCreatives: 47,
  approvalRate: 68,
  avgQualityScore: 87,
  totalTrendsScanned: 8420,
  hookEffectiveness: 91,
  ctaConversionRate: 4.8,
  avgWatchTime: 14.2,
  avgEngagementRate: 10.2,
  revenueAttributed: 12840,
  platformBreakdown: {
    tiktok:    { videos: 42, views: 2400000, engagement: 12.8, conversion: 4.2 },
    instagram: { videos: 31, views: 1180000, engagement: 10.4, conversion: 3.8 },
    youtube:   { videos: 18, views: 892000,  engagement: 9.1,  conversion: 3.1 },
    facebook:  { videos: 14, views: 640000,  engagement: 8.7,  conversion: 2.9 },
    pinterest: { videos: 9,  views: 420000,  engagement: 7.9,  conversion: 2.4 }
  },
  qualityBreakdown: {
    hookStrengthAvg: 91,
    pacingScoreAvg: 84,
    ctaClarityAvg: 78,
    visualStyleAvg: 86,
    overallAvg: 87
  },
  topHooks: [
    { text: "Nobody talks about this morning habit...", platform: "TikTok", views: 61400, conversion: 5.1 },
    { text: "I lost 12 lbs in 30 days with this morning reset.", platform: "TikTok", views: 94200, conversion: 4.8 },
    { text: "Nobody tells you minerals can change your whole morning.", platform: "Instagram", views: 48200, conversion: 4.2 },
    { text: "This changed my skin in 7 days.", platform: "Instagram", views: 31500, conversion: 3.8 },
    { text: "I stopped treating my focus like a willpower problem.", platform: "YouTube", views: 22100, conversion: 3.1 }
  ]
};

// Demo agent statuses
const DEMO_AGENT_STATUSES = [
  {
    id: "trend-scout",
    name: "Trend Scout Agent",
    role: "Scanning viral content across TikTok, Instagram, YouTube, Facebook, Pinterest",
    status: "active",
    currentTask: "Scanning viral ads for hook patterns",
    processingTime: "2.4s avg",
    lastResult: "Found 12 high-confidence hooks in Beauty + Weight Loss categories",
    qualityScore: 94,
    nextAction: "Rescan at 6:00 AM — targeting 1,500 ads",
    icon: "radar"
  },
  {
    id: "product-match",
    name: "Product Match Agent",
    role: "Matching trending content patterns to EVICS product catalog",
    status: "active",
    currentTask: "Matching Sea Moss + Collagen to top 5 viral structures",
    processingTime: "1.1s avg",
    lastResult: "Sea Moss Capsules matched to 3 viral hooks — confidence: High",
    qualityScore: 91,
    nextAction: "Re-match after next viral scan",
    icon: "filter"
  },
  {
    id: "script-writer",
    name: "Script Writer Agent",
    role: "Generating ad scripts from viral structures and product angles",
    status: "active",
    currentTask: "Writing 5 UGC scripts for Sea Moss + Metabolic Ignite",
    processingTime: "3.8s avg",
    lastResult: "Generated 4 scripts — avg quality score 88/100",
    qualityScore: 88,
    nextAction: "Queue scripts for Visual Director review",
    icon: "spark"
  },
  {
    id: "visual-director",
    name: "Visual Director Agent",
    role: "Analyzing visual patterns and directing HeyGen / Runway / Kling renders",
    status: "active",
    currentTask: "Analyzing pacing and visual style for 3 pending renders",
    processingTime: "4.2s avg",
    lastResult: "Approved 2 renders — rejected 1 for slow pacing in first 2s",
    qualityScore: 86,
    nextAction: "Send approved renders to publishing queue",
    icon: "video"
  },
  {
    id: "office-agent",
    name: "Office Agent",
    role: "Orchestrating all agents — scheduling, prioritizing, and reporting",
    status: "active",
    currentTask: "Coordinating morning pipeline: Scan → Match → Script → Render",
    processingTime: "0.3s avg",
    lastResult: "Pipeline cycle 6 complete — 4 ads generated, 2 approved, 1 published",
    qualityScore: 98,
    nextAction: "Trigger nightly learning loop at 11:00 PM",
    icon: "gear"
  },
  {
    id: "copilot",
    name: "Copilot",
    role: "Providing AI suggestions, answering workspace questions, surfacing insights",
    status: "standby",
    currentTask: "Awaiting user query",
    processingTime: "1.9s avg",
    lastResult: "Suggested focusing on Sea Moss UGC for TikTok this week",
    qualityScore: 95,
    nextAction: "Ready for next question",
    icon: "spark"
  }
];

async function loadAgentStatuses() {
  state.agentStatusLoading = true;
  state.agentStatusError = null;
  render();
  try {
    const res = await fetch("/api/agents/status");
    if (res.ok) {
      const data = await res.json();
      state.agentStatuses = data.agents || DEMO_AGENT_STATUSES;
      state.agentPipelineHealth = data.pipelineHealth || 98;
    } else {
      state.agentStatuses = DEMO_AGENT_STATUSES;
    }
  } catch {
    state.agentStatuses = DEMO_AGENT_STATUSES;
  }
  state.agentStatusLoading = false;
  render();
}

async function loadPublishedMedia() {
  state.publishedMediaLoading = true;
  render();
  try {
    const res = await fetch("/api/published-media");
    if (res.ok) {
      const data = await res.json();
      state.publishedMedia = data.media && data.media.length ? data.media : DEMO_PUBLISHED_MEDIA;
    } else {
      state.publishedMedia = DEMO_PUBLISHED_MEDIA;
    }
  } catch {
    state.publishedMedia = DEMO_PUBLISHED_MEDIA;
  }
  state.publishedMediaLoading = false;
  render();
}

async function loadAnalyticsData() {
  state.analyticsLoading = true;
  render();
  try {
    const res = await fetch("/api/analytics/summary");
    if (res.ok) {
      const data = await res.json();
      state.analyticsData = data.summary || DEMO_ANALYTICS;
    } else {
      state.analyticsData = DEMO_ANALYTICS;
    }
  } catch {
    state.analyticsData = DEMO_ANALYTICS;
  }
  state.analyticsLoading = false;
  render();
}

async function validateQuality(controlEl = document.getElementById("quality-validate-btn")) {
  if (controlEl) setExecControlState(controlEl, "running");
  state.qualityValidating = true;
  state.qualityResult = null;
  render();
  try {
    const res = await fetch("/api/quality/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...state.qualityScores, thresholds: state.qualityThresholds })
    });
    if (res.ok) {
      const data = await res.json();
      state.qualityResult = data;
    } else {
      state.qualityResult = enforceEliteStandards(state.qualityScores);
    }
  } catch {
    state.qualityResult = enforceEliteStandards(state.qualityScores);
  }
  state.qualityValidating = false;
  if (controlEl) setExecControlState(controlEl, "completed", 1800);
  render();
}

function enforceEliteStandards(scores) {
  const thresholds = state.qualityThresholds;
  const failures = [];
  const warnings = [];
  Object.entries(thresholds).forEach(([key, min]) => {
    const val = Number(scores[key] || 0);
    if (val < min) {
      failures.push({ metric: key, score: val, required: min, gap: min - val });
    } else if (val < min + 10) {
      warnings.push({ metric: key, score: val, required: min, margin: val - min });
    }
  });
  const passed = failures.length === 0;
  const action = passed ? "approve" : failures.some((f) => f.gap > 15) ? "reject" : "requeue";
  return {
    passed,
    action,
    failures,
    warnings,
    scores,
    thresholds,
    message: passed
      ? "Video meets elite quality standards. Approved for publishing."
      : `Video failed ${failures.length} quality check(s). Action: ${action}.`
  };
}

// ── Elite Quality: shared config + scoring model over the most recent scan ──
const QUALITY_METRIC_LABELS = {
  hookStrength: "Hook Strength",
  pacingScore: "Pacing Score",
  ctaClarity: "CTA Clarity",
  visualStyle: "Visual Style",
  overallQuality: "Overall Quality"
};

const QUALITY_DEFAULT_THRESHOLDS = {
  hookStrength: 75,
  pacingScore: 70,
  ctaClarity: 75,
  visualStyle: 80,
  overallQuality: 80
};

const QUALITY_VISUAL_TAG_HINTS = [
  "luxury", "cinematic", "slow motion", "slow-motion", "gold", "flatlay", "lifestyle",
  "product reveal", "routine", "bathroom", "gym scene", "desk setup", "ambient",
  "subtitles", "split screen", "b-roll", "voiceover", "aesthetic", "premium"
];

let __qualityImpactRaf = null;

function clampQualityScore(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

// Derive the five elite dimensions from the REAL scraped signals on a scanned
// item (velocity, engagement, views, conversion, hook, cta, structure, tags).
// Deterministic — reflects the actual scan, never random placeholders.
function deriveScanQualityDimensions(ad) {
  if (!ad || typeof ad !== "object") {
    return { hookStrength: 0, pacingScore: 0, ctaClarity: 0, visualStyle: 0, overallQuality: 0 };
  }
  const views = Number(ad.views || 0);
  const engagement = Number(ad.engagement || 0);
  const velocity = Number(ad.velocity || 0);
  const conversion = Number(ad.conversion || 0);
  const hook = String(ad.hook || ad.title || "").trim();
  const cta = String(ad.cta || "").trim();
  const structure = Array.isArray(ad.structure) ? ad.structure : [];
  const tags = Array.isArray(ad.tags) ? ad.tags.map((t) => String(t).toLowerCase()) : [];

  const vel = clampQualityScore(velocity);
  const eng = clampQualityScore(engagement * 7);
  const conv = clampQualityScore(conversion);
  const viewsScore = clampQualityScore(((Math.log10(Math.max(views, 1)) - 3) / 4) * 100);
  const structureDepth = clampQualityScore((structure.length / 6) * 100);
  const ctaScore = cta.length >= 4 ? clampQualityScore(60 + cta.length) : 25;
  const visualHits = tags.filter((t) => QUALITY_VISUAL_TAG_HINTS.some((h) => t.includes(h))).length;
  const visualTagScore = clampQualityScore(35 + visualHits * 18);
  const hookScore = hook.length >= 8 ? clampQualityScore(55 + Math.min(hook.length, 60) * 0.4) : 20;

  const hookStrength = clampQualityScore(0.50 * vel + 0.25 * eng + 0.15 * viewsScore + 0.10 * hookScore);
  const pacingScore = clampQualityScore(0.40 * vel + 0.35 * structureDepth + 0.25 * eng);
  const ctaClarity = clampQualityScore(0.55 * conv + 0.45 * ctaScore);
  const visualStyle = clampQualityScore(0.45 * eng + 0.30 * viewsScore + 0.25 * visualTagScore);
  const overallQuality = clampQualityScore((hookStrength + pacingScore + ctaClarity + visualStyle) / 4);

  return { hookStrength, pacingScore, ctaClarity, visualStyle, overallQuality };
}

function getMostRecentScanItems() {
  return Array.isArray(viralAds) ? viralAds : [];
}

function computeScanEliteImpact(thresholds) {
  const th = thresholds || state.qualityThresholds || QUALITY_DEFAULT_THRESHOLDS;
  const items = getMostRecentScanItems().map((ad, i) => {
    const dims = deriveScanQualityDimensions(ad);
    const failedMetrics = Object.keys(th).filter((k) => Number(dims[k]) < Number(th[k]));
    return {
      id: String(ad.id || ("scan-" + i)),
      title: String(ad.title || ad.hook || "Untitled scan item"),
      platform: String(ad.platform || ""),
      dims,
      passed: failedMetrics.length === 0,
      failedMetrics
    };
  });
  const passing = items.filter((it) => it.passed).length;
  return { total: items.length, passing, items };
}

function persistQualityThresholds() {
  try {
    localStorage.setItem("evics_quality_thresholds", JSON.stringify(state.qualityThresholds));
  } catch (e) { /* ignore storage errors */ }
}

function loadPersistedQualityThresholds() {
  if (window.__evicsQualityThresholdsLoaded) return;
  window.__evicsQualityThresholdsLoaded = true;
  try {
    const raw = localStorage.getItem("evics_quality_thresholds");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      Object.keys(state.qualityThresholds).forEach((k) => {
        const v = Number(parsed[k]);
        if (Number.isFinite(v)) state.qualityThresholds[k] = Math.max(0, Math.min(100, Math.round(v)));
      });
    }
  } catch (e) { /* ignore malformed storage */ }
}

function renderScanImpactPanel() {
  const impact = computeScanEliteImpact(state.qualityThresholds);
  const scanContext = state.scanCount
    ? `${Number(state.scanCount).toLocaleString()} scanned trends`
    : `${impact.total} scanned ${impact.total === 1 ? "item" : "items"}`;
  const dateNote = state.lastScanDate
    ? ` · last scan ${new Date(state.lastScanDate).toLocaleString()}`
    : "";
  const passRate = impact.total ? Math.round((impact.passing / impact.total) * 100) : 0;

  const body = impact.total === 0
    ? `<p class="quality-scan-empty">No scan data yet. Run a scan in the <strong>Viral Trends Monitor</strong> to grade real scraped videos against your elite thresholds.</p>`
    : `
      <div class="quality-scan-summary">
        <div class="quality-scan-stat">
          <strong class="quality-scan-pass">${impact.passing}</strong>
          <span>of ${impact.total} meet elite standards</span>
        </div>
        <div class="quality-scan-rate">
          <div class="quality-scan-rate-track">
            <div class="quality-scan-rate-fill" style="width:${passRate}%"></div>
          </div>
          <span>${passRate}% elite pass rate</span>
        </div>
      </div>
      <ul class="quality-scan-list">
        ${impact.items.map((it) => `
          <li class="quality-scan-item ${it.passed ? "is-pass" : "is-fail"}">
            <div class="quality-scan-item-head">
              <span class="quality-scan-badge">${it.passed ? "ELITE" : "BELOW"}</span>
              <span class="quality-scan-title">${escapeHtml(it.title)}</span>
              ${it.platform ? `<span class="quality-scan-platform">${escapeHtml(it.platform)}</span>` : ""}
            </div>
            <div class="quality-scan-dims">
              ${Object.keys(QUALITY_METRIC_LABELS).map((k) => {
                const failed = it.failedMetrics.includes(k);
                const abbr = QUALITY_METRIC_LABELS[k].split(" ").map((w) => w[0]).join("");
                return `<span class="quality-scan-dim ${failed ? "dim-fail" : "dim-pass"}" title="${QUALITY_METRIC_LABELS[k]}: ${it.dims[k]}">${abbr} ${it.dims[k]}</span>`;
              }).join("")}
            </div>
          </li>
        `).join("")}
      </ul>`;

  return `
    <div class="quality-scan-impact" id="quality-scan-impact">
      <div class="quality-scan-impact-head">
        <h3>${icon("radar")} Live Scan Impact</h3>
        <span class="quality-scan-context">${scanContext}${dateNote}</span>
      </div>
      ${body}
      <p class="quality-scan-note">Each dimension is derived from the item's real scraped signals — velocity, engagement, views, conversion, CTA and structure. Adjust the thresholds above to change what qualifies as elite.</p>
    </div>
  `;
}

function refreshQualityImpactDOM() {
  const th = state.qualityThresholds;
  const sc = state.qualityScores;
  Object.keys(th).forEach((k) => {
    const tv = document.getElementById("quality-threshold-val-" + k);
    if (tv) tv.textContent = String(th[k]);
    const sm = document.getElementById("quality-scoremin-" + k);
    if (sm) sm.textContent = "min " + th[k];
    const sv = document.getElementById("quality-val-" + k);
    if (sv) {
      sv.textContent = String(sc[k]);
      const pass = Number(sc[k]) >= Number(th[k]);
      sv.classList.toggle("quality-pass-text", pass);
      sv.classList.toggle("quality-fail-text", !pass);
    }
  });
  if (__qualityImpactRaf) return;
  const schedule = window.requestAnimationFrame || ((f) => setTimeout(f, 16));
  __qualityImpactRaf = schedule(() => {
    __qualityImpactRaf = null;
    const impactEl = document.getElementById("quality-scan-impact");
    if (impactEl) impactEl.outerHTML = renderScanImpactPanel();
  });
}

function filteredPublishedMedia() {
  const items = state.publishedMedia.length ? state.publishedMedia : DEMO_PUBLISHED_MEDIA;
  if (state.publishedMediaFilter === "All") return items;
  return items.filter((m) => m.status === state.publishedMediaFilter);
}

function filteredMedia() {
  const library = Array.isArray(state.mediaLibrary) ? state.mediaLibrary : [];
  return library.filter((item) => {
    const typeMatch = state.selectedMediaType === "All" || item.media_type === state.selectedMediaType;
    const appMatch  = state.selectedRenderApp  === "All" || item.platform    === state.selectedRenderApp;
    return typeMatch && appMatch;
  });
}

function selectedMedia() {
  const library = Array.isArray(state.mediaLibrary) ? state.mediaLibrary : [];
  return library.find((m) => String(m.id) === String(state.selectedMediaId)) || null;
}

function mediaTypeLabel(id) {
  const t = MEDIA_TYPES.find((t) => t.id === id);
  return t ? t.label : id;
}

function renderAppLabel(id) {
  const a = RENDER_APPS.find((a) => a.id === id);
  return a ? a.label : id;
}

function mediaAssetUrl(item) {
  return item?.video_url || item?.videoUrl || item?.preview_url || item?.previewUrl || item?.storage_url || item?.storageUrl || "";
}

function mediaAssetType(item) {
  return String(item?.media_type || item?.mediaType || "video").toLowerCase();
}

function renderMediaPreviewSurface(item, mode = "detail") {
  const mediaType = mediaAssetType(item);
  const source = mediaAssetUrl(item);
  const title = item?.script || item?.title || "Media preview";
  const isVideo = mediaType === "video" || mediaType === "ugc";
  const isDocument = mediaType === "print_ad" || mediaType === "banner";
  const isLanding = mediaType === "landing_page";
  const isEmail = mediaType === "email";
  const wrapperClass = mode === "modal" ? "media-review-surface" : "media-preview-surface";

  if (source) {
    if (isVideo) {
      return `<video class="${mode === "modal" ? "media-review-video-player" : "media-video-player"}" src="${source}" controls playsinline></video>`;
    }
    if (isLanding || isEmail || /\.html?(?:$|\?)/i.test(source)) {
      return `<iframe class="media-html-viewer" src="${source}" title="${title}"></iframe>`;
    }
    if (/\.pdf(?:$|\?)/i.test(source) || isDocument) {
      return `<iframe class="media-doc-viewer" src="${source}" title="${title}"></iframe>`;
    }
    return `<img class="${mode === "modal" ? "media-review-image-viewer" : "media-image-viewer"}" src="${source}" alt="${title}" />`;
  }

  const heading = isDocument
    ? "Print / Banner proof surface"
    : isLanding
      ? "Landing page review surface"
      : isEmail
        ? "Email review surface"
        : isVideo
          ? "Video proof surface"
          : "Social media review surface";
  const score = item.score || item.qualityScore || "—";
  const proofBlurb = isVideo
    ? "No playback URL is attached yet, so the executive review shell is showing the creative metadata and approval actions instead of an empty box."
    : "This asset is being reviewed without a live source link, so the proof shell highlights the title, score, platform, and notes.";
  const primaryAction = item.storageUrl
    ? `<button class="media-preview-open" type="button" data-open-url="${escapeHtml(item.storageUrl)}">Open storage copy</button>`
    : "";
  const secondaryAction = item.videoUrl
    ? `<button class="media-preview-open secondary" type="button" data-open-url="${escapeHtml(item.videoUrl)}">Open playback copy</button>`
    : "";
  return `<div class="${wrapperClass} media-preview-fallback">
    <div class="media-surface-label">${heading}</div>
    <div class="media-preview-fallback-hero ${isVideo ? "is-video" : "is-static"}">
      <div class="media-preview-fallback-icon">${mediaTypeIcon(mediaType)}</div>
      <div class="media-preview-fallback-copy">
        <h4>${item.product || "Creative Asset"}</h4>
        <p>${proofBlurb}</p>
      </div>
    </div>
    ${isVideo ? `<div class="media-preview-placeholder"><p>Visible player shell ready for review.</p></div>` : ""}
    <div class="media-surface-footer">
      <span>${mediaTypeLabel(mediaType)}</span>
      <span>${renderAppLabel(item.platform || "internal")}</span>
      <span>Score ${score}</span>
    </div>
    <div class="media-preview-actions">
      ${primaryAction}
      ${secondaryAction}
    </div>
  </div>`;
}

function openMediaReviewModal(item) {
  if (!item) return;
  const normalized = {
    ...item,
    mediaType: mediaAssetType(item),
    platform: item.platform || "internal",
    status: item.status || "pending",
    product: item.product || "Media Asset",
    hook: item.hook || "",
    script: item.script || item.title || "",
    videoUrl: mediaAssetUrl(item),
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    approvalStatus: item.approvalStatus || (item.status === "approved" ? "approved" : item.status === "rejected" ? "discarded" : "pending"),
    parameters: item.parameters || { aspect: "9:16", style: mediaTypeLabel(mediaAssetType(item)), duration: "n/a", voice: "n/a" },
    iterationCount: Number(item.iterationCount || 0),
    qualityScore: item.score || item.qualityScore || 0
  };
  state.mediaReviewVideo = normalized;
  state.mediaReviewOpen = true;
  state.mediaRejectionReason = "";
  state.mediaAiSuggestions = null;
}

function statusBadgeClass(status) {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s === "complete" || s === "approved") return "status-ready";
  if (s === "pending"  || s === "rendering") return "status-review";
  if (s === "draft"    || s === "failed")    return "status-draft";
  return "";
}

// ── Media viewing area (shared across sections) ──
function renderMediaArea(sectionId) {
  const items = filteredMedia();
  const selected = selectedMedia();

  return `
    <div class="media-area">
      <div class="media-area-header">
        <h2>Media Library</h2>
        <div class="media-filters">
          <label class="media-filter-label">
            <span>Type</span>
            <select id="media-type-filter" class="media-filter-select">
              ${MEDIA_TYPES.map((t) => `<option value="${t.id}" ${state.selectedMediaType === t.id ? "selected" : ""}>${t.label}</option>`).join("")}
            </select>
          </label>
          <label class="media-filter-label">
            <span>App</span>
            <select id="media-app-filter" class="media-filter-select">
              ${RENDER_APPS.map((a) => `<option value="${a.id}" ${state.selectedRenderApp === a.id ? "selected" : ""}>${a.label}</option>`).join("")}
            </select>
          </label>
          <button class="ghost media-refresh-btn" id="media-refresh-btn">${icon("radar")} Refresh</button>
        </div>
      </div>

      <div class="media-workspace">
        <!-- Media List -->
        <div class="media-list-panel">
          <div class="media-list-meta">
            <span>${items.length} item${items.length !== 1 ? "s" : ""}</span>
            ${state.selectedMediaType !== "All" ? `<span class="media-filter-tag">${mediaTypeLabel(state.selectedMediaType)}</span>` : ""}
            ${state.selectedRenderApp !== "All" ? `<span class="media-filter-tag">${renderAppLabel(state.selectedRenderApp)}</span>` : ""}
          </div>
          <div class="media-grid">
            ${items.length === 0
              ? `<div class="media-empty">${
                  state.mediaLibraryError
                    ? "Live media service is offline. Restore the EVICS database connection to load real EVICS videos."
                    : (state.mediaLibraryLoading
                        ? "Loading live EVICS media..."
                        : ((state.selectedMediaType !== "All" || state.selectedRenderApp !== "All")
                            ? "No EVICS media matches the selected filters."
                            : "No EVICS-created media yet. Generate a render to populate the library."))
                }</div>`
              : items.map((item) => `
                <button class="media-card ${item.id === state.selectedMediaId ? "media-card-selected" : ""}" data-media-id="${item.id}">
                  <div class="media-card-thumb media-thumb-${item.media_type}">
                    ${mediaAssetUrl(item)
                      ? `<img src="${mediaAssetUrl(item)}" alt="" />`
                      : `<div class="media-thumb-placeholder">${mediaTypeIcon(item.media_type)}</div>`
                    }
                    <span class="media-type-badge">${mediaTypeLabel(item.media_type)}</span>
                  </div>
                  <div class="media-card-body">
                    <strong class="media-card-title">${item.script}</strong>
                    <div class="media-card-meta">
                      <span class="media-app-tag">${renderAppLabel(item.platform)}</span>
                      <span class="media-status-tag ${statusBadgeClass(item.status)}">${item.status}</span>
                    </div>
                    <div class="media-card-score">Score <b>${item.score}</b></div>
                    <div class="media-card-actions">
                      <span class="media-card-open-hint">Click to open panel</span>
                      <span class="media-card-open-link" data-media-review-id="${item.id}" role="button" tabindex="0">Open review</span>
                    </div>
                  </div>
                </button>
              `).join("")
            }
          </div>
        </div>

        <!-- Detail Panel -->
        <div class="media-detail-panel ${selected ? "media-detail-active" : ""}">
          ${selected ? renderMediaDetail(selected) : `
            <div class="media-detail-empty">
              <div class="media-detail-empty-icon">${icon("video")}</div>
              <p>Select a media item to view details</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function mediaTypeIcon(type) {
  const icons = {
    video:        "▶",
    print_ad:     "🖼",
    email:        "✉",
    social_post:  "📱",
    landing_page: "🌐",
    ugc:          "🎥",
    banner:       "📐"
  };
  return icons[type] || "📄";
}

function renderMediaDetail(item) {
  return `
    <div class="media-detail-content">
      <div class="media-detail-header">
        <div>
          <span class="media-detail-type">${mediaTypeLabel(item.media_type)}</span>
          <h3 class="media-detail-title">${item.script}</h3>
        </div>
        <button class="media-detail-close" id="media-detail-close">✕</button>
      </div>

      <!-- Preview -->
      <div class="media-preview-area">
        ${renderMediaPreviewSurface(item)}
      </div>

      <!-- Metadata -->
      <div class="media-detail-meta">
        <dl class="media-meta-grid">
          <div><dt>Product</dt><dd>${item.product || "—"}</dd></div>
          <div><dt>Hook</dt><dd>${item.hook || "—"}</dd></div>
          <div><dt>Rendering App</dt><dd>${renderAppLabel(item.platform)}</dd></div>
          <div><dt>Media Type</dt><dd>${mediaTypeLabel(item.media_type)}</dd></div>
          <div><dt>Quality Score</dt><dd><strong>${item.score}</strong> / 100</dd></div>
          <div><dt>Status</dt><dd><span class="status-badge ${statusBadgeClass(item.status)}">${item.status}</span></dd></div>
          <div><dt>Created</dt><dd>${new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
        </dl>
      </div>

      <!-- Status & Approval Workflow -->
      <div class="media-detail-workflow">
        <h4>Approval Workflow</h4>
        <div class="media-workflow-steps">
          <div class="workflow-step ${item.status !== "draft" ? "workflow-done" : ""}">
            <span class="workflow-dot"></span><span>Generated</span>
          </div>
          <div class="workflow-step ${item.status === "complete" || item.status === "approved" ? "workflow-done" : ""}">
            <span class="workflow-dot"></span><span>Review</span>
          </div>
          <div class="workflow-step ${item.status === "approved" ? "workflow-done" : ""}">
            <span class="workflow-dot"></span><span>Approved</span>
          </div>
          <div class="workflow-step">
            <span class="workflow-dot"></span><span>Published</span>
          </div>
        </div>
      </div>

      ${item.status === "complete" || item.status === "pending" ? `
      <!-- AI Suggestions for improvement -->
      <div class="media-ai-suggestions">
        <h4>${icon("spark")} AI Suggestions</h4>
        <ul>
          <li>Strengthen the hook in the first 2 seconds for higher retention.</li>
          <li>Add a clear CTA overlay at the 80% mark.</li>
          <li>Test a split-screen variant for A/B comparison.</li>
        </ul>
      </div>
      ` : ""}

      <!-- Action Buttons -->
      <div class="media-detail-actions">
        <button class="media-action-btn media-action-review" data-media-review-id="${item.id}">
          ${icon("video")} Open Review Surface
        </button>
        <button class="media-action-btn media-action-approve" data-media-action="approve" data-media-id="${item.id}">
          ${icon("check")} Approve
        </button>
        <button class="media-action-btn media-action-reject" data-media-action="reject" data-media-id="${item.id}">
          ✕ Reject
        </button>
        <button class="media-action-btn media-action-requeue" data-media-action="requeue" data-media-id="${item.id}">
          ${icon("radar")} Requeue
        </button>
        <button class="media-action-btn media-action-download" data-media-action="download" data-media-id="${item.id}">
          ↓ Download
        </button>
        ${state.mediaActionStatus && state.mediaActionStatus.id === item.id ? `
        <span class="media-action-feedback ${state.mediaActionStatus.type}">${state.mediaActionStatus.message}</span>
        ` : ""}
      </div>
    </div>
  `;
}

// ── Viral Gallery helpers ──

async function loadViralGallery() {
  state.viralLoading = true;
  render();
  try {
    const params = new URLSearchParams();
    if (state.viralFilterPlatform !== "All") params.set("platform", state.viralFilterPlatform);
    if (state.viralFilterCategory !== "All") params.set("category", state.viralFilterCategory);
    const res = await fetch(`/api/viral/gallery?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.videos)) {
        state.viralVideos = data.videos.map(mapViralVideo);
      } else {
        state.viralVideos = [];
      }
    } else {
      state.viralVideos = [];
    }
  } catch {
    state.viralVideos = [];
  }
  state.viralLoading = false;
  render();
}

// ── Live EVICS Media Library (evics_renders) ──

function normalizeRenderStatus(status) {
  const s = String(status || "").toLowerCase().trim();
  if (!s) return "complete";
  if (s === "completed" || s === "ready" || s === "published" || s === "live") return "complete";
  if (s === "processing" || s === "rendering" || s === "queued" || s === "in_progress") return "pending";
  return s;
}

function mapRenderToMediaItem(row) {
  const renderId = row.render_id || row.id || row.job_id || row.video_id || "";
  const directUrl = row.video_url || row.final_video_url || row.render_url || row.output_url || row.storage_url || "";
  const status = normalizeRenderStatus(row.status);
  const isComplete = status === "complete" || status === "approved";
  const playbackUrl = directUrl || (renderId && isComplete ? ("/api/media/playback/" + encodeURIComponent(renderId)) : "");
  const rawScore = row.score != null ? row.score
    : row.render_grade != null ? row.render_grade
    : row.quality_score != null ? row.quality_score
    : row.viral_potential != null ? row.viral_potential
    : 0;
  const score = Number(rawScore);
  return {
    id: String(renderId || ("render-" + Math.random().toString(36).slice(2))),
    media_type: String(row.media_type || row.mediaType || "video").toLowerCase(),
    platform: row.platform || row.render_app || "internal",
    status: status,
    script: row.script || row.title || row.product_title || row.product_name || row.render_name || "EVICS render",
    score: Number.isFinite(score) ? Math.round(score) : 0,
    created_at: row.created_at || row.updated_at || new Date().toISOString(),
    video_url: playbackUrl,
    thumbnail_url: row.thumbnail_url || row.poster_url || null,
    product: row.product_title || row.product_name || row.product || "",
    hook: row.hook || row.script || "",
    parameters: row.parameters || null,
    source: "evics_generated"
  };
}

async function loadMediaLibrary() {
  state.mediaLibraryLoading = true;
  state.mediaLibraryError = false;
  render();
  try {
    const res = await fetch("/api/renders");
    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data.renders) ? data.renders
        : Array.isArray(data.media) ? data.media
        : Array.isArray(data.results) ? data.results
        : [];
      state.mediaLibrary = rows.map(mapRenderToMediaItem);
      state.mediaLibraryError = false;
    } else {
      state.mediaLibrary = [];
      state.mediaLibraryError = true;
    }
  } catch {
    state.mediaLibrary = [];
    state.mediaLibraryError = true;
  }
  state.mediaLibraryLoading = false;
  render();
}

function getFilteredDemoViralVideos() {
  return viralAds.filter((ad) => {
    const pMatch = state.viralFilterPlatform === "All" || ad.platform === state.viralFilterPlatform;
    const cMatch = state.viralFilterCategory === "All" || ad.category === state.viralFilterCategory;
    return pMatch && cMatch;
  });
}

function mapViralVideo(row) {
  return {
    id: row.id,
    platform: row.platform || "Unknown",
    category: row.category || "Uncategorized",
    title: row.title || "Untitled viral video",
    hook: row.hook || "",
    views: Number(row.views || 0),
    engagement: Number(row.engagement || 0),
    velocity: Number(row.velocity || 0),
    conversion: Number(row.conversion || 0),
    cta: row.cta || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    productMatch: row.product_match || "",
    emotion: row.emotion || "",
    structure: Array.isArray(row.structure) ? row.structure : [],
    videoUrl: row.video_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    source: row.source || "scraped"
  };
}

async function generateViralAnalysis(videoId) {
  state.viralAnalysisLoading = true;
  state.viralAnalysis = null;
  render();
  try {
    const res = await fetch(`/api/viral/${videoId}/analyze`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        state.viralAnalysis = data.analysis;
        state.viralLoading = false;
        state.viralAnalysisLoading = false;
        render();
        return;
      }
    }
  } catch { /* fall through to demo */ }
  // Demo analysis
  const video = state.viralVideos.find((v) => v.id === videoId) || state.viralVideos[0] || null;
  if (!video) {
    state.viralAnalysis = null;
    state.viralAnalysisLoading = false;
    render();
    return;
  }
  state.viralAnalysis = {
    id: videoId,
    whatsWorking: [
      { label: "Hook strength", score: Math.round(70 + (video.velocity || 80) * 0.2), note: `"${video.hook || "Pattern-matched hook"}" — strong curiosity trigger` },
      { label: "Pacing", score: Math.round(65 + (video.engagement || 10) * 1.5), note: "Fast cuts in first 3 seconds drive retention above 70%" },
      { label: "CTA clarity", score: Math.round(72 + (video.conversion || 75) * 0.1), note: `"${video.cta || "Benefit-led CTA"}" — direct and action-oriented` },
      { label: "Visual style", score: Math.round(75 + (video.velocity || 80) * 0.12), note: "UGC-style authenticity signals high trust with target audience" }
    ],
    whatsWeak: [
      { label: "Mid-video drop", note: "Engagement dips at 8–12s — needs a re-hook or pattern interrupt" },
      { label: "Product reveal timing", note: "Product shown too early — move to 40% mark for better conversion" }
    ],
    formatBreakdown: {
      hook: video.hook || "Pattern-matched curiosity hook",
      pacing: video.platform === "TikTok" ? "Fast (1–2s cuts)" : video.platform === "YouTube" ? "Medium (3–5s cuts)" : "Medium-fast (2–3s cuts)",
      cta: video.cta || "Benefit-led CTA",
      platform: video.platform || "Multi-platform",
      style: (video.tags || []).some((t) => ["ugc", "testimonial"].includes(t)) ? "UGC / Testimonial" : "Commercial",
      duration: video.platform === "TikTok" ? "15–30s" : video.platform === "YouTube" ? "30–60s" : "15–45s",
      emotion: video.emotion || "Curiosity, transformation, trust"
    },
    analysedAt: new Date().toISOString()
  };
  state.viralAnalysisLoading = false;
  render();
}

// Product Viral Intelligence — per-product viral memory backed by real /api/viral/* endpoints.
// Scan the catalog for winning ad patterns, inspect a product's viral profile, find more ads, reproduce winners.
function renderProductViralIntelligence() {
  const memories = state.productViralMemories || [];
  const selected = state.selectedProductViral;
  const scanning = state.viralScanInProgress;
  const lastScan = state.lastScanDate ? new Date(state.lastScanDate).toLocaleString() : "Never";
  const nextScan = state.nextScanScheduled ? new Date(state.nextScanScheduled).toLocaleString() : "Not scheduled";

  return `
    <section class="pvi-section panel">
      <div class="viral-gallery-header">
        <div class="viral-gallery-title-row">
          <div>
            <h2>${icon("radar")} Product Viral Intelligence</h2>
            <p>${memories.length} product viral ${memories.length === 1 ? "memory" : "memories"} · scan your catalog for winning ad patterns, then reproduce the winners</p>
          </div>
          <div class="viral-gallery-controls">
            <button class="metric-btn ${scanning ? "scanning" : ""}" id="pvi-scan-btn" ${scanning ? "disabled" : ""}>
              ${scanning ? `${icon("radar")} Scanning…` : `${icon("radar")} Scan products now`}
            </button>
            <button class="ghost" id="pvi-schedule-btn">${icon("bell")} Schedule daily scan</button>
          </div>
        </div>
        <div class="pvi-scan-meta">
          <span>Last scan: <b>${escapeHtml(lastScan)}</b></span>
          <span>Next scheduled: <b>${escapeHtml(nextScan)}</b></span>
        </div>
      </div>

      ${state.pviError ? `<div class="pvi-banner error">${escapeHtml(state.pviError)}</div>` : ""}
      ${state.viralScheduleResult ? `<div class="pvi-banner success">${escapeHtml(state.viralScheduleResult)}</div>` : ""}

      <div class="pvi-body">
        ${memories.length === 0
          ? `<div class="pvi-empty">
               <div class="pvi-empty-icon">${icon("radar")}</div>
               <p>No product viral memories yet.</p>
               <small>Run a scan to match your catalog against viral ad patterns across TikTok, Instagram, YouTube, Facebook and Pinterest.</small>
             </div>`
          : `<div class="pvi-layout">
               <div class="pvi-grid">
                 ${memories.map((m) => renderPviCard(m, selected)).join("")}
               </div>
               <div class="pvi-detail-col">
                 ${selected
                   ? renderPviDetail(selected)
                   : `<div class="pvi-detail-empty">
                        <div class="pvi-empty-icon">${icon("spark")}</div>
                        <p>Select a product to view its viral profile</p>
                        <small>Then find more viral ads or reproduce the winning template.</small>
                      </div>`
                 }
               </div>
             </div>`
        }
        ${state.reproductionResult ? `
          <div class="pvi-banner success pvi-result">
            <span>${escapeHtml(state.reproductionResult)}</span>
            <button class="ghost" id="pvi-dismiss-result">Dismiss</button>
          </div>` : ""}
      </div>
    </section>
  `;
}

function renderPviCard(m, selected) {
  const isSel = selected && selected.product_id === m.product_id;
  const score = Number(m.viral_score) || 0;
  return `
    <button class="pvi-product-card ${isSel ? "selected" : ""}" data-pvi-product="${escapeHtml(m.product_id)}">
      <div class="pvi-card-head">
        <strong>${escapeHtml(m.product_name)}</strong>
        <span class="pvi-score">${score}</span>
      </div>
      <p class="pvi-card-hook">${escapeHtml(m.hook || "")}</p>
      <div class="pvi-card-foot">
        <span>${escapeHtml(m.visual_style || "")}</span>
        <span>${Number(m.reproduction_count) || 0} reproduced</span>
      </div>
    </button>
  `;
}

function renderPviDetail(m) {
  const finding = state.viralFindInProgress;
  const reproducing = state.reproductionInProgress;
  const pb = m.platform_breakdown || {};
  const pid = escapeHtml(m.product_id);
  return `
    <div class="panel insight pvi-detail">
      <div class="panel-head compact">
        <h2>${escapeHtml(m.product_name)}</h2>
        <span>Viral score ${Number(m.viral_score) || 0}</span>
      </div>
      <div class="hook-card">
        <span>Top hook</span>
        <strong>${escapeHtml(m.hook || "")}</strong>
      </div>
      ${(m.structure && m.structure.length) ? `<div class="structure">
        ${m.structure.map((step, i) => `<div><b>${i + 1}</b><span>${escapeHtml(step)}</span></div>`).join("")}
      </div>` : ""}
      <dl>
        <div><dt>Pacing</dt><dd>${escapeHtml(m.pacing || "-")}</dd></div>
        <div><dt>CTA</dt><dd>${escapeHtml(m.cta || "-")}</dd></div>
        <div><dt>Visual style</dt><dd>${escapeHtml(m.visual_style || "-")}</dd></div>
      </dl>
      ${(m.emotional_triggers && m.emotional_triggers.length) ? `<div class="tag-cloud">${m.emotional_triggers.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>` : ""}
      ${Object.keys(pb).length ? `<div class="pvi-platform-breakdown">${Object.keys(pb).map((k) => `<div class="pvi-pb-row"><span>${escapeHtml(k)}</span><span>${escapeHtml(String(pb[k]))}%</span></div>`).join("")}</div>` : ""}
      <div class="pvi-detail-actions">
        <button class="ghost ${finding ? "scanning" : ""}" id="pvi-find-ads-btn" data-pvi-product="${pid}" ${finding ? "disabled" : ""}>
          ${finding ? `${icon("radar")} Searching…` : `${icon("radar")} Find more viral ads`}
        </button>
        <button class="metric-btn ${reproducing ? "scanning" : ""}" id="pvi-reproduce-btn" data-pvi-product="${pid}" ${reproducing ? "disabled" : ""}>
          ${reproducing ? `${icon("spark")} Reproducing…` : `${icon("spark")} Reproduce for my product`}
        </button>
      </div>
    </div>
  `;
}

function renderViralGallery() {
  const displayVideos = state.viralVideos;
  const allPlatforms = ["All", ...new Set(displayVideos.map((a) => a.platform).filter(Boolean))];
  const allCategories = ["All", ...new Set(displayVideos.map((a) => a.category).filter(Boolean))];

  return `
    <section class="viral-gallery-section panel">
      <div class="viral-gallery-header">
        <div class="viral-gallery-title-row">
          <div>
            <h2>${icon("video")} Viral Content Gallery</h2>
            <p>${displayVideos.length} live EVICS viral videos · Filter by platform or category to find patterns</p>
          </div>
          <div class="viral-gallery-controls">
            <label class="viral-filter-label">
              <span>Platform</span>
              <select id="viral-platform-filter" class="viral-filter-select">
                ${allPlatforms.map((p) => `<option value="${p}" ${state.viralFilterPlatform === p ? "selected" : ""}>${p}</option>`).join("")}
              </select>
            </label>
            <label class="viral-filter-label">
              <span>Category</span>
              <select id="viral-category-filter" class="viral-filter-select">
                ${allCategories.map((c) => `<option value="${c}" ${state.viralFilterCategory === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
            </label>
            <button class="ghost viral-refresh-btn" id="viral-gallery-refresh">
              ${state.viralLoading ? `${icon("radar")} Loading…` : `${icon("radar")} Refresh`}
            </button>
            <button class="toggle-link" id="toggle-viral-gallery">
              ${state.viralGalleryOpen ? "▲ Collapse" : "▼ Expand"}
            </button>
          </div>
        </div>
      </div>

      ${state.viralGalleryOpen ? `
      <div class="viral-gallery-body">
        ${state.viralLoading ? `
          <div class="viral-gallery-loading">
            ${icon("radar")} Scanning viral content library…
          </div>
        ` : `
        <div class="viral-gallery-workspace">
          <!-- Video Grid -->
          <div class="viral-video-grid">
            ${displayVideos.length === 0
              ? `<div class="viral-empty">No viral videos found for the selected filters.</div>`
              : displayVideos.map((v) => renderViralVideoCard(v)).join("")
            }
          </div>

          <!-- Analysis Panel -->
          <div class="viral-analysis-panel ${state.viralSelectedVideo ? "viral-analysis-active" : ""}">
            ${state.viralSelectedVideo
              ? renderViralAnalysisPanel(state.viralSelectedVideo)
              : `<div class="viral-analysis-empty">
                   <div class="viral-analysis-empty-icon">${icon("spark")}</div>
                   <p>Select a viral video to run AI analysis</p>
                   <small>Understand what makes it work, find matching products, and create a brief</small>
                 </div>`
            }
          </div>
        </div>
        `}
      </div>
      ` : ""}
    </section>
  `;
}

function renderViralVideoCard(video) {
  const isSelected = state.viralSelectedVideo && state.viralSelectedVideo.id === video.id;
  const platformColors = {
    TikTok: "viral-platform-tiktok",
    Instagram: "viral-platform-instagram",
    YouTube: "viral-platform-youtube",
    Facebook: "viral-platform-facebook",
    Pinterest: "viral-platform-pinterest"
  };
  const platformClass = platformColors[video.platform] || "viral-platform-default";

  return `
    <button class="viral-video-card ${isSelected ? "viral-video-card-selected" : ""}" data-viral-video-id="${video.id}">
      <div class="viral-card-thumb ${platformClass}">
        ${video.thumbnailUrl
          ? `<img src="${video.thumbnailUrl}" alt="${video.title}" />`
          : `<div class="viral-thumb-placeholder">${icon("video")}</div>`
        }
        <div class="viral-card-badges">
          <span class="viral-platform-badge">${video.platform}</span>
          <span class="viral-velocity-badge">${video.velocity || Math.round(60 + Math.random() * 35)}</span>
        </div>
      </div>
      <div class="viral-card-body">
        <strong class="viral-card-title">${video.title}</strong>
        <p class="viral-card-hook">"${video.hook}"</p>
        <div class="viral-card-stats">
          <span>${fmt(video.views)} views</span>
          <span>${video.engagement}% ER</span>
          <span class="viral-category-tag">${video.category}</span>
        </div>
      </section>

      <!-- ── AI COPILOT PANEL ── -->
      <section class="copilot-panel">
        <div class="copilot-header">
          <div>
            <h2>${icon("spark")} AI Copilot</h2>
            <p>Get strategic suggestions, refine hooks and scripts, and understand every AI decision in plain language.</p>
          </div>
          <button class="ghost" id="toggle-copilot">${state.showCopilot ? "▲ Collapse" : "▼ Expand Copilot"}</button>
        </div>

        ${state.showCopilot ? `
        <div class="copilot-body">
          <div class="copilot-actions-row">
            <div class="copilot-input-group">
              <select id="copilot-input-type" class="metric-select" style="min-width:100px">
                ${["hook","script","product","general"].map((t) => `<option ${state.copilotInputType === t ? "selected" : ""} value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join("")}
              </select>
              <input
                type="text"
                id="copilot-input"
                class="copilot-text-input"
                placeholder="Paste a hook, script, or describe your goal…"
                value="${state.copilotInput.replace(/"/g, "&quot;")}"
              />
            </div>
            <div class="copilot-btn-row">
              <button class="metric-btn ${state.copilotLoading ? "scanning" : ""}" id="copilot-suggest-btn" ${state.copilotLoading ? "disabled" : ""}>
                ${icon("spark")} AI Suggestions
              </button>
              <button class="metric-btn ${state.copilotLoading ? "scanning" : ""}" id="copilot-refine-btn" ${state.copilotLoading ? "disabled" : ""}>
                ${icon("radar")} Refine Hook
              </button>
              <button class="metric-btn ${state.copilotLoading ? "scanning" : ""}" id="copilot-explain-btn" ${state.copilotLoading ? "disabled" : ""}>
                ${icon("chart")} Explain Decision
              </button>
            </div>
          </div>

          ${state.copilotLoading ? `<div class="copilot-loading"><span class="pulse-row"><i></i> Copilot is thinking…</span></div>` : ""}

          ${state.copilotSuggestions.length > 0 ? `
          <div class="copilot-results">
            <h3>Strategic Suggestions</h3>
            <div class="copilot-suggestions-grid">
              ${state.copilotSuggestions.map((s) => `
                <div class="copilot-suggestion-card copilot-priority-${s.priority.toLowerCase()}">
                  <div class="copilot-suggestion-head">
                    <span class="copilot-type-badge">${s.type}</span>
                    <span class="copilot-priority-badge">${s.priority}</span>
                  </div>
                  <p class="copilot-suggestion-text">${s.suggestion}</p>
                  <small class="copilot-rationale">${s.rationale}</small>
                  <button class="copy-btn" data-copy="${s.suggestion.replace(/"/g, "&quot;")}" style="margin-top:8px">Copy</button>
                </div>
              `).join("")}
            </div>
          </div>
          ` : ""}

          ${state.copilotRefinements.length > 0 ? `
          <div class="copilot-results">
            <h3>Refined Variants</h3>
            <div class="copilot-refinements-grid">
              ${state.copilotRefinements.map((r) => `
                <div class="copilot-refinement-card">
                  <div class="copilot-refinement-head">
                    <span class="copilot-type-badge">${r.variant}</span>
                    <span class="copilot-lift-badge">${r.expectedLift}</span>
                  </div>
                  <p class="copilot-refined-text">${r.refined}</p>
                  <small class="copilot-rationale">${r.improvement}</small>
                  <button class="copy-btn" data-copy="${r.refined.replace(/"/g, "&quot;")}" style="margin-top:8px">Copy</button>
                </div>
              `).join("")}
            </div>
          </div>
          ` : ""}

          ${state.copilotExplanation ? `
          <div class="copilot-results">
            <h3>Decision Explanation</h3>
            <div class="copilot-explanation">
              <p class="copilot-explanation-summary">${state.copilotExplanation.summary}</p>
              <div class="copilot-factors-grid">
                ${state.copilotExplanation.factors.map((f) => `
                  <div class="copilot-factor">
                    <div class="copilot-factor-head">
                      <span>${f.factor}</span>
                      <span class="copilot-factor-score">${f.score}/100</span>
                      <span class="copilot-factor-weight">${f.weight}</span>
                    </div>
                    <div class="copilot-factor-bar"><div class="copilot-factor-fill" style="width:${f.score}%"></div></div>
                    <small>${f.explanation}</small>
                  </div>
                `).join("")}
              </div>
              ${state.copilotExplanation.recommendation ? `
                <div class="copilot-recommendation">
                  <strong>Recommendation:</strong> ${state.copilotExplanation.recommendation}
                </div>
              ` : ""}
            </div>
          </div>
          ` : ""}
        </div>
        ` : ""}
      </section>

      <!-- ── AUTO-GENERATE EVERYTHING ── -->
      <section class="auto-generate-section">
        <div class="auto-generate-header">
          <div>
            <h2>${icon("radar")} Auto-Generate Everything</h2>
            <p>Run the full pipeline: Trend Scout → Product Match → Script Writer → Queue. One click generates a complete batch of ready-to-review creatives.</p>
          </div>
          <div class="auto-generate-controls">
            <label class="param-label" style="flex-direction:row;align-items:center;gap:8px">
              <span style="white-space:nowrap;font-size:12px;color:var(--muted)">Creatives to generate:</span>
              <input type="number" id="auto-generate-count" class="metric-input" value="${state.autoGenerateCount}" min="1" max="10" step="1" style="width:60px" />
            </label>
            <button
              class="primary ${state.autoGenerating ? "scanning" : ""}"
              id="auto-generate-btn"
              ${state.autoGenerating ? "disabled" : ""}
            >
              ${state.autoGenerating ? `${icon("radar")} Generating…` : `${icon("spark")} Auto-Generate Everything`}
            </button>
          </div>
        </div>

        ${state.autoGenerating || state.autoGeneratePipeline.length > 0 ? `
        <div class="pipeline-steps">
          ${(state.autoGeneratePipeline.length > 0 ? state.autoGeneratePipeline : [
            { step: 1, name: "Trend Scout", status: "pending", result: "" },
            { step: 2, name: "Product Match", status: "pending", result: "" },
            { step: 3, name: "Script Writer", status: "pending", result: "" },
            { step: 4, name: "Queue", status: "pending", result: "" }
          ]).map((step) => `
            <div class="pipeline-step pipeline-step-${step.status}">
              <div class="pipeline-step-num">${step.status === "complete" ? "✓" : step.step}</div>
              <div class="pipeline-step-body">
                <strong>${step.name}</strong>
                ${step.result ? `<small>${step.result}</small>` : `<small class="pipeline-pending">Waiting…</small>`}
              </div>
            </div>
          `).join("")}
        </div>
        ` : ""}

        ${state.showAutoGenerateResult && state.autoGenerateResults.length > 0 ? `
        <div class="auto-generate-result">
          <div class="auto-generate-result-head">
            <h3>${icon("check")} ${state.autoGenerateResults.length} Creatives Generated</h3>
            <span>Added to Draft queue — review and approve below.</span>
          </div>
          <div class="auto-generate-cards">
            ${state.autoGenerateResults.map((c) => `
              <div class="auto-generate-card">
                <div class="auto-generate-card-head">
                  <span class="metric-generated-badge">${c.platform}</span>
                  <span class="hook-tag hook-confidence-high">Score ${c.score}</span>
                </div>
                <strong>${c.product}</strong>
                <p class="copilot-rationale">${c.hook}</p>
                <small>${c.format}</small>
                <button class="copy-btn" data-copy="${c.script.replace(/"/g, "&quot;")}" style="margin-top:6px">Copy Script</button>
              </div>
            `).join("")}
          </div>
        </div>
        ` : ""}
      </section>
    </main>
  `;
}

function renderViralAnalysisPanel(video) {
  const analysis = state.viralAnalysis && state.viralAnalysis.id === video.id ? state.viralAnalysis : null;

  return `
    <div class="viral-analysis-content">
      <div class="viral-analysis-header">
        <div>
          <span class="viral-analysis-platform">${video.platform} · ${video.category}</span>
          <h3 class="viral-analysis-title">${video.title}</h3>
        </div>
        <button class="viral-analysis-close" id="viral-analysis-close">✕</button>
      </div>

      <!-- Video preview -->
      <div class="viral-preview-area">
        ${video.videoUrl
          ? `<video class="viral-video-player" src="${video.videoUrl}" controls></video>`
          : `<div class="viral-preview-placeholder">
               <div class="viral-preview-icon">${icon("video")}</div>
               <p>${video.platform} · ${fmt(video.views)} views</p>
             </div>`
        }
      </div>

      <!-- Hook card -->
      <div class="viral-hook-display">
        <span class="viral-hook-label">Hook</span>
        <strong>"${video.hook}"</strong>
      </div>

      <!-- Stats row -->
      <div class="viral-stats-row">
        <div class="viral-stat"><span>Views</span><strong>${fmt(video.views)}</strong></div>
        <div class="viral-stat"><span>Engagement</span><strong>${video.engagement}%</strong></div>
        <div class="viral-stat"><span>Velocity</span><strong>${video.velocity}</strong></div>
        <div class="viral-stat"><span>Conversion</span><strong>${video.conversion}%</strong></div>
      </div>

      <!-- AI Analysis trigger -->
      ${!analysis ? `
      <div class="viral-analysis-trigger">
        <button class="viral-analyze-btn ${state.viralAnalysisLoading ? "loading" : ""}" id="run-viral-analysis" data-video-id="${video.id}" ${state.viralAnalysisLoading ? "disabled" : ""}>
          ${state.viralAnalysisLoading ? `${icon("radar")} Analysing…` : `${icon("spark")} Run AI Analysis`}
        </button>
      </div>
      ` : `
      <!-- What's Working -->
      <div class="viral-section-block">
        <h4 class="viral-block-title">${icon("check")} What's Working</h4>
        <div class="viral-working-grid">
          ${analysis.whatsWorking.map((item) => `
            <div class="viral-working-item">
              <div class="viral-working-header">
                <span class="viral-working-label">${item.label}</span>
                <span class="viral-working-score">${item.score}</span>
              </div>
              <div class="viral-score-bar"><div class="viral-score-fill" style="width:${item.score}%"></div></div>
              <p class="viral-working-note">${item.note}</p>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- What to Improve -->
      <div class="viral-section-block viral-weak-block">
        <h4 class="viral-block-title">⚠ What to Improve</h4>
        ${analysis.whatsWeak.map((item) => `
          <div class="viral-weak-item">
            <strong>${item.label}</strong>
            <p>${item.note}</p>
          </div>
        `).join("")}
      </div>

      <!-- Format Breakdown -->
      ${renderFormatBreakdown(analysis.formatBreakdown)}
      `}

      <!-- Product Matches -->
      ${renderProductMatches(video)}

      <!-- Brand Integration -->
      ${renderBrandIntegration(video)}

      <!-- Create Brief button -->
      <div class="viral-brief-section">
        <div class="viral-brief-header">
          <h4>${icon("send")} Create Creative Brief</h4>
          <p>Generate a ready-to-use brief inspired by this viral pattern</p>
        </div>
        ${state.viralCreativeBrief && state.viralCreativeBrief.videoId === video.id
          ? renderCreativeBriefResult(state.viralCreativeBrief)
          : `<button class="viral-brief-btn ${state.viralBriefLoading ? "loading" : ""}" id="create-viral-brief" data-video-id="${video.id}" ${state.viralBriefLoading ? "disabled" : ""}>
               ${state.viralBriefLoading ? `${icon("radar")} Generating…` : `${icon("send")} Create Brief from This Video`}
             </button>`
        }
      </div>
    </div>
  `;
}

function renderFormatBreakdown(fmt_data) {
  if (!fmt_data) return "";
  return `
    <div class="viral-section-block">
      <h4 class="viral-block-title">${icon("chart")} Format Breakdown</h4>
      <div class="viral-format-grid">
        <div class="viral-format-item">
          <dt>Hook</dt>
          <dd>${fmt_data.hook}</dd>
        </div>
        <div class="viral-format-item">
          <dt>Pacing</dt>
          <dd>${fmt_data.pacing}</dd>
        </div>
        <div class="viral-format-item">
          <dt>CTA</dt>
          <dd>${fmt_data.cta}</dd>
        </div>
        <div class="viral-format-item">
          <dt>Platform</dt>
          <dd>${fmt_data.platform}</dd>
        </div>
        <div class="viral-format-item">
          <dt>Style</dt>
          <dd>${fmt_data.style}</dd>
        </div>
        <div class="viral-format-item">
          <dt>Duration</dt>
          <dd>${fmt_data.duration}</dd>
        </div>
        <div class="viral-format-item viral-format-full">
          <dt>Emotional pattern</dt>
          <dd>${fmt_data.emotion}</dd>
        </div>
      </div>
    </div>
  `;
}

function renderProductMatches(video) {
  const matches = state.viralProductMatches && state.viralProductMatches.videoId === video.id
    ? state.viralProductMatches.matches
    : null;

  // Demo matches derived from viralAds productMatch field
  const demoMatches = products.map((p, i) => ({
    name: p.name,
    category: p.category,
    score: p.score,
    angle: p.angle,
    matchScore: i === 0 ? 96 : Math.max(60, p.score - i * 4),
    matchReason: p.category.toLowerCase() === (video.category || "").toLowerCase() ? "Category alignment" : "Audience overlap"
  })).sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);

  const displayMatches = matches || demoMatches;

  return `
    <div class="viral-section-block">
      <div class="viral-matches-header">
        <h4 class="viral-block-title">${icon("filter")} Product Match Suggestions</h4>
        <button class="viral-match-refresh-btn" id="refresh-product-matches" data-video-id="${video.id}">
          ${state.viralProductMatchLoading ? "Matching…" : "↺ Refresh"}
        </button>
      </div>
      <div class="viral-product-matches">
        ${displayMatches.map((p) => `
          <div class="viral-match-card">
            <div class="viral-match-score-ring">${p.matchScore}</div>
            <div class="viral-match-body">
              <strong>${p.name}</strong>
              <span>${p.category} · ${p.angle}</span>
              <span class="viral-match-reason">${p.matchReason}</span>
            </div>
            <button class="viral-use-product-btn" data-product-name="${p.name.replace(/"/g, "&quot;")}">Use</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBrandIntegration(video) {
  const ad = viralAds.find((a) => a.id === video.id) || video;
  const structure = ad.structure && ad.structure.length ? ad.structure : ["Hook", "Problem", "Solution", "Product reveal", "CTA"];

  return `
    <div class="viral-section-block viral-brand-block">
      <h4 class="viral-block-title">${icon("spark")} Brand Integration Recommendations</h4>
      <div class="viral-brand-grid">
        <div class="viral-brand-item">
          <span class="viral-brand-label">Ad structure to replicate</span>
          <div class="viral-brand-structure">
            ${structure.map((step, i) => `
              <div class="viral-brand-step">
                <b>${i + 1}</b><span>${step}</span>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="viral-brand-item">
          <span class="viral-brand-label">Emotional triggers to use</span>
          <p class="viral-brand-value">${ad.emotion || "Curiosity, transformation, trust"}</p>
        </div>
        <div class="viral-brand-item">
          <span class="viral-brand-label">Visual style to match</span>
          <p class="viral-brand-value">${(ad.tags || []).join(", ") || "UGC, authentic, fast-paced"}</p>
        </div>
        <div class="viral-brand-item">
          <span class="viral-brand-label">CTA framework</span>
          <p class="viral-brand-value">"${ad.cta || "Benefit-led action CTA"}"</p>
        </div>
      </div>
    </div>
  `;
}

function renderCreativeBriefResult(brief) {
  return `
    <div class="viral-brief-result">
      <div class="viral-brief-result-header">
        <span class="viral-brief-success-badge">${icon("check")} Brief Created</span>
        <button class="toggle-link" id="dismiss-viral-brief">✕ Dismiss</button>
      </div>
      <div class="viral-brief-details">
        <div class="viral-brief-row"><dt>Title</dt><dd>${brief.title}</dd></div>
        <div class="viral-brief-row"><dt>Product</dt><dd>${brief.product}</dd></div>
        <div class="viral-brief-row"><dt>Platform</dt><dd>${brief.targetPlatform} · ${brief.aspectRatio} · ${brief.duration}</dd></div>
        <div class="viral-brief-row viral-brief-full"><dt>Hook</dt><dd>${brief.hook}</dd></div>
        <div class="viral-brief-row viral-brief-full"><dt>Script</dt><dd>${brief.script}</dd></div>
        <div class="viral-brief-row viral-brief-full"><dt>Visual notes</dt><dd>${brief.visualNotes}</dd></div>
      </div>
      <div class="viral-brief-actions">
        <button class="ghost" id="copy-viral-brief" data-copy="${brief.script.replace(/"/g, "&quot;")}">Copy Script</button>
        <button class="ghost" id="send-brief-to-assembly">Send to Video Assembly</button>
      </div>
    </div>
  `;
}

// ── Section-specific content renderers ──
function renderViralIntelligence() {
  const ad = selectedAd();
  const categories = ["All", ...new Set(viralAds.map((item) => item.category))];
  const platforms  = ["All", ...new Set(viralAds.map((item) => item.platform))];
  const highConfidenceCount = winningHooks.filter((h) => h.confidence === "High").length;
  const hookCategories = ["All", ...new Set(winningHooks.map((h) => h.category))];

  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Viral Intelligence</h2>
        <p>Trend scanning, hook discovery, and viral pattern analysis across TikTok, Instagram, YouTube, Facebook, and Pinterest.</p>
      </div>

      <!-- Metrics -->
      <section class="metrics-grid">
        <article class="metric metric-interactive">
          <span>Viral ads scanned</span>
          <strong id="scan-count-display">${state.scanCount.toLocaleString()}</strong>
          <small>+18% today</small>
          <div class="metric-controls">
            <input type="number" id="scan-amount-input" class="metric-input" value="${state.scanAmount}" min="100" max="10000" step="100" />
            <button class="metric-btn ${state.scanning ? "scanning" : ""}" id="rescan-btn" ${state.scanning ? "disabled" : ""}>
              ${state.scanning ? `${icon("radar")} Scanning…` : `${icon("radar")} Rescan`}
            </button>
          </div>
        </article>
        <article class="metric metric-interactive">
          <span>Winning hooks found</span>
          <strong id="hooks-count-display">${state.hooksFound}</strong>
          <small>${highConfidenceCount} high-confidence</small>
          <div class="metric-controls">
            <input type="number" id="hook-target-input" class="metric-input" value="${state.hookTarget}" min="10" max="500" step="10" placeholder="Target" />
            <button class="metric-btn ${state.hookSearching ? "scanning" : ""}" id="hook-search-btn" ${state.hookSearching ? "disabled" : ""}>
              ${state.hookSearching ? `${icon("radar")} Searching…` : `${icon("spark")} Find Hooks`}
            </button>
          </div>
          <div class="metric-controls" style="margin-top:6px">
            <input type="text" id="hook-keyword-input" class="metric-input" value="${state.hookSearchKeyword}" placeholder="Target search keyword…" style="flex:1" />
          </div>
          <div class="metric-toggle-row">
            <button class="toggle-link" id="toggle-hooks-list">${state.showHooksList ? "▲ Hide hooks" : "▼ Show all hooks"}</button>
            <button class="toggle-link ${state.hookAutoSelect ? "active-link" : ""}" id="hook-auto-select">
              ${state.hookAutoSelect ? "✓ AI Auto-Select ON" : "AI Auto-Select"}
            </button>
          </div>
        </article>

        <article class="metric metric-interactive">
          <span>Creatives generated</span>
          <strong>${creatives.length}</strong>
          <small>${creatives.filter((c) => c.status === "Ready").length} ready to publish</small>
          <div class="metric-controls">
            <label class="metric-select-label">
              <select data-select="creativeProductFilter" class="metric-select">
                ${productNames.map((n) => `<option ${n === state.creativeProductFilter ? "selected" : ""}>${n}</option>`).join("")}
              </select>
            </label>
            <button class="metric-btn ${state.generatingCreative ? "scanning" : ""}" id="generate-creative-btn" ${state.generatingCreative ? "disabled" : ""}>
              ${state.generatingCreative ? `${icon("spark")} Generating…` : `${icon("spark")} Generate`}
            </button>
          </div>
          ${state.lastGeneratedCreative ? `
          <div class="metric-generated-badge">
            ✓ Generated: <strong>${state.lastGeneratedCreative.product}</strong> · Score ${state.lastGeneratedCreative.score}
          </div>
          ` : ""}
        </article>

        ${metric("Projected ROAS signal", "3.7x", "based on patterns")}
      </section>

      <!-- Hooks List -->
      ${state.showHooksList ? `
      <section class="hooks-list-section panel">
        <div class="panel-head">
          <div>
            <h2>Winning Hooks Library</h2>
            <p>${winningHooks.length} hooks found · ${highConfidenceCount} high-confidence · ${state.selectedHooks.size} selected</p>
          </div>
          <div class="filters">
            <label><select data-select="assemblyHookFilter">
              ${hookCategories.map((c) => `<option ${c === state.assemblyHookFilter ? "selected" : ""}>${c}</option>`).join("")}
            </select></label>
            <button class="ghost" id="select-all-hooks">Select All</button>
            <button class="ghost" id="clear-hooks-selection">Clear</button>
          </div>
        </div>
        <div class="hooks-outline">
          ${filteredHooks().map((h) => `
            <div class="hook-outline-row ${state.selectedHooks.has(h.id) ? "hook-selected" : ""}">
              <input type="checkbox" class="hook-checkbox" data-hook-id="${h.id}" ${state.selectedHooks.has(h.id) ? "checked" : ""} />
              <div class="hook-outline-body">
                <span class="hook-outline-text">${h.text}</span>
                <div class="hook-outline-meta">
                  <span class="hook-tag">${h.category}</span>
                  <span class="hook-tag">${h.platform}</span>
                  <span class="hook-tag hook-confidence-${h.confidence.toLowerCase()}">${h.confidence} confidence</span>
                </div>
              </div>
              <button class="copy-btn" data-copy="${h.text.replace(/"/g, "&quot;")}" title="Copy hook">Copy</button>
            </div>
          `).join("")}
        </div>
      </section>
      ` : ""}

      <!-- Viral Trends Monitor -->
      <section class="workspace-grid">
        <div class="panel monitor">
          <div class="panel-head">
            <div>
              <h2>Viral Trends Monitor</h2>
              <p>Ranked by engagement velocity, structure clarity, and conversion signals.</p>
            </div>
            <div class="filters">
              ${select("category", categories, state.category)}
              ${select("platform", platforms, state.platform)}
            </div>
          </div>
          <div class="ad-list">
            ${filteredAds().map((item) => `
              <button class="ad-row ${item.id === ad.id ? "selected" : ""}" data-ad="${item.id}">
                <div class="score">${item.velocity}</div>
                <div>
                  <strong>${item.title}</strong>
                  <span>${item.platform} · ${item.category} · ${fmt(item.views)} views</span>
                  <span>${item.format || "Format pending"} · ${item.script ? "Script ready" : "Script pending"}</span>
                </div>
                <small>${item.engagement}% ER</small>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="panel insight">
          <div class="panel-head compact">
            <h2>Winning Structure</h2>
            <span>${ad.platform}</span>
          </div>
          <div class="hook-card">
            <span>Hook</span>
            <strong>${ad.hook}</strong>
          </div>
          <div class="structure">
            ${ad.structure.map((step, index) => `<div><b>${index + 1}</b><span>${step}</span></div>`).join("")}
          </div>
          <dl>
            <div><dt>Product match</dt><dd>${ad.productMatch}</dd></div>
            <div><dt>Emotional pattern</dt><dd>${ad.emotion}</dd></div>
            <div><dt>Format</dt><dd>${ad.format || "Format pending"}</dd></div>
            <div><dt>Script</dt><dd>${ad.script ? escapeHtml(ad.script) : "Script pending"}</dd></div>
            <div><dt>CTA framework</dt><dd>${ad.cta}</dd></div>
          </dl>
          <div class="tag-cloud">${ad.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </div>
      </section>

      ${renderProductViralIntelligence()}

      ${renderViralGallery()}

      ${renderMediaArea("viral-intelligence")}
    </div>
  `;
}

function renderAiReconstruction() {
  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>AI Reconstruction</h2>
        <p>AI-powered creative reconstruction from viral ads. Deconstruct winning structures and rebuild them for your products.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Reconstructions today", creatives.length.toString(), "from viral patterns")}
        ${metric("Avg quality score", Math.round(creatives.reduce((s, c) => s + c.score, 0) / (creatives.length || 1)).toString(), "across all creatives")}
        ${metric("Ready to publish", creatives.filter((c) => c.status === "Ready").length.toString(), "approved creatives")}
        ${metric("Pending review", creatives.filter((c) => c.status === "Review").length.toString(), "need approval")}
      </section>

      <!-- AI Content Queue -->
      <section class="queue-section">
        <div class="panel creative-panel">
          <div class="panel-head">
            <div>
              <h2>AI Content Queue</h2>
              <p>Original creative concepts inspired by winning structures, ready for HeyGen, Runway, Kling, Canva, and OpenAI workflows.</p>
            </div>
            <div class="queue-controls">
              <div class="segmented">
                ${["Ready", "Review", "Draft", "All"].map((mode) => `<button class="${state.queueMode === mode ? "active" : ""}" data-mode="${mode}">${mode}</button>`).join("")}
              </div>
              <label class="metric-select-label">
                <select data-select="creativeProductFilter" class="metric-select">
                  ${["All", ...products.map((p) => p.name)].map((n) => `<option ${n === state.creativeProductFilter ? "selected" : ""}>${n}</option>`).join("")}
                </select>
              </label>
            </div>
          </div>
          <div class="creative-list">
            ${filteredCreatives().map((item) => `
              <article class="creative-card ${state.approvals.has(item.id) ? "approved" : ""} ${state.selectedCreativeIds.has(item.id) ? "selected" : ""}">
                <label class="creative-select-wrap" title="Select">
                  <input type="checkbox" class="creative-select-cb" data-creative-id="${item.id}" ${state.selectedCreativeIds.has(item.id) ? "checked" : ""} />
                </label>
                <div class="creative-score">${item.score}</div>
                <div class="creative-body">
                  <div class="creative-title">
                    <strong>${item.product}</strong>
                    <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
                  </div>
                  <p>${item.hook}</p>
                  <small>${item.format} · ${item.asset} · ${item.channel}</small>
                  ${scoreBar(item.score, false)}
                  ${item.rejectionReason ? `
                    <div class="rejection-summary">
                      <span class="rejection-label">⚠ Review note:</span> ${item.rejectionReason}
                    </div>
                  ` : ""}
                </div>
                <button class="icon-button" data-approve="${item.id}" title="Toggle approval">${icon("check")}</button>
              </article>
            `).join("") || `<div class="empty">No items in this queue.</div>`}
          </div>
          ${state.selectedCreativeIds.size > 0 ? `
          <div class="bulk-action-toolbar">
            <span>${state.selectedCreativeIds.size} selected</span>
            <button class="primary" id="bulk-approve-btn">Approve All</button>
            <button class="ghost" id="bulk-queue-btn">Queue All</button>
            <button class="ghost" id="bulk-archive-btn">Archive All</button>
            <button class="ghost" id="bulk-clear-btn">Clear</button>
          </div>
          ` : ""}
        </div>

        <div class="panel">
          <div class="panel-head compact">
            <h2>Reconstruction Pipeline</h2>
          </div>
          <div class="timeline">
            ${[
              ["Step 1", "Scan viral ad", "Identify hook, structure, emotion, and CTA pattern"],
              ["Step 2", "Deconstruct", "Extract reusable components and winning formulas"],
              ["Step 3", "Match product", "Pair structure with best-fit EVICS product"],
              ["Step 4", "Reconstruct", "Generate new creative using AI with your brand voice"],
              ["Step 5", "Score & review", "Quality score assigned, sent to approval queue"]
            ].map(([time, title, desc]) => `
              <div>
                <time>${time}</time>
                <span></span>
                <div><strong>${title}</strong><p>${desc}</p></div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      ${renderMediaArea("ai-reconstruction")}
    </div>
  `;
}

const ELITE_BACKGROUND_SCENES = {
  "Ocean Dawn": "ocean,sunrise,blue water,luxury,mist",
  "Ocean Glow": "ocean,glow,blue water,premium,sunrise",
  "Deep Sea": "deep ocean,sea foam,rich blue,premium",
  "Tropical Tide": "tropical ocean,shoreline,light,brand film"
};

function buildEliteSeaMossScript() {
  return [
    "Jordan Avatar enters on a quiet ocean pulse with a premium lens bloom.",
    "Jordan says: 'Sea Moss Capsules are not just a product. They're a mineral ritual.'",
    "On beat two, trigger the splash-wipe and liquid-gold shimmer as the product enters frame.",
    "The Sea Moss packshot arrives background-removed and floats over an AI ocean composite for a clean hero reveal.",
    "Jordan continues: 'If your routine needs more energy, this is the clean reset from I AM GENESIS TECH.'",
    "End on the brand lockup and CTA: 'Start your ocean-level ritual today.'"
  ].join(" ");
}

function getEliteAvatarId() {
  return (window.IAGT_CONFIG && window.IAGT_CONFIG.jordanAvatarId) || "";
}

function getEliteVoiceId() {
  return (window.IAGT_CONFIG && window.IAGT_CONFIG.jordanVoiceId) || "";
}

function buildEliteBackgroundConfig(scene = state.videoVisualBackground) {
  const query = ELITE_BACKGROUND_SCENES[scene] || ELITE_BACKGROUND_SCENES["Ocean Dawn"];
  const sig = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    type: "image",
    url: `https://source.unsplash.com/1920x1080/?${encodeURIComponent(query)}&sig=${sig}`
  };
}

function getEliteRenderSequence() {
  return [
    { time: "0.0s", title: "Cold open", detail: "Jordan Avatar on a calm ocean-grade ambient bed." },
    { time: "1.2s", title: "Product cue", detail: "Name Sea Moss Capsules while the product silhouette begins to enter." },
    { time: "2.0s", title: "Elite entrance", detail: "Splash wipe + shimmer burst + product entrance on beat 2." },
    { time: "3.5s", title: "Hero reveal", detail: "Background-removed packshot lands on the AI ocean composite." },
    { time: "6.0s", title: "Brand lock", detail: "Jordan closes with value statement and CTA." }
  ];
}

function renderVideoGeneration() {
  const hookCategories    = ["All", ...new Set(winningHooks.map((h) => h.category))];
  const productCategories = ["All", ...new Set(products.map((p) => p.category))];

  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Video Generation</h2>
        <p>Assemble and render videos using HeyGen, Runway, and Kling. Build from hooks, scripts, and products in the component library.</p>
      </div>

      <!-- Assembly Workspace -->
      <section class="assembly-workspace">
        <div class="assembly-header">
          <div>
            <h2>${icon("video")} Elite Manual Video Assembly Workspace</h2>
            <p>Assemble videos from AI-generated components. Full edit controls, multi-platform rendering, draft comparison.</p>
          </div>
          <button class="ghost" id="toggle-assembly">${state.showAssemblyWorkspace ? "▲ Collapse" : "▼ Expand"}</button>
        </div>

        ${state.showAssemblyWorkspace ? `
        <div class="assembly-body">

          <!-- Component Libraries Row -->
          <div class="assembly-libraries">

            <!-- Hooks Library -->
            <div class="library-panel">
              <div class="library-head">
                <h3>Hooks Library</h3>
                <label><select data-select="assemblyHookFilter" class="lib-select">
                  ${hookCategories.map((c) => `<option ${c === state.assemblyHookFilter ? "selected" : ""}>${c}</option>`).join("")}
                </select></label>
              </div>
              <div class="library-list">
                ${filteredHooks().map((h) => `
                  <div class="library-item">
                    <div class="library-item-body">
                      <span class="lib-text">${h.text}</span>
                      <div class="lib-meta">
                        <span class="hook-tag">${h.category}</span>
                        <span class="hook-tag">${h.platform}</span>
                        <span class="hook-tag hook-confidence-${h.confidence.toLowerCase()}">${h.confidence}</span>
                      </div>
                    </div>
                    <div class="lib-actions">
                      <button class="copy-btn" data-copy="${h.text.replace(/"/g, "&quot;")}">Copy</button>
                      <button class="add-to-builder-btn" data-component-type="hook" data-component-id="${h.id}" data-component-text="${h.text.replace(/"/g, "&quot;")}">+ Add</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Scripts Library -->
            <div class="library-panel">
              <div class="library-head">
                <h3>Scripts Library</h3>
                <label><select data-select="assemblyScriptFilter" class="lib-select">
                  ${["All", ...products.map((p) => p.name)].map((n) => `<option ${n === state.assemblyScriptFilter ? "selected" : ""}>${n}</option>`).join("")}
                </select></label>
              </div>
              <div class="library-list">
                ${filteredAssemblyScripts().map((c) => `
                  <div class="library-item">
                    <div class="library-item-body">
                      <span class="lib-label">${c.product}</span>
                      <span class="lib-text">${c.script}</span>
                      <div class="lib-meta">
                        <span class="hook-tag">${c.format}</span>
                        <span class="hook-tag">${c.channel}</span>
                        <span class="hook-tag hook-confidence-${c.status === "Ready" ? "high" : c.status === "Review" ? "medium" : "low"}">${c.status}</span>
                      </div>
                    </div>
                    <div class="lib-actions">
                      <button class="copy-btn" data-copy="${c.script.replace(/"/g, "&quot;")}">Copy</button>
                      <button class="add-to-builder-btn" data-component-type="script" data-component-id="${c.id}" data-component-text="${c.script.replace(/"/g, "&quot;")}">+ Add</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Products Library -->
            <div class="library-panel">
              <div class="library-head">
                <h3>Products Library</h3>
                <label><select data-select="assemblyProductFilter" class="lib-select">
                  ${productCategories.map((c) => `<option ${c === state.assemblyProductFilter ? "selected" : ""}>${c}</option>`).join("")}
                </select></label>
              </div>
              <div class="library-list">
                ${filteredAssemblyProducts().map((p) => `
                  <div class="library-item">
                    <div class="library-item-body">
                      <span class="lib-label">${p.name}</span>
                      <div class="lib-meta">
                        <span class="hook-tag">${p.category}</span>
                        <span class="hook-tag">${p.angle}</span>
                        <span class="hook-tag hook-confidence-high">Score ${p.score}</span>
                      </div>
                    </div>
                    <div class="lib-actions">
                      <button class="copy-btn" data-copy="${p.name.replace(/"/g, "&quot;")}">Copy</button>
                      <button class="add-to-builder-btn" data-component-type="product" data-component-id="${p.name}" data-component-text="${p.name.replace(/"/g, "&quot;")}">+ Add</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

          </div><!-- /assembly-libraries -->

          <!-- Builder + Parameters Row -->
          <div class="assembly-builder-row">

            <!-- Video Parameters Panel -->
            <div class="params-panel">
              <h3>Video Parameters</h3>
              <div class="params-grid">
                <label class="param-label">Duration
                  <select data-state-key="videoDuration">
                    ${["15s","20s","30s","45s","60s"].map((v) => `<option ${state.videoDuration === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </label>
                <label class="param-label">Style
                  <select data-state-key="videoStyle">
                    ${["UGC","Commercial","Luxury","Educational"].map((v) => `<option ${state.videoStyle === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </label>
                <label class="param-label">Voice
                  <select data-state-key="videoVoice">
                    ${["Male","Female","Narrator"].map((v) => `<option ${state.videoVoice === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </label>
                <label class="param-label">Background
                  <select data-state-key="videoBackground">
                    ${["None","Music","Ambient"].map((v) => `<option ${state.videoBackground === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </label>
                <label class="param-label">Aspect Ratio
                  <select data-state-key="videoAspect">
                    ${["9:16","16:9","1:1"].map((v) => `<option ${state.videoAspect === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </label>
              </div>
              <div class="params-summary">
                <span>${state.videoDuration} · ${state.videoStyle} · ${state.videoVoice} voice · ${state.videoBackground} · ${state.videoAspect}</span>
              </div>
            </div>

            <!-- Video Builder -->
            <div class="builder-panel">
              <div class="builder-head">
                <h3>Video Builder</h3>
                <div class="builder-actions">
                  <button class="ghost" id="ai-suggestions-btn">${state.copilotLoading ? `${icon("radar")} Loading…` : `${icon("spark")} AI Suggestions`}</button>
                  <button class="ghost" id="refine-hook-btn">${icon("spark")} Refine Hook</button>
                  <button class="ghost" id="explain-decision-btn">${icon("gear")} Explain</button>
                  <button class="ghost" id="save-draft-btn">${icon("check")} Save Draft</button>
                </div>
              </div>

              <!-- Copilot Panel -->
              ${state.showCopilotPanel ? `
              <div class="copilot-panel">
                <div class="copilot-head">
                  <h4>${icon("spark")} AI Copilot</h4>
                  <button class="toggle-link" id="close-copilot-btn">✕ Close</button>
                </div>
                ${state.copilotLoading ? `<div class="copilot-loading">${icon("radar")} Thinking…</div>` : ""}
                ${state.copilotSuggestions && state.copilotSuggestions.length ? `
                  <div class="copilot-section-label">Suggestions</div>
                  ${state.copilotSuggestions.map((s) => `
                    <div class="copilot-card copilot-type-${s.type || "general"}">
                      <div class="copilot-card-head">
                        <strong>${s.title}</strong>
                        <span class="hook-tag hook-confidence-${(s.confidence || "medium").toLowerCase()}">${s.confidence || "Medium"}</span>
                      </div>
                      <p>${s.body}</p>
                    </div>
                  `).join("")}
                ` : ""}
                ${state.copilotRefinements && state.copilotRefinements.length ? `
                  <div class="copilot-section-label">Hook Refinements</div>
                  ${state.copilotRefinements.map((r) => `
                    <div class="copilot-card">
                      <div class="copilot-card-head">
                        <strong>${r.version}</strong>
                        <span class="hook-tag hook-confidence-high">Score ${r.score}</span>
                      </div>
                      <p class="copilot-refinement-text">"${r.text}"</p>
                      <small>${r.rationale}</small>
                      <button class="ghost copilot-apply-btn" data-apply-refinement="${r.text.replace(/"/g, "&quot;")}">↑ Apply to Builder</button>
                    </div>
                  `).join("")}
                ` : ""}
                ${state.copilotExplanations && state.copilotExplanations.length ? `
                  <div class="copilot-section-label">Decision Explanations</div>
                  ${state.copilotExplanations.map((e) => `
                    <div class="copilot-card">
                      <div class="copilot-card-head">
                        <strong>${e.component}</strong>
                        <span class="hook-tag hook-confidence-${(e.impact || "medium").toLowerCase() === "high" ? "high" : (e.impact || "medium").toLowerCase() === "medium" ? "medium" : "low"}">${e.impact || "Medium"} impact</span>
                      </div>
                      <p>${e.reasoning}</p>
                    </div>
                  `).join("")}
                ` : ""}
              </div>
              ` : ""}
            

              <div class="drop-zone" id="builder-drop-zone">
                ${state.assemblyComponents.length === 0
                  ? `<div class="drop-zone-empty">Drag components here or click <strong>+ Add</strong> from the libraries above.<br/><small>Hook → Script → Product → CTA</small></div>`
                  : state.assemblyComponents.map((comp, idx) => `
                    <div class="builder-component" data-comp-idx="${idx}">
                      <span class="comp-type-badge comp-type-${comp.type}">${comp.type}</span>
                      <span class="comp-text">${comp.text}</span>
                      <button class="comp-remove" data-remove-idx="${idx}">✕</button>
                    </div>
                  `).join("")
                }
              </div>

              <!-- Real-time preview -->
              ${state.assemblyComponents.length > 0 ? `
              <div class="builder-preview">
                <div class="preview-label">Structure Preview · ${state.videoAspect} · ${state.videoDuration}</div>
                <div class="preview-body">
                  ${state.assemblyComponents.map((comp, idx) => `
                    <div class="preview-step">
                      <b>${idx + 1}. ${comp.type.toUpperCase()}</b>
                      <p>${comp.text.length > 120 ? comp.text.slice(0, 120) + "…" : comp.text}</p>
                    </div>
                  `).join("")}
                  <div class="preview-params">
                    Style: ${state.videoStyle} · Voice: ${state.videoVoice} · BG: ${state.videoBackground}
                  </div>
                </div>
              </div>
              ` : ""}

              <!-- Send to Renderer -->
              <div class="render-actions">
                <button class="render-btn heygen" id="send-heygen" ${state.assemblyComponents.length === 0 ? "disabled" : ""}>
                  ${icon("video")} Render A+ HeyGen Video
                </button>
                <span class="render-quality-note">A+ gate: script quality, CTA clarity, compliance, and HeyGen v3 output proof.</span>
              </div>
              <div class="render-auth-note">
                <strong>HeyGen Auth</strong>
                <span>${escapeHtml(state.heygenAuthDetail)}</span>
                ${state.heygenRecentSessions.length ? `<small>Recent Video Agent sessions: ${state.heygenRecentSessions.length}</small>` : ""}
              </div>
            </div>

          </div><!-- /assembly-builder-row -->

          <!-- Rendering Status -->
          ${state.renderStatus ? `
          <div class="render-status-panel">
            <div class="render-status-head">
              <h3>Current Render Status</h3>
              <span class="render-badge render-badge-${state.renderStatus.toLowerCase().replace(/\s/g, "-")}">${state.renderStatus}</span>
            </div>
            ${state.renderStatus === "Rendering" ? `
              <div class="render-progress-bar"><div class="render-progress-fill" style="width:${state.renderProgress}%"></div></div>
              <small>${state.renderProgress}% complete</small>
            ` : ""}
            ${state.renderUrl ? `
              <div class="render-result">
                <button type="button" class="render-url-link ghost" data-open-url="${escapeHtml(state.renderUrl)}">${icon("video")} View Rendered Video</button>
                <div class="render-result-actions">
                  <button class="ghost" id="approve-render">✓ Approve &amp; Publish</button>
                  <button class="ghost" id="reject-render">✕ Reject</button>
                  <button class="ghost" id="regenerate-render">${icon("radar")} Re-generate</button>
                </div>
              </div>
            ` : ""}
          </div>
          ` : ""}

          <!-- Live Renders Status Panel (always visible, auto-refreshes) -->
          <div class="render-status-panel" style="margin-top:12px">
            <div class="render-status-head">
              <h3>Live Render Queue</h3>
              <div style="display:flex;gap:8px;align-items:center">
                ${state.renderPollingActive ? `<span class="render-badge render-badge-rendering">● Polling</span>` : ""}
                <span class="render-badge render-badge-${state.liveRenders.length > 0 ? "complete" : "pending"}">${state.liveRenders.length} jobs</span>
              </div>
            </div>
            <div id="live-renders-panel">
              ${renderLiveRendersHTML()}
            </div>
          </div>

          <!-- Drafts & Compare -->
          ${state.videoDrafts.length > 0 ? `
          <div class="drafts-panel">
            <div class="drafts-head">
              <h3>Saved Drafts (${state.videoDrafts.length})</h3>
              <button class="toggle-link" id="toggle-compare">${state.compareDrafts ? "▲ Close Compare" : "▼ Compare Versions"}</button>
            </div>
            <div class="drafts-list">
              ${state.videoDrafts.map((draft, idx) => `
                <div class="draft-row">
                  <span class="draft-name">Draft ${idx + 1} — ${draft.style} · ${draft.duration} · ${draft.aspect}</span>
                  <span class="draft-components">${draft.components.length} components</span>
                  <div class="draft-actions">
                    <button class="ghost" data-load-draft="${idx}">Load</button>
                    <button class="ghost" data-delete-draft="${idx}">Delete</button>
                    ${state.compareDrafts ? `
                      <button class="ghost ${state.selectedDraftA === idx ? "active-link" : ""}" data-compare-a="${idx}">A</button>
                      <button class="ghost ${state.selectedDraftB === idx ? "active-link" : ""}" data-compare-b="${idx}">B</button>
                    ` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
            ${state.compareDrafts && state.selectedDraftA !== null && state.selectedDraftB !== null ? `
            <div class="compare-view">
              <div class="compare-col">
                <div class="compare-label">Draft ${state.selectedDraftA + 1}</div>
                ${state.videoDrafts[state.selectedDraftA].components.map((c, i) => `
                  <div class="preview-step"><b>${i + 1}. ${c.type.toUpperCase()}</b><p>${c.text.length > 100 ? c.text.slice(0, 100) + "…" : c.text}</p></div>
                `).join("")}
                <div class="preview-params">${state.videoDrafts[state.selectedDraftA].style} · ${state.videoDrafts[state.selectedDraftA].voice} · ${state.videoDrafts[state.selectedDraftA].duration}</div>
              </div>
              <div class="compare-col">
                <div class="compare-label">Draft ${state.selectedDraftB + 1}</div>
                ${state.videoDrafts[state.selectedDraftB].components.map((c, i) => `
                  <div class="preview-step"><b>${i + 1}. ${c.type.toUpperCase()}</b><p>${c.text.length > 100 ? c.text.slice(0, 100) + "…" : c.text}</p></div>
                `).join("")}
                <div class="preview-params">${state.videoDrafts[state.selectedDraftB].style} · ${state.videoDrafts[state.selectedDraftB].voice} · ${state.videoDrafts[state.selectedDraftB].duration}</div>
              </div>
            </div>
            ` : ""}
          </div>
          ` : ""}

        </div><!-- /assembly-body -->
        ` : ""}
      </section>

      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("film")} Media Results &amp; Review</h2>
              <p>See created media, open the video preview, edit QA notes, route renders, and re-render with admin directives.</p>
            </div>
          </div>
          <div class="empty" style="margin-bottom:12px">
            This is the live review surface for all generated media. Use the Media Output Center controls below to approve, reject, reroute, or send items back through the pipeline.
          </div>
          ${renderSection("renderMediaOutputCenter")}
        </div>
      </section>

      <!-- ── PRODUCT MATCHING ── -->
      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Product Matching</h2>
              <p>Pairs viral structures with EVICS products and positioning angles.</p>
            </div>
            <div class="product-toggle-row">
              <button class="metric-btn ${state.matchingProducts ? "scanning" : ""}" id="match-products-btn" ${state.matchingProducts ? "disabled" : ""}>
                ${state.matchingProducts ? `${icon("radar")} Matching…` : `${icon("spark")} Match Products`}
              </button>
              <button class="ghost" id="toggle-products">
                ${state.productsExpanded ? "▲ Hide Products" : "▼ Show All Products"}
              </button>
              ${state.productsExpanded && state.selectedProducts.size > 0 ? `
                <button class="ghost" id="filter-by-selected-products">Filter Creatives by Selected</button>
                <button class="toggle-link" id="clear-product-selection">Clear Selection</button>
              ` : ""}
            </div>
          </div>
          ${state.productsExpanded ? `
          <div class="product-grid">
            ${products.map((product) => {
              const isSelected = state.selectedProducts.has(product.name);
              return `
              <article class="${isSelected ? "product-selected" : ""}">
                <div class="product-card-head">
                  <input type="checkbox" class="product-checkbox" data-product-name="${product.name.replace(/"/g, "&quot;")}" ${isSelected ? "checked" : ""} />
                  ${product.imageUrl ? `<img class="product-thumb" src="${product.imageUrl}" alt="" />` : `<div class="product-thumb empty-thumb"></div>`}
                  <div>
                    <strong>${product.name}</strong>
                    <span>${product.category}</span>
                  </div>
                </div>
                <meter min="0" max="100" value="${product.score}"></meter>
                <p>${product.angle}</p>
                <small class="product-source">${product.source === "shopify" ? "Shopify synced" : "Workspace product"}</small>
              </article>
            `}).join("")}
          </div>
          ` : `
          <div class="product-collapsed-summary">
            ${products.map((p) => `<span class="product-pill ${state.selectedProducts.has(p.name) ? "product-pill-selected" : ""}">${p.name}</span>`).join("")}
          </div>
          `}
        </div>

      <section class="metrics-grid">
        ${metric("Reconstructions today", creatives.length.toString(), "from viral patterns")}
        ${metric("Avg quality score", Math.round(creatives.reduce((s, c) => s + c.score, 0) / (creatives.length || 1)).toString(), "across all creatives")}
        ${metric("Ready to publish", creatives.filter((c) => c.status === "Ready").length.toString(), "approved creatives")}
        ${metric("Pending review", creatives.filter((c) => c.status === "Review").length.toString(), "need approval")}
      </section>

      <!-- AI Content Queue -->
      <section class="queue-section">
        <div class="panel creative-panel">
          <div class="panel-head">
            <div>
              <h2>AI Content Queue</h2>
              <p>Original creative concepts inspired by winning structures, ready for HeyGen, Runway, Kling, Canva, and OpenAI workflows.</p>
            </div>
            <div class="queue-controls">
              <div class="segmented">
                ${["Ready", "Review", "Draft", "All"].map((mode) => `<button class="${state.queueMode === mode ? "active" : ""}" data-mode="${mode}">${mode}</button>`).join("")}
              </div>
              <label class="metric-select-label">
                <select data-select="creativeProductFilter" class="metric-select">
                  ${["All", ...products.map((p) => p.name)].map((n) => `<option ${n === state.creativeProductFilter ? "selected" : ""}>${n}</option>`).join("")}
                </select>
              </label>
            </div>
          </div>
          <div class="creative-list">
            ${filteredCreatives().map((item) => `
              <article class="creative-card ${state.approvals.has(item.id) ? "approved" : ""} ${state.selectedCreativeIds.has(item.id) ? "selected" : ""}">
                <label class="creative-select-wrap" title="Select">
                  <input type="checkbox" class="creative-select-cb" data-creative-id="${item.id}" ${state.selectedCreativeIds.has(item.id) ? "checked" : ""} />
                </label>
                <div class="creative-score">${item.score}</div>
                <div class="creative-body">
                  <div class="creative-title">
                    <strong>${item.product}</strong>
                    <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
                  </div>
                  <p>${item.hook}</p>
                  <small>${item.format} · ${item.asset} · ${item.channel}</small>
                  ${scoreBar(item.score, false)}
                  ${item.rejectionReason ? `
                    <div class="rejection-summary">
                      <span class="rejection-label">⚠ Review note:</span> ${item.rejectionReason}
                    </div>
                  ` : ""}
                </div>
                <button class="icon-button" data-approve="${item.id}" title="Toggle approval">${icon("check")}</button>
              </article>
            `).join("") || `<div class="empty">No items in this queue.</div>`}
          </div>
          ${state.selectedCreativeIds.size > 0 ? `
          <div class="bulk-action-toolbar">
            <span>${state.selectedCreativeIds.size} selected</span>
            <button class="primary" id="bulk-approve-btn">Approve All</button>
            <button class="ghost" id="bulk-queue-btn">Queue All</button>
            <button class="ghost" id="bulk-archive-btn">Archive All</button>
            <button class="ghost" id="bulk-clear-btn">Clear</button>
          </div>
          ` : ""}
        </div>

        <div class="panel">
          <div class="panel-head compact">
            <h2>Reconstruction Pipeline</h2>
          </div>
          <div class="timeline">
            ${[
              ["Step 1", "Scan viral ad", "Identify hook, structure, emotion, and CTA pattern"],
              ["Step 2", "Deconstruct", "Extract reusable components and winning formulas"],
              ["Step 3", "Match product", "Pair structure with best-fit EVICS product"],
              ["Step 4", "Reconstruct", "Generate new creative using AI with your brand voice"],
              ["Step 5", "Score & review", "Quality score assigned, sent to approval queue"]
            ].map(([time, title, desc]) => `
              <div>
                <time>${time}</time>
                <span></span>
                <div><strong>${title}</strong><p>${desc}</p></div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <!-- ── AUTO-GENERATE PIPELINE ── -->
      <section class="auto-generate-section panel">
        <div class="panel-head">
          <div>
            <h2>${icon("spark")} Auto-Generate Pipeline</h2>
            <p>Run the full AI pipeline: Trend Scout → Product Match → Script Writer → Visual Director → Ready to render.</p>
          </div>
          <button class="primary ${state.autoGenerating ? "scanning" : ""}" id="auto-generate-btn" ${state.autoGenerating ? "disabled" : ""}>
            ${state.autoGenerating ? `${icon("radar")} Running Pipeline…` : `${icon("spark")} Auto-Generate Everything`}
          </button>
        </div>

        ${state.autoGenerating || state.autoGeneratePipelineSteps.length > 0 ? `
        <div class="pipeline-steps" id="auto-generate-pipeline">
          ${state.autoGeneratePipelineSteps.map((s) => `<span class="pipeline-step">${s}</span>`).join("")}
        </div>
        ` : ""}

        ${state.autoGenerateResult ? `
        <div class="auto-generate-result">
          <div class="auto-result-head">
            <h3>Top Recommendation</h3>
            <span class="hook-tag hook-confidence-high">Quality Score ${state.autoGenerateResult.qualityScore}</span>
          </div>
          <div class="auto-result-grid">
            <div class="auto-result-item">
              <span class="auto-result-label">Hook</span>
              <p>"${state.autoGenerateResult.hook}"</p>
              <div class="lib-meta">
                <span class="hook-tag">${state.autoGenerateResult.hookPlatform}</span>
                <span class="hook-tag hook-confidence-${(state.autoGenerateResult.hookConfidence || "high").toLowerCase()}">${state.autoGenerateResult.hookConfidence} confidence</span>
              </div>
            </div>
            <div class="auto-result-item">
              <span class="auto-result-label">Product</span>
              <p>${state.autoGenerateResult.product}</p>
              <div class="lib-meta">
                <span class="hook-tag hook-confidence-high">Score ${state.autoGenerateResult.productScore}</span>
                <span class="hook-tag">${state.autoGenerateResult.productAngle}</span>
              </div>
            </div>
            <div class="auto-result-item">
              <span class="auto-result-label">Format</span>
              <p>${state.autoGenerateResult.format} · ${state.autoGenerateResult.duration} · ${state.autoGenerateResult.aspect}</p>
              <div class="lib-meta">
                <span class="hook-tag">${state.autoGenerateResult.platform}</span>
              </div>
            </div>
          </div>
          <div class="auto-result-script">
            <span class="auto-result-label">Generated Script</span>
            <p>${state.autoGenerateResult.script}</p>
          </div>
          <div class="auto-result-actions">
            <span class="auto-result-label">Send to Platform</span>
            <div class="render-actions" style="margin-top:8px">
              <button class="render-btn heygen" data-auto-send="heygen">${icon("video")} Render A+ HeyGen Video</button>
            </div>
          </div>
        </div>
        ` : ""}
      </section>

      <section class="analytics-band">
        <div>
          <h2>Learning Loop</h2>
          <p>The system tracks watch time, engagement, click-through rate, sales, and conversion rate, then updates the best hooks, visuals, products, and formats nightly.</p>
        </div>
        <div class="bars">
          ${[
            ["Hook strength", 91],
            ["Visual pacing", 84],
            ["CTA clarity", 78],
            ["Product fit", 88]
          ].map(([label, val]) => `<div><span>${label}</span><b>${val}%</b><i style="--w:${val}%"></i></div>`).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderVideoGeneration() {
  const hasInput = Boolean(state.submittedScript.trim());
  const hasVideoPackage = Boolean(state.videoProductTitle.trim())
    && Boolean(state.videoProductPageUrl.trim())
    && Boolean(state.videoCompanyLabel.trim());
  const isProcessing = state.renderStatus === "processing";
  const canGenerate = hasInput && hasVideoPackage && !isProcessing;
  const canExport = Boolean(state.renderUrl) && state.renderStatus === "complete";
  const eliteSequence = getEliteRenderSequence();
  const eliteAvatarId = getEliteAvatarId();
  const eliteVoiceId = getEliteVoiceId();

  return `
    <div class="section-content video-pipeline-content">
      <div class="section-intro">
        <h2>Video Generation Pipeline</h2>
        <p>Elite linear workflow: submit the script, lock the real product mockup and brand label, define the Sea Moss Capsules Jordan brief, then preview and export the exact output.</p>
      </div>

      <article class="pipeline-card elite-director-card">
        <div class="pipeline-step-label">0 · DIRECTOR'S BRIEF</div>
        <div class="elite-director-head">
          <div>
            <h3>Sea Moss Capsules + Jordan Avatar Render Brief</h3>
            <p>Admin describes the brand intent and the AI turns that direction into the final render path, effect stack, timing decisions, and the exact product mockup to be shown.</p>
          </div>
        </div>
        <div class="elite-director-grid">
          <label class="param-label">Company Label
            <input data-state-key="videoCompanyLabel" type="text" placeholder="I AM GENESIS TECH" value="${escapeHtml(state.videoCompanyLabel)}" />
          </label>
          <label class="param-label">Product Name
            <input data-state-key="videoProductTitle" type="text" placeholder="Sea Moss Capsules" value="${escapeHtml(state.videoProductTitle)}" />
          </label>
          <label class="param-label">Product Mockup URL
            <input data-state-key="videoProductMockupUrl" type="url" placeholder="Auto-resolved from Shopify primary image at render time" value="${escapeHtml(state.videoProductMockupUrl)}" />
          </label>
          <label class="param-label">Product Page URL
            <input data-state-key="videoProductPageUrl" type="url" placeholder="https://...store-product-or-landing-page" value="${escapeHtml(state.videoProductPageUrl)}" />
          </label>
          <label class="param-label">Avatar
            <select data-state-key="videoAvatarPreset">
              ${["Jordan Avatar","Jordan Hero Avatar","Jordan Closeup Avatar"].map((v) => `<option ${state.videoAvatarPreset === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Voice File
            <select data-state-key="videoVoice">
              ${["Jordan Voice File","Male","Female","Narrator"].map((v) => `<option ${state.videoVoice === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Visual Background
            <select data-state-key="videoVisualBackground">
              ${Object.keys(ELITE_BACKGROUND_SCENES).map((v) => `<option ${state.videoVisualBackground === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Special Effects
            <select data-state-key="videoEffectPreset">
              ${["Ocean Reveal","Splash Wipe","Liquid Gold Shimmer","Premium Lens Bloom","AI Best Judgment"].map((v) => `<option ${state.videoEffectPreset === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Entry Timing
            <select data-state-key="videoEntryTiming">
              ${["Beat 1 cold open","Beat 2 product entrance","After trust line","AI Best Judgment"].map((v) => `<option ${state.videoEntryTiming === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Text Overlay Position
            <select data-state-key="videoTextOverlayPosition">
              ${["bottom","top"].map((v) => `<option value="${v}" ${state.videoTextOverlayPosition === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Product Treatment
            <select data-state-key="videoProductTreatment">
              ${["Background removed + AI ocean composite","Premium hero packshot","Macro splash reveal","Floating reflective reveal"].map((v) => `<option ${state.videoProductTreatment === v ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </label>
          <label class="param-label">Brand Direction
            <textarea data-state-key="videoBrandBrief" rows="3" placeholder="Describe the brand feeling, tone, and hero story...">${escapeHtml(state.videoBrandBrief)}</textarea>
          </label>
          <label class="param-label">Effect Direction
            <textarea data-state-key="videoEffectBrief" rows="3" placeholder="Describe the special effects to interpret or create...">${escapeHtml(state.videoEffectBrief)}</textarea>
          </label>
          <label class="param-label">Timing Direction
            <textarea data-state-key="videoTimingBrief" rows="3" placeholder="Describe timing, pacing, and entry moments...">${escapeHtml(state.videoTimingBrief)}</textarea>
          </label>
          <label class="param-label">CTA Destination
            <input data-state-key="videoDestinationUrl" type="url" placeholder="https://...landing-page-or-product-url" value="${escapeHtml(state.videoDestinationUrl)}" />
          </label>
          <label class="param-label">Tracking Protocol
            <textarea data-state-key="videoTrackingProtocol" rows="3" placeholder="Describe landing-page, shopify, and purchase tracking rules...">${escapeHtml(state.videoTrackingProtocol)}</textarea>
          </label>
        </div>
        <div class="elite-director-note">
          <strong>Governance:</strong> ${state.videoGovernanceMode} · <strong>Avatar ID:</strong> ${eliteAvatarId || "env fallback"} · <strong>Voice ID:</strong> ${eliteVoiceId || "env fallback"}
        </div>
        <div class="elite-render-summary">
          <strong>Package lock</strong>
          <p>Render only when the exact product mockup, page link, company label, and script are all present. No generated substitute products.</p>
        </div>
        <div class="elite-sequence-list">
          ${eliteSequence.map((step) => `<div class="elite-sequence-step"><span>${step.time}</span><strong>${step.title}</strong><p>${step.detail}</p></div>`).join("")}
        </div>
      </article>

      <section class="video-pipeline">
        <article class="pipeline-card input-layer">
          <div class="pipeline-step-label">1 · INPUT LAYER</div>
          <h3>Submit Script Input</h3>
          <p>Paste a production script or upload a .txt file. Submitting locks the exact script used by the render request.</p>
          <label class="script-input-label" for="script-input">Video script</label>
          <textarea id="script-input" class="script-input" rows="9" placeholder="Paste the final script that should be rendered into video...">${escapeHtml(state.scriptInput)}</textarea>
          <div class="file-input-row">
            <label class="file-picker" for="script-file-input">Upload .txt Script</label>
            <input id="script-file-input" type="file" accept=".txt,text/plain" />
            <span>${state.uploadedScriptName ? escapeHtml(state.uploadedScriptName) : "No file selected"}</span>
          </div>
          <div class="elite-brief-summary">
            <strong>Brief intent</strong>
            <p>Sea Moss Capsules, Jordan Avatar, ocean visuals, elite product entrance, and the actual product mockup with company branding described by the operator.</p>
          </div>
          <button class="primary pipeline-action" id="submit-video-input" ${state.scriptInput.trim() ? "" : "disabled"}>Use Script</button>
          <div class="pipeline-feedback ${state.inputStatus}">${escapeHtml(state.inputMessage)}</div>
        </article>

        <article class="pipeline-card generation-layer">
          <div class="pipeline-step-label">2 · PROCESSING / GENERATION LAYER</div>
          <h3>Generate Video</h3>
          <p>One render action sends the submitted script to the backend HeyGen integration. Status is polled until completion or failure.</p>
          <div class="params-grid pipeline-params">
            <label class="param-label">Duration
              <select data-state-key="videoDuration" ${isProcessing ? "disabled" : ""}>
                ${["5s","10s","15s","20s","30s"].map((v) => `<option ${state.videoDuration === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Style
              <select data-state-key="videoStyle" ${isProcessing ? "disabled" : ""}>
                ${["UGC","Commercial","Luxury","Educational"].map((v) => `<option ${state.videoStyle === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Voice
              <select data-state-key="videoVoice" ${isProcessing ? "disabled" : ""}>
                ${["Jordan Voice File","Male","Female","Narrator"].map((v) => `<option ${state.videoVoice === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Audio Bed
              <select data-state-key="videoBackground" ${isProcessing ? "disabled" : ""}>
                ${["None","Music","Ambient"].map((v) => `<option ${state.videoBackground === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Visual Background
              <select data-state-key="videoVisualBackground" ${isProcessing ? "disabled" : ""}>
                ${Object.keys(ELITE_BACKGROUND_SCENES).map((v) => `<option ${state.videoVisualBackground === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Special Effects
              <select data-state-key="videoEffectPreset" ${isProcessing ? "disabled" : ""}>
                ${["Ocean Reveal","Splash Wipe","Liquid Gold Shimmer","Premium Lens Bloom","AI Best Judgment"].map((v) => `<option ${state.videoEffectPreset === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Entry Timing
              <select data-state-key="videoEntryTiming" ${isProcessing ? "disabled" : ""}>
                ${["Beat 1 cold open","Beat 2 product entrance","After trust line","AI Best Judgment"].map((v) => `<option ${state.videoEntryTiming === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Product Treatment
              <select data-state-key="videoProductTreatment" ${isProcessing ? "disabled" : ""}>
                ${["Background removed + AI ocean composite","Premium hero packshot","Macro splash reveal","Floating reflective reveal"].map((v) => `<option ${state.videoProductTreatment === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Aspect Ratio
              <select data-state-key="videoAspect" ${isProcessing ? "disabled" : ""}>
                ${["9:16","16:9","1:1"].map((v) => `<option ${state.videoAspect === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="elite-governance-line">AI governance: ${state.videoGovernanceMode} · sequence tuned for elite brand impact and learning-loop improvements.</div>
          <div class="elite-governance-line">Facebook-ready target: ${state.videoDuration} · ${state.videoAspect} · destination ${escapeHtml(state.videoProductPageUrl || state.videoDestinationUrl || "unset")}.</div>
          <div class="elite-timing-intel">
            <strong>Timing intelligence</strong>
            <p>AI can align product entrance, shimmer, and pacing to the strongest available timing signals from analytics, watch-time, engagement, and completion metrics.</p>
          </div>
          <button class="primary pipeline-action generate-video-action" id="generate-video-btn" ${canGenerate ? "" : "disabled"}>
            ${isProcessing ? `${icon("radar")} Generating Elite Render…` : `${icon("video")} Generate Elite Video`}
          </button>
          <div class="render-status-card ${state.renderStatus}">
            <div>
              <span>Status</span>
              <strong>${renderStatusLabel(state.renderStatus)}</strong>
            </div>
            <p>${escapeHtml(state.renderMessage)}</p>
            ${state.renderVideoId ? `<small>Render ID: ${escapeHtml(state.renderVideoId)}</small>` : ""}
            ${isProcessing ? `
              <div class="render-progress-bar"><div class="render-progress-fill" style="width:${state.renderProgress}%"></div></div>
              <small>${state.renderProgress}% complete</small>
            ` : ""}
          </div>
          <div class="elite-render-summary">
            <strong>Elite render intent</strong>
            <p>Sea Moss Capsules product with background removed, ocean composite placed behind it, Jordan Avatar leading, and the product entering on the strongest beat with premium shimmer timing. CTA should land on ${escapeHtml(state.videoProductPageUrl || state.videoDestinationUrl || "the approved destination")}.</p>
          </div>
        </article>

        <article class="pipeline-card output-layer">
          <div class="pipeline-step-label">3 · OUTPUT / PREVIEW LAYER</div>
          <h3>Preview Completed Video</h3>
          ${state.renderUrl ? `
            <video class="pipeline-video-player" src="${escapeHtml(state.renderUrl)}" controls preload="metadata"></video>
            <button type="button" class="render-url-link ghost" data-open-url="${escapeHtml(state.renderUrl)}">Open direct video URL</button>
          ` : `
            <div class="empty-output-state">
              <strong>No completed video output.</strong>
              <span>Submit input and generate a render. Playback appears only after the backend returns a direct video URL.</span>
            </div>
          `}
        </article>

        <article class="pipeline-card export-layer">
          <div class="pipeline-step-label">4 · EXPORT LAYER</div>
          <h3>Download Output</h3>
          <p>Exports the exact video URL returned by the completed render. Download is disabled until a real output exists.</p>
          ${canExport ? `
            <button type="button" class="primary pipeline-action export-download" data-download-url="${escapeHtml(state.renderUrl)}" data-download-name="iagt-generated-video.mp4">Download Video</button>
          ` : `
            <button class="primary pipeline-action" disabled>Download Video</button>
          `}
          <div class="pipeline-feedback ${canExport ? "ready" : "idle"}">${escapeHtml(canExport ? "Video is ready to download." : state.exportMessage)}</div>
        </article>
      </section>
    </div>
  `;
}

function renderDistribution() {
  const readyChannels = channels.filter((c) => c[3] === "Ready" || c[3] === "Queued");
  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Distribution</h2>
        <p>Publishing queue, channel management, and scheduled content delivery across all platforms.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Queued today", readyChannels.length.toString(), "ready to publish")}
        ${metric("Channels active", channels.length.toString(), "TikTok, IG, YT, Pinterest")}
        ${metric("Published this week", "14", "across all channels")}
        ${metric("Avg publish time", "2.3h", "from approval to live")}
      </section>

      <section class="queue-section">
        <div class="panel publish-panel">
          <div class="panel-head compact">
            <h2>Publishing Queue</h2>
            <div style="display:flex;gap:8px;align-items:center">
              <span>Today</span>
              ${readyChannels.length > 0 ? `<button class="primary dist-publish-all" style="padding:4px 12px;font-size:12px">Push All Ready (${readyChannels.length})</button>` : ''}
            </div>
          </div>
          <div class="channel-list">
            ${channels.map(([name, time, content, status], idx) => {
              const canPublish = status === "Ready" || status === "Queued";
              const channelKey = `dist-ch-${idx}`;
              const channelStatus = state.distChannelStatus && state.distChannelStatus[channelKey];
              return `
              <div class="channel-row ${channelStatus ? channelStatus.toLowerCase().replace(/\s+/g, '-') : ''}">
                <div class="channel-row-info">
                  <b>${escapeHtml(name)}</b>
                  <span>${escapeHtml(time)}</span>
                  <p>${escapeHtml(content)}</p>
                </div>
                <div class="channel-row-actions">
                  <small class="${status.toLowerCase()}">${channelStatus || escapeHtml(status)}</small>
                  ${canPublish && !channelStatus ? `<button class="primary dist-publish-btn" data-channel-key="${channelKey}" data-channel="${escapeHtml(name)}" data-content="${escapeHtml(content)}" style="padding:4px 10px;font-size:12px">Publish Now</button>` : ''}
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head compact">
            <h2>Channel Health</h2>
          </div>
          <div class="bars">
            ${[
              ["TikTok",     88],
              ["Instagram",  82],
              ["YouTube",    76],
              ["Pinterest",  71],
              ["Facebook",   68]
            ].map(([label, val]) => `<div><span>${label}</span><b>${val}%</b><i style="--w:${val}%"></i></div>`).join("")}
          </div>
        </div>
      </section>

      ${renderMediaArea("distribution")}
    </div>
  `;
}

function renderAnalytics() {
  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Analytics</h2>
        <p>Performance metrics, learning loop data, and pattern intelligence across all campaigns and creatives.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Avg watch time", "14.2s", "+2.1s vs last week")}
        ${metric("Click-through rate", "4.8%", "+0.6% vs last week")}
        ${metric("Conversion rate", "2.3%", "from ad to purchase")}
        ${metric("Revenue attributed", "$12,840", "this month")}
      </section>

      ${renderMediaGallery()}

      <section class="analytics-band">
        <div>
          <h2>Learning Loop</h2>
          <p>The system tracks watch time, engagement, click-through rate, sales, and conversion rate, then updates the best hooks, visuals, products, and formats nightly.</p>
        </div>
        <div class="bars">
          ${[
            ["Hook strength",  91],
            ["Visual pacing",  84],
            ["CTA clarity",    78],
            ["Product fit",    88]
          ].map(([label, val]) => `<div><span>${label}</span><b>${val}%</b><i style="--w:${val}%"></i></div>`).join("")}
        </div>
      </section>

      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Top Performing Hooks</h2>
              <p>Ranked by conversion signal and engagement velocity.</p>
            </div>
          </div>
          <div class="ad-list">
            ${winningHooks.filter((h) => h.confidence === "High").slice(0, 5).map((h, i) => `
              <div class="ad-row" style="cursor:default">
                <div class="score">${95 - i * 4}</div>
                <div>
                  <strong>${h.text}</strong>
                  <span>${h.category} · ${h.platform}</span>
                </div>
                <small>${h.confidence}</small>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Top Performing Products</h2>
              <p>Ranked by ROAS signal and creative performance.</p>
            </div>
          </div>
          <div class="ad-list">
            ${products.map((p, i) => `
              <div class="ad-row" style="cursor:default">
                <div class="score">${p.score}</div>
                <div>
                  <strong>${p.name}</strong>
                  <span>${p.category} · ${p.angle}</span>
                </div>
                <small>Score ${p.score}</small>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      ${renderMediaArea("analytics")}

      <!-- ── Executive Report ── -->
      <section class="panel" style="margin-top:16px">
        <div class="panel-head">
          <div>
            <h2>${icon("chart")} Executive Intelligence Report</h2>
            <p>Weekly AI-generated summary — performance, approvals, top performers, and recommendations.</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="ghost ${state.execReportLoading ? "generating" : ""}" id="exec-report-btn" ${state.execReportLoading ? "disabled" : ""}>
              ${state.execReportLoading ? `${icon("radar")} Generating…` : `${icon("chart")} Generate Report`}
            </button>
          </div>
        </div>
        ${state.execReportResult ? `
        <div class="exec-report-body">
          <div class="exec-report-meta">
            <strong>${state.execReportResult.report.week}</strong>
            <span>Generated ${new Date(state.execReportResult.report.generatedAt).toLocaleTimeString()}</span>
          </div>
          <div class="metrics-grid" style="margin-top:12px">
            ${Object.entries(state.execReportResult.report.summary).map(([k, v]) => `
              <article class="metric"><span>${k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span><strong>${v}</strong></article>
            `).join("")}
          </div>
          ${state.execReportResult.report.topPerformer ? `
          <div class="agent-result-card" style="margin:12px 0">
            <strong>Top Performer:</strong> ${state.execReportResult.report.topPerformer.product} — Score ${state.execReportResult.report.topPerformer.score}
          </div>
          ` : ""}
          <div class="exec-recommendations">
            <strong>Recommendations:</strong>
            <ul>${(state.execReportResult.report.recommendations || []).map((r) => `<li>${r}</li>`).join("")}</ul>
          </div>
        </div>
        ` : `<div style="padding:16px;opacity:0.6;font-size:0.9em">Click Generate Report to get a real-time executive summary from live workspace data.</div>`}
      </section>

      <!-- ── System Health ── -->
      <section class="panel system-health-panel" style="margin-top:16px">
        <div class="panel-head">
          <div>
            <h2>${icon("gear")} System Health</h2>
            <p>Live status of all EVICS integrations, database, and API connections.</p>
          </div>
          <button class="ghost" id="refresh-health-btn" ${state.systemHealthLoading ? "disabled" : ""}>
            ${state.systemHealthLoading ? "Checking…" : "↻ Refresh"}
          </button>
        </div>
        ${state.systemHealth ? (() => {
          const h = state.systemHealth;
          const dots = [
            ["Database",   h.database === "connected"],
            ["Shopify",    h.shopify === "connected"],
            ["OpenAI",     !!h.integrations?.openai],
            ["HeyGen",     !!h.integrations?.heygen],
            ["Runway",     !!h.integrations?.runway],
            ["Kling",      !!h.integrations?.kling],
            ["Vizard",     !!h.integrations?.vizard],
            ["Predis",     !!h.integrations?.predis],
            ["Canva",      !!h.integrations?.canva],
            ["Gemini",     !!h.integrations?.gemini],
          ];
          const active = dots.filter(([, ok]) => ok).length;
          return `
          <div class="health-summary">
            <span class="health-status-badge ${active >= 7 ? "health-ok" : active >= 4 ? "health-partial" : "health-offline"}">
              ${active}/${dots.length} Active
            </span>
            <small>Uptime: ${h.uptime !== undefined ? Math.floor(h.uptime / 60) + "m" : "—"} · Routes: ${h.routeCount || "—"}</small>
          </div>
          <div class="health-dots-grid">
            ${dots.map(([label, ok]) => `
              <div class="health-dot-row">
                <span class="health-dot ${ok ? "dot-ok" : "dot-off"}"></span>
                <span>${label}</span>
                <span class="health-dot-state">${ok ? "Active" : "Offline"}</span>
              </div>
            `).join("")}
          </div>
          ${state.systemHealthLastFetch ? `<small class="health-ts">Last checked: ${new Date(state.systemHealthLastFetch).toLocaleTimeString()}</small>` : ""}
          `;
        })() : `<div style="padding:16px;opacity:0.6;font-size:0.9em">Click Refresh to check live system status.</div>`}
      </section>

      <!-- ── Scheduler Activity Log ── -->
      <section class="panel scheduler-log-panel" style="margin-top:16px">
        <div class="panel-head">
          <div>
            <h2>${icon("gear")} Automation Scheduler Log</h2>
            <p>Live activity log of background intelligence tasks — viral scan, profit audit, library cleanup, executive report.</p>
          </div>
          <button class="ghost" id="refresh-scheduler-log-btn" ${state.schedulerLogLoading ? "disabled" : ""}>
            ${state.schedulerLogLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
        <div class="scheduler-log-body">
          ${state.schedulerLog && state.schedulerLog.length ? `
            <div class="scheduler-log-list">
              ${[...state.schedulerLog].reverse().slice(0, 20).map(entry => {
                const statusCls = entry.status === 'success' ? 'log-ok' : entry.status === 'error' || entry.status === 'http-error' ? 'log-err' : 'log-info';
                return `<div class="scheduler-log-row ${statusCls}">
                  <span class="log-ts">${new Date(entry.ts).toLocaleTimeString()}</span>
                  <span class="log-task">${entry.name}</span>
                  <span class="log-status">${entry.status}</span>
                  ${entry.detail ? `<span class="log-detail">${entry.detail}</span>` : ''}
                </div>`;
              }).join('')}
            </div>
          ` : `<div style="padding:16px;opacity:0.6;font-size:0.9em">No scheduler activity yet. Tasks run automatically: viral scan every 4h, profit audit and library cleanup daily, executive report weekly.</div>`}
        </div>
      </section>

      <!-- ── Phone App Render Monitor ── -->
      <section class="panel phone-render-panel" style="margin-top:16px">
        <div class="panel-head">
          <div>
            <h2>${icon("video")} Phone App Render Monitor</h2>
            <p>Video jobs submitted from the affiliate mobile app — track status, view completions, and manage cached media.</p>
          </div>
          <button class="ghost" id="refresh-phone-renders-btn" ${state.phoneRendersLoading ? "disabled" : ""}>
            ${state.phoneRendersLoading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
        <div class="phone-render-body">
          ${state.phoneRenders && state.phoneRenders.length ? `
            <div class="phone-render-list">
              ${state.phoneRenders.slice(0, 15).map(r => {
                const statusCls = r.status === 'completed' ? 'render-done' : r.status === 'rendering' ? 'render-active' : 'render-pending';
                return `<div class="phone-render-row">
                  <span class="render-status-dot ${statusCls}"></span>
                  <div class="render-meta">
                    <strong>${r.productTitle || r.product_name || r.video_id || 'Unknown Product'}</strong>
                    <span>${r.status} · ${r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</span>
                    ${r.affiliate_email ? `<span class="render-affiliate">Affiliate: ${r.affiliate_email}</span>` : ''}
                  </div>
                  ${r.video_url ? `<button type="button" class="ghost" data-open-url="${escapeHtml(r.video_url)}">▶ Watch</button>` : ''}
                  ${r.local_mp4 ? `<span class="render-local-badge">📁 Cached</span>` : ''}
                </div>`;
              }).join('')}
            </div>
          ` : `<div style="padding:16px;opacity:0.6;font-size:0.9em">No phone app renders yet. Use the Avatar Studio in the mobile app to generate your first video.</div>`}
        </div>
      </section>

      <!-- WISDOM OF THE DAY PANEL -->
      <section class="panel wisdom-panel">
        <div class="panel-header">
          <h3>🕊️ Wisdom of the Day</h3>
          <button class="ghost" id="refresh-wisdom-btn" ${state.wisdomLoading ? 'disabled' : ''}>
            ${state.wisdomLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
        <div class="wisdom-body">
          ${state.wisdomDaily && state.wisdomDaily.wisdom ? `
            <div class="wisdom-card">
              <div class="wisdom-category-badge wisdom-cat-${state.wisdomDaily.wisdom.category || 'spiritual'}">${(state.wisdomDaily.wisdom.category || 'spiritual').toUpperCase()}</div>
              <h4 class="wisdom-title">${state.wisdomDaily.wisdom.title}</h4>
              <p class="wisdom-content">${state.wisdomDaily.wisdom.content}</p>
              <blockquote class="wisdom-scripture">${state.wisdomDaily.wisdom.scripture || ''}</blockquote>
              <div class="wisdom-affirmation">
                <span class="wisdom-affirmation-label">Affirmation:</span>
                <em>${state.wisdomDaily.wisdom.affirmation || ''}</em>
              </div>
              ${state.wisdomDaily.financialTip ? `
                <div class="wisdom-tip">
                  <span class="wisdom-tip-icon">💰</span>
                  <span>${state.wisdomDaily.financialTip}</span>
                </div>
              ` : ''}
              <div class="wisdom-date">Daily drop for ${state.wisdomDaily.date || 'today'}</div>
            </div>
          ` : `<div class="wisdom-empty">Loading today's wisdom… connect to the server to receive the daily drop.</div>`}
        </div>
      </section>

      <!-- COMMUNITY PULSE PANEL -->
      <section class="panel community-panel">
        <div class="panel-header">
          <h3>🌍 Community Pulse</h3>
          <button class="ghost" id="refresh-community-btn" ${state.communityStatsLoading ? 'disabled' : ''}>
            ${state.communityStatsLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
        <div class="community-stats-grid">
          ${state.communityStats ? `
            <div class="comm-stat"><span class="comm-stat-num">${Number(state.communityStats.totalMembers || 0).toLocaleString()}</span><span class="comm-stat-label">Total Members</span></div>
            <div class="comm-stat"><span class="comm-stat-num">${Number(state.communityStats.activeAffiliates || 0).toLocaleString()}</span><span class="comm-stat-label">Active Affiliates</span></div>
            <div class="comm-stat"><span class="comm-stat-num">$${Number(state.communityStats.totalPaidOut || 0).toLocaleString()}</span><span class="comm-stat-label">Total Paid Out</span></div>
            <div class="comm-stat"><span class="comm-stat-num">${state.communityStats.countriesRepresented || 0}</span><span class="comm-stat-label">Countries</span></div>
          ` : '<div class="comm-loading">Loading community stats…</div>'}
        </div>
        ${state.communityStats && state.communityStats.platformMessage ? `<div class="community-message">${state.communityStats.platformMessage}</div>` : ''}
        <div class="community-feed">
          ${state.communityFeed && state.communityFeed.length ? state.communityFeed.map(f => {
            const icons = { sale: '💰', join: '🎉', payout: '💳', video: '🎬', tier: '⭐', wisdom: '🕊️' };
            const icon = icons[f.type] || '📣';
            const ts = f.ts || f.created_at ? new Date(f.ts || f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return `<div class="feed-row">
              <span class="feed-icon">${icon}</span>
              <div class="feed-content">
                <strong>${f.user || f.user_name || 'Member'}</strong>
                <span>${f.message}</span>
              </div>
              <div class="feed-meta">
                ${f.amount ? `<span class="feed-amount">+$${Number(f.amount).toFixed(0)}</span>` : ''}
                <span class="feed-ts">${ts}</span>
              </div>
            </div>`;
          }).join('') : '<div class="comm-loading">Loading community feed…</div>'}
        </div>
      </section>

    </div>
  `;
  const health = state.agentPipelineHealth;

  return `
    <div class="agent-orch-section panel">
      <div class="agent-orch-header">
        <div class="agent-orch-title-row">
          <div>
            <h2>${icon("gear")} Agent Orchestration Dashboard</h2>
            <p>Real-time executive board agents and office operations — live pipeline status and task visibility.</p>
          </div>
          <div class="agent-orch-controls">
            <div class="agent-health-badge ${health >= 95 ? "health-excellent" : health >= 80 ? "health-good" : "health-warn"}">
              <i></i> Pipeline Health: <strong>${health}%</strong>
            </div>
            <button class="ghost agent-refresh-btn" id="agent-refresh-btn">
              ${state.agentStatusLoading ? `${icon("radar")} Loading…` : `${icon("radar")} Refresh`}
            </button>
            <button class="toggle-link" id="toggle-agent-status">
              ${state.agentStatusOpen ? "▲ Collapse" : "▼ Expand"}
            </button>
          </div>
        </div>
      </div>

      ${state.agentStatusOpen ? `
      <div class="agent-orch-body">
        ${state.agentStatusLoading ? `
          <div class="agent-loading">
            ${icon("radar")} Loading agent statuses…
          </div>
        ` : `
        <!-- Pipeline Flow Visualization -->
        <div class="agent-pipeline-flow">
          <div class="pipeline-step">
            <span class="pipeline-label">Trend Scout</span>
            <span class="pipeline-arrow">→</span>
          </div>
          <div class="pipeline-step">
            <span class="pipeline-label">Product Match</span>
            <span class="pipeline-arrow">→</span>
          </div>
          <div class="pipeline-step">
            <span class="pipeline-label">Script Writer</span>
            <span class="pipeline-arrow">→</span>
          </div>
          <div class="pipeline-step">
            <span class="pipeline-label">Visual Director</span>
            <span class="pipeline-arrow">→</span>
          </div>
          <div class="pipeline-step">
            <span class="pipeline-label">Publish</span>
          </div>
          <div class="pipeline-orchestrator">
            <span class="pipeline-orch-label">${icon("gear")} Office Agent orchestrating all stages</span>
          </div>
        </div>

        <!-- Agent Cards Grid -->
        <div class="agent-cards-grid">
          ${agents.map((agent) => `
            <div class="agent-card agent-card-${agent.status}">
              <div class="agent-card-header">
                <div class="agent-card-icon agent-icon-${agent.id}">
                  ${icon(agent.icon || "gear")}
                </div>
                <div class="agent-card-title-block">
                  <strong class="agent-card-name">${agent.name}</strong>
                  <span class="agent-status-badge agent-status-${agent.status}">
                    <i></i> ${agent.status === "active" ? "Active" : "Standby"}
                  </span>
                </div>
                <div class="agent-quality-score">${agent.qualityScore}</div>
              </div>
              <p class="agent-card-role">${agent.role}</p>
              <div class="agent-card-body">
                <div class="agent-task-row">
                  <span class="agent-task-label">Current Task</span>
                  <span class="agent-task-value">${agent.currentTask}</span>
                </div>
                <div class="agent-task-row">
                  <span class="agent-task-label">Processing</span>
                  <span class="agent-task-value">${agent.processingTime}</span>
                </div>
                <div class="agent-task-row agent-result-row">
                  <span class="agent-task-label">Last Result</span>
                  <span class="agent-task-value agent-result-text">${agent.lastResult}</span>
                </div>
                <div class="agent-task-row">
                  <span class="agent-task-label">Next Action</span>
                  <span class="agent-task-value agent-next-action">${agent.nextAction}</span>
                </div>
              </div>
              <div class="agent-quality-bar-row">
                <span class="agent-quality-label">Quality Score</span>
                <div class="agent-quality-bar">
                  <div class="agent-quality-fill" style="width:${agent.qualityScore}%"></div>
                </div>
                <span class="agent-quality-num">${agent.qualityScore}/100</span>
              </div>
            </div>
          `).join("")}
        </div>
        `}
      </div>
      ` : ""}
    </div>
  `;
}

function renderPublishedMediaGallery() {
  const items = filteredPublishedMedia();
  const selected = items.find((m) => m.id === state.selectedPublishedId) || null;
  const statusFilters = ["All", "live", "scheduled", "archived"];
  const totalViews = items.reduce((s, m) => s + (m.views || 0), 0);
  const liveCount = (state.publishedMedia.length ? state.publishedMedia : DEMO_PUBLISHED_MEDIA).filter((m) => m.status === "live").length;

  return `
    <div class="published-gallery-section panel">
      <div class="published-gallery-header">
        <div class="published-gallery-title-row">
          <div>
            <h2>${icon("send")} Published Media Gallery</h2>
            <p>All released content — manual uploads, auto-generated, and published to platforms. Live performance metrics.</p>
          </div>
          <div class="published-gallery-controls">
            <div class="published-stats-row">
              <span class="published-stat"><strong>${liveCount}</strong> live</span>
              <span class="published-stat"><strong>${fmt(totalViews)}</strong> total views</span>
            </div>
            <button class="ghost published-refresh-btn" id="published-refresh-btn">
              ${state.publishedMediaLoading ? `${icon("radar")} Loading…` : `${icon("radar")} Refresh`}
            </button>
            <button class="toggle-link" id="toggle-published-media">
              ${state.publishedMediaOpen ? "▲ Collapse" : "▼ Expand"}
            </button>
          </div>
        </div>
      </div>

      ${state.publishedMediaOpen ? `
      <div class="published-gallery-body">
        <!-- Status Filter Tabs -->
        <div class="published-filter-tabs">
          ${statusFilters.map((f) => `
            <button class="published-filter-tab ${state.publishedMediaFilter === f ? "published-filter-active" : ""}"
              data-pub-filter="${f}">
              ${f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              ${f !== "All" ? `<span class="pub-filter-count">${(state.publishedMedia.length ? state.publishedMedia : DEMO_PUBLISHED_MEDIA).filter((m) => m.status === f).length}</span>` : ""}
            </button>
          `).join("")}
        </div>

        <div class="published-workspace">
          <!-- Gallery Grid -->
          <div class="published-grid-panel">
            <div class="published-grid-meta">
              <span>${items.length} item${items.length !== 1 ? "s" : ""}</span>
              ${state.publishedMediaFilter !== "All" ? `<span class="media-filter-tag">${state.publishedMediaFilter}</span>` : ""}
            </div>
            <div class="published-grid">
              ${items.length === 0
                ? `<div class="media-empty">No published media found for this filter.</div>`
                : items.map((item) => `
                  <button class="published-card ${item.id === state.selectedPublishedId ? "published-card-selected" : ""}"
                    data-pub-id="${item.id}">
                    <div class="published-card-thumb published-thumb-${item.status}">
                      <div class="published-thumb-placeholder">▶</div>
                      <span class="published-status-badge pub-status-${item.status}">${item.status}</span>
                    </div>
                    <div class="published-card-body">
                      <strong class="published-card-title">${item.title}</strong>
                      <div class="published-card-platforms">
                        ${(item.publishedTo || []).map((p) => `<span class="pub-platform-tag">${p}</span>`).join("")}
                      </div>
                      <div class="published-card-metrics">
                        ${item.views > 0 ? `<span class="pub-metric">${fmt(item.views)} views</span>` : ""}
                        ${item.engagement > 0 ? `<span class="pub-metric">${item.engagement}% ER</span>` : ""}
                        ${item.conversion > 0 ? `<span class="pub-metric">${item.conversion}% CVR</span>` : ""}
                      </div>
                      <div class="published-card-score">Score <b>${item.score}</b></div>
                    </div>
                  </button>
                `).join("")
              }
            </div>
          </div>

          <!-- Detail Panel -->
          <div class="published-detail-panel ${selected ? "published-detail-active" : ""}">
            ${selected ? `
              <div class="published-detail-content">
                <div class="published-detail-header">
                  <div>
                    <span class="published-detail-status pub-status-${selected.status}">${selected.status}</span>
                    <h3 class="published-detail-title">${selected.title}</h3>
                  </div>
                  <button class="media-detail-close" id="published-detail-close">✕</button>
                </div>

                <div class="published-detail-preview">
                  <div class="media-preview-placeholder">
                    <div class="media-preview-icon">▶</div>
                    <p>${selected.status === "live" ? "Live on platforms" : selected.status === "scheduled" ? "Scheduled for publishing" : "Archived"}</p>
                  </div>
                </div>

                <div class="published-detail-meta">
                  <dl class="media-meta-grid">
                    <div><dt>Product</dt><dd>${selected.product || "—"}</dd></div>
                    <div><dt>Hook</dt><dd>${selected.hook || "—"}</dd></div>
                    <div><dt>Rendered via</dt><dd>${renderAppLabel(selected.platform)}</dd></div>
                    <div><dt>Quality Score</dt><dd><strong>${selected.score}</strong> / 100</dd></div>
                    <div><dt>Published</dt><dd>${new Date(selected.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
                  </dl>
                </div>

                <!-- Platform Performance -->
                <div class="published-platforms-section">
                  <h4>Published To</h4>
                  <div class="published-platforms-list">
                    ${(selected.publishedTo || []).map((p) => `
                      <div class="published-platform-row">
                        <span class="pub-platform-name">${p}</span>
                        <span class="pub-platform-status pub-status-${selected.status}">${selected.status}</span>
                      </div>
                    `).join("")}
                  </div>
                </div>

                <!-- Performance Metrics -->
                ${selected.views > 0 ? `
                <div class="published-perf-section">
                  <h4>Performance Metrics</h4>
                  <div class="published-perf-grid">
                    <div class="published-perf-card">
                      <span>Views</span>
                      <strong>${fmt(selected.views)}</strong>
                    </div>
                    <div class="published-perf-card">
                      <span>Engagement</span>
                      <strong>${selected.engagement}%</strong>
                    </div>
                    <div class="published-perf-card">
                      <span>Conversion</span>
                      <strong>${selected.conversion}%</strong>
                    </div>
                  </div>
                </div>
                ` : ""}

                <!-- Actions -->
                <div class="published-detail-actions">
                  ${selected.status !== "live" ? `
                  <button class="media-action-btn media-action-approve" data-pub-action="publish" data-pub-id="${selected.id}">
                    ${icon("send")} Publish Now
                  </button>
                  ` : ""}
                  <button class="media-action-btn media-action-download" data-pub-action="download" data-pub-id="${selected.id}">
                    ↓ Download
                  </button>
                  <button class="media-action-btn media-action-requeue" data-pub-action="archive" data-pub-id="${selected.id}">
                    ${icon("filter")} Archive
                  </button>
                  ${state.publishActionStatus && state.publishActionStatus.id === selected.id ? `
                  <span class="media-action-feedback ${state.publishActionStatus.type}">${state.publishActionStatus.message}</span>
                  ` : ""}
                </div>
              </div>
            ` : `
              <div class="media-detail-empty">
                <div class="media-detail-empty-icon">${icon("send")}</div>
                <p>Select a published item to view details and performance</p>
              </div>
            `}
          </div>
        </div>
      </div>
      ` : ""}
    </div>
  `;
}

function renderAnalyticsDashboard() {
  const data = state.analyticsData || DEMO_ANALYTICS;
  const pb = data.platformBreakdown || DEMO_ANALYTICS.platformBreakdown;
  const qb = data.qualityBreakdown || DEMO_ANALYTICS.qualityBreakdown;
  const topHooks = data.topHooks || DEMO_ANALYTICS.topHooks;

  return `
    <div class="analytics-dash-section panel">
      <div class="analytics-dash-header">
        <div class="analytics-dash-title-row">
          <div>
            <h2>${icon("chart")} Analytics Dashboard</h2>
            <p>Full performance metrics — platform analytics, hook effectiveness, quality scores, and revenue impact.</p>
          </div>
          <div class="analytics-dash-controls">
            <button class="ghost analytics-refresh-btn" id="analytics-refresh-btn">
              ${state.analyticsLoading ? `${icon("radar")} Loading…` : `${icon("chart")} Refresh`}
            </button>
            <button class="toggle-link" id="toggle-analytics">
              ${state.analyticsOpen ? "▲ Collapse" : "▼ Expand"}
            </button>
          </div>
        </div>
      </div>

      ${state.analyticsOpen ? `
      <div class="analytics-dash-body">
        <!-- Tab Navigation -->
        <div class="analytics-tabs">
          ${["overview", "platforms", "quality", "hooks"].map((tab) => `
            <button class="analytics-tab ${state.analyticsTab === tab ? "analytics-tab-active" : ""}"
              data-analytics-tab="${tab}">
              ${tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          `).join("")}
        </div>

        ${state.analyticsTab === "overview" ? `
        <!-- Overview Tab -->
        <div class="analytics-overview-grid">
          <div class="analytics-kpi-card">
            <span>Total Videos Created</span>
            <strong>${data.totalVideosCreated || 114}</strong>
            <small>all time</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Media Telemetry</span>
            <strong>${data.mediaTelemetryEvents || 0}</strong>
            <small>tracked actions</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Approval Rate</span>
            <strong>${data.approvalRate || 68}%</strong>
            <small>of all creatives</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Avg Quality Score</span>
            <strong>${data.avgQualityScore || 87}</strong>
            <small>/ 100 across all content</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Avg Watch Time</span>
            <strong>${data.avgWatchTime || 14.2}s</strong>
            <small>+2.1s vs last week</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Avg Engagement Rate</span>
            <strong>${data.avgEngagementRate || 10.2}%</strong>
            <small>across all platforms</small>
          </div>
          <div class="analytics-kpi-card">
            <span>CTA Conversion Rate</span>
            <strong>${data.ctaConversionRate || 4.8}%</strong>
            <small>from ad to action</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Hook Effectiveness</span>
            <strong>${data.hookEffectiveness || 91}%</strong>
            <small>high-confidence hooks</small>
          </div>
          <div class="analytics-kpi-card analytics-kpi-revenue">
            <span>Revenue Attributed</span>
            <strong>$${(data.revenueAttributed || 12840).toLocaleString()}</strong>
            <small>last 30 days (Shopify)</small>
          </div>
          <div class="analytics-kpi-card">
            <span>ROAS Estimate</span>
            <strong>${data.roasEstimate || 3.7}x</strong>
            <small>return on ad spend</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Total Orders</span>
            <strong>${(data.totalOrders || 0).toLocaleString()}</strong>
            <small>last 30 days</small>
          </div>
          <div class="analytics-kpi-card">
            <span>Avg Order Value</span>
            <strong>$${data.avgOrderValue || 0}</strong>
            <small>per Shopify order</small>
          </div>
        </div>

        <!-- Engagement Trends Bar -->
        <div class="analytics-trend-band">
          <h3>Engagement Trends</h3>
          <div class="bars">
            ${[
              ["Hook Strength",    qb.hookStrengthAvg || 91],
              ["Visual Pacing",    qb.pacingScoreAvg  || 84],
              ["CTA Clarity",      qb.ctaClarityAvg   || 78],
              ["Visual Style",     qb.visualStyleAvg  || 86],
              ["Overall Quality",  qb.overallAvg      || 87]
            ].map(([label, val]) => `<div><span>${label}</span><b>${val}%</b><i style="--w:${val}%"></i></div>`).join("")}
          </div>
        </div>
        ` : ""}

        ${state.analyticsTab === "platforms" ? `
        <!-- Platforms Tab -->
        <div class="analytics-platforms-grid">
          ${Object.entries(pb).map(([platform, stats]) => `
            <div class="analytics-platform-card">
              <div class="analytics-platform-header">
                <strong class="analytics-platform-name">${platform.charAt(0).toUpperCase() + platform.slice(1)}</strong>
                <span class="analytics-platform-videos">${stats.videos} videos</span>
              </div>
              <div class="analytics-platform-metrics">
                <div class="analytics-platform-metric">
                  <span>Views</span>
                  <strong>${fmt(stats.views)}</strong>
                </div>
                <div class="analytics-platform-metric">
                  <span>Engagement</span>
                  <strong>${stats.engagement}%</strong>
                </div>
                <div class="analytics-platform-metric">
                  <span>Conversion</span>
                  <strong>${stats.conversion}%</strong>
                </div>
              </div>
              <div class="analytics-platform-bar">
                <div class="analytics-platform-fill" style="width:${Math.round((stats.views / 2400000) * 100)}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
        ` : ""}

        ${state.analyticsTab === "quality" ? `
        <!-- Quality Tab -->
        <div class="analytics-quality-section">
          <div class="analytics-quality-summary">
            <div class="analytics-kpi-card">
              <span>Avg Quality Score</span>
              <strong>${qb.overallAvg || 87}</strong>
              <small>/ 100</small>
            </div>
            <div class="analytics-kpi-card">
              <span>Hook Strength Avg</span>
              <strong>${qb.hookStrengthAvg || 91}</strong>
              <small>min required: 75</small>
            </div>
            <div class="analytics-kpi-card">
              <span>Pacing Score Avg</span>
              <strong>${qb.pacingScoreAvg || 84}</strong>
              <small>min required: 70</small>
            </div>
            <div class="analytics-kpi-card">
              <span>CTA Clarity Avg</span>
              <strong>${qb.ctaClarityAvg || 78}</strong>
              <small>min required: 75</small>
            </div>
            <div class="analytics-kpi-card">
              <span>Visual Style Avg</span>
              <strong>${qb.visualStyleAvg || 86}</strong>
              <small>min required: 80</small>
            </div>
          </div>
          <div class="analytics-quality-bars">
            <h3>Quality Breakdown vs Thresholds</h3>
            ${[
              ["Hook Strength",   qb.hookStrengthAvg || 91, 75],
              ["Pacing Score",    qb.pacingScoreAvg  || 84, 70],
              ["CTA Clarity",     qb.ctaClarityAvg   || 78, 75],
              ["Visual Style",    qb.visualStyleAvg  || 86, 80],
              ["Overall Quality", qb.overallAvg      || 87, 80]
            ].map(([label, val, min]) => `
              <div class="analytics-quality-bar-row">
                <span class="analytics-quality-label">${label}</span>
                <div class="analytics-quality-track">
                  <div class="analytics-quality-fill ${val >= min ? "quality-pass" : "quality-fail"}" style="width:${val}%"></div>
                  <div class="analytics-quality-threshold" style="left:${min}%"></div>
                </div>
                <span class="analytics-quality-val ${val >= min ? "quality-pass-text" : "quality-fail-text"}">${val}</span>
                <span class="analytics-quality-min">min ${min}</span>
              </div>
            `).join("")}
          </div>
        </div>
        ` : ""}

        ${state.analyticsTab === "hooks" ? `
        <!-- Hooks Tab -->
        <div class="analytics-hooks-section">
          <h3>Top Performing Hooks</h3>
          <p class="analytics-hooks-desc">Ranked by total views and conversion rate across all platforms.</p>
          <div class="analytics-hooks-list">
            ${topHooks.map((h, i) => `
              <div class="analytics-hook-row">
                <div class="analytics-hook-rank">${i + 1}</div>
                <div class="analytics-hook-body">
                  <strong class="analytics-hook-text">${h.text}</strong>
                  <div class="analytics-hook-meta">
                    <span class="hook-tag">${h.platform}</span>
                    ${h.views > 0 ? `<span class="hook-tag">${fmt(h.views)} views</span>` : ""}
                    ${h.conversion > 0 ? `<span class="hook-tag hook-confidence-high">${h.conversion}% CVR</span>` : ""}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        ` : ""}
      </div>
      ` : ""}
    </div>
  `;
}

function renderQualityValidator() {
  const thresholds = state.qualityThresholds;
  const scores = state.qualityScores;
  const result = state.qualityResult;

  const metricLabels = QUALITY_METRIC_LABELS;

  return `
    <div class="quality-validator-section panel">
      <div class="quality-validator-header">
        <div>
          <h2>${icon("check")} Elite Quality Rendering Standards</h2>
          <p>Set the minimum quality bar, then validate renders and the latest scan against it. Auto-reject below threshold, auto-requeue for improvement.</p>
        </div>
      </div>

      <div class="quality-validator-body">
        <!-- Adjustable Thresholds -->
        <div class="quality-thresholds-panel">
          <div class="quality-thresholds-head">
            <h3>Elite Quality Thresholds</h3>
            <button class="toggle-link" id="quality-reset-thresholds">Reset to elite defaults</button>
          </div>
          <p class="quality-input-desc">Drag to set the minimum score each dimension must hit to qualify as elite. Changes persist and drive both the validator and the live scan impact below.</p>
          <div class="quality-thresholds-grid">
            ${Object.entries(thresholds).map(([key, min]) => `
              <div class="quality-threshold-card">
                <span class="quality-threshold-label">${metricLabels[key] || key}</span>
                <div class="quality-threshold-controls">
                  <input type="range" class="quality-range quality-threshold-range" data-threshold-key="${key}"
                    min="0" max="100" step="1" value="${min}" aria-label="${metricLabels[key] || key} threshold" />
                  <strong class="quality-threshold-min"><span id="quality-threshold-val-${key}">${min}</span>+</strong>
                </div>
                <span class="quality-threshold-desc">minimum required</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Manual Score Validator -->
        <div class="quality-input-panel">
          <h3>Validate Video Quality</h3>
          <p class="quality-input-desc">Enter scores for each dimension to validate a render against your elite standards.</p>
          <div class="quality-inputs-grid">
            ${Object.entries(scores).map(([key, val]) => `
              <div class="quality-input-row">
                <label class="quality-input-label">
                  ${metricLabels[key] || key}
                  <span class="quality-input-min" id="quality-scoremin-${key}">min ${thresholds[key]}</span>
                </label>
                <div class="quality-input-controls">
                  <input type="range" class="quality-range" data-quality-key="${key}"
                    min="0" max="100" step="1" value="${val}" aria-label="${metricLabels[key] || key} score" />
                  <span class="quality-range-val ${val >= thresholds[key] ? "quality-pass-text" : "quality-fail-text"}"
                    id="quality-val-${key}">${val}</span>
                </div>
              </div>
            `).join("")}
          </div>
          <button class="quality-validate-btn ${state.qualityValidating ? "validating" : ""}"
            id="quality-validate-btn" ${state.qualityValidating ? "disabled" : ""}>
            ${state.qualityValidating ? `${icon("radar")} Validating…` : `${icon("check")} Validate Against Elite Standards`}
          </button>
        </div>

        <!-- Live Scan Impact -->
        ${renderScanImpactPanel()}

        <!-- Validation Result -->
        ${result ? `
        <div class="quality-result-panel quality-result-${result.passed ? "pass" : result.action === "reject" ? "reject" : "requeue"}">
          <div class="quality-result-header">
            <span class="quality-result-icon">${result.passed ? "✓" : result.action === "reject" ? "✕" : "↺"}</span>
            <div>
              <strong class="quality-result-verdict">${result.passed ? "APPROVED" : result.action === "reject" ? "REJECTED" : "REQUEUE FOR IMPROVEMENT"}</strong>
              <p class="quality-result-message">${result.message}</p>
            </div>
          </div>
          ${result.failures && result.failures.length > 0 ? `
          <div class="quality-failures">
            <strong>Failed Checks:</strong>
            <ul>
              ${result.failures.map((f) => `
                <li class="quality-failure-item">
                  <span>${metricLabels[f.metric] || f.metric}</span>
                  <span class="quality-fail-text">${f.score} / ${f.required} required (gap: ${f.gap})</span>
                </li>
              `).join("")}
            </ul>
          </div>
          ` : ""}
          ${result.warnings && result.warnings.length > 0 ? `
          <div class="quality-warnings">
            <strong>Warnings (close to threshold):</strong>
            <ul>
              ${result.warnings.map((w) => `
                <li class="quality-warning-item">
                  <span>${metricLabels[w.metric] || w.metric}</span>
                  <span class="quality-warn-text">${w.score} / ${w.required} required (margin: +${w.margin})</span>
                </li>
              `).join("")}
            </ul>
          </div>
          ` : ""}
          <button class="toggle-link quality-clear-btn" id="quality-clear-result">Clear result</button>
        </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderExecutiveWorkspace() {
  const pa = state.profitAuditResult;
  const pt = state.productTiersResult;
  const ba = state.budgetAllocResult;
  const lc = state.libraryCleanupResult;
  const adminCode = getExecutiveAdminCode();
  const vpMission = state.vpMission;
  const mediaSurface = (window.__evicsRenderers && typeof window.__evicsRenderers.renderMediaOutputCenter === "function")
    ? window.__evicsRenderers.renderMediaOutputCenter()
    : "";
  const latestMediaCount = Array.isArray(state.publishedMedia) ? state.publishedMedia.length : 0;
  const queuedRenders = Array.isArray(state.mediaRenderQueue) ? state.mediaRenderQueue.length : 0;

  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Executive Workspace</h2>
        <p>Executive orchestration, governed media review, board oversight, and restricted API management access.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Board health", "98%", "governed decision layer")}
        ${metric("VP mission", vpMission ? (vpMission.status || "running") : "Idle", vpMission ? `mission ${vpMission.missionId}` : "ready to launch")}
        ${metric("Media outputs", String(latestMediaCount), "available for review")}
        ${metric("Queued renders", String(queuedRenders), "awaiting action")}
        ${metric("Learning loop", "Active", "telemetry and improvement")}
      </section>

      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("chart")} A+ Build Program</h2>
              <p>Cross-build objective tracking for EVICS, Affiliate Hub, Phone App, scanners/scrapers, and learning loops.</p>
            </div>
          </div>
          <div class="agent-controls-grid">
            <button class="agent-ctrl-btn primary ${state.excellenceLoading ? "generating" : ""}" id="run-excellence-audit-btn" ${state.excellenceLoading ? "disabled" : ""}>
              ${state.excellenceLoading ? `${icon("radar")} Auditing…` : `${icon("spark")} Run A+ Audit`}
            </button>
            <button class="agent-ctrl-btn" id="refresh-excellence-status-btn" ${state.excellenceLoading ? "disabled" : ""}>
              ${icon("radar")} Refresh A+ Status
            </button>
          </div>
          ${state.excellenceError ? `<div class="executive-gate-error" style="margin-top:10px">${escapeHtml(state.excellenceError)}</div>` : ""}
          ${state.excellenceStatus && state.excellenceStatus.report ? `
          <div class="agent-status-grid" style="grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top:12px;">
            <article class="agent-status-card"><span>Overall</span><strong>${escapeHtml(state.excellenceStatus.report.overall.grade || "N/A")}</strong><p>${Number(state.excellenceStatus.report.overall.score || 0)}/100</p></article>
            <article class="agent-status-card"><span>EVICS</span><strong>${escapeHtml((state.excellenceStatus.report.builds.evics || {}).grade || "N/A")}</strong><p>${Number((state.excellenceStatus.report.builds.evics || {}).score || 0)}/100</p></article>
            <article class="agent-status-card"><span>Affiliate</span><strong>${escapeHtml((state.excellenceStatus.report.builds.affiliateHub || {}).grade || "N/A")}</strong><p>${Number((state.excellenceStatus.report.builds.affiliateHub || {}).score || 0)}/100</p></article>
            <article class="agent-status-card"><span>Phone</span><strong>${escapeHtml((state.excellenceStatus.report.builds.phoneApp || {}).grade || "N/A")}</strong><p>${Number((state.excellenceStatus.report.builds.phoneApp || {}).score || 0)}/100</p></article>
          </div>
          <div class="automation-status-card" style="margin-top:12px">
            <div class="pulse-row"><i></i> ${state.excellenceStatus.report.overall.achievedAPlus ? "A+ objective achieved across all builds." : "A+ objective in progress — resolve remaining checks."}</div>
            <div style="margin-top:8px;font-size:0.9em;display:grid;gap:4px">
              <div><strong>Scanners/Scrapers:</strong> ${Number((state.excellenceStatus.report.builds.scannersScrapers || {}).score || 0)}/100</div>
              <div><strong>Learning Loop:</strong> ${Number((state.excellenceStatus.report.builds.learningLoop || {}).score || 0)}/100</div>
              <div><strong>Last Audit:</strong> ${escapeHtml(new Date(state.excellenceStatus.report.timestamp).toLocaleString())}</div>
            </div>
          </div>
          ` : `<div class="automation-status-card" style="margin-top:12px"><div class="pulse-row"><i></i> Run A+ Audit to generate cross-build score evidence.</div></div>`}
          ${state.excellenceObjectives && state.excellenceObjectives.length ? `
          <div class="agent-result-card" style="margin-top:12px">
            <strong>Priority Objectives</strong>
            <div style="margin-top:6px;font-size:0.85em;opacity:0.9;display:grid;gap:4px">
              ${state.excellenceObjectives.slice(0, 6).map((o) => `<div><b>P${o.priority}</b> · ${escapeHtml(o.title)} — <span style="text-transform:capitalize">${escapeHtml(o.status || "pending")}</span></div>`).join("")}
            </div>
          </div>
          ` : ""}
        </div>
      </section>

      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("crown")} VP Mission Control</h2>
              <p>Launch and monitor governed VP missions for product, media, and distribution execution.</p>
            </div>
          </div>
          <div class="agent-controls-grid">
            <button class="agent-ctrl-btn primary ${state.vpMissionLoading ? "generating" : ""}" id="launch-vp-mission-btn" ${state.vpMissionLoading ? "disabled" : ""}>
              ${state.vpMissionLoading ? `${icon("radar")} Launching…` : `${icon("spark")} Launch VP Mission`}
            </button>
            <button class="agent-ctrl-btn" id="refresh-vp-mission-btn" ${vpMission ? "" : "disabled"}>
              ${icon("radar")} Refresh Mission
            </button>
            <button class="agent-ctrl-btn" id="open-media-output-btn">
              ${icon("video")} Open Media Review
            </button>
          </div>
          <div class="automation-status-card" style="margin-top:12px">
            ${vpMission ? `
              <div class="pulse-row"><i></i> ${escapeHtml(vpMission.status || "running")} · ${escapeHtml(vpMission.authorityModel || "governance-gated-autonomy")}</div>
              <div style="margin-top:8px;font-size:0.9em;display:grid;gap:4px">
                <div><strong>Mission ID:</strong> ${escapeHtml(vpMission.missionId || "")}</div>
                <div><strong>Evaluated:</strong> ${Number(vpMission.evaluatedCount || vpMission.targetCount || 0)} &nbsp; <strong>Approved + Queued:</strong> ${Number(vpMission.approvedCount || 0)}</div>
                <div><strong>Held for Review:</strong> ${Number(vpMission.reviewCount || 0)} &nbsp; <strong>Blocked by Governance:</strong> ${Number(vpMission.blockedCount || 0)}</div>
                <div><strong>Published:</strong> ${Number(vpMission.publishedCount || 0)} <span style="opacity:0.7">(publish stays gated)</span></div>
              </div>
              ${Array.isArray(vpMission.decisions) && vpMission.decisions.length ? `
                <div style="margin-top:8px;font-size:0.85em;display:grid;gap:4px">
                  <div style="opacity:0.8;text-transform:uppercase;letter-spacing:0.04em">Top board decisions</div>
                  ${vpMission.decisions.slice(0, 3).map((d) => `
                    <div>${escapeHtml(d.productName || "Concept")} - board ${Number(d.boardScore || 0)}, ${escapeHtml(d.finalStatus === "approved_queued" ? "approved + queued" : d.finalStatus === "blocked" ? "blocked" : "needs review")}${d.decision && d.decision.routing ? " -> " + escapeHtml(d.decision.routing.primaryChannel || "") : ""}</div>
                  `).join("")}
                </div>
              ` : ""}
            ` : `
              <div class="pulse-row"><i></i> No active mission. Launch a VP mission to begin executive oversight.</div>
            `}
            ${state.vpMissionError ? `<div class="executive-gate-error" style="margin-top:10px">${escapeHtml(state.vpMissionError)}</div>` : ""}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("shield")} Board of Directors</h2>
              <p>Governance, approvals, and purpose checks for the executive workspace.</p>
            </div>
          </div>
          <div class="agent-status-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
            <article class="agent-status-card">
              <span>Approve</span>
              <strong>Media Quality Gate</strong>
              <p>Approve, reject, or reroute the latest media from the review workspace.</p>
            </article>
            <article class="agent-status-card">
              <span>Govern</span>
              <strong>API Access Lock</strong>
              <p>Keep API Management invisible until the executive admin code is accepted.</p>
            </article>
            <article class="agent-status-card">
              <span>Learn</span>
              <strong>Telemetry Loop</strong>
              <p>Feed analytics and render metrics back into future decisions.</p>
            </article>
            <article class="agent-status-card">
              <span>Direct</span>
              <strong>Board Oversight</strong>
              <p>Use weighted executive judgment, not duplicate buttons or redundant flows.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Executive Intelligence &amp; Telemetry</h2>
              <p>Board scoring, media feedback, and improvement loops for elite workflow control.</p>
            </div>
          </div>
          <div class="agent-status-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
            <article class="agent-status-card">
              <span>Signals</span>
              <strong>${Number(state.scanCount || 0).toLocaleString()} scans</strong>
              <p>Feeds viral intelligence and creative discovery.</p>
            </article>
            <article class="agent-status-card">
              <span>Output</span>
              <strong>${queuedRenders} queued</strong>
              <p>Tracks media waiting to render, review, or publish.</p>
            </article>
            <article class="agent-status-card">
              <span>Closeout</span>
              <strong>${state.systemHealth && (state.systemHealth.status || state.systemHealth.state) ? String(state.systemHealth.status || state.systemHealth.state) : "Monitoring"}</strong>
              <p>Monitors the service posture before executive approval.</p>
            </article>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Executive Actions</h2>
              <p>Trigger governed actions without duplicate or outdated controls.</p>
            </div>
          </div>
          <div class="agent-controls-grid">
            <button class="agent-ctrl-btn" id="agent-viral-scan-btn">
              ${icon("radar")} Run Viral Scan
            </button>
            <button class="agent-ctrl-btn" id="agent-reconstruct-btn">
              ${icon("spark")} Reconstruct Top Ad
            </button>
            <button class="agent-ctrl-btn primary ${state.autoGenerating ? "generating" : ""}" id="generate-today-btn" ${state.autoGenerating ? "disabled" : ""}>
              ${state.autoGenerating ? `${icon("radar")} Generating…` : `${icon("spark")} Generate Today's Ads`}
            </button>
            <button class="agent-ctrl-btn" id="agent-learning-loop-btn">
              ${icon("chart")} Run Learning Loop
            </button>
          </div>
          ${state.autoGenerateResult ? `
          <div class="auto-generate-banner" style="margin-top:12px">
            ${icon("check")} ${state.autoGenerateResult}
            <button class="toggle-link" id="dismiss-auto-generate">✕</button>
          </div>
          ` : ""}
          <div class="automation-status-card">
            <div class="pulse-row"><i></i> Daily loop active — next scan at 6:00 AM</div>
          </div>
        </div>
      </section>

      <section class="workspace-grid secondary" style="margin-top:16px">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("chart")} Profit &amp; Tier Intelligence</h2>
              <p>Run profit audit and product tier rankings on demand.</p>
            </div>
          </div>
          <div class="agent-controls-grid">
            <button class="agent-ctrl-btn ${state.profitAuditRunning ? "generating" : ""}" id="profit-audit-btn" ${state.profitAuditRunning ? "disabled" : ""}>
              ${state.profitAuditRunning ? `${icon("radar")} Auditing…` : `${icon("chart")} Run Profit Audit`}
            </button>
            <button class="agent-ctrl-btn ${state.productTiersLoading ? "generating" : ""}" id="product-tiers-btn" ${state.productTiersLoading ? "disabled" : ""}>
              ${state.productTiersLoading ? `${icon("radar")} Loading…` : `${icon("gear")} View Product Tiers`}
            </button>
          </div>
          ${pa ? `
          <div class="agent-result-card" style="margin-top:12px">
            <strong>Profit Audit</strong> — ${pa.audited} products audited
            <div style="margin-top:6px;font-size:0.85em;opacity:0.8">${pa.results.slice(0,3).map((r) => `<div>${r.name}: WPS ${r.weightedScore} · ${r.budgetAction}</div>`).join("")}</div>
          </div>
          ` : ""}
          ${pt ? `
          <div class="agent-result-card" style="margin-top:12px">
            <strong>Product Tiers</strong> — ${pt.total} products ranked
            <div style="margin-top:6px;display:flex;gap:12px;font-size:0.85em">
              <span class="tier-badge tier1">T1: ${pt.summary.tier1}</span>
              <span class="tier-badge tier2">T2: ${pt.summary.tier2}</span>
              <span class="tier-badge tier3">T3: ${pt.summary.tier3}</span>
              <span class="tier-badge tier4">T4: ${pt.summary.tier4}</span>
            </div>
          </div>
          ` : ""}
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("send")} Capital &amp; Library</h2>
              <p>80/20 budget allocation and creative library steward.</p>
            </div>
          </div>
          <div class="agent-controls-grid">
            <button class="agent-ctrl-btn ${state.budgetAllocRunning ? "generating" : ""}" id="allocate-budget-btn" ${state.budgetAllocRunning ? "disabled" : ""}>
              ${state.budgetAllocRunning ? `${icon("radar")} Allocating…` : `${icon("chart")} Allocate Budget`}
            </button>
            <button class="agent-ctrl-btn ${state.libraryCleanupRunning ? "generating" : ""}" id="library-cleanup-btn" ${state.libraryCleanupRunning ? "disabled" : ""}>
              ${state.libraryCleanupRunning ? `${icon("radar")} Cleaning…` : `${icon("gear")} Library Cleanup`}
            </button>
          </div>
          ${ba ? `
          <div class="agent-result-card" style="margin-top:12px">
            <strong>Budget Allocation</strong> — $${ba.totalBudget.toLocaleString()} total
            <div style="margin-top:4px;font-size:0.85em;opacity:0.8">
              <div>Top 30: <b>$${ba.top30Allocation.toFixed(2)}</b> (${ba.top30Count} ads)</div>
              <div>Promo Pool: <b>$${ba.promotionPoolAllocation.toFixed(2)}</b> (${ba.promotionCount} ads)</div>
            </div>
          </div>
          ` : ""}
          ${lc ? `
          <div class="agent-result-card" style="margin-top:12px">
            <strong>Library Cleanup</strong>
            <div style="margin-top:4px;font-size:0.85em;opacity:0.8">
              Scanned ${lc.totalScanned} · Archived ${lc.archived} · ${lc.candidatesForArchive} candidates
            </div>
          </div>
          ` : ""}
        </div>
      </section>

      <section class="workspace-grid secondary executive-gate-section" style="margin-top:16px">
        <div class="panel executive-gate-panel">
          <div class="panel-head">
            <div>
              <h2>${icon("shield")} API Management Access</h2>
              <p>Admin code entry is required before API Management becomes visible in this workspace.</p>
            </div>
          </div>
          ${state.adminAccessGranted ? `
            <div class="executive-gate-unlocked">
              <div class="executive-gate-status">${icon("check")} Admin access granted</div>
              <p>API Management is now unlocked for this Executive workspace session.</p>
              <button class="toggle-link" id="lock-admin-access-btn">Lock access</button>
            </div>
            <div class="executive-api-wrapper">
              ${renderApiManagementSummary()}
            </div>
          ` : `
            <div class="executive-gate-form">
              <label for="executive-admin-code">Admin access code</label>
              <div class="executive-gate-input-row">
                <input
                  id="executive-admin-code"
                  type="password"
                  autocomplete="off"
                  placeholder="Enter admin access code"
                  value="${state.adminAccessCodeInput.replace(/"/g, "&quot;")}"
                />
                <button class="primary" id="unlock-admin-access-btn">Unlock API Management</button>
              </div>
              ${state.adminAccessError ? `<p class="executive-gate-error">${state.adminAccessError}</p>` : `<p class="executive-gate-hint">API Management stays hidden everywhere else until the code is accepted.</p>`}
            </div>
          `}
        </div>
      </section>

      <section class="workspace-grid secondary" style="margin-top:16px">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>${icon("film")} Media Review Workspace</h2>
              <p>Open the live review surface for every rendered media item, with preview, QA, approval, and rerender controls.</p>
            </div>
          </div>
          ${mediaSurface}
        </div>
      </section>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// API MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════

const CATEGORY_LABELS = {
  video:     "Video Rendering",
  image:     "Image Generation",
  social:    "Social Publishing",
  ai:        "AI / LLM",
  analytics: "Analytics"
};

const CATEGORY_ICONS = {
  video:     "video",
  image:     "spark",
  social:    "send",
  ai:        "gear",
  analytics: "chart"
};

function serviceStatusBadge(status) {
  const map = {
    healthy:  { cls: "svc-status-healthy",   label: "Healthy" },
    warning:  { cls: "svc-status-warning",   label: "Warning" },
    critical: { cls: "svc-status-critical",  label: "Critical" },
    disabled: { cls: "svc-status-disabled",  label: "Disabled" },
    "no-key": { cls: "svc-status-nokey",     label: "No API Key" }
  };
  const s = map[status] || { cls: "", label: status };
  return `<span class="svc-status-badge ${s.cls}">${s.label}</span>`;
}

function tokenBar(pct, status) {
  const cls = status === "critical" ? "token-bar-critical"
    : status === "warning" ? "token-bar-warning"
    : "token-bar-healthy";
  return `<div class="token-bar-track"><div class="token-bar-fill ${cls}" style="width:${Math.min(100, pct)}%"></div></div>`;
}

function renderApiManagement() {
  const services = state.servicesConfig;
  const categories = Object.keys(CATEGORY_LABELS);
  const unread = state.alerts.filter((a) => !a.acknowledged).length;
  const selectedSvc = services.find((s) => s.id === state.selectedServiceId) || null;
  const sectionContent = (() => {
    if (state.currentSection === "ai-reconstruction") return renderAiReconstruction();
    if (state.currentSection === "video-generation") return renderVideoGeneration();
    if (state.currentSection === "distribution") return renderDistribution();
    if (state.currentSection === "analytics") return renderAnalytics();
    if (state.currentSection === "executive-workspace") return renderExecutiveWorkspace();
    return renderViralIntelligence();
  })();

  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>${icon("shield")} API Management</h2>
        <p>Configure all external APIs, track token usage in real-time, manage auto-failover, and receive low-credit alerts.</p>
      </div>

      <!-- Summary metrics -->
      <section class="metrics-grid">
        <article class="metric">
          <span>Total APIs</span>
          <strong>${services.length || 14}</strong>
          <small>${services.filter((s) => s.enabled).length || 14} enabled</small>
        </article>
        <article class="metric">
          <span>APIs with Keys</span>
          <strong>${services.filter((s) => s.hasKey).length}</strong>
          <small>${services.filter((s) => !s.hasKey && s.enabled).length} missing keys</small>
        </article>
        <article class="metric ${unread > 0 ? "metric-alert" : ""}">
          <span>${icon("bell")} Alerts</span>
          <strong>${unread}</strong>
          <small>${unread > 0 ? "action required" : "all clear"}</small>
        </article>
        <article class="metric">
          <span>Auto-Failover</span>
          <strong>${state.failoverMode ? "ON" : "OFF"}</strong>
          <small>${state.failoverMode ? "active protection" : "manual mode"}</small>
        </article>
      </section>

      <!-- Tab navigation -->
      <div class="api-mgmt-tabs">
        ${[
          { id: "overview",  label: `${icon("chart")} Overview` },
          { id: "config",    label: `${icon("key")} API Keys & Config` },
          { id: "failover",  label: `${icon("swap")} Failover` },
          { id: "alerts",    label: `${icon("bell")} Alerts${unread > 0 ? ` <span class="alert-badge">${unread}</span>` : ""}` }
        ].map((t) => `
          <button class="api-tab-btn ${state.apiMgmtTab === t.id ? "api-tab-active" : ""}" data-api-tab="${t.id}">
            ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- ── TAB: OVERVIEW ── -->
      ${state.apiMgmtTab === "overview" ? `
      <div class="api-overview">
        ${state.servicesLoading ? `<div class="api-loading">${icon("radar")} Loading service data…</div>` : ""}
        ${categories.map((cat) => {
          const catServices = services.filter((s) => s.category === cat);
          if (!catServices.length) return "";
          return `
            <div class="api-category-block">
              <div class="api-category-header">
                ${icon(CATEGORY_ICONS[cat])}
                <h3>${CATEGORY_LABELS[cat]}</h3>
                <span>${catServices.length} service${catServices.length !== 1 ? "s" : ""}</span>
              </div>
              <div class="api-service-grid">
                ${catServices.map((svc) => `
                  <div class="api-service-card ${svc.id === state.selectedServiceId ? "api-service-selected" : ""} api-service-${svc.status}" data-select-service="${svc.id}">
                    <div class="api-service-card-head">
                      <div class="api-service-name-row">
                        <strong>${svc.name}</strong>
                        ${svc.isPrimary ? `<span class="svc-primary-badge">Primary</span>` : `<span class="svc-backup-badge">Backup</span>`}
                      </div>
                      ${serviceStatusBadge(svc.status)}
                    </div>

                    <!-- Token usage bar -->
                    ${svc.limit !== null ? `
                    <div class="api-token-section">
                      <div class="api-token-row">
                        <span>${svc.used.toLocaleString()} / ${svc.limit.toLocaleString()} ${svc.unit}</span>
                        <span>${svc.pct}%</span>
                      </div>
                      ${tokenBar(svc.pct, svc.status)}
                      <div class="api-token-meta">
                        <span>Remaining: <b>${(svc.remaining || 0).toLocaleString()}</b></span>
                        <span>Resets in <b>${svc.daysUntilReset}d</b></span>
                        <span>Est. cost: <b>${svc.estimatedCost}</b></span>
                      </div>
                    </div>
                    ` : `
                    <div class="api-token-section">
                      <div class="api-token-row"><span>Unlimited / pay-as-you-go</span><span>${svc.used.toLocaleString()} ${svc.unit} used</span></div>
                      <div class="api-token-meta"><span>Est. cost: <b>${svc.estimatedCost}</b></span></div>
                    </div>
                    `}

                    <div class="api-service-card-footer">
                      <span class="api-plan-tag">${svc.plan.toUpperCase()}</span>
                      <span class="api-key-tag ${svc.hasKey ? "api-key-set" : "api-key-missing"}">${svc.hasKey ? "✓ Key set" : "⚠ No key"}</span>
                      <div class="api-card-actions">
                        <button class="api-card-btn" data-select-service="${svc.id}" data-open-config="true">Configure</button>
                        ${svc.limit !== null ? `<button class="api-card-btn api-card-btn-credits" data-add-credits="${svc.id}">+ Credits</button>` : ""}
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }).join("")}

        ${services.length === 0 ? `
        <div class="api-empty-state">
          <div class="api-empty-icon">${icon("shield")}</div>
          <p>Loading API configurations…</p>
          <button class="ghost" id="load-services-btn">${icon("radar")} Load Services</button>
        </div>
        ` : ""}
      </div>
      ` : ""}

      <!-- ── TAB: CONFIG ── -->
      ${state.apiMgmtTab === "config" ? `
      <div class="api-config-layout">
        <!-- Service list sidebar -->
        <div class="api-config-sidebar">
          <div class="api-config-sidebar-head">
            <h3>Services</h3>
          </div>
          ${categories.map((cat) => {
            const catServices = services.filter((s) => s.category === cat);
            if (!catServices.length) return "";
            return `
              <div class="api-config-group">
                <div class="api-config-group-label">${CATEGORY_LABELS[cat]}</div>
                ${catServices.map((svc) => `
                  <button class="api-config-list-item ${svc.id === state.selectedServiceId ? "api-config-list-active" : ""}" data-select-service="${svc.id}" data-open-config="true">
                    <span class="api-config-list-dot api-dot-${svc.status}"></span>
                    <span class="api-config-list-name">${svc.name}</span>
                    ${svc.isPrimary ? `<span class="svc-primary-badge-sm">P</span>` : ""}
                  </button>
                `).join("")}
              </div>
            `;
          }).join("")}
        </div>

        <!-- Config detail panel -->
        <div class="api-config-detail">
          ${selectedSvc ? `
          <div class="api-config-form">
            <div class="api-config-form-head">
              <div>
                <h3>${selectedSvc.name}</h3>
                <p>${CATEGORY_LABELS[selectedSvc.category]} · ${selectedSvc.isPrimary ? "Primary service" : "Backup service"}</p>
              </div>
              ${serviceStatusBadge(selectedSvc.status)}
            </div>

            <!-- Enable/Disable toggle -->
            <div class="api-config-row">
              <label class="api-config-label">Service Status</label>
              <div class="api-toggle-row">
                <label class="api-toggle">
                  <input type="checkbox" class="api-toggle-input" id="svc-enabled-toggle" ${selectedSvc.enabled ? "checked" : ""} />
                  <span class="api-toggle-slider"></span>
                </label>
                <span>${selectedSvc.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>

            <!-- Primary toggle -->
            <div class="api-config-row">
              <label class="api-config-label">Set as Primary</label>
              <div class="api-toggle-row">
                <label class="api-toggle">
                  <input type="checkbox" class="api-toggle-input" id="svc-primary-toggle" ${selectedSvc.isPrimary ? "checked" : ""} />
                  <span class="api-toggle-slider"></span>
                </label>
                <span>${selectedSvc.isPrimary ? "Primary service" : "Backup service"}</span>
              </div>
            </div>

            <!-- Plan selector -->
            <div class="api-config-row">
              <label class="api-config-label">Plan Tier</label>
              <select id="svc-plan-select" class="api-config-select">
                ${Object.keys(selectedSvc.plans).map((p) => `
                  <option value="${p}" ${selectedSvc.plan === p ? "selected" : ""}>${p.charAt(0).toUpperCase() + p.slice(1)} — ${selectedSvc.plans[p].limit === null || selectedSvc.plans[p].limit === Infinity ? "Unlimited" : selectedSvc.plans[p].limit.toLocaleString()} ${selectedSvc.plans[p].unit} @ ${selectedSvc.plans[p].costPerUnit}/${selectedSvc.plans[p].unit.split("/")[0]}</option>
                `).join("")}
              </select>
            </div>

            <!-- API Key input -->
            <div class="api-config-row">
              <label class="api-config-label">${icon("key")} API Key</label>
              <div class="api-key-input-row">
                <input
                  type="${state.serviceApiKeyVisible ? "text" : "password"}"
                  id="svc-api-key-input"
                  class="api-key-input"
                  placeholder="${selectedSvc.hasKey ? "••••••••••••••••••••••••••••••••" : "Paste your API key here…"}"
                  value="${state.serviceApiKeyInput.replace(/"/g, "&quot;")}"
                />
                <button class="api-key-toggle-btn" id="toggle-key-visibility">
                  ${state.serviceApiKeyVisible ? "Hide" : "Show"}
                </button>
              </div>
              <small class="api-key-hint">
                ${selectedSvc.hasKey
                  ? `✓ Key is configured (env: ${selectedSvc.id.toUpperCase().replace(/-/g, "_")}_API_KEY). Paste a new key to update.`
                  : `⚠ No key set. Add your key to .env as ${selectedSvc.id.toUpperCase().replace(/-/g, "_")}_API_KEY or paste it here.`
                }
              </small>
            </div>

            <!-- Token usage -->
            ${selectedSvc.limit !== null ? `
            <div class="api-config-row">
              <label class="api-config-label">Token Usage</label>
              <div class="api-token-detail">
                <div class="api-token-stats-grid">
                  <div><span>Used</span><strong>${selectedSvc.used.toLocaleString()}</strong></div>
                  <div><span>Limit</span><strong>${selectedSvc.limit.toLocaleString()}</strong></div>
                  <div><span>Remaining</span><strong>${(selectedSvc.remaining || 0).toLocaleString()}</strong></div>
                  <div><span>Usage</span><strong>${selectedSvc.pct}%</strong></div>
                  <div><span>Est. Cost</span><strong>${selectedSvc.estimatedCost}</strong></div>
                  <div><span>Resets In</span><strong>${selectedSvc.daysUntilReset}d</strong></div>
                </div>
                ${tokenBar(selectedSvc.pct, selectedSvc.status)}
                <div class="api-add-credits-row">
                  <input type="number" id="credits-amount-input" class="api-credits-input" value="${state.addCreditsAmount}" min="1" max="100000" />
                  <button class="api-credits-btn" id="add-credits-btn" data-service-id="${selectedSvc.id}">
                    + Add ${state.addCreditsAmount} ${selectedSvc.unit}
                  </button>
                </div>
              </div>
            </div>
            ` : `
            <div class="api-config-row">
              <label class="api-config-label">Token Usage</label>
              <div class="api-token-detail">
                <p>Pay-as-you-go — ${selectedSvc.used.toLocaleString()} ${selectedSvc.unit} used · Est. cost: ${selectedSvc.estimatedCost}</p>
              </div>
            </div>
            `}

            <!-- Backup services -->
            <div class="api-config-row">
              <label class="api-config-label">Backup Services</label>
              <div class="api-backups-list">
                ${(selectedSvc.backups || []).map((bid, i) => {
                  const bsvc = services.find((s) => s.id === bid);
                  return bsvc ? `
                    <div class="api-backup-item">
                      <span class="api-backup-priority">#${i + 1}</span>
                      <span>${bsvc.name}</span>
                      ${serviceStatusBadge(bsvc.status)}
                      <button class="api-card-btn" data-failover-to="${bsvc.id}" data-failover-from="${selectedSvc.id}">Switch Now</button>
                    </div>
                  ` : "";
                }).join("")}
                ${!selectedSvc.backups || selectedSvc.backups.length === 0 ? `<p class="api-no-backups">No backup services configured.</p>` : ""}
              </div>
            </div>

            <!-- Save button -->
            <div class="api-config-actions">
              <button class="primary" id="save-service-config-btn" data-service-id="${selectedSvc.id}">
                ${icon("check")} Save Configuration
              </button>
              ${state.serviceActionStatus ? `
              <span class="api-action-feedback ${state.serviceActionStatus.type}">${state.serviceActionStatus.message}</span>
              ` : ""}
            </div>
          </div>
          ` : `
          <div class="api-config-empty">
            ${icon("key")}
            <p>Select a service from the list to configure its API key, plan, and settings.</p>
          </div>
          `}
        </div>
      </div>
      ` : ""}

      <!-- ── TAB: FAILOVER ── -->
      ${state.apiMgmtTab === "failover" ? `
      <div class="api-failover-section">
        <!-- Auto-failover master toggle -->
        <div class="panel api-failover-panel">
          <div class="panel-head">
            <div>
              <h2>${icon("swap")} Auto-Failover System</h2>
              <p>When a primary service runs low on tokens or fails, the system automatically switches to the next available backup.</p>
            </div>
            <div class="api-toggle-row">
              <label class="api-toggle api-toggle-lg">
                <input type="checkbox" class="api-toggle-input" id="auto-failover-toggle" ${state.failoverMode ? "checked" : ""} />
                <span class="api-toggle-slider"></span>
              </label>
              <strong>${state.failoverMode ? "Auto-Failover ON" : "Auto-Failover OFF"}</strong>
            </div>
          </div>

          <!-- Thresholds info -->
          <div class="api-threshold-grid">
            <div class="api-threshold-card api-threshold-warning">
              <strong>80% Usage</strong>
              <p>Warning notification sent. Consider adding credits or preparing backup.</p>
            </div>
            <div class="api-threshold-card api-threshold-critical">
              <strong>95% Usage</strong>
              <p>Critical alert. Auto-failover activates if enabled. Backup service takes over.</p>
            </div>
            <div class="api-threshold-card api-threshold-info">
              <strong>100% Usage</strong>
              <p>Service paused. All requests routed to backup until credits are added.</p>
            </div>
          </div>
        </div>

        <!-- Active service status per category -->
        <div class="panel">
          <div class="panel-head compact">
            <h2>Active Services by Category</h2>
            <button class="ghost" id="refresh-failover-btn">${icon("radar")} Refresh</button>
          </div>
          <div class="api-active-services-grid">
            ${Object.entries(state.failoverStatus).map(([cat, svc]) => `
              <div class="api-active-service-card">
                <div class="api-active-service-head">
                  ${icon(CATEGORY_ICONS[cat] || "gear")}
                  <span>${CATEGORY_LABELS[cat] || cat}</span>
                </div>
                <strong>${svc.name}</strong>
                ${serviceStatusBadge(svc.status)}
                ${svc.limit !== null ? `
                  ${tokenBar(svc.pct, svc.status)}
                  <small>${svc.pct}% used · ${svc.daysUntilReset}d until reset</small>
                ` : `<small>Unlimited / pay-as-you-go</small>`}
              </div>
            `).join("")}
            ${Object.keys(state.failoverStatus).length === 0 ? `
              <div class="api-empty-state">
                <p>Loading failover status…</p>
                <button class="ghost" id="refresh-failover-btn">${icon("radar")} Load Status</button>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Manual failover controls -->
        <div class="panel">
          <div class="panel-head compact">
            <h2>Manual Service Switch</h2>
          </div>
          <div class="api-manual-switch-grid">
            ${categories.map((cat) => {
              const catServices = services.filter((s) => s.category === cat);
              if (catServices.length < 2) return "";
              const primary = catServices.find((s) => s.isPrimary) || catServices[0];
              const backups = catServices.filter((s) => !s.isPrimary);
              return `
                <div class="api-manual-switch-card">
                  <div class="api-manual-switch-head">
                    ${icon(CATEGORY_ICONS[cat])}
                    <strong>${CATEGORY_LABELS[cat]}</strong>
                  </div>
                  <div class="api-manual-switch-body">
                    <div class="api-switch-from">
                      <span>From:</span>
                      <strong>${primary.name}</strong>
                      ${serviceStatusBadge(primary.status)}
                    </div>
                    <div class="api-switch-arrow">${icon("swap")}</div>
                    <div class="api-switch-to">
                      <span>To:</span>
                      <select class="api-config-select api-switch-select" data-switch-from="${primary.id}">
                        ${backups.map((b) => `<option value="${b.id}">${b.name} (${b.status})</option>`).join("")}
                      </select>
                    </div>
                  </div>
                  <button class="api-card-btn api-switch-btn" data-switch-from="${primary.id}">
                    ${icon("swap")} Switch Now
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Failover log -->
        ${state.failoverLog.length > 0 ? `
        <div class="panel">
          <div class="panel-head compact">
            <h2>Failover Log</h2>
            <span>${state.failoverLog.length} events</span>
          </div>
          <div class="api-failover-log">
            ${state.failoverLog.slice().reverse().map((entry) => `
              <div class="api-log-entry">
                <span class="api-log-time">${new Date(entry.timestamp).toLocaleString()}</span>
                <span class="api-log-event">
                  Switched from <strong>${entry.from}</strong> → <strong>${entry.to}</strong>
                </span>
                <span class="api-log-reason">${entry.reason}</span>
              </div>
            `).join("")}
          </div>
        </div>
        ` : ""}
      </div>
      ` : ""}

      ${sectionContent}

      <!-- ── Agent Orchestration Dashboard (global, always visible) ── -->
      ${renderAgentOrchestration()}

      <!-- ── Published Media Gallery (global, always visible) ── -->
      ${renderPublishedMediaGallery()}

      <!-- ── Analytics Dashboard (global, always visible) ── -->
      ${renderAnalyticsDashboard()}

      <!-- ── Elite Quality Rendering Standards (global, always visible) ── -->
      ${renderQualityValidator()}
    </main>
  `;

}

  window.__evicsRenderers = {
    renderViralIntelligence,
    renderAiReconstruction,
    renderVideoGeneration,
    renderMediaOutputCenter: () => (typeof window.renderMediaOutputCenter === "function" ? window.renderMediaOutputCenter() : renderMediaArea("media-output")),
    renderDistribution,
    renderAnalytics,
    renderExecutiveWorkspace,
    renderAgentOrchestration,
    renderPublishedMediaGallery,
    renderAnalyticsDashboard,
    renderQualityValidator,
    serviceStatusBadge,
    tokenBar
  };
  return "";
}

// ── Legacy Media Gallery helpers ──
// Retained only for backward compatibility while the newer media output center is the active surface.

function legacyMediaApprovalLabel(status) {
  const map = {
    approved: "Approved",
    rejected: "Rejected",
    discarded: "Discarded",
    requeued: "Re-queued",
    pending: "Pending",
    complete: "Complete"
  };
  return map[status] || status || "Pending";
}

function legacyFilteredMediaVideos() {
  if (state.mediaFilter === "all") return state.mediaVideos;
  return state.mediaVideos.filter((v) => (v.status || "pending") === state.mediaFilter);
}

function legacyFormatRelativeTime(isoString) {
  if (!isoString) return "Unknown";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function legacyBuildDemoMediaVideos() {
  return [
    {
      id: "mv-001",
      platform: "HeyGen",
      status: "pending",
      script: "Nobody talks about this morning habit. I started this ritual 30 days ago and everything changed.",
      parameters: JSON.stringify({ duration: "15s", style: "UGC", voice: "Female", aspect: "9:16" }),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      thumbnail: null
    },
    {
      id: "mv-002",
      platform: "Runway",
      status: "approved",
      script: "The glow routine that finally feels premium. Collagen, ceramides, and ritual in one.",
      parameters: JSON.stringify({ duration: "10s", style: "Luxury", voice: "Female", aspect: "9:16" }),
      created_at: new Date(Date.now() - 7200000).toISOString(),
      thumbnail: null
    },
    {
      id: "mv-003",
      platform: "Kling",
      status: "rejected",
      script: "I stopped treating my focus like a willpower problem. Turns out it was a nutrition gap.",
      parameters: JSON.stringify({ duration: "15s", style: "Founder", voice: "Male", aspect: "9:16" }),
      rejection_reason: "Hook lacks urgency. Needs stronger emotional trigger in first 3 seconds.",
      created_at: new Date(Date.now() - 10800000).toISOString(),
      thumbnail: null
    },
    {
      id: "mv-004",
      platform: "HeyGen",
      status: "pending",
      script: "Your training does not need more hype. It needs foundation. Build yours today.",
      parameters: JSON.stringify({ duration: "30s", style: "Commercial", voice: "Male", aspect: "16:9" }),
      created_at: new Date(Date.now() - 14400000).toISOString(),
      thumbnail: null
    },
    {
      id: "mv-005",
      platform: "Runway",
      status: "complete",
      script: "Wellness that looks as good as it feels. Genesis Wellness Bundle — your daily ritual.",
      parameters: JSON.stringify({ duration: "10s", style: "Luxury", voice: "Female", aspect: "1:1" }),
      video_url: null,
      created_at: new Date(Date.now() - 18000000).toISOString(),
      thumbnail: null
    },
    {
      id: "mv-006",
      platform: "HeyGen",
      status: "requeued",
      script: "What if your energy problem was never about sleep? It was about minerals.",
      parameters: JSON.stringify({ duration: "15s", style: "UGC", voice: "Female", aspect: "9:16" }),
      rejection_reason: "Visual pacing too slow. Needs faster cuts.",
      created_at: new Date(Date.now() - 21600000).toISOString(),
      thumbnail: null
    }
  ];
}

function buildDemoServices() {
  const planTemplates = {
    basic: { limit: 500000, unit: "tokens", costPerUnit: "$0.001" },
    pro: { limit: 2000000, unit: "tokens", costPerUnit: "$0.0008" },
    enterprise: { limit: null, unit: "requests", costPerUnit: "$0.0005" }
  };

  const services = [
    { id: "video-primary", name: "Titan Video Core", category: "video", isPrimary: true, enabled: true, hasKey: true, plan: "pro", used: 1480000, limit: 2000000, unit: "tokens", daysUntilReset: 9, estimatedCost: "$1,184", backups: ["video-backup"], status: "warning" },
    { id: "video-backup", name: "Runway Backup", category: "video", isPrimary: false, enabled: true, hasKey: true, plan: "basic", used: 122000, limit: 500000, unit: "tokens", daysUntilReset: 13, estimatedCost: "$122", backups: ["video-primary"], status: "healthy" },
    { id: "image-primary", name: "Image Forge", category: "image", isPrimary: true, enabled: true, hasKey: false, plan: "pro", used: 930000, limit: 1000000, unit: "tokens", daysUntilReset: 6, estimatedCost: "$744", backups: ["image-backup"], status: "no-key" },
    { id: "image-backup", name: "DALL·E Backup", category: "image", isPrimary: false, enabled: true, hasKey: true, plan: "basic", used: 166000, limit: 500000, unit: "tokens", daysUntilReset: 17, estimatedCost: "$133", backups: ["image-primary"], status: "healthy" },
    { id: "social-primary", name: "Social AutoPilot", category: "social", isPrimary: true, enabled: true, hasKey: true, plan: "enterprise", used: 8800, limit: null, unit: "requests", daysUntilReset: 30, estimatedCost: "$58", backups: ["social-backup"], status: "healthy" },
    { id: "social-backup", name: "Buffer Relay", category: "social", isPrimary: false, enabled: true, hasKey: true, plan: "basic", used: 214000, limit: 500000, unit: "tokens", daysUntilReset: 21, estimatedCost: "$171", backups: ["social-primary"], status: "healthy" },
    { id: "ai-primary", name: "LLM Command Core", category: "ai", isPrimary: true, enabled: true, hasKey: true, plan: "pro", used: 1960000, limit: 2000000, unit: "tokens", daysUntilReset: 4, estimatedCost: "$1,568", backups: ["ai-backup"], status: "critical" },
    { id: "ai-backup", name: "Claude Backup", category: "ai", isPrimary: false, enabled: true, hasKey: true, plan: "basic", used: 118000, limit: 500000, unit: "tokens", daysUntilReset: 14, estimatedCost: "$94", backups: ["ai-primary"], status: "healthy" },
    { id: "analytics-primary", name: "Metrics Core", category: "analytics", isPrimary: true, enabled: true, hasKey: true, plan: "enterprise", used: 4200, limit: null, unit: "requests", daysUntilReset: 30, estimatedCost: "$21", backups: ["analytics-backup"], status: "healthy" },
    { id: "analytics-backup", name: "Supabase Analytics", category: "analytics", isPrimary: false, enabled: true, hasKey: false, plan: "basic", used: 64000, limit: 500000, unit: "tokens", daysUntilReset: 19, estimatedCost: "$51", backups: ["analytics-primary"], status: "no-key" }
  ].map((svc) => {
    const pct = svc.limit ? Math.min(100, Math.round((svc.used / svc.limit) * 100)) : 0;
    const remaining = svc.limit ? Math.max(0, svc.limit - svc.used) : null;
    return {
      ...svc,
      pct,
      remaining,
      plans: planTemplates
    };
  });

  return services;
}

function buildDemoFailoverStatus(services = []) {
  const status = {};
  ["video", "image", "social", "ai", "analytics"].forEach((category) => {
    const categoryServices = services.filter((svc) => svc.category === category);
    const primary = categoryServices.find((svc) => svc.isPrimary) || categoryServices[0];
    if (!primary) return;
    status[category] = {
      name: primary.name,
      status: primary.status,
      limit: primary.limit,
      pct: primary.pct,
      daysUntilReset: primary.daysUntilReset
    };
  });
  return status;
}

async function loadServicesConfig() {
  state.servicesLoading = true;
  render();

  try {
    const res = await fetch("/api/services/config");
    if (!res.ok) throw new Error(`services/config returned ${res.status}`);
    const data = await res.json();
    const services = Array.isArray(data.services) && data.services.length > 0 ? data.services : buildDemoServices();
    state.servicesConfig = services;
    state.failoverMode = typeof data.autoFailover === "boolean" ? data.autoFailover : state.failoverMode;
    state.failoverLog = Array.isArray(data.failoverLog) ? data.failoverLog : state.failoverLog;
    state.failoverStatus = data.activeServices || data.failoverStatus || buildDemoFailoverStatus(state.servicesConfig);
    state.alerts = Array.isArray(data.alerts) ? data.alerts : state.alerts;
    state.alertsUnread = typeof data.alertsUnread === "number" ? data.alertsUnread : state.alerts.filter((a) => !a.acknowledged).length;
  } catch {
    state.servicesConfig = buildDemoServices();
    state.failoverStatus = buildDemoFailoverStatus(state.servicesConfig);
    state.failoverMode = true;
    state.alerts = [
      { id: "alert-001", type: "warning", title: "API usage approaching threshold", acknowledged: false },
      { id: "alert-002", type: "info", title: "Backup routes healthy", acknowledged: true }
    ];
    state.alertsUnread = state.alerts.filter((a) => !a.acknowledged).length;
  }

  if (!state.selectedServiceId && state.servicesConfig.length > 0) {
    state.selectedServiceId = state.servicesConfig[0].id;
  }

  state.servicesLoading = false;
  render();
}

async function legacyLoadMediaGallery() {
  state.mediaLoading = true;
  render();
  try {
    const [galleryRes, statsRes] = await Promise.all([
      fetch(`/api/media/gallery?status=${state.mediaFilter}&limit=50`),
      fetch("/api/media/stats")
    ]);
    if (!galleryRes.ok) {
      const reason = await readErrorMessage(galleryRes, `Media gallery failed (HTTP ${galleryRes.status}).`);
      throw new Error(reason);
    }
    if (!statsRes.ok) {
      const reason = await readErrorMessage(statsRes, `Media stats failed (HTTP ${statsRes.status}).`);
      throw new Error(reason);
    }
    const galleryData = await galleryRes.json();
    const statsData = await statsRes.json();
    if (!Array.isArray(galleryData.items)) {
      throw new Error("Media gallery payload missing items array.");
    }
    state.mediaVideos = galleryData.items;
    state.mediaStats = statsData.stats || statsData.summary || state.mediaStats;
    state.syncLevel = "connected";
  } catch (err) {
    state.mediaVideos = [];
    state.mediaStats = { total: 0, approved: 0, pending: 0, rerender: 0, discarded: 0 };
    state.syncLevel = "error";
    state.syncMessage = `Media gallery unavailable: ${getErrorMessage(err, "Unknown backend error.")}`;
  }
  state.mediaLoading = false;
  render();
}

function legacyRenderMediaStatusDashboard() {
  const s = state.mediaStats;
  if (!s) return "";
  return `
  <div class="media-status-dashboard">
    ${[
      ["Total", s.total || 0, ""],
      ["Pending", s.pending || 0, "pending"],
      ["Approved", s.approved || 0, "approved"],
      ["Rejected", s.rejected || 0, "rejected"],
      ["Discarded", s.discarded || 0, "discarded"],
      ["Re-queued", s.requeued || 0, "requeued"]
    ].map(([label, count, cls]) => `
      <div class="media-stat-pill ${cls ? "media-stat-" + cls : ""}">
        <strong>${count}</strong>
        <span>${label}</span>
      </div>
    `).join("")}
  </div>`;
}

function legacyRenderMediaCard(video) {
  const params = (() => { try { return JSON.parse(video.parameters || "{}"); } catch { return {}; } })();
  const isSelected = state.mediaSelectedIds.has(video.id);
  const statusCls = (video.status || "pending").toLowerCase();
  return `
  <div class="media-card ${isSelected ? "media-card-selected" : ""}" data-media-id="${video.id}">
    <div class="media-card-thumb">
      ${video.video_url
        ? `<video src="${video.video_url}" class="media-thumb-video" muted preload="none"></video>`
        : `<div class="media-thumb-placeholder"><span>${video.platform || "Video"}</span></div>`
      }
      <div class="media-card-overlay">
        <button class="media-review-btn" data-review-id="${video.id}">▶ Review</button>
      </div>
      <span class="media-status-badge media-status-${statusCls}">${legacyMediaApprovalLabel(video.status)}</span>
      <input type="checkbox" class="media-card-checkbox" data-media-checkbox="${video.id}" ${isSelected ? "checked" : ""} />
    </div>
    <div class="media-card-body">
      <div class="media-card-meta">
        <span class="media-platform-tag">${video.platform || "Unknown"}</span>
        <span class="media-time">${legacyFormatRelativeTime(video.created_at)}</span>
      </div>
      <p class="media-card-script">${(video.script || "").length > 80 ? video.script.slice(0, 80) + "…" : (video.script || "No script")}</p>
      <div class="media-card-params">
        ${params.duration ? `<span>${params.duration}</span>` : ""}
        ${params.style ? `<span>${params.style}</span>` : ""}
        ${params.aspect ? `<span>${params.aspect}</span>` : ""}
      </div>
      ${video.rejection_reason ? `<div class="media-rejection-note">⚠ ${video.rejection_reason}</div>` : ""}
    </div>
  </div>`;
}

function legacyRenderReviewPanel() {
  const v = state.mediaReviewVideo;
  if (!v) return "";
  const params = (() => { try { return JSON.parse(v.parameters || "{}"); } catch { return {}; } })();
  const statusCls = (v.status || "pending").toLowerCase();
  return `
  <div class="media-review-overlay" id="media-review-overlay">
    <div class="media-review-panel">
      <div class="media-review-header">
        <div>
          <h2>Review Video</h2>
          <span class="media-status-badge media-status-${statusCls}">${legacyMediaApprovalLabel(v.status)}</span>
        </div>
        <button class="toggle-link" id="close-review-panel">✕ Close</button>
      </div>

      <div class="media-review-body">
        <div class="media-video-container">
          ${v.video_url
            ? `<video src="${v.video_url}" controls class="media-review-video-player"></video>`
            : `<div class="media-video-placeholder"><span>${v.platform || "Video"}</span><small>No preview available</small></div>`
          }
        </div>

        <div class="media-review-details">
          <div class="media-metadata-grid">
            <div><dt>Platform</dt><dd>${v.platform || "Unknown"}</dd></div>
            <div><dt>Duration</dt><dd>${params.duration || "—"}</dd></div>
            <div><dt>Style</dt><dd>${params.style || "—"}</dd></div>
            <div><dt>Aspect</dt><dd>${params.aspect || "—"}</dd></div>
            <div><dt>Voice</dt><dd>${params.voice || "—"}</dd></div>
            <div><dt>Created</dt><dd>${legacyFormatRelativeTime(v.created_at)}</dd></div>
          </div>

          <div class="media-script-block">
            <strong>Script</strong>
            <p>${v.script || "No script available."}</p>
          </div>

          ${state.mediaAiSuggestions.length > 0 ? `
          <div class="media-ai-suggestions-panel">
            <strong>${icon("spark")} AI Improvement Suggestions</strong>
            <ul>${state.mediaAiSuggestions.map((s) => `<li>${s}</li>`).join("")}</ul>
          </div>
          ` : ""}

          <div class="media-rejection-input">
            <label for="media-rejection-reason">Rejection reason / improvement notes</label>
            <textarea id="media-rejection-reason" class="media-rejection-textarea" rows="3" placeholder="Describe what needs to change for re-render…">${state.mediaRejectionReason}</textarea>
          </div>

          <div class="media-review-actions">
            <button class="media-review-action-btn media-approve-btn" id="review-approve-btn" ${state.mediaActionLoading ? "disabled" : ""}>
              ✓ Approve
            </button>
            <button class="media-review-action-btn media-reject-btn" id="review-reject-btn" ${state.mediaActionLoading ? "disabled" : ""}>
              ✕ Reject
            </button>
            <button class="media-review-action-btn media-requeue-btn" id="review-requeue-btn" ${state.mediaActionLoading ? "disabled" : ""}>
              ${icon("radar")} Re-queue with AI
            </button>
            <button class="media-review-action-btn media-discard-btn" id="review-discard-btn" ${state.mediaActionLoading ? "disabled" : ""}>
              🗑 Discard
            </button>
          </div>
          ${state.mediaActionLoading ? `<div class="media-action-loading">Processing…</div>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}

function legacyRenderMediaGallery() {
  const filtered = legacyFilteredMediaVideos();
  const filterTabs = ["all", "pending", "approved", "rejected", "discarded", "requeued", "complete"];
  const hasSelection = state.mediaSelectedIds.size > 0;

  return `
  <section class="media-gallery-section panel">
    <div class="panel-head">
      <div>
        <h2>${icon("video")} Media Review &amp; Approval Workspace</h2>
        <p>Review, approve, reject, and requeue all generated videos. AI-powered re-render loop for rejected content.</p>
      </div>
      <div class="media-gallery-controls">
        ${hasSelection ? `
          <span class="media-selection-count">${state.mediaSelectedIds.size} selected</span>
          <button class="ghost" id="bulk-approve-btn">✓ Approve All</button>
          <button class="ghost" id="bulk-discard-btn">🗑 Discard All</button>
          <button class="toggle-link" id="clear-media-selection">Clear</button>
        ` : ""}
        <button class="ghost" id="refresh-media-btn">${icon("radar")} Refresh</button>
        <button class="toggle-link" id="toggle-media-gallery">${state.mediaGalleryOpen ? "▲ Collapse" : "▼ Expand"}</button>
      </div>
    </div>

    ${state.mediaGalleryOpen ? `
    <div class="media-gallery-body">
      ${legacyRenderMediaStatusDashboard()}

      <div class="media-filter-tabs">
        ${filterTabs.map((tab) => `
          <button class="media-filter-tab ${state.mediaFilter === tab ? "active" : ""}" data-media-filter="${tab}">
            ${tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        `).join("")}
      </div>

      ${state.mediaLoading ? `
        <div class="media-loading">Loading videos…</div>
      ` : filtered.length === 0 ? `
        <div class="empty">No videos found for this filter. Generate some ads to get started.</div>
      ` : `
        <div class="media-grid">
          ${filtered.map(legacyRenderMediaCard).join("")}
        </div>
      `}

      ${state.mediaRenderQueue.length > 0 ? `
      <div class="media-render-queue-bar">
        ${icon("radar")} ${state.mediaRenderQueue.length} video${state.mediaRenderQueue.length > 1 ? "s" : ""} in render queue
        <span class="media-queue-items">${state.mediaRenderQueue.map((q) => q.platform || "Video").join(", ")}</span>
      </div>
      ` : ""}
    </div>
    ` : ""}
  </section>

  ${state.mediaReviewOpen ? legacyRenderReviewPanel() : ""}`;
}

function generateAiSuggestions(video) {
  const script = (video.script || "").toLowerCase();
  const reason = (video.rejection_reason || "").toLowerCase();
  const suggestions = [];

  if (reason.includes("hook") || reason.includes("urgency") || reason.includes("opening")) {
    suggestions.push("Rewrite the opening 3 seconds with a stronger curiosity or problem-led hook.");
    suggestions.push("Add a pattern interrupt in the first frame — unexpected visual or bold statement.");
  }
  if (reason.includes("pacing") || reason.includes("slow") || reason.includes("cuts")) {
    suggestions.push("Increase cut frequency — aim for a new visual every 1.5–2 seconds in the first 5 seconds.");
    suggestions.push("Add dynamic text overlays to maintain visual momentum.");
  }
  if (reason.includes("cta") || reason.includes("call to action")) {
    suggestions.push("Strengthen the CTA with urgency language: 'Today only', 'Limited stock', or 'Start now'.");
  }
  if (script.includes("collagen") || script.includes("glow") || script.includes("skin")) {
    suggestions.push("Lead with a before/after visual contrast to anchor the transformation promise.");
  }
  if (script.includes("focus") || script.includes("energy") || script.includes("nootropic")) {
    suggestions.push("Open with a relatable productivity pain point before introducing the solution.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Tighten the hook — first 3 seconds should create immediate curiosity or tension.");
    suggestions.push("Ensure product is visible within the first 5 seconds.");
    suggestions.push("Add social proof element: testimonial quote, view count, or star rating overlay.");
  }
  return suggestions.slice(0, 4);
}

function renderConnectSourcesModal() {
  if (!state.connectSourcesOpen) return "";
  const f = state.connectSourcesFields;
  return `
  <div class="modal-overlay" id="connect-sources-overlay">
    <div class="modal-box">
      <div class="modal-head">
        <h2>${icon("key")} Connect Data Sources</h2>
        <button class="modal-close" id="connect-sources-close">✕</button>
      </div>
      <p class="modal-desc">Enter your credentials to switch the dashboard from Demo mode to live data. Saved to browser storage — never sent anywhere except your own APIs.</p>

      <div class="modal-field-group">
        <label class="modal-label">Supabase Project URL</label>
        <input class="modal-input" id="cs-supabase-url" type="url" placeholder="https://xxxx.supabase.co" value="${f.supabaseUrl}" />
        <label class="modal-label">Supabase Anon Key</label>
        <input class="modal-input" id="cs-supabase-key" type="password" placeholder="eyJhbGc…" value="${f.supabaseAnonKey}" />
      </div>

      <div class="modal-field-group">
        <label class="modal-label">Shopify Store Domain</label>
        <input class="modal-input" id="cs-shopify-domain" type="text" placeholder="iamgenesistech.myshopify.com" value="${f.shopifyDomain}" />
        <label class="modal-label">Shopify Admin Access Token</label>
        <input class="modal-input" id="cs-shopify-token" type="password" placeholder="shpat_…" value="${f.shopifyToken}" />
      </div>

      ${state.connectSourcesError ? `<div class="modal-error">${state.connectSourcesError}</div>` : ""}
      ${state.connectSourcesSaved ? `<div class="modal-success">✓ Credentials saved. Reloading live data…</div>` : ""}

      <div class="modal-actions">
        <button class="ghost" id="connect-sources-cancel">Cancel</button>
        <button class="primary ${state.connectSourcesSaving ? "generating" : ""}" id="connect-sources-save" ${state.connectSourcesSaving ? "disabled" : ""}>
          ${state.connectSourcesSaving ? `${icon("radar")} Saving…` : `${icon("key")} Save &amp; Connect`}
        </button>
      </div>
    </div>
  </div>`;
}

let vpSpeechRecognition = null;
let vpSpeechPending = "";
let vpAssistantDrag = null;
let vpAssistantDragListenersBound = false;

function setVpAssistantOpen(isOpen) {
  state.vpAssistantOpen = Boolean(isOpen);
  try { localStorage.setItem("evics_vp_assistant_open", state.vpAssistantOpen ? "true" : "false"); } catch (e) { /* ignore */ }
}

function setVpAssistantCollapsed(isCollapsed) {
  state.vpAssistantCollapsed = Boolean(isCollapsed);
  try { localStorage.setItem("evics_vp_assistant_collapsed", state.vpAssistantCollapsed ? "true" : "false"); } catch (e) { /* ignore */ }
}

function clampVpAssistantOffset(offsetX, offsetY) {
  const viewportWidth = Math.max(window.innerWidth || 0, 320);
  const viewportHeight = Math.max(window.innerHeight || 0, 320);
  const shell = document.getElementById("vp-assistant-shell");
  const fallbackWidth = state.vpAssistantCollapsed ? 320 : 420;
  const fallbackHeight = state.vpAssistantCollapsed ? 86 : 620;
  const shellWidth = shell ? shell.offsetWidth : fallbackWidth;
  const shellHeight = shell ? shell.offsetHeight : fallbackHeight;
  const baseLeft = viewportWidth - 18 - shellWidth;
  const baseTop = viewportHeight - 18 - shellHeight;
  const xMin = 8 - baseLeft;
  const xMax = viewportWidth - shellWidth - 8 - baseLeft;
  const yMin = 8 - baseTop;
  const yMax = viewportHeight - shellHeight - 8 - baseTop;
  const minX = Math.min(xMin, xMax);
  const maxX = Math.max(xMin, xMax);
  const minY = Math.min(yMin, yMax);
  const maxY = Math.max(yMin, yMax);
  const nextX = Number.isFinite(offsetX) ? offsetX : 0;
  const nextY = Number.isFinite(offsetY) ? offsetY : 0;
  return {
    x: Math.min(Math.max(nextX, minX), maxX),
    y: Math.min(Math.max(nextY, minY), maxY)
  };
}

function applyVpAssistantOffsetStyles() {
  const shell = document.getElementById("vp-assistant-shell");
  if (!shell) return;
  shell.style.setProperty("--vp-assistant-offset-x", `${state.vpAssistantOffsetX || 0}px`);
  shell.style.setProperty("--vp-assistant-offset-y", `${state.vpAssistantOffsetY || 0}px`);
}

function setVpAssistantOffset(offsetX, offsetY, options = {}) {
  const clamped = clampVpAssistantOffset(Number(offsetX), Number(offsetY));
  state.vpAssistantOffsetX = clamped.x;
  state.vpAssistantOffsetY = clamped.y;
  applyVpAssistantOffsetStyles();
  if (options.persist === false) return;
  try {
    localStorage.setItem("evics_vp_assistant_offset_x", String(state.vpAssistantOffsetX));
    localStorage.setItem("evics_vp_assistant_offset_y", String(state.vpAssistantOffsetY));
  } catch (e) {
    /* ignore */
  }
}

function bindVpAssistantDrag() {
  const shell = document.getElementById("vp-assistant-shell");
  const header = document.getElementById("vp-assistant-header");
  if (!shell || !header) return;
  setVpAssistantOffset(state.vpAssistantOffsetX, state.vpAssistantOffsetY, { persist: false });
  if (header.dataset.vpDragBound === "true") return;
  header.dataset.vpDragBound = "true";

  header.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const interactiveTarget = event.target.closest("button, input, textarea, select, label, a");
    if (interactiveTarget) return;
    event.preventDefault();
    vpAssistantDrag = {
      startX: event.clientX,
      startY: event.clientY,
      originX: state.vpAssistantOffsetX || 0,
      originY: state.vpAssistantOffsetY || 0
    };
    shell.classList.add("dragging");
  });

  if (!vpAssistantDragListenersBound) {
    document.addEventListener("mousemove", (event) => {
      if (!vpAssistantDrag) return;
      const nextX = vpAssistantDrag.originX + (event.clientX - vpAssistantDrag.startX);
      const nextY = vpAssistantDrag.originY + (event.clientY - vpAssistantDrag.startY);
      setVpAssistantOffset(nextX, nextY, { persist: false });
    });

    document.addEventListener("mouseup", () => {
      if (!vpAssistantDrag) return;
      vpAssistantDrag = null;
      const activeShell = document.getElementById("vp-assistant-shell");
      if (activeShell) {
        activeShell.classList.remove("dragging");
      }
      setVpAssistantOffset(state.vpAssistantOffsetX, state.vpAssistantOffsetY);
    });

    window.addEventListener("resize", () => {
      if (!state.vpAssistantOpen) return;
      setVpAssistantOffset(state.vpAssistantOffsetX, state.vpAssistantOffsetY, { persist: false });
    });
    vpAssistantDragListenersBound = true;
  }
}

function pushVpMessage(role, text, extras = {}) {
  if (!text) return null;
  const message = {
    role,
    text: String(text),
    createdAt: new Date().toISOString(),
    ...extras
  };
  state.vpAssistantMessages.push(message);
  state.vpAssistantMessages = state.vpAssistantMessages.slice(-24);
  return message;
}

function speakVpReply(text) {
  if (!state.vpAssistantSpeaking || !window.speechSynthesis || !text) return;
  const utterance = new SpeechSynthesisUtterance(String(text));
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function stopVpListening() {
  if (vpSpeechRecognition) {
    vpSpeechRecognition.stop();
  }
  state.vpAssistantListening = false;
}

function getVpSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  if (!vpSpeechRecognition) {
    vpSpeechRecognition = new SpeechRecognition();
    vpSpeechRecognition.lang = "en-US";
    vpSpeechRecognition.interimResults = true;
    vpSpeechRecognition.continuous = false;
    vpSpeechRecognition.onstart = () => {
      state.vpAssistantListening = true;
      state.vpAssistantError = null;
      render();
    };
    vpSpeechRecognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const part = event.results[i][0] && event.results[i][0].transcript ? event.results[i][0].transcript : "";
        transcript += part;
        if (event.results[i].isFinal) {
          finalTranscript += part;
        }
      }
      state.vpAssistantInput = transcript.trim();
      if (finalTranscript.trim()) {
        vpSpeechPending = finalTranscript.trim();
      }
      render();
    };
    vpSpeechRecognition.onerror = (event) => {
      state.vpAssistantListening = false;
      state.vpAssistantError = event.error === "not-allowed"
        ? "Microphone permission was denied."
        : `Voice input error: ${event.error || "unknown error"}`;
      render();
    };
    vpSpeechRecognition.onend = () => {
      state.vpAssistantListening = false;
      render();
      if (vpSpeechPending.trim()) {
        const message = vpSpeechPending.trim();
        vpSpeechPending = "";
        void sendVpAssistantMessage(message, { source: "voice" });
      }
    };
  }
  return vpSpeechRecognition;
}

function renderVpAssistant() {
  const mission = state.vpMission;
  const messages = Array.isArray(state.vpAssistantMessages) ? state.vpAssistantMessages : [];
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const voiceSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const launcherOnly = !state.vpAssistantOpen;
  const statusText = state.vpAssistantListening
    ? "Listening"
    : state.vpAssistantSending
      ? "Thinking"
      : state.vpAssistantStatus || "Ready";
  const shellStyle = [
    `--vp-assistant-offset-x:${Number(state.vpAssistantOffsetX || 0)}px`,
    `--vp-assistant-offset-y:${Number(state.vpAssistantOffsetY || 0)}px`
  ];
  if (launcherOnly) shellStyle.push("display:none");

  return `
    <div class="vp-assistant-launcher" ${launcherOnly ? "" : 'style="display:none"'}>
      <button class="vp-launcher-btn" id="vp-assistant-open-btn" aria-label="Open floating VP assistant">
        ${icon("spark")} VP AI
      </button>
    </div>
    <section class="vp-assistant-shell ${state.vpAssistantCollapsed ? "collapsed" : ""}" id="vp-assistant-shell" style="${shellStyle.join(";")}" aria-label="Floating VP AI terminal">
      <header class="vp-assistant-header" id="vp-assistant-header">
        <div class="vp-assistant-title">
          <span class="vp-assistant-badge">${icon("crown")} VP AI</span>
          <div>
            <strong>Floating VP Terminal</strong>
            <small>${escapeHtml(statusText)}</small>
          </div>
        </div>
        <div class="vp-assistant-header-actions">
          <button class="vp-mini-btn" id="vp-minimize-btn" title="${state.vpAssistantCollapsed ? "Expand" : "Minimize"}">${state.vpAssistantCollapsed ? "▢" : "—"}</button>
          <button class="vp-mini-btn" id="vp-close-btn" title="Close VP terminal">✕</button>
        </div>
      </header>
      ${state.vpAssistantCollapsed ? "" : `
      <div class="vp-assistant-body">
        <div class="vp-assistant-mission-card">
          <div class="vp-assistant-mission-head">
            <div>
              <span>Mission</span>
              <strong>${mission ? escapeHtml(mission.status || "running") : "Idle"}</strong>
            </div>
            <div class="vp-assistant-mission-meta">
              <small>${mission ? `ID ${escapeHtml(mission.missionId || "")}` : "No mission running"}</small>
            </div>
          </div>
          <div class="vp-assistant-controls">
            <button class="vp-action-btn primary" id="vp-launch-mission-btn" ${state.vpMissionLoading ? "disabled" : ""}>
              ${state.vpMissionLoading ? `${icon("radar")} Launching…` : `${icon("spark")} Launch Mission`}
            </button>
            <button class="vp-action-btn" id="vp-refresh-mission-btn" ${mission && mission.missionId ? "" : "disabled"}>
              ${icon("radar")} Refresh
            </button>
            <button class="vp-action-btn" id="vp-open-media-output-btn">${icon("video")} Media Review</button>
          </div>
          <div class="vp-assistant-mission-details">
            ${mission ? `
              <div><strong>Authority:</strong> ${escapeHtml(mission.authorityModel || "governance-gated-autonomy")}</div>
              <div><strong>Evaluated:</strong> ${Number(mission.evaluatedCount || mission.targetCount || 0)}</div>
              <div><strong>Approved + Queued:</strong> ${Number(mission.approvedCount || 0)} &nbsp; <strong>Review:</strong> ${Number(mission.reviewCount || 0)} &nbsp; <strong>Blocked:</strong> ${Number(mission.blockedCount || 0)}</div>
              <div><strong>Published:</strong> ${Number(mission.publishedCount || 0)} <span style="opacity:0.7">(gated)</span></div>
              <div><strong>Origin:</strong> ${escapeHtml(mission.originSectionId || "executive-workspace")}</div>
            ` : `
              <div>Launch a mission or ask a question to start the VP workflow.</div>
            `}
          </div>
        </div>

        <div class="vp-assistant-transcript" id="vp-transcript">
          ${messages.map((msg) => `
            <div class="vp-message vp-message-${msg.role}">
              <span class="vp-message-role">${escapeHtml(msg.role === "assistant" ? "VP" : "You")}</span>
              <p>${escapeHtml(msg.text)}</p>
              ${msg.nextActions && msg.nextActions.length ? `<ul>${msg.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
            </div>
          `).join("")}
        </div>

        <div class="vp-assistant-input-wrap">
          <textarea id="vp-assistant-input" rows="3" placeholder="Ask the VP what to do next, or speak to it...">${escapeHtml(state.vpAssistantInput)}</textarea>
          <div class="vp-assistant-actions">
            <button class="vp-action-btn primary" id="vp-send-btn">${icon("send")} Send</button>
            <button class="vp-action-btn ${state.vpAssistantListening ? "active" : ""}" id="vp-mic-btn" ${voiceSupported ? "" : "disabled"}>
              ${state.vpAssistantListening ? `${icon("mic")} Stop` : `${icon("mic")} Talk`}
            </button>
            <label class="vp-voice-toggle">
              <input type="checkbox" id="vp-speak-toggle" ${state.vpAssistantSpeaking ? "checked" : ""} />
              <span>Speak replies</span>
            </label>
          </div>
          ${state.vpAssistantError ? `<div class="vp-assistant-error">${escapeHtml(state.vpAssistantError)}</div>` : ""}
          <div class="vp-assistant-footer">
            <small>${voiceSupported ? "Voice input ready." : "Speech recognition is not supported in this browser."}</small>
            ${lastMessage ? `<button class="vp-link-btn" id="vp-clear-thread-btn">Clear thread</button>` : ""}
          </div>
        </div>
      </div>`}
    </section>
  `;
}

async function launchVpMission(originSectionId = state.currentSection || "executive-workspace") {
  if (state.vpMissionLoading) return;
  state.vpMissionLoading = true;
  state.vpMissionError = null;
  render();
  try {
    const res = await fetch("/api/agents/vp-mission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCount: 3, originSectionId })
    });
    if (!res.ok) throw new Error("VP mission launch failed.");
    const data = await res.json();
    state.vpMission = data.mission || null;
    state.vpAssistantStatus = "Mission launched";
    pushVpMessage("assistant", "VP mission launched. I’m coordinating the executive workflow now.", {
      nextActions: ["Refresh the mission for live status", "Open Media Review to inspect outputs"]
    });
    state.syncMessage = "VP mission launched.";
    state.syncLevel = "connected";
  } catch (error) {
    state.vpMissionError = error.message || "VP mission launch failed.";
    state.vpAssistantStatus = "Mission failed";
    pushVpMessage("assistant", state.vpMissionError);
  }
  state.vpMissionLoading = false;
  render();
}

async function refreshVpMission() {
  if (!state.vpMission || !state.vpMission.missionId) return;
  try {
    const res = await fetch(`/api/agents/vp-mission/${state.vpMission.missionId}`);
    if (!res.ok) throw new Error("Could not refresh VP mission.");
    const data = await res.json();
    state.vpMission = data.mission || state.vpMission;
    state.vpMissionError = null;
    state.vpAssistantStatus = "Mission refreshed";
    pushVpMessage("assistant", `Mission ${state.vpMission.missionId} refreshed.`);
  } catch (error) {
    state.vpMissionError = error.message || "Could not refresh VP mission.";
    state.vpAssistantStatus = "Refresh failed";
    pushVpMessage("assistant", state.vpMissionError);
  }
  render();
}

async function sendVpAssistantMessage(message, options = {}) {
  const text = String(message || options.message || "").trim();
  if (!text || state.vpAssistantSending) return;
  pushVpMessage("user", text, { source: options.source || "typed" });
  state.vpAssistantInput = "";
  state.vpAssistantError = null;
  state.vpAssistantSending = true;
  state.vpAssistantStatus = "Thinking";
  render();

  const normalized = text.toLowerCase();
  try {
    if (normalized.includes("launch mission") || normalized.includes("start mission")) {
      await launchVpMission("vp-floating-terminal");
      pushVpMessage("assistant", "Mission command received. Use refresh to monitor it.");
      return;
    }

    if (normalized.includes("refresh mission") || normalized.includes("mission status")) {
      await refreshVpMission();
      pushVpMessage("assistant", "Mission status refreshed.");
      return;
    }

    if (normalized.includes("open media") || normalized.includes("media review")) {
      setCurrentSection("media-output");
      pushVpMessage("assistant", "Opening Media Review now.");
      return;
    }

    if (normalized.includes("open executive") || normalized.includes("executive workspace")) {
      setCurrentSection("executive-workspace");
      pushVpMessage("assistant", "Executive Workspace is open.");
      return;
    }

    const payload = {
      question: text,
      context: {
        currentSection: state.currentSection,
        vpMission: state.vpMission ? {
          missionId: state.vpMission.missionId,
          status: state.vpMission.status,
          authorityModel: state.vpMission.authorityModel,
          evaluatedCount: state.vpMission.evaluatedCount,
          approvedCount: state.vpMission.approvedCount,
          reviewCount: state.vpMission.reviewCount,
          blockedCount: state.vpMission.blockedCount,
          targetCount: state.vpMission.targetCount,
          publishedCount: state.vpMission.publishedCount,
          originSectionId: state.vpMission.originSectionId
        } : null,
        products: products.slice(0, 5).map((p) => ({ name: p.name, category: p.category, score: p.score, angle: p.angle })),
        topHooks: winningHooks.slice(0, 5).map((h) => h.text),
        creativeCount: creatives.length
      }
    };

    const res = await fetch("/api/agent/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`copilot returned ${res.status}`);
    const data = await res.json();
    const reply = data.answer || "No answer returned.";
    state.vpAssistantStatus = data.source === "gpt-4o" ? "GPT-4o" : "Rule-based fallback";
    pushVpMessage("assistant", reply, { nextActions: Array.isArray(data.nextActions) ? data.nextActions : [] });
    speakVpReply(reply);
  } catch (error) {
    state.vpAssistantStatus = "Offline";
    pushVpMessage("assistant", error.message || "VP assistant unavailable right now.");
  } finally {
    state.vpAssistantSending = false;
    render();
  }
}

function sectionWithBoundary(rendererFn, sectionId) {
  try {
    return rendererFn();
  } catch (err) {
    console.error(`[EVICS] Section render error in "${sectionId}":`, err);
    return `
      <div class="section-content">
        <div class="panel" style="border-left:4px solid var(--coral);padding:20px">
          <h3 style="color:var(--coral)">⚠ Section Error — ${sectionId}</h3>
          <p style="font-size:0.9em;opacity:0.8">${err.message || 'Unknown render error'}</p>
          <button class="ghost" style="margin-top:8px" onclick="window.location.reload()">Reload Dashboard</button>
        </div>
      </div>`;

  }
  }

function demoBanner() {
  if (state.dataSource !== "Demo") return "";
  return `
    <div class="demo-mode-banner" id="demo-mode-banner">
      <span>${icon("spark")} <strong>Demo Mode</strong> — You're viewing sample data. Connect Supabase to load live intelligence.</span>
      <button class="ghost demo-connect-btn" id="demo-connect-btn" style="padding:4px 12px;font-size:12px">Connect Sources</button>
      <button class="demo-banner-dismiss" id="demo-banner-dismiss" title="Dismiss">✕</button>
    </div>`;
}

function metric(label, value, delta) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${delta}</small></article>`;
}

function select(name, options, value) {
  return `<label><select data-select="${name}">${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
}

let renderPollTimeout = null;

function mapBackendRenderStatus(status) {
  if (status === "completed" || status === "complete") return "complete";
  if (status === "failed") return "failed";
  return "processing";
}

async function pollRenderStatus(statusUrl) {
  if (!statusUrl) return;

  try {
    const response = await fetch(statusUrl, { headers: { Accept: "application/json" } });
    const data = await response.json();
    const nextStatus = mapBackendRenderStatus(data.status);

    state.renderStatus = nextStatus;
    state.renderProgress = nextStatus === "complete" ? 100 : Math.min(95, Math.max(state.renderProgress + 10, 35));
    state.renderUrl = data.video_url || data.videoUrl || state.renderUrl || null;
    state.renderMessage = nextStatus === "complete"
      ? "Render complete. A direct video URL is available for playback and export."
      : nextStatus === "failed"
        ? (data.error_message || data.error || "Render failed before a playable video URL was returned.")
        : "Render is still processing. Checking backend status again.";
    state.exportMessage = state.renderUrl ? "Video is ready to download." : "Generate a completed video before exporting.";

    render();

    if (nextStatus === "processing") {
      renderPollTimeout = setTimeout(() => pollRenderStatus(statusUrl), 10000);
    }
  } catch (error) {
    state.renderStatus = "failed";
    state.renderProgress = 0;
    state.renderMessage = error.message || "Unable to read render status from the backend.";
    state.exportMessage = "Generate a completed video before exporting.";
    render();
  }
}

function resolveSpecialEffectsFromPreset() {
  const preset = String(state.videoEffectPreset || "").trim().toLowerCase();
  if (!preset || preset === "ai best judgment") return [];
  return ["product-entrance-fade"];
}

async function resolvePrimaryProductMockup() {
  const params = new URLSearchParams();
  if (state.videoProductTitle.trim()) params.set("productTitle", state.videoProductTitle.trim());
  if (state.videoProductPageUrl.trim()) params.set("productPageUrl", state.videoProductPageUrl.trim());
  const endpoint = `/api/products/mockup-library/resolve?${params.toString()}`;
  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  const data = await response.json();
  if (!response.ok || data.success === false || !data.product) {
    throw new Error(data.error || "Unable to resolve primary product mockup from product library.");
  }
  const product = data.product;
  if (!product.primaryImageUrl) {
    throw new Error("Primary product image missing in mockup library for selected product.");
  }
  if (!state.videoProductMockupUrl || !state.videoProductMockupUrl.trim()) {
    state.videoProductMockupUrl = product.primaryImageUrl;
  }
  if (!state.videoProductPageUrl || !state.videoProductPageUrl.trim()) {
    state.videoProductPageUrl = product.productPageUrl || "";
  }
  if (!state.videoProductTitle || !state.videoProductTitle.trim()) {
    state.videoProductTitle = product.title || "";
  }
  return product;
}

async function generateVideoFromSubmittedScript() {
  if (!state.submittedScript.trim() || state.renderStatus === "processing") return;

  if (renderPollTimeout) {
    clearTimeout(renderPollTimeout);
    renderPollTimeout = null;
  }

  state.renderStatus = "processing";
  state.renderMessage = "Render submitted to backend. Waiting for provider status.";
  state.renderProgress = 15;
  state.renderUrl = null;
  state.renderVideoId = null;
  state.renderStatusUrl = null;
  state.exportMessage = "Generate a completed video before exporting.";
  render();

  try {
    const resolvedProduct = await resolvePrimaryProductMockup();
    const visualBackground = buildEliteBackgroundConfig();
    const specialEffects = resolveSpecialEffectsFromPreset();
    const response = await fetch("/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        render_mode: "avatar-video",
        script: state.submittedScript,
        avatar_id: getEliteAvatarId() || undefined,
        voice_id: getEliteVoiceId() || undefined,
        avatar_preset: state.videoAvatarPreset || undefined,
        voice_preset: state.videoVoice || undefined,
        duration: state.videoDuration,
        style: state.videoStyle,
        background: visualBackground,
        aspect: state.videoAspect,
        productTitle: (resolvedProduct && resolvedProduct.title) || state.videoProductTitle || undefined,
        productImageUrl: (resolvedProduct && resolvedProduct.primaryImageUrl) || state.videoProductMockupUrl || undefined,
        productPageUrl: (resolvedProduct && resolvedProduct.productPageUrl) || state.videoProductPageUrl || state.videoDestinationUrl || undefined,
        companyLabel: state.videoCompanyLabel || undefined,
        cta_url: state.videoProductPageUrl || state.videoDestinationUrl || undefined,
        special_effects: specialEffects,
        text_overlay_position: state.videoTextOverlayPosition || "bottom",
        tracking_protocol: state.videoTrackingProtocol || undefined,
        config: {
          display_voice: state.videoVoice,
          avatar_preset: state.videoAvatarPreset || "",
          voice_preset: state.videoVoice || "",
          audio_bed: state.videoBackground,
          background: visualBackground,
          visual_background: state.videoVisualBackground,
          effect_preset: state.videoEffectPreset,
          entry_timing: state.videoEntryTiming,
          product_treatment: state.videoProductTreatment,
          brand_brief: state.videoBrandBrief,
          effect_brief: state.videoEffectBrief,
          timing_brief: state.videoTimingBrief,
          governance: state.videoGovernanceMode,
          productTitle: state.videoProductTitle || "",
          productImageUrl: ((resolvedProduct && resolvedProduct.primaryImageUrl) || state.videoProductMockupUrl || ""),
          productPageUrl: ((resolvedProduct && resolvedProduct.productPageUrl) || state.videoProductPageUrl || state.videoDestinationUrl || ""),
          companyLabel: state.videoCompanyLabel || "I AM GENESIS TECH",
          special_effects: specialEffects,
          text_overlay_position: state.videoTextOverlayPosition || "bottom",
          cta_destination_url: state.videoProductPageUrl || state.videoDestinationUrl || "",
          tracking_protocol: state.videoTrackingProtocol || ""
        }
      })
    });
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Video generation request failed.");
    }

    state.renderVideoId = data.video_id || null;
    state.renderStatusUrl = data.status_url || null;
    state.renderUrl = data.video_url || data.videoUrl || null;
    state.videoProductMockupUrl = data.product_image_url || state.videoProductMockupUrl;
    state.renderStatus = mapBackendRenderStatus(data.status);
    state.renderProgress = state.renderStatus === "complete" ? 100 : 30;
    state.renderMessage = state.renderStatus === "complete"
      ? "Render complete. A direct video URL is available for playback and export."
      : "Render accepted. Polling backend until a direct video URL is returned.";

    render();

    if (state.renderStatus === "processing" && state.renderStatusUrl) {
      renderPollTimeout = setTimeout(() => pollRenderStatus(state.renderStatusUrl), 10000);
    }
  } catch (error) {
    state.renderStatus = "failed";
    state.renderProgress = 0;
    state.renderMessage = error.message || "Video generation failed.";
    state.renderUrl = null;
    state.exportMessage = "Generate a completed video before exporting.";
    render();
  }
}

function setCurrentSection(sectionId, options = {}) {
  const sectionExists = WORKSPACE_SECTIONS.some((section) => section.id === sectionId);
  if (!sectionExists) return;
  const {
    resetMediaSelection = true,
    scrollToTop = true,
    skipRender = false
  } = options;
  state.currentSection = sectionId;
  if (resetMediaSelection) {
    state.selectedMediaId = null;
    state.mediaActionStatus = null;
  }
  try {
    localStorage.setItem("evics_current_section", sectionId);
  } catch (e) {
    // ignore storage errors
  }
  syncSectionInUrl(sectionId);
  if (scrollToTop && typeof window.scrollTo === "function") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (sectionId === "media-output" && typeof window.loadMediaOutputs === "function") {
    window.loadMediaOutputs();
  }
  if (!skipRender) {
    render();
  }
}

function syncSectionInUrl(sectionId) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("section", sectionId);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  } catch (e) {
    // ignore URL sync errors
  }
}

function bindEvents() {
  // ── Navigation: sidebar nav buttons ──
  document.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setCurrentSection(btn.dataset.section);
    });
  });

  const navPrevSection = document.getElementById("nav-prev-section");
  if (navPrevSection) {
    navPrevSection.addEventListener("click", () => {
      const target = navPrevSection.dataset.targetSection;
      if (target) setCurrentSection(target);
    });
  }

  const navNextSection = document.getElementById("nav-next-section");
  if (navNextSection) {
    navNextSection.addEventListener("click", () => {
      const target = navNextSection.dataset.targetSection;
      if (target) setCurrentSection(target);
    });
  }

  const pipelineAutonomousRun = document.getElementById("pipeline-autonomous-run");
  if (pipelineAutonomousRun) {
    pipelineAutonomousRun.addEventListener("click", async () => {
      if (state.vpMissionLoading) return;
      state.vpMissionLoading = true;
      state.vpMissionError = null;
      state.syncMessage = "Launching autonomous mission across pipeline stages...";
      render();
      try {
        const res = await fetch("/api/agents/vp-mission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetCount: 3, originSectionId: state.currentSection || "workspace-shell" })
        });
        if (!res.ok) throw new Error("Autonomous mission launch failed.");
        const data = await res.json();
        state.vpMission = data.mission || null;
        state.syncMessage = "Autonomous mission launched. VP agent now coordinating end-to-end pipeline.";
        state.syncLevel = "connected";
      } catch (error) {
        state.vpMissionError = error.message || "Autonomous mission launch failed.";
        state.syncMessage = state.vpMissionError;
      }
      state.vpMissionLoading = false;
      render();
    });
  }

  // ── Video pipeline input layer ──
  const scriptInput = document.getElementById("script-input");
  if (scriptInput) {
    scriptInput.addEventListener("input", () => {
      state.scriptInput = scriptInput.value;
      if (state.inputStatus !== "ready") {
        state.inputStatus = state.scriptInput.trim() ? "idle" : "idle";
        state.inputMessage = state.scriptInput.trim()
          ? "Script entered. Submit it to use this input for generation."
          : "Paste a script or upload a text file, then submit it to unlock generation.";
      }
    });
  }

  const scriptFileInput = document.getElementById("script-file-input");
  if (scriptFileInput) {
    scriptFileInput.addEventListener("change", async () => {
      const file = scriptFileInput.files && scriptFileInput.files[0];
      if (!file) return;
      if (file.type && file.type !== "text/plain" && !file.name.toLowerCase().endsWith(".txt")) {
        state.inputStatus = "failed";
        state.inputMessage = "Only plain text script files are accepted.";
        state.uploadedScriptName = "";
        render();
        return;
      }
      const text = await file.text();
      state.scriptInput = text;
      state.uploadedScriptName = file.name;
      state.inputStatus = "idle";
      state.inputMessage = "Script file loaded. Submit it to use this input for generation.";
      render();
    });
  }

  const submitVideoInput = document.getElementById("submit-video-input");
  if (submitVideoInput) {
    submitVideoInput.addEventListener("click", () => {
      const script = state.scriptInput.trim();
      if (!script) return;
      state.submittedScript = script;
      state.inputStatus = "ready";
      state.inputMessage = `Submitted ${script.length.toLocaleString()} characters for video generation.`;
      state.renderStatus = "ready";
      state.renderMessage = "Input ready. Generate Video will send this script to the backend renderer.";
      state.renderProgress = 0;
      state.renderUrl = null;
      state.renderVideoId = null;
      state.renderStatusUrl = null;
      state.exportMessage = "Generate a completed video before exporting.";
      if (renderPollTimeout) {
        clearTimeout(renderPollTimeout);
        renderPollTimeout = null;
      }
      render();
    });
  }

  const generateVideoBtn = document.getElementById("generate-video-btn");
  if (generateVideoBtn) {
    generateVideoBtn.addEventListener("click", generateVideoFromSubmittedScript);
  }

  document.querySelectorAll("[data-state-key]").forEach((controlEl) => {
    const handler = () => {
      state[controlEl.dataset.stateKey] = controlEl.value;
    };
    controlEl.addEventListener("input", handler);
    controlEl.addEventListener("change", handler);
  });

  // ── Media type filter ──
  const mediaTypeFilter = document.getElementById("media-type-filter");
  if (mediaTypeFilter) {
    mediaTypeFilter.addEventListener("change", () => {
      state.selectedMediaType = mediaTypeFilter.value;
      state.selectedMediaId = null;
      render();
    });
  }

  // ── Media app filter ──
  const mediaAppFilter = document.getElementById("media-app-filter");
  if (mediaAppFilter) {
    mediaAppFilter.addEventListener("change", () => {
      state.selectedRenderApp = mediaAppFilter.value;
      state.selectedMediaId = null;
      render();
    });
  }

  // ── Media refresh button ──
  const mediaRefreshBtn = document.getElementById("media-refresh-btn");
  if (mediaRefreshBtn) {
    mediaRefreshBtn.addEventListener("click", async () => {
      mediaRefreshBtn.textContent = "Refreshing…";
      mediaRefreshBtn.disabled = true;
      // Reload live EVICS renders from the backend (evics_renders)
      await loadMediaLibrary();
    });
  }

  // ── Media card selection ──
  document.querySelectorAll("[data-media-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mediaId;
      state.selectedMediaId = id;
      state.mediaActionStatus = null;
      render();
    });
  });

  document.querySelectorAll("[data-media-review-id]").forEach((btn) => {
    const openReview = (event) => {
      event.stopPropagation();
      const id = btn.dataset.mediaReviewId;
      const item = (state.mediaLibrary || []).find((entry) => String(entry.id) === String(id));
      if (!item) return;
      state.selectedMediaId = id;
      openMediaReviewModal(item);
      render();
    };
    btn.addEventListener("click", openReview);
    btn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        openReview(event);
      }
    });
  });

  // ── Media detail close ──
  const mediaDetailClose = document.getElementById("media-detail-close");
  if (mediaDetailClose) {
    mediaDetailClose.addEventListener("click", () => {
      state.selectedMediaId = null;
      state.mediaActionStatus = null;
      render();
    });
  }

  // ── Media action buttons (approve, reject, requeue, download) ──
  document.querySelectorAll("[data-media-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.mediaAction;
      const id     = btn.dataset.mediaId;
      const item   = (state.mediaLibrary || []).find((m) => String(m.id) === String(id));
      if (!item) return;

      if (action === "approve") {
        const previousStatus = item.status;
        item.status = "approved";
        state.mediaActionStatus = { id, type: "info", message: "Saving approval…" };
        render();
        // Persist to backend
        try {
          const res = await fetch("/api/agent/approve-creative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, approved: true })
          });
          if (!res.ok) throw new Error(await readErrorMessage(res, `Approve failed (HTTP ${res.status}).`));
          state.mediaActionStatus = { id, type: "success", message: "✓ Approved" };
        } catch (err) {
          item.status = previousStatus;
          state.mediaActionStatus = { id, type: "warning", message: `Approve failed: ${getErrorMessage(err)}` };
        }
      } else if (action === "reject") {
        const previousStatus = item.status;
        item.status = "draft";
        state.mediaActionStatus = { id, type: "info", message: "Saving rejection…" };
        render();
        try {
          const res = await fetch("/api/agent/approve-creative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, approved: false, rejectionReason: "Rejected via media manager" })
          });
          if (!res.ok) throw new Error(await readErrorMessage(res, `Reject failed (HTTP ${res.status}).`));
          state.mediaActionStatus = { id, type: "warning", message: "✕ Rejected — returned to draft" };
        } catch (err) {
          item.status = previousStatus;
          state.mediaActionStatus = { id, type: "warning", message: `Reject failed: ${getErrorMessage(err)}` };
        }
      } else if (action === "requeue") {
        item.status = "pending";
        state.mediaActionStatus = { id, type: "info", message: "↺ Requeued for rendering" };
      } else if (action === "download") {
        state.mediaActionStatus = { id, type: "info", message: "↓ Preparing download…" };
        render();
        try {
          const res = await fetch(`/api/media/${id}/download`, { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            if (data.downloadUrl) {
              const a = document.createElement("a");
              a.href = data.downloadUrl;
              a.download = data.filename || `media-${id}.mp4`;
              a.click();
              state.mediaActionStatus = { id, type: "success", message: "✓ Download started" };
            } else {
              state.mediaActionStatus = { id, type: "warning", message: "No file URL available yet" };
            }
          } else {
            state.mediaActionStatus = { id, type: "warning", message: await readErrorMessage(res, `Download failed (HTTP ${res.status}).`) };
          }
        } catch (err) {
          state.mediaActionStatus = { id, type: "warning", message: `Download failed: ${getErrorMessage(err)}` };
        }
      }
      render();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PRODUCT VIRAL INTELLIGENCE — event bindings
  // ─────────────────────────────────────────────────────────────

  // ── Product card selection ──
  document.querySelectorAll("[data-pvi-product]").forEach((btn) => {
    if (btn.classList.contains("pvi-product-card")) {
      btn.addEventListener("click", () => {
        const productId = btn.dataset.pviProduct;
        const mem = state.productViralMemories.find((m) => m.product_id === productId);
        if (mem) {
          state.selectedProductViral = mem;
          state.reproductionResult = null;
          render();
        }
      });
    }
  });

  // ── Scan Now button ──
  const pviScanBtn = document.getElementById("pvi-scan-btn");
  if (pviScanBtn) {
    pviScanBtn.addEventListener("click", async () => {
      state.viralScanInProgress = true;
      state.pviError = null;
      render();
      try {
        const res = await fetch("/api/viral/scan-by-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error((data && (data.error || data.message)) || `Scan failed (HTTP ${res.status}).`);
        }
        state.lastScanDate = new Date().toISOString();
        state.nextScanScheduled = data.nextScan || null;
        if (data.results && data.results.length) {
          state.productViralMemories = data.results.map((r, i) => ({
            product_id: r.product,
            product_name: r.product,
            viral_score: r.viralScore,
            hook: r.hook,
            pacing: "Fast cuts (0–2s hook, 2–5s problem, 5–12s proof, 12–15s CTA)",
            cta: "Try it risk-free today",
            visual_style: "UGC testimonial",
            emotional_triggers: ["curiosity", "transformation", "trust"],
            structure: ["Hook", "Problem", "Proof", "Product reveal", "CTA"],
            platform_breakdown: { TikTok: 45, Instagram: 30, YouTube: 15, Facebook: 10 },
            last_updated: new Date().toISOString(),
            reproduction_count: 0,
            performance_metrics: { avg_views: 0, avg_engagement: 0, avg_conversion: 0 }
          }));
        } else {
          state.productViralMemories = [];
        }
      } catch (err) {
        state.pviError = `Scan failed: ${getErrorMessage(err)}`;
      }
      state.viralScanInProgress = false;
      render();
    });
  }

  // ── Schedule button ──
  const pviScheduleBtn = document.getElementById("pvi-schedule-btn");
  if (pviScheduleBtn) {
    pviScheduleBtn.addEventListener("click", async () => {
      state.pviError = null;
      try {
        const res = await fetch("/api/viral/schedule-daily-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hour: 6, minute: 0 })
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error((data && (data.error || data.message)) || `Could not schedule daily scan (HTTP ${res.status}).`);
        }
        state.nextScanScheduled = data.nextRun;
        state.viralScheduleResult = `✓ ${data.message}`;
      } catch (err) {
        state.pviError = `Could not schedule daily scan: ${getErrorMessage(err)}`;
      }
      render();
      setTimeout(() => { state.viralScheduleResult = null; render(); }, 4000);
    });
  }

  // ── Find More Ads button ──
  const pviFindAdsBtn = document.getElementById("pvi-find-ads-btn");
  if (pviFindAdsBtn) {
    pviFindAdsBtn.addEventListener("click", async () => {
      const productId = pviFindAdsBtn.dataset.pviProduct;
      const mem = state.productViralMemories.find((m) => m.product_id === productId);
      if (!mem) return;

      state.viralFindInProgress = true;
      state.pviError = null;
      render();
      try {
        const res = await fetch("/api/viral/find-product-viral-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: mem.product_id,
            productName: mem.product_name,
            category: mem.visual_style
          })
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error((data && (data.error || data.message)) || `Ad search failed (HTTP ${res.status}).`);
        }
        state.reproductionResult = `✓ Found ${data.alternativesFound} viral ad templates across ${(data.platformsSearched || []).length} platforms.`;
      } catch (err) {
        state.pviError = `Ad search failed: ${getErrorMessage(err)}`;
      }
      state.viralFindInProgress = false;
      render();
    });
  }

  // ── Reproduce button ──
  const pviReproduceBtn = document.getElementById("pvi-reproduce-btn");
  if (pviReproduceBtn) {
    pviReproduceBtn.addEventListener("click", async () => {
      const productId = pviReproduceBtn.dataset.pviProduct;
      const mem = state.productViralMemories.find((m) => m.product_id === productId);
      if (!mem) return;

      state.reproductionInProgress = true;
      state.reproductionResult = null;
      state.pviError = null;
      render();
      try {
        const res = await fetch(`/api/viral/product/${encodeURIComponent(productId)}/reproduce`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "TikTok" })
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error((data && (data.error || data.message)) || `Reproduce failed (HTTP ${res.status}).`);
        }
        state.reproductionResult = `✓ ${data.message}`;
        mem.reproduction_count = (mem.reproduction_count || 0) + 1;
      } catch (err) {
        state.pviError = `Reproduce failed: ${getErrorMessage(err)}`;
      }
      state.reproductionInProgress = false;
      render();
    });
  }

  // ── Dismiss reproduction result ──
  const pviDismissResult = document.getElementById("pvi-dismiss-result");
  if (pviDismissResult) {
    pviDismissResult.addEventListener("click", () => {
      state.reproductionResult = null;
      render();
    });
  }

  // ── Load all memories from API on section entry ──
  // ── Agent controls (Executive Workspace section) ──
  const agentViralScanBtn = document.getElementById("agent-viral-scan-btn");
  if (agentViralScanBtn) {
    agentViralScanBtn.addEventListener("click", async () => {
      agentViralScanBtn.textContent = "Scanning…";
      agentViralScanBtn.disabled = true;
      try {
        await fetch("/api/agent/viral-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: state.scanAmount })
        });
      } catch { /* demo ok */ }
      await new Promise((r) => setTimeout(r, 1200));
      agentViralScanBtn.textContent = "✓ Scan complete";
      setTimeout(() => render(), 1000);
    });
  }

  const agentReconstructBtn = document.getElementById("agent-reconstruct-btn");
  if (agentReconstructBtn) {
    agentReconstructBtn.addEventListener("click", async () => {
      agentReconstructBtn.textContent = "Reconstructing…";
      agentReconstructBtn.disabled = true;
      try {
        const ad = selectedAd();
        await fetch("/api/agent/reconstruct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hook: ad.hook, platform: ad.platform, category: ad.category })
        });
      } catch { /* demo ok */ }
      await new Promise((r) => setTimeout(r, 1000));
      agentReconstructBtn.textContent = "✓ Reconstruction queued";
      setTimeout(() => render(), 1000);
    });
  }

  const agentLearningLoopBtn = document.getElementById("agent-learning-loop-btn");
  if (agentLearningLoopBtn) {
    agentLearningLoopBtn.addEventListener("click", async () => {
      agentLearningLoopBtn.textContent = "Running…";
      agentLearningLoopBtn.disabled = true;
      try {
        await fetch("/api/agent/learning-loop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creativeId: "all", watchTime: 14.2, engagement: 10.2, ctr: 4.8 })
        });
      } catch { /* demo ok */ }
      await new Promise((r) => setTimeout(r, 1000));
      agentLearningLoopBtn.textContent = "✓ Loop complete";
      setTimeout(() => render(), 1000);
    });
  }

  const runExcellenceAuditBtn = document.getElementById("run-excellence-audit-btn");
  if (runExcellenceAuditBtn) {
    runExcellenceAuditBtn.addEventListener("click", async () => {
      state.excellenceLoading = true;
      state.excellenceError = null;
      render();
      try {
        const data = await apiFetch("/api/excellence/audit", { method: "POST" });
        state.excellenceStatus = data;
        state.excellenceObjectives = Array.isArray(data.objectives) ? data.objectives : [];
      } catch (error) {
        state.excellenceError = error.message || "A+ audit failed";
      } finally {
        state.excellenceLoading = false;
        render();
      }
    });
  }

  const refreshExcellenceStatusBtn = document.getElementById("refresh-excellence-status-btn");
  if (refreshExcellenceStatusBtn) {
    refreshExcellenceStatusBtn.addEventListener("click", async () => {
      state.excellenceLoading = true;
      state.excellenceError = null;
      render();
      try {
        const data = await apiFetch("/api/excellence/status");
        state.excellenceStatus = data;
        state.excellenceObjectives = Array.isArray(data.objectives) ? data.objectives : [];
      } catch (error) {
        state.excellenceError = error.message || "A+ status unavailable";
      } finally {
        state.excellenceLoading = false;
        render();
      }
    });
  }

  // ── Ad selection ──
  document.querySelectorAll("[data-ad]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAdId = button.dataset.ad;
      render();
    });
  });

  // ── Generic selects (category, platform, queueMode filters + assembly filters) ──
  document.querySelectorAll("[data-select]").forEach((selectEl) => {
    selectEl.addEventListener("change", () => {
      state[selectEl.dataset.select] = selectEl.value;
      if (selectEl.dataset.select === "category" || selectEl.dataset.select === "platform") {
        const first = filteredAds()[0];
        if (first) state.selectedAdId = first.id;
      }
      render();
    });
  });

  // ── Video parameter selects ──
  document.querySelectorAll("[data-state-key]").forEach((selectEl) => {
    selectEl.addEventListener("change", () => {
      state[selectEl.dataset.stateKey] = selectEl.value;
      render();
    });
  });

  // ── Queue mode tabs ──
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.queueMode = button.dataset.mode;
      render();
    });
  });

  // ── Creative approval ──
  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.approve;
      const approved = !state.approvals.has(id);
      if (approved) state.approvals.add(id);
      else state.approvals.delete(id);

      const creative = creatives.find((item) => item.id === id);
      if (creative) creative.approved = approved;
      render();

      if (window.iagtSupabase && window.iagtSupabase.enabled) {
        try {
          await window.iagtSupabase.updateCreativeApproval(id, approved);
          state.syncLevel = "connected";
          state.syncMessage = "Approval saved to Supabase.";
        } catch (error) {
          state.syncLevel = "error";
          state.syncMessage = "Approval changed locally. Supabase update is blocked by policy.";
          console.error(error);
        }
        render();
      }
    });
  });

  // ── Rescan button → POST /api/agents/trend-scout/scan ──
  const rescanBtn = document.getElementById("rescan-btn");
  const scanInput = document.getElementById("scan-amount-input");
  const normalizeScanAmount = (rawValue, fallbackValue = state.scanAmount) => {
    const parsed = Number(rawValue);
    const safeBase = Number.isFinite(parsed) ? parsed : Number(fallbackValue);
    const normalized = Math.max(100, Math.min(10000, Number.isFinite(safeBase) ? Math.round(safeBase) : 3000));
    return normalized;
  };
  const persistScanAmount = (value) => {
    try {
      localStorage.setItem("evics_scan_amount", String(value));
    } catch (e) {
      // ignore storage errors
    }
  };
  if (scanInput) {
    const applyScanInputValue = () => {
      const normalized = normalizeScanAmount(scanInput.value, state.scanAmount);
      state.scanAmount = normalized;
      scanInput.value = String(normalized);
      persistScanAmount(normalized);
    };
    scanInput.addEventListener("input", applyScanInputValue);
    scanInput.addEventListener("change", applyScanInputValue);
  }
  if (rescanBtn) {
    rescanBtn.addEventListener("click", async () => {
      state.scanAmount = normalizeScanAmount(document.getElementById("scan-amount-input")?.value, state.scanAmount);
      persistScanAmount(state.scanAmount);
      state.scanning = true;
      render();
      try {
        const data = await agentFetch("/api/agents/trend-scout/scan", { amount: state.scanAmount });
        const newAds = (Array.isArray(data.trends) ? data.trends : [])
          .map((t, i) => ({
            id: String(t.id || ('scan-' + Date.now() + '-' + i)),
            platform: String(t.platform || "").trim(),
            category: String(t.category || "").trim(),
            title: String(t.title || t.hook || "").trim(),
            hook: String(t.hook || "").trim(),
            views: Number(t.views || 0),
            engagement: Number(t.engagement || 0),
            velocity: Number(t.velocity || 0),
            conversion: Number(t.conversion || 0),
            cta: String(t.cta || "").trim(),
            tags: Array.isArray(t.tags) ? t.tags : [],
            productMatch: String(t.product_match || t.productMatch || "").trim(),
            emotion: String(t.emotion || "").trim(),
            format: String(t.format || t.content_format || t.contentFormat || "").trim(),
            script: String(t.script || t.script_text || t.scriptText || "").trim(),
            structure: Array.isArray(t.structure) ? t.structure : []
          }))
          .filter((t) => t.title || t.hook || t.script);

        viralAds = newAds;
        state.selectedAdId = newAds.length ? newAds[0].id : null;
        state.scanCount = newAds.length;
        state.syncLevel = "connected";
        state.syncMessage = newAds.length
          ? ('Trend Scout returned ' + newAds.length.toLocaleString() + ' scraped trends.')
          : "Trend Scout completed with no scraped trends.";
      } catch (err) {
        // Fallback: try backup endpoint
        try {
          const res = await fetch(`${API_BASE}/api/viral/rescan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: state.scanAmount })
          });
          if (res.ok) {
            const data = await res.json();
            const backupAds = (Array.isArray(data.trends) ? data.trends : []).filter((t) => t && (t.title || t.hook || t.script));
            viralAds = backupAds;
            state.selectedAdId = backupAds.length ? String(backupAds[0].id || "") : null;
            state.scanCount = backupAds.length;
          } else {
            await new Promise((r) => setTimeout(r, 1800));
            viralAds = [];
            state.selectedAdId = null;
            state.scanCount = 0;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 1800));
          viralAds = [];
          state.selectedAdId = null;
          state.scanCount = 0;
        }
      }
      state.scanning = false;
      render();
    });
  }

  // ── Hook search button → POST /api/agents/trend-scout/scan (hooks mode) ──
  const viralRefreshBtn = document.getElementById("viral-gallery-refresh");
  if (viralRefreshBtn) {
    viralRefreshBtn.addEventListener("click", () => {
      loadViralGallery();
    });
  }

  const viralPlatformFilter = document.getElementById("viral-platform-filter");
  if (viralPlatformFilter) {
    viralPlatformFilter.addEventListener("change", () => {
      state.viralFilterPlatform = viralPlatformFilter.value;
      loadViralGallery();
    });
  }

  const viralCategoryFilter = document.getElementById("viral-category-filter");
  if (viralCategoryFilter) {
    viralCategoryFilter.addEventListener("change", () => {
      state.viralFilterCategory = viralCategoryFilter.value;
      loadViralGallery();
    });
  }

  const toggleViralGalleryBtn = document.getElementById("toggle-viral-gallery");
  if (toggleViralGalleryBtn) {
    toggleViralGalleryBtn.addEventListener("click", () => {
      state.viralGalleryOpen = !state.viralGalleryOpen;
      render();
    });
  }

  document.querySelectorAll("[data-viral-video-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = state.viralVideos.find((v) => String(v.id) === String(btn.dataset.viralVideoId));
      if (selected) {
        state.viralSelectedVideo = selected;
        state.viralAnalysis = null;
        render();
      }
    });
  });

  const runViralAnalysisBtn = document.getElementById("run-viral-analysis");
  if (runViralAnalysisBtn) {
    runViralAnalysisBtn.addEventListener("click", () => {
      const videoId = runViralAnalysisBtn.dataset.videoId;
      if (videoId) generateViralAnalysis(videoId);
    });
  }

  const createViralBriefBtn = document.getElementById("create-viral-brief");
  if (createViralBriefBtn) {
    createViralBriefBtn.addEventListener("click", async () => {
      const videoId = createViralBriefBtn.dataset.videoId;
      if (!videoId) return;
      state.viralBriefLoading = true;
      render();
      try {
        const res = await fetch(`/api/viral/${videoId}/create-brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productName: "EVICS Product" })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            state.viralBriefResult = data.brief;
          }
        }
      } catch {}
      state.viralBriefLoading = false;
      render();
    });
  }

  const hookSearchBtn = document.getElementById("hook-search-btn");
  const hookTargetInput = document.getElementById("hook-target-input");
  const normalizeHookTarget = (rawValue, fallbackValue = state.hookTarget) => {
    const parsed = Number(rawValue);
    const safeBase = Number.isFinite(parsed) ? parsed : Number(fallbackValue);
    const normalized = Math.max(10, Math.min(500, Number.isFinite(safeBase) ? Math.round(safeBase) : 100));
    return normalized;
  };
  const persistHookTarget = (value) => {
    try {
      localStorage.setItem("evics_hook_target", String(value));
    } catch (e) {
      // ignore storage errors
    }
  };
  if (hookTargetInput) {
    const applyHookTargetValue = () => {
      const normalized = normalizeHookTarget(hookTargetInput.value, state.hookTarget);
      state.hookTarget = normalized;
      hookTargetInput.value = String(normalized);
      persistHookTarget(normalized);
    };
    hookTargetInput.addEventListener("input", applyHookTargetValue);
    hookTargetInput.addEventListener("change", applyHookTargetValue);
  }
  if (hookSearchBtn) {
    hookSearchBtn.addEventListener("click", async () => {
      state.hookTarget = normalizeHookTarget(document.getElementById("hook-target-input")?.value, state.hookTarget);
      persistHookTarget(state.hookTarget);
      state.hookSearching = true;
      render();
      try {
        const data = await agentFetch("/api/agents/trend-scout/scan", {
          amount: state.hookTarget,
          keyword: state.hookSearchKeyword || undefined
        });
        state.hooksFound = data.count || state.hookTarget;
        if (data.trends && data.trends.length) {
          const newHooks = data.trends
            .filter((entry) => entry.hook)
            .map((entry, index) => ({
              id: `h-agent-${index}`,
              text: entry.hook,
              category: entry.category || "Discovered",
              platform: entry.platform || "Multi",
              confidence: entry.confidence || "Medium"
            }));
          const existingTexts = new Set(winningHooks.map((hook) => hook.text));
          const uniqueHooks = newHooks.filter((hook) => !existingTexts.has(hook.text));
          if (uniqueHooks.length) winningHooks.push(...uniqueHooks);
        }
        state.syncLevel = "connected";
        state.syncMessage = `Found ${state.hooksFound} hooks via Trend Scout.`;
        state.showHooksList = true;
      } catch {
        try {
          const res = await fetch(`${API_BASE}/api/hooks/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: state.hookTarget })
          });
          if (res.ok) {
            const data = await res.json();
            state.hooksFound = data.found || state.hookTarget;
            if (data.hooks && data.hooks.length) {
              winningHooks.push(...data.hooks.map((hook, index) => ({
                id: `h-api-${index}`,
                text: hook.text || hook,
                category: hook.category || "Discovered",
                platform: hook.platform || "Multi",
                confidence: hook.confidence || "Medium"
              })));
            }
            state.showHooksList = true;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 2200));
            state.hooksFound = state.hookTarget;
            state.showHooksList = true;
          }
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 2200));
          state.hooksFound = state.hookTarget;
          state.showHooksList = true;
        }
      }
      state.hookSearching = false;
      render();
    });
  }

  // ── Phase 2 agent engine buttons ──
  const profitAuditBtn = document.getElementById("profit-audit-btn");
  if (profitAuditBtn) {
    profitAuditBtn.addEventListener("click", async () => {
      state.profitAuditRunning = true;
      render();
      try {
        const res = await fetch("/api/agent/profit-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (res.ok) {
          state.profitAuditResult = await res.json();
          state.syncMessage = `Profit audit complete — ${state.profitAuditResult.audited} products scored.`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.profitAuditRunning = false;
      render();
    });
  }

  const productTiersBtn = document.getElementById("product-tiers-btn");
  if (productTiersBtn) {
    productTiersBtn.addEventListener("click", async () => {
      state.productTiersLoading = true;
      render();
      try {
        const res = await fetch("/api/agent/product-tiers");
        if (res.ok) {
          state.productTiersResult = await res.json();
          state.syncMessage = `Product tiers loaded — ${state.productTiersResult.total} products ranked.`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.productTiersLoading = false;
      render();
    });
  }

  const allocateBudgetBtn = document.getElementById("allocate-budget-btn");
  if (allocateBudgetBtn) {
    allocateBudgetBtn.addEventListener("click", async () => {
      state.budgetAllocRunning = true;
      render();
      try {
        const res = await fetch("/api/agent/allocate-budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalBudget: 1000 })
        });
        if (res.ok) {
          state.budgetAllocResult = await res.json();
          state.syncMessage = `Budget allocated — $${state.budgetAllocResult.totalBudget.toLocaleString()} split 80/20.`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.budgetAllocRunning = false;
      render();
    });
  }

  const libraryCleanupBtn = document.getElementById("library-cleanup-btn");
  if (libraryCleanupBtn) {
    libraryCleanupBtn.addEventListener("click", async () => {
      state.libraryCleanupRunning = true;
      render();
      try {
        const res = await fetch("/api/agent/library-cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: false })
        });
        if (res.ok) {
          state.libraryCleanupResult = await res.json();
          state.syncMessage = `Library cleanup done — ${state.libraryCleanupResult.archived} creatives archived.`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.libraryCleanupRunning = false;
      render();
    });
  }

  // ── Distribution: Publish Now per channel ──
  document.querySelectorAll(".dist-publish-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.channelKey;
      const channel = btn.dataset.channel;
      const content = btn.dataset.content;
      if (!key) return;

      state.distChannelStatus[key] = "Publishing…";
      render();
      try {
        const res = await fetch("/api/agent/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, content, timestamp: new Date().toISOString() })
        });
        const json = res.ok ? await res.json() : null;
        state.distChannelStatus[key] = json && json.success ? "Published ✓" : "Queued";
        state.syncMessage = `${channel}: ${state.distChannelStatus[key]}`;
        state.syncLevel = "connected";
      } catch {
        state.distChannelStatus[key] = "Queued";
      }
      render();
    });
  });

  // ── Distribution: Push All Ready ──
  const distPublishAll = document.querySelector(".dist-publish-all");
  if (distPublishAll) {
    distPublishAll.addEventListener("click", async () => {
      if (state.distPublishingAll) return;
      state.distPublishingAll = true;
      render();

      const readyBtns = document.querySelectorAll(".dist-publish-btn");
      for (const btn of readyBtns) {
        const key = btn.dataset.channelKey;
        const channel = btn.dataset.channel;
        const content = btn.dataset.content;
        if (!key || state.distChannelStatus[key]) continue;
        state.distChannelStatus[key] = "Publishing…";
        try {
          const res = await fetch("/api/agent/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel, content, timestamp: new Date().toISOString() })
          });
          const json = res.ok ? await res.json() : null;
          state.distChannelStatus[key] = json && json.success ? "Published ✓" : "Queued";
        } catch {
          state.distChannelStatus[key] = "Queued";
        }
      }
      state.distPublishingAll = false;
      state.syncMessage = "Push All complete.";
      render();
    });
  }

  // ── Phase 4: Vizard repurpose ──
  const vizardBtn = document.getElementById("vizard-repurpose-btn");
  if (vizardBtn) {
    vizardBtn.addEventListener("click", async () => {
      if (!state.renderUrl) return;
      state.vizardRunning = true; render();
      try {
        const res = await fetch("/api/vizard/repurpose", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: state.renderUrl, formats: ["tiktok", "reels", "shorts"] })
        });
        if (res.ok) {
          state.vizardResult = await res.json();
          state.syncMessage = `Vizard: ${state.vizardResult.clips?.length || 3} clip variants generated.`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.vizardRunning = false; render();
    });
  }

  // ── Phase 4: Predis AI performance prediction ──
  const predisBtn = document.getElementById("predis-predict-btn");
  if (predisBtn) {
    predisBtn.addEventListener("click", async () => {
      state.predisRunning = true; render();
      const topCreative = creatives[0] || {};
      try {
        const res = await fetch("/api/predis/predict", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creative: topCreative, caption: topCreative.hook || "Top creative", platform: "instagram" })
        });
        if (res.ok) {
          state.predisResult = await res.json();
          state.syncMessage = `Predis AI: ${state.predisResult.prediction?.recommendation || "Prediction complete."}`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.predisRunning = false; render();
    });
  }

  // ── Phase 4: Canva static ad generation ──
  const canvaBtn = document.getElementById("canva-generate-btn");
  if (canvaBtn) {
    canvaBtn.addEventListener("click", async () => {
      state.canvaRunning = true; render();
      const topProduct = products[0] || {};
      try {
        const res = await fetch("/api/canva/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: topProduct.name || "EVICS Product", format: "square" })
        });
        if (res.ok) {
          state.canvaResult = await res.json();
          state.syncMessage = `Canva: ${state.canvaResult.design?.formats_available?.length || 4} static ad formats ready.`;
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.canvaRunning = false; render();
    });
  }

  // ── Phase 4: Gemini Omni video analysis ──
  const geminiBtn = document.getElementById("gemini-analyze-btn");
  if (geminiBtn) {
    geminiBtn.addEventListener("click", async () => {
      if (!state.renderUrl) return;
      state.geminiRunning = true; render();
      try {
        const res = await fetch("/api/gemini/analyze-video", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: state.renderUrl })
        });
        if (res.ok) {
          state.geminiResult = await res.json();
          state.syncMessage = "Gemini Omni: Video analysis complete.";
          state.syncLevel = "connected";
        }
      } catch { /* demo ok */ }
      state.geminiRunning = false; render();
    });
  }

  // ── Creative card bulk select (event delegation) ──
  if (!window.__evicsCreativeDelegatesBound) {
    document.addEventListener("change", (e) => {
      const cb = e.target.closest(".creative-select-cb");
      if (!cb) return;
      const id = Number(cb.dataset.creativeId);
      if (!id) return;
      if (cb.checked) {
        state.selectedCreativeIds.add(id);
      } else {
        state.selectedCreativeIds.delete(id);
      }
      render();
    });

    // ── Bulk action toolbar buttons ──
    document.addEventListener("click", async (e) => {
      if (e.target.id === "bulk-approve-btn") {
        const ids = [...state.selectedCreativeIds];
        state.bulkActionStatus = "approving";
        render();
        for (const id of ids) {
          state.approvals.add(id);
          try {
            await fetch(`${API_BASE}/api/agent/approve-creative`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ creativeId: id })
            });
          } catch { /* demo mode ok */ }
        }
        state.selectedCreativeIds.clear();
        state.bulkActionStatus = `${ids.length} creatives approved.`;
        render();
      } else if (e.target.id === "bulk-queue-btn") {
        const ids = [...state.selectedCreativeIds];
        state.bulkActionStatus = "queueing";
        render();
        for (const id of ids) {
          try {
            await fetch(`${API_BASE}/api/agent/publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ creativeId: id })
            });
          } catch { /* demo mode ok */ }
        }
        state.selectedCreativeIds.clear();
        state.bulkActionStatus = `${ids.length} creatives queued.`;
        render();
      } else if (e.target.id === "bulk-archive-btn") {
        const ids = [...state.selectedCreativeIds];
        state.bulkActionStatus = "archiving";
        render();
        try {
          await fetch(`${API_BASE}/api/agent/library-cleanup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ explicitIds: ids })
          });
        } catch { /* demo mode ok */ }
        state.selectedCreativeIds.clear();
        state.bulkActionStatus = `${ids.length} creatives archived.`;
        render();
      } else if (e.target.id === "bulk-clear-btn") {
        state.selectedCreativeIds.clear();
        state.bulkActionStatus = null;
        render();
      }
    });
    window.__evicsCreativeDelegatesBound = true;
  }

  // ── Elite Quality Rendering Standards: adjustable thresholds + validation ──
  loadPersistedQualityThresholds();

  document.querySelectorAll(".quality-threshold-range").forEach((el) => {
    const key = el.dataset.thresholdKey;
    if (!key || !(key in state.qualityThresholds)) return;
    const onInput = () => {
      state.qualityThresholds[key] = Math.max(0, Math.min(100, Math.round(Number(el.value) || 0)));
      persistQualityThresholds();
      refreshQualityImpactDOM();
    };
    el.addEventListener("input", onInput);
    el.addEventListener("change", onInput);
  });

  document.querySelectorAll(".quality-range[data-quality-key]").forEach((el) => {
    const key = el.dataset.qualityKey;
    if (!key || !(key in state.qualityScores)) return;
    const onInput = () => {
      state.qualityScores[key] = Math.max(0, Math.min(100, Math.round(Number(el.value) || 0)));
      refreshQualityImpactDOM();
    };
    el.addEventListener("input", onInput);
    el.addEventListener("change", onInput);
  });

  const qualityValidateBtn = document.getElementById("quality-validate-btn");
  if (qualityValidateBtn) {
    qualityValidateBtn.addEventListener("click", () => validateQuality(qualityValidateBtn));
  }

  const qualityClearBtn = document.getElementById("quality-clear-result");
  if (qualityClearBtn) {
    qualityClearBtn.addEventListener("click", () => {
      state.qualityResult = null;
      render();
    });
  }

  const qualityResetBtn = document.getElementById("quality-reset-thresholds");
  if (qualityResetBtn) {
    qualityResetBtn.addEventListener("click", () => {
      state.qualityThresholds = { ...QUALITY_DEFAULT_THRESHOLDS };
      persistQualityThresholds();
      render();
    });
  }
}

async function boot() {
  if (!WORKSPACE_SECTIONS.some((section) => section.id === state.currentSection)) {
    state.currentSection = "viral-intelligence";
    try {
      localStorage.setItem("evics_current_section", state.currentSection);
    } catch (e) {
      // ignore storage errors
    }
  }
  syncSectionInUrl(state.currentSection);
  loadPersistedQualityThresholds();
  render();
  await hydrateFromSupabase();
  await hydrateFromServerApi();
  await loadViralGallery();
  await loadMediaLibrary();
  // Pre-load API service configs in background
  loadServicesConfig().catch(() => {
    state.servicesConfig = buildDemoServices();
    state.failoverStatus = buildDemoFailoverStatus(state.servicesConfig);
  });
  render();

  // Background render status polling — every 15s while a render is in progress
  setInterval(() => {
    if (state.renderStatus === "processing" && state.renderStatusUrl) {
      pollRenderStatus(state.renderStatusUrl);
    }
  }, 15000);

  // Real-time evics_renders DB polling — every 10s to surface pending/processing jobs
  setInterval(async () => {
    if (!window.iagtSupabase || !window.iagtSupabase.enabled) return;
    try {
      const rows = await window.iagtSupabase.select(
        "evics_renders",
        "status=in.(pending,processing)&order=created_at.desc&limit=20"
      );
      if (Array.isArray(rows)) {
        state.mediaRenderQueue = rows;
        // If any pending jobs exist and we are idle, surface them in the status bar
        if (rows.length > 0 && state.renderStatus === "idle") {
          state.syncMessage = `${rows.length} render job(s) pending in queue.`;
          render();
        }
      }
    } catch { /* non-fatal — Supabase may be offline */ }
  }, 10000);

  // Surface stuck renders from DB on boot (non-blocking)
  fetch("/api/recovery/pending-renders")
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (data && data.stuckRenders && data.stuckRenders.length > 0) {
        console.info(`[EVICS] ${data.stuckRenders.length} stuck render(s) detected. Check /api/recovery/status.`);
      }
    })
    .catch(() => { /* non-fatal */ });

  // Fetch system health on boot, then auto-refresh every 60s
  async function fetchSystemHealth() {
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (res.ok) {
        state.systemHealth = await res.json();
        state.systemHealthLastFetch = Date.now();
      }
    } catch { /* offline */ }
  }
  fetchSystemHealth();
  setInterval(fetchSystemHealth, 60000);
  setInterval(hydrateHeyGenStatus, 90000);

  async function fetchExcellenceStatus() {
    try {
      const data = await apiFetch("/api/excellence/status");
      state.excellenceStatus = data;
      state.excellenceObjectives = Array.isArray(data.objectives) ? data.objectives : [];
      state.excellenceError = null;
    } catch (error) {
      state.excellenceError = error.message || "A+ status unavailable";
    } finally {
      render();
    }
  }
  fetchExcellenceStatus();
  setInterval(fetchExcellenceStatus, 120000);

  // Fetch scheduler activity log on boot and every 60s
  async function fetchSchedulerLog() {
    state.schedulerLogLoading = true; render();
    try {
      const res = await fetch(`${API_BASE}/api/scheduler/log`);
      if (res.ok) {
        const data = await res.json();
        state.schedulerLog = data.taskLog || data.log || [];
      }
    } catch { /* offline */ } finally {
      state.schedulerLogLoading = false; render();
    }
  }
  fetchSchedulerLog();
  setInterval(fetchSchedulerLog, 60000);

  // Fetch phone app render jobs on boot and every 60s
  async function fetchPhoneRenders() {
    state.phoneRendersLoading = true; render();
    try {
      const res = await fetch(`${API_BASE}/api/renders/phone-app`);
      if (res.ok) {
        const data = await res.json();
        state.phoneRenders = data.renders || [];
      }
    } catch { /* offline */ } finally {
      state.phoneRendersLoading = false; render();
    }
  }
  fetchPhoneRenders();
  setInterval(fetchPhoneRenders, 60000);

  // Wisdom + Community — fetch on boot and every 5 minutes
  async function fetchWisdomDaily() {
    setState({ wisdomLoading: true });
    try {
      const d = await apiFetch('/api/wisdom/daily');
      if (d.wisdom) setState({ wisdomDaily: d, wisdomLoading: false });
      else setState({ wisdomLoading: false });
    } catch { setState({ wisdomLoading: false }); }
  }

  async function fetchCommunityStats() {
    setState({ communityStatsLoading: true });
    try {
      const d = await apiFetch('/api/community/stats');
      if (d.stats) setState({ communityStats: d.stats, communityStatsLoading: false });
      else setState({ communityStatsLoading: false });
    } catch { setState({ communityStatsLoading: false }); }
  }

  async function fetchCommunityFeed() {
    setState({ communityFeedLoading: true });
    try {
      const d = await apiFetch('/api/community/feed?limit=8');
      if (d.feed) setState({ communityFeed: d.feed, communityFeedLoading: false });
      else setState({ communityFeedLoading: false });
    } catch { setState({ communityFeedLoading: false }); }
  }

  fetchWisdomDaily();
  fetchCommunityStats();
  fetchCommunityFeed();
  setInterval(fetchWisdomDaily, 300000);
  setInterval(fetchCommunityStats, 300000);
  setInterval(fetchCommunityFeed, 120000);

  // Wire manual refresh buttons (delegated — panels may not exist yet)
  if (!window.__evicsRefreshDelegatesBound) {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'refresh-scheduler-log-btn') fetchSchedulerLog();
      if (e.target.id === 'refresh-phone-renders-btn') fetchPhoneRenders();
      if (e.target.id === 'refresh-wisdom-btn') fetchWisdomDaily();
      if (e.target.id === 'refresh-community-btn') { fetchCommunityStats(); fetchCommunityFeed(); }
    });
    window.__evicsRefreshDelegatesBound = true;
  }
}

function renderAgentOrchestration() {
  const agents = state.agentStatuses.length > 0 ? state.agentStatuses : [
    { name: "Trend Scout", status: "online", task: "Scanning viral signals", health: 98 },
    { name: "Creative Builder", status: "ready", task: "Waiting for approved hooks", health: 96 },
    { name: "Learning Loop", status: "online", task: "Updating performance memory", health: 94 }
  ];
  const health = state.agentPipelineHealth || 98;

  return `
    <section class="agent-orch-section panel">
      <div class="panel-head compact">
        <div>
          <h2>${icon("gear")} Executive Agent Operations</h2>
          <p>Titanium command layer for scan, build, render, distribute, learn, and improve loops.</p>
        </div>
        <div class="agent-health-badge ${health >= 95 ? "health-excellent" : health >= 80 ? "health-good" : "health-warn"}">
          <i></i> Pipeline Health: <strong>${health}%</strong>
        </div>
      </div>
      <div class="agent-status-grid">
        ${agents.slice(0, 6).map((agent) => `
          <article class="agent-status-card">
            <span>${escapeHtml(agent.status || "ready")}</span>
            <strong>${escapeHtml(agent.name || agent.id || "EVICS Agent")}</strong>
            <p>${escapeHtml(agent.task || agent.currentTask || "Standing by for operator command.")}</p>
            <small>${Number(agent.health || health || 98)}% readiness</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderApiManagementSummary() {
  const services = (Array.isArray(state.servicesConfig) && state.servicesConfig.length > 0)
    ? state.servicesConfig
    : buildDemoServices();
  const statusBadge = window.__evicsRenderers?.serviceStatusBadge || ((status) => `<span class="svc-status-badge">${status || "Unknown"}</span>`);
  const usageBar = window.__evicsRenderers?.tokenBar || ((pct) => `<div class="token-bar-track"><div class="token-bar-fill" style="width:${Math.min(100, pct || 0)}%"></div></div>`);
  const active = services.filter((svc) => svc.enabled).length;
  const missingKeys = services.filter((svc) => !svc.hasKey).length;
  const healthy = services.filter((svc) => svc.status === "healthy").length;
  const alerts = Array.isArray(state.alerts) ? state.alerts.filter((a) => !a.acknowledged).length : 0;
  const failoverCount = Array.isArray(state.failoverLog) ? state.failoverLog.length : 0;

  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>${icon("shield")} API Management</h2>
        <p>Track keys, token posture, and failover readiness across every connected service.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Connected APIs", String(active), `${services.length} configured`)}
        ${metric("Missing keys", String(missingKeys), missingKeys > 0 ? "needs attention" : "all keys present")}
        ${metric("Healthy services", String(healthy), "primary routes ready")}
        ${metric("Open alerts", String(alerts), alerts > 0 ? "review soon" : "all clear")}
      </section>

      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head compact">
            <div>
              <h2>Service Health Snapshot</h2>
              <p>Primary and backup providers at a glance.</p>
            </div>
          </div>
          <div class="api-snapshot-list">
            ${services.slice(0, 6).map((svc) => `
              <div class="api-snapshot-row">
                <div>
                  <strong>${svc.name}</strong>
                  <span>${svc.category}</span>
                </div>
                <div class="api-snapshot-status">
                  ${statusBadge(svc.status)}
                  ${svc.limit !== null ? usageBar(svc.pct || 0, svc.status) : `<span class="api-snapshot-unlimited">Unlimited</span>`}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head compact">
            <div>
              <h2>Failover Posture</h2>
              <p>${state.failoverMode ? "Auto-failover is armed." : "Manual oversight is active."}</p>
            </div>
          </div>
          <div class="api-posture-grid">
            ${metric("Mode", state.failoverMode ? "Armed" : "Off", state.failoverMode ? "automatic fallback live" : "operator-controlled")}
            ${metric("Switches", String(failoverCount), "tracked handoffs")}
          </div>
          <div class="empty" style="margin-top:12px">${escapeHtml(state.syncMessage || "Connect sources to unlock live API telemetry.")}</div>
        </div>
      </section>
    </div>
  `;
}

function renderWorkspaceShell() {
  const renderers = window.__evicsRenderers || {};
  const renderSection = (name) => {
    const renderer = renderers[name];
    if (typeof renderer === "function") return renderer();
    return `
      <div class="section-content">
        <div class="panel">
          <div class="section-intro">
            <h2>${icon("radar")} Workspace module loading</h2>
            <p>The Titanium workspace is initializing this module. Refresh if this persists.</p>
          </div>
        </div>
      </div>
    `;
  };
  const sections = WORKSPACE_SECTIONS;
  const sectionIds = sections.map((section) => section.id);
  const activeSection = sectionIds.includes(state.currentSection) ? state.currentSection : "viral-intelligence";
  const sectionDef = sections.find((section) => section.id === activeSection) || sections[0];
  const sectionIndex = sections.findIndex((section) => section.id === activeSection);
  const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;
  const sectionContent = (() => {
    if (activeSection === "viral-intelligence") return renderSection("renderViralIntelligence");
    if (activeSection === "ai-reconstruction") return renderSection("renderAiReconstruction");
    if (activeSection === "video-generation") return renderSection("renderVideoGeneration");
    if (activeSection === "media-output") return renderSection("renderMediaOutputCenter");
    if (activeSection === "distribution") return renderSection("renderDistribution");
    if (activeSection === "analytics") return renderSection("renderAnalytics");
    if (activeSection === "executive-workspace") return renderSection("renderExecutiveWorkspace");
    return renderSection("renderViralIntelligence");
  })();

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">EVICS</div>
        <div>
          <strong>I AM GENESIS TECH</strong>
          <span>ELITE VIRAL INTELLIGENCE CONTROL SYSTEM</span>
        </div>
      </div>

      <nav>
        ${sections.map((section) => `
          <button data-section="${section.id}" class="${section.id === activeSection ? "active" : ""}" title="${section.desc}">
            ${icon(section.icon)}
            <div>
              <strong>${section.label}</strong>
              <small>${section.desc}</small>
            </div>
          </button>
        `).join("")}
      </nav>

      <div class="automation-card">
        <span>Workspace posture</span>
        <strong>${state.dataSource === "Demo" ? "Demo intelligence stack" : "Live intelligence stack"}</strong>
        <div class="pulse-row">
          <i></i>
          <span>${escapeHtml(state.syncMessage || "Ready for operator input.")}</span>
        </div>
      </div>
    </aside>

    <main>
      <div class="topbar">
        <div class="workspace-hero">
          <p class="workspace-eyebrow">ELITE VIRAL INTELLIGENCE CONTROL SYSTEM</p>
          <h1>${sectionDef.label}</h1>
          <p>${sectionDef.desc}</p>
        </div>

        <div class="top-actions">
          <div class="filters">
            <button class="ghost" id="nav-prev-section" ${prevSection ? `data-target-section="${prevSection.id}"` : "disabled"}>← Prev</button>
            <button class="ghost" id="nav-next-section" ${nextSection ? `data-target-section="${nextSection.id}"` : "disabled"}>Next →</button>
            <button class="ghost" id="pipeline-autonomous-run">${icon("gear")} Autonomous Run</button>
          </div>
          <div class="sync-status ${state.syncLevel || "demo"}">
            <b>${state.syncLevel === "connected" ? "Live sync" : state.syncLevel === "loading" ? "Syncing" : "Demo mode"}</b>
            <span>${escapeHtml(state.syncMessage || "Workspace ready.")}</span>
          </div>
          <button class="ghost" id="connect-sources-btn">${icon("key")} Connect Sources</button>
        </div>
      </div>

      ${activeSection === "viral-intelligence" ? `
      <section class="metrics-grid shell-metrics">
        ${metric("Source", state.dataSource || "Demo", state.syncLevel === "connected" ? "live data online" : "sample intelligence")}
        ${metric("Viral scans", Number(state.scanCount || 0).toLocaleString(), "ads processed")}
        ${metric("Creative queue", String((state.mediaRenderQueue && state.mediaRenderQueue.length) || 0), "awaiting render")}
      </section>
      ` : ""}

      ${sectionContent}

      ${activeSection === "viral-intelligence" ? `
        ${renderSection("renderAgentOrchestration")}
        ${renderSection("renderPublishedMediaGallery")}
        ${renderSection("renderAnalyticsDashboard")}
        ${renderSection("renderQualityValidator")}
      ` : ""}
    </main>

    ${renderVpAssistant()}
  `;
}

const __evicsOriginalRender = render;
render = function () {
  __evicsOriginalRender();
  const result = renderWorkspaceShell();
  const app = document.getElementById("app");
  if (app && typeof result === "string") {
    app.innerHTML = result;
    registerExecControls(app);
    bindExecControlLiveStates(app);
  }
  bindEvents();
  if (state.currentSection === "media-output" && typeof window.loadMediaOutputs === "function") {
    const mediaState = window.mocState || {};
    const items = Array.isArray(mediaState.items) ? mediaState.items : [];
    if (!mediaState.loading && items.length === 0) {
      window.loadMediaOutputs();
    }
  }
  if ((state.currentSection === "media-output" || state.currentSection === "video-generation" || state.currentSection === "executive-workspace") && typeof window.bindMediaOutputCenter === "function") {
    window.bindMediaOutputCenter();
  }
  return result;
};

boot();
