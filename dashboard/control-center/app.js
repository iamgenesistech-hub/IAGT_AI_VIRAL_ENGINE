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

const state = {
  // ── Navigation ──
  currentSection: "viral-intelligence",

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
  selectedAdId: "ad-001",
  approvals: new Set(["cr-001", "cr-003"]),
  dataSource: "Demo",
  syncLevel: "demo",
  syncMessage: "Add Supabase credentials in config.js to load live workspace data.",

  // Viral Ads Scan
  scanAmount: 1284,
  scanCount: 1284,
  scanning: false,

  // Winning Hooks
  hookTarget: 100,
  hookSearching: false,
  hooksFound: 73,
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
  videoDuration: "30s",
  videoStyle: "UGC",
  videoVoice: "Female",
  videoBackground: "Music",
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
  autoGenerateResult: null,

  // Copilot
  copilotOpen: false,
  copilotQuestion: "",
  copilotAnswer: null,
  copilotNextActions: [],
  copilotLoading: false,

  // Agent Orchestration Dashboard
  agentStatusOpen: false,
  agentStatuses: [],
  agentStatusLoading: false,
  agentStatusError: null,
  agentPipelineHealth: 98,

  // Published Media Gallery
  publishedMediaOpen: false,
  publishedMedia: [],
  publishedMediaLoading: false,
  publishedMediaFilter: "All",
  selectedPublishedId: null,
  publishActionStatus: null,

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
  }
};

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
    script: "Open on bathroom counter. Hand picks up Sea Moss Gel. VO: 'Nobody tells you minerals can change your whole morning. I started this ritual 30 days ago...' Cut to morning routine. Product close-up. CTA: 'Start your mineral ritual today.'",
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

// ── Demo product viral memories ──
let demoProductViralMemories = [
  {
    product_id: "sea-moss-mineral-gel",
    product_name: "Sea Moss Mineral Gel",
    most_viral_ad_id: "ad-001",
    viral_score: 94,
    hook: "Nobody tells you minerals can change your whole morning.",
    pacing: "Fast cuts (0–2s hook, 2–5s mineral gap, 5–12s morning ritual, 12–15s CTA)",
    cta: "Start your mineral ritual",
    visual_style: "UGC testimonial",
    emotional_triggers: ["curiosity", "wellness", "ritual"],
    structure: ["Hook", "Mineral gap", "Morning ritual", "Product close-up", "CTA"],
    platform_breakdown: { TikTok: 48, Instagram: 28, YouTube: 14, Facebook: 10 },
    last_updated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reproduction_count: 7,
    performance_metrics: { avg_views: 1240000, avg_engagement: 11.4, avg_conversion: 3.2 }
  },
  {
    product_id: "metabolic-ignite",
    product_name: "Metabolic Ignite",
    most_viral_ad_id: "ad-001",
    viral_score: 91,
    hook: "I lost the bloat in 7 days doing this one thing every morning…",
    pacing: "Fast cuts (0–2s hook, 2–6s before state, 6–12s discovery, 12–15s CTA)",
    cta: "Start your reset today",
    visual_style: "UGC testimonial",
    emotional_triggers: ["hope", "transformation", "urgency"],
    structure: ["Hook", "Before state", "Discovery moment", "Product ritual", "CTA"],
    platform_breakdown: { TikTok: 52, Instagram: 26, Facebook: 14, YouTube: 8 },
    last_updated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    reproduction_count: 12,
    performance_metrics: { avg_views: 2100000, avg_engagement: 13.1, avg_conversion: 4.1 }
  },
  {
    product_id: "genesis-glow-collagen",
    product_name: "Genesis Glow Collagen",
    most_viral_ad_id: "ad-002",
    viral_score: 88,
    hook: "This changed my skin in 7 days — no filter, no edits.",
    pacing: "Slow luxury cuts (0–3s hook, 3–8s mirror proof, 8–13s routine, 13–15s CTA)",
    cta: "Shop the glow stack",
    visual_style: "Luxury lifestyle routine",
    emotional_triggers: ["aspiration", "confidence", "trust"],
    structure: ["Hook", "Mirror proof", "Ingredient flash", "Routine", "CTA"],
    platform_breakdown: { Instagram: 44, Pinterest: 28, TikTok: 18, YouTube: 10 },
    last_updated: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    reproduction_count: 5,
    performance_metrics: { avg_views: 980000, avg_engagement: 9.8, avg_conversion: 2.9 }
  },
  {
    product_id: "apex-testosterone-support",
    product_name: "Apex Testosterone Support",
    most_viral_ad_id: "ad-003",
    viral_score: 86,
    hook: "Your training does not need more hype. It needs foundation.",
    pacing: "Gym-paced cuts (0–2s hook, 2–7s low-energy problem, 7–12s workout proof, 12–15s CTA)",
    cta: "Build your foundation",
    visual_style: "Gym UGC commercial",
    emotional_triggers: ["discipline", "strength", "control"],
    structure: ["Hook", "Low-energy problem", "Workout proof", "Product reveal", "CTA"],
    platform_breakdown: { TikTok: 40, YouTube: 30, Facebook: 20, Instagram: 10 },
    last_updated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    reproduction_count: 4,
    performance_metrics: { avg_views: 760000, avg_engagement: 8.9, avg_conversion: 2.6 }
  },
  {
    product_id: "neurorise-focus",
    product_name: "NeuroRise Focus",
    most_viral_ad_id: "ad-004",
    viral_score: 82,
    hook: "My 2 PM crash disappeared when I started doing this…",
    pacing: "Desk-paced cuts (0–2s hook, 2–6s daily pain, 6–11s ingredient cue, 11–15s CTA)",
    cta: "Upgrade your focus stack",
    visual_style: "Founder desk UGC",
    emotional_triggers: ["clarity", "ambition", "momentum"],
    structure: ["Hook", "Daily pain", "Ingredient cue", "Focus result", "CTA"],
    platform_breakdown: { YouTube: 38, TikTok: 32, Facebook: 20, Instagram: 10 },
    last_updated: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    reproduction_count: 3,
    performance_metrics: { avg_views: 540000, avg_engagement: 8.2, avg_conversion: 2.4 }
  }
];

let workflow = [
  ["6:00 AM", "Scrape viral content", "TikTok, Reels, Shorts, Ads Library, Pinterest, X"],
  ["6:30 AM", "Analyze winning structures", "Hooks, pacing, CTAs, visual patterns, emotional tags"],
  ["7:00 AM", "Match products", "Connect trends to IAGT supplements and offers"],
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
    swap:    '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>'
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

function filteredMediaVideos() {
  const f = state.mediaFilter;
  if (f === "all") return state.mediaVideos;
  if (f === "pending") return state.mediaVideos.filter((v) => !v.approvalStatus || v.approvalStatus === "pending");
  return state.mediaVideos.filter((v) => v.approvalStatus === f);
}

function renderMediaStatusDashboard() {
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

function renderMediaCard(video) {
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
  const params = video.parameters || {};
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
              ${video.videoUrl
                ? `<video src="${video.videoUrl}" controls playsinline class="media-player-video"></video>`
                : `<div class="media-player-placeholder">${icon("video")}<span>No video URL yet</span><small>${video.status === "queued" ? "Queued for rendering…" : video.status === "pending" ? "Awaiting render engine" : "Video unavailable"}</small></div>`
              }
            </div>

            <!-- Metadata -->
            <div class="media-meta-grid">
              <div class="media-meta-item"><dt>Platform</dt><dd>${video.platform}</dd></div>
              <div class="media-meta-item"><dt>Product</dt><dd>${video.product || "—"}</dd></div>
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

function renderMediaGallery() {
  const filtered = filteredMediaVideos();
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

      ${renderMediaStatusDashboard()}

      <div class="media-gallery-controls">
        <div class="media-filter-tabs">
          ${["all", "pending", "approved", "needs_rerender", "discarded"].map((f) => `
            <button class="media-filter-tab ${state.mediaFilter === f ? "active" : ""}" data-media-filter="${f}">
              ${f === "all" ? "All" : f === "needs_rerender" ? "Re-render" : mediaApprovalLabel(f)}
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
          ${filtered.map(renderMediaCard).join("")}
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

function formatRelativeTime(isoString) {
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

async function loadMediaGallery() {
  state.mediaLoading = true;
  render();
  try {
    const [galleryRes, statsRes] = await Promise.all([
      fetch("/api/media/gallery"),
      fetch("/api/media/stats")
    ]);
    if (galleryRes.ok) {
      const data = await galleryRes.json();
      state.mediaVideos = data.videos || [];
    }
    if (statsRes.ok) {
      const data = await statsRes.json();
      state.mediaStats = data.stats || state.mediaStats;
    }
  } catch {
    // Demo mode: populate with sample data from existing renders
    state.mediaVideos = buildDemoMediaVideos();
    state.mediaStats = {
      total: state.mediaVideos.length,
      approved: state.mediaVideos.filter((v) => v.approvalStatus === "approved").length,
      pending: state.mediaVideos.filter((v) => v.approvalStatus === "pending").length,
      rerender: state.mediaVideos.filter((v) => v.approvalStatus === "needs_rerender").length,
      discarded: state.mediaVideos.filter((v) => v.approvalStatus === "discarded").length,
    };
  }
  state.mediaLoading = false;
  render();
}

function buildDemoMediaVideos() {
  return [
    {
      id: "demo-v-001",
      platform: "HeyGen",
      videoUrl: null,
      thumbnailUrl: null,
      status: "complete",
      approvalStatus: "pending",
      script: "Open on bathroom counter. Hand picks up Sea Moss Gel. VO: 'Nobody tells you minerals can change your whole morning.' Cut to morning routine. Product close-up. CTA: 'Start your mineral ritual today.'",
      parameters: { style: "UGC", duration: "15s", voice: "Female", background: "Music", aspect: "9:16" },
      rejectionReason: "",
      aiSuggestions: null,
      iterationCount: 0,
      qualityScore: 94,
      product: "Sea Moss Mineral Gel",
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
  { id: "m-001", media_type: "video",       platform: "heygen",   status: "complete", script: "Sea Moss morning ritual — 15s UGC",          score: 94, created_at: "2025-01-15T08:00:00Z", video_url: null, product: "Sea Moss Mineral Gel",       hook: "Nobody tells you minerals can change your whole morning." },
  { id: "m-002", media_type: "video",       platform: "runway",   status: "complete", script: "Collagen glow lifestyle edit — 9:16",         score: 89, created_at: "2025-01-15T09:30:00Z", video_url: null, product: "Genesis Glow Collagen",      hook: "This changed my skin in 7 days." },
  { id: "m-003", media_type: "video",       platform: "kling",    status: "pending",  script: "Testosterone gym commercial — 30s",           score: 81, created_at: "2025-01-15T10:00:00Z", video_url: null, product: "Apex Testosterone Support",  hook: "Your training needs foundation, not hype." },
  { id: "m-004", media_type: "print_ad",    platform: "canva",    status: "complete", script: "Sea Moss flatlay print — A4 portrait",        score: 87, created_at: "2025-01-14T14:00:00Z", video_url: null, product: "Sea Moss Mineral Gel",       hook: "The mineral ritual your body has been missing." },
  { id: "m-005", media_type: "print_ad",    platform: "manual",   status: "complete", script: "Collagen beauty magazine spread",             score: 83, created_at: "2025-01-14T15:30:00Z", video_url: null, product: "Genesis Glow Collagen",      hook: "Glow from within." },
  { id: "m-006", media_type: "email",       platform: "internal", status: "complete", script: "Weekly wellness newsletter — Jan 15",         score: 76, created_at: "2025-01-14T16:00:00Z", video_url: null, product: "Genesis Wellness Bundle",    hook: "Your weekly ritual starts here." },
  { id: "m-007", media_type: "email",       platform: "internal", status: "draft",    script: "Flash sale email — 48hr offer",               score: 71, created_at: "2025-01-13T11:00:00Z", video_url: null, product: "Metabolic Ignite",           hook: "48 hours. Your reset starts now." },
  { id: "m-008", media_type: "social_post", platform: "canva",    status: "complete", script: "TikTok caption + hook card — Sea Moss",       score: 90, created_at: "2025-01-15T07:00:00Z", video_url: null, product: "Sea Moss Mineral Gel",       hook: "Nobody talks about this morning habit..." },
  { id: "m-009", media_type: "social_post", platform: "openai",   status: "complete", script: "Instagram carousel — 5 slides, Collagen",     score: 85, created_at: "2025-01-14T12:00:00Z", video_url: null, product: "Genesis Glow Collagen",      hook: "5 reasons your skin needs collagen now." },
  { id: "m-010", media_type: "landing_page",platform: "internal", status: "complete", script: "Sea Moss product landing page — v3",          score: 92, created_at: "2025-01-13T09:00:00Z", video_url: null, product: "Sea Moss Mineral Gel",       hook: "The mineral ritual trusted by 10,000+ customers." },
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
    product: "Sea Moss Mineral Gel",
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
    product: "Sea Moss Mineral Gel",
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
    currentTask: "Scanning 1,284 viral ads for hook patterns",
    processingTime: "2.4s avg",
    lastResult: "Found 12 high-confidence hooks in Beauty + Weight Loss categories",
    qualityScore: 94,
    nextAction: "Rescan at 6:00 AM — targeting 1,500 ads",
    icon: "radar"
  },
  {
    id: "product-match",
    name: "Product Match Agent",
    role: "Matching trending content patterns to IAGT product catalog",
    status: "active",
    currentTask: "Matching Sea Moss + Collagen to top 5 viral structures",
    processingTime: "1.1s avg",
    lastResult: "Sea Moss Mineral Gel matched to 3 viral hooks — confidence: High",
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

async function validateQuality() {
  state.qualityValidating = true;
  state.qualityResult = null;
  render();
  try {
    const res = await fetch("/api/quality/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.qualityScores)
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

function filteredPublishedMedia() {
  const items = state.publishedMedia.length ? state.publishedMedia : DEMO_PUBLISHED_MEDIA;
  if (state.publishedMediaFilter === "All") return items;
  return items.filter((m) => m.status === state.publishedMediaFilter);
}

function filteredMedia() {
  return DEMO_MEDIA.filter((item) => {
    const typeMatch = state.selectedMediaType === "All" || item.media_type === state.selectedMediaType;
    const appMatch  = state.selectedRenderApp  === "All" || item.platform    === state.selectedRenderApp;
    return typeMatch && appMatch;
  });
}

function selectedMedia() {
  return DEMO_MEDIA.find((m) => m.id === state.selectedMediaId) || null;
}

function mediaTypeLabel(id) {
  const t = MEDIA_TYPES.find((t) => t.id === id);
  return t ? t.label : id;
}

function renderAppLabel(id) {
  const a = RENDER_APPS.find((a) => a.id === id);
  return a ? a.label : id;
}

function statusBadgeClass(status) {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s === "complete" || s === "approved") return "status-ready";
  if (s === "pending"  || s === "rendering") return "status-review";
  if (s === "draft"    || s === "failed")    return "status-draft";
  return "";
}

// ── Section definitions ──
const SECTIONS = [
  { id: "viral-intelligence", icon: "radar",  label: "Viral Intelligence",  desc: "Trend scanning, hook discovery, viral pattern analysis" },
  { id: "ai-reconstruction",  icon: "spark",  label: "AI Reconstruction",   desc: "AI-powered creative reconstruction from viral ads" },
  { id: "video-generation",   icon: "video",  label: "Video Generation",    desc: "Video rendering via HeyGen, Runway, and Kling" },
  { id: "distribution",       icon: "send",   label: "Distribution",        desc: "Publishing queue and channel management" },
  { id: "analytics",          icon: "chart",  label: "Analytics",           desc: "Performance metrics and learning loop" },
  { id: "twin-automation",    icon: "gear",   label: "Twin Automation",     desc: "Agent orchestration and auto-generate pipeline" },
  { id: "api-management",     icon: "shield", label: "API Management",      desc: "API keys, token tracking, failover, and alerts" }
];

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
              ? `<div class="media-empty">No media found for the selected filters.</div>`
              : items.map((item) => `
                <button class="media-card ${item.id === state.selectedMediaId ? "media-card-selected" : ""}" data-media-id="${item.id}">
                  <div class="media-card-thumb media-thumb-${item.media_type}">
                    ${item.video_url
                      ? `<img src="${item.video_url}" alt="" />`
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
        ${item.video_url
          ? (item.media_type === "video" || item.media_type === "ugc"
              ? `<video class="media-video-player" src="${item.video_url}" controls></video>`
              : `<img class="media-image-viewer" src="${item.video_url}" alt="${item.script}" />`)
          : `<div class="media-preview-placeholder">
               <div class="media-preview-icon">${mediaTypeIcon(item.media_type)}</div>
               <p>${item.media_type === "video" || item.media_type === "ugc" ? "Video preview not yet available" : "Preview not yet available"}</p>
             </div>`
        }
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
      if (data.success && data.videos && data.videos.length) {
        state.viralVideos = data.videos.map(mapViralVideo);
      } else {
        state.viralVideos = getFilteredDemoViralVideos();
      }
    } else {
      state.viralVideos = getFilteredDemoViralVideos();
    }
  } catch {
    state.viralVideos = getFilteredDemoViralVideos();
  }
  state.viralLoading = false;
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
  const video = (state.viralVideos.length ? state.viralVideos : viralAds).find((v) => v.id === videoId) || viralAds[0];
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

function renderViralGallery() {
  const displayVideos = state.viralVideos.length ? state.viralVideos : getFilteredDemoViralVideos();
  const allPlatforms = ["All", ...new Set(viralAds.map((a) => a.platform))];
  const allCategories = ["All", ...new Set(viralAds.map((a) => a.category))];

  return `
    <section class="viral-gallery-section panel">
      <div class="viral-gallery-header">
        <div class="viral-gallery-title-row">
          <div>
            <h2>${icon("video")} Viral Content Gallery</h2>
            <p>${displayVideos.length} scraped viral videos · Filter by platform or category to find patterns</p>
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
            <div><dt>CTA framework</dt><dd>${ad.cta}</dd></div>
          </dl>
          <div class="tag-cloud">${ad.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </div>
      </section>

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
              <article class="${state.approvals.has(item.id) ? "approved" : ""}">
                <div class="creative-score">${item.score}</div>
                <div class="creative-body">
                  <div class="creative-title">
                    <strong>${item.product}</strong>
                    <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
                  </div>
                  <p>${item.hook}</p>
                  <small>${item.format} · ${item.asset} · ${item.channel}</small>
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
        </div>

        <div class="panel">
          <div class="panel-head compact">
            <h2>Reconstruction Pipeline</h2>
          </div>
          <div class="timeline">
            ${[
              ["Step 1", "Scan viral ad", "Identify hook, structure, emotion, and CTA pattern"],
              ["Step 2", "Deconstruct", "Extract reusable components and winning formulas"],
              ["Step 3", "Match product", "Pair structure with best-fit IAGT product"],
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
                  ${icon("video")} Send to HeyGen
                </button>
                <button class="render-btn runway" id="send-runway" ${state.assemblyComponents.length === 0 ? "disabled" : ""}>
                  ${icon("video")} Send to Runway
                </button>
                <button class="render-btn kling" id="send-kling" ${state.assemblyComponents.length === 0 ? "disabled" : ""}>
                  ${icon("video")} Send to Kling
                </button>
              </div>
            </div>

          </div><!-- /assembly-builder-row -->

          <!-- Rendering Status -->
          ${state.renderStatus ? `
          <div class="render-status-panel">
            <div class="render-status-head">
              <h3>Rendering Status</h3>
              <span class="render-badge render-badge-${state.renderStatus.toLowerCase().replace(/\s/g, "-")}">${state.renderStatus}</span>
            </div>
            ${state.renderStatus === "Rendering" ? `
              <div class="render-progress-bar"><div class="render-progress-fill" style="width:${state.renderProgress}%"></div></div>
              <small>${state.renderProgress}% complete</small>
            ` : ""}
            ${state.renderUrl ? `
              <div class="render-result">
                <a href="${state.renderUrl}" target="_blank" class="render-url-link">${icon("video")} View Rendered Video</a>
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
              <h3>Rendering Status</h3>
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

      <!-- ── PRODUCT MATCHING ── -->
      <section class="workspace-grid secondary">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Product Matching</h2>
              <p>Pairs viral structures with IAGT products and positioning angles.</p>
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
              <article class="${state.approvals.has(item.id) ? "approved" : ""}">
                <div class="creative-score">${item.score}</div>
                <div class="creative-body">
                  <div class="creative-title">
                    <strong>${item.product}</strong>
                    <span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>
                  </div>
                  <p>${item.hook}</p>
                  <small>${item.format} · ${item.asset} · ${item.channel}</small>
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
        </div>

        <div class="panel">
          <div class="panel-head compact">
            <h2>Reconstruction Pipeline</h2>
          </div>
          <div class="timeline">
            ${[
              ["Step 1", "Scan viral ad", "Identify hook, structure, emotion, and CTA pattern"],
              ["Step 2", "Deconstruct", "Extract reusable components and winning formulas"],
              ["Step 3", "Match product", "Pair structure with best-fit IAGT product"],
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
              <button class="render-btn heygen" data-auto-send="heygen">${icon("video")} Send to HeyGen</button>
              <button class="render-btn runway" data-auto-send="runway">${icon("video")} Send to Runway</button>
              <button class="render-btn kling" data-auto-send="kling">${icon("video")} Send to Kling</button>
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
  const isProcessing = state.renderStatus === "processing";
  const canGenerate = hasInput && !isProcessing;
  const canExport = Boolean(state.renderUrl) && state.renderStatus === "complete";

  return `
    <div class="section-content video-pipeline-content">
      <div class="section-intro">
        <h2>Video Generation Pipeline</h2>
        <p>A single linear workflow: submit a real script, generate one video render, preview the completed video, then export the same output.</p>
      </div>

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
                ${["5s","10s","15s","30s"].map((v) => `<option ${state.videoDuration === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Style
              <select data-state-key="videoStyle" ${isProcessing ? "disabled" : ""}>
                ${["UGC","Commercial","Luxury","Educational"].map((v) => `<option ${state.videoStyle === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Voice
              <select data-state-key="videoVoice" ${isProcessing ? "disabled" : ""}>
                ${["Male","Female","Narrator"].map((v) => `<option ${state.videoVoice === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Background
              <select data-state-key="videoBackground" ${isProcessing ? "disabled" : ""}>
                ${["None","Music","Ambient"].map((v) => `<option ${state.videoBackground === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label class="param-label">Aspect Ratio
              <select data-state-key="videoAspect" ${isProcessing ? "disabled" : ""}>
                ${["9:16","16:9","1:1"].map((v) => `<option ${state.videoAspect === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
          </div>
          <button class="primary pipeline-action generate-video-action" id="generate-video-btn" ${canGenerate ? "" : "disabled"}>
            ${isProcessing ? `${icon("radar")} Generating Video…` : `${icon("video")} Generate Video`}
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
        </article>

        <article class="pipeline-card output-layer">
          <div class="pipeline-step-label">3 · OUTPUT / PREVIEW LAYER</div>
          <h3>Preview Completed Video</h3>
          ${state.renderUrl ? `
            <video class="pipeline-video-player" src="${escapeHtml(state.renderUrl)}" controls preload="metadata"></video>
            <a class="render-url-link" href="${escapeHtml(state.renderUrl)}" target="_blank" rel="noopener">Open direct video URL</a>
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
            <a class="primary pipeline-action export-download" href="${escapeHtml(state.renderUrl)}" download="iagt-generated-video.mp4">Download Video</a>
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
  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Distribution</h2>
        <p>Publishing queue, channel management, and scheduled content delivery across all platforms.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Queued today", channels.filter((c) => c[3] === "Ready" || c[3] === "Queued").length.toString(), "ready to publish")}
        ${metric("Channels active", channels.length.toString(), "TikTok, IG, YT, Pinterest")}
        ${metric("Published this week", "14", "across all channels")}
        ${metric("Avg publish time", "2.3h", "from approval to live")}
      </section>

      <section class="queue-section">
        <div class="panel publish-panel">
          <div class="panel-head compact">
            <h2>Publishing Queue</h2>
            <span>Today</span>
          </div>
          <div class="channel-list">
            ${channels.map(([name, time, content, status]) => `
              <div>
                <b>${name}</b>
                <span>${time}</span>
                <p>${content}</p>
                <small class="${status.toLowerCase()}">${status}</small>
              </div>
            `).join("")}
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
    </div>
  `;
}

function renderAgentOrchestration() {
  const agents = state.agentStatuses.length ? state.agentStatuses : DEMO_AGENT_STATUSES;
  const health = state.agentPipelineHealth;

  return `
    <div class="agent-orch-section panel">
      <div class="agent-orch-header">
        <div class="agent-orch-title-row">
          <div>
            <h2>${icon("gear")} Agent Orchestration Dashboard</h2>
            <p>Real-time Twin Agents + Office Agent workings — live pipeline status and task visibility.</p>
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
            <strong>${(data.revenueAttributed || 12840).toLocaleString()}</strong>
            <small>this month (Shopify)</small>
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

  const metricLabels = {
    hookStrength: "Hook Strength",
    pacingScore: "Pacing Score",
    ctaClarity: "CTA Clarity",
    visualStyle: "Visual Style",
    overallQuality: "Overall Quality"
  };

  return `
    <div class="quality-validator-section panel">
      <div class="quality-validator-header">
        <div>
          <h2>${icon("check")} Elite Quality Rendering Standards</h2>
          <p>Enforce minimum quality thresholds before publishing. Auto-reject below threshold, auto-requeue for improvement.</p>
        </div>
      </div>

      <div class="quality-validator-body">
        <!-- Thresholds Reference -->
        <div class="quality-thresholds-panel">
          <h3>Elite Quality Thresholds</h3>
          <div class="quality-thresholds-grid">
            ${Object.entries(thresholds).map(([key, min]) => `
              <div class="quality-threshold-card">
                <span class="quality-threshold-label">${metricLabels[key] || key}</span>
                <strong class="quality-threshold-min">${min}+</strong>
                <span class="quality-threshold-desc">minimum required</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Score Input Panel -->
        <div class="quality-input-panel">
          <h3>Validate Video Quality</h3>
          <p class="quality-input-desc">Enter scores for each dimension to validate against elite standards.</p>
          <div class="quality-inputs-grid">
            ${Object.entries(scores).map(([key, val]) => `
              <div class="quality-input-row">
                <label class="quality-input-label">
                  ${metricLabels[key] || key}
                  <span class="quality-input-min">min ${thresholds[key]}</span>
                </label>
                <div class="quality-input-controls">
                  <input type="range" class="quality-range" data-quality-key="${key}"
                    min="0" max="100" value="${val}" />
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

function renderTwinAutomation() {
  return `
    <div class="section-content">
      <div class="section-intro">
        <h2>Twin Automation</h2>
        <p>Agent orchestration, auto-generate pipeline, and 24/7 marketing system management.</p>
      </div>

      <section class="metrics-grid">
        ${metric("Agent runs today", "6", "automated pipeline cycles")}
        ${metric("Ads auto-generated", creatives.length.toString(), "this cycle")}
        ${metric("Automation health", "98%", "daily loop active")}
        ${metric("Next scan", "6:00 AM", "viral intelligence")}
      </section>

      <section class="workspace-grid secondary">
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

        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Agent Controls</h2>
              <p>Manually trigger pipeline stages or override automation.</p>
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

      ${renderMediaArea("twin-automation")}
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

          ${state.alerts.length === 0 ? `
          <div class="api-alerts-empty">
            ${icon("check")}
            <p>No alerts. All services are operating normally.</p>
          </div>
          ` : `
          <div class="api-alerts-list">
            ${state.alerts.slice().reverse().map((alert) => `
              <div class="api-alert-item api-alert-${alert.level} ${alert.acknowledged ? "api-alert-read" : ""}">
                <div class="api-alert-icon">
                  ${alert.level === "critical" ? "🔴" : alert.level === "warning" ? "🟡" : "🔵"}
                </div>
                <div class="api-alert-body">
                  <div class="api-alert-head">
                    <strong>${alert.serviceName}</strong>
                    <span class="api-alert-level api-alert-level-${alert.level}">${alert.level.toUpperCase()}</span>
                    <span class="api-alert-time">${new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                  <p>${alert.message}</p>
                  <div class="api-alert-actions">
                    ${!alert.acknowledged ? `
                      <button class="api-card-btn" data-ack-alert="${alert.id}">Mark Read</button>
                    ` : `<span class="api-alert-acked">✓ Acknowledged</span>`}
                    <button class="api-card-btn" data-select-service="${alert.serviceId}" data-open-config="true" data-switch-tab="config">
                      Configure Service
                    </button>
                    ${alert.level === "critical" || alert.level === "warning" ? `
                      <button class="api-card-btn api-card-btn-credits" data-add-credits="${alert.serviceId}">
                        + Add Credits
                      </button>
                    ` : ""}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
          `}
        </div>

        <!-- Usage summary for all services -->
        <div class="panel">
          <div class="panel-head compact">
            <h2>Monthly Usage Summary</h2>
          </div>
          <div class="api-usage-summary">
            ${services.filter((s) => s.limit !== null).map((svc) => `
              <div class="api-usage-row">
                <span class="api-usage-name">${svc.name}</span>
                <div class="api-usage-bar-wrap">
                  ${tokenBar(svc.pct, svc.status)}
                </div>
                <span class="api-usage-pct ${svc.status === "critical" ? "text-critical" : svc.status === "warning" ? "text-warning" : ""}">${svc.pct}%</span>
                <span class="api-usage-detail">${svc.used.toLocaleString()} / ${svc.limit.toLocaleString()} ${svc.unit}</span>
                <span class="api-usage-cost">${svc.estimatedCost}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
      ` : ""}

      ${state.serviceActionStatus && state.apiMgmtTab !== "config" ? `
      <div class="api-global-feedback api-action-feedback ${state.serviceActionStatus.type}">
        ${state.serviceActionStatus.message}
        <button class="api-feedback-close" id="dismiss-service-action">✕</button>
      </div>
      ` : ""}
    </div>
  `;
}

// ── Media Gallery helpers ──

function mediaApprovalLabel(status) {
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

function filteredMediaVideos() {
  if (state.mediaFilter === "all") return state.mediaVideos;
  return state.mediaVideos.filter((v) => (v.status || "pending") === state.mediaFilter);
}

function formatRelativeTime(isoString) {
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

function buildDemoMediaVideos() {
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

async function loadMediaGallery() {
  state.mediaLoading = true;
  render();
  try {
    const [galleryRes, statsRes] = await Promise.all([
      fetch(`/api/media/gallery?status=${state.mediaFilter}&limit=50`),
      fetch("/api/media/stats")
    ]);
    if (galleryRes.ok) {
      const galleryData = await galleryRes.json();
      if (galleryData.success && galleryData.videos && galleryData.videos.length > 0) {
        state.mediaVideos = galleryData.videos;
      } else {
        state.mediaVideos = buildDemoMediaVideos();
      }
    } else {
      state.mediaVideos = buildDemoMediaVideos();
    }
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      if (statsData.success) state.mediaStats = statsData.stats;
    }
  } catch {
    state.mediaVideos = buildDemoMediaVideos();
  }
  state.mediaLoading = false;
  render();
}

function renderMediaStatusDashboard() {
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

function renderMediaCard(video) {
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
      <span class="media-status-badge media-status-${statusCls}">${mediaApprovalLabel(video.status)}</span>
      <input type="checkbox" class="media-card-checkbox" data-media-checkbox="${video.id}" ${isSelected ? "checked" : ""} />
    </div>
    <div class="media-card-body">
      <div class="media-card-meta">
        <span class="media-platform-tag">${video.platform || "Unknown"}</span>
        <span class="media-time">${formatRelativeTime(video.created_at)}</span>
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

function renderReviewPanel() {
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
          <span class="media-status-badge media-status-${statusCls}">${mediaApprovalLabel(v.status)}</span>
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
            <div><dt>Created</dt><dd>${formatRelativeTime(v.created_at)}</dd></div>
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

function renderMediaGallery() {
  const filtered = filteredMediaVideos();
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
      ${renderMediaStatusDashboard()}

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
          ${filtered.map(renderMediaCard).join("")}
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

  ${state.mediaReviewOpen ? renderReviewPanel() : ""}`;
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

function render() {
  const app = document.getElementById("app");

  // Determine which section content to render
  const sectionRenderers = {
    "viral-intelligence": renderViralIntelligence,
    "ai-reconstruction":  renderAiReconstruction,
    "video-generation":   renderVideoGeneration,
    "distribution":       renderDistribution,
    "analytics":          renderAnalytics,
    "twin-automation":    renderTwinAutomation,
    "api-management":     renderApiManagement
  };
  const sectionContent = (sectionRenderers[state.currentSection] || renderViralIntelligence)();

  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">IG</div>
        <div>
          <strong>I AM GENESIS TECH</strong>
          <span>AI Viral Engine</span>
        </div>
      </div>
      <nav>
        ${SECTIONS.map((s) => `
          <button class="nav-btn ${state.currentSection === s.id ? "active" : ""}" data-section="${s.id}">
            ${icon(s.icon)}<span>${s.label}</span>
          </button>
        `).join("")}
      </nav>
      <div class="automation-card">
        <span>Automation Health</span>
        <strong>Daily loop active</strong>
        <div class="pulse-row"><i></i> Next scan at 6:00 AM</div>
      </div>
    </aside>

    <main>
      <header class="topbar">
        <div>
          <h1>Elite AI E-Commerce Workspace</h1>
          <p>Viral ad intelligence, AI creative reconstruction, distribution, and learning loop for supplement growth.</p>
        </div>
        <div class="top-actions">
          <div class="sync-status ${state.syncLevel}">
            <b>${state.dataSource}</b>
            <span>${state.syncMessage}</span>
          </div>
          <button class="ghost copilot-toggle-btn" id="copilot-toggle-btn">${icon("spark")} Copilot</button>
        </div>
      </header>

      <!-- ── Section nav breadcrumb ── -->
      <div class="section-nav-tabs">
        ${SECTIONS.map((s) => `
          <button class="section-tab ${state.currentSection === s.id ? "section-tab-active" : ""}" data-section="${s.id}">
            ${icon(s.icon)} ${s.label}
          </button>
        `).join("")}
      </div>

      ${state.copilotOpen ? `
      <section class="copilot-panel panel">
        <div class="panel-head compact">
          <h2>${icon("spark")} AI Copilot</h2>
          <button class="toggle-link" id="close-copilot">✕ Close</button>
        </div>
        <p class="copilot-desc">Ask the AI anything about your workspace — trends, creatives, products, or next steps.</p>
        <div class="copilot-input-row">
          <input type="text" id="copilot-input" class="copilot-input" placeholder="e.g. What should I focus on today?" value="${state.copilotQuestion.replace(/"/g, "&quot;")}" />
          <button class="primary" id="copilot-ask-btn" ${state.copilotLoading ? "disabled" : ""}>
            ${state.copilotLoading ? "Thinking…" : "Ask"}
          </button>
        </div>
        ${state.copilotAnswer ? `
        <div class="copilot-answer">
          <div class="copilot-answer-text">${state.copilotAnswer}</div>
          ${state.copilotNextActions.length > 0 ? `
          <div class="copilot-next-actions">
            <strong>Suggested next actions:</strong>
            <ul>${state.copilotNextActions.map((a) => `<li>${a}</li>`).join("")}</ul>
          </div>
          ` : ""}
        </div>
        ` : ""}
      </section>
      ` : ""}

      ${sectionContent}

      ${renderMediaGallery()}
    </main>
  `;

  bindEvents();
  if (state.currentSection === "media-output" && window.bindMediaOutputCenter) {
    window.bindMediaOutputCenter();
  }
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
    const response = await fetch("/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: state.submittedScript,
        duration: state.videoDuration,
        style: state.videoStyle,
        background: state.videoBackground,
        aspect: state.videoAspect,
        config: { display_voice: state.videoVoice }
      })
    });
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Video generation request failed.");
    }

    state.renderVideoId = data.video_id || null;
    state.renderStatusUrl = data.status_url || null;
    state.renderUrl = data.video_url || data.videoUrl || null;
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

function bindEvents() {
  // ── Navigation: sidebar nav buttons ──
  document.querySelectorAll("[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentSection = btn.dataset.section;
      // Reset media selection when switching sections
      state.selectedMediaId = null;
      state.mediaActionStatus = null;
      render();
    });
  });

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
      // Try to fetch from backend; fall back to demo data
      try {
        let url = "/api/renders";
        if (state.selectedMediaType !== "All" && state.selectedRenderApp !== "All") {
          url = `/api/media/by-type/${state.selectedMediaType}/by-app/${state.selectedRenderApp}`;
        } else if (state.selectedMediaType !== "All") {
          url = `/api/media/by-type/${state.selectedMediaType}`;
        } else if (state.selectedRenderApp !== "All") {
          url = `/api/media/by-app/${state.selectedRenderApp}`;
        }
        await fetch(url);
      } catch { /* demo mode */ }
      await new Promise((r) => setTimeout(r, 600));
      render();
    });
  }

  // ── Media card selection ──
  document.querySelectorAll("[data-media-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.mediaId;
      state.selectedMediaId = state.selectedMediaId === id ? null : id;
      state.mediaActionStatus = null;
      render();
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
      const item   = DEMO_MEDIA.find((m) => m.id === id);
      if (!item) return;

      if (action === "approve") {
        item.status = "approved";
        state.mediaActionStatus = { id, type: "success", message: "✓ Approved" };
        // Persist to backend
        try {
          await fetch("/api/agent/approve-creative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, approved: true })
          });
        } catch { /* demo ok */ }
      } else if (action === "reject") {
        item.status = "draft";
        state.mediaActionStatus = { id, type: "warning", message: "✕ Rejected — returned to draft" };
        try {
          await fetch("/api/agent/approve-creative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, approved: false, rejectionReason: "Rejected via media manager" })
          });
        } catch { /* demo ok */ }
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
          }
        } catch {
          state.mediaActionStatus = { id, type: "warning", message: "Download unavailable in demo mode" };
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
        const memories = state.productViralMemories.length > 0
          ? state.productViralMemories
          : demoProductViralMemories;
        const mem = memories.find((m) => m.product_id === productId);
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
      render();
      try {
        const res = await fetch("/api/viral/scan-by-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
          const data = await res.json();
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
          }
        } else {
          // Demo fallback: simulate scan
          await new Promise((r) => setTimeout(r, 2000));
          state.lastScanDate = new Date().toISOString();
          state.nextScanScheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
        state.lastScanDate = new Date().toISOString();
        state.nextScanScheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
      state.viralScanInProgress = false;
      render();
    });
  }

  // ── Schedule button ──
  const pviScheduleBtn = document.getElementById("pvi-schedule-btn");
  if (pviScheduleBtn) {
    pviScheduleBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/viral/schedule-daily-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hour: 6, minute: 0 })
        });
        if (res.ok) {
          const data = await res.json();
          state.nextScanScheduled = data.nextRun;
          state.viralScheduleResult = `✓ ${data.message}`;
        } else {
          state.viralScheduleResult = "✓ Daily scan scheduled for 6:00 AM (demo mode).";
          state.nextScanScheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
      } catch {
        state.viralScheduleResult = "✓ Daily scan scheduled for 6:00 AM (demo mode).";
        state.nextScanScheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
      const memories = state.productViralMemories.length > 0
        ? state.productViralMemories
        : demoProductViralMemories;
      const mem = memories.find((m) => m.product_id === productId);
      if (!mem) return;

      state.viralFindInProgress = true;
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
        if (res.ok) {
          const data = await res.json();
          state.reproductionResult = `✓ Found ${data.alternativesFound} viral ad templates across ${(data.platformsSearched || []).length} platforms.`;
        } else {
          await new Promise((r) => setTimeout(r, 1500));
          state.reproductionResult = `✓ Found 5 viral ad templates across TikTok, Instagram, YouTube, Facebook, Pinterest (demo mode).`;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
        state.reproductionResult = `✓ Found 5 viral ad templates across TikTok, Instagram, YouTube, Facebook, Pinterest (demo mode).`;
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
      const memories = state.productViralMemories.length > 0
        ? state.productViralMemories
        : demoProductViralMemories;
      const mem = memories.find((m) => m.product_id === productId);
      if (!mem) return;

      state.reproductionInProgress = true;
      state.reproductionResult = null;
      render();
      try {
        const res = await fetch(`/api/viral/product/${encodeURIComponent(productId)}/reproduce`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "TikTok" })
        });
        if (res.ok) {
          const data = await res.json();
          state.reproductionResult = `✓ ${data.message}`;
          // Increment local reproduction count
          mem.reproduction_count = (mem.reproduction_count || 0) + 1;
        } else {
          await new Promise((r) => setTimeout(r, 1200));
          state.reproductionResult = `✓ Viral template reproduced for ${mem.product_name}. Creative added to AI Content Queue (demo mode).`;
          mem.reproduction_count = (mem.reproduction_count || 0) + 1;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1200));
        state.reproductionResult = `✓ Viral template reproduced for ${mem.product_name}. Creative added to AI Content Queue (demo mode).`;
        mem.reproduction_count = (mem.reproduction_count || 0) + 1;
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
  if (state.currentSection === "product-viral-intel" && !state.viralMemoriesLoading && state.productViralMemories.length === 0) {
    state.viralMemoriesLoading = true;
    fetch("/api/viral/products/all-memories")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.memories && data.memories.length > 0) {
          state.productViralMemories = data.memories;
          render();
        }
      })
      .catch(() => { /* demo mode */ })
      .finally(() => { state.viralMemoriesLoading = false; });
  }

  // ── Agent controls (Twin Automation section) ──
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
  if (scanInput) {
    scanInput.addEventListener("change", () => {
      state.scanAmount = Math.max(100, Math.min(10000, Number(scanInput.value) || 1284));
    });
  }
  if (rescanBtn) {
    rescanBtn.addEventListener("click", async () => {
      state.scanAmount = Number(document.getElementById("scan-amount-input")?.value || state.scanAmount);
      state.scanning = true;
      render();
      try {
        const data = await agentFetch("/api/agents/trend-scout/scan", { limit: state.scanAmount });
        state.scanCount = data.count || state.scanAmount;
        // Merge any returned trends into viralAds display
        if (data.trends && data.trends.length) {
          const newAds = data.trends
            .filter((t) => t.hook)
            .map((t, i) => ({
              id: `scan-${Date.now()}-${i}`,
              platform: t.platform || "TikTok",
              category: t.category || "Wellness",
              title: t.hook.slice(0, 50),
              hook: t.hook,
              views: t.views || 0,
              engagement: t.engagement || 0,
              velocity: t.velocity || 0,
              conversion: 0,
              cta: "",
              tags: [],
              productMatch: "",
              emotion: "",
              structure: []
            }));
          if (newAds.length) {
            viralAds = [...newAds, ...viralAds].slice(0, 50);
            state.selectedAdId = viralAds[0].id;
          }
        }
        state.syncLevel = "connected";
        state.syncMessage = `Trend Scout scanned ${state.scanCount.toLocaleString()} ads.`;
      } catch (err) {
        // Fallback: try legacy endpoint
        try {
          const res = await fetch(`${API_BASE}/api/viral/rescan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: state.scanAmount })
          });
          if (res.ok) {
            const data = await res.json();
            state.scanCount = data.count || state.scanAmount;
          } else {
            await new Promise((r) => setTimeout(r, 1800));
            state.scanCount = state.scanAmount;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 1800));
          state.scanCount = state.scanAmount;
        }
      }
      state.scanning = false;
      render();
    });
  }

  // ── Hook search button → POST /api/agents/trend-scout/scan (hooks mode) ──
  const hookSearchBtn = document.getElementById("hook-search-btn");
  const hookTargetInput = document.getElementById("hook-target-input");
  if (hookTargetInput) {
    hookTargetInput.addEventListener("change", () => {
      state.hookTarget = Math.max(10, Math.min(500, Number(hookTargetInput.value) || 100));
    });
  }
  if (hookSearchBtn) {
    hookSearchBtn.addEventListener("click", async () => {
      state.hookTarget = Number(document.getElementById("hook-target-input")?.value || state.hookTarget);
      state.hookSearching = true;
      render();
      try {
        // Primary: Trend Scout agent
        const data = await agentFetch("/api/agents/trend-scout/scan", {
          limit: state.hookTarget,
          keyword: state.hookSearchKeyword || undefined
        });
        state.hooksFound = data.count || state.hookTarget;
        if (data.trends && data.trends.length) {
          const newHooks = data.trends
            .filter((t) => t.hook)
            .map((t, i) => ({
              id: `h-agent-${Date.now()}-${i}`,
              text: t.hook,
              category: t.category || "Discovered",
              platform: t.platform || "Multi",
              confidence: t.confidence || "Medium"
            }));
          // Deduplicate by text
          const existingTexts = new Set(winningHooks.map((h) => h.text));
          const unique = newHooks.filter((h) => !existingTexts.has(h.text));
          if (unique.length) winningHooks.push(...unique);
        }
        state.syncLevel = "connected";
        state.syncMessage = `Found ${state.hooksFound} hooks via Trend Scout.`;
        state.showHooksList = true;
      } catch {
        // Fallback: legacy hooks/search endpoint
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
              winningHooks.push(...data.hooks.map((h, i) => ({
                id: `h-api-${Date.now()}-${i}`,
                text: h.text || h,
                category: h.category || "Discovered",
                platform: h.platform || "Multi",
                confidence: h.confidence || "Medium"
              })));
            }
          } else {
            await new Promise((r) => setTimeout(r, 2200));
            state.hooksFound = state.hookTarget;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 2200));
          state.hooksFound = state.hookTarget;
        }
      }
      state.hookSearching = false;
      render();
    });
  }

  // ── Toggle hooks list ──
  const toggleHooksList = document.getElementById("toggle-hooks-list");
  if (toggleHooksList) {
    toggleHooksList.addEventListener("click", () => {
      state.showHooksList = !state.showHooksList;
      render();
    });
  }

  // ── Hook auto-select ──
  const hookAutoSelectBtn = document.getElementById("hook-auto-select");
  if (hookAutoSelectBtn) {
    hookAutoSelectBtn.addEventListener("click", () => {
      state.hookAutoSelect = !state.hookAutoSelect;
      if (state.hookAutoSelect) {
        // AI picks high-confidence hooks automatically
        state.selectedHooks = new Set(winningHooks.filter((h) => h.confidence === "High").map((h) => h.id));
      } else {
        state.selectedHooks = new Set();
      }
      render();
    });
  }

  // ── Hook checkboxes ──
  document.querySelectorAll(".hook-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.hookId;
      if (cb.checked) state.selectedHooks.add(id);
      else state.selectedHooks.delete(id);
      render();
    });
  });

  // ── Select all / clear hooks ──
  const selectAllHooks = document.getElementById("select-all-hooks");
  if (selectAllHooks) {
    selectAllHooks.addEventListener("click", () => {
      filteredHooks().forEach((h) => state.selectedHooks.add(h.id));
      render();
    });
  }
  const clearHooksSelection = document.getElementById("clear-hooks-selection");
  if (clearHooksSelection) {
    clearHooksSelection.addEventListener("click", () => {
      state.selectedHooks = new Set();
      render();
    });
  }

  // ── Copy buttons ──
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.copy;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = orig; }, 1400);
      }).catch(() => {
        // Fallback for non-HTTPS
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = orig; }, 1400);
      });
    });
  });

  // ── Product toggle ──
  const toggleProducts = document.getElementById("toggle-products");
  if (toggleProducts) {
    toggleProducts.addEventListener("click", () => {
      state.productsExpanded = !state.productsExpanded;
      render();
    });
  }

  // ── Product checkboxes ──
  document.querySelectorAll(".product-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      const name = cb.dataset.productName;
      if (cb.checked) state.selectedProducts.add(name);
      else state.selectedProducts.delete(name);
      render();
    });
  });

  // ── Filter creatives by selected products ──
  const filterBySelectedProducts = document.getElementById("filter-by-selected-products");
  if (filterBySelectedProducts) {
    filterBySelectedProducts.addEventListener("click", () => {
      // Set creative filter to first selected product (or All if multiple)
      const selected = [...state.selectedProducts];
      state.creativeProductFilter = selected.length === 1 ? selected[0] : "All";
      render();
    });
  }

  // ── Clear product selection ──
  const clearProductSelection = document.getElementById("clear-product-selection");
  if (clearProductSelection) {
    clearProductSelection.addEventListener("click", () => {
      state.selectedProducts = new Set();
      state.creativeProductFilter = "All";
      render();
    });
  }

  // ── Assembly workspace toggle ──
  const toggleAssembly = document.getElementById("toggle-assembly");
  if (toggleAssembly) {
    toggleAssembly.addEventListener("click", () => {
      state.showAssemblyWorkspace = !state.showAssemblyWorkspace;
      render();
    });
  }

  // ── Add component to builder ──
  document.querySelectorAll(".add-to-builder-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.assemblyComponents.push({
        type: btn.dataset.componentType,
        id: btn.dataset.componentId,
        text: btn.dataset.componentText
      });
      render();
    });
  });

  // ── Remove component from builder ──
  document.querySelectorAll("[data-remove-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeIdx);
      state.assemblyComponents.splice(idx, 1);
      render();
    });
  });

  // ── AI Suggestions → POST /api/agents/copilot/suggest ──
  const aiSuggestionsBtn = document.getElementById("ai-suggestions-btn");
  if (aiSuggestionsBtn) {
    aiSuggestionsBtn.addEventListener("click", async () => {
      state.copilotLoading = true;
      state.showCopilotPanel = true;
      state.copilotSuggestions = null;
      render();
      try {
        const data = await agentFetch("/api/agents/copilot/suggest", {
          components: state.assemblyComponents,
          style: state.videoStyle,
          duration: state.videoDuration,
          aspect: state.videoAspect,
          platform: state.assemblyComponents.length > 0 ? "TikTok" : undefined
        });
        state.copilotSuggestions = data.suggestions || [];
        state.syncLevel = "connected";
        state.syncMessage = `Copilot generated ${state.copilotSuggestions.length} suggestions.`;
      } catch {
        // Fallback: try legacy assembly/suggestions for component auto-fill
        try {
          const res = await fetch(`${API_BASE}/api/assembly/suggestions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ style: state.videoStyle, duration: state.videoDuration, aspect: state.videoAspect })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.components && data.components.length) {
              state.assemblyComponents = data.components;
            }
          }
        } catch { /* ignore */ }
        // Demo suggestions
        state.copilotSuggestions = [
          { type: "structure", title: "Start with a pattern interrupt", body: "Open with a bold statement or unexpected visual in the first 2 seconds to stop the scroll.", confidence: "High" },
          { type: "hook", title: "Use curiosity-gap hooks", body: "Hooks that withhold information outperform direct claims by 2.3x on TikTok.", confidence: "High" },
          { type: "cta", title: "Soft CTA performs better for supplements", body: "Use 'Link in bio' or 'Try it free' instead of 'Buy now' — reduces friction.", confidence: "Medium" }
        ];
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ── Refine Hook → POST /api/agents/copilot/refine ──
  const refineHookBtn = document.getElementById("refine-hook-btn");
  if (refineHookBtn) {
    refineHookBtn.addEventListener("click", async () => {
      const hookComp = state.assemblyComponents.find((c) => c.type === "hook");
      const hookText = hookComp ? hookComp.text : (winningHooks.find((h) => state.selectedHooks.has(h.id)) || winningHooks[0])?.text;
      if (!hookText) {
        state.copilotSuggestions = [{ type: "error", title: "No hook selected", body: "Add a hook component to the builder or select a hook from the library first.", confidence: "N/A" }];
        state.showCopilotPanel = true;
        render();
        return;
      }
      state.copilotLoading = true;
      state.showCopilotPanel = true;
      state.copilotRefinements = null;
      render();
      try {
        const data = await agentFetch("/api/agents/copilot/refine", {
          hook: hookText,
          style: state.videoStyle,
          platform: "TikTok"
        });
        state.copilotRefinements = data.refinements || [];
        state.syncLevel = "connected";
        state.syncMessage = `Copilot refined hook into ${state.copilotRefinements.length} versions.`;
      } catch {
        state.copilotRefinements = [
          { version: "Curiosity gap", text: `Nobody tells you: ${hookText}`, rationale: "Curiosity-gap framing increases watch time.", score: 91 },
          { version: "Problem-first", text: `If you're struggling with your health, ${hookText}`, rationale: "Leading with the problem creates emotional resonance.", score: 87 }
        ];
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ── Explain Decision → POST /api/agents/copilot/explain ──
  const explainDecisionBtn = document.getElementById("explain-decision-btn");
  if (explainDecisionBtn) {
    explainDecisionBtn.addEventListener("click", async () => {
      state.copilotLoading = true;
      state.showCopilotPanel = true;
      state.copilotExplanations = null;
      render();
      try {
        const data = await agentFetch("/api/agents/copilot/explain", {
          components: state.assemblyComponents,
          style: state.videoStyle,
          duration: state.videoDuration,
          aspect: state.videoAspect
        });
        state.copilotExplanations = data.explanations || [];
        state.syncLevel = "connected";
        state.syncMessage = "Copilot explained all component decisions.";
      } catch {
        state.copilotExplanations = [
          { component: "Builder", reasoning: "Add components to the builder to get a full decision explanation.", impact: "N/A" }
        ];
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ── Close Copilot Panel ──
  const closeCopilotBtn = document.getElementById("close-copilot-btn");
  if (closeCopilotBtn) {
    closeCopilotBtn.addEventListener("click", () => {
      state.showCopilotPanel = false;
      state.copilotSuggestions = null;
      state.copilotRefinements = null;
      state.copilotExplanations = null;
      render();
    });
  }

  // ── Apply Refinement to Builder ──
  document.querySelectorAll("[data-apply-refinement]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.applyRefinement;
      const idx = state.assemblyComponents.findIndex((c) => c.type === "hook");
      if (idx >= 0) {
        state.assemblyComponents[idx] = { ...state.assemblyComponents[idx], text };
      } else {
        state.assemblyComponents.unshift({ type: "hook", id: `refined-${Date.now()}`, text });
      }
      state.showCopilotPanel = false;
      state.copilotRefinements = null;
      render();
    });
  });

  // ── Save Draft ──
  const saveDraftBtn = document.getElementById("save-draft-btn");
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", async () => {
      if (state.assemblyComponents.length === 0) return;
      const draft = {
        components: [...state.assemblyComponents],
        duration: state.videoDuration,
        style: state.videoStyle,
        voice: state.videoVoice,
        background: state.videoBackground,
        aspect: state.videoAspect,
        savedAt: new Date().toISOString()
      };
      state.videoDrafts.push(draft);
      // Persist to Supabase if available
      if (window.iagtSupabase && window.iagtSupabase.enabled) {
        try {
          await window.iagtSupabase.saveVideoDraft(draft);
        } catch (e) { console.warn("Draft save to Supabase failed:", e); }
      }
      // Also try backend
      try {
        await fetch(`${API_BASE}/api/assembly/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft)
        });
      } catch { /* offline ok */ }
      render();
    });
  }

  // ── Load Draft ──
  document.querySelectorAll("[data-load-draft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.loadDraft);
      const draft = state.videoDrafts[idx];
      if (!draft) return;
      state.assemblyComponents = [...draft.components];
      state.videoDuration = draft.duration;
      state.videoStyle = draft.style;
      state.videoVoice = draft.voice;
      state.videoBackground = draft.background;
      state.videoAspect = draft.aspect;
      render();
    });
  });

  // ── Delete Draft ──
  document.querySelectorAll("[data-delete-draft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.deleteDraft);
      state.videoDrafts.splice(idx, 1);
      if (state.selectedDraftA === idx) state.selectedDraftA = null;
      if (state.selectedDraftB === idx) state.selectedDraftB = null;
      render();
    });
  });

  // ── Compare drafts ──
  const toggleCompare = document.getElementById("toggle-compare");
  if (toggleCompare) {
    toggleCompare.addEventListener("click", () => {
      state.compareDrafts = !state.compareDrafts;
      if (!state.compareDrafts) { state.selectedDraftA = null; state.selectedDraftB = null; }
      render();
    });
  }
  document.querySelectorAll("[data-compare-a]").forEach((btn) => {
    btn.addEventListener("click", () => { state.selectedDraftA = Number(btn.dataset.compareA); render(); });
  });
  document.querySelectorAll("[data-compare-b]").forEach((btn) => {
    btn.addEventListener("click", () => { state.selectedDraftB = Number(btn.dataset.compareB); render(); });
  });

  // ── Send to renderer (HeyGen / Runway / Kling) ──
  async function sendToRenderer(platform) {
    if (state.assemblyComponents.length === 0) return;
    state.renderStatus = "Rendering";
    state.renderProgress = 0;
    state.renderUrl = null;
    render();

    // Animate progress
    const progressInterval = setInterval(() => {
      if (state.renderProgress < 90) {
        state.renderProgress += Math.floor(Math.random() * 12) + 3;
        if (state.renderProgress > 90) state.renderProgress = 90;
        const fill = document.querySelector(".render-progress-fill");
        const label = document.querySelector(".render-status-panel small");
        if (fill) fill.style.width = state.renderProgress + "%";
        if (label) label.textContent = state.renderProgress + "% complete";
      }
    }, 600);

    try {
      const res = await fetch(`${API_BASE}/api/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          components: state.assemblyComponents,
          duration: state.videoDuration,
          style: state.videoStyle,
          voice: state.videoVoice,
          background: state.videoBackground,
          aspect: state.videoAspect
        })
      });
      clearInterval(progressInterval);
      if (res.ok) {
        const data = await res.json();
        state.renderProgress = 100;
        state.renderStatus = data.status === "complete" ? "Complete" : "Pending";
        state.renderUrl = data.url || data.videoUrl || null;
        state.renderJobId = data.jobId || null;
        state.renderRenderId = data.renderId || null;
        if (state.renderStatus === "Pending" && !state.renderPollingActive) {
          startRenderPolling();
        }
        state.syncLevel = "connected";
        state.syncMessage = data.message || `${platform} job submitted.`;
      } else {
        state.renderStatus = "Failed";
        state.renderProgress = 0;
      }
    } catch {
      clearInterval(progressInterval);
      // Demo mode: simulate completion
      await new Promise((r) => setTimeout(r, 800));
      state.renderProgress = 100;
      state.renderStatus = "Complete (Demo)";
      state.renderUrl = null;
    }
    render();
  }

  const sendHeyGen = document.getElementById("send-heygen");
  if (sendHeyGen) sendHeyGen.addEventListener("click", () => sendToRenderer("heygen"));

  const sendRunway = document.getElementById("send-runway");
  if (sendRunway) sendRunway.addEventListener("click", () => sendToRenderer("runway"));


  bindEvents();
}

  // ── Generate Today's Ads ──
  const generateTodayBtn = document.getElementById("generate-today-btn");
  if (generateTodayBtn) {
    generateTodayBtn.addEventListener("click", async () => {
      state.autoGenerating = true;
      state.autoGenerateResult = null;
      render();
      try {
        const res = await fetch("/api/agent/generate-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: products.slice(0, 5),
            hooks: winningHooks.filter((h) => h.confidence === "High").slice(0, 5)
          })
        });
        if (res.ok) {
          const data = await res.json();
          state.autoGenerateResult = data.message || `${data.generated || 0} ads queued for generation.`;
        } else {
          // Demo fallback
          await new Promise((r) => setTimeout(r, 1500));
          state.autoGenerateResult = `${products.length} ads queued for generation (demo mode).`;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
        state.autoGenerateResult = `${products.length} ads queued for generation (demo mode).`;
      }
      state.autoGenerating = false;
      render();
    });
  }

  // ── Dismiss auto-generate banner ──
  const dismissAutoGenerate = document.getElementById("dismiss-auto-generate");
  if (dismissAutoGenerate) {
    dismissAutoGenerate.addEventListener("click", () => {
      state.autoGenerateResult = null;
      render();
    });
  }

  // ── Copilot toggle ──
  const copilotToggleBtn = document.getElementById("copilot-toggle-btn");
  if (copilotToggleBtn) {
    copilotToggleBtn.addEventListener("click", () => {
      state.copilotOpen = !state.copilotOpen;
      render();
    });
  }

  // ── Close copilot ──
  const closeCopilot = document.getElementById("close-copilot");
  if (closeCopilot) {
    closeCopilot.addEventListener("click", () => {
      state.copilotOpen = false;
      render();
    });
  }

  // ── Copilot ask ──
  const copilotAskBtn = document.getElementById("copilot-ask-btn");
  const copilotInput = document.getElementById("copilot-input");
  if (copilotInput) {
    copilotInput.addEventListener("input", () => {
      state.copilotQuestion = copilotInput.value;
    });
    copilotInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !state.copilotLoading) {
        copilotAskBtn && copilotAskBtn.click();
      }
    });
  }
  if (copilotAskBtn) {
    copilotAskBtn.addEventListener("click", async () => {
      const question = state.copilotQuestion.trim();
      if (!question) return;
      state.copilotLoading = true;
      state.copilotAnswer = null;
      state.copilotNextActions = [];
      render();
      try {
        const res = await fetch("/api/agent/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            context: {
              products: products.slice(0, 3).map((p) => p.name),
              topHooks: winningHooks.slice(0, 3).map((h) => h.text),
              creativeCount: creatives.length
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          state.copilotAnswer = data.answer || "No answer returned.";
          state.copilotNextActions = data.nextActions || [];
        } else {
          state.copilotAnswer = "Copilot is unavailable right now. Check your backend connection.";
        }
      } catch {
        // Demo fallback
        state.copilotAnswer = `Based on your workspace, focus on your top product with a curiosity-led hook. You have ${creatives.filter((c) => c.status === "Ready").length} creatives ready to publish.`;
        state.copilotNextActions = [
          "Run a viral rescan to refresh trend data",
          "Review pending creatives in the AI Content Queue",
          "Generate new ads using the top winning hooks",
          "Check the publishing queue for today"
        ];
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ═══════════════════════════════════════════════════════════
  // API MANAGEMENT EVENT BINDINGS
  // ═══════════════════════════════════════════════════════════

  // ── Tab navigation ──
  document.querySelectorAll("[data-api-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.apiMgmtTab = btn.dataset.apiTab;
      state.serviceActionStatus = null;
      render();
    });
  });

  // ── Load services button (empty state) ──
  const loadServicesBtn = document.getElementById("load-services-btn");
  if (loadServicesBtn) {
    loadServicesBtn.addEventListener("click", () => loadServicesConfig());
  }

  // ── Select service (overview cards + config sidebar) ──
  document.querySelectorAll("[data-select-service]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.selectService;
      state.selectedServiceId = id;
      state.serviceApiKeyInput = "";
      state.serviceApiKeyVisible = false;
      state.serviceActionStatus = null;
      if (el.dataset.openConfig === "true") {
        state.apiMgmtTab = "config";
      }
      if (el.dataset.switchTab) {
        state.apiMgmtTab = el.dataset.switchTab;
      }
      render();
    });
  });

  // ── Toggle API key visibility ──
  const toggleKeyVisibility = document.getElementById("toggle-key-visibility");
  if (toggleKeyVisibility) {
    toggleKeyVisibility.addEventListener("click", () => {
      state.serviceApiKeyVisible = !state.serviceApiKeyVisible;
      render();
    });
  }

  // ── API key input ──
  const svcApiKeyInput = document.getElementById("svc-api-key-input");
  if (svcApiKeyInput) {
    svcApiKeyInput.addEventListener("input", () => {
      state.serviceApiKeyInput = svcApiKeyInput.value;
    });
  }

  // ── Credits amount input ──
  const creditsAmountInput = document.getElementById("credits-amount-input");
  if (creditsAmountInput) {
    creditsAmountInput.addEventListener("input", () => {
      state.addCreditsAmount = Math.max(1, Number(creditsAmountInput.value) || 100);
    });
  }

  // ── Save service config ──
  const saveServiceConfigBtn = document.getElementById("save-service-config-btn");
  if (saveServiceConfigBtn) {
    saveServiceConfigBtn.addEventListener("click", async () => {
      const serviceId = saveServiceConfigBtn.dataset.serviceId;
      if (!serviceId) return;

      const enabledToggle  = document.getElementById("svc-enabled-toggle");
      const primaryToggle  = document.getElementById("svc-primary-toggle");
      const planSelect     = document.getElementById("svc-plan-select");
      const apiKeyInput    = document.getElementById("svc-api-key-input");

      const payload = {
        enabled:   enabledToggle  ? enabledToggle.checked  : undefined,
        isPrimary: primaryToggle  ? primaryToggle.checked  : undefined,
        plan:      planSelect     ? planSelect.value        : undefined,
        apiKey:    apiKeyInput && apiKeyInput.value.trim() ? apiKeyInput.value.trim() : undefined
      };

      saveServiceConfigBtn.textContent = "Saving…";
      saveServiceConfigBtn.disabled = true;

      try {
        const res = await fetch(`/api/services/${serviceId}/update-config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          // Update local state
          const idx = state.servicesConfig.findIndex((s) => s.id === serviceId);
          if (idx !== -1 && data.service) state.servicesConfig[idx] = { ...state.servicesConfig[idx], ...data.service };
          state.serviceActionStatus = { type: "success", message: `✓ ${data.message || "Configuration saved."}` };
          state.serviceApiKeyInput = "";
        } else {
          state.serviceActionStatus = { type: "warning", message: "⚠ Save failed. Check backend connection." };
        }
      } catch {
        // Demo mode: update local state directly
        const idx = state.servicesConfig.findIndex((s) => s.id === serviceId);
        if (idx !== -1) {
          if (enabledToggle)  state.servicesConfig[idx].enabled   = enabledToggle.checked;
          if (primaryToggle)  state.servicesConfig[idx].isPrimary = primaryToggle.checked;
          if (planSelect)     state.servicesConfig[idx].plan      = planSelect.value;
          if (apiKeyInput && apiKeyInput.value.trim()) {
            state.servicesConfig[idx].hasKey = true;
            state.servicesConfig[idx].status = "healthy";
          }
        }
        state.serviceActionStatus = { type: "success", message: "✓ Configuration saved (demo mode)." };
        state.serviceApiKeyInput = "";
      }
      setTimeout(() => { state.serviceActionStatus = null; render(); }, 3000);
      render();
    });
  }

  // ── Add credits buttons (overview cards + config form) ──
  document.querySelectorAll("[data-add-credits]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const serviceId = btn.dataset.addCredits;
      const amount = state.addCreditsAmount || 100;
      btn.textContent = "Adding…";
      btn.disabled = true;
      try {
        const res = await fetch(`/api/services/${serviceId}/add-credits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount })
        });
        if (res.ok) {
          const data = await res.json();
          const idx = state.servicesConfig.findIndex((s) => s.id === serviceId);
          if (idx !== -1 && data.service) state.servicesConfig[idx] = { ...state.servicesConfig[idx], ...data.service };
          state.serviceActionStatus = { type: "success", message: `✓ ${data.message}` };
        } else {
          state.serviceActionStatus = { type: "warning", message: "⚠ Could not add credits. Check backend." };
        }
      } catch {
        // Demo mode
        const idx = state.servicesConfig.findIndex((s) => s.id === serviceId);
        if (idx !== -1) {
          state.servicesConfig[idx].used = Math.max(0, (state.servicesConfig[idx].used || 0) - amount);
          const svc = state.servicesConfig[idx];
          if (svc.limit) {
            svc.pct = Math.min(100, Math.round((svc.used / svc.limit) * 100));
            svc.remaining = Math.max(0, svc.limit - svc.used);
            svc.status = svc.pct >= 95 ? "critical" : svc.pct >= 80 ? "warning" : "healthy";
          }
        }
        state.serviceActionStatus = { type: "success", message: `✓ ${amount} credits added (demo mode).` };
      }
      setTimeout(() => { state.serviceActionStatus = null; render(); }, 3000);
      render();
    });
  });

  // ── Auto-failover toggle ──
  const autoFailoverToggle = document.getElementById("auto-failover-toggle");
  if (autoFailoverToggle) {
    autoFailoverToggle.addEventListener("change", async () => {
      const enabled = autoFailoverToggle.checked;
      try {
        const res = await fetch("/api/services/failover/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled })
        });
        if (res.ok) {
          const data = await res.json();
          state.failoverMode = data.autoFailover;
        } else {
          state.failoverMode = enabled;
        }
      } catch {
        state.failoverMode = enabled;
      }
      render();
    });
  }

  // ── Refresh failover status ──
  const refreshFailoverBtn = document.getElementById("refresh-failover-btn");
  if (refreshFailoverBtn) {
    refreshFailoverBtn.addEventListener("click", async () => {
      refreshFailoverBtn.textContent = "Refreshing…";
      refreshFailoverBtn.disabled = true;
      try {
        const res = await fetch("/api/services/failover-status");
        if (res.ok) {
          const data = await res.json();
          state.failoverMode = data.autoFailover;
          state.failoverLog = data.failoverLog || [];
          state.failoverStatus = data.activeServices || {};
        }
      } catch {
        state.failoverStatus = buildDemoFailoverStatus(state.servicesConfig);
      }
      render();
    });
  }

  // ── Manual service switch buttons ──
  document.querySelectorAll(".api-switch-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fromId = btn.dataset.switchFrom;
      const selectEl = document.querySelector(`.api-switch-select[data-switch-from="${fromId}"]`);
      const toId = selectEl ? selectEl.value : null;
      if (!fromId || !toId) return;

      btn.textContent = "Switching…";
      btn.disabled = true;
      try {
        const res = await fetch("/api/services/failover/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromServiceId: fromId, toServiceId: toId })
        });
        if (res.ok) {
          const data = await res.json();
          state.serviceActionStatus = { type: "success", message: `✓ ${data.message}` };
          // Update failover log
          state.failoverLog.push({ timestamp: new Date().toISOString(), from: fromId, to: toId, reason: "Manual switch" });
        } else {
          state.serviceActionStatus = { type: "warning", message: "⚠ Switch failed." };
        }
      } catch {
        state.serviceActionStatus = { type: "success", message: `✓ Switched to ${toId} (demo mode).` };
        state.failoverLog.push({ timestamp: new Date().toISOString(), from: fromId, to: toId, reason: "Manual switch (demo)" });
      }
      setTimeout(() => { state.serviceActionStatus = null; render(); }, 3000);
      render();
    });
  });

  // ── Failover-to buttons (from config backup list) ──
  document.querySelectorAll("[data-failover-to]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fromId = btn.dataset.failoverFrom;
      const toId   = btn.dataset.failoverTo;
      btn.textContent = "Switching…";
      btn.disabled = true;
      try {
        const res = await fetch("/api/services/failover/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromServiceId: fromId, toServiceId: toId })
        });
        if (res.ok) {
          const data = await res.json();
          state.serviceActionStatus = { type: "success", message: `✓ ${data.message}` };
        } else {
          state.serviceActionStatus = { type: "warning", message: "⚠ Switch failed." };
        }
      } catch {
        state.serviceActionStatus = { type: "success", message: `✓ Switched to ${toId} (demo mode).` };
      }
      setTimeout(() => { state.serviceActionStatus = null; render(); }, 3000);
      render();
    });
  });

  // ── Refresh alerts ──
  const refreshAlertsBtn = document.getElementById("refresh-alerts-btn");
  if (refreshAlertsBtn) {
    refreshAlertsBtn.addEventListener("click", async () => {
      refreshAlertsBtn.textContent = "Refreshing…";
      refreshAlertsBtn.disabled = true;
      try {
        const res = await fetch("/api/services/alerts");
        if (res.ok) {
          const data = await res.json();
          state.alerts = data.alerts || [];
          state.alertsUnread = data.count || 0;
        }
      } catch { /* demo ok */ }
      render();
    });
  }

  // ── Acknowledge all alerts ──
  const ackAllAlertsBtn = document.getElementById("ack-all-alerts-btn");
  if (ackAllAlertsBtn) {
    ackAllAlertsBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/services/alerts/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true })
        });
      } catch { /* demo ok */ }
      state.alerts.forEach((a) => { a.acknowledged = true; });
      state.alertsUnread = 0;
      render();
    });
  }

  // ── Acknowledge individual alert ──
  document.querySelectorAll("[data-ack-alert]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const alertId = btn.dataset.ackAlert;
      try {
        await fetch("/api/services/alerts/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertId })
        });
      } catch { /* demo ok */ }
      const alert = state.alerts.find((a) => a.id === alertId);
      if (alert) alert.acknowledged = true;
      state.alertsUnread = state.alerts.filter((a) => !a.acknowledged).length;
      render();
    });
  });

  // ── Dismiss global service action feedback ──
  const dismissServiceAction = document.getElementById("dismiss-service-action");
  if (dismissServiceAction) {
    dismissServiceAction.addEventListener("click", () => {
      state.serviceActionStatus = null;
      render();
    });
  }

  // ── Render result actions ──
  const approveRender = document.getElementById("approve-render");
  if (approveRender) {
    approveRender.addEventListener("click", () => {
      state.renderStatus = "Approved";
      render();
    });
  }
  const rejectRender = document.getElementById("reject-render");
  if (rejectRender) {
    rejectRender.addEventListener("click", () => {
      state.renderStatus = "Rejected";
      state.renderUrl = null;
      render();
    });
  }
  const regenerateRender = document.getElementById("regenerate-render");
  if (regenerateRender) {
    regenerateRender.addEventListener("click", () => {
      state.renderStatus = null;
      state.renderUrl = null;
      state.renderProgress = 0;
      render();
    });
  }

  // ── Media Gallery ──────────────────────────────────────────────────────────

  // Toggle gallery open/close
  const mediaGalleryToggle = document.getElementById("media-gallery-toggle");
  if (mediaGalleryToggle) {
    mediaGalleryToggle.addEventListener("click", () => {
      state.mediaGalleryOpen = !state.mediaGalleryOpen;
      if (state.mediaGalleryOpen && state.mediaVideos.length === 0) {
        loadMediaGallery();
      } else {
        render();
      }
    });
  }

  // Refresh gallery
  const mediaRefreshBtn = document.getElementById("media-refresh-btn");
  if (mediaRefreshBtn) {
    mediaRefreshBtn.addEventListener("click", () => {
      loadMediaGallery();
    });
  }

  // Filter tabs
  document.querySelectorAll("[data-media-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mediaFilter = btn.dataset.mediaFilter;
      render();
    });
  });

  // Video card selection checkboxes
  document.querySelectorAll(".media-select-cb").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      e.stopPropagation();
      const id = cb.dataset.mediaSelect;
      if (cb.checked) state.mediaSelectedIds.add(id);
      else state.mediaSelectedIds.delete(id);
      render();
    });
  });

  // Clear bulk selection
  const mediaClearSelection = document.getElementById("media-clear-selection");
  if (mediaClearSelection) {
    mediaClearSelection.addEventListener("click", () => {
      state.mediaSelectedIds = new Set();
      render();
    });
  }

  // Bulk approve
  const mediaBulkApprove = document.getElementById("media-bulk-approve");
  if (mediaBulkApprove) {
    mediaBulkApprove.addEventListener("click", async () => {
      const ids = [...state.mediaSelectedIds];
      if (!ids.length) return;
      try {
        const res = await fetch("/api/media/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action: "approve" })
        });
        if (res.ok) {
          ids.forEach((id) => {
            const v = state.mediaVideos.find((v) => v.id === id);
            if (v) v.approvalStatus = "approved";
          });
          state.mediaStats.approved += ids.length;
          state.mediaStats.pending = Math.max(0, state.mediaStats.pending - ids.length);
        }
      } catch {
        // Demo mode: update locally
        ids.forEach((id) => {
          const v = state.mediaVideos.find((v) => v.id === id);
          if (v) v.approvalStatus = "approved";
        });
      }
      state.mediaSelectedIds = new Set();
      render();
    });
  }

  // Bulk discard
  const mediaBulkDiscard = document.getElementById("media-bulk-discard");
  if (mediaBulkDiscard) {
    mediaBulkDiscard.addEventListener("click", async () => {
  // ── Bulk discard ──
  const bulkDiscardBtn = document.getElementById("bulk-discard-btn");
  if (bulkDiscardBtn) {
    bulkDiscardBtn.addEventListener("click", async () => {
      const ids = [...state.mediaSelectedIds];
      if (!ids.length) return;
      try {
        const res = await fetch("/api/media/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action: "discard" })
        });
        if (res.ok) {
          ids.forEach((id) => {
            const v = state.mediaVideos.find((v) => v.id === id);
            if (v) v.approvalStatus = "discarded";
          });
        }
      } catch {
        ids.forEach((id) => {
          const v = state.mediaVideos.find((v) => v.id === id);
          if (v) v.approvalStatus = "discarded";
        });
      }
      state.mediaSelectedIds = new Set();
      render();
    });
  }

  // Open review panel
  document.querySelectorAll("[data-review-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.reviewId;
      const video = state.mediaVideos.find((v) => v.id === id);
      if (video) {
        state.mediaReviewVideo = video;
        state.mediaReviewOpen = true;
        state.mediaRejectionReason = "";
        state.mediaAiSuggestions = video.aiSuggestions || null;
        render();
      }
    });
  });

  // Close review panel
  const mediaReviewClose = document.getElementById("media-review-close");
  if (mediaReviewClose) {
    mediaReviewClose.addEventListener("click", () => {
      state.mediaReviewOpen = false;
      state.mediaReviewVideo = null;
      state.mediaAiSuggestions = null;
      state.mediaRejectionReason = "";
      render();
    });
  }

  // Close review panel on overlay click
  const mediaReviewOverlay = document.getElementById("media-review-overlay");
  if (mediaReviewOverlay) {
    mediaReviewOverlay.addEventListener("click", (e) => {
      if (e.target === mediaReviewOverlay) {
        state.mediaReviewOpen = false;
        state.mediaReviewVideo = null;
        state.mediaAiSuggestions = null;
        state.mediaRejectionReason = "";
        render();
      }
    });
  }

  // Rejection reason textarea
  const mediaRejectionTextarea = document.getElementById("media-rejection-reason");
  if (mediaRejectionTextarea) {
    mediaRejectionTextarea.addEventListener("input", () => {
      state.mediaRejectionReason = mediaRejectionTextarea.value;
    });
  }

  // Approve button
  const mediaBtnApprove = document.getElementById("media-btn-approve");
  if (mediaBtnApprove) {
    mediaBtnApprove.addEventListener("click", async () => {
      if (!state.mediaReviewVideo) return;
      const id = state.mediaReviewVideo.id;
      state.mediaActionLoading = true;
      render();
      try {
        const res = await fetch(`/api/media/${id}/approve`, { method: "POST" });
        if (res.ok) {
          const v = state.mediaVideos.find((v) => v.id === id);
          if (v) v.approvalStatus = "approved";
          if (state.mediaReviewVideo) state.mediaReviewVideo.approvalStatus = "approved";
          state.mediaStats.approved = (state.mediaStats.approved || 0) + 1;
          state.mediaStats.pending = Math.max(0, (state.mediaStats.pending || 0) - 1);
        }
      } catch {
        // Demo mode
        const v = state.mediaVideos.find((v) => v.id === id);
        if (v) v.approvalStatus = "approved";
        if (state.mediaReviewVideo) state.mediaReviewVideo.approvalStatus = "approved";
      }
      state.mediaActionLoading = false;
      render();
    });
  }

  // Needs Re-render button
  const mediaBtnRerender = document.getElementById("media-btn-rerender");
  if (mediaBtnRerender) {
    mediaBtnRerender.addEventListener("click", async () => {
      if (!state.mediaReviewVideo) return;
      const id = state.mediaReviewVideo.id;
      const reason = state.mediaRejectionReason || "";
      state.mediaActionLoading = true;
      render();
      try {
        const res = await fetch(`/api/media/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason })
        });
        if (res.ok) {
          const data = await res.json();
          const v = state.mediaVideos.find((v) => v.id === id);
          if (v) {
            v.approvalStatus = "needs_rerender";
            v.rejectionReason = reason;
            v.aiSuggestions = data.suggestions || null;
            v.iterationCount = data.iterationCount || v.iterationCount;
          }
          if (state.mediaReviewVideo) {
            state.mediaReviewVideo.approvalStatus = "needs_rerender";
            state.mediaReviewVideo.rejectionReason = reason;
            state.mediaReviewVideo.aiSuggestions = data.suggestions || null;
          }
          state.mediaAiSuggestions = data.suggestions || null;
          state.mediaStats.rerender = (state.mediaStats.rerender || 0) + 1;
          state.mediaStats.pending = Math.max(0, (state.mediaStats.pending || 0) - 1);
        }
      } catch {
        // Demo mode: generate local suggestions
        const v = state.mediaVideos.find((v) => v.id === id);
        const demoSuggestions = {
          improvements: [
            "Rewrite the opening hook with a stronger curiosity or problem-agitation pattern",
            "Lead with a bold claim or surprising statistic in the first 2 seconds",
            "Increase visual cut frequency — aim for a new scene every 1.5–2 seconds",
            "Add dynamic text overlays to maintain viewer attention",
            "Strengthen the CTA with urgency language"
          ],
          expectedQualityGain: "+15% estimated quality improvement",
          focusArea: "Overall Creative Quality",
          iterationNote: "Attempt 1 of 3. AI improvements applied based on rejection feedback."
        };
        if (v) {
          v.approvalStatus = "needs_rerender";
          v.rejectionReason = reason;
          v.aiSuggestions = demoSuggestions;
        }
        if (state.mediaReviewVideo) {
          state.mediaReviewVideo.approvalStatus = "needs_rerender";
          state.mediaReviewVideo.rejectionReason = reason;
          state.mediaReviewVideo.aiSuggestions = demoSuggestions;
        }
        state.mediaAiSuggestions = demoSuggestions;
      }
      state.mediaActionLoading = false;
      render();
    });
  }

  // Discard button
  const mediaBtnDiscard = document.getElementById("media-btn-discard");
  if (mediaBtnDiscard) {
    mediaBtnDiscard.addEventListener("click", async () => {
      if (!state.mediaReviewVideo) return;
      const id = state.mediaReviewVideo.id;
      state.mediaActionLoading = true;
      render();
      try {
        await fetch(`/api/media/${id}/discard`, { method: "POST" });
      } catch { /* demo ok */ }
      const v = state.mediaVideos.find((v) => v.id === id);
      if (v) v.approvalStatus = "discarded";
      if (state.mediaReviewVideo) state.mediaReviewVideo.approvalStatus = "discarded";
      state.mediaStats.discarded = (state.mediaStats.discarded || 0) + 1;
      state.mediaStats.pending = Math.max(0, (state.mediaStats.pending || 0) - 1);
      state.mediaActionLoading = false;
      render();
    });
  }

  // Requeue button
  const mediaBtnRequeue = document.getElementById("media-btn-requeue");
  if (mediaBtnRequeue) {
    mediaBtnRequeue.addEventListener("click", async () => {
      if (!state.mediaReviewVideo) return;
      const id = state.mediaReviewVideo.id;
      state.mediaActionLoading = true;
      render();
      try {
        const res = await fetch(`/api/media/${id}/requeue`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          // Mark original as superseded
          const v = state.mediaVideos.find((v) => v.id === id);
          if (v) v.approvalStatus = "superseded";
          if (state.mediaReviewVideo) state.mediaReviewVideo.approvalStatus = "superseded";
          // Add new queued video to gallery
          if (data.newRenderId) {
            state.mediaVideos.unshift({
              id: data.newRenderId,
              platform: state.mediaReviewVideo.platform,
              videoUrl: null,
              thumbnailUrl: null,
              status: "queued",
              approvalStatus: "pending",
              script: state.mediaReviewVideo.script,
              parameters: state.mediaReviewVideo.parameters,
              rejectionReason: "",
              aiSuggestions: null,
              iterationCount: data.iterationCount,
              qualityScore: null,
              product: state.mediaReviewVideo.product,
              hook: state.mediaReviewVideo.hook,
              createdAt: new Date().toISOString(),
            });
          }
          state.mediaStats.rerender = Math.max(0, (state.mediaStats.rerender || 0) - 1);
          state.mediaStats.pending = (state.mediaStats.pending || 0) + 1;
          // Close review panel
          state.mediaReviewOpen = false;
          state.mediaReviewVideo = null;
          state.mediaAiSuggestions = null;
        }
      } catch {
        // Demo mode
        const v = state.mediaVideos.find((v) => v.id === id);
        if (v) v.approvalStatus = "superseded";
        if (state.mediaReviewVideo) state.mediaReviewVideo.approvalStatus = "superseded";
        state.mediaReviewOpen = false;
        state.mediaReviewVideo = null;
        state.mediaAiSuggestions = null;
      }
      state.mediaActionLoading = false;
      render();
    });
  }

  // ── Generate Creatives (script-writer) ──
  const generateCreativesBtn = document.querySelector(".primary");
  if (generateCreativesBtn && generateCreativesBtn.textContent.includes("Generate Today")) {
    generateCreativesBtn.addEventListener("click", async () => {
      generateCreativesBtn.disabled = true;
      generateCreativesBtn.textContent = "Generating…";
      try {
        const data = await agentFetch("/api/agents/script-writer/generate", {
          style: state.videoStyle,
          platform: "TikTok",
          duration: state.videoDuration
        });
        if (data.success && data.scripts) {
          data.scripts.forEach((s) => {
            creatives.unshift({
              id: s.id,
              status: "Draft",
              product: s.product,
              format: s.format,
              hook: s.hook,
              script: s.script,
              asset: "AI Generated",
              channel: s.platform,
              score: s.score,
              approved: false,
              rejectionReason: ""
            });
          });
          state.syncMessage = `Script Writer generated ${data.scripts.length} new creatives.`;
          state.syncLevel = "connected";
        }
      } catch (e) {
        console.warn("Script writer agent unavailable:", e);
        state.syncMessage = "Script Writer ran in demo mode.";
      }
      render();
    });
  }

  // ── Match Products (product-match agent) ──
  const matchProductsBtn = document.getElementById("filter-by-selected-products");
  // Also wire a dedicated match button if present
  document.querySelectorAll("[data-agent='product-match']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Analyzing…";
      try {
        const data = await agentFetch("/api/agents/product-match/analyze", {
          category: state.category !== "All" ? state.category : undefined
        });
        if (data.success && data.matches) {
          state.syncMessage = `Product Match: ${data.message}`;
          state.syncLevel = "connected";
        }
      } catch (e) {
        console.warn("Product match agent unavailable:", e);
      }
      render();
    });
  });

  // ── Toggle Copilot panel ──
  const toggleCopilot = document.getElementById("toggle-copilot");
  if (toggleCopilot) {
    toggleCopilot.addEventListener("click", () => {
      state.showCopilot = !state.showCopilot;
      render();
    });
  }

  // ── Copilot input type ──
  const copilotInputType = document.getElementById("copilot-input-type");
  if (copilotInputType) {
    copilotInputType.addEventListener("change", () => {
      state.copilotInputType = copilotInputType.value;
    });
  }

  // ── Copilot input text ──
  const copilotInputEl = document.getElementById("copilot-input");
  if (copilotInputEl) {
    copilotInputEl.addEventListener("input", () => {
      state.copilotInput = copilotInputEl.value;
    });
  }

  // ── Copilot: AI Suggestions ──
  const copilotSuggestBtn = document.getElementById("copilot-suggest-btn");
  if (copilotSuggestBtn) {
    copilotSuggestBtn.addEventListener("click", async () => {
      state.copilotLoading = true;
      state.copilotSuggestions = [];
      state.copilotRefinements = [];
      state.copilotExplanation = null;
      render();
      try {
        const data = await agentFetch("/api/agents/copilot/suggest", {
          context: state.copilotInputType,
          hook: state.copilotInputType === "hook" ? state.copilotInput : undefined,
          product: state.copilotInputType === "product" ? state.copilotInput : undefined,
          platform: state.platform !== "All" ? state.platform : undefined
        });
        if (data.success && data.suggestions) {
          state.copilotSuggestions = data.suggestions;
        }
      } catch (e) {
        console.warn("Copilot suggest unavailable:", e);
        // Demo fallback
        state.copilotSuggestions = [
          { type: "hook", priority: "High", suggestion: "Lead with a curiosity gap hook: 'Nobody talks about this 7-day morning habit...'", rationale: "Curiosity-gap hooks average 2.3x higher watch-through rate.", action: "Apply to script" },
          { type: "structure", priority: "High", suggestion: "Use the 5-beat structure: Hook → Problem → Proof → Product → CTA.", rationale: "Matches top-performing creatives in your workspace.", action: "Generate script" }
        ];
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ── Copilot: Refine Hook ──
  const copilotRefineBtn = document.getElementById("copilot-refine-btn");
  if (copilotRefineBtn) {
    copilotRefineBtn.addEventListener("click", async () => {
      if (!state.copilotInput.trim()) {
        alert("Paste a hook or script into the Copilot input first.");
        return;
      }
      state.copilotLoading = true;
      state.copilotSuggestions = [];
      state.copilotRefinements = [];
      state.copilotExplanation = null;
      render();
      try {
        const data = await agentFetch("/api/agents/copilot/refine", {
          input: state.copilotInput,
          type: state.copilotInputType,
          goal: "increase engagement",
          platform: state.platform !== "All" ? state.platform : "TikTok"
        });
        if (data.success && data.refinements) {
          state.copilotRefinements = data.refinements;
        }
      } catch (e) {
        console.warn("Copilot refine unavailable:", e);
        state.copilotRefinements = [
          { variant: "Urgency", refined: state.copilotInput + " — and most people miss it.", improvement: "Added urgency trigger.", expectedLift: "+12% CTR" },
          { variant: "Specificity", refined: state.copilotInput.replace("this", "this one 30-second"), improvement: "Specific numbers increase credibility.", expectedLift: "+18% watch-through" }
        ];
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ── Copilot: Explain Decision ──
  const copilotExplainBtn = document.getElementById("copilot-explain-btn");
  if (copilotExplainBtn) {
    copilotExplainBtn.addEventListener("click", async () => {
      state.copilotLoading = true;
      state.copilotSuggestions = [];
      state.copilotRefinements = [];
      state.copilotExplanation = null;
      render();
      try {
        const data = await agentFetch("/api/agents/copilot/explain", {
          decision: state.copilotInput || "creative scoring",
          context: state.copilotInputType
        });
        if (data.success && data.explanation) {
          state.copilotExplanation = data.explanation;
        }
      } catch (e) {
        console.warn("Copilot explain unavailable:", e);
        state.copilotExplanation = {
          summary: "The AI evaluated this decision using viral pattern data, platform velocity signals, and historical conversion benchmarks.",
          factors: [
            { factor: "Hook strength", weight: "35%", score: 88, explanation: "Curiosity-gap hooks with a specific timeframe score highest." },
            { factor: "Structural clarity", weight: "25%", score: 82, explanation: "The 5-beat structure is present and well-paced." },
            { factor: "Platform fit", weight: "20%", score: 79, explanation: "Format and pacing match the target platform's top patterns." },
            { factor: "Product-trend alignment", weight: "20%", score: 91, explanation: "The product category is trending +28% this week." }
          ],
          recommendation: "This creative is ready for A/B testing. Pair with a high-velocity hook variant for best results.",
          confidence: "High"
        };
      }
      state.copilotLoading = false;
      render();
    });
  }

  // ── Auto-Generate Everything ──
  const autoGenerateCountInput = document.getElementById("auto-generate-count");
  if (autoGenerateCountInput) {
    autoGenerateCountInput.addEventListener("change", () => {
      state.autoGenerateCount = Math.max(1, Math.min(10, Number(autoGenerateCountInput.value) || 3));
    });
  }

  const autoGenerateBtn = document.getElementById("auto-generate-btn");
  if (autoGenerateBtn) {
    autoGenerateBtn.addEventListener("click", async () => {
      state.autoGenerateCount = Number(document.getElementById("auto-generate-count")?.value || state.autoGenerateCount);
      state.autoGenerating = true;
      state.showAutoGenerateResult = false;
      state.autoGenerateResults = [];
      state.autoGeneratePipeline = [
        { step: 1, name: "Trend Scout", status: "running", result: "" },
        { step: 2, name: "Product Match", status: "pending", result: "" },
        { step: 3, name: "Script Writer", status: "pending", result: "" },
        { step: 4, name: "Queue", status: "pending", result: "" }
      ];
      render();

      try {
        const data = await agentFetch("/api/agents/auto-generate", {
          count: state.autoGenerateCount,
          style: state.videoStyle,
          platforms: ["TikTok", "Instagram", "YouTube"]
        });

        if (data.success) {
          state.autoGeneratePipeline = data.pipeline || state.autoGeneratePipeline.map((s) => ({ ...s, status: "complete" }));
          state.autoGenerateResults = data.generated || [];

          // Add generated creatives to the workspace
          if (data.generated && data.generated.length) {
            data.generated.forEach((c) => {
              creatives.unshift({
                id: c.id,
                status: "Draft",
                product: c.product,
                format: c.format,
                hook: c.hook,
                script: c.script,
                asset: "Auto-Generated",
                channel: c.channel,
                score: c.score,
                approved: false,
                rejectionReason: ""
              });
            });
          }

          state.syncMessage = data.message || `Auto-Generate complete: ${state.autoGenerateResults.length} creatives ready.`;
          state.syncLevel = "connected";
          state.showAutoGenerateResult = true;
        }
      } catch (e) {
        console.warn("Auto-generate agent unavailable:", e);
        // Demo fallback
        await new Promise((r) => setTimeout(r, 2000));
        const demoResults = Array.from({ length: state.autoGenerateCount }, (_, i) => ({
          id: `demo-ag-${i}`,
          product: products[i % products.length].name,
          hook: winningHooks[i % winningHooks.length].text,
          script: `Demo script for ${products[i % products.length].name}. Hook: ${winningHooks[i % winningHooks.length].text}`,
          format: `UGC ${["TikTok","Instagram","YouTube"][i % 3]}`,
          platform: ["TikTok","Instagram","YouTube"][i % 3],
          channel: ["TikTok","Instagram","YouTube"][i % 3],
          score: Math.floor(Math.random() * 15) + 80,
          status: "Draft"
        }));
        state.autoGeneratePipeline = [
          { step: 1, name: "Trend Scout", status: "complete", result: `${winningHooks.length} hooks analyzed` },
          { step: 2, name: "Product Match", status: "complete", result: `${products.length} products matched` },
          { step: 3, name: "Script Writer", status: "complete", result: `${demoResults.length} scripts generated` },
          { step: 4, name: "Queue", status: "complete", result: `${demoResults.length} creatives added to Draft queue` }
        ];
        state.autoGenerateResults = demoResults;
        demoResults.forEach((c) => {
          creatives.unshift({ ...c, asset: "Auto-Generated (Demo)", approved: false, rejectionReason: "" });
        });
        state.showAutoGenerateResult = true;
        state.syncMessage = `Auto-Generate (demo): ${demoResults.length} creatives ready.`;
      }

      state.autoGenerating = false;
      render();
    });
  }

  // ── Agent Orchestration Dashboard ──
  const toggleAgentStatus = document.getElementById("toggle-agent-status");
  if (toggleAgentStatus) {
    toggleAgentStatus.addEventListener("click", () => {
      state.agentStatusOpen = !state.agentStatusOpen;
      if (state.agentStatusOpen && state.agentStatuses.length === 0) {
        loadAgentStatuses();
      } else {
        render();
      }
    });
  }

  const agentRefreshBtn = document.getElementById("agent-refresh-btn");
  if (agentRefreshBtn) {
    agentRefreshBtn.addEventListener("click", () => {
      loadAgentStatuses();
    });
  }

  // ── Published Media Gallery ──
  const togglePublishedMedia = document.getElementById("toggle-published-media");
  if (togglePublishedMedia) {
    togglePublishedMedia.addEventListener("click", () => {
      state.publishedMediaOpen = !state.publishedMediaOpen;
      if (state.publishedMediaOpen && state.publishedMedia.length === 0) {
        loadPublishedMedia();
      } else {
        render();
      }
    });
  }

  const publishedRefreshBtn = document.getElementById("published-refresh-btn");
  if (publishedRefreshBtn) {
    publishedRefreshBtn.addEventListener("click", () => {
      loadPublishedMedia();
    });
  }

  // Published media filter tabs
  document.querySelectorAll("[data-pub-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.publishedMediaFilter = btn.dataset.pubFilter;
      state.selectedPublishedId = null;
      state.publishActionStatus = null;
      render();
    });
  });

  // Published media card selection
  document.querySelectorAll("[data-pub-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.pubId;
      if (id) {
        state.selectedPublishedId = state.selectedPublishedId === id ? null : id;
        state.publishActionStatus = null;
        render();
      }
    });
  });

  // Published detail close
  const publishedDetailClose = document.getElementById("published-detail-close");
  if (publishedDetailClose) {
    publishedDetailClose.addEventListener("click", () => {
      state.selectedPublishedId = null;
      state.publishActionStatus = null;
      render();
    });
  }

  // Published media action buttons
  document.querySelectorAll("[data-pub-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.pubAction;
      const id = btn.dataset.pubId;
      const items = state.publishedMedia.length ? state.publishedMedia : DEMO_PUBLISHED_MEDIA;
      const item = items.find((m) => m.id === id);
      if (!item) return;

      if (action === "publish") {
        state.publishActionStatus = { id, type: "info", message: "Publishing…" };
        render();
        try {
          await fetch(`/api/published-media/${id}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platforms: item.publishedTo || ["TikTok"] })
          });
        } catch { /* demo ok */ }
        item.status = "live";
        state.publishActionStatus = { id, type: "success", message: `✓ Published to ${(item.publishedTo || ["TikTok"]).join(", ")}` };
      } else if (action === "archive") {
        item.status = "archived";
        state.publishActionStatus = { id, type: "info", message: "↓ Archived" };
      } else if (action === "download") {
        state.publishActionStatus = { id, type: "info", message: "↓ Preparing download…" };
      }
      render();
    });
  });

  // ── Analytics Dashboard ──
  const toggleAnalytics = document.getElementById("toggle-analytics");
  if (toggleAnalytics) {
    toggleAnalytics.addEventListener("click", () => {
      state.analyticsOpen = !state.analyticsOpen;
      if (state.analyticsOpen && !state.analyticsData) {
        loadAnalyticsData();
      } else {
        render();
      }
    });
  }

  const analyticsRefreshBtn = document.getElementById("analytics-refresh-btn");
  if (analyticsRefreshBtn) {
    analyticsRefreshBtn.addEventListener("click", () => {
      loadAnalyticsData();
    });
  }

  // Analytics tab navigation
  document.querySelectorAll("[data-analytics-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.analyticsTab = btn.dataset.analyticsTab;
      render();
    });
  });

  // ── Quality Validator ──
  const qualityValidateBtn = document.getElementById("quality-validate-btn");
  if (qualityValidateBtn) {
    qualityValidateBtn.addEventListener("click", () => {
      validateQuality();
    });
  }

  const qualityClearResult = document.getElementById("quality-clear-result");
  if (qualityClearResult) {
    qualityClearResult.addEventListener("click", () => {
      state.qualityResult = null;
      render();
    });
  }

  // Quality range sliders
  document.querySelectorAll(".quality-range").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.qualityKey;
      const val = Number(input.value);
      state.qualityScores[key] = val;
      const display = document.getElementById(`quality-val-${key}`);
      if (display) {
        display.textContent = val;
        const threshold = state.qualityThresholds[key] || 0;
        display.className = `quality-range-val ${val >= threshold ? "quality-pass-text" : "quality-fail-text"}`;
      }
    });
  });
}

async function boot() {
  render();
  await hydrateFromSupabase();
  await hydrateFromServerApi();
  // Pre-load API service configs in background
  loadServicesConfig().catch(() => {
    state.servicesConfig = buildDemoServices();
    state.failoverStatus = buildDemoFailoverStatus(state.servicesConfig);
  });
  render();
}

boot();
