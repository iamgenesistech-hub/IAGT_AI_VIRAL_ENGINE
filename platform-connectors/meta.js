/**
 * Meta Platform Connector — Instagram + Facebook
 * Uses Meta Graph API v18+ for Reels and Feed video posting.
 * Docs: https://developers.facebook.com/docs/instagram-api/content-publishing
 *
 * Setup: Set META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN,
 *        META_INSTAGRAM_ACCOUNT_ID (or META_FACEBOOK_PAGE_ID) in .env
 */

"use strict";

const https = require("https");

class MetaConnector {
  constructor(env = {}) {
    this.env = env;
    this.name = "Meta (Facebook/Instagram)";
    this.type = "social";
    this.apiVersion = "v18.0";
    this.baseHost = "graph.facebook.com";
  }

  preflight() {
    const missing = [];
    if (!this.env.META_APP_ID) missing.push("META_APP_ID");
    if (!this.env.META_APP_SECRET) missing.push("META_APP_SECRET");
    const hasToken = this.env.META_ACCESS_TOKEN || this.env.META_PAGE_ACCESS_TOKEN;
    if (!hasToken) missing.push("META_ACCESS_TOKEN");
    const hasTarget = this.env.META_INSTAGRAM_ACCOUNT_ID || this.env.META_FACEBOOK_PAGE_ID;
    if (!hasTarget) missing.push("META_INSTAGRAM_ACCOUNT_ID or META_FACEBOOK_PAGE_ID");
    return { ready: missing.length === 0, missing };
  }

  /**
   * Publish a video to Instagram (Reels) or Facebook (Feed/Reels).
   * @param {object} media
   * @param {object} options - { caption, hashtags, platform (instagram|facebook), accessToken, accountId }
   */
  async publish(media, options = {}) {
    const platform = options.subPlatform || (options.platform === "facebook" ? "facebook" : "instagram");
    const accessToken = options.accessToken || this.env.META_ACCESS_TOKEN || this.env.META_PAGE_ACCESS_TOKEN;
    const videoUrl = media.video_url || media.preview_url || media.downloadUrl || media.output_url;

    if (!videoUrl) {
      return { success: false, error: "No video URL on media record. Render must complete before publishing." };
    }

    const caption = this._buildCaption(media, options);

    if (platform === "instagram") {
      return this._publishInstagramReel(videoUrl, caption, accessToken, options);
    } else {
      return this._publishFacebookVideo(videoUrl, caption, accessToken, options);
    }
  }

  async _publishInstagramReel(videoUrl, caption, accessToken, options = {}) {
    const igAccountId = options.accountId || this.env.META_INSTAGRAM_ACCOUNT_ID;
    if (!igAccountId) {
      return { success: false, error: "META_INSTAGRAM_ACCOUNT_ID required for Instagram publishing." };
    }

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: "true",
      access_token: accessToken,
    });

    const containerResult = await this._apiPost(`/${this.apiVersion}/${igAccountId}/media`, containerParams.toString());
    if (!containerResult.id) {
      return { success: false, error: `Instagram container creation failed: ${JSON.stringify(containerResult)}` };
    }

    // Step 2: Wait for container to process (poll status)
    const containerId = containerResult.id;
    await this._waitForContainerReady(containerId, accessToken);

    // Step 3: Publish the container
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const publishResult = await this._apiPost(`/${this.apiVersion}/${igAccountId}/media_publish`, publishParams.toString());
    if (!publishResult.id) {
      return { success: false, error: `Instagram publish failed: ${JSON.stringify(publishResult)}` };
    }

    return {
      success: true,
      platformPostId: publishResult.id,
      url: `https://www.instagram.com/p/${publishResult.id}`,
      platform: "instagram",
      caption,
      publishedAt: new Date().toISOString(),
    };
  }

  async _publishFacebookVideo(videoUrl, caption, accessToken, options = {}) {
    const pageId = options.accountId || this.env.META_FACEBOOK_PAGE_ID;
    if (!pageId) {
      return { success: false, error: "META_FACEBOOK_PAGE_ID required for Facebook publishing." };
    }

    const body = new URLSearchParams({
      file_url: videoUrl,
      description: caption,
      access_token: accessToken,
    });

    const result = await this._apiPost(`/${this.apiVersion}/${pageId}/videos`, body.toString());
    if (!result.id) {
      return { success: false, error: `Facebook video upload failed: ${JSON.stringify(result)}` };
    }

    return {
      success: true,
      platformPostId: result.id,
      url: `https://www.facebook.com/video/${result.id}`,
      platform: "facebook",
      caption,
      publishedAt: new Date().toISOString(),
    };
  }

  async _waitForContainerReady(containerId, accessToken, maxWaitMs = 60000) {
    const pollInterval = 5000;
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const status = await this._apiGet(`/${this.apiVersion}/${containerId}?fields=status_code&access_token=${accessToken}`);
      if (status.status_code === "FINISHED") return true;
      if (status.status_code === "ERROR") return false;
    }
    return false;
  }

  _apiPost(path, body) {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: this.baseHost,
          path,
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: data }); }
          });
        }
      );
      req.on("error", (e) => resolve({ error: e.message }));
      req.write(body);
      req.end();
    });
  }

  _apiGet(path) {
    return new Promise((resolve) => {
      const req = https.request({ hostname: this.baseHost, path, method: "GET" }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: data }); }
        });
      });
      req.on("error", (e) => resolve({ error: e.message }));
      req.end();
    });
  }

  _buildCaption(media, options = {}) {
    const parts = [];
    if (options.caption) parts.push(options.caption);
    else if (media.title) parts.push(media.title);
    const hashtags = options.hashtags || media.metadata_json?.hashtags || ["#viral", "#trending"];
    if (Array.isArray(hashtags)) parts.push(hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
    if (options.affiliateLink) parts.push(`🛒 Shop: ${options.affiliateLink}`);
    return parts.join("\n\n").slice(0, 2200);
  }
}

module.exports = MetaConnector;
