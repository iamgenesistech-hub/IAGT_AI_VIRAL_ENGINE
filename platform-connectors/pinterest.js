/**
 * Pinterest Platform Connector
 * Uses Pinterest API v5 for Pin creation.
 * Docs: https://developers.pinterest.com/docs/api/v5/#operation/pins/create
 *
 * Setup: Set PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_ACCESS_TOKEN,
 *        PINTEREST_BOARD_ID in .env
 */

"use strict";

const https = require("https");

class PinterestConnector {
  constructor(env = {}) {
    this.env = env;
    this.name = "Pinterest";
    this.type = "social";
  }

  preflight() {
    const missing = [];
    if (!this.env.PINTEREST_APP_ID) missing.push("PINTEREST_APP_ID");
    if (!this.env.PINTEREST_APP_SECRET) missing.push("PINTEREST_APP_SECRET");
    const hasToken = this.env.PINTEREST_ACCESS_TOKEN || this.env.PINTEREST_DEFAULT_ACCESS_TOKEN;
    if (!hasToken) missing.push("PINTEREST_ACCESS_TOKEN");
    if (!this.env.PINTEREST_BOARD_ID) missing.push("PINTEREST_BOARD_ID");
    return { ready: missing.length === 0, missing };
  }

  async publish(media, options = {}) {
    const accessToken = options.accessToken || this.env.PINTEREST_ACCESS_TOKEN;
    const boardId = options.boardId || this.env.PINTEREST_BOARD_ID;
    const mediaUrl = media.video_url || media.preview_url || media.thumbnail_url || media.downloadUrl;

    if (!mediaUrl) {
      return { success: false, error: "No media URL found on media record." };
    }

    const title = (options.title || media.title || "New Pin").slice(0, 100);
    const description = this._buildDescription(media, options);
    const isVideo = !!(media.video_url || media.downloadUrl || media.output_url);

    const body = JSON.stringify({
      board_id: boardId,
      title,
      description,
      media_source: isVideo
        ? { source_type: "video_url", url: mediaUrl }
        : { source_type: "image_url", url: mediaUrl },
      link: options.affiliateLink || options.link || "",
    });

    const result = await this._apiPost("/v5/pins", body, accessToken);

    if (result.id) {
      return {
        success: true,
        platformPostId: result.id,
        url: `https://www.pinterest.com/pin/${result.id}`,
        platform: "pinterest",
        publishedAt: new Date().toISOString(),
      };
    }

    return { success: false, error: `Pinterest API error: ${JSON.stringify(result)}` };
  }

  _apiPost(path, body, accessToken) {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.pinterest.com",
          path,
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => { data += chunk; });
          res.on("end", () => {
            try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); }
          });
        }
      );
      req.on("error", (e) => resolve({ error: e.message }));
      req.write(body);
      req.end();
    });
  }

  _buildDescription(media, options = {}) {
    const parts = [];
    if (options.description) parts.push(options.description);
    else if (media.title) parts.push(media.title);
    if (options.affiliateLink) parts.push(`Shop: ${options.affiliateLink}`);
    const hashtags = options.hashtags || media.metadata_json?.hashtags || [];
    if (Array.isArray(hashtags) && hashtags.length) {
      parts.push(hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
    }
    return parts.join("\n\n").slice(0, 500);
  }
}

module.exports = PinterestConnector;
