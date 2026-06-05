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

  // Video Assembly Workspace
  assemblyHookFilter: "All",
  assemblyScriptFilter: "All",
  assemblyProductFilter: "All",
  videoDuration: "15s",
  videoStyle: "UGC",
  videoVoice: "Female",
  videoBackground: "Music",
  videoAspect: "9:16",
  assemblyComponents: [],
  videoDrafts: [],
  renderStatus: null,
  renderUrl: null,
  renderProgress: 0,
  showAssemblyWorkspace: true,
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
  copilotLoading: false
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
          </div>

          <!-- Builder + Parameters Row -->
          <div class="assembly-builder-row">
            <div class="params-panel">
              <h3>Video Parameters</h3>
              <div class="params-grid">
                <label class="param-label">Duration
                  <select data-state-key="videoDuration">
                    ${["5s","10s","15s","30s"].map((v) => `<option ${state.videoDuration === v ? "selected" : ""}>${v}</option>`).join("")}
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

            <div class="builder-panel">
              <div class="builder-head">
                <h3>Video Builder</h3>
                <div class="builder-actions">
                  <button class="ghost" id="ai-suggestions-btn">${icon("spark")} AI Suggestions</button>
                  <button class="ghost" id="save-draft-btn">${icon("check")} Save Draft</button>
                </div>
              </div>
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
              <div class="render-actions">
                <button class="render-btn heygen" id="send-heygen" ${state.assemblyComponents.length === 0 ? "disabled" : ""}>${icon("video")} Send to HeyGen</button>
                <button class="render-btn runway" id="send-runway" ${state.assemblyComponents.length === 0 ? "disabled" : ""}>${icon("video")} Send to Runway</button>
                <button class="render-btn kling"  id="send-kling"  ${state.assemblyComponents.length === 0 ? "disabled" : ""}>${icon("video")} Send to Kling</button>
              </div>
            </div>
          </div>

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
        </div>
        ` : ""}
      </section>

      ${renderMediaArea("video-generation")}
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
          <button class="ghost">${icon("filter")} Connect Sources</button>
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
