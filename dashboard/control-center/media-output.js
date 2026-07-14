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
    qa: {},
    assetEdits: {},
    controlStates: {},
    controlTimers: {}
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
    return item?.playbackUrl || item?.previewUrl || item?.storageUrl || item?.posterUrl || "";
  }

  function storageRecallUrl(item) {
    return item?.storageUrl || "";
  }

  function openMediaUrl(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function controlStateClass(state) {
    if (state === "running") return "state-running";
    if (state === "completed") return "state-completed";
    return "state-off";
  }

  function deriveControlKey(el, index = 0) {
    if (!el) return "";
    if (el.id) return `id:${el.id}`;
    if (el.dataset.mocAction) return `action:${el.dataset.mocId || "global"}:${el.dataset.mocAction}`;
    if (el.dataset.mocRenderRoute) return `route:${el.dataset.mocId || "global"}:${el.dataset.mocRenderRoute}`;
    if (el.dataset.mocSaveQa) return `save-qa:${el.dataset.mocSaveQa}`;
    if (el.dataset.mocSaveAsset) return `save-asset:${el.dataset.mocSaveAsset}`;
    if (el.dataset.mocResetAsset) return `reset-asset:${el.dataset.mocResetAsset}`;
    if (el.dataset.mocSelect) return `select:${el.dataset.mocSelect}`;
    if (el.dataset.mocOpenContext || el.dataset.mocOpenUrl) {
      return `open:${el.dataset.mocId || "global"}:${el.dataset.mocOpenContext || "url"}`;
    }
    if (el.dataset.mocQa) return `qa:${el.dataset.mocQa}`;
    if (el.dataset.mocAsset) return `asset:${el.dataset.mocAsset}`;
    const text = String(el.textContent || el.value || "control").trim().toLowerCase().replace(/\s+/g, "-");
    return `inline:${text || "control"}:${index}`;
  }

  function applyControlStateClass(el, state) {
    if (!el) return;
    const className = controlStateClass(state);
    el.classList.remove("state-running", "state-completed", "state-off");
    el.classList.add(className);
    if (el.tagName === "SELECT") {
      el.classList.add("moc-control-select");
    } else {
      el.classList.add("moc-control");
    }
  }

  function setControlState(target, state, autoOffMs = 0) {
    const key = typeof target === "string" ? target : target?.dataset?.mocControl;
    if (!key) return;
    mocState.controlStates[key] = state;
    if (mocState.controlTimers[key]) {
      clearTimeout(mocState.controlTimers[key]);
      delete mocState.controlTimers[key];
    }
    document.querySelectorAll(`[data-moc-control="${selectorEscape(key)}"]`).forEach((el) => {
      applyControlStateClass(el, state);
    });
    if (autoOffMs > 0) {
      mocState.controlTimers[key] = setTimeout(() => {
        mocState.controlStates[key] = "off";
        document.querySelectorAll(`[data-moc-control="${selectorEscape(key)}"]`).forEach((el) => {
          applyControlStateClass(el, "off");
        });
      }, autoOffMs);
    }
  }

  function registerControlStates() {
    const controls = document.querySelectorAll(".moc-shell .moc-btn, .moc-shell select");
    controls.forEach((el, index) => {
      if (!el.dataset.mocControl) {
        el.dataset.mocControl = deriveControlKey(el, index);
      }
      const existing = mocState.controlStates[el.dataset.mocControl];
      applyControlStateClass(el, existing || "off");
    });
  }

  async function trackTelemetry(action, itemId, payload = {}) {
    try {
      await apiJson("/api/media-output/telemetry", {
        method: "POST",
        body: JSON.stringify({
          action,
          outputId: itemId || null,
          payload
        })
      });
    } catch (error) {
      console.warn("Media telemetry skipped:", error.message);
    }
  }

  function defaultAssetDraft(item) {
    return {
      title: item?.title || "",
      mediaType: item?.mediaType || "video",
      status: item?.status || "pending",
      playbackUrl: item?.playbackUrl || item?.previewUrl || "",
      storageUrl: item?.storageUrl || "",
      posterUrl: item?.posterUrl || "",
      productUrl: item?.productUrl || item?.cta_url || item?.productPageUrl || "",
      ctaText: item?.ctaText || "Buy Now",
      notes: item?.notes || ""
    };
  }

  function assetDraft(item) {
    if (!item) return defaultAssetDraft(null);
    mocState.assetEdits[item.id] = mocState.assetEdits[item.id] || defaultAssetDraft(item);
    return mocState.assetEdits[item.id];
  }

  function syncAssetDraft(item) {
    if (!item) return;
    mocState.assetEdits[item.id] = {
      ...defaultAssetDraft(item),
      ...(mocState.assetEdits[item.id] || {})
    };
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

  async function loadMediaOutputs(controlEl) {
    setControlState(controlEl, "running");
    mocState.loading = true;
    mocState.error = null;
    render();
    try {
      const payload = await apiJson("/api/media-output/outputs");
      mocState.items = payload.items || [];

      // Inject local proof render (if not already present) so admins can review the Sea Moss proof directly
      try {
        const proofId = 'proof-evics-sea-moss';
        if (!mocState.items.some((it) => it.id === proofId)) {
          const proofItem = {
            id: proofId,
            title: 'Proof: Sea Moss (Jordan Avatar)',
            mediaType: 'video',
            status: 'proof',
            sourceProvider: 'local-mock',
            providerPackage: 'internal',
            renderState: 'complete',
            readinessScore: 98,
            playbackUrl: '/generated/evics-sea-moss-proof-render.mp4',
            storageUrl: '/generated/evics-sea-moss-proof-render.mp4',
            posterUrl: '/generated/evics-sea-moss-proof-render.mp4',
            productUrl: 'https://iamgenesistech.myshopify.com/products/sea-moss-capsules',
            ctaText: 'Buy Now',
            tags: ['proof', 'sea-moss', 'jordan-avatar']
          };
          mocState.items.unshift(proofItem);
        }
      } catch (e) { console.warn('Inject proof item failed', e); }

      if (!mocState.selectedId && mocState.items[0]) mocState.selectedId = mocState.items[0].id;
      if (mocState.selectedId && !mocState.items.some((item) => item.id === mocState.selectedId)) {
        mocState.selectedId = mocState.items[0]?.id || null;
      }
      if (mocState.selectedId) syncAssetDraft(mocState.items.find((item) => item.id === mocState.selectedId));
      setControlState(controlEl, "completed", 2400);
    } catch (error) {
      mocState.error = error.message;
      setControlState(controlEl, "off");
    } finally {
      mocState.loading = false;
      render();
    }
  }

  async function runOutputAction(action, id, controlEl) {
    const item = mocState.items.find((entry) => entry.id === id);
    if (!item) return;
    setControlState(controlEl, "running");
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
      void trackTelemetry("action", id, { action });
      mocState.actionStatus = { type: "success", message: payload.message || `${action} complete.` };
      setControlState(controlEl, "completed", 2400);
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
      setControlState(controlEl, "off");
    }
    render();
  }

  async function runRenderRouteAction(action, id, controlEl) {
    const item = mocState.items.find((entry) => entry.id === id);
    if (!item) return;
    setControlState(controlEl, "running");
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
      void trackTelemetry("render-route", id, { action, presetKey: mocState.preset });
      mocState.actionStatus = { type: "success", message: payload.message || `${action} submitted.` };
      setControlState(controlEl, "completed", 2400);
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
      setControlState(controlEl, "off");
    }
    render();
  }

  async function saveQa(id, controlEl) {
    setControlState(controlEl, "running");
    mocState.actionStatus = { type: "info", message: "Saving learning loop..." };
    render();
    try {
      await apiJson(`/api/media-output/outputs/${encodeURIComponent(id)}/qa`, {
        method: "POST",
        body: JSON.stringify({ outputId: id, qa: mocState.qa[id] || {} })
      });
      void trackTelemetry("save-qa", id, { qa: mocState.qa[id] || {} });
      mocState.actionStatus = { type: "success", message: "Learning loop saved." };
      setControlState(controlEl, "completed", 2400);
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
      setControlState(controlEl, "off");
    }
    render();
  }

  async function saveAsset(id, controlEl) {
    const draft = mocState.assetEdits[id];
    if (!draft) return;
    setControlState(controlEl, "running");
    mocState.actionStatus = { type: "info", message: "Saving media asset..." };
    render();
    try {
      const payload = await apiJson(`/api/media-output/outputs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draft.title,
          mediaType: draft.mediaType,
          status: draft.status,
          playbackUrl: draft.playbackUrl,
          storageUrl: draft.storageUrl,
          posterUrl: draft.posterUrl,
          productUrl: draft.productUrl,
          ctaText: draft.ctaText,
          notes: draft.notes
        })
      });
      if (payload.item) {
        mocState.items = mocState.items.map((entry) => entry.id === payload.item.id ? payload.item : entry);
        syncAssetDraft(payload.item);
      }
      void trackTelemetry("save-asset", id, { title: draft.title, mediaType: draft.mediaType, status: draft.status });
      mocState.actionStatus = { type: "success", message: payload.message || "Media asset updated." };
      setControlState(controlEl, "completed", 2400);
    } catch (error) {
      mocState.actionStatus = { type: "bad", message: error.message };
      setControlState(controlEl, "off");
    }
    render();
  }

  function render() {
    if (typeof window.render === "function") {
      window.render();
    }
  }

  function renderCard(item) {
    const selected = item.id === mocState.selectedId ? "selected" : "";
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
        <div class="moc-link-row">
          ${item.playbackUrl ? `<button class="moc-btn" data-moc-open-url="${escapeHtml(item.playbackUrl)}" data-moc-open-context="playback" data-moc-id="${escapeHtml(item.id)}">Playback</button>` : ""}
          ${item.storageUrl ? `<button class="moc-btn" data-moc-open-url="${escapeHtml(item.storageUrl)}" data-moc-open-context="storage" data-moc-id="${escapeHtml(item.id)}">Storage</button>` : ""}
          ${item.productUrl ? `<button class="moc-btn" data-moc-open-url="${escapeHtml(item.productUrl)}" data-moc-open-context="product" data-moc-id="${escapeHtml(item.id)}">Buy link</button>` : ""}
        </div>
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
    const storageUrl = storageRecallUrl(item);
    const mediaType = String(item.mediaType || "").toLowerCase();
    const aspect = preset.key === "original" && item.width && item.height
      ? `${item.width} / ${item.height}`
      : `${preset.width} / ${preset.height}`;
    if (!source) {
      const storageNote = storageUrl
        ? `<button class="moc-btn primary" type="button" data-moc-open-url="${escapeHtml(storageUrl)}" data-moc-open-context="storage" data-moc-id="${escapeHtml(item.id)}">Open Google Storage Copy</button>`
        : `<span class="moc-muted">No storage copy linked yet.</span>`;
      const heading = ["print", "print_ad", "banner"].includes(mediaType)
        ? "Print / Banner proof surface"
        : ["landing_page", "email"].includes(mediaType)
          ? "Landing / Email proof surface"
          : "Video proof surface";
      return `<div class="moc-frame" style="aspect-ratio:${aspect}">
        <div class="moc-preview-fallback">
          <div class="moc-surface-label">${heading}</div>
          <div class="moc-preview-fallback-hero ${mediaType === "video" || mediaType === "ugc" ? "is-video" : "is-static"}">
            <div class="moc-preview-fallback-icon">${mediaType === "video" || mediaType === "ugc" ? "▶" : "◫"}</div>
            <div class="moc-preview-fallback-copy">
              <h4>${escapeHtml(item.title || item.product || "Creative Asset")}</h4>
              <p>No playback URL is attached yet. The executive review shell is showing the item metadata, approval state, and storage links instead of a blank canvas.</p>
            </div>
          </div>
          <div class="moc-chip-row">
            <span class="moc-chip">${escapeHtml(PREVIEW_PRESETS[mocState.preset].label)}</span>
            <span class="moc-chip">${escapeHtml(item.mediaType || "video")}</span>
            <span class="moc-chip">${escapeHtml(item.sourceProvider || "EVICS")}</span>
            <span class="moc-chip">${Number(item.readinessScore || 0)}%</span>
          </div>
          <div class="moc-preview-actions">${storageNote}</div>
        </div>
      </div>`;
    }
    const mediaClass = `moc-fit-${mocState.fitMode}`;
    const ctaHref = item.productUrl || "";
    const ctaText = item.ctaText || "Buy Now";
    const ctaWindow = Number(item.ctaStartOffsetSeconds || 9);
    const isDocument = ["pdf", "print", "print_ad", "banner"].includes(mediaType) || /\.pdf(?:$|\?)/i.test(source);
    const isIframeSurface = ["landing_page", "email"].includes(mediaType) || /\.html?(?:$|\?)/i.test(source);
    const isImageSurface = ["image", "social_post", "social", "print_ad", "banner"].includes(mediaType);
    const media = (mediaType === "video" || mediaType === "ugc")
      ? `<video src="${escapeHtml(source)}" poster="${escapeHtml(item.posterUrl || "")}" class="${mediaClass}" controls playsinline data-moc-video="${escapeHtml(item.id)}" data-moc-cta-window="${ctaWindow}" ${mocState.muted ? "muted" : ""} ${mocState.loop ? "loop" : ""}></video>`
      : isIframeSurface
        ? `<iframe src="${escapeHtml(source)}" title="${escapeHtml(item.title)}" class="moc-doc-frame"></iframe>`
      : isDocument
        ? `<iframe src="${escapeHtml(source)}" title="${escapeHtml(item.title)}" class="moc-doc-frame"></iframe>`
      : isImageSurface
        ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(item.title)}" class="${mediaClass}" />`
      : `<img src="${escapeHtml(source)}" alt="${escapeHtml(item.title)}" class="${mediaClass}" />`;
    const cta = ctaHref
      ? `<button class="moc-buy-now" data-moc-open-url="${escapeHtml(ctaHref)}" data-moc-open-context="buy-now" data-moc-buy-now="${escapeHtml(item.id)}" data-moc-id="${escapeHtml(item.id)}" type="button">${escapeHtml(ctaText)}</button>`
      : "";
    const storageLink = storageUrl
      ? `<button class="moc-storage-link" type="button" data-moc-open-url="${escapeHtml(storageUrl)}" data-moc-open-context="storage" data-moc-id="${escapeHtml(item.id)}">Open Google Storage Copy</button>`
      : `<span class="moc-muted">No storage URL recorded yet.</span>`;
    return `<div class="moc-frame" style="aspect-ratio:${aspect}">${media}${cta}${renderSafeZone()}</div><div class="moc-storage-row">${storageLink}</div>`;
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
          <div><h3>Render + Govern</h3><div class="moc-muted">Current preset: ${escapeHtml(PREVIEW_PRESETS[mocState.preset].label)}</div></div>
          <span class="moc-chip ${item.renderState === "failed" ? "bad" : "good"}">${escapeHtml(item.renderState || "queued")}</span>
        </div>
        <div class="moc-action-groups">
          ${group("Render", renderActions)}
          ${group("Variant", variantActions)}
        </div>
        ${storageRecallUrl(item) ? `
          <div class="moc-storage-row">
            <button class="moc-btn" type="button" data-moc-open-url="${escapeHtml(storageRecallUrl(item))}" data-moc-open-context="storage-recall" data-moc-id="${escapeHtml(item.id)}">Recall from Google Storage</button>
          </div>
        ` : ""}
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
      ["Google Storage", item.storageUrl || "not linked"],
      ["Migration", item.migrationState || "none"],
      ["Readiness", `${Number(item.readinessScore || 0)}%`],
      ["Approval", item.approvedState || item.status || "pending"]
    ];
    return `<div class="moc-meta-grid">${cells.map(([label, value]) => `<div class="moc-meta-cell"><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join("")}</div>`;
  }

  function renderAssetEditor(item) {
    if (!item) return "";
    const draft = assetDraft(item);
    const mediaTypeOptions = unique(mocState.items, (entry) => entry.mediaType).filter((entry) => entry !== "All");
    const statusOptions = ["pending", "review", "approved", "queued", "published", "rejected", "archived", "failed"];
    const hasPlayback = Boolean(draft.playbackUrl);
    const hasStorage = Boolean(draft.storageUrl);
    return `
      <div class="moc-asset-editor">
        <div class="moc-card-head">
          <div>
            <h3>Edit Asset</h3>
            <div class="moc-muted">Update the saved record, links, and surface metadata for the selected item.</div>
          </div>
          <button class="moc-btn primary" data-moc-save-asset="${escapeHtml(item.id)}">Save asset</button>
        </div>
        <div class="moc-asset-grid">
          <label>Title<input data-moc-asset="${item.id}:title" value="${escapeHtml(draft.title)}" /></label>
          <label>Media Type<select data-moc-asset="${item.id}:mediaType">${mediaTypeOptions.concat(["video", "image", "pdf", "print"]).filter((value, index, array) => array.indexOf(value) === index).map((type) => `<option ${draft.mediaType === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}</select></label>
          <label>Status<select data-moc-asset="${item.id}:status">${statusOptions.map((status) => `<option ${draft.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select></label>
          <label>Playback URL<input data-moc-asset="${item.id}:playbackUrl" value="${escapeHtml(draft.playbackUrl)}" placeholder="https://..." /></label>
          <label>Storage URL<input data-moc-asset="${item.id}:storageUrl" value="${escapeHtml(draft.storageUrl)}" placeholder="gs://bucket/path or https://storage.googleapis.com/..." /></label>
          <label>Poster URL<input data-moc-asset="${item.id}:posterUrl" value="${escapeHtml(draft.posterUrl)}" placeholder="https://..." /></label>
          <label>Product URL<input data-moc-asset="${item.id}:productUrl" value="${escapeHtml(draft.productUrl)}" placeholder="https://..." /></label>
          <label>CTA Text<input data-moc-asset="${item.id}:ctaText" value="${escapeHtml(draft.ctaText)}" placeholder="Buy Now" /></label>
        </div>
        <textarea class="moc-qa-notes" data-moc-asset="${item.id}:notes" placeholder="Internal asset notes">${escapeHtml(draft.notes)}</textarea>
        <div class="moc-button-row">
          <button class="moc-btn" data-moc-reset-asset="${escapeHtml(item.id)}">Reset from record</button>
          ${hasPlayback ? `<button class="moc-btn" type="button" data-moc-open-url="${escapeHtml(draft.playbackUrl)}" data-moc-open-context="open-playback" data-moc-id="${escapeHtml(item.id)}">Open playback</button>` : ""}
          ${hasStorage ? `<button class="moc-btn" type="button" data-moc-open-url="${escapeHtml(draft.storageUrl)}" data-moc-open-context="open-storage" data-moc-id="${escapeHtml(item.id)}">Open storage</button>` : ""}
        </div>
      </div>
    `;
  }

  function renderQa(item) {
    const qa = mocState.qa[item.id] || {};
    const checklist = ["Has audio", "Correct aspect", "No crop issues", "Safe-zone clean", "Ready to publish"];
    const qualityScore = Number(item.readinessScore || 0);
    const improvementHint = qualityScore >= 85 ? "Model is strong; focus on fine-tuning hooks and timing." : qualityScore >= 65 ? "Good baseline; refine pacing, CTA, and proof cadence." : "Needs stronger opening, clearer value, and tighter proof.";
    return `
      <div class="moc-qa-panel">
        <div class="moc-card-head">
          <h3>Edit + QA</h3>
          <button class="moc-btn primary" data-moc-save-qa="${escapeHtml(item.id)}">Save Learning Loop</button>
        </div>
        <div class="moc-chip-row">
          <span class="moc-chip good">Board loop ready</span>
          <span class="moc-chip">Readiness ${qualityScore}%</span>
          <span class="moc-chip">${escapeHtml(item.approvedState || item.status || "pending")}</span>
        </div>
        <div class="moc-muted">${escapeHtml(improvementHint)}</div>
        <div class="moc-qa-grid">
          <input data-moc-qa="${item.id}:trimStart" placeholder="Learning loop: trim start" value="${escapeHtml(qa.trimStart || "")}" />
          <input data-moc-qa="${item.id}:trimEnd" placeholder="Learning loop: trim end" value="${escapeHtml(qa.trimEnd || "")}" />
          <input data-moc-qa="${item.id}:posterFrame" placeholder="Learning loop: poster frame" value="${escapeHtml(qa.posterFrame || "")}" />
          <select data-moc-qa="${item.id}:fillMode">
            ${["blur fill", "solid fill", "black", "brand color"].map((mode) => `<option ${qa.fillMode === mode ? "selected" : ""}>${mode}</option>`).join("")}
          </select>
          <input data-moc-qa="${item.id}:ctaText" placeholder="Learning loop: CTA text" value="${escapeHtml(qa.ctaText || "")}" />
          <input data-moc-qa="${item.id}:buyNowText" placeholder="Learning loop: buy now text" value="${escapeHtml(qa.buyNowText || "")}" />
          <input data-moc-qa="${item.id}:messageText" placeholder="Learning loop: message text" value="${escapeHtml(qa.messageText || "")}" />
          <label class="moc-chip"><input type="checkbox" data-moc-qa="${item.id}:captions" ${qa.captions ? "checked" : ""} /> Captions</label>
        </div>
        <div class="moc-check-grid">
          ${checklist.map((label) => {
            const key = label.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_m, chr) => chr.toUpperCase());
            return `<label>${label}<input type="checkbox" data-moc-qa="${item.id}:${key}" ${qa[key] ? "checked" : ""} /></label>`;
          }).join("")}
        </div>
        <textarea class="moc-qa-notes" data-moc-qa="${item.id}:notes" placeholder="Board learning loop notes">${escapeHtml(qa.notes || "")}</textarea>
        <div class="moc-button-row">
          <button class="moc-btn danger" data-moc-render-route="sendToManualReview" data-moc-id="${escapeHtml(item.id)}">Escalate to board review</button>
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
          <p>Storage-backed playback, live editing, board learning loops, render jobs, and approval workflow for EVICS / EVIE media outputs.</p>
        </div>
        <div class="moc-toolbar">
          <div>
            <h2>Storage Catalog Workstation</h2>
            <p>${mocState.loading ? "Syncing live media records..." : `${mocState.items.length} stored assets loaded`}</p>
          </div>
          <div class="moc-toolbar-actions">
            ${mocState.actionStatus ? `<span class="moc-chip ${mocState.actionStatus.type === "bad" ? "bad" : mocState.actionStatus.type === "success" ? "good" : "warn"}">${escapeHtml(mocState.actionStatus.message)}</span>` : ""}
            <button class="moc-btn primary" id="moc-refresh">Refresh outputs</button>
          </div>
        </div>
        ${mocState.error ? `<div class="moc-error">${escapeHtml(mocState.error)}</div>` : ""}
        <div class="moc-grid">
          <div class="moc-panel">
            <div class="moc-card-head">
              <div>
                <h3>Stored Media Library</h3>
                <div class="moc-muted">View every stored asset and open it directly into the board learning loop.</div>
              </div>
            </div>
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
              ${renderAssetEditor(item)}
              ${renderActionBar(item)}
              ${renderMetadata(item)}
              ${renderQa(item)}
            ` : `<div class="moc-empty">Select an output to open playback, metadata, and the board learning loop.</div>`}
          </div>
        </div>
      </div>
    `;
  }

  function bindMediaOutputCenter() {
    registerControlStates();
    const refresh = document.getElementById("moc-refresh");
    if (refresh) refresh.addEventListener("click", () => loadMediaOutputs(refresh));
    const search = document.getElementById("moc-search");
    if (search) search.addEventListener("input", () => { mocState.search = search.value; render(); });
    [["moc-type", "mediaType"], ["moc-status", "status"], ["moc-provider", "provider"], ["moc-preset", "preset"], ["moc-fit", "fitMode"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => {
        setControlState(el, "running");
        mocState[key] = el.value;
        render();
        setControlState(el, "completed", 1500);
      });
    });
    [["moc-mute", "muted"], ["moc-loop", "loop"], ["moc-safe", "safeZones"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => {
        el.classList.add("pressing");
        mocState[key] = !mocState[key];
        render();
        setControlState(el, mocState[key] ? "running" : "off");
        setTimeout(() => el.classList.remove("pressing"), 120);
      });
    });
    document.querySelectorAll("[data-moc-select]").forEach((button) => {
      button.addEventListener("click", () => {
        mocState.selectedId = button.dataset.mocSelect;
        mocState.actionStatus = null;
        syncAssetDraft(mocState.items.find((item) => item.id === mocState.selectedId));
        render();
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          mocState.selectedId = button.dataset.mocSelect;
          mocState.actionStatus = null;
          syncAssetDraft(mocState.items.find((item) => item.id === mocState.selectedId));
          render();
        }
      });
    });
    document.querySelectorAll("[data-moc-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        button.classList.add("pressing");
        runOutputAction(button.dataset.mocAction, button.dataset.mocId, button);
        setTimeout(() => button.classList.remove("pressing"), 120);
      });
    });
    document.querySelectorAll("[data-moc-render-route]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        button.classList.add("pressing");
        runRenderRouteAction(button.dataset.mocRenderRoute, button.dataset.mocId, button);
        setTimeout(() => button.classList.remove("pressing"), 120);
      });
    });
    document.querySelectorAll("[data-moc-qa]").forEach((input) => {
      input.addEventListener("change", () => {
        const [id, key] = input.dataset.mocQa.split(":");
        mocState.qa[id] = mocState.qa[id] || {};
        mocState.qa[id][key] = input.type === "checkbox" ? input.checked : input.value;
      });
    });
    document.querySelectorAll("[data-moc-asset]").forEach((input) => {
      input.addEventListener("change", () => {
        const [id, key] = input.dataset.mocAsset.split(":");
        mocState.assetEdits[id] = mocState.assetEdits[id] || defaultAssetDraft(mocState.items.find((item) => item.id === id));
        mocState.assetEdits[id][key] = input.type === "checkbox" ? input.checked : input.value;
      });
    });
    document.querySelectorAll("[data-moc-save-qa]").forEach((button) => {
      button.addEventListener("click", () => saveQa(button.dataset.mocSaveQa, button));
    });
    document.querySelectorAll("[data-moc-save-asset]").forEach((button) => {
      button.addEventListener("click", () => saveAsset(button.dataset.mocSaveAsset, button));
    });
    document.querySelectorAll("[data-moc-reset-asset]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const item = mocState.items.find((entry) => entry.id === button.dataset.mocResetAsset);
        if (!item) return;
        setControlState(button, "running");
        mocState.assetEdits[item.id] = defaultAssetDraft(item);
        render();
        setControlState(button, "completed", 1500);
      });
    });
    document.querySelectorAll("[data-moc-open-url]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setControlState(button, "running");
        const itemId = button.dataset.mocId || null;
        const context = button.dataset.mocOpenContext || "open-url";
        void trackTelemetry(context, itemId, { url: button.dataset.mocOpenUrl });
        openMediaUrl(button.dataset.mocOpenUrl);
        setControlState(button, "completed", 1800);
      });
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
      video.addEventListener("play", () => {
        void trackTelemetry("preview-play", id, { currentTime: Number(video.currentTime || 0) });
      });
      video.addEventListener("loadedmetadata", syncCta);
      video.addEventListener("timeupdate", syncCta);
      video.addEventListener("ended", () => {
        cta.classList.add("visible");
        void trackTelemetry("preview-ended", id, { duration: Number(video.duration || 0) });
      });
      syncCta();
    });
  }

  window.renderMediaOutputCenter = renderMediaOutputCenter;
  window.bindMediaOutputCenter = bindMediaOutputCenter;
  window.loadMediaOutputs = loadMediaOutputs;
  window.mocState = mocState;
})();
