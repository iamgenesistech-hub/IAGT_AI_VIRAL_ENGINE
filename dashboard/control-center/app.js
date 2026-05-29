const state = {
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
        ${[
          ["radar", "Viral Intelligence"],
          ["spark", "AI Reconstruction"],
          ["video", "Video Generation"],
          ["send", "Distribution"],
          ["chart", "Analytics"],
          ["gear", "Twin Automation"]
        ].map(([ic, label], i) => `<button class="${i === 0 ? "active" : ""}">${icon(ic)}<span>${label}</span></button>`).join("")}
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
          <button class="primary ${state.autoGenerating ? "generating" : ""}" id="generate-today-btn" ${state.autoGenerating ? "disabled" : ""}>
            ${state.autoGenerating ? `${icon("radar")} Generating…` : `${icon("spark")} Generate Today's Ads`}
          </button>
          <button class="ghost copilot-toggle-btn" id="copilot-toggle-btn">${icon("spark")} Copilot</button>
        </div>
      </header>

      ${state.autoGenerateResult ? `
      <div class="auto-generate-banner">
        ${icon("check")} ${state.autoGenerateResult}
        <button class="toggle-link" id="dismiss-auto-generate">✕</button>
      </div>
      ` : ""}

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

      <!-- ── METRICS GRID (interactive) ── -->
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
          </div>
        </article>

        ${metric("Projected ROAS signal", "3.7x", "based on patterns")}
      </section>

      <!-- ── HOOKS LIST (expandable) ── -->
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

      <!-- ── VIRAL TRENDS MONITOR ── -->
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

      <!-- ── ELITE MANUAL VIDEO ASSEMBLY WORKSPACE ── -->
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

            <!-- Video Builder -->
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

      <!-- ── AI CONTENT QUEUE ── -->
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
                  ${productNames.map((n) => `<option ${n === state.creativeProductFilter ? "selected" : ""}>${n}</option>`).join("")}
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

  bindEvents();
}

function metric(label, value, delta) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${delta}</small></article>`;
}

function select(name, options, value) {
  return `<label><select data-select="${name}">${options.map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
}

function bindEvents() {
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
  render();
}

boot();
