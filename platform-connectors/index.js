/**
 * EVICS Platform Connectors — Delivery Router
 * Dispatches queued renders to their target social/publishing platforms.
 * Supports: TikTok, Meta (Instagram/Facebook), YouTube, Pinterest, Shopify
 */

"use strict";

const TikTokConnector = require("./tiktok");
const MetaConnector = require("./meta");
const YouTubeConnector = require("./youtube");
const PinterestConnector = require("./pinterest");

// Connector registry — maps platform string to class
const CONNECTORS = {
  tiktok: TikTokConnector,
  instagram: MetaConnector,
  facebook: MetaConnector,
  meta: MetaConnector,
  youtube: YouTubeConnector,
  pinterest: PinterestConnector,
};

/**
 * Dispatch a single media item to a platform.
 * @param {string} platform - Platform name (tiktok, instagram, youtube, etc.)
 * @param {object} media - Media record from media-ops state
 * @param {object} options - Extra options (caption, hashtags, affiliateId, etc.)
 * @returns {Promise<{success: boolean, platformPostId?: string, url?: string, error?: string}>}
 */
async function dispatchToPlatform(platform, media, options = {}) {
  const key = String(platform || "").toLowerCase().trim();
  const ConnectorClass = CONNECTORS[key];

  if (!ConnectorClass) {
    return { success: false, error: `Unsupported platform: "${platform}". Supported: ${Object.keys(CONNECTORS).join(", ")}` };
  }

  const connector = new ConnectorClass(process.env);
  const preflight = connector.preflight();
  if (!preflight.ready) {
    return {
      success: false,
      error: `${connector.name} not configured. Missing: ${preflight.missing.join(", ")}. Visit API_KEYS_CHECKLIST.md to add credentials.`,
      configurationRequired: true,
      missing: preflight.missing,
    };
  }

  try {
    const result = await connector.publish(media, options);
    return result;
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Dispatch to multiple platforms in parallel.
 * Returns a map of platform → result.
 */
async function dispatchToMultiplePlatforms(platforms, media, options = {}) {
  const results = {};
  await Promise.all(
    platforms.map(async (platform) => {
      results[platform] = await dispatchToPlatform(platform, media, options);
    })
  );
  return results;
}

/**
 * Get configuration status for all known platforms.
 */
function getAllPlatformStatus() {
  return Object.entries(CONNECTORS).map(([key, ConnectorClass]) => {
    const connector = new ConnectorClass(process.env);
    const preflight = connector.preflight();
    return {
      id: key,
      name: connector.name,
      type: connector.type,
      configured: preflight.ready,
      missing: preflight.missing,
      status: preflight.ready ? "✅ Ready" : "⚠️ Needs credentials",
    };
  });
}

module.exports = { dispatchToPlatform, dispatchToMultiplePlatforms, getAllPlatformStatus };
