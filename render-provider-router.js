const mediaOps = require("./media-ops");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const persistence = require("./evics-persistence");
const { runQualityCheck } = require("./quality-checker");
const { saveCompletedMedia } = require("./storage-router");
const { buildTwinDirective } = require("./twin-agent-directives");
const { HeygenAdapter } = require("./render-provider-adapters");

const providerConfig = {
  heygen: { name: "HeyGen", keys: ["HEYGEN_API_KEY"], kind: "video" },
  runway: { name: "Runway", keys: ["RUNWAY_API_KEY"], kind: "video" },
  kling: { name: "Kling", keys: ["KLING_API_KEY", "KLING_SECRET_KEY"], kind: "video" },
  canva: { name: "Canva", keys: ["CANVA_API_KEY", "CANVA_TOKEN"], kind: "design" },
  predis: { name: "Predis AI", keys: ["PREDIS_API_KEY"], kind: "social_media" },
  opusclip: { name: "OpusClip", keys: ["OPUSCLIP_API_KEY"], kind: "video_edit" },
  openai: { name: "OpenAI", keys: ["OPENAI_API_KEY"], kind: "generation" }
};

const renderJobs = new Map();
const providerAuthState = new Map();
let renderJobCounter = 0;
const renderSessionId = crypto.randomBytes(4).toString("hex");
const finishedProviderStatuses = new Set(["complete", "completed", "success", "succeeded", "finished", "done"]);
const failedProviderStatuses = new Set(["failed", "failure", "error", "errored", "cancelled", "canceled"]);
const providerAuthCooldownMs = Math.max(60_000, Number(process.env.EVICS_PROVIDER_AUTH_COOLDOWN_MS || 600_000));

class ProviderRequestError extends Error {
  constructor(message, statusCode = 0, details = null) {
    super(message);
    this.name = "ProviderRequestError";
    this.statusCode = Number(statusCode || 0);
    this.details = details;
  }
}

function providerDefinition(provider) {
  return providerConfig[String(provider || "").toLowerCase()] || null;
}

function providerKey(provider) {
  return String(provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function activeProviderAuthState(key) {
  const state = providerAuthState.get(key);
  if (!state) return null;
  const ageMs = Date.now() - Number(state.at || 0);
  if (ageMs > providerAuthCooldownMs) {
    providerAuthState.delete(key);
    return null;
  }
  return state;
}

function markProviderAuthFailure(key, error) {
  providerAuthState.set(key, {
    status: "auth_failed",
    statusCode: Number(error?.statusCode || 0),
    error: String(error?.message || "Provider authorization failed."),
    at: Date.now()
  });
}

function clearProviderAuthFailure(key) {
  if (!key) return;
  providerAuthState.delete(key);
}

function configuredValue(key) {
  const direct = String(process.env[key] || "").trim();
  if (direct) return direct;

  if (key === "HEYGEN_RENDER_PAYLOAD_JSON") {
    const templatePath = String(process.env.HEYGEN_RENDER_PAYLOAD_FILE || "").trim();
    if (!templatePath) return "";
    const absolutePath = path.isAbsolute(templatePath)
      ? templatePath
      : path.join(__dirname, templatePath);
    try {
      return fs.readFileSync(absolutePath, "utf8").trim();
    } catch {
      return "";
    }
  }

  return "";
}

function isConfigured(definition) {
  return Boolean(definition && definition.keys.some((key) => configuredValue(key)));
}

function providerReadiness(provider) {
  const definition = providerDefinition(provider);
  if (!definition) {
    return {
      configured: false,
      ready: false,
      error: "Unsupported render provider.",
      missing: []
    };
  }

  const configured = isConfigured(definition);
  if (!configured) {
    return {
      configured: false,
      ready: false,
      error: `${definition.name} is not configured. Add ${definition.keys.join(" or ")} to enable live rendering.`,
      missing: definition.keys
    };
  }

  if (providerKey(definition.name) === "heygen" && !configuredValue("HEYGEN_RENDER_PAYLOAD_JSON") && (!configuredValue("HEYGEN_AVATAR_ID") || !configuredValue("HEYGEN_VOICE_ID"))) {
    return { ...heygenAdapter().validateConfig(), errorCode: "MISSING_RENDER_CONFIG" };
  }

  const authState = activeProviderAuthState(providerKey(definition.name));
  if (authState?.status === "auth_failed") {
    return {
      configured: true,
      ready: false,
      error: `${definition.name} authorization failed recently (${authState.statusCode || 401}). Update credentials and retry.`,
      errorCode: "PROVIDER_AUTH_FAILED",
      missing: [],
      auth: authState
    };
  }

  return {
    configured: true,
    ready: true,
    error: "",
    errorCode: "",
    missing: []
  };
}

function providerReadinessReport(provider = "") {
  if (provider) {
    return {
      provider: providerKey(provider),
      readiness: providerReadiness(provider)
    };
  }

  return Object.keys(providerConfig).map((key) => ({
    provider: key,
    readiness: providerReadiness(key)
  }));
}

async function submitRender(provider, input = {}, actor = "owner-admin") {
  const definition = providerDefinition(provider);
  if (!definition) {
    return { success: false, status: "failed", error: "Unsupported render provider.", retryable: false };
  }

  const state = mediaOps.readState();
  const media = state.media.find((item) => item.id === input.mediaId) || state.media[0] || {};
  const readiness = providerReadiness(provider);
  const configured = readiness.ready;
  const providerSlug = definition.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const jobId = `${providerSlug}-${renderSessionId}-${renderJobCounter++}`;
  const job = {
    jobId,
    provider: definition.name,
    providerKey: providerKey(provider),
    providerJobId: "",
    mediaId: media.id || input.mediaId || "",
    originSectionId: input.originSectionId || input.origin_section_id || media.origin_section_id || media.metadata_json?.originSectionId || "render-queue",
    status: configured ? "created" : "provider_failed",
    lifecycle: configured ? "created" : "provider_failed",
    configured,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    actor,
    error: configured ? "" : readiness.error,
    error_code: configured ? "" : readiness.errorCode || "MISSING_RENDER_CONFIG",
    retryable: !configured,
    retry_eligible: !configured,
    rework_eligible: !configured,
    outputMediaUrl: "",
    thumbnailUrl: "",
    providerMetadata: {
      mode: configured ? "live_provider_submit" : "configuration_blocked",
      readiness,
      note: configured
        ? "EVICS submits to the provider and polls until a direct playable media URL is returned."
        : "Provider not configured. EVICS blocked fake render completion."
    },
    twinDirective: buildTwinDirective({ taskId: jobId }, media, definition.name)
  };

  renderJobs.set(jobId, job);
  persistRenderJob(job);
  if (job.mediaId) {
    mediaOps.updateRenderLifecycle(job.mediaId, configured ? "queued" : "failed", {
      renderJobId: job.jobId,
      provider: job.provider,
      originSectionId: job.originSectionId,
      error: job.error,
      errorCode: job.error_code,
      retryEligible: job.retry_eligible,
      reworkEligible: job.rework_eligible,
      metadata: job.providerMetadata
    }, actor);
  }

  if (!configured) {
    mediaOps.exportToProvider(definition.name, media.id ? [media.id] : [], actor);
    persistence.logAgentEvent({
      type: "twin_agent.render_config_missing",
      actor,
      mediaId: job.mediaId,
      renderJobId: job.jobId,
      lifecycle: job.lifecycle,
      status: job.status,
      error_code: job.error_code,
      message: job.error,
      metadata: { provider: job.provider, missing: readiness.missing }
    });
    return { success: true, job };
  }

  try {
    const submitted = await submitProviderJob(definition, media, input, job);
    clearProviderAuthFailure(job.providerKey);
    job.providerJobId = submitted.providerJobId || "";
    job.status = submitted.status || "submitted_to_renderer";
    job.lifecycle = "submitted_to_renderer";
    job.providerMetadata = { ...job.providerMetadata, ...(submitted.metadata || {}) };
    job.updatedAt = new Date().toISOString();
    renderJobs.set(jobId, job);
    persistRenderJob(job);
    if (job.mediaId) {
      mediaOps.updateRenderLifecycle(job.mediaId, "rendering", {
        renderJobId: job.jobId,
        providerJobId: job.providerJobId,
        provider: job.provider,
        originSectionId: job.originSectionId,
        metadata: job.providerMetadata
      }, actor);
    }
    mediaOps.exportToProvider(definition.name, media.id ? [media.id] : [], actor);
    return { success: true, job };
  } catch (error) {
    const providerAuthFailed = Number(error?.statusCode || 0) === 401 || Number(error?.statusCode || 0) === 403;
    if (providerAuthFailed) markProviderAuthFailure(job.providerKey, error);
    job.status = "provider_failed";
    job.lifecycle = "provider_failed";
    job.error = error.message || "Render provider submit failed.";
    job.error_code = providerAuthFailed ? "PROVIDER_AUTH_FAILED" : "RENDER_SUBMIT_FAILED";
    job.retryable = !providerAuthFailed;
    job.retry_eligible = !providerAuthFailed;
    job.rework_eligible = true;
    job.updatedAt = new Date().toISOString();
    renderJobs.set(jobId, job);
    persistRenderJob(job);
    if (job.mediaId) {
      mediaOps.updateRenderLifecycle(job.mediaId, "failed", {
        renderJobId: job.jobId,
        provider: job.provider,
        originSectionId: job.originSectionId,
        error: job.error,
        errorCode: job.error_code,
        retryEligible: job.retry_eligible,
        reworkEligible: true,
        metadata: job.providerMetadata
      }, actor);
    }
    return { success: false, status: job.status, error: job.error, retryable: job.retryable, job };
  }
}

async function getRenderStatus(provider, jobId) {
  const job = renderJobs.get(jobId);
  if (!job) return { success: false, error: "Render job not found.", status: "missing" };
  await pollRenderJob(job);
  return { success: true, job };
}

async function listRenderJobs() {
  const jobs = Array.from(renderJobs.values());
  await Promise.all(jobs.map((job) => pollRenderJob(job)));
  return Array.from(renderJobs.values()).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

async function pollRenderJob(job) {
  if (!job || !job.providerJobId || ["completed", "provider_failed", "failed", "failed_missing_media_url", "not_configured"].includes(job.status)) return job;

  try {
    const status = await pollProviderJob(job);
    if (!status) return job;

    job.updatedAt = new Date().toISOString();
    job.providerMetadata = { ...job.providerMetadata, ...(status.metadata || {}) };

    if (status.mediaUrl) {
      completeRender(job.providerKey, {
        jobId: job.jobId,
        status: "completed",
        mediaUrl: status.mediaUrl,
        thumbnailUrl: status.thumbnailUrl || "",
        metadata: status.metadata || {}
      });
    } else if (status.failed) {
      job.status = "failed";
      job.lifecycle = "provider_failed";
      job.error = status.error || "Render provider failed.";
      job.error_code = "PROVIDER_RENDER_FAILED";
      job.retryable = true;
      job.retry_eligible = true;
      job.rework_eligible = true;
      renderJobs.set(job.jobId, job);
      persistRenderJob(job);
      if (job.mediaId) {
        mediaOps.updateRenderLifecycle(job.mediaId, "failed", {
          renderJobId: job.jobId,
          providerJobId: job.providerJobId,
          provider: job.provider,
          originSectionId: job.originSectionId,
          error: job.error,
          errorCode: job.error_code,
          retryEligible: true,
          reworkEligible: true,
          metadata: job.providerMetadata
        }, "render-provider");
      }
    } else {
      job.status = status.status || job.status || "provider_processing";
      job.lifecycle = status.status || "provider_processing";
      renderJobs.set(job.jobId, job);
      persistRenderJob(job);
      if (job.mediaId) {
        mediaOps.updateRenderLifecycle(job.mediaId, "rendering", {
          renderJobId: job.jobId,
          providerJobId: job.providerJobId,
          provider: job.provider,
          originSectionId: job.originSectionId,
          metadata: job.providerMetadata
        }, "render-provider");
      }
    }
  } catch (error) {
    const providerAuthFailed = Number(error?.statusCode || 0) === 401 || Number(error?.statusCode || 0) === 403;
    if (providerAuthFailed) markProviderAuthFailure(job.providerKey, error);
    job.updatedAt = new Date().toISOString();
    job.status = "poll_error";
    job.lifecycle = "provider_failed";
    job.error = error.message || "Provider status polling failed.";
    job.error_code = providerAuthFailed ? "PROVIDER_AUTH_FAILED" : "PROVIDER_POLL_FAILED";
    job.retryable = !providerAuthFailed;
    job.retry_eligible = !providerAuthFailed;
    job.rework_eligible = true;
    renderJobs.set(job.jobId, job);
    persistRenderJob(job);
    if (job.mediaId) {
      mediaOps.updateRenderLifecycle(job.mediaId, "failed", {
        renderJobId: job.jobId,
        providerJobId: job.providerJobId,
        provider: job.provider,
        originSectionId: job.originSectionId,
        error: job.error,
        errorCode: job.error_code,
        retryEligible: job.retry_eligible,
        reworkEligible: true,
        metadata: job.providerMetadata
      }, "render-provider");
    }
  }

  return renderJobs.get(job.jobId) || job;
}

function isDirectProviderMediaUrl(value = "") {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) || url.startsWith("/generated/") || url.startsWith("/work/");
}

function providerMediaUrl(payload = {}) {
  return [
    payload.mediaUrl,
    payload.videoUrl,
    payload.playbackUrl,
    payload.outputMediaUrl,
    payload.url
  ].find(isDirectProviderMediaUrl) || "";
}

function normalizeProviderStatus(status = "") {
  return String(status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function completeRender(provider, payload = {}) {
  const job = renderJobs.get(payload.jobId);
  if (!job) return { success: false, error: "Render job not found." };
  const callbackProviderKey = providerKey(provider);

  if (callbackProviderKey && callbackProviderKey !== job.providerKey) {
    return {
      success: false,
      status: "callback_provider_mismatch",
      error: `Callback provider ${callbackProviderKey} does not match render job provider ${job.providerKey}.`,
      retryable: false,
      httpStatus: 409,
      job
    };
  }

  const callbackProviderJobId = payload.providerJobId || payload.provider_job_id || payload.video_id || payload.task_id || "";
  if (callbackProviderJobId && job.providerJobId && String(callbackProviderJobId) !== String(job.providerJobId)) {
    return {
      success: false,
      status: "callback_job_mismatch",
      error: "Provider callback job id does not match the stored provider job id.",
      retryable: false,
      httpStatus: 409,
      job
    };
  }

  job.updatedAt = new Date().toISOString();
  const mediaUrl = providerMediaUrl(payload);
  const providerStatus = normalizeProviderStatus(payload.status || "");
  const providerSaysFinished = finishedProviderStatuses.has(providerStatus);

  job.outputMediaUrl = mediaUrl;
  job.thumbnailUrl = payload.thumbnailUrl || "";
  job.providerMetadata = {
    ...job.providerMetadata,
    providerCallbackStatus: payload.status || "",
    ...(payload.metadata || {})
  };

  if (!mediaUrl) {
    job.status = providerSaysFinished ? "failed_missing_media_url" : providerStatus || "awaiting_media_url";
    job.lifecycle = providerSaysFinished ? "provider_failed" : "provider_pending";
    job.error = payload.error || "Render job is not complete until the provider returns a direct playable media URL.";
    job.error_code = providerSaysFinished ? "MISSING_PROVIDER_MEDIA_URL" : "";
    job.retryable = true;
    job.retry_eligible = true;
    job.rework_eligible = providerSaysFinished;
    renderJobs.set(job.jobId, job);
    persistRenderJob(job);
    if (providerSaysFinished && job.mediaId) {
      mediaOps.updateRenderLifecycle(job.mediaId, "failed", {
        renderJobId: job.jobId,
        providerJobId: job.providerJobId,
        provider: job.provider,
        originSectionId: job.originSectionId,
        error: job.error,
        errorCode: job.error_code,
        retryEligible: true,
        reworkEligible: providerSaysFinished,
        metadata: job.providerMetadata
      }, "render-provider");
    }

    return {
      success: false,
      status: job.status,
      error: job.error,
      retryable: true,
      httpStatus: providerSaysFinished ? 422 : 202,
      job
    };
  }

  job.status = "completed";
  job.lifecycle = "provider_complete";
  job.error = "";
  job.error_code = "";
  job.retryable = false;
  job.retry_eligible = false;
  job.rework_eligible = false;

  const media = mediaOps.readState().media.find((item) => item.id === job.mediaId);
  const quality = runQualityCheck({
    ...(media || {}),
    playback_url: mediaUrl,
    preview_url: payload.thumbnailUrl || mediaUrl || media?.preview_url || ""
  });

  job.quality = quality;
  job.storage = saveCompletedMedia({
    mediaId: job.mediaId,
    provider: job.provider,
    mediaUrl,
    thumbnailUrl: payload.thumbnailUrl || "",
    qualityScore: quality.qualityScore,
    approvalStatus: quality.status === "Approved" ? "approval_ready" : "needs_review",
    metadata: job.providerMetadata
  });
  mediaOps.attachRenderedMedia(job.mediaId, {
    mediaUrl,
    thumbnailUrl: payload.thumbnailUrl || "",
    qualityScore: quality.qualityScore,
    qualityStatus: quality.status,
    qualityCheckedAt: quality.checkedAt,
    quality,
    approvalStatus: quality.status === "Approved" ? "approval_ready" : "needs_review",
    renderJobId: job.jobId,
    providerJobId: job.providerJobId,
    storage: job.storage,
    metadata: job.providerMetadata
  }, "render-provider");
  mediaOps.saveQualityCheck(job.mediaId, quality, "render-provider");
  renderJobs.set(job.jobId, job);
  persistRenderJob(job);
  return { success: true, job };
}

async function submitProviderJob(definition, media, input, job) {
  const key = providerKey(definition.name);
  if (key === "heygen") return submitHeyGen(media, input, job);
  if (key === "runway") return submitRunway(media, input, job);
  if (key === "kling") return submitKling(media, input, job);
  throw new Error(`${definition.name} does not have a live video adapter yet.`);
}

async function pollProviderJob(job) {
  if (job.providerKey === "heygen") return pollHeyGen(job);
  if (job.providerKey === "runway") return pollRunway(job);
  if (job.providerKey === "kling") return pollKling(job);
  return null;
}

async function submitHeyGen(media, input, job) {
  const endpoint = configuredValue("HEYGEN_CREATE_URL") || "https://api.heygen.com/v2/video/generate";
  if (!configuredValue("HEYGEN_RENDER_PAYLOAD_JSON") && (!configuredValue("HEYGEN_AVATAR_ID") || !configuredValue("HEYGEN_VOICE_ID"))) {
    throw new Error("HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID are required, or provide HEYGEN_RENDER_PAYLOAD_JSON.");
  }
  const payload = heygenAdapter().buildPayload(media, input, renderPrompt(media, input));

  const json = await providerFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Api-Key": configuredValue("HEYGEN_API_KEY")
    },
    body: JSON.stringify(stripUndefined(payload))
  });

  return {
    providerJobId: deepFind(json, ["video_id", "videoId", "id", "data.video_id", "data.videoId", "data.id"]),
    status: "submitted",
    metadata: {
      payloadMode: configuredValue("HEYGEN_RENDER_PAYLOAD_JSON") ? "template" : "default",
      providerResponse: compactProviderResponse(json)
    }
  };
}

function heygenAdapter() {
  return new HeygenAdapter({
    HEYGEN_API_KEY: configuredValue("HEYGEN_API_KEY"),
    HEYGEN_AVATAR_ID: configuredValue("HEYGEN_AVATAR_ID"),
    HEYGEN_VOICE_ID: configuredValue("HEYGEN_VOICE_ID"),
    HEYGEN_RENDER_PAYLOAD_JSON: configuredValue("HEYGEN_RENDER_PAYLOAD_JSON"),
    EVICS_PUBLIC_BASE_URL: configuredValue("EVICS_PUBLIC_BASE_URL")
  });
}

function persistRenderJob(job) {
  persistence.upsertRecord("render_jobs", {
    id: job.jobId,
    mediaId: job.mediaId,
    provider: job.provider,
    providerKey: job.providerKey,
    providerJobId: job.providerJobId,
    lifecycle: job.lifecycle || job.status,
    status: job.status,
    origin_section_id: job.originSectionId,
    error: job.error || "",
    error_code: job.error_code || "",
    retry_eligible: Boolean(job.retry_eligible || job.retryable),
    rework_eligible: Boolean(job.rework_eligible),
    metadata: job.providerMetadata || {},
    submittedAt: job.submittedAt,
    updatedAt: job.updatedAt
  });
  persistence.logAgentEvent({
    type: "twin_agent.render_job",
    actor: job.actor || "twin-agent",
    mediaId: job.mediaId,
    renderJobId: job.jobId,
    lifecycle: job.lifecycle || job.status,
    status: job.status,
    error_code: job.error_code || "",
    message: job.error || `${job.provider} render job ${job.status}.`,
    metadata: { provider: job.provider, providerJobId: job.providerJobId }
  });
}

async function pollHeyGen(job) {
  const endpoint = configuredValue("HEYGEN_STATUS_URL") || `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(job.providerJobId)}`;
  const json = await providerFetch(endpoint, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": configuredValue("HEYGEN_API_KEY")
    }
  });

  return normalizeProviderResult(json, {
    statusPaths: ["status", "data.status"],
    mediaPaths: ["video_url", "videoUrl", "data.video_url", "data.videoUrl", "data.video_url.caption_free"],
    thumbnailPaths: ["thumbnail_url", "thumbnailUrl", "data.thumbnail_url", "data.thumbnailUrl"],
    errorPaths: ["error", "message", "data.error", "data.failure_message"]
  });
}

async function submitRunway(media, input, job) {
  const endpoint = configuredValue("RUNWAY_CREATE_URL") || "https://api.dev.runwayml.com/v1/text_to_video";
  const payload = providerPayload("RUNWAY_RENDER_PAYLOAD_JSON", media, input, {
    model: configuredValue("RUNWAY_MODEL") || "gen4_turbo",
    promptText: renderPrompt(media, input),
    ratio: input.ratio || "9:16",
    duration: Number(input.duration || media.duration_seconds || 10)
  });

  const json = await providerFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${configuredValue("RUNWAY_API_KEY")}`,
      "X-Runway-Version": configuredValue("RUNWAY_API_VERSION") || "2024-11-06"
    },
    body: JSON.stringify(stripUndefined(payload))
  });

  return {
    providerJobId: deepFind(json, ["id", "task_id", "taskId", "data.id"]),
    status: "submitted",
    metadata: { providerResponse: compactProviderResponse(json) }
  };
}

async function pollRunway(job) {
  const endpoint = configuredValue("RUNWAY_STATUS_URL")
    ? configuredValue("RUNWAY_STATUS_URL").replace("{id}", encodeURIComponent(job.providerJobId))
    : `https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(job.providerJobId)}`;
  const json = await providerFetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${configuredValue("RUNWAY_API_KEY")}`,
      "X-Runway-Version": configuredValue("RUNWAY_API_VERSION") || "2024-11-06"
    }
  });

  return normalizeProviderResult(json, {
    statusPaths: ["status", "data.status"],
    mediaPaths: ["output.0", "output.video", "output.video_url", "data.output.0", "data.video_url"],
    thumbnailPaths: ["thumbnail", "thumbnail_url", "data.thumbnail_url"],
    errorPaths: ["error", "failure", "message"]
  });
}

async function submitKling(media, input, job) {
  const endpoint = configuredValue("KLING_CREATE_URL");
  if (!endpoint) throw new Error("KLING_CREATE_URL is required because Kling API gateways vary by account.");
  const payload = providerPayload("KLING_RENDER_PAYLOAD_JSON", media, input, {
    prompt: renderPrompt(media, input),
    aspect_ratio: input.aspectRatio || "9:16",
    duration: Number(input.duration || media.duration_seconds || 10)
  });

  const json = await providerFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: configuredValue("KLING_SECRET_KEY")
        ? `Bearer ${configuredValue("KLING_API_KEY")}:${configuredValue("KLING_SECRET_KEY")}`
        : `Bearer ${configuredValue("KLING_API_KEY")}`
    },
    body: JSON.stringify(stripUndefined(payload))
  });

  return {
    providerJobId: deepFind(json, ["task_id", "taskId", "id", "data.task_id", "data.id"]),
    status: "submitted",
    metadata: { providerResponse: compactProviderResponse(json) }
  };
}

async function pollKling(job) {
  const statusUrl = configuredValue("KLING_STATUS_URL");
  if (!statusUrl) throw new Error("KLING_STATUS_URL is required to poll Kling render status.");
  const endpoint = statusUrl.replace("{id}", encodeURIComponent(job.providerJobId));
  const method = configuredValue("KLING_STATUS_METHOD") || (statusUrl.includes("{id}") ? "GET" : "POST");
  const json = await providerFetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: configuredValue("KLING_SECRET_KEY")
        ? `Bearer ${configuredValue("KLING_API_KEY")}:${configuredValue("KLING_SECRET_KEY")}`
        : `Bearer ${configuredValue("KLING_API_KEY")}`
    },
    body: method === "GET" ? undefined : JSON.stringify({ task_id: job.providerJobId, taskId: job.providerJobId })
  });

  return normalizeProviderResult(json, {
    statusPaths: ["status", "task_status", "data.status", "data.task_status"],
    mediaPaths: ["video_url", "videoUrl", "url", "data.video_url", "data.videoUrl", "data.works.0.resource.resource"],
    thumbnailPaths: ["thumbnail_url", "cover_url", "data.thumbnail_url", "data.cover_url"],
    errorPaths: ["error", "message", "data.error", "data.message"]
  });
}

async function providerFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    json = { message: text || "Provider returned a non-JSON response." };
  }
  if (!response.ok) {
    throw new ProviderRequestError(providerErrorMessage(json, response.status), response.status, json);
  }
  return json;
}

function providerErrorMessage(json = {}, status = "") {
  const direct = deepFind(json, [
    "error.message",
    "error.details",
    "error.code",
    "message",
    "msg",
    "detail",
    "data.error.message",
    "data.error",
    "data.message"
  ]);
  const value = direct || json.error || json;
  const rendered = typeof value === "string" ? value : JSON.stringify(value);
  return rendered && rendered !== "{}"
    ? `Provider request failed with ${status}: ${rendered}`
    : `Provider request failed with ${status}.`;
}

function providerPayload(envKey, media, input, fallback) {
  const template = configuredValue(envKey);
  if (!template) return fallback;
  return JSON.parse(applyTemplate(template, {
    media,
    input,
    prompt: renderPrompt(media, input),
    spokenScript: renderPrompt(media, input),
    script: input.script || media.description || media.metadata_json?.script || "",
    sceneInstructions: normalizeDirections(input.renderDirectives || input.sceneInstructions || media.metadata_json?.sceneInstructions || media.metadata_json?.directorNotes || "")
  }));
}

function applyTemplate(template, values) {
  return String(template)
    .replace(/\{\{prompt\}\}/g, values.prompt)
    .replace(/\{\{spokenScript\}\}/g, values.spokenScript || values.prompt || "")
    .replace(/\{\{title\}\}/g, values.media.title || "")
    .replace(/\{\{mediaId\}\}/g, values.media.id || "")
    .replace(/\{\{script\}\}/g, values.script || values.media.description || values.media.metadata_json?.script || "")
    .replace(/\{\{sceneInstructions\}\}/g, values.sceneInstructions || "")
    .replace(/\{\{renderDirectives\}\}/g, values.sceneInstructions || "")
    .replace(/\{\{devToolsDirections\}\}/g, values.sceneInstructions || "")
    .replace(/\{\{heygenDevToolsDirections\}\}/g, values.sceneInstructions || "");
}

function normalizeDirections(value = "") {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean).join(" ");
  return String(value || "").trim();
}

function renderPrompt(media, input = {}) {
  return input.prompt || media.metadata_json?.script || media.description || media.title || "Generate a premium ecommerce video.";
}

function normalizeProviderResult(json, paths) {
  const status = normalizeProviderStatus(deepFind(json, paths.statusPaths) || "processing");
  const mediaUrl = deepFind(json, paths.mediaPaths);
  const thumbnailUrl = deepFind(json, paths.thumbnailPaths);
  const error = deepFind(json, paths.errorPaths);
  return {
    status,
    mediaUrl: isDirectProviderMediaUrl(mediaUrl) ? mediaUrl : "",
    thumbnailUrl: isDirectProviderMediaUrl(thumbnailUrl) ? thumbnailUrl : "",
    failed: failedProviderStatuses.has(status),
    error,
    metadata: { providerStatus: status, providerResponse: compactProviderResponse(json) }
  };
}

function deepFind(source, paths = []) {
  for (const path of paths) {
    const value = String(path).split(".").reduce((cursor, part) => {
      if (cursor === undefined || cursor === null) return undefined;
      return cursor[part];
    }, source);
    if (Array.isArray(value)) {
      const direct = value.find(isDirectProviderMediaUrl) || value[0];
      if (direct) return direct;
    }
    if (value) return value;
  }
  return "";
}

function compactProviderResponse(json) {
  const text = JSON.stringify(json || {});
  return text.length > 4000 ? { truncated: true, raw: text.slice(0, 4000) } : json;
}

function renderJobDiagnostics(jobs = Array.from(renderJobs.values())) {
  const failedStatuses = new Set(["failed", "provider_failed", "failed_missing_media_url", "poll_error", "callback_provider_mismatch", "callback_job_mismatch", "not_configured"]);
  const retryable = jobs.filter((job) => job.retryable || failedStatuses.has(job.status));
  const failed = jobs.filter((job) => failedStatuses.has(job.status));
  const lastErrorByProvider = {};

  jobs.forEach((job) => {
    if (!job.error) return;
    const key = job.providerKey || providerKey(job.provider);
    const previous = lastErrorByProvider[key];
    if (!previous || String(job.updatedAt || job.submittedAt).localeCompare(String(previous.updatedAt || previous.submittedAt)) > 0) {
      lastErrorByProvider[key] = {
        provider: job.provider,
        providerKey: key,
        jobId: job.jobId,
        status: job.status,
        error: job.error,
        updatedAt: job.updatedAt || job.submittedAt
      };
    }
  });

  return {
    failed,
    retryQueue: retryable,
    lastErrorByProvider
  };
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== undefined && entry !== "")
    .map(([key, entry]) => [key, stripUndefined(entry)]));
}

module.exports = {
  providerConfig,
  providerIsConfigured(provider) {
    return isConfigured(providerDefinition(provider));
  },
  providerReadiness,
  providerReadinessReport,
  clearProviderAuthFailure,
  submitRender,
  getRenderStatus,
  completeRender,
  listRenderJobs,
  renderJobDiagnostics
};
