const videoTypeStorageKey = "evicsVideoTypeSelections";

const state = {
  activeSection: "command",
  showCopilot: false,
  workspaceMode: "Executive Simple Mode",
  showAdvancedOptions: false,
  category: "All",
  platform: "All",
  productCategory: "All",
  productSearch: "",
  showSelectedProductsOnly: false,
  productSyncMessage: "",
  campaignGoal: "Conversions",
  campaignTone: "Premium UGC",
  campaignOffer: "Build your daily wellness ritual",
  campaignPlatform: "Auto",
  simpleVideoLength: "30 seconds",
  simpleAudience: "Premium supplement buyers",
  autopilotMode: "Assisted",
  autopilotMessage: "Twin Agents are standing by.",
  agentRunLog: [],
  exceptions: [],
  queueMode: "Ready",
  selectedAdId: "ad-001",
  selectedProducts: new Set(),
  approvals: new Set(["cr-001", "cr-003"]),
  dataSource: "Live",
  syncLevel: "connected",
  syncMessage: "Live data is connected and flowing.",
  workflowMessage: "Select products, generate ad concepts, approve winners, then export copy.",
  evidence: {
    shopifyConfigured: false,
    supabaseConfigured: false,
    syncedProductCount: 0,
    brandProfileCount: 0,
    lastChecked: "Not checked"
  },
  systemStatus: null,
  connections: [],
  mediaOps: null,
  mediaView: "grid",
  mediaSearch: "",
  mediaFilter: "All",
  selectedMediaId: "",
  selectedMediaRecord: null,
  selectedMediaLoading: false,
  selectedMediaError: "",
  videoTypeSelections: loadVideoTypeSelections(),
  founderStoryAngle: "Founder Legacy Story",
  founderStoryTone: "Inspirational",
  brandProfileMessage:
    "Brand-specific values are editable configuration so the system can be reused, resold, licensed, or white-labeled."
};

const defaultBrandProfile = {
  companyName: "Configured Company",
  publicBrandName: "Configured Brand",
  legalBusinessName: "Configured Legal Business",
  storeUrl: "",
  shopifyStoreHandle: "",
  brandTagline: "Premium ecommerce brand",
  brandMission: "Help customers build consistent wellness rituals with premium supplement products.",
  brandVoice: "Premium, trustworthy, clear, mission-driven, and performance-minded.",
  founderStory:
    "The company's founder story, brand origin, mission, legacy, purpose, and performance message should be configured here.",
  customerPromise: "Give customers clear, compliant, high-quality wellness education and product experiences.",
  primaryBrandColor: "#17201b",
  secondaryBrandColor: "#1f6b4b",
  accentColor: "#b9904b",
  logoUrl: "",
  defaultProductCategories: ["Premium supplement", "Beauty wellness", "Sleep recovery"],
  approvedClaims: ["Supports daily wellness routines"],
  restrictedClaims: ["Disease treatment claims", "Guaranteed results"],
  requiredDisclaimers: ["These statements have not been evaluated by the Food and Drug Administration."],
  approvedCtas: ["Shop now", "Build your wellness ritual"],
  preferredVisualStyles: ["Premium UGC", "Luxury routine", "Clinical trust"],
  preferredVoiceoverStyles: ["Inspirational", "Premium", "Trustworthy"],
  defaultRenderProvider: "HeyGen",
  defaultExportFormats: ["Script", "Storyboard", "CTA variants", "Compliance notes"]
};

const brandStorageKey = "evieBrandProfiles";
const selectedBrandStorageKey = "evieSelectedBrandProfileId";
let brandProfiles = loadBrandProfiles();
let brandProfile = activeBrandProfile();

const workspaceModes = [
  "Executive Simple Mode",
  "Creator Mode",
  "Automation Mode",
  "Advanced Strategist Mode",
  "Compliance Review Mode",
  "Developer / Admin Mode"
];

const executiveSimpleSteps = [
  "Pick product",
  "Pick commercial style",
  "Pick video length",
  "Pick audience",
  "Generate script",
  "Review output",
  "Send to render/export"
];

const founderStoryAngles = [
  "Company Origin Story",
  "Founder Legacy Story",
  "Family Legacy Achievement",
  "Mission-Driven Brand Story",
  "Purpose and Performance",
  "Health Starts Within",
  "Business Ownership",
  "Built for the Next Generation",
  "Community Wellness",
  "Premium Supplement Mission",
  "Customer Transformation Story",
  "Brand Trust Story",
  "Faith / Purpose-Inspired Story",
  "Overcoming Challenges",
  "Innovation and Wellness",
  "From Idea to Impact",
  "Product Quality Commitment",
  "Founder Promise",
  "Corporate Vision Story"
];

const founderStoryTones = [
  "Inspirational",
  "Emotional",
  "Premium",
  "Documentary",
  "Powerful",
  "Warm",
  "Legacy-Focused",
  "Purpose-Driven",
  "Corporate",
  "Trustworthy",
  "Mission-Oriented",
  "Luxury",
  "Educational",
  "Community-Focused",
  "Transformational"
];

const videoTypeOptions = ["Avatar video", "Faceless video", "Founder-led video", "UGC video", "Product demo"];

const manualWorkflowSteps = [
  "Open the Marketing Intelligence Studio.",
  "Click Pattern Library.",
  "Search a product category such as men's health performance, beauty wellness, sleep recovery, or premium supplement.",
  "Save a strong commercial format.",
  "Click Use in EVIE.",
  "Select a product/SKU.",
  "Choose a video style such as 30-second transformation wellness ad.",
  "Click Generate.",
  "Review the script, storyboard, CTA, and compliance notes.",
  "Export to HeyGen, Canva, Runway, CapCut, or the selected render/export provider."
];

function loadBrandProfiles() {
  const defaults = (window.EVIE_BRAND_PROFILES && window.EVIE_BRAND_PROFILES.length
    ? window.EVIE_BRAND_PROFILES
    : [window.EVIE_BRAND_PROFILE || defaultBrandProfile]
  ).map((profile, index) => normalizeBrandProfile(profile, index));

  try {
    const saved = JSON.parse(localStorage.getItem(brandStorageKey) || "[]");
    if (Array.isArray(saved) && saved.length) {
      return saved.map((profile, index) => normalizeBrandProfile(profile, index));
    }
  } catch (error) {
    console.warn("Brand profile storage could not be read.", error);
  }

  return defaults;
}

function normalizeBrandProfile(profile, index = 0) {
  const normalized = { ...defaultBrandProfile, ...(profile || {}) };
  normalized.id = normalized.id || `brand-profile-${index + 1}`;
  normalized.profileName = normalized.profileName || normalized.publicBrandName || normalized.companyName;
  return normalized;
}

function activeBrandProfile() {
  const selectedId = localStorage.getItem(selectedBrandStorageKey);
  return brandProfiles.find((profile) => profile.id === selectedId) || brandProfiles[0];
}

function saveBrandProfiles() {
  localStorage.setItem(brandStorageKey, JSON.stringify(brandProfiles));
  localStorage.setItem(selectedBrandStorageKey, brandProfile.id);
  return persistBrandProfilesToServer();
}

function selectBrandProfile(id) {
  const nextProfile = brandProfiles.find((profile) => profile.id === id);
  if (!nextProfile) return;

  brandProfile = nextProfile;
  state.campaignTone = brandProfile.preferredVisualStyles[0] || state.campaignTone;
  state.brandProfileMessage = `${brandProfile.profileName} selected.`;
  saveBrandProfiles();
}

function loadVideoTypeSelections() {
  try {
    const saved = JSON.parse(localStorage.getItem(videoTypeStorageKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch (error) {
    console.warn("Video type selections could not be read.", error);
    return {};
  }
}

function saveVideoTypeSelections() {
  localStorage.setItem(videoTypeStorageKey, JSON.stringify(state.videoTypeSelections || {}));
}

function inferVideoType(item) {
  const text = `${item.title || ""} ${item.description || ""} ${item.metadata_json?.productName || ""}`.toLowerCase();
  if (/faceless|voiceover|voice over|screen text|text-led/.test(text)) return "Faceless video";
  if (/avatar|founder|talking head|presenter/.test(text)) return "Avatar video";
  if (/product demo|demo|mockup/.test(text)) return "Product demo";
  if (/ugc|ugc-style|ugc style/.test(text)) return "UGC video";
  return "Founder-led video";
}

function mediaWorkflowStage(item) {
  if (!item) return "No render yet";
  if (item.delivery_status === "delivered") return "Delivered";
  if (item.publish_status === "published") return "Published";
  if (item.approval_status === "approved") return "Approved / ready to publish";
  if (item.render_status === "complete") return "Rendered / awaiting approval";
  if (item.render_status === "rendering") return "Rendering";
  if (item.render_status === "failed") return "Render failed / rework";
  if (item.render_status === "rework") return "Rework requested";
  if (item.render_status === "queued") return "Queued for render";
  return item.render_status || "Awaiting render";
}

function renderVideoTypeSelect(item) {
  const selectedType = state.videoTypeSelections[item.id] || item.metadata_json?.videoType || inferVideoType(item);
  return `
    <label class="video-type-select">
      <span>Video Type</span>
      <select data-video-type-select data-video-id="${escapeAttr(item.id)}">
        ${videoTypeOptions.map((option) => `<option ${option === selectedType ? "selected" : ""}>${option}</option>`).join("")}
      </select>
      <small data-video-type-label="${escapeAttr(item.id)}">${escapeText(selectedType)}</small>
    </label>
  `;
}

function updateBrandProfileField(key, value) {
  brandProfile[key] = value;
  if (key === "publicBrandName" || key === "companyName") {
    brandProfile.profileName = brandProfile.publicBrandName || brandProfile.companyName || brandProfile.profileName;
  }
  brandProfiles = brandProfiles.map((profile) => (profile.id === brandProfile.id ? brandProfile : profile));
  saveBrandProfiles();
}

function duplicateBrandProfile() {
  const copy = {
    ...brandProfile,
    id: `brand-profile-${Date.now()}`,
    profileName: `${brandProfile.profileName || brandProfile.publicBrandName} Copy`
  };
  brandProfiles = [...brandProfiles, copy];
  brandProfile = copy;
  saveBrandProfiles();
  state.brandProfileMessage = `${copy.profileName} created and selected.`;
}

async function hydrateBrandProfilesFromServer() {
  try {
    const response = await fetch("/api/brand-profile/get", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Brand profile service unavailable.");

    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.profiles) || !payload.profiles.length) return;

    brandProfiles = payload.profiles.map((profile, index) => normalizeBrandProfile(profile, index));
    brandProfile = brandProfiles.find((profile) => profile.id === payload.selectedProfileId) || brandProfiles[0];
    localStorage.setItem(brandStorageKey, JSON.stringify(brandProfiles));
    localStorage.setItem(selectedBrandStorageKey, brandProfile.id);
    state.brandProfileMessage = `${brandProfile.profileName} loaded from EVICS storage.`;
  } catch (error) {
    state.brandProfileMessage = "Brand profiles are using browser storage until the EVICS server is available.";
    console.warn("Brand profile API unavailable.", error);
  }
}

async function persistBrandProfilesToServer() {
  try {
    const response = await fetch("/api/brand-profile/update", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile: brandProfile,
        selectedProfileId: brandProfile.id
      })
    });

    if (!response.ok) throw new Error("Brand profile save failed.");
    return true;
  } catch (error) {
    console.warn("Brand profile could not be saved to EVICS storage.", error);
    return false;
  }
}

const seedPatternLibrary = [
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
  { name: "Sea Moss Mineral Gel", category: "Sea moss", score: 96, angle: "daily mineral ritual" },
  { name: "Metabolic Ignite", category: "Weight loss", score: 91, angle: "morning reset" },
  { name: "Genesis Glow Collagen", category: "Beauty", score: 88, angle: "skin confidence" },
  { name: "Apex Testosterone Support", category: "Testosterone", score: 86, angle: "training foundation" },
  { name: "NeuroRise Focus", category: "Nootropics", score: 82, angle: "clean productive energy" }
];

let creatives = [
  {
    id: "cr-001",
    status: "Ready",
    product: "Sea Moss Mineral Gel",
    format: "UGC TikTok",
    hook: "Nobody tells you minerals can change your whole morning.",
    asset: "9:16 video, subtitles, thumbnail",
    channel: "TikTok + Reels",
    score: 94
  },
  {
    id: "cr-002",
    status: "Review",
    product: "Genesis Glow Collagen",
    format: "Luxury routine",
    hook: "The glow routine that finally feels premium.",
    asset: "9:16 lifestyle edit, caption set",
    channel: "Instagram + Pinterest",
    score: 89
  },
  {
    id: "cr-003",
    status: "Ready",
    product: "NeuroRise Focus",
    format: "Founder desk UGC",
    hook: "I stopped treating my focus like a willpower problem.",
    asset: "Script, HeyGen prompt, CTA variants",
    channel: "YouTube Shorts + X",
    score: 87
  },
  {
    id: "cr-004",
    status: "Draft",
    product: "Apex Testosterone Support",
    format: "Gym commercial",
    hook: "Your training does not need more hype. It needs foundation.",
    asset: "Runway prompt, shot list",
    channel: "TikTok + Facebook",
    score: 81
  }
];

let workflow = [
  ["6:00 AM", "Scrape viral content", "TikTok, Reels, Shorts, Ads Library, Pinterest, X"],
  ["6:30 AM", "Analyze winning structures", "Hooks, pacing, CTAs, visual patterns, emotional tags"],
  ["7:00 AM", "Match products", "Connect trends to the configured brand products and offers"],
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

const appConnections = [
  ["Shopify", "Connected", "Products and product links"],
  ["Supabase", "Connected", "Workspace data and queues"],
  ["Canva", "Pending", "Static ads, thumbnails, carousels"],
  ["HeyGen", "Pending", "Avatar and founder-style UGC videos"],
  ["Runway", "Pending", "Lifestyle video generation"],
  ["Kling", "Pending", "Cinematic short video variants"],
  ["OpenAI", "Pending", "Scripts, captions, prompts, image concepts"],
  ["Social Publishing", "Pending", "TikTok, Reels, Shorts, Pinterest, Facebook"]
];

const twinAgents = [
  ["Trend Scout Twin", "Ready", "Finds viral content patterns and winning structures"],
  ["Product Match Twin", "Ready", "Pairs trends with synced Shopify products"],
  ["Script Writer Twin", "Pending", "Creates hooks, captions, scripts, and variants"],
  ["Visual Director Twin", "Pending", "Builds image, video, thumbnail, and shot prompts"],
  ["Canva Twin", "Pending", "Turns briefs into graphics, mockups, and carousels"],
  ["Video Twin", "Pending", "Prepares HeyGen, Runway, and Kling production briefs"],
  ["QA Compliance Twin", "Pending", "Checks supplement claims and required disclaimers"],
  ["Publisher Twin", "Pending", "Schedules approved content into channels"],
  ["Learning Twin", "Pending", "Reads performance and updates winning patterns"]
];

const exceptionRules = [
  "Missing Shopify product URL",
  "Risky supplement or disease claim",
  "Missing product image",
  "Low product fit score",
  "Publishing app not connected"
];

const buildBacklog = [
  ["Production hosting", "Deployment checklist and Render config are ready; choose host and set env vars"],
  ["Canva connector", "Create or push approved static briefs into Canva"],
  ["Video connectors", "Send approved video briefs into HeyGen, Runway, and Kling"],
  ["Publishing connectors", "Connect TikTok, Instagram, YouTube Shorts, Pinterest, Facebook"],
  ["Compliance memory", "Save approved supplement-safe wording rules"],
  ["Analytics loop", "Track views, clicks, add-to-cart, conversion, and revenue"],
  ["SMS credentials", "Later: locate Twilio credentials for EVICS phone alerts"]
];

async function hydrateFromSupabase() {
  state.syncMessage = "Browser-direct Supabase reads are disabled. UI reads use EVICS backend routes.";
}

async function hydrateFromServerApi() {
  try {
    const response = await fetch("/api/media/products", {
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

async function refreshEvidence() {
  try {
    const [systemResponse, productsResponse, profilesResponse] = await Promise.all([
      fetch("/api/agents/system-status", { headers: { Accept: "application/json" } }),
      fetch("/api/media/products", { headers: { Accept: "application/json" } }),
      fetch("/api/brand-profile/get", { headers: { Accept: "application/json" } }),
    ]);

    const status = systemResponse.ok ? await systemResponse.json() : {};
    const productPayload = productsResponse.ok ? await productsResponse.json() : { count: 0 };
    const profilePayload = profilesResponse.ok ? await profilesResponse.json() : { profiles: [] };
    state.systemStatus = status.success ? status : null;

    state.evidence = {
      shopifyConfigured: Number(productPayload.count || 0) > 0,
      supabaseConfigured: Boolean(status.success),
      syncedProductCount: Number(productPayload.count || 0),
      brandProfileCount: Array.isArray(profilePayload.profiles) ? profilePayload.profiles.length : 0,
      lastChecked: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };
    state.connections = Array.isArray(status.providers) ? status.providers.map((item) => ({
      name: item.provider,
      status: item.ready ? "Ready" : item.configured ? "Setup needed" : "Missing",
      purpose: `${item.setupError || "Render provider"} / Active jobs: ${item.activeJobs || 0}`
    })) : [];
  } catch (error) {
    state.evidence.lastChecked = "Check failed";
    console.warn("Evidence refresh failed.", error);
  }
}

async function postMedia(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body || {})
    });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "Media operation failed.");
    if (payload.state) {
      applyMediaOpsState(payload.state);
    }
    if (payload.media) {
      mergeMediaRecord(payload.media);
      state.selectedMediaId = payload.media.id || state.selectedMediaId;
      state.selectedMediaRecord = payload.media;
    }
    if (state.selectedMediaId) {
      await hydrateSelectedMediaOutput(state.selectedMediaId, { silent: true });
    }
    state.workflowMessage = "Media operations updated.";
  } catch (error) {
    state.workflowMessage = error.message || "Media operation failed.";
  }
  render();
}

async function createMediaOutputFromSelection(source = "manual") {
  const product = primaryMediaProduct();
  const productName = product.name || "Shopify Product";
  const originSectionId = state.activeSection || "media-output-center";
  await postMedia("/api/media/create", {
    title: `${productName} Video ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
    description: `EVICS video output prepared for ${productName}.`,
    mediaType: "video",
    createdSource: source,
    originSectionId,
    campaignId: slug(productName),
    productUrl: product.productUrl || "",
    targetPlatforms: ["TikTok", "Instagram"],
    durationSeconds: 30,
    width: 1080,
    height: 1920,
    metadata: {
      productName,
      originSectionId,
      productSource: product.source || "workspace"
    }
  });
}

async function createMediaFromLegacy(input = {}) {
  const response = await fetch("/api/media/create", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: input.title || "Legacy Generated Video Draft",
      description: input.script || input.description || "",
      mediaType: "video",
      createdSource: "legacy",
      campaignId: input.campaignId || "legacy-generated",
      productUrl: input.productUrl || "",
      targetPlatforms: input.targetPlatforms || ["TikTok", "Instagram", "YouTube"],
      durationSeconds: input.durationSeconds || 30,
      width: input.width || 1080,
      height: input.height || 1920,
      readinessScore: input.readinessScore || 80,
      tags: ["legacy-input", "strict-pipeline-draft", ...(input.tags || [])],
      metadata: {
        ...(input.metadata || {}),
        sourceSystem: "legacy-evics",
        strictPipelineRequired: true,
        script: input.script || input.description || ""
      },
      actor: input.actor || "legacy-app"
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Legacy output could not enter the strict pipeline.");
  }
  if (payload.media) mergeMediaRecord(payload.media);
  return payload.media;
}

async function submitRenderJob(provider = "heygen", mediaId = "") {
  try {
    const response = await fetch(`/api/render/${encodeURIComponent(provider)}/submit`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mediaId, actor: "owner-admin", originSectionId: state.activeSection || "media-output-center" })
    });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "Render submit failed.");
    state.workflowMessage = payload.job?.configured
      ? `${payload.job.provider} render job submitted: ${payload.job.jobId}.`
      : payload.job?.error || `${payload.job?.provider || provider} is not configured.`;
    await hydrateMediaOps();
  } catch (error) {
    state.workflowMessage = error.message || "Render submit failed.";
  }
  render();
}

async function hydrateMediaOps() {
  try {
    const response = await fetch("/api/media/state", { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (payload.success) {
      applyMediaOpsState(payload.state);
      if (state.selectedMediaId) {
        await hydrateSelectedMediaOutput(state.selectedMediaId, { silent: true });
      }
    }
  } catch (error) {
    console.warn("Media operations state unavailable.", error);
  }
}

function applyMediaOpsState(nextMediaOps) {
  state.mediaOps = nextMediaOps || state.mediaOps;
  const media = state.mediaOps?.media || [];
  const selectedStillExists = media.some((item) => item.id === state.selectedMediaId);

  if (!state.selectedMediaId || !selectedStillExists) {
    state.selectedMediaId = media[0]?.id || "";
    state.selectedMediaRecord = null;
  }
}

function mergeMediaRecord(mediaRecord) {
  if (!mediaRecord?.id) return;
  const current = state.mediaOps || { media: [] };
  const existing = Array.isArray(current.media) ? current.media : [];
  const index = existing.findIndex((item) => item.id === mediaRecord.id);
  const nextMedia = index >= 0
    ? existing.map((item) => (item.id === mediaRecord.id ? { ...item, ...mediaRecord } : item))
    : [mediaRecord, ...existing];

  state.mediaOps = { ...current, media: nextMedia };
}

async function hydrateSelectedMediaOutput(mediaId, options = {}) {
  const selectedId = String(mediaId || "").trim();
  if (!selectedId) {
    state.selectedMediaId = "";
    state.selectedMediaRecord = null;
    return;
  }

  state.selectedMediaId = selectedId;
  state.selectedMediaError = "";
  state.selectedMediaLoading = !options.silent;
  if (!options.silent) render();

  try {
    const response = await fetch(`/api/media/${encodeURIComponent(selectedId)}`, {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.error || "Selected media output unavailable.");

    state.selectedMediaRecord = payload.media;
    mergeMediaRecord(payload.media);
  } catch (error) {
    state.selectedMediaError = error.message || "Selected media output could not be loaded.";
  } finally {
    state.selectedMediaLoading = false;
    if (!options.silent) render();
  }
}

async function syncProductsFromShopify() {
  state.dataSource = "Shopify sync";
  state.syncLevel = "loading";
  state.syncMessage = "Syncing Shopify products...";
  state.productSyncMessage = "Reading Shopify catalog.";
  render();

  try {
    const syncResponse = await fetch("/api/media/products/sync", {
      method: "POST",
      headers: { Accept: "application/json" }
    });
    const syncPayload = await syncResponse.json();

    if (!syncResponse.ok || !syncPayload.success) {
      throw new Error(syncPayload.error || "Shopify sync failed.");
    }

    const productsResponse = await fetch("/api/media/products", { headers: { Accept: "application/json" } });
    const productsPayload = await productsResponse.json();

    if (productsPayload.success && productsPayload.products?.length) {
      products = productsPayload.products.map(mapShopifyProduct);
    }

    await refreshEvidence();
    state.dataSource = "Shopify + Supabase";
    state.syncLevel = "connected";
    state.syncMessage = `${syncPayload.synced} Shopify products synced.`;
    state.productSyncMessage = `Last sync imported ${syncPayload.synced} products.`;
    state.selectedProducts = new Set();
  } catch (error) {
    await refreshEvidence();
    state.syncLevel = "error";
    state.syncMessage = state.evidence.shopifyConfigured ? "Shopify sync failed." : "Shopify credentials are not configured.";
    state.productSyncMessage = error.message || "Could not sync Shopify products.";
    console.error(error);
  }

  render();
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
    structure: row.structure || []
  };
}

function scriptToHook(script = "") {
  const clean = String(script || "").replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "Live signal available. Build a stronger hook before generation.";
  const sentence = clean.split(/[.!?]/).map((value) => value.trim()).find(Boolean) || clean;
  return sentence.slice(0, 120);
}

function scoreLiveSignal(item = {}, index = 0) {
  const quality = Number(item.quality_score || 0);
  const status = String(item.render_status || "").toLowerCase();
  const approved = String(item.approval_status || "").toLowerCase() === "approved";
  const renderBonus = status === "complete" ? 12 : status === "rendering" ? 6 : 0;
  const approvalBonus = approved ? 10 : 0;
  const freshnessBonus = Math.max(0, 8 - index);
  return Math.max(45, Math.min(98, Math.round(quality * 0.8 + renderBonus + approvalBonus + freshnessBonus)));
}

function discoveryLibrary() {
  const media = Array.isArray(state.mediaOps?.media) ? state.mediaOps.media : [];
  const liveSignals = media
    .filter((item) => String(item.media_type || "").toLowerCase() === "video")
    .slice(0, 24)
    .map((item, index) => {
      const metadata = item.metadata_json || {};
      const sourceType = String(item.created_source || "workspace");
      const platforms = Array.isArray(item.target_platforms_json) ? item.target_platforms_json : [];
      const platform = platforms[0] || metadata.sourcePlatform || "Live";
      const category = metadata.productName || metadata.productSku || item.campaign_id || "Live campaign";
      const tags = [
        item.render_status || "queued",
        item.delivery_status || "pending",
        sourceType
      ];
      return {
        id: `live-${item.id}`,
        platform,
        category,
        title: item.title || "Live creative signal",
        hook: scriptToHook(metadata.script || metadata.spokenScript || item.description || ""),
        views: Math.max(1000, Number(item.render_sequence || 0) * 2500 + index * 1200),
        engagement: Number((Math.max(3.2, Number(item.quality_score || 72) / 8)).toFixed(1)),
        velocity: scoreLiveSignal(item, index),
        conversion: Math.max(55, Math.min(95, Math.round((Number(item.ver_score || 68) + Number(item.quality_score || 70)) / 2))),
        cta: "Shop now",
        tags,
        productMatch: metadata.productName || "Matched product pending",
        emotion: "Performance confidence",
        structure: ["Hook", "Proof", "Product reveal", "CTA"],
        sourceType: "live"
      };
    });

  const seedSignals = seedPatternLibrary.map((item) => ({
    ...item,
    sourceType: "seed"
  }));

  const merged = liveSignals.length ? [...liveSignals, ...seedSignals.slice(0, 6)] : seedSignals;
  return merged.sort((a, b) => Number(b.velocity || 0) - Number(a.velocity || 0));
}

function mapProduct(row) {
  return {
    id: row.id || row.shopify_product_id || row.name,
    name: row.name || "Unnamed product",
    category: row.category || "General",
    score: Number(row.score || 0),
    angle: row.angle || "",
    imageUrl: row.image_url || "",
    productUrl: row.product_url || "",
    source: row.source || "supabase"
  };
}

function mapShopifyProduct(row) {
  return {
    id: row.id || row.title,
    name: row.title || "Unnamed Shopify product",
    category: row.product_type || "Shopify",
    score: 75,
    angle: buildProductAngle(row.product_type, row.title, row.tags),
    imageUrl: row.image_url || "",
    productUrl: row.handle && brandProfile.storeUrl ? `${brandProfile.storeUrl.replace(/\/$/, "")}/products/${row.handle}` : "",
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

function primaryMediaProduct() {
  const selected = selectedProducts()[0] || products[0] || null;
  if (!selected) return { name: "EVICS Product", productUrl: "" };
  return selected;
}

function slug(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function mapCreative(row) {
  return {
    id: row.id,
    status: row.status || "Draft",
    product: row.product || "Unassigned product",
    format: row.format || "Creative",
    hook: row.hook || "",
    asset: row.asset || "",
    channel: row.channel || "",
    score: Number(row.score || 0),
    approved: Boolean(row.approved),
    exportPayload: row.export_payload || {}
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

function icon(name) {
  const paths = {
    radar: '<circle cx="12" cy="12" r="3"/><path d="M3 12a9 9 0 0 1 9-9"/><path d="M12 21a9 9 0 0 0 9-9"/><path d="m12 12 6-6"/>',
    spark: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    video: '<path d="m16 13 5 3V8l-5 3Z"/><rect x="3" y="6" width="13" height="12" rx="2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
    gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M4 12h2m12 0h2M12 4v2m0 12v2m5.66-13.66-1.42 1.42M7.76 16.24l-1.42 1.42m0-11.32 1.42 1.42m8.48 8.48 1.42 1.42"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    filter: '<path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function selectedAd() {
  const items = discoveryLibrary();
  return items.find((ad) => ad.id === state.selectedAdId) || items[0];
}

function filteredAds() {
  return discoveryLibrary().filter((ad) => {
    const categoryMatch = state.category === "All" || ad.category === state.category;
    const platformMatch = state.platform === "All" || ad.platform === state.platform;
    return categoryMatch && platformMatch;
  });
}

function filteredCreatives() {
  return creatives.filter((item) => state.queueMode === "All" || item.status === state.queueMode);
}

function selectedProducts() {
  const selected = products.filter((product) => state.selectedProducts.has(product.name));
  return selected.length ? selected : products.slice(0, 5);
}

function filteredProducts() {
  const query = state.productSearch.trim().toLowerCase();

  return products.filter((product) => {
    const categoryMatch = state.productCategory === "All" || product.category === state.productCategory;
    const searchMatch = !query || `${product.name} ${product.category} ${product.angle}`.toLowerCase().includes(query);
    const selectedMatch = !state.showSelectedProductsOnly || state.selectedProducts.has(product.name);
    return categoryMatch && searchMatch && selectedMatch;
  });
}

function approvedCreatives() {
  return creatives.filter((item) => state.approvals.has(item.id));
}

function productBuyNowBlock(product) {
  const productUrl = product.productUrl || "";
  return {
    label: "Buy Now",
    url: productUrl,
    message: "Please click link to get all the product information you need to know",
    messageLines: ["Please click link to get all the", "product information you need to know"],
    alignment: "center",
    requiredForRenderedMedia: true
  };
}

function nextWorkflowStep() {
  if (!products.length) return "Sync Shopify products";
  if (!state.selectedProducts.size) return "Select products";
  if (!creatives.some((item) => item.id.startsWith("gen-"))) return "Generate ads";
  if (!creatives.length) return "Generate pipeline drafts";
  return "Export publish pack";
}

async function generateDailyAds() {
  const ad = selectedAd();
  const targets = selectedProducts().slice(0, 6);
  const timestamp = Date.now();
  const newCreatives = targets.map((product, index) => {
    const format = chooseFormat(ad.platform, product.category);
    const channel = chooseChannel(ad.platform);
    const hook = buildHook(product, ad, index);

    return {
      id: `gen-${timestamp}-${index}`,
      status: index < 2 ? "Ready" : "Review",
      product: product.name,
      format,
      hook,
      asset: buildAssetBrief(product, ad),
      channel,
      productUrl: product.productUrl || "",
      buyNow: productBuyNowBlock(product),
      score: Math.max(78, Math.min(97, Number(product.score || 75) + 6 - index)),
      exportPayload: {
        brandProfile: {
          companyName: brandProfile.companyName,
          publicBrandName: brandProfile.publicBrandName,
          brandTagline: brandProfile.brandTagline,
          brandMission: brandProfile.brandMission,
          brandVoice: brandProfile.brandVoice,
          customerPromise: brandProfile.customerPromise,
          requiredDisclaimers: brandProfile.requiredDisclaimers,
          approvedClaims: brandProfile.approvedClaims,
          restrictedClaims: brandProfile.restrictedClaims
        },
        founderStoryMode: {
          angle: state.founderStoryAngle,
          tone: state.founderStoryTone,
          approvedBrandStory: brandProfile.founderStory
        },
        executiveSimpleMode: {
          videoLength: state.simpleVideoLength,
          audience: state.simpleAudience,
          renderProvider: brandProfile.defaultRenderProvider
        },
        sourceAd: ad.title,
        cta: ad.cta || "Shop now",
        structure: ad.structure,
        tags: ad.tags,
        productUrl: product.productUrl || "",
        buyNow: productBuyNowBlock(product),
        renderedProductCta: buildRenderedProductCta(product),
        caption: buildCaption(product, ad),
        videoPrompt: buildVideoPrompt(product, ad, format),
        thumbnailPrompt: buildThumbnailPrompt(product, ad)
      }
    };
  });

  const enrichedCreatives = await Promise.all(
    newCreatives.map(async (creative, index) => {
      const product = targets[index];
      const generated = await requestMarketingPackage(product, ad, creative.format);
      if (!generated) return creative;

      const output = generated.output || {};
      return {
        ...creative,
        hook: output.hook || creative.hook,
        asset: output.headline || creative.asset,
        status: generated.source === "openai" ? creative.status : "Review",
        exportPayload: {
          ...creative.exportPayload,
          aiSource: generated.source,
          generationMessage: generated.message,
          hook: output.hook || creative.hook,
          headline: output.headline || "",
          caption: output.caption || creative.exportPayload.caption,
          bodyCopy: output.bodyCopy || "",
          cta: output.cta || creative.exportPayload.cta,
          hashtags: output.hashtags || [],
          emailSubject: output.emailSubject || "",
          sms: output.sms || "",
          shopifyPromo: output.shopifyPromo || "",
          buyNow: creative.exportPayload.buyNow,
          renderedProductCta: creative.exportPayload.renderedProductCta,
          videoScript: output.videoScript || "",
          scenes: output.scenes || [],
          voiceover: output.voiceover || "",
          onScreenText: output.onScreenText || [],
          videoPrompt: output.visualPrompt || creative.exportPayload.videoPrompt,
          thumbnailPrompt: output.thumbnailPrompt || creative.exportPayload.thumbnailPrompt,
          complianceNote: output.complianceNote || buildComplianceNote(product)
        }
      };
    })
  );

  creatives = [...enrichedCreatives, ...creatives.filter((item) => !item.id.startsWith("gen-"))];
  state.queueMode = "All";
  state.workflowMessage = `${enrichedCreatives.length} ad concepts generated from ${ad.title}.`;
  channels = buildPublishingQueue(enrichedCreatives);
  render();

  try {
    const mediaOutputs = await Promise.all(enrichedCreatives.map((creative) => createMediaFromLegacy({
      title: `${creative.product} ${creative.format || "Video"} Draft`,
      script: creative.exportPayload?.videoScript || creative.exportPayload?.voiceover || creative.hook || creative.asset,
      campaignId: `creative-${creative.id}`,
      productUrl: creative.productUrl || creative.exportPayload?.productUrl || creative.exportPayload?.buyNow?.url || "",
      readinessScore: creative.score || 80,
      targetPlatforms: targetPlatformsFromChannel(creative.channel),
      tags: ["generated-concept"],
      metadata: {
        sourceCreativeId: creative.id,
        productName: creative.product,
        format: creative.format,
        hook: creative.hook,
        channel: creative.channel,
        exportPayload: creative.exportPayload
      }
    })));
    const saved = await saveCreativesToServer(enrichedCreatives);
    const allMediaOutputs = [...mediaOutputs, ...(Array.isArray(saved.mediaOutputs) ? saved.mediaOutputs : [])]
      .filter((item, index, list) => item?.id && list.findIndex((candidate) => candidate?.id === item.id) === index);
    if (allMediaOutputs.length) {
      allMediaOutputs.forEach(mergeMediaRecord);
      state.selectedMediaId = allMediaOutputs[0].id || state.selectedMediaId;
      state.selectedMediaRecord = allMediaOutputs[0] || state.selectedMediaRecord;
    }
    state.syncLevel = "connected";
    state.syncMessage = `${enrichedCreatives.length} concepts saved and ${allMediaOutputs.length} strict pipeline drafts created.`;
    state.workflowMessage = `${enrichedCreatives.length} concepts now enter Create -> Render -> Review -> Publish as media drafts.`;
  } catch (error) {
    state.syncLevel = "error";
    state.syncMessage = "Generation stopped before pipeline draft creation completed.";
    state.workflowMessage = error.message || "Generated concepts could not enter the strict pipeline.";
    console.error(error);
  }

  render();
}

async function requestMarketingPackage(product, ad, format) {
  try {
    const response = await fetch("/api/generate/marketing", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemType: state.activeSection === "export" || format.toLowerCase().includes("video") ? "EVIE" : "EVICS",
        product,
        brand: brandProfile,
        platform: state.campaignPlatform === "Auto" ? ad.platform : state.campaignPlatform,
        campaignGoal: state.campaignGoal,
        tone: state.campaignTone,
        videoType: format,
        offer: state.campaignOffer,
        cta: ad.cta || "Shop now",
        format,
        duration: state.simpleVideoLength,
        audience: state.simpleAudience,
        inspiration: {
          title: ad.title,
          hook: ad.hook,
          structure: ad.structure,
          tags: ad.tags
        }
      })
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Marketing generation failed.");
    }
    return payload;
  } catch (error) {
    console.warn("Server generation unavailable. Using local generator.", error);
    return buildLocalMarketingPackage(product, ad, format);
  }
}

function buildLocalMarketingPackage(product, ad, format) {
  const hook = `${product.name} is the missing piece for ${state.campaignGoal.toLowerCase()} in a premium routine.`;
  const headline = `${product.name} for ${state.campaignGoal}`;
  const caption = `${headline}: ${brandProfile.publicBrandName} makes it effortless. ${state.campaignOffer}. ${ad.cta || "Shop now"}.`;
  const bodyCopy = `Introduce ${product.name} with premium clarity: simple benefits, daily ritual, and a conversion-focused offer.`;
  const hashtags = (ad.tags || []).slice(0, 3).map((tag) => `#${tag.replace(/[^a-z0-9]+/gi, "").toLowerCase()}`);

  return {
    success: true,
    source: "local",
    message: "Fallback marketing package generated locally.",
    output: {
      hook,
      headline,
      caption,
      bodyCopy,
      cta: ad.cta || "Shop now",
      hashtags,
      emailSubject: `${brandProfile.publicBrandName} Campaign: ${headline}`,
      sms: `Try ${product.name} for ${state.campaignGoal}. ${ad.cta || "Shop now"}.`,
      shopifyPromo: `Use ${brandProfile.publicBrandName} offer: ${state.campaignOffer}`,
      videoScript: buildVideoPrompt(product, ad, format),
      scenes: [
        `Open with the hook: ${hook}`,
        `Show product use and premium positioning`,
        `Highlight the offer: ${state.campaignOffer}`,
        `End with CTA: ${ad.cta || "Shop now"}`
      ],
      voiceover: hook,
      onScreenText: [hook, caption, ad.cta || "Shop now"],
      visualPrompt: buildVideoPrompt(product, ad, format),
      thumbnailPrompt: buildThumbnailPrompt(product, ad),
      complianceNote: buildComplianceNote(product)
    }
  };
}

async function runAutopilot() {
  const startedAt = new Date();
  state.agentRunLog = [
    ["EVICS Operator", "Started", "Daily workflow run initialized"],
    ["Product Match Twin", "Running", "Selecting synced Shopify products"]
  ];
  state.exceptions = [];
  state.autopilotMessage = "EVICS is assigning Twin Agent work...";
  state.workflowMessage = "Autopilot run started.";
  state.syncLevel = "loading";
  state.syncMessage = "Running daily workflow.";
  render();

  if (!state.selectedProducts.size) {
    state.selectedProducts = new Set(products.slice(0, 5).map((product) => product.name));
  }
  state.agentRunLog = [
    ...state.agentRunLog,
    ["Product Match Twin", "Complete", `${state.selectedProducts.size} products selected`],
    ["Script Writer Twin", "Running", "Generating hooks, captions, and scripts"]
  ];

  await generateDailyAds();

  const generated = creatives.filter((item) => item.id.startsWith("gen-"));
  state.agentRunLog = [
    ...state.agentRunLog,
    ["Script Writer Twin", "Complete", `${generated.length} concepts generated`],
    ["QA Compliance Twin", "Running", "Checking links, scores, and claim language"]
  ];
  const pipelineDrafts = generated.filter((item) => item.score >= 82 && creativeProductUrl(item));

  const exceptions = findAutopilotExceptions(generated);
  state.exceptions = exceptions;
  state.agentRunLog = [
    ...state.agentRunLog,
    ["QA Compliance Twin", exceptions.length ? "Review" : "Complete", exceptions.length ? `${exceptions.length} exceptions found` : "No exceptions found"],
    ["Pipeline Twin", "Drafted", `${pipelineDrafts.length} concepts are available as strict pipeline drafts`],
    ["Publisher Twin", "Blocked", "Publish is locked until Render and Review are complete"]
  ];

  state.agentRunLog = [
    ...state.agentRunLog,
    ["Publisher Twin", "Waiting", "Use the strict workflow to render, review, approve, and publish"],
    ["Learning Twin", "Queued", `Run completed at ${startedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`]
  ];

  state.autopilotMessage = exceptions.length
    ? `${exceptions.length} exceptions need review.`
    : `${pipelineDrafts.length} concepts were converted into strict pipeline drafts.`;
  state.workflowMessage = "Autopilot completed input generation. Continue in Create -> Render -> Review -> Publish.";
  state.syncLevel = exceptions.length ? "loading" : "connected";
  state.syncMessage = exceptions.length ? "Autopilot completed with review items." : "Autopilot run complete.";
  await saveAgentRunSummary();
  render();
}

async function runOfficeAgentFromApp() {
  state.workflowMessage = "Office Agent is running EVICS from beginning to end.";
  state.syncLevel = "loading";
  render();

  try {
    const response = await fetch("/api/agents/office-run", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        directive: "Run EVICS from beginning to end.",
        mode: "Manual",
        maxProducts: 5
      })
    });
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "Office Agent run failed.");

    state.syncLevel = payload.exceptions && payload.exceptions.length ? "error" : "connected";
    state.workflowMessage = `Office Agent completed: ${payload.generated || 0} concepts from ${payload.products || 0} products.`;
    state.agentRunLog = payload.agent?.log?.map(([agent, status, detail]) => [agent, status, detail]) || state.agentRunLog;
    await hydrateFromServerApi();
    await refreshEvidence();
  } catch (error) {
    state.syncLevel = "error";
    state.workflowMessage = error.message || "Office Agent could not complete the workflow.";
  }

  render();
}

async function saveAgentRunSummary() {
  try {
    const response = await fetch("/api/agents/runs", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: `agent-run-${Date.now()}`,
        mode: state.autopilotMode,
        message: state.autopilotMessage,
        log: state.agentRunLog,
        exceptions: state.exceptions,
        completedAt: new Date().toISOString()
      })
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Agent run save failed.");
    }

    const persistence = payload.run?.persistence || "local";
    if (payload.alert?.sent) {
      state.syncMessage = `Autopilot run saved to ${persistence}. SMS alert sent.`;
    } else if (state.exceptions.length) {
      state.syncMessage = `Autopilot run saved to ${persistence}. SMS not sent: ${payload.alert?.reason || "not configured"}`;
    } else {
      state.syncMessage = `Autopilot run saved to ${persistence}.`;
    }
  } catch (error) {
    state.syncLevel = "error";
    state.syncMessage = "Autopilot ran, but the run log was not saved.";
    console.error(error);
  }
}

function findAutopilotExceptions(items) {
  return items.flatMap((item) => {
    const issues = [];
    if (!creativeProductUrl(item)) issues.push(`${item.product}: missing product URL`);
    if (item.score < 80) issues.push(`${item.product}: low product fit score`);
    if (/\b(cure|treat|prevent|diagnose|heal disease)\b/i.test(`${item.hook} ${item.asset}`)) {
      issues.push(`${item.product}: risky claim language`);
    }
    return issues;
  });
}

async function saveCreativesToServer(items) {
  const response = await fetch("/api/creatives", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      creatives: items,
      actor: "legacy-app-generation"
    })
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Creative save failed.");
  }

  return payload;
}

function chooseFormat(platform, category) {
  const text = `${platform} ${category}`.toLowerCase();
  if (text.includes("pinterest") || text.includes("beauty")) return "Luxury product routine";
  if (text.includes("youtube") || text.includes("focus")) return "Founder desk UGC";
  if (text.includes("facebook")) return "Problem-solution testimonial";
  return "UGC short video";
}

function chooseChannel(platform) {
  if (platform === "Instagram") return "Instagram + Pinterest";
  if (platform === "YouTube") return "YouTube Shorts + TikTok";
  if (platform === "Facebook") return "Facebook + Reels";
  if (platform === "Pinterest") return "Pinterest + Instagram";
  return "TikTok + Reels";
}

function targetPlatformsFromChannel(channel = "") {
  const text = String(channel || "").toLowerCase();
  const platforms = [
    ["TikTok", "tiktok"],
    ["Instagram", "instagram"],
    ["Facebook", "facebook"],
    ["YouTube", "youtube"],
    ["Pinterest", "pinterest"],
    ["X", "x "],
    ["Google Ads", "google"]
  ].filter(([, token]) => text.includes(token)).map(([platform]) => platform);
  return platforms.length ? platforms : ["TikTok", "Instagram", "YouTube"];
}

function buildHook(product, ad, index) {
  const goal = state.campaignGoal.toLowerCase();
  const starts = [
    `Nobody tells you ${product.name} can make the routine feel this simple.`,
    `I matched ${product.name} to the ${ad.title} pattern for a reason.`,
    `This is the ${product.angle} angle I would test first for ${product.name}.`,
    `${product.name} needs a cleaner hook than a product pitch.`,
    `If your goal is ${goal}, ${product.name} needs to feel like a daily decision.`
  ];

  return starts[index % starts.length];
}

function buildAssetBrief(product, ad) {
  return `${ad.structure.join(" > ")}; product close-up; benefit caption; CTA: ${ad.cta || "Shop now"}`;
}

function buildCaption(product, ad) {
  const tags = ad.tags.slice(0, 3).map((tag) => `#${tag.replace(/[^a-z0-9]+/gi, "")}`).join(" ");
  return `${product.name} fits the ${product.angle} routine without turning wellness into guesswork. ${state.campaignOffer}. ${ad.cta || "Shop now"}. ${tags}`;
}

function buildVideoPrompt(product, ad, format) {
  return [
    `${format} for ${product.name}.`,
    `Campaign goal: ${state.campaignGoal}. Tone: ${state.campaignTone}.`,
    `Length: ${state.simpleVideoLength}. Audience: ${state.simpleAudience}.`,
    `Open with: "${buildHook(product, ad, 0)}"`,
    `Visual structure: ${ad.structure.join(" > ")}.`,
    `Show product close-up, simple daily-use moment, benefit captions, and ${brandProfile.brandVoice} styling for ${brandProfile.publicBrandName}.`,
    `Add a centered Buy Now button linked to: ${product.productUrl || "the product page inside the store"}.`,
    `Below the button, show two centered lines: "Please click link to get all the" and "product information you need to know".`,
    `Offer line: ${state.campaignOffer}. End with CTA: ${ad.cta || "Shop now"}.`
  ].join(" ");
}

function buildRenderedProductCta(product) {
  const block = productBuyNowBlock(product);
  return [
    `Button: ${block.label}`,
    `Link: ${block.url || "Product page inside store"}`,
    `Centered message line 1: ${block.messageLines[0]}`,
    `Centered message line 2: ${block.messageLines[1]}`
  ].join("\n");
}

function buildThumbnailPrompt(product, ad) {
  return `Premium vertical thumbnail for ${product.name}; product label visible, clean wellness background, bold hook text: "${ad.hook}", high-contrast mobile layout.`;
}

function buildComplianceNote(product) {
  const category = `${product?.category || ""} ${product?.name || ""}`.toLowerCase();
  const needsHealthNote = /supplement|wellness|health|sleep|testosterone|prostate|argine|vitamin|collagen|goat|energy|fitness|beauty/.test(category);
  if (!needsHealthNote) {
    return "Keep claims truthful, product-specific, and supportable. Avoid guarantees and exaggerated results.";
  }

  return "Use supplement-safe language. Do not claim to diagnose, treat, cure, or prevent disease. These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease. Consult a qualified healthcare professional before use.";
}

function buildPublishingQueue(items) {
  const slots = ["11:30 AM", "1:45 PM", "4:15 PM", "6:30 PM", "8:00 PM", "Tomorrow"];
  return items.map((item, index) => [
    item.channel.split(" + ")[0],
    slots[index] || "Queued",
    item.product,
    item.status
  ]);
}

function creativeProductUrl(item) {
  const payload = item.exportPayload || item.export_payload || {};
  if (payload.productUrl) return payload.productUrl;
  if (item.productUrl) return item.productUrl;

  const product = products.find((entry) => entry.name === item.product);
  return product?.productUrl || "";
}

function exportCreative(item) {
  const copy = formatCreativeLaunchBlock(item, 1);

  copyText(copy);
  state.workflowMessage = `Export copied for ${item.product}.`;
  state.syncLevel = "connected";
  state.syncMessage = "Creative export copied.";
  render();
}

function exportApprovedPack() {
  const approved = approvedCreatives();
  if (!approved.length) {
    state.workflowMessage = "Approve at least one concept before exporting the pack.";
    render();
    return;
  }

  const pack = buildLaunchPack(approved);

  copyText(pack);
  state.workflowMessage = `${approved.length} approved concepts copied as a publish pack.`;
  state.syncLevel = "connected";
  state.syncMessage = "Approved publish pack copied.";
  render();
}

function downloadApprovedPack() {
  const approved = approvedCreatives();
  if (!approved.length) {
    state.workflowMessage = "Approve at least one concept before downloading the launch pack.";
    render();
    return;
  }

  downloadText(`${brandProfile.shopifyStoreHandle || "evie"}-launch-pack.md`, buildLaunchPack(approved));
  state.workflowMessage = `${approved.length} approved concepts downloaded as a launch pack.`;
  state.syncLevel = "connected";
  state.syncMessage = "Launch pack downloaded.";
  render();
}

function exportToolBrief(tool) {
  const approved = approvedCreatives();
  if (!approved.length) {
    state.workflowMessage = `Approve at least one concept before copying the ${tool} brief.`;
    render();
    return;
  }

  const brief = buildToolBrief(tool, approved);
  copyText(brief);
  state.syncLevel = "connected";
  state.syncMessage = `${tool} brief copied.`;
  state.workflowMessage = `${tool} production brief copied for ${approved.length} approved concepts.`;
  render();
}

function buildToolBrief(tool, items) {
  const header = [
    `# ${brandProfile.publicBrandName} ${tool} Production Brief`,
    `Company: ${brandProfile.companyName}`,
    `Brand voice: ${brandProfile.brandVoice}`,
    `Campaign goal: ${state.campaignGoal}`,
    `Tone: ${state.campaignTone}`,
    `Offer: ${state.campaignOffer}`,
    `Platform focus: ${state.campaignPlatform}`,
    `Audience: ${state.simpleAudience}`,
    `Video length: ${state.simpleVideoLength}`,
    ""
  ];

  const blocks = items.map((item, index) => {
    const payload = item.exportPayload || item.export_payload || {};
    const productUrl = creativeProductUrl(item);

    if (tool === "Canva") {
      return [
        `## ${index + 1}. ${item.product}`,
        `Asset: thumbnail, static ad, carousel cover, product mockup`,
        `Product URL: ${productUrl}`,
        `Buy Now Button: ${payload.buyNow?.label || "Buy Now"}`,
        `Buy Now Link: ${payload.buyNow?.url || productUrl}`,
        `Centered message line 1: Please click link to get all the`,
        `Centered message line 2: product information you need to know`,
        `Headline: ${payload.headline || item.hook}`,
        `Subcopy: ${payload.caption || buildFallbackCaption(item)}`,
        `Visual direction: ${payload.thumbnailPrompt || "Premium mobile-first product visual with clear label and high contrast hook text."}`,
        `Brand feel: ${brandProfile.brandVoice}. Use configured colors ${brandProfile.primaryBrandColor}, ${brandProfile.secondaryBrandColor}, and ${brandProfile.accentColor}.`
      ].join("\n");
    }

    if (tool === "Video") {
      return [
        `## ${index + 1}. ${item.product}`,
        `Tools: HeyGen, Runway, Kling`,
        `Product URL: ${productUrl}`,
        `Buy Now Button: ${payload.buyNow?.label || "Buy Now"}`,
        `Buy Now Link: ${payload.buyNow?.url || productUrl}`,
        `Centered message line 1: Please click link to get all the`,
        `Centered message line 2: product information you need to know`,
        `Hook: ${item.hook}`,
        `Video script:\n${payload.videoScript || payload.videoPrompt || item.asset}`,
        `Scene list:\n${Array.isArray(payload.scenes) ? payload.scenes.map((scene) => `- ${scene}`).join("\n") : "Opening hook, product close-up, daily-use moment, benefit captions, CTA frame"}`,
        `Voiceover: ${payload.voiceover || ""}`,
        `Visual generation prompt: ${payload.videoPrompt || item.asset}`,
        `CTA: ${payload.cta || selectedAd().cta || "Shop now"}`
      ].join("\n");
    }

    return [
      `## ${index + 1}. ${item.product}`,
      `Product URL: ${productUrl}`,
      `Buy Now Button: ${payload.buyNow?.label || "Buy Now"}`,
      `Buy Now Link: ${payload.buyNow?.url || productUrl}`,
      `Centered message line 1: Please click link to get all the`,
      `Centered message line 2: product information you need to know`,
      `Write: 3 hooks, 2 captions, 1 short script, 1 compliance-safe product description`,
      `Core hook: ${item.hook}`,
      `Caption seed: ${payload.caption || buildFallbackCaption(item)}`,
      `Email subject: ${payload.emailSubject || ""}`,
      `SMS: ${payload.sms || ""}`,
      `Shopify promo: ${payload.shopifyPromo || ""}`,
      `Avoid medical cure claims. Keep benefits phrased as support-oriented supplement language.`
    ].join("\n");
  });

  return [...header, ...blocks].join("\n\n");
}

function buildLaunchPack(items) {
  const date = new Date().toLocaleDateString();
  return [
    `# ${brandProfile.publicBrandName} Launch Pack - ${date}`,
    "",
    `Company: ${brandProfile.companyName}`,
    `Brand voice: ${brandProfile.brandVoice}`,
    `Founder Story Angle: ${state.founderStoryAngle}`,
    `Founder Story Tone: ${state.founderStoryTone}`,
    `Source pattern: ${selectedAd().title}`,
    `Campaign goal: ${state.campaignGoal}`,
    `Tone: ${state.campaignTone}`,
    `Offer: ${state.campaignOffer}`,
    `Platform focus: ${state.campaignPlatform}`,
    `Audience: ${state.simpleAudience}`,
    `Video length: ${state.simpleVideoLength}`,
    `CTA framework: ${selectedAd().cta || "Shop now"}`,
    "",
    ...items.map((item, index) => formatCreativeLaunchBlock(item, index + 1))
  ].join("\n");
}

function formatCreativeLaunchBlock(item, index = 1) {
  const payload = item.exportPayload || item.export_payload || {};
  const productUrl = creativeProductUrl(item);
  return [
    `## ${index}. ${item.product}`,
    `Status: ${item.status}`,
    `Score: ${item.score}`,
    `Format: ${item.format}`,
    `Channel: ${item.channel}`,
    `Product URL: ${productUrl}`,
    `Buy Now Button: ${payload.buyNow?.label || "Buy Now"}`,
    `Buy Now Link: ${payload.buyNow?.url || productUrl}`,
    `Centered message line 1: Please click link to get all the`,
    `Centered message line 2: product information you need to know`,
    "",
    `Hook: ${item.hook}`,
    "",
    payload.headline ? `Headline: ${payload.headline}` : "",
    payload.bodyCopy ? `Body Copy: ${payload.bodyCopy}` : "",
    "",
    `Caption: ${payload.caption || buildFallbackCaption(item)}`,
    "",
    payload.emailSubject ? `Email Subject: ${payload.emailSubject}` : "",
    payload.sms ? `SMS: ${payload.sms}` : "",
    payload.shopifyPromo ? `Shopify Promo: ${payload.shopifyPromo}` : "",
    Array.isArray(payload.hashtags) && payload.hashtags.length ? `Hashtags: ${payload.hashtags.join(" ")}` : "",
    "",
    payload.videoScript ? `Video Script:\n${payload.videoScript}` : "",
    Array.isArray(payload.scenes) && payload.scenes.length ? `Scenes:\n${payload.scenes.map((scene) => `- ${scene}`).join("\n")}` : "",
    payload.voiceover ? `Voiceover: ${payload.voiceover}` : "",
    "",
    `Video Prompt: ${payload.videoPrompt || item.asset}`,
    "",
    `Thumbnail Prompt: ${payload.thumbnailPrompt || `Mobile thumbnail for ${item.product} with clear product visual and bold hook text.`}`,
    "",
    `Compliance Note: ${payload.complianceNote || buildComplianceNote(products.find((product) => product.name === item.product))}`,
    "",
    `Asset Brief: ${item.asset}`,
    ""
  ].filter((line) => line !== "").join("\n");
}

function buildFallbackCaption(item) {
  return `${item.product}: ${item.hook} ${selectedAd().cta || "Shop now"}.`;
}

function downloadText(filename, value) {
  const blob = new Blob([value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).catch(() => fallbackCopy(value));
    return;
  }

  fallbackCopy(value);
}

function fallbackCopy(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function render() {
  const app = document.getElementById("app");
  const discoveryItems = discoveryLibrary();
  const ad = selectedAd();
  const categories = ["All", ...new Set(discoveryItems.map((item) => item.category))];
  const platforms = ["All", ...new Set(discoveryItems.map((item) => item.platform))];
  const productCategories = ["All", ...new Set(products.map((item) => item.category).filter(Boolean))];
  const visibleProducts = filteredProducts();
  const connectionItems = state.connections.length
    ? state.connections
    : appConnections.map(([name, status, purpose]) => ({ name, status, purpose }));
  const advancedVisible = state.workspaceMode !== "Executive Simple Mode" || state.showAdvancedOptions;
  const live = liveDashboardMetrics();

  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">${brandProfile.logoUrl ? `<img src="${escapeAttr(brandProfile.logoUrl)}" alt="" />` : brandInitials(brandProfile.publicBrandName)}</div>
        <div>
          <strong>${brandProfile.publicBrandName}</strong>
          <span>Marketing Intelligence Studio</span>
        </div>
      </div>
      <nav>
        ${[
          ["gear", "EVICS Command", "command"],
          ["radar", "Live Discovery Grid", "discovery"],
          ["spark", "Campaign Builder", "studio"],
          ["filter", "Product Library", "matching"],
          ["video", "Media Output Center", "media"],
          ["check", "Brand Compliance", "compliance"],
          ["send", "Pipeline Drafts", "queue"],
          ["gear", "Settings", "brand-settings"],
          ["check", "API Connections", "connections"]
        ].map(([ic, label, section]) => `<button class="${state.activeSection === section ? "active" : ""}" data-section="${section}">${icon(ic)}<span>${label}</span></button>`).join("")}
        <a class="nav-link" href="/workspace.html">${icon("video")}<span>AI Video Workspace</span></a>
      </nav>
      <div class="automation-card">
        <span>Automation Health</span>
        <strong>${state.systemStatus?.worker?.status || state.autopilotMode}</strong>
        <div class="pulse-row"><i></i> ${state.systemStatus?.worker?.lastRun?.completedAt ? `Last run ${new Date(state.systemStatus.worker.lastRun.completedAt).toLocaleString()}` : "No backend worker run yet"}</div>
      </div>
    </aside>

    <main class="${advancedVisible ? "" : "executive-simple-active"} ${state.activeSection === "command" ? "exec-dashboard" : ""} section-${state.activeSection}">
      <header class="topbar">
        <div>
          <h1>${sectionTitle()}</h1>
          <p>${sectionDescription()}</p>
        </div>
        <div class="top-actions">
          <div class="sync-status ${state.syncLevel}">
            <b>${state.dataSource}</b>
            <span>${state.syncMessage}</span>
          </div>
          <button class="ghost" data-connect-sources>${icon("filter")} Connect Sources</button>
          <button class="primary" data-generate-ads>${icon("spark")} Generate Today's Ads</button>
        </div>
      </header>

      ${renderFocusedSection()}

      <div class="workspace-content">
      <section class="workspace-mode panel">
        <div>
          <span>Workspace Mode</span>
          <strong>${state.workspaceMode}</strong>
          <p>${workspaceModeDescription()}</p>
        </div>
        <div class="workspace-mode-actions">
          <label><span>Workspace Mode</span><select data-workspace-mode>
            ${workspaceModes.map((mode) => `<option ${state.workspaceMode === mode ? "selected" : ""}>${mode}</option>`).join("")}
          </select></label>
          <button class="ghost" data-toggle-advanced>${advancedVisible ? "Hide Advanced Options" : "Show Advanced Options"}</button>
        </div>
      </section>

      <section class="executive-simple panel">
        <div class="panel-head">
          <div>
            <h2>Executive Simple Mode</h2>
            <p>For business owners, operators, marketing managers, and non-technical users creating campaign assets quickly.</p>
          </div>
          <span>White-label workflow</span>
        </div>
        <div class="simple-mode-grid">
          ${executiveSimpleSteps.map((step, index) => `<div><b>${index + 1}</b><span>${step}</span></div>`).join("")}
        </div>
        <div class="simple-launch-grid">
          <label><span>Pick product</span><select data-simple-product>
            ${products.map((product) => `<option>${product.name}</option>`).join("")}
          </select></label>
          <label><span>Pick commercial style</span><select data-brief="campaignTone">
            ${brandProfile.preferredVisualStyles.map((option) => `<option ${state.campaignTone === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label><span>Pick video length</span><select data-simple-video-length>
            ${["15 seconds", "30 seconds", "45 seconds", "60 seconds"].map((option) => `<option ${state.simpleVideoLength === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label><span>Pick audience</span><select data-simple-audience>
            ${["New customers", "Returning customers", "Wellness shoppers", "Fitness buyers", "Premium supplement buyers"].map((option) => `<option ${state.simpleAudience === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
        </div>
        <div class="workflow-actions simple-actions">
          <button class="primary" data-generate-ads>${icon("spark")} Generate Script</button>
          <button class="ghost" disabled title="Generated scripts now appear as media drafts in the strict workflow.">Review in Workflow</button>
          <button class="ghost" data-tool-brief="Video">Copy Render Brief</button>
        </div>
      </section>

      ${renderCommandEvidence()}

      <section class="metrics-grid advanced-only">
        ${metric("Backend media assets", String(live.totalMedia), "from /api/agents/system-status")}
        ${metric("Active render jobs", String(live.activeJobs), `${live.failedJobs} failed / ${live.retryJobs} retry`)}
        ${metric("Pipeline drafts", String(live.draftMedia), "created through /api/media/create")}
        ${metric("Completed videos", String(live.completeVideos), `${live.partialDeliveries} partial delivery`)}
      </section>

      <section class="daily-workflow panel advanced-only">
        <div>
          <span>Today's Workflow</span>
          <strong>${nextWorkflowStep()}</strong>
          <p>${state.workflowMessage}</p>
        </div>
        <div class="workflow-stats">
          <b>${state.selectedProducts.size || Math.min(products.length, 5)}</b><span>selected products</span>
          <b>${live.renderingMedia}</b><span>rendering</span>
          <b>${live.failedMedia}</b><span>failed/rework</span>
        </div>
        <div class="workflow-actions">
          <button class="ghost" data-select-top-products>Use Top 5</button>
          <button class="primary" data-generate-ads>${icon("spark")} Generate</button>
          <button class="ghost" data-section-jump="media">Open Media Output</button>
          <a class="ghost link-button" href="/workspace.html">Open Strict Workflow</a>
        </div>
      </section>

      <section class="catalog-sync panel advanced-only">
        <div>
          <span>Shopify Catalog</span>
          <strong>${products.length} products loaded</strong>
          <p>${state.productSyncMessage || "Refresh after adding, editing, or publishing products in Shopify."}</p>
        </div>
        <button class="ghost" data-sync-products>${icon("filter")} Refresh Products</button>
      </section>

      <section class="autopilot panel advanced-only">
        <div>
          <span>EVICS Autopilot</span>
          <strong>${state.autopilotMode}</strong>
          <p>${state.autopilotMessage}</p>
        </div>
        <div class="autopilot-controls">
          ${["Manual", "Assisted", "Autopilot", "Paused"].map((mode) => `<button class="${state.autopilotMode === mode ? "active" : ""}" data-autopilot-mode="${mode}">${mode}</button>`).join("")}
        </div>
        <button class="primary" data-run-autopilot>${icon("gear")} Run Daily Agents</button>
      </section>

      <section class="exception-rules panel advanced-only">
        <div class="panel-head compact">
          <h2>Human Review Exceptions</h2>
          <span>Only stop for these</span>
        </div>
        <div class="exception-list">
          ${exceptionRules.map((rule) => `<span>${rule}</span>`).join("")}
        </div>
      </section>

      <section class="workspace-grid secondary advanced-only">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Twin Agent Run Log</h2>
              <p>Latest Autopilot execution across worker roles.</p>
            </div>
          </div>
          <div class="agent-run-log">
            ${(state.agentRunLog.length ? state.agentRunLog : [["EVICS Operator", "Idle", "Run Daily Agents to begin."]]).map(([agent, status, detail]) => `
              <div>
                <b>${agent}</b>
                <span class="${status.toLowerCase().replace(/\s+/g, "-")}">${status}</span>
                <p>${detail}</p>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Exception Inbox</h2>
              <p>Only these items need human attention.</p>
            </div>
          </div>
          <div class="exception-inbox">
            ${(state.exceptions.length ? state.exceptions : ["No current exceptions."]).map((item) => `<div>${item}</div>`).join("")}
          </div>
        </div>
      </section>

      <section class="campaign-brief panel advanced-only">
        <div class="panel-head">
          <div>
            <h2>Campaign Brief</h2>
            <p>Guides today's hooks, captions, video prompts, and launch pack.</p>
          </div>
        </div>
        <div class="brief-grid">
          <label><span>Goal</span><select data-brief="campaignGoal">
            ${["Conversions", "Awareness", "Retargeting", "Product education", "Bundle push"].map((option) => `<option ${state.campaignGoal === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label><span>Tone</span><select data-brief="campaignTone">
            ${["Premium UGC", "Founder voice", "Clinical trust", "Luxury routine", "Gym performance"].map((option) => `<option ${state.campaignTone === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label><span>Platform</span><select data-brief="campaignPlatform">
            ${["Auto", "TikTok", "Instagram", "YouTube Shorts", "Facebook", "Pinterest"].map((option) => `<option ${state.campaignPlatform === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label class="brief-offer"><span>Offer</span><input data-brief="campaignOffer" value="${escapeAttr(state.campaignOffer)}" /></label>
        </div>
      </section>

      <section class="workspace-grid advanced-only">
        <div class="panel monitor">
          <div class="panel-head">
            <div>
              <h2>Discovery Intelligence Grid</h2>
              <p>Live production signals are ranked first; seed structures appear only as fallback guidance.</p>
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
                  <span>${item.platform} / ${item.category} / ${item.sourceType === "live" ? "live signal" : "seed fallback"}</span>
                </div>
                <small>signal score</small>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="panel insight">
          <div class="panel-head compact">
            <h2>Selected Generation Structure</h2>
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
            <div><dt>CTA framework</dt><dd>${ad.cta}</dd></div>
          </dl>
          <div class="tag-cloud">${ad.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </div>
      </section>

      <section class="workspace-grid secondary advanced-only">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Product Matching</h2>
              <p>Pairs viral structures with configured brand products and positioning angles.</p>
            </div>
            <div class="product-tools">
              <input data-product-search type="search" placeholder="Search products" value="${escapeAttr(state.productSearch)}" />
              ${select("productCategory", productCategories, state.productCategory)}
              <button class="mini-button ${state.showSelectedProductsOnly ? "active" : ""}" data-toggle-selected-products>Selected</button>
            </div>
          </div>
          <div class="product-grid">
            ${visibleProducts.map((product) => `
              <article class="${state.selectedProducts.has(product.name) ? "selected-product" : ""}" data-product-name="${escapeAttr(product.name)}">
                <div class="product-card-head">
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
            `).join("") || `<div class="empty">No products match this view.</div>`}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Daily Automation Pipeline</h2>
              <p>Twin-ready workflow stages for the 24/7 marketing system.</p>
            </div>
          </div>
          <div class="timeline">
            ${workflow.map(([time, title, desc]) => `
              <div>
                <time>${time}</time>
                <span></span>
                <div><strong>${title}</strong><p>${desc}</p></div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="workspace-grid secondary advanced-only">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>App Connections</h2>
              <p>Production apps needed to create, export, and publish each ad.</p>
            </div>
          </div>
          <div class="connection-list">
            ${connectionItems.map((item) => `
              <div>
                <b>${item.name}</b>
                <span class="${item.status.toLowerCase()}">${item.status}</span>
                <p>${item.purpose}</p>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Twin Agents</h2>
              <p>Worker roles that will run the daily content production system.</p>
            </div>
          </div>
          <div class="agent-list">
            ${twinAgents.map(([name, status, job]) => `
              <div>
                <strong>${name}</strong>
                <span class="${status.toLowerCase()}">${status}</span>
                <p>${job}</p>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="founder-story-mode panel advanced-only">
        <div class="panel-head">
          <div>
            <h2>Founder Story Mode</h2>
            <p>Creates founder-style commercials using the company's approved brand story, mission, values, customer promise, product purpose, origin story, community impact, family legacy, performance message, and long-term vision.</p>
          </div>
        </div>
        <div class="brief-grid">
          <label><span>Founder Story Angle</span><select data-founder-story="founderStoryAngle">
            ${founderStoryAngles.map((option) => `<option ${state.founderStoryAngle === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label><span>Founder Story Tone</span><select data-founder-story="founderStoryTone">
            ${founderStoryTones.map((option) => `<option ${state.founderStoryTone === option ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label class="brief-offer"><span>Approved Brand Story</span><input data-brand-profile="founderStory" value="${escapeAttr(brandProfile.founderStory)}" /></label>
        </div>
      </section>

      <section class="manual-workflow panel advanced-only">
        <div class="panel-head">
          <div>
            <h2>Manual Commercial Workflow</h2>
            <p>The business owner or operator should be able to complete this without touching advanced settings.</p>
          </div>
        </div>
        <div class="manual-steps">
          ${manualWorkflowSteps.map((step, index) => `<div><b>${index + 1}</b><span>${step}</span></div>`).join("")}
        </div>
      </section>

      </div>

      <section class="brand-profile-settings panel">
        <div class="panel-head">
          <div>
            <h2>Brand Profile Settings</h2>
            <p>${state.brandProfileMessage}</p>
          </div>
          <span>Active profile: ${brandProfile.profileName}</span>
        </div>
        <div class="brand-profile-toolbar">
          <label><span>Brand Profile</span><select data-brand-profile-select>
            ${brandProfiles.map((profile) => `<option value="${escapeAttr(profile.id)}" ${brandProfile.id === profile.id ? "selected" : ""}>${profile.profileName || profile.publicBrandName}</option>`).join("")}
          </select></label>
          <button class="ghost" data-create-brand-profile>${icon("spark")} Create Editable Copy</button>
          <button class="primary" data-save-brand-profile>${icon("check")} Save Profile</button>
        </div>
        <div class="brand-settings-grid">
          ${brandSettingInput("Profile Name", "profileName")}
          ${brandSettingInput("Company Name", "companyName")}
          ${brandSettingInput("Public Brand Name", "publicBrandName")}
          ${brandSettingInput("Legal Business Name", "legalBusinessName")}
          ${brandSettingInput("Store URL", "storeUrl")}
          ${brandSettingInput("Shopify Store Handle", "shopifyStoreHandle")}
          ${brandSettingInput("Brand Tagline", "brandTagline")}
          ${brandSettingInput("Brand Mission", "brandMission")}
          ${brandSettingInput("Brand Voice", "brandVoice")}
          ${brandSettingInput("Founder Story", "founderStory")}
          ${brandSettingInput("Customer Promise", "customerPromise")}
          ${brandSettingInput("Primary Brand Color", "primaryBrandColor")}
          ${brandSettingInput("Secondary Brand Color", "secondaryBrandColor")}
          ${brandSettingInput("Accent Color", "accentColor")}
          ${brandLogoUpload()}
          ${brandSettingList("Default Product Categories", brandProfile.defaultProductCategories)}
          ${brandSettingList("Approved Claims", brandProfile.approvedClaims)}
          ${brandSettingList("Restricted Claims", brandProfile.restrictedClaims)}
          ${brandSettingList("Required Disclaimers", brandProfile.requiredDisclaimers)}
          ${brandSettingList("Approved CTAs", brandProfile.approvedCtas)}
          ${brandSettingList("Preferred Visual Styles", brandProfile.preferredVisualStyles)}
          ${brandSettingList("Preferred Voiceover Styles", brandProfile.preferredVoiceoverStyles)}
          ${brandSettingInput("Default Render Provider", "defaultRenderProvider")}
          ${brandSettingList("Default Export Formats", brandProfile.defaultExportFormats)}
        </div>
        <p class="brand-note">The system ships with a default I AM GENESIS TECH brand profile, and all brand-specific values are stored in editable configuration so the system can later be reused, resold, licensed, or white-labeled for other ecommerce brands.</p>
      </section>

      <section class="panel build-backlog advanced-only">
        <div class="panel-head compact">
          <h2>Build Backlog</h2>
          <span>Remaining setup work</span>
        </div>
        <div class="backlog-list">
          ${buildBacklog.map(([title, detail], index) => `
            <div>
              <b>${index + 1}</b>
              <strong>${title}</strong>
              <p>${detail}</p>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="queue-section advanced-only">
        <div class="panel creative-panel">
          <div class="panel-head">
            <div>
              <h2>AI Content Queue</h2>
              <p>Generated concepts routed into strict media drafts. Final export and publishing happen only after Render, Review, and Publish.</p>
            </div>
            <div class="segmented">
              ${["Ready", "Review", "Draft", "All"].map((mode) => `<button class="${state.queueMode === mode ? "active" : ""}" data-mode="${mode}">${mode}</button>`).join("")}
            </div>
          </div>
          <div class="creative-list">
            ${filteredCreatives().map((item) => `
              <article>
                <div class="creative-score">${item.score}</div>
                <div>
                  <div class="creative-title">
                    <strong>${item.product}</strong>
                    <span>${item.status}</span>
                  </div>
                  <p>${item.hook}</p>
                  <small>${item.format} · ${item.asset} · ${item.channel}</small>
                </div>
                <div class="creative-actions">
                  <button class="mini-button" data-export="${item.id}">Copy Brief</button>
                  ${creativeProductUrl(item) ? `<a class="mini-link" href="${escapeAttr(creativeProductUrl(item))}" target="_blank" rel="noopener">Product</a>` : ""}
                </div>
              </article>
            `).join("") || `<div class="empty">No items in this queue.</div>`}
          </div>
        </div>

        <div class="panel publish-panel">
          <div class="panel-head compact">
            <h2>Strict Publish</h2>
            <span>Locked</span>
          </div>
          <div class="channel-list">
            <div>
              <b>Publish requires approval</b>
              <span>Strict pipeline</span>
              <p>Assets appear in Publish only after Create, Render, Review, and final approval.</p>
              <small>locked</small>
            </div>
          </div>
        </div>
      </section>

      <section class="analytics-band advanced-only">
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

    <!-- Voice Copilot Toggle -->
    <button class="copilot-toggle" data-toggle-copilot title="Open VP Copilot">VP</button>

    <!-- Voice Copilot Panel (shown when state.showCopilot is true) -->
    ${state.showCopilot && typeof window.renderVoiceCopilot === 'function' ? window.renderVoiceCopilot() : ""}
  `;

  bindEvents();
}

function metric(label, value, delta) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${delta}</small></article>`;
}

function liveDashboardMetrics() {
  const media = state.mediaOps?.media || [];
  const pipeline = state.systemStatus?.pipeline || {};
  const jobs = state.systemStatus?.jobs || {};
  const byRenderState = pipeline.byRenderState || {};
  const delivery = pipeline.byDeliveryState || {};
  const totalMedia = Number(pipeline.totalMedia || media.length || 0);

  return {
    totalMedia,
    activeJobs: (jobs.active || []).length,
    failedJobs: (jobs.failed || []).length,
    retryJobs: (jobs.retryQueue || []).length,
    draftMedia: Number((pipeline.byPublishState || {}).draft || media.filter((item) => item.publish_status === "draft").length || 0),
    completeVideos: Number(byRenderState.complete || media.filter((item) => item.render_status === "complete").length || 0),
    partialDeliveries: Number(delivery.partial || media.filter((item) => item.delivery_status === "partial").length || 0),
    renderingMedia: Number(byRenderState.rendering || media.filter((item) => item.render_status === "rendering").length || 0),
    failedMedia: Number((byRenderState.failed || 0) + (byRenderState.rework || 0)) || media.filter((item) => ["failed", "rework"].includes(item.render_status)).length
  };
}

function sectionTitle() {
  const titles = {
    command: "Executive Command Center",
    discovery: "Live Discovery Grid",
    studio: "Campaign Studio",
    matching: "Product Matching",
    media: "Media Output Center",
    compliance: "Brand Compliance",
    export: "Render Briefs",
    queue: "Output Queue",
    "brand-settings": "Brand Profile Settings",
    connections: "API Connections"
  };
  return titles[state.activeSection] || titles.command;
}

function sectionDescription() {
  const descriptions = {
    command: "A focused white-label workflow for choosing a product, selecting the commercial shape, generating the script, and preparing export.",
    discovery: "Ranks live creative and pipeline signals first, with seed patterns retained as explicit fallback guidance.",
    studio: "Build founder story, campaign tone, offer, script direction, and creative payloads in one production surface.",
    matching: "Select the products and SKUs that should feed the next EVIE campaign run.",
    media: "Unified registry for generated, imported, archived, scanned, approved, and platform-ready media outputs.",
    compliance: "Review active brand claims and disclaimers that are enforced during media creation.",
    export: "Copy render briefs only. Real rendering happens through the strict pipeline and provider jobs.",
    queue: "Review generated concepts that have been routed into strict pipeline media drafts.",
    "brand-settings": "Select, update, and change the active store-owner brand profile without exposing brand controls in the main workflow.",
    connections: "View connected and missing services without exposing private keys."
  };
  return descriptions[state.activeSection] || descriptions.command;
}

function renderFocusedSection() {
  if (state.activeSection === "command" || state.activeSection === "brand-settings") return "";

  const sections = {
    discovery: renderDiscoverySection,
    studio: renderStudioSection,
    matching: renderMatchingSection,
    media: renderMediaSection,
    compliance: renderComplianceSection,
    export: renderExportSection,
    queue: renderQueueSection,
    connections: renderConnectionsSection
  };

  return (sections[state.activeSection] || renderDiscoverySection)();
}

function evidenceStatus(value) {
  return value ? ["Ready", "ready"] : ["Setup needed", "review"];
}

function renderCommandEvidence() {
  const shopify = evidenceStatus(state.evidence.shopifyConfigured);
  const supabase = evidenceStatus(state.evidence.supabaseConfigured);
  const productsReady = state.evidence.syncedProductCount > 0;
  const productStatus = productsReady ? ["Loaded", "ready"] : ["Workspace", "review"];

  return `
    <section class="command-evidence panel">
      <div class="panel-head compact">
        <h2>Build Evidence</h2>
        <span>Checked ${state.evidence.lastChecked}</span>
      </div>
      <div class="evidence-grid">
        ${evidenceItem("Shopify Connection", shopify[0], shopify[1], state.evidence.shopifyConfigured ? "Store credentials detected and connected." : "Ready to connect Shopify store.")}
        ${evidenceItem("Product Catalog", productStatus[0], productStatus[1], productsReady ? `${state.evidence.syncedProductCount} synced Shopify products available.` : `${products.length} workspace products available for testing.`)}
        ${evidenceItem("Brand Profiles", "Ready", "ready", `${state.evidence.brandProfileCount || brandProfiles.length} profiles configured in your workspace.`)}
        ${evidenceItem("Supabase Storage", supabase[0], supabase[1], state.evidence.supabaseConfigured ? "Live database connected and storing data." : "Using local browser storage for this session.")}
      </div>
      <div class="workflow-actions simple-actions">
        <button class="ghost" data-refresh-evidence>${icon("filter")} Refresh Evidence</button>
        <button class="ghost" data-sync-products>${icon("send")} Load Shopify Products</button>
      </div>
    </section>
  `;
}

function evidenceItem(label, status, tone, detail) {
  return `
    <div class="evidence-item ${tone}">
      <span>${label}</span>
      <strong>${status}</strong>
      <p>${detail}</p>
    </div>
  `;
}

function renderDiscoverySection() {
  const ad = selectedAd();
  const discoveryItems = discoveryLibrary();
  return `
    <section class="focus-layout">
      <div class="panel focus-primary">
        <div class="panel-head">
          <div><h2>Discovery Intelligence Grid</h2><p>Live signal ranking drives selection; fallback seeds are retained only when live evidence is sparse.</p></div>
          <div class="filters">${select("category", ["All", ...new Set(discoveryItems.map((item) => item.category))], state.category)}${select("platform", ["All", ...new Set(discoveryItems.map((item) => item.platform))], state.platform)}</div>
        </div>
        <div class="function-status">
          <strong>Functional role</strong>
          <span>Selects generation structures from live pipeline evidence first, then supplements with validated fallback patterns.</span>
        </div>
        <div class="ad-list elite-list">
          ${filteredAds().map((item) => `
            <button class="ad-row ${item.id === ad.id ? "selected" : ""}" data-ad="${item.id}">
              <div class="score">${item.velocity}</div>
              <div><strong>${item.title}</strong><span>${item.platform} / ${item.category} / ${item.sourceType === "live" ? "live signal" : "seed fallback"}</span></div>
              <small>signal score</small>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="panel focus-side">
        <div class="panel-head compact"><h2>Selected Generation Structure</h2><span>${ad.platform}</span></div>
        <div class="hook-card"><span>Hook</span><strong>${ad.hook}</strong></div>
        <div class="structure">${ad.structure.map((step, index) => `<div><b>${index + 1}</b><span>${step}</span></div>`).join("")}</div>
        <dl><div><dt>Product match</dt><dd>${ad.productMatch}</dd></div><div><dt>CTA framework</dt><dd>${ad.cta}</dd></div></dl>
      </div>
    </section>
  `;
}

function renderStudioSection() {
  return `
    <section class="focus-layout studio-layout">
      <div class="panel focus-primary">
        <div class="panel-head"><div><h2>Campaign Controls</h2><p>One production surface for offer, tone, founder story, and script direction.</p></div></div>
        <div class="brief-grid">
          <label><span>Goal</span><select data-brief="campaignGoal">${["Conversions", "Awareness", "Retargeting", "Product education", "Bundle push"].map((option) => `<option ${state.campaignGoal === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
          <label><span>Tone</span><select data-brief="campaignTone">${brandProfile.preferredVisualStyles.map((option) => `<option ${state.campaignTone === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
          <label><span>Platform</span><select data-brief="campaignPlatform">${["Auto", "TikTok", "Instagram", "YouTube Shorts", "Facebook", "Pinterest"].map((option) => `<option ${state.campaignPlatform === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
          <label class="brief-offer"><span>Offer</span><input data-brief="campaignOffer" value="${escapeAttr(state.campaignOffer)}" /></label>
        </div>
        <div class="workflow-actions simple-actions"><button class="primary" data-generate-ads>${icon("spark")} Generate Campaign</button></div>
      </div>
      <div class="panel focus-side">
        <div class="panel-head compact"><h2>Founder Story Mode</h2><span>${state.founderStoryTone}</span></div>
        <div class="brief-grid single">
          <label><span>Founder Story Angle</span><select data-founder-story="founderStoryAngle">${founderStoryAngles.map((option) => `<option ${state.founderStoryAngle === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
          <label><span>Founder Story Tone</span><select data-founder-story="founderStoryTone">${founderStoryTones.map((option) => `<option ${state.founderStoryTone === option ? "selected" : ""}>${option}</option>`).join("")}</select></label>
          <label><span>Approved Brand Story</span><input data-brand-profile="founderStory" value="${escapeAttr(brandProfile.founderStory)}" /></label>
        </div>
      </div>
    </section>
  `;
}

function renderMatchingSection() {
  const productCategories = ["All", ...new Set(products.map((item) => item.category).filter(Boolean))];
  const ops = state.mediaOps || { media: [], scanner: {}, dispatches: [], findings: [], auditEvents: [], operatingMode: "auto_assist" };
  const latestRender = completedVideoOutputs(ops.media || [])[0] || (ops.media || []).find((item) => item.media_type === "video") || null;
  const renderEvidencePanel = latestRender
    ? renderMediaDetail(latestRender, ops)
    : `<div class="empty">No rendered video yet. Run a render to see thumbnail evidence, SKU, and workflow status here.</div>`;
  return `
    <section class="panel focus-primary full-focus">
      <div class="panel-head"><div><h2>Product Matching</h2><p>Choose the SKUs that should power the next campaign.</p></div><div class="product-tools"><input data-product-search type="search" placeholder="Search products" value="${escapeAttr(state.productSearch)}" />${select("productCategory", productCategories, state.productCategory)}<button class="mini-button ${state.showSelectedProductsOnly ? "active" : ""}" data-toggle-selected-products>Selected</button><button class="mini-button" data-sync-products>Load Shopify</button></div></div>
      <div class="catalog-proof ${state.evidence.syncedProductCount ? "ready" : "review"}">
        <strong>${state.evidence.syncedProductCount ? `${state.evidence.syncedProductCount} Shopify products loaded` : "Using workspace products"}</strong>
        <span>${state.evidence.shopifyConfigured ? "Shopify credentials detected." : "Shopify is not configured yet. Add credentials to .env to sync live products."}</span>
      </div>
      <div class="panel focus-side render-evidence-panel">
        <div class="panel-head compact"><div><h2>Rendered Evidence</h2><p>Thumbnail-first proof of the current render, mockup, SKU, and workflow stage.</p></div><span>${latestRender ? latestRender.render_status || "queued" : "waiting"}</span></div>
        ${renderEvidencePanel}
      </div>
      <div class="product-grid refined-products">${filteredProducts().map((product) => `
        <article class="${state.selectedProducts.has(product.name) ? "selected-product" : ""}" data-product-name="${escapeAttr(product.name)}">
          <div class="product-card-head">${product.imageUrl ? `<img class="product-thumb" src="${product.imageUrl}" alt="" />` : `<div class="product-thumb empty-thumb"></div>`}<div><strong>${product.name}</strong><span>${product.category}</span></div></div>
          <meter min="0" max="100" value="${product.score}"></meter><p>${product.angle}</p><small class="product-source">${product.source === "shopify" ? "Shopify synced" : "Workspace product"}</small>
        </article>
      `).join("") || `<div class="empty">No products match this view.</div>`}</div>
    </section>
  `;
}

function renderComplianceSection() {
  return `
    <section class="focus-layout">
      <div class="panel focus-primary"><div class="panel-head"><div><h2>Compliance Rules</h2><p>Claims and disclaimers from the active brand profile.</p></div></div><div class="brand-rules"><div><h3>Approved Claims</h3>${brandProfile.approvedClaims.map((item) => `<p>${item}</p>`).join("")}</div><div><h3>Restricted Claims</h3>${brandProfile.restrictedClaims.map((item) => `<p>${item}</p>`).join("")}</div><div><h3>Required Disclaimers</h3>${brandProfile.requiredDisclaimers.map((item) => `<p>${item}</p>`).join("")}</div></div></div>
      <div class="panel focus-side"><div class="panel-head compact"><h2>Human Review Exceptions</h2><span>Only stop for these</span></div><div class="exception-list vertical">${exceptionRules.map((rule) => `<span>${rule}</span>`).join("")}</div></div>
    </section>
  `;
}

function renderExportSection() {
  return `
    <section class="focus-layout">
      <div class="panel focus-primary"><div class="panel-head"><div><h2>Render Provider Briefs</h2><p>Copy clean production briefs for the selected render/export tool.</p></div></div><div class="export-actions"><button class="ghost" data-tool-brief="Canva">Canva Brief</button><button class="ghost" data-tool-brief="Video">Video Brief</button><button class="ghost" data-tool-brief="OpenAI">Writer Brief</button></div></div>
      <div class="panel focus-side"><div class="panel-head compact"><h2>Default Provider</h2><span>${brandProfile.defaultRenderProvider}</span></div><div class="tag-cloud">${brandProfile.defaultExportFormats.map((item) => `<span>${item}</span>`).join("")}</div></div>
    </section>
  `;
}

function renderQueueSection() {
  return `
    <section class="focus-layout">
      <div class="panel focus-primary"><div class="panel-head"><div><h2>AI Content Queue</h2><p>Generated concepts routed into strict media drafts.</p></div><div class="segmented">${["Ready", "Review", "Draft", "All"].map((mode) => `<button class="${state.queueMode === mode ? "active" : ""}" data-mode="${mode}">${mode}</button>`).join("")}</div></div><div class="creative-list">${filteredCreatives().map((item) => `<article><div class="creative-score">${item.score}</div><div><div class="creative-title"><strong>${item.product}</strong><span>${item.status}</span></div><p>${item.hook}</p><small>${item.format} / ${item.asset} / ${item.channel}</small></div><div class="creative-actions"><button class="mini-button" data-export="${item.id}">Copy Brief</button></div></article>`).join("") || `<div class="empty">No items in this queue.</div>`}</div></div>
      <div class="panel focus-side"><div class="panel-head compact"><h2>Strict Publish</h2><span>Locked</span></div><p class="note">Publishing appears only after a media draft completes Render, Review, and approval in the strict workflow.</p></div>
    </section>
  `;
}

function renderConnectionsSection() {
  const rows = (state.connections.length ? state.connections : [
    { name: "Shopify Store", status: state.evidence.shopifyConfigured ? "connected" : "missing", purpose: "Product catalog connection", configured: state.evidence.shopifyConfigured },
    { name: "Supabase", status: state.evidence.supabaseConfigured ? "connected" : "missing", purpose: "Database and campaign storage", configured: state.evidence.supabaseConfigured },
    { name: "OpenAI", status: "check vault", purpose: "Live campaign and video generation", configured: false },
    { name: "Office Agent", status: "built in", purpose: "Autonomous beginning-to-end workflow runner", configured: true },
    { name: "Microsoft Workspace", status: "check vault", purpose: "Outlook, OneDrive, Excel, Teams automation", configured: false },
    { name: "Google Workspace", status: "check vault", purpose: "Gmail, Drive, Docs, Sheets, Calendar automation", configured: false }
  ]);

  return `
    <section class="focus-layout">
      <div class="panel focus-primary">
        <div class="panel-head">
          <div><h2>API Connections</h2><p>Connected services are shown without exposing private values.</p></div>
          <button class="ghost" data-refresh-evidence>${icon("filter")} Refresh</button>
        </div>
        <div class="connection-list">
          ${rows.map((connection) => `
            <div class="${connection.configured ? "connected" : "pending"}">
              <b>${connection.name}</b>
              <span>${connection.configured ? "Connected" : "Missing"}</span>
              <p>${connection.purpose}</p>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="panel focus-side">
        <div class="panel-head compact"><h2>Secret Vault</h2><span>Protected</span></div>
        <p class="brand-note">Use the vault to update private keys and passwords. Values are not displayed on this page.</p>
        <a class="primary link-button" href="/secret-vault">${icon("check")} Open Vault</a>
        <a class="ghost link-button" href="/owner-ai">${icon("cpu")} Owner AI Directives</a>
        <button class="ghost link-button" data-run-office-agent>${icon("spark")} Run Office Agent</button>
      </div>
    </section>
  `;
}

function renderMediaSection() {
  const ops = state.mediaOps || { media: [], scanner: {}, dispatches: [], findings: [], auditEvents: [], operatingMode: "auto_assist" };
  const media = filteredMediaOutputs(ops.media || []);
  const completedVideos = completedVideoOutputs(ops.media || []);
  const selectedFromList = (ops.media || []).find((item) => item.id === state.selectedMediaId) || media[0];
  const selected = state.selectedMediaRecord?.id === state.selectedMediaId ? state.selectedMediaRecord : selectedFromList;
  const scanner = ops.scanner || {};

  return `
    <section class="media-command">
      <div class="panel focus-primary">
        <div class="panel-head">
          <div>
            <h2>Media Output Center</h2>
            <p>${ops.operatingMode || "auto_assist"} mode / active viewing area: queued, rendering, complete, failed, rework / ${media.length} visible outputs</p>
          </div>
          <div class="segmented">
            ${["automated", "auto_assist", "manual"].map((mode) => `<button class="${ops.operatingMode === mode ? "active" : ""}" data-media-mode="${mode}">${mode.replace("_", " ")}</button>`).join("")}
          </div>
        </div>
        <div class="media-toolbar">
          <input data-media-search placeholder="Search outputs" value="${escapeAttr(state.mediaSearch)}" />
          <select data-media-filter>
            ${["All", "video", "image", "audio", "document"].map((item) => `<option ${state.mediaFilter === item ? "selected" : ""}>${item}</option>`).join("")}
          </select>
          <button class="ghost" data-media-view="${state.mediaView === "grid" ? "list" : "grid"}">${state.mediaView === "grid" ? "List" : "Grid"}</button>
          <button class="ghost" data-media-create>Manual Create</button>
        </div>
        <div class="media-${state.mediaView}">
          ${media.map((item) => renderMediaCard(item, ops)).join("") || `<div class="empty">No active viewing assets. Draft, initialized, scanned-only, ranked-only, and incomplete assets stay in their pipeline stages.</div>`}
        </div>
        <div class="panel-head compact" style="margin-top:18px;">
          <h2>Video Viewing Area</h2>
          <span>complete only / ${completedVideos.length}</span>
        </div>
        <div class="media-list">
          ${completedVideos.map((item) => renderCompletedVideoRow(item)).join("") || `<div class="empty">No completed rendered videos yet.</div>`}
        </div>
      </div>
      <div class="panel focus-side">
        <div class="panel-head compact"><h2>Scanner</h2><span>${scanner.status || "Ready"}</span></div>
        <div class="scanner-controls">
          <label><span>Enabled</span><input type="checkbox" data-scanner-enabled ${scanner.enabled ? "checked" : ""} /></label>
          <label><span>Interval</span><input type="number" data-scanner-interval value="${scanner.intervalMinutes || 60}" /></label>
          <label><span>Duration</span><input type="number" data-scanner-duration value="${scanner.durationSeconds || 45}" /></label>
          <button class="primary" data-scanner-run>Run Scan</button>
          <button class="ghost" data-archive-due>Run Due Archive</button>
        </div>
        ${state.selectedMediaLoading ? `<p class="note">Loading selected media output from EVICS backend...</p>` : ""}
        ${state.selectedMediaError ? `<p class="note error">${escapeText(state.selectedMediaError)}</p>` : ""}
        ${selected ? renderMediaDetail(selected, ops) : ""}
      </div>
    </section>
  `;
}

function renderMediaCard(item, ops) {
  const dispatches = (ops.dispatches || []).filter((dispatch) => dispatch.media_id === item.id);
  const playbackUrl = item.playback_url || `/api/media/playback/${encodeURIComponent(item.id)}`;
  const renderedUrl = directRenderedMediaUrl(item);
  const thumbnailUrl = item.thumbnail_url || item.metadata_json?.renderedThumbnailUrl || item.preview_url || item.metadata_json?.productImageUrl || "";
  const sourceMockupUrl = item.metadata_json?.sourceViralThumbnail || item.thumbnail_url || item.metadata_json?.productImageUrl || "";
  const productSku = String(item.metadata_json?.productSku || item.metadata_json?.sku || "").trim();
  const renderNumber = item.render_sequence || item.metadata_json?.renderCounter?.sequence || "n/a";
  const workflowStage = mediaWorkflowStage(item);
  const selectedVideoType = state.videoTypeSelections[item.id] || item.metadata_json?.videoType || inferVideoType(item);
  const hasProviderPreview = Boolean(renderedUrl);
  const canApprove = hasProviderPreview && ["pending", "rejected"].includes(item.approval_status);
  const canQueue = hasProviderPreview && item.approval_status === "approved" && !["queued", "published"].includes(item.publish_status);
  const canPublish = hasProviderPreview && item.approval_status === "approved" && item.publish_status !== "published";
  const canRender = item.media_type === "video" && !hasProviderPreview;
  return `
    <article class="media-card ${state.selectedMediaId === item.id ? "active" : ""}" data-media-select="${item.id}">
      <div class="media-preview ${item.media_type}">
        ${item.media_type === "video"
          ? (thumbnailUrl
            ? `<img class="media-render-thumb" src="${escapeAttr(thumbnailUrl)}" alt="Rendered video thumbnail" />`
            : `<div class="embedded-video-pending"><strong>Rendered thumbnail pending</strong><span>Complete render evidence will appear here.</span></div>`)
          : `<span>${item.media_type}</span>`}
      </div>
      <div>
        <h3>${escapeText(item.title)}</h3>
        <p>${escapeText(item.description || "No description available")}</p>
        <p>${escapeText(item.campaign_id)} / ${escapeText(item.created_source)} / ${escapeText(item.mode_at_creation)}</p>
        <div class="badge-row">
          <span>SKU: ${escapeText(productSku || "n/a")}</span>
          <span>Render #${escapeText(renderNumber)}</span>
          <span>${escapeText(workflowStage)}</span>
        </div>
        <div class="badge-row">
          <span>${item.media_type}</span>
          <span>${item.render_status || "initialized"}</span>
          ${item.error_code ? `<span>${escapeText(item.error_code)}</span>` : ""}
          ${item.rework_eligible ? `<span>rework eligible</span>` : ""}
          <span>${item.approval_status}</span>
          <span>${item.publish_status}</span>
          <span>${item.archive_status}</span>
          <span>${item.storage_location}</span>
        </div>
        <div class="badge-row">
          <span>Video type: ${escapeText(selectedVideoType)}</span>
          <span>Preview: ${hasProviderPreview ? "ready" : "pending"}</span>
        </div>
        ${renderVideoTypeSelect(item)}
        <small>${dispatches.map((dispatch) => `${dispatch.platform}: ${dispatch.status}`).join(" / ") || "No dispatches yet"}</small>
        ${renderDeliverySummary(item)}
        ${item.buy_now_url ? `<p class="buy-now-message">Buy Now is embedded in the video CTA window.</p>` : `<p class="buy-now-message missing">Product Buy Now link pending.</p>`}
      </div>
      <div class="media-actions">
        <button data-media-action="approve" data-media-id="${item.id}" ${canApprove ? "" : `disabled title="A real provider preview URL is required before approval."`}>Approve</button>
        <button data-media-quality="${item.id}">Quality</button>
        <button data-media-action="queue_publish" data-media-id="${item.id}" ${canQueue ? "" : `disabled title="Queue requires approval and a real provider preview URL."`}>Queue</button>
        <button data-media-action="publish_now" data-media-id="${item.id}" ${canPublish ? "" : `disabled title="Publish requires approval and a real provider preview URL."`}>Publish</button>
        <button data-media-render="${item.id}" data-provider="heygen" ${canRender ? "" : `disabled title="Render is available only for video records without a provider preview URL."`}>Render</button>
        <button data-media-reject="${item.id}">Reject</button>
        <button data-media-action="archive" data-media-id="${item.id}">Archive</button>
      </div>
    </article>
  `;
}

function renderCompletedVideoRow(item) {
  const playbackUrl = item.playback_url || `/api/media/playback/${encodeURIComponent(item.id)}`;
  const thumbnailUrl = item.thumbnail_url || item.preview_url || item.metadata_json?.renderedThumbnailUrl || "";
  const productSku = String(item.metadata_json?.productSku || item.metadata_json?.sku || "").trim();
  const renderNumber = item.render_sequence || item.metadata_json?.renderCounter?.sequence || "n/a";
  return `
    <article class="media-card compact" data-media-select="${item.id}">
      <div>
        <h3>${escapeText(item.title)}</h3>
        <div class="badge-row">
          <span>SKU: ${escapeText(productSku || "n/a")}</span>
          <span>Render #${escapeText(renderNumber)}</span>
          <span>${escapeText(item.render_status || "complete")}</span>
        </div>
        <p>${escapeText(item.origin_section_id || "unknown origin")} / ${escapeText(item.delivery_status || "pending")}</p>
        ${renderDeliverySummary(item)}
      </div>
      <div class="media-preview compact-preview">
        ${thumbnailUrl ? `<img class="media-render-thumb" src="${escapeAttr(thumbnailUrl)}" alt="Rendered video thumbnail" />` : `<div class="embedded-video-pending"><strong>No thumbnail yet</strong><span>Rendered evidence will appear after playback attaches.</span></div>`}
      </div>
    </article>
  `;
}

function renderDeliverySummary(item) {
  const destinations = item.delivery_destinations_json || {};
  const origin = destinations.originSection || {};
  const viewing = destinations.videoViewingArea || {};
  const workspace = destinations.googleWorkspace || {};
  return `
    <div class="badge-row delivery-row">
      <span>Origin: ${origin.delivered ? "yes" : "no"}</span>
      <span>Video Area: ${viewing.delivered ? "yes" : "no"}</span>
      <span>Google Workspace: ${workspace.delivered ? "yes" : "no"}</span>
    </div>
  `;
}

function renderMediaDetail(item, ops) {
  const findings = (ops.findings || []).filter((finding) => finding.media_id === item.id).slice(0, 4);
  const audit = (ops.auditEvents || []).filter((event) => event.mediaId === item.id).slice(0, 5);
  const renderedThumbnail = item.thumbnail_url || item.preview_url || item.metadata_json?.renderedThumbnailUrl || "";
  const sourceMockup = item.metadata_json?.sourceViralThumbnail || item.metadata_json?.productImageUrl || "";
  const productSku = String(item.metadata_json?.productSku || item.metadata_json?.sku || "").trim();
  const renderNumber = item.render_sequence || item.metadata_json?.renderCounter?.sequence || "n/a";
  const workflowStage = mediaWorkflowStage(item);
  const selectedVideoType = state.videoTypeSelections[item.id] || item.metadata_json?.videoType || inferVideoType(item);
  return `
    <div class="media-detail">
      <h3>${escapeText(item.title)}</h3>
      <p>${escapeText(item.description || "No description")}</p>
      <div class="evidence-strip">
        <div>
          <span>Rendered thumbnail</span>
          ${renderedThumbnail ? `<img src="${escapeAttr(renderedThumbnail)}" alt="Rendered video thumbnail" />` : `<div class="embedded-video-pending"><strong>No rendered thumbnail yet</strong><span>Awaiting render callback.</span></div>`}
        </div>
        <div>
          <span>Mockup evidence</span>
          ${sourceMockup ? `<img src="${escapeAttr(sourceMockup)}" alt="Source mockup thumbnail" />` : `<div class="embedded-video-pending"><strong>No mockup thumbnail supplied</strong><span>Attach product or source mockup evidence.</span></div>`}
        </div>
      </div>
      ${renderEmbeddedMediaViewer(item)}
      <div class="detail-grid">
        <span>Product SKU</span><b>${escapeText(productSku || "n/a")}</b>
        <span>Render #</span><b>${escapeText(renderNumber)}</b>
        <span>Workflow stage</span><b>${escapeText(workflowStage)}</b>
        <span>Video type</span><b>${escapeText(selectedVideoType)}</b>
        <span>Buy Now</span><b>${item.buy_now_url ? "Embedded inside the video CTA window" : "Pending"}</b>
        <span>Message</span><b class="centered-message">Please click link to get all the<br />product information you need to know</b>
        <span>Due</span><b>${item.migration_due_at || "N/A"}</b>
        <span>Migrated</span><b>${item.migrated_to_google_at || "Not yet"}</b>
        <span>Drive</span><b>${item.google_drive_file_id || "Pending"}</b>
        <span>Readiness</span><b>${item.readiness_score}</b>
        <span>Error Code</span><b>${item.error_code || "None"}</b>
        <span>Rework</span><b>${item.rework_eligible ? "Eligible" : "No"}</b>
      </div>
      <h4>Findings</h4>
      ${findings.map((finding) => `<p class="note">${finding.severity}: ${escapeText(finding.message)}</p>`).join("") || `<p class="note">No findings for this output.</p>`}
      <h4>Audit</h4>
      ${audit.map((event) => `<p class="note">${escapeText(event.action)} / ${escapeText(event.detail)}</p>`).join("") || `<p class="note">No audit events.</p>`}
    </div>
  `;
}

function directRenderedMediaUrl(item) {
  const metadata = item.metadata_json || {};
  const candidates = [
    metadata.renderedMediaUrl,
    metadata.mediaUrl,
    metadata.videoUrl,
    item.hot_storage_reference,
    item.playback_url
  ];
  return candidates.find((url) => {
    const value = String(url || "");
    return /^https?:\/\//i.test(value) || value.startsWith("/generated/") || value.startsWith("/work/");
  }) || "";
}

function renderEmbeddedMediaViewer(item) {
  if (item.media_type !== "video") return "";
  const videoUrl = directRenderedMediaUrl(item);
  const ctaUrl = item.buy_now_url || item.product_url || "";
  const ctaWindow = Number(item.metadata_json?.ctaWindowSeconds || 9);
  const cta = videoUrl && ctaUrl
    ? `<a class="video-buy-now-overlay" data-video-buy-now="${escapeAttr(item.id)}" href="${escapeAttr(ctaUrl)}" target="_blank" rel="noreferrer">${escapeText(item.buy_now_label || "Buy Now")}</a>`
    : "";

  return `
    <div class="embedded-video-viewer">
      ${videoUrl
        ? `<video class="embedded-rendered-video" data-video-viewer="${escapeAttr(item.id)}" data-cta-window="${ctaWindow}" src="${escapeAttr(videoUrl)}" poster="${escapeAttr(item.thumbnail_url || "")}" controls playsinline></video>`
        : `<div class="embedded-video-pending" data-video-pending="${escapeAttr(item.id)}" data-cta-window="${ctaWindow}">
             <strong>Rendered video file pending</strong>
             <span>Submit or complete a render callback with a direct video URL to view playback here.</span>
           </div>`
      }
      ${cta}
    </div>
  `;
}

function filteredMediaOutputs(items) {
  const search = state.mediaSearch.toLowerCase();
  const allowedStatuses = new Set(["queued", "rendering", "complete", "failed", "rework"]);
  const order = { rendering: 0, queued: 1, failed: 2, rework: 3, complete: 4 };
  return items.filter((item) => {
    if (!allowedStatuses.has(item.render_status)) return false;
    const matchesType = state.mediaFilter === "All" || item.media_type === state.mediaFilter;
    const haystack = `${item.title} ${item.description} ${item.campaign_id} ${item.created_source}`.toLowerCase();
    return matchesType && (!search || haystack.includes(search));
  }).sort((a, b) => (order[a.render_status] ?? 99) - (order[b.render_status] ?? 99) || String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
}

function completedVideoOutputs(items) {
  return items
    .filter((item) => item.media_type === "video" && item.render_status === "complete")
    .sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
}

function brandInitials(name) {
  return String(name || "EVIE")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function workspaceModeDescription() {
  if (state.workspaceMode === "Executive Simple Mode") {
    return "Designed for business owners, operators, marketing managers, or non-technical users who want professional campaign assets quickly.";
  }

  if (state.workspaceMode === "Compliance Review Mode") {
    return "Prioritizes claim safety, disclaimers, product claim rules, and review exceptions.";
  }

  if (state.workspaceMode === "Developer / Admin Mode") {
    return "Shows configuration, integrations, sync status, and advanced system controls.";
  }

  return "Shows expanded creative, automation, discovery, and export controls for experienced operators.";
}

function brandSettingInput(label, key) {
  return `
    <label>
      <span>${label}</span>
      <input data-brand-profile="${key}" value="${escapeAttr(brandProfile[key])}" />
    </label>
  `;
}

function brandLogoUpload() {
  return `
    <label class="logo-upload-field">
      <span>Logo Upload</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-logo-upload />
      <div class="logo-preview">
        ${brandProfile.logoUrl ? `<img src="${escapeAttr(brandProfile.logoUrl)}" alt="" />` : `<b>${brandInitials(brandProfile.publicBrandName)}</b>`}
        <small>${brandProfile.logoUrl ? "Current logo selected" : "No logo selected"}</small>
      </div>
    </label>
  `;
}

function brandSettingList(label, values) {
  return `
    <label class="brand-setting-list">
      <span>${label}</span>
      <textarea data-brand-profile-list="${settingKeyFromLabel(label)}">${escapeText((values || []).join("\n"))}</textarea>
    </label>
  `;
}

function settingKeyFromLabel(label) {
  const keys = {
    "Default Product Categories": "defaultProductCategories",
    "Approved Claims": "approvedClaims",
    "Restricted Claims": "restrictedClaims",
    "Required Disclaimers": "requiredDisclaimers",
    "Approved CTAs": "approvedCtas",
    "Preferred Visual Styles": "preferredVisualStyles",
    "Preferred Voiceover Styles": "preferredVoiceoverStyles",
    "Default Export Formats": "defaultExportFormats"
  };
  return keys[label] || "";
}

function select(name, options, value) {
  return `<label><select data-select="${name}">${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bindEvents() {
  document.querySelectorAll("[data-generate-ads]").forEach((button) => {
    button.addEventListener("click", generateDailyAds);
  });

  document.querySelectorAll("[data-sync-products]").forEach((button) => {
    button.addEventListener("click", syncProductsFromShopify);
  });

  document.querySelectorAll("[data-refresh-evidence]").forEach((button) => {
    button.addEventListener("click", async () => {
      await refreshEvidence();
      state.workflowMessage = "Build evidence refreshed.";
      render();
    });
  });

  document.querySelectorAll("[data-run-autopilot]").forEach((button) => {
    button.addEventListener("click", runAutopilot);
  });

  document.querySelectorAll("[data-run-office-agent]").forEach((button) => {
    button.addEventListener("click", runOfficeAgentFromApp);
  });

  document.querySelectorAll("[data-media-mode]").forEach((button) => {
    button.addEventListener("click", async () => {
      await postMedia("/api/media/mode", { mode: button.dataset.mediaMode });
    });
  });

  document.querySelectorAll("[data-media-search]").forEach((input) => {
    input.addEventListener("input", () => {
      state.mediaSearch = input.value;
      render();
    });
  });

  document.querySelectorAll("[data-media-filter]").forEach((field) => {
    field.addEventListener("change", () => {
      state.mediaFilter = field.value;
      render();
    });
  });

  document.querySelectorAll("[data-media-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mediaView = button.dataset.mediaView;
      render();
    });
  });

  document.querySelectorAll("[data-media-select]").forEach((card) => {
    card.addEventListener("click", async () => {
      await hydrateSelectedMediaOutput(card.dataset.mediaSelect);
    });
  });

  document.querySelectorAll("[data-media-seed]").forEach((button) => {
    button.addEventListener("click", async () => postMedia("/api/media/seed", {}));
  });

  document.querySelectorAll("[data-media-create]").forEach((button) => {
    button.addEventListener("click", async () => createMediaOutputFromSelection("manual"));
  });

  document.querySelectorAll("[data-media-action]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await postMedia("/api/media/action", {
        action: button.dataset.mediaAction,
        ids: [button.dataset.mediaId],
        options: { override: button.dataset.mediaAction === "archive" }
      });
    });
  });

  document.querySelectorAll("[data-media-quality]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await postMedia(`/api/media/${encodeURIComponent(button.dataset.mediaQuality)}/quality-check`, {});
    });
  });

  document.querySelectorAll("[data-media-reject]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await postMedia(`/api/media/${encodeURIComponent(button.dataset.mediaReject)}/reject`, {
        reason: "Rejected from Media Output Center."
      });
    });
  });

  document.querySelectorAll("[data-media-render]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await submitRenderJob(button.dataset.provider || "heygen", button.dataset.mediaRender);
    });
  });

  document.querySelectorAll("[data-video-type-select]").forEach((selectElement) => {
    selectElement.addEventListener("change", () => {
      const mediaId = selectElement.dataset.videoId;
      const selectedType = selectElement.value;
      state.videoTypeSelections = {
        ...(state.videoTypeSelections || {}),
        [mediaId]: selectedType
      };
      saveVideoTypeSelections();
      const label = document.querySelector(`[data-video-type-label="${mediaId}"]`);
      if (label) label.textContent = selectedType;
      render();
    });
  });

  bindVideoBuyNowOverlays();

  document.querySelectorAll("[data-scanner-run]").forEach((button) => {
    button.addEventListener("click", async () => postMedia("/api/scanner/run", {}));
  });

  document.querySelectorAll("[data-archive-due]").forEach((button) => {
    button.addEventListener("click", async () => postMedia("/api/archive/run-due", {}));
  });

  document.querySelectorAll("[data-scanner-enabled],[data-scanner-interval],[data-scanner-duration]").forEach((field) => {
    field.addEventListener("change", async () => {
      await postMedia("/api/scanner/settings", {
        enabled: document.querySelector("[data-scanner-enabled]")?.checked,
        intervalMinutes: document.querySelector("[data-scanner-interval]")?.value,
        durationSeconds: document.querySelector("[data-scanner-duration]")?.value
      });
    });
  });

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSection = button.dataset.section;
      render();
    });
  });

  document.querySelectorAll("[data-section-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSection = button.dataset.sectionJump;
      render();
    });
  });

  document.querySelectorAll("[data-autopilot-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.autopilotMode = button.dataset.autopilotMode;
      state.autopilotMessage = `${state.autopilotMode} mode selected.`;
      render();
    });
  });

  document.querySelectorAll("[data-workspace-mode]").forEach((field) => {
    field.addEventListener("change", () => {
      state.workspaceMode = field.value;
      state.showAdvancedOptions = state.workspaceMode !== "Executive Simple Mode";
      state.workflowMessage = `${state.workspaceMode} selected.`;
      render();
    });
  });

  document.querySelectorAll("[data-toggle-advanced]").forEach((button) => {
    button.addEventListener("click", () => {
      state.showAdvancedOptions = !state.showAdvancedOptions;
      render();
    });
  });

  document.querySelectorAll("[data-simple-product]").forEach((field) => {
    field.addEventListener("change", () => {
      state.selectedProducts = new Set([field.value]);
      state.workflowMessage = `${field.value} selected for the simple workflow.`;
      render();
    });
  });

  document.querySelectorAll("[data-simple-video-length]").forEach((field) => {
    field.addEventListener("change", () => {
      state.simpleVideoLength = field.value;
      state.workflowMessage = `${field.value} selected for the simple workflow.`;
      render();
    });
  });

  document.querySelectorAll("[data-simple-audience]").forEach((field) => {
    field.addEventListener("change", () => {
      state.simpleAudience = field.value;
      state.workflowMessage = `${field.value} selected as the target audience.`;
      render();
    });
  });

  document.querySelectorAll("[data-brief]").forEach((field) => {
    field.addEventListener("change", () => {
      state[field.dataset.brief] = field.value;
      state.workflowMessage = "Campaign brief updated for the next generation run.";
      render();
    });
  });

  document.querySelectorAll("[data-founder-story]").forEach((field) => {
    field.addEventListener("change", () => {
      state[field.dataset.founderStory] = field.value;
      state.workflowMessage = `${state.founderStoryAngle} founder story angle selected.`;
      render();
    });
  });

  document.querySelectorAll("[data-brand-profile]").forEach((field) => {
    field.addEventListener("change", () => {
      updateBrandProfileField(field.dataset.brandProfile, field.value);
      state.brandProfileMessage = "Brand profile updated and saved in this browser.";
      render();
    });
  });

  document.querySelectorAll("[data-brand-profile-list]").forEach((field) => {
    field.addEventListener("change", () => {
      const values = field.value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      updateBrandProfileField(field.dataset.brandProfileList, values);
      state.brandProfileMessage = "Brand profile list updated and saved in this browser.";
      render();
    });
  });

  document.querySelectorAll("[data-logo-upload]").forEach((field) => {
    field.addEventListener("change", () => {
      const file = field.files && field.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        state.brandProfileMessage = "Choose an image file for the logo.";
        render();
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        updateBrandProfileField("logoUrl", reader.result);
        state.brandProfileMessage = `${file.name} uploaded and saved to ${brandProfile.profileName}.`;
        render();
      });
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll("[data-brand-profile-select]").forEach((field) => {
    field.addEventListener("change", () => {
      selectBrandProfile(field.value);
      render();
    });
  });

  document.querySelectorAll("[data-create-brand-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      duplicateBrandProfile();
      render();
    });
  });

  document.querySelectorAll("[data-save-brand-profile]").forEach((button) => {
    button.addEventListener("click", async () => {
      const saved = await saveBrandProfiles();
      state.brandProfileMessage = saved
        ? `${brandProfile.profileName} saved to EVICS storage.`
        : `${brandProfile.profileName} saved in this browser. EVICS storage is unavailable.`;
      render();
    });
  });

  document.querySelectorAll("[data-select-top-products]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProducts = new Set(products.slice(0, 5).map((product) => product.name));
      state.workflowMessage = "Top 5 Shopify products selected for today's run.";
      render();
    });
  });

  document.querySelectorAll("[data-export-pack]").forEach((button) => {
    button.addEventListener("click", exportApprovedPack);
  });

  document.querySelectorAll("[data-download-pack]").forEach((button) => {
    button.addEventListener("click", downloadApprovedPack);
  });

  document.querySelectorAll("[data-tool-brief]").forEach((button) => {
    button.addEventListener("click", () => exportToolBrief(button.dataset.toolBrief));
  });

  document.querySelectorAll("[data-product-index]").forEach((card) => {
    card.addEventListener("click", () => {
      const product = products[Number(card.dataset.productIndex)];
      if (!product) return;

      if (state.selectedProducts.has(product.name)) {
        state.selectedProducts.delete(product.name);
      } else {
        state.selectedProducts.add(product.name);
      }

      state.workflowMessage = `${state.selectedProducts.size} products selected for today's ad run.`;
      render();
    });
  });

  document.querySelectorAll("[data-product-name]").forEach((card) => {
    card.addEventListener("click", () => {
      const product = products.find((item) => item.name === card.dataset.productName);
      if (!product) return;

      if (state.selectedProducts.has(product.name)) {
        state.selectedProducts.delete(product.name);
      } else {
        state.selectedProducts.add(product.name);
      }

      state.workflowMessage = `${state.selectedProducts.size} products selected for today's ad run.`;
      render();
    });
  });

  document.querySelectorAll("[data-product-search]").forEach((input) => {
    input.addEventListener("input", () => {
      state.productSearch = input.value;
      render();
    });
  });

  document.querySelectorAll("[data-toggle-selected-products]").forEach((button) => {
    button.addEventListener("click", () => {
      state.showSelectedProductsOnly = !state.showSelectedProductsOnly;
      render();
    });
  });

  document.querySelectorAll("[data-connect-sources]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.dataSource = "Checking";
      state.syncLevel = "loading";
      state.syncMessage = "Checking Supabase and Shopify connections...";
      render();

      try {
        const statusResponse = await fetch("/api/agents/system-status", { headers: { Accept: "application/json" } });
        const status = await statusResponse.json();
        const productsResponse = await fetch("/api/media/products", { headers: { Accept: "application/json" } });
        const productPayload = productsResponse.ok ? await productsResponse.json() : { count: 0 };

        if (!status.success) {
          state.dataSource = "Setup needed";
          state.syncLevel = "error";
          state.syncMessage = "EVICS backend status is unavailable.";
        } else if (!productPayload.count) {
          state.dataSource = "Ready to sync";
          state.syncLevel = "loading";
          state.syncMessage = "No products are loaded yet. Use Refresh Products to sync through /api/media/products/sync.";
        } else {
          state.dataSource = "EVICS Backend";
          state.syncLevel = "connected";
          state.syncMessage = `${productPayload.count} products are available through the media API.`;
        }
      } catch (error) {
        state.dataSource = "Connection check";
        state.syncLevel = "error";
        state.syncMessage = "Connection check failed. Confirm the dashboard server is running.";
        console.error(error);
      }

      render();
    });
  });

  document.querySelectorAll("[data-ad]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAdId = button.dataset.ad;
      render();
    });
  });

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

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.queueMode = button.dataset.mode;
      render();
    });
  });

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const creative = creatives.find((item) => item.id === button.dataset.export);
      if (creative) exportCreative(creative);
    });
  });

  // Voice Copilot Event Handlers
  document.querySelectorAll("[data-toggle-copilot]").forEach((button) => {
    button.addEventListener("click", () => {
      state.showCopilot = !state.showCopilot;
      render();
    });
  });

  document.querySelectorAll("[data-close-copilot]").forEach((button) => {
    button.addEventListener("click", () => {
      state.showCopilot = false;
      render();
    });
  });

  document.querySelectorAll("[data-voice-mic]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.startVoiceCapture || !window.stopVoiceCapture) {
        return;
      }

      if (window.voiceState?.isListening) {
        window.stopVoiceCapture();
      } else {
        window.startVoiceCapture();
      }
    });
  });

  document.querySelectorAll("[data-voice-command]").forEach((button) => {
    button.addEventListener("click", () => {
      const command = button.dataset.voiceCommand;
      if (typeof window.handleVoiceCommand === 'function') {
        window.handleVoiceCommand(command);
      }
    });
  });

  document.querySelectorAll("[data-voice-submit]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = document.querySelector("[data-voice-text]");
      const command = field ? field.value.trim() : "";
      if (command && typeof window.handleVoiceCommand === "function") {
        window.handleVoiceCommand(command);
        field.value = "";
      }
    });
  });

  document.querySelectorAll("[data-voice-text]").forEach((field) => {
    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const command = field.value.trim();
      if (command && typeof window.handleVoiceCommand === "function") {
        window.handleVoiceCommand(command);
        field.value = "";
      }
    });
  });

}

function bindVideoBuyNowOverlays() {
  document.querySelectorAll("[data-video-viewer]").forEach((video) => {
    const id = video.dataset.videoViewer;
    const cta = document.querySelector(`[data-video-buy-now="${cssEscape(id)}"]`);
    if (!cta) return;
    const ctaWindow = Math.max(8, Math.min(10, Number(video.dataset.ctaWindow) || 9));
    const sync = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const startsAt = duration > ctaWindow ? duration - ctaWindow : Math.max(0, duration * 0.72);
      const visible = duration > 0 && video.currentTime >= startsAt;
      cta.classList.toggle("visible", visible);
    };
    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("timeupdate", sync);
    video.addEventListener("ended", () => cta.classList.add("visible"));
    sync();
  });

  document.querySelectorAll("[data-video-pending]").forEach((stage) => {
    const id = stage.dataset.videoPending;
    const cta = document.querySelector(`[data-video-buy-now="${cssEscape(id)}"]`);
    if (!cta) return;
    cta.classList.remove("visible");
  });
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return String(value || "").replace(/["\\]/g, "\\$&");
}

window.evicsActions = {
  refreshEvidence,
  syncProducts: syncProductsFromShopify,
  generateAds: generateDailyAds,
  runAutopilot,
  runOfficeAgent: runOfficeAgentFromApp,
  exportApprovedPack,
  downloadApprovedPack,
  hydrateMediaOps,
  hydrateSelectedMediaOutput,
  postMedia,
  createMediaOutput: createMediaOutputFromSelection,
  submitRenderJob,
  seedMediaOutputs: async () => postMedia("/api/media/seed", {}),
  runMediaScanner: async () => postMedia("/api/scanner/run", {}),
  archiveSelectedMedia: async () => {
    const id = state.selectedMediaId || state.mediaOps?.media?.[0]?.id;
    if (!id) return;
    await postMedia("/api/media/action", {
      action: "archive",
      ids: [id],
      options: { override: true }
    });
  },
  navigate(section) {
    state.activeSection = section;
    render();
  },
  selectTopProducts(count = 5) {
    state.selectedProducts = new Set(products.slice(0, count).map((product) => product.name));
    state.workflowMessage = `${state.selectedProducts.size} top Shopify products selected for the directive.`;
    render();
  },
  getStatus() {
    return {
      products: products.length,
      selectedProducts: state.selectedProducts.size,
      creatives: creatives.length,
      approved: state.approvals.size,
      shopifyConfigured: state.evidence.shopifyConfigured,
      supabaseConfigured: state.evidence.supabaseConfigured,
      syncedProductCount: state.evidence.syncedProductCount,
      activeSection: state.activeSection,
      syncMessage: state.syncMessage,
      workflowMessage: state.workflowMessage,
      selectedMediaId: state.selectedMediaId,
      selectedMediaLoading: state.selectedMediaLoading,
      selectedMediaError: state.selectedMediaError
    };
  }
};

async function boot() {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get("section");
    const allowedSections = new Set([
      "command",
      "discovery",
      "studio",
      "matching",
      "media",
      "compliance",
      "export",
      "queue",
      "connections",
      "brand-settings"
    ]);
    if (requestedSection && allowedSections.has(requestedSection)) {
      state.activeSection = requestedSection;
    }
  }

  await hydrateBrandProfilesFromServer();
  await refreshEvidence();
  await hydrateMediaOps();
  render();
  await hydrateFromSupabase();
  await hydrateFromServerApi();
  await refreshEvidence();
  await hydrateMediaOps();
  render();

  if (typeof window !== "undefined" && !window.__evicsLiveRefreshTimer) {
    const runLiveRefresh = async () => {
      try {
        await refreshEvidence();
        await hydrateMediaOps();
        render();
      } catch (error) {
        console.warn("Live refresh skipped.", error);
      }
    };

    window.__evicsLiveRefreshTimer = window.setInterval(runLiveRefresh, 15000);
    if (!window.__evicsLiveRefreshBound) {
      window.__evicsLiveRefreshBound = true;
      window.addEventListener("focus", runLiveRefresh);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") runLiveRefresh();
      });
    }
  }
}

boot();
