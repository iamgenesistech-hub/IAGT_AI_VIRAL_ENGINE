const fs = require("fs");
const path = require("path");

process.env.MEDIA_OPS_STATE_PATH = path.join(__dirname, "media-ops-test.local.json");
if (fs.existsSync(process.env.MEDIA_OPS_STATE_PATH)) {
  fs.unlinkSync(process.env.MEDIA_OPS_STATE_PATH);
}

const mediaOps = require("./media-ops");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  mediaOps.setOperatingMode("auto_assist", "test");
  let state = mediaOps.seedDemoMedia("test");
  assert(state.media.filter((item) => item.media_type === "video").length >= 2, "Expected at least two video outputs.");
  assert(Number(state.renderCounter?.sequence || 0) >= 2, "Expected render sequence counter to increment for video creates.");
  assert(Number(state.renderCounter?.totals?.created || 0) >= 2, "Expected created render totals to increment.");
  assert(state.media.every((item) => item.buy_now_label === "Buy Now"), "Expected Buy Now label on every media output.");
  assert(state.media.every((item) => Array.isArray(item.buy_now_message_lines) && item.buy_now_message_lines.length === 2), "Expected two-line Buy Now message on every media output.");
  assert(state.media.every((item) => item.playback_url && item.preview_url), "Expected in-app playback and preview links on every media output.");

  state = mediaOps.runScanner("test");
  assert(state.scanRuns.length >= 1, "Expected scanner run.");
  assert(state.findings.length >= 1, "Expected scanner findings.");

  const firstVideo = state.media.find((item) => item.media_type === "video");
  state = mediaOps.updateMediaMetadata(firstVideo.id, {
    metadata: {
      sourceViralUrl: "https://cdn.coverr.co/videos/coverr-woman-on-a-motorcycle-1579/1080p.mp4",
      productName: "Test Product",
      productImageUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
      spokenScript: "Test product proof voiceover with no directions."
    }
  }, "test");
  state = mediaOps.attachRenderedMedia(firstVideo.id, {
    mediaUrl: `/generated/${firstVideo.id}.mp4`,
    thumbnailUrl: `/generated/${firstVideo.id}.jpg`,
    qualityScore: 92
  }, "test-render-provider");
  state = mediaOps.saveQualityCheck(firstVideo.id, {
    status: "Approved",
    qualityScore: 92,
    checkedAt: new Date().toISOString()
  }, "test-quality");
  state = mediaOps.applyMediaAction("approve", [firstVideo.id], {}, "test");
  state = mediaOps.applyMediaAction("queue_publish", [firstVideo.id], { platforms: ["TikTok", "Instagram"] }, "test");
  state = mediaOps.applyMediaAction("discard", [firstVideo.id], { reason: "Testing discard analytics" }, "test");
  state = mediaOps.applyMediaAction("archive", [firstVideo.id], { override: true }, "test");

  const archived = state.media.find((item) => item.id === firstVideo.id);
  assert(archived.storage_location === "google_workspace", "Expected Google Workspace storage location.");
  assert(archived.google_drive_file_id, "Expected Google Drive file id.");
  assert(archived.playback_url === archived.google_drive_web_view_link, "Expected archived playback URL to point to Google Workspace.");
  assert(archived.migration_due_at, "Expected 36-hour migration due timestamp.");
  assert(state.dispatches.some((item) => item.media_id === firstVideo.id), "Expected platform dispatch records.");
  assert(state.auditEvents.length >= 4, "Expected audit events.");
  assert(Number(state.renderCounter?.totals?.discarded || 0) >= 1, "Expected discarded render totals to increment.");

  state = mediaOps.setOperatingMode("automated", "test");
  assert(state.operatingMode === "automated", "Expected automated mode.");
  state = mediaOps.setOperatingMode("manual", "test");
  assert(state.operatingMode === "manual", "Expected manual mode.");
  state = mediaOps.exportToProvider("Canva", [firstVideo.id], "test");
  state = mediaOps.recordAnalytics(firstVideo.id, { views: 10, clicks: 1, revenue: 9.99 }, "test");
  state = mediaOps.sendSmsAlert("Test alert", "test");
  assert(state.providerJobs.length >= 1, "Expected provider fallback job.");
  assert(state.analytics.length >= 1, "Expected analytics record.");
  assert(state.alerts.length >= 1, "Expected SMS fallback alert.");

  const evidence = {
    videos: state.media.filter((item) => item.media_type === "video").length,
    archivedVideo: archived.id,
    googleDriveFileId: archived.google_drive_file_id,
    scannerRuns: state.scanRuns.length,
    findings: state.findings.length,
    dispatches: state.dispatches.length,
    auditEvents: state.auditEvents.length,
    providerJobs: state.providerJobs.length,
    analytics: state.analytics.length,
    renderCounter: state.renderCounter,
    alerts: state.alerts.length,
    finalMode: state.operatingMode
  };

  console.log(JSON.stringify(evidence, null, 2));
}

main();
