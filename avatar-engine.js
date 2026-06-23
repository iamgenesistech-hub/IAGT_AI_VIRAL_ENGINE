/**
 * EVICS Avatar Engine
 * Generates affiliate AI avatars from uploaded photo + voice samples.
 * Uses HeyGen API (already configured in EVICS) for avatar + video creation.
 * Also supports D-ID as fallback provider.
 *
 * Flow: Affiliate uploads photo + voice → EVICS creates talking avatar →
 *       Avatar used in product video ads matching their chosen product + style
 */

"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const AVATARS_FILE = path.join(__dirname, "avatars.local.json");

// ---- I/O ----
function readAvatars() {
  if (!fs.existsSync(AVATARS_FILE)) return { avatars: [] };
  try { return JSON.parse(fs.readFileSync(AVATARS_FILE, "utf8")); } catch { return { avatars: [] }; }
}
function saveAvatars(data) {
  fs.writeFileSync(AVATARS_FILE, JSON.stringify(data, null, 2));
}

// ---- Providers ----

class HeyGenAvatarProvider {
  constructor(env = {}) {
    this.apiKey = env.HEYGEN_API_KEY;
    this.baseUrl = "https://api.heygen.com";
  }

  isConfigured() { return Boolean(this.apiKey); }

  /**
   * Create a custom talking photo avatar from an image URL.
   * HeyGen Talking Photo API lets you animate a still photo.
   */
  async createTalkingPhotoAvatar({ name, photoUrl, voiceId }) {
    const body = JSON.stringify({
      talking_photo_name: name || "My Avatar",
      talking_photo_url: photoUrl,
    });
    return this._post("/v2/talking_photo", body);
  }

  /**
   * Generate a video using an affiliate avatar with a given script + product.
   */
  async generateAvatarVideo({ avatarId, voiceId, script, title, productImageUrl, width = 1080, height = 1920 }) {
    const body = JSON.stringify({
      video_inputs: [{
        character: { type: "talking_photo", talking_photo_id: avatarId },
        voice: { type: "text", input_text: script, voice_id: voiceId || this._defaultVoiceId() },
        background: productImageUrl
          ? { type: "image", url: productImageUrl }
          : { type: "color", value: "#111827" },
      }],
      title: title || "Affiliate Ad",
      captions: true,
      dimension: { width, height },
    });
    return this._post("/v2/video/generate", body);
  }

  /**
   * Get video generation status.
   */
  async getVideoStatus(videoId) {
    return this._get(`/v1/video_status.get?video_id=${videoId}`);
  }

  /**
   * List available voices.
   */
  async listVoices() {
    return this._get("/v2/voices");
  }

  _defaultVoiceId() { return "en-US-Neural2-D"; }

  _post(path, body) {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: "api.heygen.com",
        path,
        method: "POST",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      }, (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); } });
      });
      req.on("error", (e) => resolve({ error: e.message }));
      req.write(body);
      req.end();
    });
  }

  _get(path) {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: "api.heygen.com",
        path,
        method: "GET",
        headers: { "X-Api-Key": this.apiKey },
      }, (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); } });
      });
      req.on("error", (e) => resolve({ error: e.message }));
      req.end();
    });
  }
}

class DIDProvider {
  constructor(env = {}) {
    this.apiKey = env.DID_API_KEY;
  }

  isConfigured() { return Boolean(this.apiKey); }

  async createTalkingAvatar({ photoUrl, script, voiceId }) {
    const auth = Buffer.from(`${this.apiKey}:`).toString("base64");
    const body = JSON.stringify({
      source_url: photoUrl,
      script: {
        type: "text",
        subtitles: true,
        input: script,
        provider: { type: "microsoft", voice_id: voiceId || "en-US-JennyNeural" },
      },
    });

    return new Promise((resolve) => {
      const req = https.request({
        hostname: "api.d-id.com",
        path: "/talks",
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      }, (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); } });
      });
      req.on("error", (e) => resolve({ error: e.message }));
      req.write(body);
      req.end();
    });
  }
}

// ---- Main Avatar Engine ----

/**
 * Create an affiliate avatar.
 * @param {object} params
 * @param {string} params.affiliateId
 * @param {string} params.name - Avatar display name
 * @param {string} params.photoUrl - URL to uploaded photo
 * @param {string} params.voiceId - Optional preferred voice ID
 * @param {string} params.style - avatar | faceless | viral-format
 */
async function createAffiliateAvatar({ affiliateId, name, photoUrl, voiceId, style = "avatar" }) {
  const env = process.env;
  const provider = new HeyGenAvatarProvider(env);

  if (!provider.isConfigured()) {
    // Fallback to D-ID
    const did = new DIDProvider(env);
    if (!did.isConfigured()) {
      return { success: false, error: "No avatar provider configured. Add HEYGEN_API_KEY or DID_API_KEY to .env" };
    }
  }

  const avatarId = "ava_" + crypto.randomBytes(6).toString("hex");
  const now = new Date().toISOString();

  // Create avatar entry (pending HeyGen processing)
  const avatar = {
    id: avatarId,
    affiliateId,
    name: name || "My Avatar",
    photoUrl,
    voiceId: voiceId || "",
    style,
    heygenTalkingPhotoId: null,
    heygenVideoId: null,
    previewVideoUrl: null,
    status: "pending",      // pending | processing | ready | failed
    provider: "heygen",
    createdAt: now,
    readyAt: null,
    error: null,
  };

  if (provider.isConfigured() && photoUrl) {
    try {
      const result = await provider.createTalkingPhotoAvatar({ name, photoUrl, voiceId });
      if (result.data?.talking_photo_id) {
        avatar.heygenTalkingPhotoId = result.data.talking_photo_id;
        avatar.status = "ready";
        avatar.readyAt = now;
      } else if (result.error) {
        avatar.status = "failed";
        avatar.error = String(result.error);
      }
    } catch (err) {
      avatar.status = "failed";
      avatar.error = err.message;
    }
  }

  const data = readAvatars();
  data.avatars = data.avatars || [];
  data.avatars.push(avatar);
  saveAvatars(data);

  return { success: true, avatar };
}

/**
 * Generate a product video using an affiliate avatar.
 * @param {object} params
 * @param {string} params.affiliateId
 * @param {string} params.avatarId - Avatar ID from createAffiliateAvatar
 * @param {string} params.productId - Viral product ID
 * @param {string} params.productTitle
 * @param {string} params.productImageUrl
 * @param {string} params.style - avatar | faceless | viral-format
 * @param {string} params.script - Custom script (auto-generated if not provided)
 */
async function generateProductVideo({ affiliateId, avatarId, productId, productTitle, productImageUrl, style = "avatar", script, affiliateCode }) {
  const env = process.env;
  const provider = new HeyGenAvatarProvider(env);

  if (!provider.isConfigured()) {
    return { success: false, error: "HEYGEN_API_KEY required for video generation." };
  }

  const data = readAvatars();
  const avatar = data.avatars?.find((a) => a.id === avatarId && a.affiliateId === affiliateId);

  if (!avatar) return { success: false, error: "Avatar not found." };
  if (!avatar.heygenTalkingPhotoId) return { success: false, error: "Avatar is not ready yet." };

  const finalScript = script || buildProductScript(productTitle, affiliateCode, style);

  const result = await provider.generateAvatarVideo({
    avatarId: avatar.heygenTalkingPhotoId,
    voiceId: avatar.voiceId,
    script: finalScript,
    title: `${productTitle} - ${affiliateCode}`,
    productImageUrl,
  });

  if (result.data?.video_id) {
    // Update avatar record with pending video
    avatar.heygenVideoId = result.data.video_id;
    avatar.status = "video_pending";
    saveAvatars(data);

    return {
      success: true,
      videoId: result.data.video_id,
      status: "processing",
      message: "Video is rendering. Check status with /api/affiliate/avatar/video-status",
    };
  }

  return { success: false, error: `Video generation failed: ${JSON.stringify(result)}` };
}

/**
 * Poll video status from HeyGen.
 */
async function checkVideoStatus(videoId) {
  const provider = new HeyGenAvatarProvider(process.env);
  if (!provider.isConfigured()) return { success: false, error: "HEYGEN_API_KEY not configured." };

  const result = await provider.getVideoStatus(videoId);
  const status = result.data?.status;
  const url = result.data?.video_url;

  if (status === "completed" && url) {
    // Update avatar record
    const data = readAvatars();
    data.avatars?.forEach((a) => {
      if (a.heygenVideoId === videoId) {
        a.previewVideoUrl = url;
        a.status = "ready";
        a.readyAt = new Date().toISOString();
      }
    });
    saveAvatars(data);
  }

  return { success: true, status, videoUrl: url || null };
}

function buildProductScript(productTitle, affiliateCode, style = "avatar") {
  const scripts = {
    avatar: `Hey everyone! I just found this amazing product — ${productTitle}. I've been using it and honestly the results are incredible. The quality is top tier and it's perfect for everyday use. If you want to try it, click the link in my bio and use my code ${affiliateCode} for a special deal. You won't regret it!`,
    faceless: `Stop scrolling — you need to see this. ${productTitle} is going absolutely viral right now and here's why. The results speak for themselves. Thousands of people are already using this and getting incredible results. Get yours now with link in bio. Code ${affiliateCode} saves you extra.`,
    "viral-format": `POV: you find the product everyone's been talking about. ${productTitle}. This is why it has millions of views. The secret? It actually works. Every single time. Link in bio — use code ${affiliateCode}.`,
  };
  return scripts[style] || scripts.avatar;
}

function getAffiliateAvatars(affiliateId) {
  const data = readAvatars();
  return (data.avatars || []).filter((a) => a.affiliateId === affiliateId);
}

module.exports = {
  createAffiliateAvatar,
  generateProductVideo,
  checkVideoStatus,
  getAffiliateAvatars,
  HeyGenAvatarProvider,
  DIDProvider,
};
