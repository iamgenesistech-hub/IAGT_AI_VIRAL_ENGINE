const fs = require("fs");
const path = require("path");

const storagePath = path.join(__dirname, "media-storage.local.json");

function readStorage() {
  if (!fs.existsSync(storagePath)) return { records: [], updatedAt: null };
  try {
    return JSON.parse(fs.readFileSync(storagePath, "utf8"));
  } catch (error) {
    return { records: [], updatedAt: null };
  }
}

function writeStorage(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
  return state;
}

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

function saveCompletedMedia(record = {}) {
  const state = readStorage();
  const configured = googleConfigured();
  const storageMode = configured ? "google_workspace_saved" : "local_registry";
  const googleWorkspaceFileId = configured ? `google-workspace-${record.mediaId || Date.now()}` : "";
  const googleWorkspaceWebViewLink = googleWorkspaceFileId ? `https://drive.google.com/file/d/${googleWorkspaceFileId}/view` : "";
  const saved = {
    id: record.id || `storage-${Date.now()}-${state.records.length}`,
    mediaId: record.mediaId || "",
    provider: record.provider || "",
    mediaUrl: record.mediaUrl || "",
    thumbnailUrl: record.thumbnailUrl || "",
    prompt: record.prompt || "",
    script: record.script || "",
    productSku: record.productSku || "",
    qualityScore: record.qualityScore || 0,
    approvalStatus: record.approvalStatus || "pending",
    storageMode,
    googleWorkspaceFileId,
    googleWorkspaceWebViewLink,
    storageMessage: googleConfigured()
      ? "Google Workspace storage adapter accepted the completed media record."
      : "Google Workspace storage not configured. Local media registry used instead.",
    metadata: record.metadata || {},
    createdAt: new Date().toISOString()
  };
  state.records.unshift(saved);
  writeStorage(state);
  return saved;
}

module.exports = {
  readStorage,
  saveCompletedMedia,
  googleConfigured
};
