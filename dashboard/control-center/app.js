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

  // Product Matching
  productsExpanded: false,
  selectedProducts: new Set(),
  creativeProductFilter: "All",

  // Video Generation Pipeline
  scriptInput: "",
  submittedScript: "",
  uploadedScriptName: "",
  inputStatus: "idle",
  inputMessage: "Paste a script or upload a text file, then submit it to unlock generation.",
  videoDuration: "15s",
  videoStyle: "UGC",
  videoVoice: "Female",
  videoBackground: "Music",
  videoAspect: "9:16",
  renderStatus: "idle",
  renderMessage: "Waiting for submitted input.",
  renderUrl: null,
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

  // Auto-generate
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
    filter: '<path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/>'
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

// ── Media Management constants ──
const MEDIA_TYPES = [
  { id: "All",          label: "All Types" },
  { id: "video",        label: "Video" },
  { id: "print_ad",     label: "Print Ad" },
  { id: "email",        label: "Email Marketing" },
  { id: "social_post",  label: "Social Post" },
  { id: "landing_page", label: "Landing Page" },
  { id: "ugc",          label: "UGC" },
  { id: "banner",       label: "Banner Ad" }
];

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
  { id: "viral-intelligence", icon: "radar", label: "Viral Intelligence",  desc: "Trend scanning, hook discovery, viral pattern analysis" },
  { id: "ai-reconstruction",  icon: "spark", label: "AI Reconstruction",   desc: "AI-powered creative reconstruction from viral ads" },
  { id: "video-generation",   icon: "video", label: "Video Generation",    desc: "Video rendering via HeyGen, Runway, and Kling" },
  { id: "media-output",       icon: "video", label: "Media Output",        desc: "Playback, QA, render routing, and publishing control" },
  { id: "distribution",       icon: "send",  label: "Distribution",        desc: "Publishing queue and channel management" },
  { id: "analytics",          icon: "chart", label: "Analytics",           desc: "Performance metrics and learning loop" },
  { id: "twin-automation",    icon: "gear",  label: "Twin Automation",     desc: "Agent orchestration and auto-generate pipeline" }
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
          <div class="metric-toggle-row">
            <button class="toggle-link" id="toggle-hooks-list">${state.showHooksList ? "▲ Hide hooks" : "▼ Show all hooks"}</button>
            <button class="toggle-link ${state.hookAutoSelect ? "active-link" : ""}" id="hook-auto-select">
              ${state.hookAutoSelect ? "✓ AI Auto-Select ON" : "AI Auto-Select"}
            </button>
          </div>
        </article>
        ${metric("Avg engagement rate", "10.2%", "across scanned ads")}
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

function render() {
  const app = document.getElementById("app");

  // Determine which section content to render
  const sectionRenderers = {
    "viral-intelligence": renderViralIntelligence,
    "ai-reconstruction":  renderAiReconstruction,
    "video-generation":   renderVideoGeneration,
    "media-output":       window.renderMediaOutputCenter || (() => "<div class=\"panel\">Media Output Center is loading.</div>"),
    "distribution":       renderDistribution,
    "analytics":          renderAnalytics,
    "twin-automation":    renderTwinAutomation
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

  // ── Rescan button ──
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
        const res = await fetch("/api/viral/rescan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: state.scanAmount })
        });
        if (res.ok) {
          const data = await res.json();
          state.scanCount = data.count || state.scanAmount;
        } else {
          // Demo mode: simulate scan
          await new Promise((r) => setTimeout(r, 1800));
          state.scanCount = state.scanAmount;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1800));
        state.scanCount = state.scanAmount;
      }
      state.scanning = false;
      render();
    });
  }

  // ── Hook search button ──
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
        const res = await fetch("/api/hooks/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: state.hookTarget })
        });
        if (res.ok) {
          const data = await res.json();
          state.hooksFound = data.found || state.hookTarget;
          if (data.hooks && data.hooks.length) {
            winningHooks.push(...data.hooks.map((h, i) => ({
              id: `h-api-${i}`,
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

  // ── AI Suggestions ──
  const aiSuggestionsBtn = document.getElementById("ai-suggestions-btn");
  if (aiSuggestionsBtn) {
    aiSuggestionsBtn.addEventListener("click", async () => {
      aiSuggestionsBtn.textContent = "Generating…";
      aiSuggestionsBtn.disabled = true;
      try {
        const res = await fetch("/api/assembly/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            style: state.videoStyle,
            duration: state.videoDuration,
            aspect: state.videoAspect
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.components && data.components.length) {
            state.assemblyComponents = data.components;
            render();
            return;
          }
        }
      } catch { /* fall through to demo */ }
      // Demo: auto-populate with a hook + script + product
      const hook = winningHooks.find((h) => h.confidence === "High") || winningHooks[0];
      const script = creatives.find((c) => c.status === "Ready") || creatives[0];
      const product = products[0];
      state.assemblyComponents = [
        { type: "hook", id: hook.id, text: hook.text },
        { type: "script", id: script.id, text: script.script },
        { type: "product", id: product.name, text: product.name }
      ];
      render();
    });
  }

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
        await fetch("/api/assembly/drafts", {
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
      const res = await fetch("/api/video/generate", {
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
        state.renderStatus = "Complete";
        state.renderUrl = data.url || data.videoUrl || null;
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

  const sendKling = document.getElementById("send-kling");
  if (sendKling) sendKling.addEventListener("click", () => sendToRenderer("kling"));

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
  if (window.loadMediaOutputs) {
    await window.loadMediaOutputs();
  }
  render();
}

boot();
