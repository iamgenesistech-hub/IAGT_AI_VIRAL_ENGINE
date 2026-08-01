(function () {
  "use strict";

  var app = document.getElementById("app");
  var splash = document.getElementById("evics-boot-splash");
  var statusEl = document.getElementById("evics-boot-status");
  var pulse = document.getElementById("evicsPulse");

  var state = {
    section: "overview",
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
    { id: "overview", label: "Overview", desc: "Live command summary" },
    { id: "products", label: "Products", desc: "Shopify catalog" },
    { id: "viral", label: "Viral Intelligence", desc: "Viral video memory" },
    { id: "creatives", label: "Creatives", desc: "Generated assets" },
    { id: "renders", label: "Renders", desc: "Media output queue" },
    { id: "health", label: "System Health", desc: "API status" }
  ];

  function setBootStatus(text) { if (statusEl) statusEl.textContent = text; }
  function hideSplash() { if (splash) splash.style.display = "none"; }

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
      "<div class=\"brand\"><div class=\"brand-mark\">EVICS</div><div><strong>I AM GENESIS TECH</strong><span>LIVE COMMAND WORKSPACE</span></div></div>" +
      "<nav>" + sections.map(function (section) {
        return "<button data-safe-section=\"" + section.id + "\" class=\"" + (section.id === state.section ? "active" : "") + "\"><div><strong>" + escapeHtml(section.label) + "</strong><small>" + escapeHtml(section.desc) + "</small></div></button>";
      }).join("") + "</nav>" +
      "<div class=\"automation-card\"><span>Workspace posture</span><strong>Live intelligence stack</strong><div class=\"pulse-row\"><i></i><span>Shopify + EVICS APIs active</span></div></div>" +
      "</aside>" +
      "<main><div class=\"topbar\"><div class=\"workspace-hero\"><p class=\"workspace-eyebrow\">SAFE LIVE WORKSPACE</p><h1>" + escapeHtml(active.label) + "</h1><p>" + escapeHtml(active.desc) + "</p></div>" +
      "<div class=\"top-actions\"><div class=\"safe-toolbar\"><button class=\"ghost\" id=\"safe-refresh\">Refresh Live Data</button><button class=\"ghost\" id=\"safe-legacy\">Open Legacy Workspace</button></div>" +
      "<div class=\"sync-status connected\"><b>Live sync</b><span>" + escapeHtml(syncMessage()) + "</span></div></div></div>" +
      renderErrors() + content + "</main>";
  }

  function renderOverview() {
    var connected = state.status && state.status.connected_integrations;
    var total = state.status && state.status.total_integrations;
    var productsActive = state.products.filter(function (p) { return String(p.status || "").toLowerCase() === "active"; }).length;
    var completeRenders = state.renders.filter(function (r) { return String(r.status || r.render_status || "").toLowerCase() === "complete"; }).length;

    return renderShell(
      "<section class=\"metrics-grid shell-metrics\">" +
        metric("Source", "Live", "Shopify + EVICS APIs") +
        metric("Products", formatNumber(state.products.length), productsActive + " active") +
        metric("Viral videos", formatNumber(state.viral.length), "live gallery entries") +
        metric("Creatives", formatNumber(state.creatives.length), "generated assets") +
        metric("Renders", formatNumber(state.renders.length), completeRenders + " complete") +
        metric("Integrations", connected != null ? connected + "/" + total : "Checking", state.status ? state.status.status : "loading") +
      "</section>" +
      "<div class=\"section-content\"><div class=\"safe-grid\">" + renderProductsPreview() + renderViralPreview() + renderCreativePreview() + renderHealthPreview() + "</div></div>"
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

  function renderProducts() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>Shopify Catalog</h2><span>" + state.products.length + " products</span></div><div class=\"safe-grid\">" + state.products.slice(0, 60).map(productCard).join("") + "</div></section></div>");
  }

  function renderViral() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>Viral Gallery</h2><span>" + state.viral.length + " videos</span></div><div class=\"safe-grid\">" + state.viral.slice(0, 60).map(viralCard).join("") + "</div></section></div>");
  }

  function renderCreatives() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>Generated Creatives</h2><span>" + state.creatives.length + " assets</span></div>" + renderCreativeTable(state.creatives.slice(0, 100)) + "</section></div>");
  }

  function renderRenders() {
    return renderShell("<div class=\"section-content\"><section class=\"panel\"><div class=\"panel-head compact\"><h2>Media Renders</h2><span>" + state.renders.length + " jobs</span></div>" + renderRenderTable(state.renders.slice(0, 100)) + "</section></div>");
  }

  function renderHealth() {
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

  function render() {
    if (!app) return;
    if (state.loading && !state.lastSync) {
      app.innerHTML = renderShell("<section class=\"metrics-grid shell-metrics\">" + metric("Status", "Loading", "Fetching live APIs") + metric("Mode", "Safe Live Shell", "monolith bypassed") + metric("Source", "Shopify + EVICS", "not demo mode") + "</section>");
      return;
    }
    if (state.section === "products") app.innerHTML = renderProducts();
    else if (state.section === "viral") app.innerHTML = renderViral();
    else if (state.section === "creatives") app.innerHTML = renderCreatives();
    else if (state.section === "renders") app.innerHTML = renderRenders();
    else if (state.section === "health") app.innerHTML = renderHealth();
    else app.innerHTML = renderOverview();
  }

  document.addEventListener("click", function (event) {
    var sectionButton = event.target.closest("[data-safe-section]");
    if (sectionButton) {
      state.section = sectionButton.getAttribute("data-safe-section") || "overview";
      render();
      return;
    }
    if (event.target.closest("#safe-refresh")) {
      loadAll();
      return;
    }
    if (event.target.closest("#safe-legacy")) {
      var confirmed = window.confirm("The legacy workspace currently freezes this tab. Open app.js anyway in a new tab?");
      if (confirmed) window.open("/app.js", "_blank", "noopener");
    }
  });

  setBootStatus("Mounting safe live workspace...");
  render();
  hideSplash();
  loadAll();
  setInterval(function () {
    if (pulse && state.lastSync) pulse.textContent = "Live sync " + state.lastSync.toLocaleTimeString() + " - " + state.products.length + " products";
  }, 30000);
})();
