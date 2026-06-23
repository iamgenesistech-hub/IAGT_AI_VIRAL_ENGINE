/**
 * TikTok Platform Connector
 * Uses TikTok Content Posting API v2 for video uploads.
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-post-video
 *
 * Setup: Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_ACCESS_TOKEN in .env
 * Note: Requires user-level access_token from TikTok OAuth flow for each affiliate
 */

"use strict";

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

class TikTokConnector {
  constructor(env = {}) {
    this.env = env;
    this.name = "TikTok";
    this.type = "social";
    this.baseUrl = "https://open.tiktokapis.com";
  }

  preflight() {
    const missing = [];
    if (!this.env.TIKTOK_CLIENT_KEY) missing.push("TIKTOK_CLIENT_KEY");
    if (!this.env.TIKTOK_CLIENT_SECRET) missing.push("TIKTOK_CLIENT_SECRET");
    // Access token can be per-user (affiliate) or a default app-level token
    const hasToken = this.env.TIKTOK_ACCESS_TOKEN || this.env.TIKTOK_DEFAULT_ACCESS_TOKEN;
    if (!hasToken) missing.push("TIKTOK_ACCESS_TOKEN");
    return { ready: missing.length === 0, missing };
  }

  /**
   * Publish a video to TikTok.
   * @param {object} media - Media record with video_url or file_path
   * @param {object} options - { caption, hashtags, accessToken (per-affiliate), privacyLevel }
   */
  async publish(media, options = {}) {
    const accessToken = options.accessToken || this.env.TIKTOK_ACCESS_TOKEN || this.env.TIKTOK_DEFAULT_ACCESS_TOKEN;
    const videoUrl = media.video_url || media.preview_url || media.downloadUrl || media.output_url;

    if (!videoUrl) {
      return { success: false, error: "No video URL found on media record. Ensure rendering completed successfully." };
    }

    const caption = this._buildCaption(media, options);

    // Step 1: Initialize upload
    const initResult = await this._initVideoUpload(accessToken, videoUrl, caption, options);
    if (!initResult.success) return initResult;

    return {
      success: true,
      platformPostId: initResult.publish_id,
      url: `https://www.tiktok.com/@me/video/${initResult.publish_id}`,
      platform: "tiktok",
      caption,
      publishedAt: new Date().toISOString(),
    };
  }

  async _initVideoUpload(accessToken, videoUrl, caption, options = {}) {
    const privacyLevel = options.privacyLevel || "PUBLIC_TO_EVERYONE";
    const body = JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "open.tiktokapis.com",
          path: "/v2/post/publish/video/init/",
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              if (json.error && json.error.code !== "ok") {
                resolve({ success: false, error: `TikTok API error: ${json.error.message} (${json.error.code})` });
              } else {
                resolve({ success: true, publish_id: json.data?.publish_id || "pending" });
              }
            } catch (e) {
              resolve({ success: false, error: `TikTok response parse error: ${e.message}. Raw: ${data.slice(0, 200)}` });
            }
          });
        }
      );
      req.on("error", (e) => resolve({ success: false, error: `TikTok connection error: ${e.message}` }));
      req.write(body);
      req.end();
    });
  }

  _buildCaption(media, options = {}) {
    const parts = [];
    if (options.caption) {
      parts.push(options.caption);
    } else if (media.title) {
      parts.push(media.title);
    }
    const hashtags = options.hashtags || media.metadata_json?.hashtags || ["#viral", "#trending", "#shop"];
    if (Array.isArray(hashtags)) {
      parts.push(hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
    }
    if (options.affiliateLink) {
      parts.push(`🔗 ${options.affiliateLink}`);
    }
    return parts.join("\n\n").slice(0, 2200);
  }
}

module.exports = TikTokConnector;
