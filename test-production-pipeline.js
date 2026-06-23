const fs = require("fs");
const path = require("path");

process.env.MEDIA_OPS_STATE_PATH = path.join(__dirname, "media-ops-production-test.local.json");
process.env.EVICS_PIPELINE_STATE_PATH = path.join(__dirname, "evics-pipeline-production-test.local.json");
process.env.HEYGEN_API_KEY = "test-key";
delete process.env.HEYGEN_AVATAR_ID;
delete process.env.HEYGEN_VOICE_ID;
delete process.env.HEYGEN_RENDER_PAYLOAD_JSON;

[process.env.MEDIA_OPS_STATE_PATH, process.env.EVICS_PIPELINE_STATE_PATH].forEach((filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
});

const mediaOps = require("./media-ops");
const renderRouter = require("./render-provider-router");
const queueWorkers = require("./evics-queue-workers");
const persistence = require("./evics-persistence");

process.env.HEYGEN_API_KEY = "test-key";
delete process.env.HEYGEN_AVATAR_ID;
delete process.env.HEYGEN_VOICE_ID;
delete process.env.HEYGEN_RENDER_PAYLOAD_JSON;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const media = mediaOps.createMedia({
    title: "Production Pipeline Missing Config Test",
    description: "Render-ready script.",
    mediaType: "video",
    originSectionId: "evics-build-source",
    renderStatus: "queued",
    productUrl: "https://store.example/products/test"
  }, "test");

  mediaOps.updateRenderLifecycle(media.id, "rendering", { message: "State transition proof." }, "test");
  let current = mediaOps.readState().media.find((item) => item.id === media.id);
  assert(current.render_status === "rendering", "Expected rendering state transition.");

  queueWorkers.compilerWorker(media.id, "test-compiler");
  queueWorkers.productMatchWorker(media.id, "test-product-match");
  queueWorkers.promptGenerationWorker(media.id, "test-prompt-generation");
  const compilerOutput = persistence.listRecords("prompt_compiler_outputs", (item) => item.mediaId === media.id)[0];
  assert(compilerOutput && compilerOutput.lifecycle === "prompt_generated", "Expected durable prompt compiler output.");

  const missingConfig = await renderRouter.submitRender("heygen", { mediaId: media.id, originSectionId: "evics-build-source" }, "test-twin-agent");
  const expectedErrorCodes = new Set(["MISSING_RENDER_CONFIG", "PROVIDER_AUTH_FAILED"]);
  assert(missingConfig.job.status === "provider_failed", "Expected missing config render job to fail.");
  assert(expectedErrorCodes.has(String(missingConfig.job.error_code || "")), "Expected missing config or auth-failed error code.");

  current = mediaOps.readState().media.find((item) => item.id === media.id);
  assert(current.render_status === "failed", "Expected failed visible asset state.");
  assert(expectedErrorCodes.has(String(current.error_code || "")), "Expected media error_code to reflect config or auth failure.");
  if (current.error_code === "PROVIDER_AUTH_FAILED") {
    assert(current.retry_eligible === false, "Expected auth failure retry to be blocked.");
  } else {
    assert(current.retry_eligible === true, "Expected retry eligibility.");
  }
  assert(current.rework_eligible === true, "Expected rework eligibility.");

  const retry = await queueWorkers.renderSubmissionWorker(media.id, "heygen", "test-twin-agent");
  assert(expectedErrorCodes.has(String(retry.job.error_code || "")), "Expected retry to preserve config/auth failure classification.");

  const rework = queueWorkers.reworkWorker(media.id, "Test rework.", "test-office-agent");
  assert(rework.render_status === "rework", "Expected rework state.");
  assert(rework.origin_section_id === "evics-build-source", "Expected origin section preserved.");

  const complete = mediaOps.createMedia({
    title: "Production Pipeline Partial Delivery Test",
    description: "Completed rendered asset.",
    mediaType: "video",
    originSectionId: "compiler-section",
    renderStatus: "queued",
    productUrl: "https://store.example/products/complete"
  }, "test");
  mediaOps.attachRenderedMedia(complete.id, {
    mediaUrl: "/generated/complete.mp4",
    thumbnailUrl: "/generated/complete.jpg",
    renderJobId: "render-test-1",
    storage: { storageMode: "local_registry", id: "local-only" }
  }, "test-render-provider");

  const afterComplete = mediaOps.readState().media.find((item) => item.id === complete.id);
  assert(afterComplete.render_status === "complete", "Expected complete render status.");
  assert(afterComplete.delivery_status === "partial", "Expected partial delivery when Workspace save is unavailable.");
  assert(afterComplete.delivery_destinations_json.originSection.delivered === true, "Expected origin-section delivery.");
  assert(afterComplete.delivery_destinations_json.videoViewingArea.delivered === true, "Expected video viewing area delivery.");
  assert(afterComplete.delivery_destinations_json.googleWorkspace.delivered === false, "Expected Workspace delivery failure recorded.");

  const state = mediaOps.readState();
  const primaryAllowed = new Set(["queued", "rendering", "complete", "failed", "rework"]);
  const primaryViewing = state.media.filter((item) => primaryAllowed.has(item.render_status));
  const videoViewing = state.media.filter((item) => item.render_status === "complete");
  assert(primaryViewing.every((item) => primaryAllowed.has(item.render_status)), "Primary viewing filter leaked a disallowed status.");
  assert(videoViewing.every((item) => item.render_status === "complete"), "Video viewing filter leaked a non-complete asset.");

  const pipeline = persistence.readPipelineState();
  assert(pipeline.media_assets.length >= 2, "Expected durable media_assets.");
  assert(pipeline.render_jobs.some((job) => expectedErrorCodes.has(String(job.error_code || ""))), "Expected durable render_jobs error code.");
  assert(pipeline.delivery_records.some((record) => record.destination === "googleWorkspace" && record.status === "failed"), "Expected durable partial delivery record.");
  assert(pipeline.agent_events.length >= 1, "Expected structured agent events.");

  console.log(JSON.stringify({
    stateTransitions: true,
    renderRetries: true,
    providerConfigErrors: true,
    partialDelivery: true,
    originSectionRouting: true,
    viewingAreaFilters: primaryViewing.length,
    videoViewingAreaFilters: videoViewing.length,
    durableCollections: {
      media_assets: pipeline.media_assets.length,
      render_jobs: pipeline.render_jobs.length,
      prompt_compiler_outputs: pipeline.prompt_compiler_outputs.length,
      delivery_records: pipeline.delivery_records.length,
      agent_events: pipeline.agent_events.length
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
