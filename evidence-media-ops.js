const fs = require("fs");
const path = require("path");

process.env.MEDIA_OPS_STATE_PATH = path.join(__dirname, "media-ops-evidence.local.json");

if (fs.existsSync(process.env.MEDIA_OPS_STATE_PATH)) {
  fs.unlinkSync(process.env.MEDIA_OPS_STATE_PATH);
}

const mediaOps = require("./media-ops");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function byId(state, id) {
  return state.media.find((item) => item.id === id);
}

let state = mediaOps.updateScannerSettings({
  enabled: true,
  continuous: true,
  intervalMinutes: 15,
  durationSeconds: 30,
  scope: "all_outputs"
}, "owner-admin");

const modeResults = {};
["automated", "auto_assist", "manual"].forEach((mode) => {
  state = mediaOps.setOperatingMode(mode, "owner-admin");
  const output = mediaOps.createMedia({
    title: `Evidence ${mode} Video`,
    description: `Video created while proving ${mode} operating mode.`,
    campaignId: `evidence-${mode}`,
    mediaType: "video",
    productUrl: `https://iamgenesistech.myshopify.com/products/evidence-${mode}`,
    durationSeconds: 30,
    width: 1080,
    height: 1920,
    targetPlatforms: ["TikTok", "Instagram"]
  }, "evidence-test");
  state = mediaOps.readState();
  modeResults[mode] = {
    mediaId: output.id,
    modeAtCreation: output.mode_at_creation,
    approvalRequired: output.approval_required,
    approvalStatus: output.approval_status,
    publishStatus: output.publish_status,
    migrationDueAt: output.migration_due_at
  };
});

const videos = state.media.filter((item) => item.media_type === "video");
assert(videos.length >= 3, "Expected at least three video outputs from mode proof.");
videos.forEach((video) => {
  assert(video.buy_now_label === "Buy Now", `${video.id} missing Buy Now label.`);
  assert(video.buy_now_url && video.buy_now_url.includes("/products/"), `${video.id} missing product page URL.`);
  assert(video.buy_now_message === "Please click link to get all the product information you need to know", `${video.id} missing required message.`);
  assert(Array.isArray(video.buy_now_message_lines) && video.buy_now_message_lines.length === 2, `${video.id} missing two-line centered message.`);
  assert(video.playback_url && video.preview_url, `${video.id} missing EVICS playback routing.`);
});

state = mediaOps.runScanner("owner-admin");
assert(state.scanRuns.length >= 1, "Scanner did not record a run.");
assert(state.findings.length >= 1, "Scanner did not produce findings.");
assert(state.scanner.intervalMinutes === 15, "Scanner interval was not configurable.");
assert(state.scanner.durationSeconds === 30, "Scanner duration was not configurable.");

const adminVideo = videos[0];
state = mediaOps.attachRenderedMedia(adminVideo.id, {
  mediaUrl: `/generated/${adminVideo.id}.mp4`,
  thumbnailUrl: `/generated/${adminVideo.id}.jpg`,
  qualityScore: 92
}, "evidence-render-provider");
state = mediaOps.applyMediaAction("approve", [adminVideo.id], {}, "owner-admin");
state = mediaOps.applyMediaAction("archive", [adminVideo.id], { override: true }, "owner-admin");
const adminArchived = byId(state, adminVideo.id);
assert(adminArchived.storage_location === "google_workspace", "Admin override archive failed.");
assert(adminArchived.google_drive_file_id, "Admin archive missing Google Drive file id.");
assert(adminArchived.playback_url === adminArchived.google_drive_web_view_link, "Admin archive playback link not updated.");

const copilotVideo = videos[1];
state = mediaOps.attachRenderedMedia(copilotVideo.id, {
  mediaUrl: `/generated/${copilotVideo.id}.mp4`,
  thumbnailUrl: `/generated/${copilotVideo.id}.jpg`,
  qualityScore: 90
}, "evidence-render-provider");
state = mediaOps.applyMediaAction("approve", [copilotVideo.id], {}, "owner-admin");
state = mediaOps.applyMediaAction("queue_publish", [copilotVideo.id], { platforms: ["TikTok", "Instagram"] }, "owner-admin");
state = mediaOps.applyMediaAction("archive", [copilotVideo.id], { override: true }, "copilot-authorized");
const copilotArchived = byId(state, copilotVideo.id);
assert(copilotArchived.storage_location === "google_workspace", "Copilot override archive failed.");
assert(copilotArchived.google_drive_file_id, "Copilot archive missing Google Drive file id.");
assert(copilotArchived.playback_url === copilotArchived.google_drive_web_view_link, "Copilot archive playback link not updated.");

const archiveAudit = state.auditEvents.filter((event) => event.action === "archive.override");
assert(archiveAudit.some((event) => event.actor === "owner-admin"), "Missing admin archive override audit.");
assert(archiveAudit.some((event) => event.actor === "copilot-authorized"), "Missing Copilot archive override audit.");
assert(state.dispatches.length >= 2, "Expected per-platform dispatch records.");

state = mediaOps.exportToProvider("Canva", [copilotVideo.id], "owner-admin");
state = mediaOps.exportToProvider("HeyGen", [copilotVideo.id], "owner-admin");
state = mediaOps.exportToProvider("Runway", [copilotVideo.id], "owner-admin");
state = mediaOps.exportToProvider("Kling", [copilotVideo.id], "owner-admin");
state = mediaOps.validateCompliance(copilotVideo.id, "compliance-agent");
state = mediaOps.recordAnalytics(copilotVideo.id, {
  views: 1200,
  clicks: 96,
  addToCart: 18,
  conversions: 6,
  revenue: 359.82,
  source: "mock_analytics_evidence"
}, "analytics-loop");
state = mediaOps.sendSmsAlert("EVICS evidence alert: workflow requires review when providers are missing.", "alert-agent");

assert(state.providerJobs.some((job) => job.provider === "Canva"), "Missing Canva provider job.");
assert(state.providerJobs.some((job) => job.provider === "HeyGen"), "Missing HeyGen provider job.");
assert(state.providerJobs.some((job) => job.provider === "Runway"), "Missing Runway provider job.");
assert(state.providerJobs.some((job) => job.provider === "Kling"), "Missing Kling provider job.");
assert(state.analytics.length >= 1, "Missing analytics record.");
assert(state.alerts.length >= 1, "Missing SMS alert fallback record.");
assert(state.complianceRules.length >= 1, "Missing compliance memory rules.");

const evidence = {
  videoOutputsCreated: videos.length,
  requiredTwoVideoOutputs: videos.slice(0, 2).map((item) => ({
    id: item.id,
    title: item.title,
    mediaType: item.media_type,
    buyNowLabel: item.buy_now_label,
    buyNowUrl: item.buy_now_url,
    buyNowMessageLines: item.buy_now_message_lines,
    migrationDueAt: item.migration_due_at
  })),
  googleWorkspaceArchiveProof: {
    adminOverride: {
      id: adminArchived.id,
      storageLocation: adminArchived.storage_location,
      googleDriveFileId: adminArchived.google_drive_file_id,
      googleDriveFolderId: adminArchived.google_drive_folder_id,
      googleDriveLink: adminArchived.google_drive_web_view_link,
      migratedAt: adminArchived.migrated_to_google_at
    },
    copilotOverride: {
      id: copilotArchived.id,
      storageLocation: copilotArchived.storage_location,
      googleDriveFileId: copilotArchived.google_drive_file_id,
      googleDriveFolderId: copilotArchived.google_drive_folder_id,
      googleDriveLink: copilotArchived.google_drive_web_view_link,
      migratedAt: copilotArchived.migrated_to_google_at
    }
  },
  scannerProof: {
    enabled: state.scanner.enabled,
    continuous: state.scanner.continuous,
    intervalMinutes: state.scanner.intervalMinutes,
    durationSeconds: state.scanner.durationSeconds,
    lastRunAt: state.scanner.lastRunAt,
    status: state.scanner.status,
    scanRuns: state.scanRuns.length,
    findings: state.findings.length
  },
  operatingModeProof: modeResults,
  platformDispatchProof: state.dispatches.map((dispatch) => ({
    mediaId: dispatch.media_id,
    platform: dispatch.platform,
    status: dispatch.status
  })),
  backlogConnectorProof: {
    canva: state.providerJobs.find((job) => job.provider === "Canva")?.status,
    heygen: state.providerJobs.find((job) => job.provider === "HeyGen")?.status,
    runway: state.providerJobs.find((job) => job.provider === "Runway")?.status,
    kling: state.providerJobs.find((job) => job.provider === "Kling")?.status,
    publishingPlatforms: [...new Set(state.dispatches.map((dispatch) => dispatch.platform))],
    smsAlert: state.alerts[0]?.status
  },
  complianceMemoryProof: {
    ruleCount: state.complianceRules.length,
    validationStatus: byId(state, copilotVideo.id).validation_status,
    recommendedDisclaimer: byId(state, copilotVideo.id).metadata_json.recommendedDisclaimer || ""
  },
  analyticsProof: state.analytics[0],
  auditProof: {
    totalAuditEvents: state.auditEvents.length,
    archiveOverrideActors: archiveAudit.map((event) => event.actor)
  },
  stateFile: process.env.MEDIA_OPS_STATE_PATH
};

console.log(JSON.stringify(evidence, null, 2));
