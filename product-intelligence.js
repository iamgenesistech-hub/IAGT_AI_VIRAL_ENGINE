"use strict";

const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "product-intelligence.local.json");
const DEFAULT_SCAN_MODE = "off";
const DEFAULT_TOP_LIMIT = 5;
const DEFAULT_VIDEOTYPES = ["avatar", "no-avatar", "faceless", "elite-ai-design", "rerender"];
const DEFAULT_PLATFORMS = ["TikTok", "Instagram", "YouTube", "Facebook", "LinkedIn", "X", "Google Ads", "Pinterest"];

function nowIso() {
  return new Date().toISOString();
}

function emptyProduct(productId, meta = {}) {
  return {
    productId,
    title: meta.title || productId,
    handle: meta.handle || "",
    productType: meta.product_type || meta.productType || "",
    imageUrl: meta.image_url || meta.imageUrl || "",
    bundleId: meta.bundleId || meta.bundle_id || "",
    bundleName: meta.bundleName || meta.bundle || "",
    storageUri: meta.storageUri || `gs://evics-product-intelligence/${productId}/intel.json`,
    topFormats: [],
    topVideos: [],
    publishingLog: [],
    platformPerformance: {},
    lastScannedAt: null,
    lastPublishedAt: null,
    topScore: 0,
    totalPublished: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalResponseRate: 0,
    bestPlatform: "",
    bestVideoType: "",
    updatedAt: nowIso()
  };
}

function defaultState() {
  return {
    version: 1,
    products: {},
    bundles: {},
    publishingHistory: [],
    scanSessions: [],
    scanMode: DEFAULT_SCAN_MODE,
    scanningActive: false,
    scanProgress: {
      running: false,
      mode: DEFAULT_SCAN_MODE,
      sessionId: "",
      progressLog: [],
      boardSummary: null,
      lastRefreshedAt: null
    },
    updatedAt: nowIso()
  };
}

function readState() {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultState();
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const state = { ...defaultState(), ...parsed };
    state.products = parsed.products || {};
    state.bundles = parsed.bundles || {};
    state.publishingHistory = Array.isArray(parsed.publishingHistory) ? parsed.publishingHistory : [];
    state.scanSessions = Array.isArray(parsed.scanSessions) ? parsed.scanSessions : [];
    state.scanProgress = { ...defaultState().scanProgress, ...(parsed.scanProgress || {}) };
    return state;
  } catch {
    return defaultState();
  }
}

function writeState(nextState) {
  const state = {
    ...defaultState(),
    ...nextState,
    updatedAt: nowIso(),
    scanProgress: { ...defaultState().scanProgress, ...(nextState.scanProgress || {}), lastRefreshedAt: nowIso() }
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
  return state;
}

function normalizeKey(value = "", fallback = "unknown") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || fallback;
}

function normalizeProductKey(product = {}) {
  return normalizeKey(product.id || product.productId || product.handle || product.title, "unknown-product");
}

function normalizeBundleKey(bundle = {}) {
  return normalizeKey(bundle.id || bundle.bundleId || bundle.handle || bundle.title || bundle.name, "unknown-bundle");
}

function normalizeFormatKey(candidate = {}) {
  return normalizeKey(
    candidate.formatId || candidate.formatType || candidate.videoType || candidate.templateName || candidate.renderProvider || candidate.media_type || candidate.title,
    "unknown-format"
  );
}

function normalizeVideoType(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "faceless";
  if (normalized.includes("avatar")) return normalized.includes("no") ? "no-avatar" : "avatar";
  if (normalized.includes("faceless")) return "faceless";
  if (normalized.includes("rerender")) return "rerender";
  if (normalized.includes("elite") || normalized.includes("ai")) return "elite-ai-design";
  return DEFAULT_VIDEOTYPES.includes(normalized) ? normalized : "faceless";
}

function normalizePlatform(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  const match = DEFAULT_PLATFORMS.find((platform) => platform.toLowerCase() === raw.toLowerCase());
  return match || raw;
}

function getProductRecord(state, product, meta = {}) {
  const productKey = normalizeProductKey(product);
  if (!state.products[productKey]) {
    state.products[productKey] = emptyProduct(productKey, { ...meta, ...product });
  }
  const record = state.products[productKey];
  if (product.title && !record.title) record.title = product.title;
  if (product.handle && !record.handle) record.handle = product.handle;
  if (product.productType && !record.productType) record.productType = product.productType;
  if (product.product_type && !record.productType) record.productType = product.product_type;
  if (product.image_url && !record.imageUrl) record.imageUrl = product.image_url;
  if (product.imageUrl && !record.imageUrl) record.imageUrl = product.imageUrl;
  if (meta.bundleId || meta.bundle_id) record.bundleId = meta.bundleId || meta.bundle_id;
  if (meta.bundleName || meta.bundle) record.bundleName = meta.bundleName || meta.bundle;
  record.updatedAt = nowIso();
  return record;
}

function scoreCandidate(product, candidate = {}) {
  const productText = [product.title, product.handle, product.productType, product.product_type, product.bundleName, product.bundleId].filter(Boolean).join(" ").toLowerCase();
  const candidateText = [
    candidate.title,
    candidate.script,
    candidate.spokenScript,
    candidate.rewrittenScript,
    candidate.caption,
    candidate.sourceViralUrl,
    candidate.productName,
    candidate.productTitle,
    candidate.metadata_json?.productName,
    candidate.metadata_json?.productHandle,
    candidate.metadata_json?.bundleName
  ].filter(Boolean).join(" ").toLowerCase();

  let score = Number(candidate.score || candidate.quality_score || candidate.engagementScore || 0);
  if (product.title && candidateText.includes(String(product.title).toLowerCase())) score += 24;
  if (product.handle && candidateText.includes(String(product.handle).toLowerCase())) score += 20;
  if (product.productType && candidateText.includes(String(product.productType).toLowerCase())) score += 8;
  if (candidate.previewUrl || candidate.preview_url) score += 8;
  if (candidate.publish_status === "published") score += 10;
  if (candidate.approval_status === "approved") score += 8;
  if (candidate.videoType === "faceless" || candidate.video_type === "faceless") score += 4;
  if (productText.includes(String(candidate.productName || candidate.metadata_json?.productName || "").toLowerCase())) score += 8;
  return score;
}

function upsertTopVideos(record, candidate = {}) {
  const candidateKey = String(candidate.mediaId || candidate.id || candidate.preview_url || candidate.previewUrl || candidate.sourceViralUrl || normalizeFormatKey(candidate));
  const format = {
    candidateKey,
    mediaId: candidate.mediaId || candidate.id || null,
    formatKey: normalizeFormatKey(candidate),
    formatType: candidate.formatType || candidate.video_type || candidate.videoType || candidate.templateName || candidate.renderProvider || candidate.media_type || "unknown-format",
    title: candidate.title || candidate.scriptTitle || candidate.caption || "Untitled candidate",
    script: candidate.script || candidate.rewrittenScript || candidate.spokenScript || candidate.caption || "",
    score: Number(candidate.score || candidate.quality_score || candidate.engagementScore || 0),
    previewUrl: candidate.previewUrl || candidate.preview_url || "",
    playbackUrl: candidate.playback_url || candidate.playbackUrl || "",
    sourceViralUrl: candidate.sourceViralUrl || candidate.metadata_json?.sourceViralUrl || "",
    sourceViralThumbnail: candidate.sourceViralThumbnail || candidate.metadata_json?.sourceViralThumbnail || "",
    publishedAt: candidate.publishedAt || candidate.published_at || null,
    publishStatus: candidate.publish_status || candidate.publishStatus || "",
    platform: candidate.platform || candidate.platformName || "",
    bestPlatform: candidate.bestPlatform || candidate.platform || "",
    revenue: Number(candidate.revenue || 0),
    responseRate: Number(candidate.responseRate || 0),
    profit: Number(candidate.profit || 0),
    updatedAt: nowIso()
  };

  const existingIndex = record.topFormats.findIndex((item) => String(item.candidateKey) === candidateKey);
  if (existingIndex >= 0) {
    record.topFormats[existingIndex] = { ...record.topFormats[existingIndex], ...format };
  } else {
    record.topFormats.push(format);
  }

  record.topFormats = [...record.topFormats]
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0) || String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
    .filter((item, index, array) => index === array.findIndex((entry) => String(entry.candidateKey) === String(item.candidateKey)))
    .slice(0, DEFAULT_TOP_LIMIT);
  record.topVideos = record.topFormats;
  record.topScore = record.topFormats[0] ? Number(record.topFormats[0].score || 0) : 0;
  record.updatedAt = nowIso();
  return record;
}

function summarizeProduct(product = {}) {
  return {
    productId: product.productId,
    title: product.title,
    handle: product.handle,
    productType: product.productType,
    imageUrl: product.imageUrl,
    bundleId: product.bundleId || "",
    bundleName: product.bundleName || "",
    storageUri: product.storageUri,
    topFormats: Array.isArray(product.topFormats) ? product.topFormats.slice(0, DEFAULT_TOP_LIMIT) : [],
    topVideos: Array.isArray(product.topVideos) ? product.topVideos.slice(0, DEFAULT_TOP_LIMIT) : [],
    publishingLog: Array.isArray(product.publishingLog) ? product.publishingLog.slice(0, 100) : [],
    platformPerformance: product.platformPerformance || {},
    lastScannedAt: product.lastScannedAt || null,
    lastPublishedAt: product.lastPublishedAt || null,
    topScore: Number(product.topScore || 0),
    totalPublished: Number(product.totalPublished || 0),
    totalRevenue: Number(product.totalRevenue || 0),
    totalProfit: Number(product.totalProfit || 0),
    totalImpressions: Number(product.totalImpressions || 0),
    totalClicks: Number(product.totalClicks || 0),
    totalConversions: Number(product.totalConversions || 0),
    totalResponseRate: Number(product.totalResponseRate || 0),
    bestPlatform: product.bestPlatform || "",
    bestVideoType: product.bestVideoType || "",
    updatedAt: product.updatedAt || nowIso()
  };
}

function recordPublishEvent(event = {}) {
  const state = readState();
  const productId = String(event.productId || event.product_id || event.productHandle || event.product_handle || event.product?.id || event.product?.handle || "unknown-product");
  const product = getProductRecord(state, { id: productId, title: event.productTitle || event.product?.title, handle: event.productHandle || event.product?.handle }, event.productMeta || event.product_meta || {});
  const publishId = String(event.publishId || event.id || `${product.productId}-publish-${Date.now()}`);
  const record = {
    publishId,
    productId: product.productId,
    productTitle: product.title,
    platform: normalizePlatform(event.platform || event.platformName || event.media?.platform || "Unknown"),
    videoType: normalizeVideoType(event.videoType || event.type || event.video_type || event.media?.videoType),
    formatId: String(event.formatId || event.format_id || event.media?.formatId || ""),
    formatTitle: String(event.formatTitle || event.format_title || event.media?.title || ""),
    revenue: Number(event.revenue || event.media?.revenue || 0),
    profit: Number(event.profit || event.media?.profit || 0),
    impressions: Number(event.impressions || event.media?.impressions || 0),
    clicks: Number(event.clicks || event.media?.clicks || 0),
    conversions: Number(event.conversions || event.media?.conversions || 0),
    responseRate: Number(event.responseRate || event.response_rate || event.media?.responseRate || 0),
    publishedAt: event.publishedAt || event.published_at || nowIso(),
    actor: event.actor || "publish-agent",
    metadata: event.metadata || {},
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  state.publishingHistory.unshift(record);
  state.publishingHistory = state.publishingHistory.slice(0, 500);
  product.publishingLog.unshift(record);
  product.publishingLog = product.publishingLog.slice(0, 100);
  product.totalPublished = Number(product.totalPublished || 0) + 1;
  product.totalRevenue = Number(product.totalRevenue || 0) + record.revenue;
  product.totalProfit = Number(product.totalProfit || 0) + record.profit;
  product.totalImpressions = Number(product.totalImpressions || 0) + record.impressions;
  product.totalClicks = Number(product.totalClicks || 0) + record.clicks;
  product.totalConversions = Number(product.totalConversions || 0) + record.conversions;
  product.totalResponseRate = Number(product.totalResponseRate || 0) + record.responseRate;
  product.lastPublishedAt = record.publishedAt;
  product.bestPlatform = product.bestPlatform || record.platform;
  product.bestVideoType = product.bestVideoType || record.videoType;
  product.updatedAt = nowIso();

  const platformKey = record.platform;
  product.platformPerformance[platformKey] = product.platformPerformance[platformKey] || { published: 0, revenue: 0, profit: 0, impressions: 0, clicks: 0, conversions: 0, responseRate: 0 };
  const stats = product.platformPerformance[platformKey];
  stats.published += 1;
  stats.revenue += record.revenue;
  stats.profit += record.profit;
  stats.impressions += record.impressions;
  stats.clicks += record.clicks;
  stats.conversions += record.conversions;
  stats.responseRate = record.responseRate;

  state.products[product.productId] = product;
  writeState(state);
  return record;
}

function updatePublishMetrics(publishId, metrics = {}, actor = "workspace") {
  const state = readState();
  const record = state.publishingHistory.find((entry) => String(entry.publishId) === String(publishId));
  if (!record) return null;
  Object.assign(record, {
    revenue: metrics.revenue !== undefined ? Number(metrics.revenue || 0) : record.revenue,
    profit: metrics.profit !== undefined ? Number(metrics.profit || 0) : record.profit,
    impressions: metrics.impressions !== undefined ? Number(metrics.impressions || 0) : record.impressions,
    clicks: metrics.clicks !== undefined ? Number(metrics.clicks || 0) : record.clicks,
    conversions: metrics.conversions !== undefined ? Number(metrics.conversions || 0) : record.conversions,
    responseRate: metrics.responseRate !== undefined ? Number(metrics.responseRate || 0) : record.responseRate,
    actor: actor || record.actor,
    updatedAt: nowIso()
  });
  const product = state.products[record.productId];
  if (product) {
    product.totalRevenue = state.publishingHistory.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + Number(item.revenue || 0), 0);
    product.totalProfit = state.publishingHistory.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + Number(item.profit || 0), 0);
    product.totalImpressions = state.publishingHistory.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + Number(item.impressions || 0), 0);
    product.totalClicks = state.publishingHistory.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + Number(item.clicks || 0), 0);
    product.totalConversions = state.publishingHistory.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + Number(item.conversions || 0), 0);
    product.totalResponseRate = state.publishingHistory.filter((item) => item.productId === record.productId).reduce((sum, item) => sum + Number(item.responseRate || 0), 0);
    product.updatedAt = nowIso();
  }
  writeState(state);
  return record;
}

function getProductFormats(productId = null) {
  const state = readState();
  if (!productId) return Object.values(state.products).map(summarizeProduct);
  const product = state.products[normalizeKey(productId, String(productId))];
  return product ? summarizeProduct(product) : null;
}

function logScanSession(session = {}) {
  const state = readState();
  const record = {
    sessionId: session.sessionId || `session-${Date.now()}`,
    mode: session.mode || state.scanMode,
    startedAt: session.startedAt || nowIso(),
    completedAt: session.completedAt || null,
    productsScanned: Number(session.productsScanned || 0),
    formatsFound: Number(session.formatsFound || 0),
    formatsUpgraded: Number(session.formatsUpgraded || 0),
    status: session.status || "completed",
    metadata: session.metadata || {}
  };
  state.scanSessions.unshift(record);
  state.scanSessions = state.scanSessions.slice(0, 100);
  writeState(state);
  return record;
}

function setScanMode(mode, actor = "system") {
  const state = readState();
  state.scanMode = mode;
  state.scanningActive = mode !== DEFAULT_SCAN_MODE;
  state.scanProgress = { ...(state.scanProgress || {}), running: state.scanningActive, mode, lastRefreshedAt: nowIso(), actor };
  writeState(state);
  return { scanMode: state.scanMode, scanningActive: state.scanningActive };
}

function getScanMode() {
  const state = readState();
  return { scanMode: state.scanMode, scanningActive: state.scanningActive };
}

function boardSummary() {
  const state = readState();
  const products = Object.values(state.products || {}).map(summarizeProduct);
  const topProducts = products
    .map((product) => ({
      productId: product.productId,
      title: product.title,
      totalPublished: Number(product.totalPublished || 0),
      totalRevenue: Number(product.totalRevenue || 0),
      totalProfit: Number(product.totalProfit || 0),
      totalImpressions: Number(product.totalImpressions || 0),
      totalClicks: Number(product.totalClicks || 0),
      totalConversions: Number(product.totalConversions || 0),
      totalResponseRate: Number(product.totalResponseRate || 0),
      lastScannedAt: product.lastScannedAt || null,
      bestPlatform: product.bestPlatform || "",
      bestVideoType: product.bestVideoType || "",
      formatsCount: Array.isArray(product.topFormats) ? product.topFormats.length : 0,
      topScore: Number(product.topScore || 0)
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalPublished - a.totalPublished || b.topScore - a.topScore)
    .slice(0, 10);

  const platformMap = new Map();
  state.publishingHistory.forEach((entry) => {
    const platform = entry.platform || "Unknown";
    const current = platformMap.get(platform) || { platform, published: 0, revenue: 0, profit: 0, impressions: 0, clicks: 0, conversions: 0, responseRate: 0 };
    current.published += 1;
    current.revenue += Number(entry.revenue || 0);
    current.profit += Number(entry.profit || 0);
    current.impressions += Number(entry.impressions || 0);
    current.clicks += Number(entry.clicks || 0);
    current.conversions += Number(entry.conversions || 0);
    current.responseRate = Number(entry.responseRate || 0);
    platformMap.set(platform, current);
  });

  const platformLeaderboard = [...platformMap.values()].sort((a, b) => b.revenue - a.revenue || b.published - a.published).slice(0, 10);
  const videoTypeMap = new Map();
  state.publishingHistory.forEach((entry) => {
    const videoType = entry.videoType || "unknown";
    const current = videoTypeMap.get(videoType) || { videoType, published: 0, revenue: 0, profit: 0 };
    current.published += 1;
    current.revenue += Number(entry.revenue || 0);
    current.profit += Number(entry.profit || 0);
    videoTypeMap.set(videoType, current);
  });

  return {
    scanMode: state.scanMode,
    scanningActive: state.scanningActive,
    topProducts,
    platformLeaderboard,
    videoTypeBreakdown: [...videoTypeMap.values()].sort((a, b) => b.published - a.published),
    recentScanSessions: state.scanSessions.slice(0, 25),
    revenueTotal: products.reduce((sum, product) => sum + Number(product.totalRevenue || 0), 0),
    profitTotal: products.reduce((sum, product) => sum + Number(product.totalProfit || 0), 0),
    updatedAt: state.updatedAt
  };
}

function recordScanPass({ job = {}, products = [], media = [], bundles = [] } = {}) {
  const state = readState();
  const scanner = { ...(state.scanProgress || defaultState().scanProgress) };
  scanner.running = Boolean(job.running);
  scanner.mode = job.mode || scanner.mode || DEFAULT_SCAN_MODE;
  scanner.sessionId = job.jobId || scanner.sessionId || `session-${Date.now()}`;
  scanner.lastRefreshedAt = nowIso();

  let matchesFound = 0;
  let topUpdates = 0;
  const productSummaries = [];

  for (const rawProduct of products) {
    const product = getProductRecord(state, rawProduct, rawProduct);
    let upgradedThisProduct = 0;
    const candidates = media
      .map((candidate) => ({ candidate, score: scoreCandidate(product, candidate) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 25);

    if (candidates.length) matchesFound += 1;
    candidates.forEach(({ candidate, score }) => {
      const beforeTop = product.topFormats[0]?.score || 0;
      upsertTopVideos(product, { ...candidate, score, title: candidate.title || product.title });
      if ((product.topFormats[0]?.score || 0) !== beforeTop) upgradedThisProduct += 1;
    });

    product.lastScannedAt = nowIso();
    product.topScore = product.topFormats[0] ? Number(product.topFormats[0].score || 0) : 0;
    state.products[product.productId] = product;
    topUpdates += upgradedThisProduct;
    productSummaries.push(summarizeProduct(product));
  }

  for (const bundle of bundles) {
    const bundleKey = normalizeBundleKey(bundle);
    state.bundles[bundleKey] = {
      bundleKey,
      title: bundle.title || bundle.name || bundleKey,
      topVideos: [],
      updatedAt: nowIso()
    };
  }

  scanner.progressLog = [
    { at: nowIso(), level: "info", detail: `Scanned ${products.length} products and updated ${topUpdates} top formats.`, metadata: { matchesFound } },
    ...(scanner.progressLog || [])
  ].slice(0, 100);
  scanner.boardSummary = boardSummary();
  state.scanProgress = scanner;
  state.scanMode = scanner.mode;
  state.scanningActive = Boolean(scanner.running && scanner.mode !== DEFAULT_SCAN_MODE);
  state.scanSessions.unshift({
    sessionId: scanner.sessionId,
    mode: scanner.mode,
    startedAt: job.startedAt || nowIso(),
    completedAt: nowIso(),
    productsScanned: products.length,
    formatsFound: matchesFound,
    formatsUpgraded: topUpdates,
    status: "completed",
    metadata: { jobId: job.jobId || "", assistMode: Boolean(job.mode === "assist") }
  });
  state.scanSessions = state.scanSessions.slice(0, 100);
  writeState(state);

  return {
    scanner: state.scanProgress,
    products: productSummaries,
    bundles: Object.values(state.bundles || {}),
    totals: { productsScanned: products.length, matchesFound, topUpdates }
  };
}

function startScanner({ jobId, mode = DEFAULT_SCAN_MODE } = {}) {
  const state = readState();
  state.scanMode = mode;
  state.scanningActive = mode !== DEFAULT_SCAN_MODE;
  state.scanProgress = {
    ...(state.scanProgress || defaultState().scanProgress),
    running: true,
    mode,
    sessionId: jobId || `session-${Date.now()}`,
    stopRequested: false,
    stopReason: "",
    lastRefreshedAt: nowIso()
  };
  writeState(state);
  return state.scanProgress;
}

function stopScanner(reason = "off switch") {
  const state = readState();
  state.scanMode = DEFAULT_SCAN_MODE;
  state.scanningActive = false;
  state.scanProgress = {
    ...(state.scanProgress || defaultState().scanProgress),
    running: false,
    mode: DEFAULT_SCAN_MODE,
    stopRequested: true,
    stopReason: reason,
    lastRefreshedAt: nowIso()
  };
  writeState(state);
  return state.scanProgress;
}

function getSnapshot() {
  const state = readState();
  return {
    scanner: state.scanProgress,
    products: Object.values(state.products).map(summarizeProduct),
    bundles: Object.values(state.bundles || {}),
    publishHistory: state.publishingHistory,
    history: state.scanSessions,
    boardSummary: boardSummary()
  };
}

module.exports = {
  STORE_PATH,
  readState,
  writeState,
  normalizeProductKey,
  normalizeBundleKey,
  normalizeFormatKey,
  normalizeVideoType,
  normalizePlatform,
  getProductRecord,
  scoreCandidate,
  upsertTopVideos,
  summarizeProduct,
  recordScanPass,
  startScanner,
  stopScanner,
  recordPublishEvent,
  updatePublishMetrics,
  getProductFormats,
  logScanSession,
  setScanMode,
  getScanMode,
  boardSummary,
  getSnapshot
};
