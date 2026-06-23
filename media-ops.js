const fs = require("fs");
const path = require("path");
const persistence = require("./evics-persistence");
const { runHaveGate } = require("./quality-checker");

const statePath = process.env.MEDIA_OPS_STATE_PATH || path.join(__dirname, "media-ops-state.local.json");

const mediaTypes = ["video", "image", "audio", "document"];
const modes = ["automated", "auto_assist", "manual"];
const platforms = ["TikTok", "Instagram", "YouTube", "Facebook", "LinkedIn", "X", "Google Ads", "Email"];
const viewingAreaStatuses = ["queued", "rendering", "complete", "failed", "rework"];
const providerCredentialMap = {
  Canva: ["CANVA_API_KEY", "CANVA_TOKEN"],
  HeyGen: ["HEYGEN_API_KEY"],
  Runway: ["RUNWAY_API_KEY"],
  Kling: ["KLING_API_KEY", "KLING_SECRET_KEY"]
};

loadEnvFromLocalFile();

function defaultState() {
  return {
    operatingMode: "auto_assist",
    scanner: {
      enabled: true,
      continuous: true,
      intervalMinutes: 60,
      durationSeconds: 45,
      scope: "all_outputs",
      lastRunAt: null,
      status: "Ready"
    },
    media: [],
    dispatches: [],
    scanRuns: [],
    findings: [],
    auditEvents: [],
    providerJobs: [],
    analytics: [],
    verPolicy: defaultVerPolicy(),
    renderCounter: defaultRenderCounter(),
    complianceRules: defaultComplianceRules(),
    alerts: [],
    folderCache: {},
    updatedAt: new Date().toISOString()
  };
}

function defaultVerPolicy() {
  return {
    category: "Sea Moss Capsules",
    threshold: 58,
    semanticWeight: 66,
    accelerationWeight: 72,
    volatilitySensitivity: 44,
    creatorTrustWeight: 61,
    engagementNormalization: 69,
    updatedAt: null,
    updatedBy: "system"
  };
}

function defaultRenderCounter() {
  const year = new Date().getUTCFullYear();
  return {
    policy: "continue",
    currentYear: year,
    sequence: 0,
    totals: { created: 0, discarded: 0 },
    periods: {
      daily: {},
      weekly: {},
      monthly: {},
      yearly: {}
    },
    lastCreatedAt: null,
    lastDiscardedAt: null,
    lastResetAt: null
  };
}

function isoWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function periodKeys(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return {
    day: `${year}-${month}-${day}`,
    week: isoWeekKey(date),
    month: `${year}-${month}`,
    year: String(year)
  };
}

function periodBucket(counter = {}, period = "daily", key = "") {
  if (!counter.periods) counter.periods = { daily: {}, weekly: {}, monthly: {}, yearly: {} };
  if (!counter.periods[period]) counter.periods[period] = {};
  if (!counter.periods[period][key]) {
    counter.periods[period][key] = { created: 0, discarded: 0 };
  }
  return counter.periods[period][key];
}

function incrementRenderCounter(state, event = "created", at = new Date()) {
  if (!state.renderCounter) state.renderCounter = defaultRenderCounter();
  const counter = state.renderCounter;
  if (!counter.totals) counter.totals = { created: 0, discarded: 0 };

  const year = at.getUTCFullYear();
  if (counter.policy === "reset_yearly" && counter.currentYear !== year) {
    counter.sequence = 0;
    counter.currentYear = year;
    counter.lastResetAt = at.toISOString();
  }

  const keys = periodKeys(at);
  if (event === "created") {
    counter.sequence = Number(counter.sequence || 0) + 1;
    counter.totals.created = Number(counter.totals.created || 0) + 1;
    periodBucket(counter, "daily", keys.day).created += 1;
    periodBucket(counter, "weekly", keys.week).created += 1;
    periodBucket(counter, "monthly", keys.month).created += 1;
    periodBucket(counter, "yearly", keys.year).created += 1;
    counter.lastCreatedAt = at.toISOString();
    return { sequence: counter.sequence, keys };
  }

  if (event === "discarded") {
    counter.totals.discarded = Number(counter.totals.discarded || 0) + 1;
    periodBucket(counter, "daily", keys.day).discarded += 1;
    periodBucket(counter, "weekly", keys.week).discarded += 1;
    periodBucket(counter, "monthly", keys.month).discarded += 1;
    periodBucket(counter, "yearly", keys.year).discarded += 1;
    counter.lastDiscardedAt = at.toISOString();
    return { sequence: Number(counter.sequence || 0), keys };
  }

  return { sequence: Number(counter.sequence || 0), keys };
}

function loadEnvFromLocalFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    if (!process.env[key]) process.env[key] = match[2] || "";
  });
}

function defaultComplianceRules() {
  return [
    { id: "rule-fda-disclaimer", type: "required", phrase: "These statements have not been evaluated by the Food and Drug Administration.", severity: "high" },
    { id: "rule-no-cure", type: "blocked", phrase: "cure", severity: "high" },
    { id: "rule-no-treat", type: "blocked", phrase: "treat", severity: "high" },
    { id: "rule-no-guarantee", type: "blocked", phrase: "guaranteed", severity: "medium" },
    { id: "rule-safe-supports", type: "safe", phrase: "supports daily wellness routines", severity: "low" }
  ];
}

function readState() {
  if (!fs.existsSync(statePath)) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch (error) {
    return defaultState();
  }
}

function writeState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
}

function buildPlaybackUrl(mediaId) {
  return `/api/media/playback/${encodeURIComponent(mediaId)}`;
}

function buildPreviewUrl(mediaId) {
  return `/api/media/playback/${encodeURIComponent(mediaId)}?view=preview`;
}

function isExternalMediaUrl(value = "") {
  const url = String(value || "");
  return /^https?:\/\//i.test(url) || url.startsWith("/generated/") || url.startsWith("/work/");
}

function providerIsConfigured(provider) {
  const keys = providerCredentialMap[provider] || [];
  return keys.some((key) => String(process.env[key] || "").trim());
}

function twilioIsConfigured() {
  return Boolean(String(process.env.TWILIO_ACCOUNT_SID || "").trim() && String(process.env.TWILIO_AUTH_TOKEN || "").trim());
}

function audit(state, actor, action, mediaId, detail) {
  state.auditEvents.unshift({
    id: `audit-${Date.now()}-${state.auditEvents.length}`,
    actor,
    action,
    mediaId: mediaId || "",
    detail: detail || "",
    createdAt: new Date().toISOString()
  });
  state.auditEvents = state.auditEvents.slice(0, 300);
  persistence.logAgentEvent({
    type: "media_audit",
    actor,
    mediaId,
    lifecycle: action,
    message: detail || "",
    metadata: { action }
  });
}

function setOperatingMode(mode, actor = "owner-admin") {
  if (!modes.includes(mode)) throw new Error("Invalid operating mode.");
  const state = readState();
  state.operatingMode = mode;
  audit(state, actor, "mode.changed", "", `Operating mode changed to ${mode}.`);
  return writeState(state);
}

function updateScannerSettings(settings = {}, actor = "owner-admin") {
  const state = readState();
  state.scanner = {
    ...state.scanner,
    enabled: settings.enabled === undefined ? state.scanner.enabled : Boolean(settings.enabled),
    continuous: settings.continuous === undefined ? state.scanner.continuous : Boolean(settings.continuous),
    intervalMinutes: Math.max(5, Number(settings.intervalMinutes || state.scanner.intervalMinutes || 60)),
    durationSeconds: Math.max(10, Number(settings.durationSeconds || state.scanner.durationSeconds || 45)),
    scope: settings.scope || state.scanner.scope || "all_outputs"
  };
  audit(state, actor, "scanner.settings.updated", "", JSON.stringify(state.scanner));
  return writeState(state);
}

function updateVerPolicy(policy = {}, actor = "owner-admin") {
  const state = readState();
  const current = { ...defaultVerPolicy(), ...(state.verPolicy || {}) };
  state.verPolicy = {
    ...current,
    category: String(policy.category || current.category || "Sea Moss Capsules"),
    threshold: Math.max(20, Math.min(95, Number(policy.threshold ?? current.threshold))),
    semanticWeight: Math.max(20, Math.min(95, Number(policy.semanticWeight ?? current.semanticWeight))),
    accelerationWeight: Math.max(20, Math.min(95, Number(policy.accelerationWeight ?? current.accelerationWeight))),
    volatilitySensitivity: Math.max(5, Math.min(95, Number(policy.volatilitySensitivity ?? current.volatilitySensitivity))),
    creatorTrustWeight: Math.max(20, Math.min(95, Number(policy.creatorTrustWeight ?? current.creatorTrustWeight))),
    engagementNormalization: Math.max(20, Math.min(95, Number(policy.engagementNormalization ?? current.engagementNormalization))),
    updatedAt: new Date().toISOString(),
    updatedBy: actor
  };
  audit(state, actor, "ver.policy.updated", "", JSON.stringify({
    category: state.verPolicy.category,
    threshold: state.verPolicy.threshold
  }));
  writeState(state);
  return state.verPolicy;
}

function calculateVerScore(media = {}, verPolicy = defaultVerPolicy()) {
  const qualityScore = Number(media.quality_score || media.quality_json?.qualityScore || 0);
  const readiness = Number(media.readiness_score || 0);
  const semanticSignal = Number(media.metadata_json?.semanticResonance || qualityScore || 0);
  const accelerationSignal = Number(media.metadata_json?.viralityPrediction || readiness || qualityScore || 0);
  const creatorSignal = Number(media.metadata_json?.creatorCompatibility || media.metadata_json?.creatorTrust || qualityScore || 0);
  const engagementSignal = Number(media.metadata_json?.predictedConversionScore || qualityScore || 0);
  const volatilityRaw = media.render_status === "failed" || media.retry_eligible ? 82 : media.rework_eligible ? 68 : 30;

  const weighted =
    (semanticSignal * Number(verPolicy.semanticWeight || 0.66)) +
    (accelerationSignal * Number(verPolicy.accelerationWeight || 0.72)) +
    (creatorSignal * Number(verPolicy.creatorTrustWeight || 0.61)) +
    (engagementSignal * Number(verPolicy.engagementNormalization || 0.69));
  const normalized = weighted / Math.max(1, Number(verPolicy.semanticWeight || 0) + Number(verPolicy.accelerationWeight || 0) + Number(verPolicy.creatorTrustWeight || 0) + Number(verPolicy.engagementNormalization || 0));
  const volatilityPenalty = (Number(verPolicy.volatilitySensitivity || 0) / 100) * (volatilityRaw / 2.4);
  const score = Math.max(0, Math.min(100, Math.round(normalized - volatilityPenalty)));
  return {
    score,
    threshold: Number(verPolicy.threshold || 58),
    passed: score >= Number(verPolicy.threshold || 58)
  };
}

function createMedia(input = {}, actor = "system") {
  const state = readState();
  const now = new Date();
  const type = mediaTypes.includes(input.mediaType) ? input.mediaType : "video";
  const allowReviewBypass = String(process.env.EVICS_ALLOW_AUTOMATED_REVIEW_BYPASS || "").toLowerCase() === "true";
  const allowAutomatedPublish = String(process.env.EVICS_ALLOW_AUTOMATED_PUBLISH || "").toLowerCase() === "true";
  const approvalRequired = !allowReviewBypass || state.operatingMode !== "automated" || Boolean(input.approvalRequired);
  const enforcedApprovalRequired = type === "video" ? true : approvalRequired;
  const id = input.id || `media-${Date.now()}-${state.media.length}`;
  const migrationDueAt = type === "video"
    ? new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString()
    : null;
  const productUrl = input.productUrl || input.product_url || input.metadata?.productUrl || "";
  const brandProfile = normalizeIncomingBrandProfile(input.brandProfile || input.metadata?.brandProfile || {});
  const buyNow = buildBuyNowBlock(productUrl, brandProfile);
  const enforcedDescription = enforceBrandProfileOnText(input.description || input.script || "", brandProfile);
  const hasInitialProviderMedia = isExternalMediaUrl(input.previewUrl) || isExternalMediaUrl(input.playbackUrl) || isExternalMediaUrl(input.hotStorageReference);
  const originSectionId = normalizeOriginSectionId(input.originSectionId || input.origin_section_id || input.metadata?.originSectionId || input.metadata?.origin_section_id || input.createdSource || input.created_source || "evics-build");
  const renderStatus = normalizeRenderStatus(input.renderStatus || input.render_status || (hasInitialProviderMedia ? "complete" : "initialized"));
  const renderCounterMeta = type === "video" ? incrementRenderCounter(state, "created", now) : { sequence: null, keys: periodKeys(now) };

  const media = {
    id,
    title: input.title || "Untitled media output",
    description: enforcedDescription,
    campaign_id: input.campaignId || input.campaign_id || "unassigned",
    created_by: actor,
    created_source: input.createdSource || input.created_source || "system",
    origin_section_id: originSectionId,
    originating_request_id: input.originatingRequestId || input.originating_request_id || input.metadata?.originatingRequestId || input.metadata?.originating_request_id || id,
    agent_orchestration_id: input.agentOrchestrationId || input.agent_orchestration_id || input.metadata?.agentOrchestrationId || input.metadata?.agent_orchestration_id || "",
    mode_at_creation: state.operatingMode,
    media_type: type,
    file_name: input.fileName || `${slug(input.title || id)}.${type === "video" ? "mp4" : "txt"}`,
    mime_type: input.mimeType || (type === "video" ? "video/mp4" : "text/plain"),
    file_size_bytes: Number(input.fileSizeBytes || 0),
    duration_seconds: Number(input.durationSeconds || 0),
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    storage_location: "hot",
    playback_url: input.playbackUrl || buildPlaybackUrl(id),
    preview_url: input.previewUrl || buildPreviewUrl(id),
    thumbnail_url: input.thumbnailUrl || "",
    hot_storage_reference: input.hotStorageReference || `hot://${id}`,
    google_drive_file_id: "",
    google_drive_folder_id: "",
    google_drive_web_view_link: "",
    product_url: productUrl,
    buy_now_label: buyNow.label,
    buy_now_url: buyNow.url,
    buy_now_message: buyNow.message,
    buy_now_message_lines: buyNow.messageLines,
    metadata_json: {
      ...(input.metadata || {}),
      productUrl,
      buyNow,
      renderCounter: type === "video" ? {
        sequence: renderCounterMeta.sequence,
        dayKey: renderCounterMeta.keys.day,
        weekKey: renderCounterMeta.keys.week,
        monthKey: renderCounterMeta.keys.month,
        yearKey: renderCounterMeta.keys.year
      } : undefined,
      originSectionId,
      origin_section_id: originSectionId,
      brandProfileEnforced: Boolean(brandProfile.id || brandProfile.publicBrandName),
      brandProfile: brandProfile.id || brandProfile.publicBrandName ? brandProfile : undefined
    },
    tags_json: input.tags || [],
    target_platforms_json: input.targetPlatforms || ["TikTok", "Instagram", "YouTube"],
    approval_required: enforcedApprovalRequired,
    approval_status: enforcedApprovalRequired ? "pending" : "approved",
    approved_by: enforcedApprovalRequired ? "" : "system",
    approved_at: enforcedApprovalRequired ? null : now.toISOString(),
    rejection_reason: "",
    publish_status: state.operatingMode === "automated" && allowAutomatedPublish && !enforcedApprovalRequired && hasInitialProviderMedia ? "queued" : "draft",
    render_status: renderStatus,
    render_sequence: type === "video" ? renderCounterMeta.sequence : null,
    render_job_id: input.renderJobId || input.render_job_id || "",
    provider_render_job_id: input.providerRenderJobId || input.provider_render_job_id || "",
    last_render_error: "",
    error_code: "",
    retry_eligible: false,
    rework_eligible: false,
    delivery_status: renderStatus === "complete" ? "pending_delivery" : "not_ready",
    delivery_destinations_json: buildDeliveryDestinations(originSectionId),
    delivery_errors_json: [],
    routed_to_origin_at: null,
    indexed_in_video_viewing_area_at: null,
    saved_to_google_workspace_at: null,
    video_viewing_area_visible: renderStatus === "complete",
    primary_viewing_area_visible: viewingAreaStatuses.includes(renderStatus),
    validation_status: "valid",
    readiness_score: Number(input.readinessScore || 86),
    hot_storage_expires_at: migrationDueAt,
    migration_due_at: migrationDueAt,
    migrated_to_google_at: null,
    archive_status: type === "video" ? "hot" : "not_required",
    scanner_recommended: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  state.media.unshift(media);
  audit(state, actor, "media.created", id, `${media.title} created in ${state.operatingMode} mode. Render #${media.render_sequence || "n/a"}.`);

  if (media.publish_status === "queued") {
    queuePublish(state, id, media.target_platforms_json, actor);
  }

  writeState(state);
  persistMediaAsset(media);
  return media;
}

function normalizeIncomingBrandProfile(profile = {}) {
  return {
    id: profile.id || "",
    profileName: profile.profileName || "",
    publicBrandName: profile.publicBrandName || profile.companyName || "",
    brandVoice: profile.brandVoice || "",
    approvedCtas: Array.isArray(profile.approvedCtas) ? profile.approvedCtas : [],
    requiredDisclaimers: Array.isArray(profile.requiredDisclaimers) ? profile.requiredDisclaimers : [],
    restrictedClaims: Array.isArray(profile.restrictedClaims) ? profile.restrictedClaims : [],
    approvedClaims: Array.isArray(profile.approvedClaims) ? profile.approvedClaims : []
  };
}

function enforceBrandProfileOnText(text = "", brandProfile = {}) {
  const lines = [String(text || "").trim()].filter(Boolean);
  const disclaimer = (brandProfile.requiredDisclaimers || []).find(Boolean);
  if (disclaimer && !lines.join(" ").toLowerCase().includes(String(disclaimer).toLowerCase())) {
    lines.push(disclaimer);
  }
  return lines.join("\n\n") || "Untitled media output";
}

function buildBuyNowBlock(productUrl = "", brandProfile = {}) {
  const message = "Please click link to get all the product information you need to know";
  const label = (brandProfile.approvedCtas || []).find((cta) => /shop|buy|order|explore/i.test(cta)) || "Buy Now";
  return {
    label,
    url: productUrl,
    message,
    messageLines: ["Please click link to get all the", "product information you need to know"],
    alignment: "center",
    requiredForRenderedMedia: true
  };
}

function attachRenderedMedia(mediaId, rendered = {}, actor = "render-provider") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");

  const mediaUrl = rendered.mediaUrl || rendered.videoUrl || rendered.playbackUrl || "";
  const thumbnailUrl = rendered.thumbnailUrl || rendered.posterUrl || "";
  if (!isExternalMediaUrl(mediaUrl)) throw new Error("A direct rendered video URL is required.");

  media.playback_url = mediaUrl;
  media.preview_url = thumbnailUrl || mediaUrl;
  media.thumbnail_url = thumbnailUrl || media.thumbnail_url || "";
  media.hot_storage_reference = mediaUrl;
  media.file_size_bytes = Number(rendered.fileSizeBytes || media.file_size_bytes || 0);
  media.duration_seconds = Number(rendered.durationSeconds || rendered.duration || media.duration_seconds || 0);
  media.width = Number(rendered.width || media.width || 0);
  media.height = Number(rendered.height || media.height || 0);
  media.storage_location = rendered.storageLocation || media.storage_location || "hot";
  media.archive_status = "hot";
  media.render_status = "complete";
  media.last_render_error = "";
  media.error_code = "";
  media.retry_eligible = false;
  media.rework_eligible = false;
  media.render_job_id = rendered.renderJobId || rendered.jobId || media.render_job_id || "";
  media.provider_render_job_id = rendered.providerJobId || rendered.provider_job_id || media.provider_render_job_id || "";
  media.validation_status = rendered.validationStatus || media.validation_status || "valid";
  media.quality_score = Number(rendered.qualityScore || media.quality_score || 0);
  media.quality_status = rendered.qualityStatus || media.quality_status || "Needs Review";
  media.quality_checked_at = rendered.qualityCheckedAt || new Date().toISOString();
  media.quality_json = rendered.quality || media.quality_json || {};
  if (media.quality_status !== "Approved") media.validation_status = "review";
  media.readiness_score = Number(rendered.qualityScore || media.readiness_score || 86);
  media.updated_at = new Date().toISOString();
  media.metadata_json = {
    ...(media.metadata_json || {}),
    renderedMediaUrl: mediaUrl,
    renderedThumbnailUrl: thumbnailUrl,
    renderJobId: media.render_job_id,
    providerRenderJobId: media.provider_render_job_id,
    ctaWindowSeconds: Number(rendered.ctaWindowSeconds || media.metadata_json?.ctaWindowSeconds || 9)
  };
  routeCompletedMedia(state, media, rendered);

  audit(state, actor, "render.completed.media.attached", mediaId, `Rendered video URL attached to ${media.title}.`);
  persistMediaAsset(media);
  return writeState(state);
}

function updateRenderLifecycle(mediaId, status, details = {}, actor = "system") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");
  const renderStatus = normalizeRenderStatus(status);
  media.render_status = renderStatus;
  media.render_job_id = details.renderJobId || details.jobId || media.render_job_id || "";
  media.provider_render_job_id = details.providerJobId || details.provider_job_id || media.provider_render_job_id || "";
  media.origin_section_id = normalizeOriginSectionId(details.originSectionId || details.origin_section_id || media.origin_section_id || media.metadata_json?.originSectionId || "evics-build");
  media.originating_request_id = details.originatingRequestId || details.originating_request_id || media.originating_request_id || "";
  media.agent_orchestration_id = details.agentOrchestrationId || details.agent_orchestration_id || media.agent_orchestration_id || "";
  media.last_render_error = renderStatus === "failed" ? (details.error || media.last_render_error || "Render failed.") : "";
  media.error_code = renderStatus === "failed" ? (details.errorCode || details.error_code || media.error_code || "RENDER_FAILED") : "";
  media.retry_eligible = renderStatus === "failed" ? details.retryEligible !== false : Boolean(details.retryEligible);
  media.rework_eligible = renderStatus === "failed" ? details.reworkEligible !== false : Boolean(details.reworkEligible);
  media.primary_viewing_area_visible = viewingAreaStatuses.includes(renderStatus);
  media.video_viewing_area_visible = renderStatus === "complete";
  media.delivery_status = renderStatus === "complete"
    ? media.delivery_status === "delivered" ? "delivered" : "pending_delivery"
    : renderStatus === "failed" ? "render_failed" : renderStatus;
  media.render_metadata_json = {
    ...(media.render_metadata_json || {}),
    ...(details.metadata || {}),
    provider: details.provider || media.render_metadata_json?.provider || "",
    updatedBy: actor
  };
  media.updated_at = new Date().toISOString();
  audit(state, actor, `render.${renderStatus}`, mediaId, details.error || details.message || "");
  persistMediaAsset(media);
  return writeState(state);
}

function updateMediaMetadata(mediaId, patch = {}, actor = "system") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");

  media.title = patch.title || media.title;
  media.description = patch.description || media.description;
  media.product_url = patch.productUrl || patch.product_url || media.product_url;
  media.metadata_json = {
    ...(media.metadata_json || {}),
    ...(patch.metadata || {}),
    ...(patch.metadata_json || {})
  };
  media.updated_at = new Date().toISOString();
  audit(state, actor, "media.metadata.updated", mediaId, patch.note || "Media metadata updated.");
  persistMediaAsset(media);
  return writeState(state);
}

function normalizeOriginSectionId(value = "") {
  return String(value || "evics-build").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/(^-|-$)/g, "") || "evics-build";
}

function normalizeRenderStatus(status = "") {
  const value = String(status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (["queued", "rendering", "complete", "failed", "rework", "initialized"].includes(value)) return value;
  if (["completed", "render_complete", "success", "succeeded"].includes(value)) return "complete";
  if (["render_failed", "error", "errored"].includes(value)) return "failed";
  if (["rework_requested", "needs_rework"].includes(value)) return "rework";
  return "initialized";
}

function buildDeliveryDestinations(originSectionId) {
  return {
    originSection: {
      id: originSectionId,
      delivered: false,
      status: "pending",
      deliveredAt: null,
      error: ""
    },
    videoViewingArea: {
      delivered: false,
      status: "pending",
      deliveredAt: null,
      error: ""
    },
    googleWorkspace: {
      delivered: false,
      status: "pending",
      deliveredAt: null,
      reference: "",
      error: ""
    }
  };
}

function routeCompletedMedia(state, media, rendered = {}) {
  const now = new Date().toISOString();
  const destinations = {
    ...buildDeliveryDestinations(media.origin_section_id),
    ...(media.delivery_destinations_json || {})
  };
  const errors = [];

  destinations.originSection = {
    ...(destinations.originSection || {}),
    id: media.origin_section_id,
    delivered: Boolean(media.origin_section_id),
    status: media.origin_section_id ? "delivered" : "failed",
    deliveredAt: media.origin_section_id ? now : null,
    error: media.origin_section_id ? "" : "Missing origin_section_id."
  };
  if (!media.origin_section_id) errors.push(destinations.originSection.error);

  destinations.videoViewingArea = {
    ...(destinations.videoViewingArea || {}),
    delivered: true,
    status: "delivered",
    deliveredAt: now,
    error: ""
  };

  const storage = rendered.storage || {};
  const googleDelivered = Boolean(storage.googleWorkspaceFileId || storage.googleDriveFileId || storage.storageMode === "google_workspace_saved" || storage.storageMode === "google_workspace_ready");
  destinations.googleWorkspace = {
    ...(destinations.googleWorkspace || {}),
    delivered: googleDelivered,
    status: googleDelivered ? "delivered" : "failed",
    deliveredAt: googleDelivered ? now : null,
    reference: storage.googleWorkspaceFileId || storage.googleDriveFileId || storage.id || media.google_drive_file_id || "",
    error: googleDelivered ? "" : "Google Workspace storage did not complete; local registry retained the video."
  };
  if (!googleDelivered) errors.push(destinations.googleWorkspace.error);
  if (googleDelivered) {
    media.google_drive_file_id = destinations.googleWorkspace.reference || media.google_drive_file_id || "";
    media.google_drive_web_view_link = storage.googleWorkspaceWebViewLink || storage.googleDriveWebViewLink || media.google_drive_web_view_link || "";
    media.storage_location = "google_workspace";
    media.archive_status = "migrated";
  }

  media.delivery_destinations_json = destinations;
  media.delivery_errors_json = errors;
  media.routed_to_origin_at = destinations.originSection.deliveredAt;
  media.indexed_in_video_viewing_area_at = destinations.videoViewingArea.deliveredAt;
  media.saved_to_google_workspace_at = destinations.googleWorkspace.deliveredAt;
  media.delivery_status = errors.length ? "partial" : "delivered";
  media.primary_viewing_area_visible = true;
  media.video_viewing_area_visible = true;

  ["originSection", "videoViewingArea", "googleWorkspace"].forEach((destination) => {
    const record = destinations[destination] || {};
    persistence.upsertRecord("delivery_records", {
      id: `${media.id}-${destination}`,
      mediaId: media.id,
      origin_section_id: media.origin_section_id,
      destination,
      delivered: Boolean(record.delivered),
      status: record.status || "pending",
      reference: record.reference || "",
      error: record.error || "",
      deliveredAt: record.deliveredAt || null
    });
  });
}

function persistMediaAsset(media) {
  persistence.upsertRecord("media_assets", {
    id: media.id,
    title: media.title,
    origin_section_id: media.origin_section_id,
    originating_request_id: media.originating_request_id,
    agent_orchestration_id: media.agent_orchestration_id,
    render_status: media.render_status,
    render_job_id: media.render_job_id,
    provider_render_job_id: media.provider_render_job_id,
    error_code: media.error_code || "",
    retry_eligible: Boolean(media.retry_eligible),
    rework_eligible: Boolean(media.rework_eligible),
    delivery_status: media.delivery_status,
    delivery_destinations_json: media.delivery_destinations_json,
    product_url: media.product_url,
    playback_url: media.playback_url,
    preview_url: media.preview_url,
    google_drive_file_id: media.google_drive_file_id,
    google_drive_web_view_link: media.google_drive_web_view_link,
    updatedAt: media.updated_at,
    createdAt: media.created_at
  });
}

function seedDemoMedia(actor = "system") {
  const state = readState();
  const existing = state.media.filter((item) => item.metadata_json?.demoSeed === true);
  if (existing.length >= 2) return writeState(state);

  writeState(state);
  createMedia({
    title: "Genesis Performance UGC Video",
    description: "Demo video output registered by EVICS.",
    campaignId: "genesis-demo",
    mediaType: "video",
    productUrl: "https://iamgenesistech.myshopify.com/products/horny-goat-weed-blend",
    durationSeconds: 30,
    width: 1080,
    height: 1920,
    metadata: { demoSeed: true, structure: "hook-problem-solution-cta" },
    tags: ["demo", "ugc", "performance"]
  }, actor);
  createMedia({
    title: "Wellness Founder Story Video",
    description: "Second demo video output registered by EVIE.",
    campaignId: "founder-story",
    mediaType: "video",
    productUrl: "https://iamgenesistech.myshopify.com/products/male-enhancement-or-boost",
    durationSeconds: 45,
    width: 1080,
    height: 1920,
    metadata: { demoSeed: true, structure: "founder-story-proof-offer" },
    tags: ["demo", "founder", "wellness"]
  }, actor);
  return readState();
}

function applyMediaAction(action, ids = [], options = {}, actor = "owner-admin") {
  const state = readState();
  const targets = new Set(ids);
  const changed = [];

  state.media = state.media.map((item) => {
    if (!targets.has(item.id)) return item;
    const next = { ...item, updated_at: new Date().toISOString() };

    if (action === "approve") {
      if (next.approval_status === "approved") {
        changed.push(next.id);
        return next;
      }
      if (!["pending", "rejected"].includes(next.approval_status)) throw new Error("Invalid approval transition.");
      if (next.media_type === "video" && !hasReviewableMediaUrl(next)) throw new Error("A real provider preview URL is required before approval.");
      ensureEliteQualityGate(next, state, "approve");
      next.approval_status = "approved";
      next.approved_by = actor;
      next.approved_at = new Date().toISOString();
      if (next.publish_status === "draft") next.publish_status = "ready";
    } else if (action === "reject" || action === "discard") {
      if (next.publish_status === "published") throw new Error("Published media cannot be rejected.");
      const countDiscard = next.media_type === "video" && next.approval_status !== "rejected";
      next.approval_status = "rejected";
      next.rejection_reason = options.reason || (action === "discard" ? "Discarded by owner/admin." : "Rejected by owner/admin.");
      next.publish_status = "blocked";
      next.render_status = "rework";
      next.primary_viewing_area_visible = true;
      next.video_viewing_area_visible = false;
      next.delivery_status = "rework";
      if (countDiscard) {
        const discardMeta = incrementRenderCounter(state, "discarded", new Date());
        next.metadata_json = {
          ...(next.metadata_json || {}),
          discardCounter: {
            at: new Date().toISOString(),
            dayKey: discardMeta.keys.day,
            weekKey: discardMeta.keys.week,
            monthKey: discardMeta.keys.month,
            yearKey: discardMeta.keys.year
          }
        };
      }
    } else if (action === "queue_publish") {
      if (next.approval_required && next.approval_status !== "approved") throw new Error("Approval is required before queueing.");
      if (!hasReviewableMediaUrl(next)) throw new Error("A real provider preview URL is required before queueing publish.");
      ensureEliteQualityGate(next, state, "queue publish");
      next.publish_status = "queued";
      queuePublish(state, next.id, options.platforms || next.target_platforms_json, actor);
    } else if (action === "publish_now") {
      if (next.approval_required && next.approval_status !== "approved") throw new Error("Approval is required before publishing.");
      if (!hasReviewableMediaUrl(next)) throw new Error("A real provider preview URL is required before publishing.");
      ensureEliteQualityGate(next, state, "publish");
      next.publish_status = "published";
      queuePublish(state, next.id, options.platforms || next.target_platforms_json, actor, "published");
    } else if (action === "cancel_queued") {
      if (next.publish_status !== "queued") throw new Error("Only queued media can be cancelled.");
      next.publish_status = "ready";
      state.dispatches = state.dispatches.map((dispatch) => dispatch.media_id === next.id && dispatch.status === "queued" ? { ...dispatch, status: "cancelled" } : dispatch);
    } else if (action === "re_queue_render") {
      next.render_status = "queued";
      next.last_render_error = "";
      next.error_code = "";
      next.retry_eligible = false;
      audit(state, actor, "render.re_queued", next.id, "Manually re-queued from failed state.");
    } else if (action === "archive") {
      archiveToGoogleWorkspace(state, next, actor, Boolean(options.override));
    } else if (action === "duplicate") {
      const duplicate = { ...next, id: `media-${Date.now()}-copy`, title: `${next.title} Copy`, publish_status: "draft", approval_status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      state.media.unshift(duplicate);
      audit(state, actor, "media.duplicated", duplicate.id, `Duplicated from ${next.id}.`);
    }

    changed.push(next.id);
    audit(state, actor, `media.${action}`, next.id, options.reason || "");
    return next;
  });

  return writeState(state);
}

function hasReviewableMediaUrl(media = {}) {
  return isExternalMediaUrl(media.preview_url) || isExternalMediaUrl(media.playback_url) || isExternalMediaUrl(media.hot_storage_reference);
}

function hasNarrationDirectionLeak(value = "") {
  const text = String(value || "").toLowerCase();
  return /\[[0-9]+\s*-\s*[0-9]+s\]|on-screen line|visual format guidance|scene instructions?|camera instructions?/i.test(text);
}

function ensureEliteQualityGate(media = {}, state = {}, action = "approve") {
  if (media.media_type !== "video") return;
  if (!hasReviewableMediaUrl(media)) throw new Error("A real provider preview URL is required before approval workflow.");

  // H.A.V.E. governance gate — all 4 pillars must pass before approve/publish
  const haveResult = runHaveGate(media);
  if (!haveResult.passed) {
    throw new Error(`H.A.V.E. governance gate blocked ${action}. ${haveResult.verdict}`);
  }

  const sourceViralUrl = String(media.metadata_json?.sourceViralUrl || media.metadata_json?.source_viral_url || "").trim();
  if (!sourceViralUrl) {
    throw new Error(`Evidence gate blocked ${action}. Source viral video URL is required for VP and Board comparison.`);
  }
  const productName = String(media.metadata_json?.productName || "").trim();
  const productImageUrl = String(media.metadata_json?.productImageUrl || "").trim();
  if (!productName || !productImageUrl) {
    throw new Error(`Product visibility gate blocked ${action}. Matched product name and image evidence are required.`);
  }

  const qualityScore = Number(media.quality_score || 0);
  const qualityStatus = String(media.quality_status || "");
  if (!qualityScore || !qualityStatus) {
    throw new Error(`Quality gate incomplete. Run /api/media/${media.id}/quality-check before ${action}.`);
  }
  if (qualityStatus !== "Approved" || qualityScore < 82) {
    throw new Error(`Quality gate blocked ${action}. Current quality is ${qualityStatus || "Unknown"} (${qualityScore}). Requires Approved at >=82.`);
  }
  if (String(media.validation_status || "valid") !== "valid") {
    throw new Error(`Validation gate blocked ${action}. Current validation status is ${media.validation_status || "unknown"}.`);
  }

  const verPolicy = { ...defaultVerPolicy(), ...((state && state.verPolicy) || {}) };
  const verAssessment = calculateVerScore(media, verPolicy);
  media.metadata_json = {
    ...(media.metadata_json || {}),
    verAssessment: {
      score: verAssessment.score,
      threshold: verAssessment.threshold,
      passed: verAssessment.passed,
      category: verPolicy.category,
      checkedAt: new Date().toISOString()
    }
  };
  if (!verAssessment.passed) {
    throw new Error(`VER gate blocked ${action}. Score ${verAssessment.score} is below threshold ${verAssessment.threshold}.`);
  }

  const spoken = String(media.metadata_json?.spokenScript || media.metadata_json?.voiceoverScript || "");
  if (spoken && hasNarrationDirectionLeak(spoken)) {
    throw new Error(`Narration safety gate blocked ${action}. Spoken script still contains stage directions.`);
  }
}

function queuePublish(state, mediaId, targetPlatforms = [], actor = "system", status = "queued") {
  targetPlatforms.forEach((platform) => {
    const normalized = platforms.includes(platform) ? platform : String(platform || "Unknown");
    const existing = state.dispatches.find((item) => item.media_id === mediaId && item.platform === normalized && ["queued", "published"].includes(item.status));
    if (existing) return;
    state.dispatches.unshift({
      id: `dispatch-${Date.now()}-${state.dispatches.length}`,
      media_id: mediaId,
      platform: normalized,
      provider: normalized.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      status,
      attempts: status === "published" ? 1 : 0,
      last_error: "",
      queued_at: new Date().toISOString(),
      published_at: status === "published" ? new Date().toISOString() : null,
      actor
    });
  });
}

function archiveToGoogleWorkspace(state, media, actor = "owner-admin", override = false) {
  if (media.media_type !== "video") throw new Error("Only video outputs use the 36-hour Google Workspace archive lifecycle.");
  if (media.migrated_to_google_at) return media;
  if (!override && media.migration_due_at && new Date(media.migration_due_at) > new Date()) {
    throw new Error("Video migration is not due yet. Use override to force migration.");
  }

  const folder = resolveGoogleFolder(state, media);
  media.google_drive_folder_id = folder.folderId;
  media.google_drive_file_id = `mock-drive-${media.id}`;
  media.google_drive_web_view_link = `https://drive.google.com/file/d/${media.google_drive_file_id}/view`;
  media.storage_location = "google_workspace";
  media.archive_status = "migrated";
  media.migrated_to_google_at = new Date().toISOString();
  media.hot_storage_reference = media.hot_storage_reference || "";
  media.playback_url = media.google_drive_web_view_link || media.playback_url || buildPlaybackUrl(media.id);
  media.preview_url = media.google_drive_web_view_link || media.preview_url || buildPreviewUrl(media.id);
  audit(state, actor, override ? "archive.override" : "archive.auto", media.id, `Moved to ${folder.path}.`);
  return media;
}

function resolveGoogleFolder(state, media) {
  const date = new Date(media.created_at || Date.now());
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const campaign = media.campaign_id && media.campaign_id !== "unassigned" ? slug(media.campaign_id) : "Unassigned";
  const pathValue = media.campaign_id && media.campaign_id !== "unassigned"
    ? `EVICS/Campaigns/${campaign}/${year}/${month}/videos`
    : `EVICS/Unassigned/${year}/${month}/videos`;

  if (!state.folderCache[pathValue]) {
    state.folderCache[pathValue] = `mock-folder-${Object.keys(state.folderCache).length + 1}`;
  }

  return {
    path: pathValue,
    folderId: state.folderCache[pathValue]
  };
}

function runScanner(actor = "scanner") {
  const state = readState();
  if (!state.scanner.enabled) throw new Error("Scanner is disabled.");
  const run = {
    id: `scan-${Date.now()}`,
    status: "completed",
    scope: state.scanner.scope,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    findingCount: 0
  };
  const findings = [];

  state.media.forEach((media) => {
    if (media.media_type === "video" && media.archive_status === "hot") {
      findings.push(finding(run.id, media.id, "storage", "Video is in hot storage and has a Google Workspace migration lifecycle.", "medium"));
    }
    if (media.readiness_score < 80) {
      findings.push(finding(run.id, media.id, "readiness", "Readiness score is below publishing standard.", "high"));
    }
    if (media.approval_required && media.approval_status === "pending") {
      findings.push(finding(run.id, media.id, "approval", "Owner/admin approval is needed before dissemination.", "medium"));
    }
  });

  run.findingCount = findings.length;
  state.scanRuns.unshift(run);
  state.findings = [...findings, ...state.findings].slice(0, 500);
  state.scanner.lastRunAt = run.completedAt;
  state.scanner.status = `Completed with ${findings.length} findings.`;
  audit(state, actor, "scanner.run", "", state.scanner.status);
  return writeState(state);
}

function finding(runId, mediaId, category, message, severity) {
  return {
    id: `finding-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    scan_run_id: runId,
    media_id: mediaId,
    category,
    message,
    severity,
    status: "open",
    created_at: new Date().toISOString()
  };
}

function runDueArchive(actor = "archive-worker") {
  const state = readState();
  let archived = 0;
  state.media = state.media.map((media) => {
    if (media.media_type === "video" && !media.migrated_to_google_at && media.migration_due_at && new Date(media.migration_due_at) <= new Date()) {
      archiveToGoogleWorkspace(state, media, actor, false);
      archived += 1;
    }
    return media;
  });
  audit(state, actor, "archive.due.run", "", `${archived} videos archived.`);
  return writeState(state);
}

function exportToProvider(provider, ids = [], actor = "owner-admin") {
  const state = readState();
  const allowed = ["Canva", "HeyGen", "Runway", "Kling"];
  if (!allowed.includes(provider)) throw new Error("Unsupported export provider.");
  const connected = providerIsConfigured(provider);
  ids.forEach((id) => {
    const media = state.media.find((item) => item.id === id);
    if (!media) return;
    state.providerJobs.unshift({
      id: `provider-${Date.now()}-${state.providerJobs.length}`,
      media_id: id,
      provider,
      type: provider === "Canva" ? "static_brief_export" : "video_render_brief",
      status: connected ? "ready_for_provider" : "mock_ready",
      credentialMode: connected ? "connected" : "mock_or_fallback",
      payload: {
        title: media.title,
        campaign: media.campaign_id,
        mediaType: media.media_type,
        prompt: `Prepare ${provider} production package for ${media.title}.`
      },
      createdAt: new Date().toISOString(),
      actor
    });
    audit(state, actor, `provider.${provider.toLowerCase()}.queued`, id, connected ? `${provider} provider package prepared with active credentials.` : `${provider} fallback job created.`);
  });
  return writeState(state);
}

function retryDispatch(ids = [], actor = "owner-admin") {
  const state = readState();
  const targets = new Set(ids);
  state.dispatches = state.dispatches.map((dispatch) => {
    if (!targets.has(dispatch.id) && !targets.has(dispatch.media_id)) return dispatch;
    audit(state, actor, "dispatch.retry", dispatch.media_id, `${dispatch.platform} retry queued.`);
    return {
      ...dispatch,
      status: "queued",
      attempts: Number(dispatch.attempts || 0) + 1,
      last_error: "",
      queued_at: new Date().toISOString()
    };
  });
  return writeState(state);
}

function recordAnalytics(mediaId, metrics = {}, actor = "analytics-loop") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");
  const record = {
    id: `metric-${Date.now()}-${state.analytics.length}`,
    media_id: mediaId,
    views: Number(metrics.views || 0),
    clicks: Number(metrics.clicks || 0),
    add_to_cart: Number(metrics.addToCart || metrics.add_to_cart || 0),
    conversions: Number(metrics.conversions || 0),
    revenue: Number(metrics.revenue || 0),
    source: metrics.source || "mock_analytics",
    render_counter_sequence: Number(media.render_sequence || 0),
    render_counter_snapshot: state.renderCounter || defaultRenderCounter(),
    recorded_at: new Date().toISOString()
  };
  state.analytics.unshift(record);
  audit(state, actor, "analytics.recorded", mediaId, `${record.views} views, ${record.revenue} revenue.`);
  return writeState(state);
}

function validateCompliance(mediaId, actor = "compliance-agent") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");
  const text = `${media.title} ${media.description} ${JSON.stringify(media.metadata_json || {})}`.toLowerCase();
  const blocked = state.complianceRules.filter((rule) => rule.type === "blocked" && text.includes(rule.phrase.toLowerCase()));
  const hasDisclaimer = text.includes("food and drug administration") || media.metadata_json?.complianceDisclaimer === true;
  media.validation_status = blocked.length || !hasDisclaimer ? "review" : "valid";
  if (!hasDisclaimer) {
    media.metadata_json = {
      ...media.metadata_json,
      recommendedDisclaimer: "These statements have not been evaluated by the Food and Drug Administration."
    };
  }
  audit(state, actor, "compliance.validated", mediaId, blocked.length ? `${blocked.length} blocked phrases found.` : media.validation_status);
  return writeState(state);
}

function saveQualityCheck(mediaId, quality = {}, actor = "quality-agent") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");
  media.quality_score = Number(quality.qualityScore || 0);
  media.quality_status = quality.status || "Needs Review";
  media.quality_checked_at = quality.checkedAt || new Date().toISOString();
  media.quality_json = quality;
  media.validation_status = media.quality_status === "Approved" ? "valid" : "review";
  media.updated_at = new Date().toISOString();
  audit(state, actor, "quality.checked", mediaId, `${media.quality_status} / ${media.quality_score}`);
  return writeState(state);
}

function saveHaveCheck(mediaId, haveResult = {}, actor = "have-gate") {
  const state = readState();
  const media = state.media.find((item) => item.id === mediaId);
  if (!media) throw new Error("Media output not found.");
  media.have_passed = Boolean(haveResult.passed);
  media.have_score = Number(haveResult.score || 0);
  media.have_pillars = haveResult.pillars || {};
  media.have_verdict = haveResult.verdict || "";
  media.have_checked_at = haveResult.checkedAt || new Date().toISOString();
  if (!media.metadata_json) media.metadata_json = {};
  media.metadata_json.haveAssessment = {
    passed: haveResult.passed,
    score: haveResult.score,
    maxScore: 4,
    verdict: haveResult.verdict,
    pillars: haveResult.pillars,
    checkedAt: haveResult.checkedAt
  };
  media.updated_at = new Date().toISOString();
  audit(state, actor, haveResult.passed ? "have.passed" : "have.failed", mediaId, haveResult.verdict || "");
  return writeState(state);
}

function sendSmsAlert(message, actor = "alert-agent") {
  const state = readState();
  const connected = twilioIsConfigured();
  const alert = {
    id: `alert-${Date.now()}-${state.alerts.length}`,
    channel: "sms",
    provider: "Twilio",
    status: connected ? "ready_for_provider" : "mock_ready",
    credentialMode: connected ? "connected" : "mock_or_fallback",
    message: String(message || "EVICS alert"),
    createdAt: new Date().toISOString(),
    actor
  };
  state.alerts.unshift(alert);
  audit(state, actor, connected ? "alert.sms.queued" : "alert.sms.mocked", "", alert.message);
  return writeState(state);
}

function slug(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

module.exports = {
  modes,
  mediaTypes,
  platforms,
  readState,
  setOperatingMode,
  updateScannerSettings,
  updateVerPolicy,
  createMedia,
  updateMediaMetadata,
  updateRenderLifecycle,
  seedDemoMedia,
  applyMediaAction,
  runScanner,
  runDueArchive,
  exportToProvider,
  retryDispatch,
  recordAnalytics,
  validateCompliance,
  saveQualityCheck,
  sendSmsAlert,
  attachRenderedMedia,
  calculateVerScore,
  saveHaveCheck
};
