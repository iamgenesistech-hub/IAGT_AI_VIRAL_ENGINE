/**
 * YouTube Platform Connector
 * Uses YouTube Data API v3 for video uploads.
 * Docs: https://developers.google.com/youtube/v3/docs/videos/insert
 *
 * Setup: Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env
 */

"use strict";

const https = require("https");
const querystring = require("querystring");

class YouTubeConnector {
  constructor(env = {}) {
    this.env = env;
    this.name = "YouTube";
    this.type = "social";
  }

  preflight() {
    const missing = [];
    if (!this.env.YOUTUBE_CLIENT_ID) missing.push("YOUTUBE_CLIENT_ID");
    if (!this.env.YOUTUBE_CLIENT_SECRET) missing.push("YOUTUBE_CLIENT_SECRET");
    if (!this.env.YOUTUBE_REFRESH_TOKEN) missing.push("YOUTUBE_REFRESH_TOKEN");
    return { ready: missing.length === 0, missing };
  }

  /**
   * Upload a video to YouTube using a URL.
   * @param {object} media
   * @param {object} options - { title, description, tags, privacyStatus, accessToken }
   */
  async publish(media, options = {}) {
    const videoUrl = media.video_url || media.preview_url || media.downloadUrl || media.output_url;
    if (!videoUrl) {
      return { success: false, error: "No video URL on media record. Render must complete first." };
    }

    // Get fresh access token from refresh token
    const accessToken = options.accessToken || await this._refreshAccessToken();
    if (!accessToken) {
      return { success: false, error: "Failed to obtain YouTube access token from refresh token." };
    }

    // YouTube doesn't support pull-from-URL natively, we fetch bytes then upload
    const videoData = await this._fetchVideo(videoUrl);
    if (!videoData) {
      return { success: false, error: `Failed to fetch video from URL: ${videoUrl}` };
    }

    const title = options.title || media.title || "New Video";
    const description = this._buildDescription(media, options);
    const tags = options.tags || media.metadata_json?.hashtags || ["viral", "trending"];
    const privacyStatus = options.privacyStatus || "public";

    const metadata = {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: Array.isArray(tags) ? tags.map((t) => t.replace(/^#/, "")).slice(0, 500) : [],
        categoryId: "22", // People & Blogs
      },
      status: { privacyStatus },
    };

    const result = await this._uploadVideo(accessToken, videoData, metadata);
    if (!result.id) {
      return { success: false, error: `YouTube upload failed: ${JSON.stringify(result)}` };
    }

    return {
      success: true,
      platformPostId: result.id,
      url: `https://www.youtube.com/watch?v=${result.id}`,
      platform: "youtube",
      title,
      publishedAt: new Date().toISOString(),
    };
  }

  async _refreshAccessToken() {
    const body = querystring.stringify({
      client_id: this.env.YOUTUBE_CLIENT_ID,
      client_secret: this.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: this.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    });

    return new Promise((resolve) => {
      const req = https.request(
        { hostname: "oauth2.googleapis.com", path: "/token", method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) } },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try { resolve(JSON.parse(data).access_token || null); } catch { resolve(null); }
          });
        }
      );
      req.on("error", () => resolve(null));
      req.write(body);
      req.end();
    });
  }

  async _fetchVideo(url) {
    return new Promise((resolve) => {
      const client = url.startsWith("https") ? https : require("http");
      const chunks = [];
      client.get(url, (res) => {
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      }).on("error", () => resolve(null));
    });
  }

  async _uploadVideo(accessToken, videoBuffer, metadata) {
    const metaJson = JSON.stringify(metadata);

    // Use resumable upload
    const uploadUri = await this._initResumableUpload(accessToken, metaJson, videoBuffer.length);
    if (!uploadUri) return { error: "Failed to initialize YouTube resumable upload." };

    return new Promise((resolve) => {
      const url = new URL(uploadUri);
      const req = https.request(
        { hostname: url.hostname, path: url.pathname + url.search, method: "PUT",
          headers: { "Content-Type": "video/*", "Content-Length": videoBuffer.length } },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try { resolve(JSON.parse(data)); } catch { resolve({ error: data.slice(0, 200) }); }
          });
        }
      );
      req.on("error", (e) => resolve({ error: e.message }));
      req.write(videoBuffer);
      req.end();
    });
  }

  async _initResumableUpload(accessToken, metaJson, contentLength) {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "www.googleapis.com",
          path: `/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "Content-Length": Buffer.byteLength(metaJson),
            "X-Upload-Content-Type": "video/*",
            "X-Upload-Content-Length": contentLength,
          },
        },
        (res) => {
          resolve(res.headers.location || null);
        }
      );
      req.on("error", () => resolve(null));
      req.write(metaJson);
      req.end();
    });
  }

  _buildDescription(media, options = {}) {
    const parts = [];
    if (options.description) parts.push(options.description);
    else if (media.title) parts.push(media.title);
    if (options.affiliateLink) parts.push(`\n🛒 Shop here: ${options.affiliateLink}`);
    if (media.metadata_json?.productName) parts.push(`\nProduct: ${media.metadata_json.productName}`);
    return parts.join("\n").slice(0, 5000);
  }
}

module.exports = YouTubeConnector;
