// Media Output Center: live EVICS / EVIE dashboard module backed by Express/Supabase endpoints.
(function () {
  const PREVIEW_PRESETS = {
    original: { key: "original", label: "Original", width: 1920, height: 1080, safe: false },
    tiktok: { key: "tiktok", label: "TikTok", width: 1080, height: 1920, safe: true },
    instagramReel: { key: "instagramReel", label: "Instagram Reel", width: 1440, height: 2560, safe: true },
    facebookReel: { key: "facebookReel", label: "Facebook Reel", width: 1080, height: 1920, safe: true },
    facebookFeed: { key: "facebookFeed", label: "Facebook Feed", width: 1080, height: 1350, safe: true },
    instagramFeed: { key: "instagramFeed", label: "Instagram Feed", width: 1440, height: 1880, safe: true },
    youtubeHorizontal: { key: "youtubeHorizontal", label: "YouTube Horizontal", width: 1920, height: 1080, safe: true },
    youtubeShorts: { key: "youtubeShorts", label: "YouTube Shorts", width: 1080, height: 1920, safe: true },
    pinterest23: { key: "pinterest23", label: "Pinterest 2:3", width: 1000, height: 1500, safe: true },
    pinterest916: { key: "pinterest916", label: "Pinterest 9:16", width: 1080, height: 1920, safe: true },
    xLandscape: { key: "xLandscape", label: "X Landscape", width: 1280, height: 720, safe: true },
    xPortrait: { key: "xPortrait", label: "X Portrait", width: 720, height: 1280, safe: true },
    xSquare: { key: "xSquare", label: "X Square", width: 720, height: 720, safe: true },
    googleAdsHorizontal: { key: "googleAdsHorizontal", label: "Google Ads Horizontal", width: 1920, height: 1080, safe: true },
    googleAdsVertical: { key: "googleAdsVertical", label: "Google Ads Vertical", width: 1080, height: 1920, safe: true },
    googleAdsSquare: { key: "googleAdsSquare", label: "Google Ads Square", width: 1080, height: 1080, safe: true }
  };

  const SAFE_ZONES = {
    original: { top: 4, right: 4, bottom: 4, left: 4 },
    tiktok: { top: 12, right: 16, bottom: 22, left: 10 },
    instagramReel: { top: 10, right: 12, bottom: 20, left: 10 },
    facebookReel: { top: 10, right: 14, bottom: 18, left: 10 },
    facebookFeed: { top: 8, right: 8, bottom: 10, left: 8 },
    instagramFeed: { top: 8, right: 8, bottom: 12, left: 8 },
    youtubeHorizontal: { top: 6, right: 6, bottom: 10, left: 6 },
    youtubeShorts: { top: 10, right: 12, bottom: 20, left: 10 },
    pinterest23: { top: 8, right: 8, bottom: 10, left: 8 },
    pinterest916: { top: 12, right: 12, bottom: 18, left: 10 },
    xLandscape: { top: 6, right: 6, bottom: 8, left: 6 },
    xPortrait: { top: 10, right: 10, bottom: 14, left: 10 },
    xSquare: { top: 8, right: 8, bottom: 8, left: 8 },
    googleAdsHorizontal: { top: 6, right: 6, bottom: 8, left: 6 },
    googleAdsVertical: { top: 12, right: 12, bottom: 18, left: 10 },
    googleAdsSquare: { top: 8, right: 8, bottom: 8, left: 8 }
  };

  const renderActions = [
    ["renderMaster", "Render Master"],
    ["renderSelectedPreset", "Render Selected Preset"],
    ["renderAllEnabledPresets", "Render All Enabled Presets"],
    ["rerenderCurrentOutput", "Re-render Current Output"]
  ];

  const routeActions = [
    ["routeToTikTok", "Route to TikTok"],
    ["routeToInstagram", "Route to Instagram"],
    ["routeToFacebook", "Route to Facebook"],
    ["routeToYouTube", "Route to YouTube"],
    ["routeToPinterest", "Route to Pinterest"],
    ["routeToX", "Route to X"],
    ["routeToGoogleAds", "Route to Google Ads"],
    ["rerouteFailedDispatch", "Reroute Failed Dispatch"]
  ];

  const variantActions = [
    ["duplicateAsNewVariant", "Duplicate as New Variant"],
    ["archiveVariant", "Archive Variant"],
    ["sendToManualReview", "Send to Manual Review"]
  ];

  const mocState = {
    items: [],
    loading: false,
    error: null,
    selectedId: null,
    search: "",
    mediaType: "All",
    status: "All",
    provider: "All",
    preset: "original",
    fitMode: "contain",
    muted: true,
    loop: false,
    safeZones: true,
    actionStatus: null,
    qa: {}
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function selectorEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function unique(items, getter) {
    return ["All", ...new Set(items.map(getter).filter(Boolean))];
  }

  function selectedItem() {
    return mocState.items.find((item) => item.id === mocState.selectedId) || mocState.items[0] || null;
  }

  function itemSource(item) {
    return item?.playbackUrl || item?.previewUrl || item?.posterUrl || "";
  }

  function filteredItems() {
    const query = mocState.search.trim().toLowerCase();
    return mocState.items.filter((item) => {
      const searchText = [
        item.title,
        item.mediaType,
        item.status,
        item.sourceProvider,
        item.providerPackage,
        ...(item.tags || [])
      ].join(" ").toLowerCase();
      return (!query || searchText.includes(query))
        && (mocState.mediaType === "All" || item.mediaType === mocState.mediaType)
        && (mocState.status === "All" || item.status === mocState.status)
        && (mocState.provider === "All" || item.sourceProvider === mocState.provider);
    });
  }

  async function apiJson(url, options) {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }
    return payload;
  }

  async function loadMediaOutputs() {
    mocState.loading = true;
    mocState.error = null;
    render();
    try {
      const payload = await apiJson("/api/media-output/outputs");
      mocState.items = payload.items || [];
      if (!mocState.selectedId && mocState.items[0]) mocState.selectedId = mocState.items[0].id;
      if (mocState.selectedId && !mocState.items.some((item) => item.id === mocState.selectedId)) {
        mocState.selectedId = mocState.items[0]?.id || null;
      }
    } catch (error) {
      mocState.error = error.message;
    } finally {
      mocState.loading = false;
      render();
    }
  }

  async function runOutputAction(action, id) {
    const item = mocState.items.find((entry) => entry.id === id);
    if (!item) return;
    mocState.actionStatus = { type: "info", message: `${action} queued...` };
    render();
    try {
      const payload = await apiJson(`/api/media-output/outputs/${encodeURIComponent(id)}/actions`, {
        method: "POST",
        body: JSON.stringify({ action, outputId: id })
      });
      if (payload.item) {
        mocState.items = mocState.items.map((entry) => entry.id === payload.item.id ? payload.item : entry);
      }
      mocState.actionStatus = { type: "success", message: payload.message || `${action} complete.` };
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
    }
    render();
  }

  async function runRenderRouteAction(action, id) {
    const item = mocState.items.find((entry) => entry.id === id);
    if (!item) return;
    mocState.actionStatus = { type: "info", message: `${action} submitted...` };
    render();
    try {
      const payload = await apiJson(`/api/media-output/outputs/${encodeURIComponent(id)}/render-route`, {
        method: "POST",
        body: JSON.stringify({
          action,
          outputId: id,
          context: { presetKey: mocState.preset, qa: mocState.qa[id] || {} }
        })
      });
      if (payload.item) {
        mocState.items = mocState.items.map((entry) => entry.id === payload.item.id ? payload.item : entry);
      }
      mocState.actionStatus = { type: "success", message: payload.message || `${action} submitted.` };
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
    }
    render();
  }

  async function saveQa(id) {
    mocState.actionStatus = { type: "info", message: "Saving QA instructions..." };
    render();
    try {
      await apiJson(`/api/media-output/outputs/${encodeURIComponent(id)}/qa`, {
        method: "POST",
        body: JSON.stringify({ outputId: id, qa: mocState.qa[id] || {} })
      });
      mocState.actionStatus = { type: "success", message: "QA instructions saved." };
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
    }
    render();
  }

  function render() {
    if (window.state && window.state.currentSection === "media-output" && typeof window.render === "function") {
      window.render();
    }
  }

  function renderCard(item) {
    const selected = item.id === mocState.selectedId ? "selected" : "";
    const routeSummary = (item.platformRoutes || []).slice(0, 3).map((route) => `${route.platform}: ${route.routeState}`).join(" | ");
    return `
      <article class="moc-card ${selected}" role="button" tabindex="0" data-moc-select="${escapeHtml(item.id)}">
        <div class="moc-card-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="moc-chip">${escapeHtml(item.mediaType)}</span>
        </div>
        <div class="moc-muted">${escapeHtml(item.sourceProvider || "EVICS")} ${item.providerPackage ? " / " + escapeHtml(item.providerPackage) : ""}</div>
        <div class="moc-chip-row">
          <span class="moc-chip ${item.status === "approved" ? "good" : item.status === "failed" ? "bad" : "warn"}">${escapeHtml(item.status || "pending")}</span>
          <span class="moc-chip">${escapeHtml(item.renderState || "not rendered")}</span>
          <span class="moc-chip">${Number(item.readinessScore || 0)}%</span>
        </div>
        ${routeSummary ? `<div class="moc-muted">${escapeHtml(routeSummary)}</div>` : ""}
        <div class="moc-button-row">
          ${["approve", "quality", "queue", "publish", "render", "reject", "archive"].map((action) => `
            <button class="moc-btn" data-moc-action="${action}" data-moc-id="${escapeHtml(item.id)}">${action}</button>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderSafeZone() {
    const preset = PREVIEW_PRESETS[mocState.preset];
    const zone = SAFE_ZONES[mocState.preset];
    if (!mocState.safeZones || !preset?.safe || !zone) return "";
    return `
      <div class="moc-safe-zone">
        <div class="moc-safe-zone-inner" style="top:${zone.top}%;right:${zone.right}%;bottom:${zone.bottom}%;left:${zone.left}%"></div>
      </div>
    `;
  }

  function renderPreview(item) {
    const preset = PREVIEW_PRESETS[mocState.preset] || PREVIEW_PRESETS.original;
    const source = itemSource(item);
    const aspect = preset.key === "original" && item.width && item.height
      ? `${item.width} / ${item.height}`
      : `${preset.width} / ${preset.height}`;
    if (!source) {
      return `<div class="moc-frame" style="aspect-ratio:${aspect}"><div class="moc-empty">No storage-backed playback URL is attached yet.</div></div>`;
    }
    const mediaClass = `moc-fit-${mocState.fitMode}`;
    const ctaHref = item.productUrl || "";
    const ctaText = item.ctaText || "Buy Now";
    const ctaWindow = Number(item.ctaStartOffsetSeconds || 9);
    const media = item.mediaType === "image"
      ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(item.title)}" class="${mediaClass}" />`
      : `<video src="${escapeHtml(source)}" poster="${escapeHtml(item.posterUrl || "")}" class="${mediaClass}" controls playsinline data-moc-video="${escapeHtml(item.id)}" data-moc-cta-window="${ctaWindow}" ${mocState.muted ? "muted" : ""} ${mocState.loop ? "loop" : ""}></video>`;
    const cta = ctaHref
      ? `<a class="moc-buy-now" data-moc-buy-now="${escapeHtml(item.id)}" href="${escapeHtml(ctaHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaText)}</a>`
      : "";
    return `<div class="moc-frame" style="aspect-ratio:${aspect}">${media}${cta}${renderSafeZone()}</div>`;
  }

  function renderActionBar(item) {
    const group = (title, actions) => `
      <div class="moc-action-group">
        <b>${title}</b>
        <div class="moc-button-row">
          ${actions.map(([action, label]) => `<button class="moc-btn ${action === "renderMaster" ? "primary" : action === "archiveVariant" ? "danger" : ""}" data-moc-render-route="${action}" data-moc-id="${escapeHtml(item.id)}">${label}</button>`).join("")}
        </div>
      </div>
    `;
    return `
      <div class="moc-action-bar">
        <div class="moc-card-head">
          <div><h3>Render + Route</h3><div class="moc-muted">Current preset: ${escapeHtml(PREVIEW_PRESETS[mocState.preset].label)}</div></div>
          <span class="moc-chip ${item.renderState === "failed" ? "bad" : "good"}">${escapeHtml(item.renderState || "queued")}</span>
        </div>
        <div class="moc-action-groups">
          ${group("Render", renderActions)}
          ${group("Route", routeActions)}
          ${group("Variant", variantActions)}
        </div>
      </div>
    `;
  }

  function renderMetadata(item) {
    const cells = [
      ["Resolution", item.width && item.height ? `${item.width} x ${item.height}` : "n/a"],
      ["Duration", item.duration ? `${item.duration}s` : "n/a"],
      ["Provider", item.sourceProvider || "EVICS"],
      ["Render State", item.renderState || "pending"],
      ["Storage", item.storageLifecycle || "active"],
      ["Migration", item.migrationState || "none"],
      ["Readiness", `${Number(item.readinessScore || 0)}%`],
      ["Approval", item.approvedState || item.status || "pending"]
    ];
    return `<div class="moc-meta-grid">${cells.map(([label, value]) => `<div class="moc-meta-cell"><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join("")}</div>`;
  }

  function renderQa(item) {
    const qa = mocState.qa[item.id] || {};
    const checklist = ["Has audio", "Correct aspect", "No crop issues", "Safe-zone clean", "Ready to publish"];
    return `
      <div class="moc-qa-panel">
        <div class="moc-card-head">
          <h3>Edit + QA</h3>
          <button class="moc-btn primary" data-moc-save-qa="${escapeHtml(item.id)}">Save QA</button>
        </div>
        <div class="moc-qa-grid">
          <input data-moc-qa="${item.id}:trimStart" placeholder="Trim start" value="${escapeHtml(qa.trimStart || "")}" />
          <input data-moc-qa="${item.id}:trimEnd" placeholder="Trim end" value="${escapeHtml(qa.trimEnd || "")}" />
          <input data-moc-qa="${item.id}:posterFrame" placeholder="Poster frame time" value="${escapeHtml(qa.posterFrame || "")}" />
          <select data-moc-qa="${item.id}:fillMode">
            ${["blur fill", "solid fill", "black", "brand color"].map((mode) => `<option ${qa.fillMode === mode ? "selected" : ""}>${mode}</option>`).join("")}
          </select>
          <input data-moc-qa="${item.id}:ctaText" placeholder="CTA text preview" value="${escapeHtml(qa.ctaText || "")}" />
          <input data-moc-qa="${item.id}:buyNowText" placeholder="Buy Now text preview" value="${escapeHtml(qa.buyNowText || "")}" />
          <input data-moc-qa="${item.id}:messageText" placeholder="Message preview" value="${escapeHtml(qa.messageText || "")}" />
          <label class="moc-chip"><input type="checkbox" data-moc-qa="${item.id}:captions" ${qa.captions ? "checked" : ""} /> Captions</label>
        </div>
        <div class="moc-check-grid">
          ${checklist.map((label) => {
            const key = label.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_m, chr) => chr.toUpperCase());
            return `<label>${label}<input type="checkbox" data-moc-qa="${item.id}:${key}" ${qa[key] ? "checked" : ""} /></label>`;
          }).join("")}
        </div>
        <textarea class="moc-qa-notes" data-moc-qa="${item.id}:notes" placeholder="Internal reviewer notes">${escapeHtml(qa.notes || "")}</textarea>
        <div class="moc-button-row">
          <button class="moc-btn danger" data-moc-render-route="sendToManualReview" data-moc-id="${escapeHtml(item.id)}">Flag issue / manual review</button>
        </div>
      </div>
    `;
  }

  function renderMediaOutputCenter() {
    const items = filteredItems();
    const item = selectedItem();
    const statuses = unique(mocState.items, (entry) => entry.status);
    const providers = unique(mocState.items, (entry) => entry.sourceProvider);
    const types = unique(mocState.items, (entry) => entry.mediaType);
    return `
      <div class="moc-shell">
        <div class="section-intro">
          <h2>Media Output Center</h2>
          <p>Storage-backed playback, QA instructions, render jobs, platform routing, and approval workflow for EVICS / EVIE media outputs.</p>
        </div>
        <div class="moc-toolbar">
          <div>
            <h2>Live Output Workstation</h2>
            <p>${mocState.loading ? "Syncing live media records..." : `${mocState.items.length} live output records loaded`}</p>
          </div>
          <div class="moc-toolbar-actions">
            ${mocState.actionStatus ? `<span class="moc-chip ${mocState.actionStatus.type === "bad" ? "bad" : mocState.actionStatus.type === "success" ? "good" : "warn"}">${escapeHtml(mocState.actionStatus.message)}</span>` : ""}
            <button class="moc-btn primary" id="moc-refresh">Refresh outputs</button>
          </div>
        </div>
        ${mocState.error ? `<div class="moc-error">${escapeHtml(mocState.error)}</div>` : ""}
        <div class="moc-grid">
          <div class="moc-panel">
            <div class="moc-filter-row">
              <label>Search<input id="moc-search" value="${escapeHtml(mocState.search)}" placeholder="Output, provider, tag" /></label>
              <label>Type<select id="moc-type">${types.map((type) => `<option ${mocState.mediaType === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}</select></label>
              <label>Status<select id="moc-status">${statuses.map((status) => `<option ${mocState.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select></label>
              <label>Provider<select id="moc-provider">${providers.map((provider) => `<option ${mocState.provider === provider ? "selected" : ""}>${escapeHtml(provider)}</option>`).join("")}</select></label>
            </div>
            <div class="moc-list">
              ${mocState.loading && !mocState.items.length ? `<div class="moc-empty">Loading live media outputs...</div>` : ""}
              ${items.length ? items.map(renderCard).join("") : `<div class="moc-empty">No outputs match the current filters.</div>`}
            </div>
          </div>
          <div class="moc-panel">
            ${item ? `
              <div class="moc-card-head">
                <div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <div class="moc-chip-row">
                    <span class="moc-chip good">${escapeHtml(item.sourceProvider || "EVICS")}</span>
                    <span class="moc-chip">${escapeHtml(item.status || "pending")}</span>
                    <span class="moc-chip">${escapeHtml(item.mediaType)}</span>
                  </div>
                </div>
                <div class="moc-filter-row">
                  <label>Preset<select id="moc-preset">${Object.values(PREVIEW_PRESETS).map((preset) => `<option value="${preset.key}" ${mocState.preset === preset.key ? "selected" : ""}>${preset.label}</option>`).join("")}</select></label>
                  <label>Fit<select id="moc-fit">${["contain", "cover", "actual"].map((fit) => `<option ${mocState.fitMode === fit ? "selected" : ""}>${fit}</option>`).join("")}</select></label>
                </div>
              </div>
              <div class="moc-button-row">
                <button class="moc-btn" id="moc-mute">${mocState.muted ? "Unmute" : "Mute"}</button>
                <button class="moc-btn" id="moc-loop">${mocState.loop ? "Loop on" : "Loop off"}</button>
                <button class="moc-btn" id="moc-safe">${mocState.safeZones ? "Safe zones on" : "Safe zones off"}</button>
              </div>
              <div class="moc-player-stage">${renderPreview(item)}</div>
              ${renderActionBar(item)}
              ${renderMetadata(item)}
              ${renderQa(item)}
            ` : `<div class="moc-empty">Select an output to open playback, render routing, metadata, and QA.</div>`}
          </div>
        </div>
      </div>
    `;
  }

  function bindMediaOutputCenter() {
    const refresh = document.getElementById("moc-refresh");
    if (refresh) refresh.addEventListener("click", loadMediaOutputs);
    const search = document.getElementById("moc-search");
    if (search) search.addEventListener("input", () => { mocState.search = search.value; render(); });
    [["moc-type", "mediaType"], ["moc-status", "status"], ["moc-provider", "provider"], ["moc-preset", "preset"], ["moc-fit", "fitMode"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => { mocState[key] = el.value; render(); });
    });
    [["moc-mute", "muted"], ["moc-loop", "loop"], ["moc-safe", "safeZones"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => { mocState[key] = !mocState[key]; render(); });
    });
    document.querySelectorAll("[data-moc-select]").forEach((button) => {
      button.addEventListener("click", () => { mocState.selectedId = button.dataset.mocSelect; mocState.actionStatus = null; render(); });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          mocState.selectedId = button.dataset.mocSelect;
          mocState.actionStatus = null;
          render();
        }
      });
    });
    document.querySelectorAll("[data-moc-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        runOutputAction(button.dataset.mocAction, button.dataset.mocId);
      });
    });
    document.querySelectorAll("[data-moc-render-route]").forEach((button) => {
      button.addEventListener("click", () => runRenderRouteAction(button.dataset.mocRenderRoute, button.dataset.mocId));
    });
    document.querySelectorAll("[data-moc-qa]").forEach((input) => {
      input.addEventListener("change", () => {
        const [id, key] = input.dataset.mocQa.split(":");
        mocState.qa[id] = mocState.qa[id] || {};
        mocState.qa[id][key] = input.type === "checkbox" ? input.checked : input.value;
      });
    });
    document.querySelectorAll("[data-moc-save-qa]").forEach((button) => {
      button.addEventListener("click", () => saveQa(button.dataset.mocSaveQa));
    });
    bindBuyNowCtaTiming();
  }

  function bindBuyNowCtaTiming() {
    document.querySelectorAll("[data-moc-video]").forEach((video) => {
      const id = video.dataset.mocVideo;
      const cta = document.querySelector(`[data-moc-buy-now="${selectorEscape(id)}"]`);
      if (!cta) return;
      const ctaWindow = Math.max(8, Math.min(10, Number(video.dataset.mocCtaWindow) || 9));
      const syncCta = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const startsAt = duration > ctaWindow ? duration - ctaWindow : Math.max(0, duration * 0.72);
        const visible = duration > 0 && video.currentTime >= startsAt;
        cta.classList.toggle("visible", visible);
      };
      video.addEventListener("loadedmetadata", syncCta);
      video.addEventListener("timeupdate", syncCta);
      video.addEventListener("ended", () => cta.classList.add("visible"));
      syncCta();
    });
  }

  window.renderMediaOutputCenter = renderMediaOutputCenter;
  window.bindMediaOutputCenter = bindMediaOutputCenter;
  window.loadMediaOutputs = loadMediaOutputs;
})();
