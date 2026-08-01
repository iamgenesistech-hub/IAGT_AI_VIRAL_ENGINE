(function () {
  "use strict";

  var app = document.getElementById("app");
  var splash = document.getElementById("evics-boot-splash");
  var statusEl = document.getElementById("evics-boot-status");
  var pulse = document.getElementById("evicsPulse");

  var state = {
    section: "viral-intelligence",
    loading: true,
    lastSync: null,
    products: [],
    viral: [],
    creatives: [],
    renders: [],
    status: null,
    errors: []
  };

  var sections = [
    { id: "viral-intelligence", label: "Viral Intelligence", desc: "Trend scanning, hook discovery, viral pattern analysis" },
    { id: "ai-reconstruction", label: "AI Reconstruction", desc: "AI-powered creative reconstruction from viral ads" },
    { id: "video-generation", label: "Video Generation", desc: "Video rendering via HeyGen, Runway, and Kling" },
    { id: "media-output", label: "Media Output", desc: "Playback, render routing, QA instructions, and approvals" },
    { id: "distribution", label: "Distribution", desc: "Publishing queue and channel management" },
    { id: "analytics", label: "Analytics", desc: "Performance metrics and learning loop" },
    { id: "executive-workspace", label: "Executive Workspace", desc: "Executive controls, agent orchestration, and gated API access" }
  ];
  var sectionMap = sections.reduce(function (map, section) { map[section.id] = true; return map; }, {});

  function setBootStatus(text) { if (statusEl) statusEl.textContent = text; }
  function hideSplash() { if (splash) splash.style.display = "none"; }
  function resolveSection(rawValue) {
    var value = String(rawValue || "").toLowerCase().trim();
    return sectionMap[value] ? value : sections[0].id;
  }
  function getInitialSection() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (sectionMap[String(hash).toLowerCase()]) return String(hash).toLowerCase();
    if (hash.indexOf("section=") === 0) {
      var fromHashQuery = new URLSearchParams(hash).get("section");
      if (sectionMap[String(fromHashQuery).toLowerCase()]) return String(fromHashQuery).toLowerCase();
    }
    var params = new URLSearchParams(window.location.search || "");
    var fromQuery = params.get("section");
    if (sectionMap[String(fromQuery).toLowerCase()]) return String(fromQuery).toLowerCase();
    return sections[0].id;
  }
  function writeSectionToLocation(sectionId) {
    var url = new URL(window.location.href);
    url.searchParams.set("section", sectionId);
    url.hash = sectionId;
    window.history.replaceState(null, "", url.toString());
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumber(value) {
    var n = Number(value || 0);
    return Number.isFinite(n) ? n.toLocaleString() : "0";
  }

  function formatMoney(value) {
    var n = Number(value || 0);
    if (!Number.isFinite(n)) return "$0.00";
    return "$" + n.toFixed(2);
  }

  function getArray(payload, key) {
    if (!payload || typeof payload !== "object") return [];
    return Array.isArray(payload[key]) ? payload[key] : [];
  }

  function metric(label, value, detail) {
    return "<article class=\"metric\"><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong><small>" + escapeHtml(detail || "") + "</small></article>";
  }

  function fetchJson(endpoint) {
    return fetch(endpoint, { headers: { "Accept": "application/json" }, cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error(endpoint + " returned " + response.status);
        return response.json();
      });
  }

  function captureResult(results, index, label) {
    var result = results[index];
    if (result.status === "fulfilled") return result.value;
    var message = label + ": " + (result.reason && result.reason.message ? result.reason.message : String(result.reason));
    state.errors.push(message);
    return null;
  }

  function loadAll() {
    state.loading = true;
    state.errors = [];
    setBootStatus("Fetching live data...");
    render();

    return Promise.allSettled([
      fetchJson("/api/shopify/synced-products"),
      fetchJson("/api/viral/gallery"),
      fetchJson("/api/creatives"),
      fetchJson("/api/renders"),
      fetchJson("/status")
    ]).then(function (results) {
      var productsPayload = captureResult(results, 0, "Shopify products");
      var viralPayload = captureResult(results, 1, "Viral gallery");
      var creativesPayload = captureResult(results, 2, "Creatives");
      var rendersPayload = captureResult(results, 3, "Renders");
      var statusPayload = captureResult(results, 4, "System status");

      state.products = getArray(productsPayload, "products");
      state.viral = getArray(viralPayload, "videos");
      state.creatives = getArray(creativesPayload, "creatives");
      state.renders = getArray(rendersPayload, "renders");
      state.status = statusPayload || null;
      state.loading = false;
      state.lastSync = new Date();

      if (pulse) pulse.textContent = "Live sync " + state.lastSync.toLocaleTimeString() + " - " + state.products.length + " products";
      render();
      hideSplash();
    }).catch(function (error) {
      state.loading = false;
      state.errors.push(error && error.message ? error.message : String(error));
      render();
      hideSplash();
    });
  }

  function syncMessage() {
    if (state.loading) return "Loading live APIs...";
    if (!state.lastSync) return "Waiting for first sync.";
    return "Last synced " + state.lastSync.toLocaleTimeString();
  }

  function renderErrors() {
    if (!state.errors.length) return "";
    return "<div class=\"safe-alert\"><strong>Some live API checks need attention:</strong><br>" +
      state.errors.map(function (error) { return "<div>" + escapeHtml(error) + "</div>"; }).join("") + "</div>";
  }

  function renderShell(content) {
    var active = sections.filter(function (section) { return section.id === state.section; })[0] || sections[0];
    return "<aside class=\"sidebar\">" +
    "<div class=\"brand\"><div class=\"brand-mark\">EVICS</div><div><strong>I AM GENESIS TECH</strong><span>ELITE VIRAL INTELLIGENCE COMMAND WORKSPACE</span></div></div>" +
      "<nav>" + sections.map(function (section) {
        return "<button data-safe-section=\"" + section.id + "\" class=\"" + (section.id === state.section ? "active" : "") + "\"><div><strong>" + escapeHtml(section.label) + "</strong><small>" + escapeHtml(section.desc) + "</small></div></button>";
      }).join("") + "</nav>" +
      "<div class=\"automation-card\"><span>Workspace posture</span><strong>Live intelligence stack</strong><div class=\"pulse-row\"><i></i><span>Shopify + EVICS APIs active</span></div></div>" +
      "</aside>" +
      "<main><div class=\"topbar\"><div class=\"workspace-hero\"><p class=\"workspace-eyebrow\">EVICS COMMAND WORKSPACE</p><h1>" + escapeHtml(active.label) + "</h1><p>" + escapeHtml(active.desc) + "</p></div>" +
      "<div class=\"top-actions\"><div class=\"safe-toolbar\"><button class=\"ghost\" id=\"safe-refresh\">Refresh Live Data</button><button class=\"ghost\" id=\"safe-legacy\">Legacy Monolith JS (Dev Only)</button></div>" +
      "<div class=\"sync-status connected\"><b>Live sync</b><span>" + escapeHtml(syncMessage()) + "</span></div></div></div>" +
      renderErrors() + content + "</main>";
  }

  function renderViralIntelligence() {
    var topVelocity = state.viral.reduce(function (max, video) {
      var velocity = Number(video && video.velocity || 0);
      return velocity > max ? velocity : max;
    }, 0);
    var productsActive = state.products.filter(function (p) { return String(p.status || "").toLowerCase() === "active"; }).length;
    return renderShell(
      "<section class=\"metrics-grid shell-metrics\">" +
        metric("Viral entries", formatNumber(state.viral.length), "live gallery signals") +
        metric("Top velocity", formatNumber(topVelocity), "best-performing trend") +
        metric("Shopify products", formatNumber(state.products.length), productsActive + " active catalog items") +
      "</section>" +
      "<div class=\"section-content\"><div class=\"safe-grid\">" + renderViralPreview() + renderProductsPreview() + "</div></div>"
    );
  }

  function renderProductsPreview() {
    return "<section class=\"panel\"><div class=\"panel-head compact\"><h2>Newest Shopify Products</h2><span>" + state.products.length + " live</span></div><div class=\"safe-grid\">" + state.products.slice(0, 4).map(productCard).join("") + "</div></section>";
  }

  function renderViralPreview() {
    return "<section class=\"panel\"><div class=\"panel-head compact\"><h2>Viral Intelligence</h2><span>" + state.viral.length + " entries</span></div><div class=\"safe-grid\">" + state.viral.slice(0, 4).map(viralCard).join("") + "</div></section>";
  }

  function renderCreativePreview() {
    return "<section class=\"panel\"><div class=\"panel-head compact\"><h2>Creative Queue</h2><span>" + state.creatives.length + " assets</span></div>" + renderCreativeTable(state.creatives.slice(0, 6)) + "</section>";
  }

  function renderHealthPreview() {
    var status = state.status || {};
    return "<section class=\"panel\"><div class=\"panel-head compact\"><h2>System Status</h2><span>" + escapeHtml(status.status || "checking") + "</span></div>" +
      "<p>Database: <strong class=\"" + (status.database === "ok" ? "safe-ok" : "safe-warn") + "\">" + escapeHtml(status.database || "unknown") + "</strong></p>" +
      "<p>Connected integrations: <strong>" + escapeHtml(status.connected_integrations != null ? status.connected_integrations : "?") + "/" + escapeHtml(status.total_integrations != null ? status.total_integrations : "?") + "</strong></p>" +
      renderIntegrationBadges(status.integrations) + "</section>";
  }

  function productCard(product) {
    return "<article class=\"safe-card\">" +
      (product.image ? "<img class=\"safe-thumb\" src=\"" + escapeHtml(product.image) + "\" alt=\"\" loading=\"lazy\">" : "") +
      "<h3>" + escapeHtml(product.title || product.name || "Untitled product") + "</h3>" +
      "<p>" + escapeHtml(product.category || "Uncategorized") + "</p>" +
      "<small>SKU: " + escapeHtml(product.sku || "n/a") + " | " + formatMoney(product.price) + " | " + escapeHtml(product.status || "unknown") + "</small>" +
      "</article>";
  }

  function viralCard(video) {
    return "<article class=\"safe-card\">" +
      (video.thumbnail_url ? "<img class=\"safe-thumb\" src=\"" + escapeHtml(video.thumbnail_url) + "\" alt=\"\" loading=\"lazy\">" : "") +
      "<h3>" + escapeHtml(video.title || video.hook || "Viral entry") + "</h3>" +
      "<p>" + escapeHtml(video.hook || "No hook captured") + "</p>" +
      "<span class=\"safe-badge\">" + escapeHtml(video.platform || "Unknown") + "</span>" +
      "<span class=\"safe-badge\">Velocity " + escapeHtml(video.velocity || 0) + "</span>" +
      "<small>Source: " + escapeHtml(video.source || "evics") + "</small>" +
      "</article>";
  }

  function renderCreativeTable(items) {
    if (!items.length) return "<p class=\"safe-muted\">No creatives returned yet.</p>";
    return "<table class=\"safe-table\"><thead><tr><th>Product</th><th>Hook</th><th>Status</th><th>Score</th></tr></thead><tbody>" +
      items.map(function (creative) {
        return "<tr><td>" + escapeHtml(creative.product || "n/a") + "</td><td>" + escapeHtml(creative.hook || creative.asset || "n/a") + "</td><td>" + escapeHtml(creative.status || "n/a") + "</td><td>" + escapeHtml(creative.score || "-") + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function renderRenderTable(items) {
    if (!items.length) return "<p class=\"safe-muted\">No renders returned yet.</p>";
    return "<table class=\"safe-table\"><thead><tr><th>Name</th><th>Product</th><th>Platform</th><th>Status</th><th>Grade</th></tr></thead><tbody>" +
      items.map(function (render) {
        return "<tr><td>" + escapeHtml(render.render_name || render.id || "render") + "</td><td>" + escapeHtml(render.product_name || render.sku || "n/a") + "</td><td>" + escapeHtml(render.platform || "n/a") + "</td><td>" + escapeHtml(render.status || render.render_status || "n/a") + "</td><td>" + escapeHtml(render.render_grade || "-") + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function renderIntegrationBadges(integrations) {
    if (!integrations || typeof integrations !== "object") return "";
    return "<div>" + Object.keys(integrations).map(function (key) {
      return "<span class=\"safe-badge\">" + escapeHtml(key) + ": " + (integrations[key] ? "on" : "off") + "</span>";
    }).join("") + "</div>";
  }

  function renderAiReconstruction() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>AI Reconstruction Queue</h2><span>" + state.creatives.length + " assets</span></div>" + renderCreativeTable(state.creatives.slice(0, 120)) + "</section></div>");
  }

  function renderVideoGeneration() {
    var completeRenders = state.renders.filter(function (render) { return String(render.status || render.render_status || "").toLowerCase() === "complete"; }).length;
    return renderShell(
      "<div class=\"section-content\"><section class=\"metrics-grid shell-metrics\">" +
        metric("Render jobs", formatNumber(state.renders.length), "live generation queue") +
        metric("Completed", formatNumber(completeRenders), "ready for output routing") +
        metric("Creative inputs", formatNumber(state.creatives.length), "available reconstruction assets") +
      "</section><section class=\"panel\"><div class=\"panel-head compact\"><h2>Video Generation Jobs</h2><span>live</span></div>" +
      "<p><a href=\"/viral-media\" target=\"_self\">Open Viral Media Render Queue</a></p>" +
      renderRenderTable(state.renders.slice(0, 120)) + "</section></div>"
    );
  }

  function renderMediaOutput() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>Media Output Routing</h2><span>" + state.renders.length + " render jobs</span></div><p><a href=\"/viral-media?section=media-output\" target=\"_self\">Open Viral Media \u2192 Media Output</a></p>" + renderRenderTable(state.renders.slice(0, 120)) + "</section></div>");
  }

  function renderDistribution() {
    var status = state.status || {};
    return renderShell("<div class=\"section-content\"><section class=\"metrics-grid shell-metrics\">" +
      metric("Publishing queue", "Live status only", "distribution API unavailable in safe shell") +
      metric("Render-ready assets", formatNumber(state.renders.length), "source for channel pushes") +
      metric("Connected integrations", escapeHtml(status.connected_integrations != null ? status.connected_integrations : "?") + "/" + escapeHtml(status.total_integrations != null ? status.total_integrations : "?"), "channel readiness signal") +
      "</section><section class=\"panel\"><div class=\"panel-head compact\"><h2>Channel Readiness</h2><span>live</span></div><p>Distribution controls remain gated to avoid unsafe mutations in this stable shell.</p>" + renderIntegrationBadges(status.integrations) + "</section></div>");
  }

  function renderAnalytics() {
    var status = state.status || {};
    var services = status.services || {};
    return renderShell("<div class=\"section-content\"><section class=\"metrics-grid shell-metrics\">" +
      metric("System", status.status || "checking", "version " + (status.version || "unknown")) +
      metric("Database", status.database || "unknown", "Supabase") +
      metric("Shopify", status.shopify || "unknown", "catalog source") +
      metric("Routes", status.routes && status.routes.total ? status.routes.total : "?", "backend endpoints") +
      "</section><section class=\"panel\"><div class=\"panel-head compact\"><h2>Integrations</h2><span>" + escapeHtml(status.connected_integrations || 0) + " connected</span></div>" + renderIntegrationBadges(status.integrations) + "</section>" +
      "<section class=\"panel\"><div class=\"panel-head compact\"><h2>Service Checks</h2><span>live</span></div><pre style=\"white-space:pre-wrap;color:var(--text-sub);\">" + escapeHtml(JSON.stringify(services, null, 2)) + "</pre></section></div>");
  }

  function renderExecutiveWorkspace() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>Executive Launchpad</h2><span>cross-workspace</span></div><div class=\"safe-grid\">" +
      "<article class=\"safe-card\"><h3>Viral Media</h3><p>Creative review and media output control.</p><small><a href=\"/viral-media\" target=\"_self\">Open Viral Media Workspace</a></small></article>" +
      "<article class=\"safe-card\"><h3>Affiliate Hub</h3><p>Partner operations and campaign readiness.</p><small><a href=\"/affiliate\" target=\"_self\">Open Affiliate Hub</a></small></article>" +
      "<article class=\"safe-card\"><h3>Phone App</h3><p>Mobile execution and notifications.</p><small><a href=\"/phone-app\" target=\"_self\">Open Phone App</a></small></article>" +
      "<article class=\"safe-card\"><h3>AdminHub</h3><p>Affiliate administration and governance.</p><small><a href=\"/admin-hub\" target=\"_self\">Open AdminHub</a></small></article>" +
      "<article class=\"safe-card\"><h3>SEO Grader</h3><p>Discoverability scoring and optimization.</p><small><a href=\"/discoverability\" target=\"_self\">Open SEO Grader</a></small></article>" +
      "</div></section></div>");
  }

  function render() {
    if (!app) return;
    if (state.loading && !state.lastSync) {
      app.innerHTML = renderShell("<section class=\"metrics-grid shell-metrics\">" + metric("Status", "Loading", "Fetching live APIs") + metric("Mode", "Stable EVICS Shell", "monolith bypassed") + metric("Source", "Shopify + EVICS", "live data mode") + "</section>");
      return;
    }
    if (state.section === "ai-reconstruction") app.innerHTML = renderAiReconstruction();
    else if (state.section === "video-generation") app.innerHTML = renderVideoGeneration();
    else if (state.section === "media-output") app.innerHTML = renderMediaOutput();
    else if (state.section === "distribution") app.innerHTML = renderDistribution();
    else if (state.section === "analytics") app.innerHTML = renderAnalytics();
    else if (state.section === "executive-workspace") app.innerHTML = renderExecutiveWorkspace();
    else app.innerHTML = renderViralIntelligence();
  }

  document.addEventListener("click", function (event) {
    var sectionButton = event.target.closest("[data-safe-section]");
    if (sectionButton) {
      state.section = resolveSection(sectionButton.getAttribute("data-safe-section"));
      writeSectionToLocation(state.section);
      render();
      return;
    }
    if (event.target.closest("#safe-refresh")) {
      loadAll();
      return;
    }
    if (event.target.closest("#safe-legacy")) {
      var confirmed = window.confirm("Developer-only legacy monolith JavaScript view. It may freeze the tab. Continue?");
      if (confirmed) window.open("/app.js", "_blank", "noopener");
    }
  });

  window.addEventListener("hashchange", function () {
    state.section = getInitialSection();
    render();
  });

  state.section = getInitialSection();
  writeSectionToLocation(state.section);
  setBootStatus("Mounting EVICS workspace shell...");
  render();
  hideSplash();
  loadAll();
  setInterval(function () {
    if (pulse && state.lastSync) pulse.textContent = "Live sync " + state.lastSync.toLocaleTimeString() + " - " + state.products.length + " products";
  }, 30000);
})();
