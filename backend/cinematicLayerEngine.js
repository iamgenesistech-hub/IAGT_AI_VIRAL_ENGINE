/**
 * cinematicLayerEngine.js — EVICS Cinematic Post-Render Layer
 *
 * Architecture (two distinct cinematic passes):
 *
 *   Pass A — Seedance (image-to-video via AIML API):
 *     Takes the product mockup image and generates a high-quality cinematic
 *     product B-roll clip (Seedance 2.0 / 1.0 Pro). Camera motion is
 *     driven via descriptive prompt text (no structured camera params).
 *     API: https://api.aimlapi.com/v2/video/generations
 *
 *   Pass B — Kling AI (video-to-video with structured camera control):
 *     Takes the completed HeyGen avatar video and applies real camera
 *     movement (zoom_in, pan_left, etc.) via `advanced_camera_control`
 *     API params. Kling v2 exposes movement_type + movement_value natively.
 *     API: https://api.klingai.com/v1/videos/video2video
 *
 * Provider priority:
 *   1. AIMLAPI_KEY set  → Seedance (Pass A)  [best cinematic product B-roll]
 *   2. KLING_API_KEY set → Kling   (Pass B)  [best structured camera on avatar video]
 *   3. Both set         → Seedance preferred  (Pass A)
 *   4. Neither set      → passthrough (HeyGen URL returned untouched)
 *
 * Required env vars:
 *   AIMLAPI_KEY        — AIML API key for Seedance (get at aimlapi.com)
 *   KLING_API_KEY      — Kling AI key (fallback / structured camera control)
 *   CINEMATIC_ENABLED  — set to 'false' to disable globally (default: true)
 *
 * Deprecated (ignored):
 *   SEEDANCE_API_KEY   — previously pointed at VolcEngine directly; now use AIMLAPI_KEY
 *   SEEDANCE_BASE_URL  — no longer used; AIML API base URL is fixed
 */

'use strict';

const crypto = require('crypto');

// AIML API is the verified production gateway for Seedance (ByteDance authorized reseller).
// Direct seedance.ai domain does not exist. VolcEngine Ark is CN-only.
const AIMLAPI_BASE_URL = 'https://api.aimlapi.com';
const KLING_BASE_URL   = 'https://api.klingai.com';

const DEFAULT_POLL_INTERVAL_MS = 15000; // Seedance typical time: 34s–3.5min
const DEFAULT_POLL_TIMEOUT_MS  = 8 * 60 * 1000;
const MAX_POLL_BACKOFF_MS      = 30000;

/**
 * Camera move vocab.
 * Seedance: camera motion is prompt-text only (no structured params).
 *           camerafixed=true suppresses movement (not guaranteed).
 * Kling:    movement_type is a real API field with structured values.
 */
const CAMERA_MOVE_MAP = {
  'zoom-in':    { prompt: 'slow dolly push-in zoom in toward the subject',    kling: 'zoom_in'    },
  'zoom-out':   { prompt: 'slow dolly pull-back zoom out revealing the scene', kling: 'zoom_out'   },
  'pan-left':   { prompt: 'smooth horizontal pan left',                        kling: 'pan_left'   },
  'pan-right':  { prompt: 'smooth horizontal pan right',                       kling: 'pan_right'  },
  'dolly-in':   { prompt: 'cinematic dolly in toward the subject',             kling: 'dolly_in'   },
  'dolly-out':  { prompt: 'cinematic dolly out pulling back',                  kling: 'dolly_out'  },
  'tilt-up':    { prompt: 'smooth camera tilt upward',                        kling: 'tilt_up'    },
  'tilt-down':  { prompt: 'smooth camera tilt downward',                      kling: 'tilt_down'  },
  'truck-left': { prompt: 'lateral camera truck move to the left',            kling: null         },
  'truck-right':{ prompt: 'lateral camera truck move to the right',           kling: null         }
};

// Intensity → motion_strength for Kling (0.1–1.0)
const INTENSITY_TO_STRENGTH = { 1: 0.4, 2: 0.65, 3: 0.9 };

// Seedance model selection: fast tier for standard renders, pro for elite
const SEEDANCE_MODEL_FAST = 'bytedance/seedance-2-0-fast';
const SEEDANCE_MODEL_PRO  = 'bytedance/seedance-1-0-pro-i2v';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isCinematicEnabled() {
  const flag = String(process.env.CINEMATIC_ENABLED || 'true').trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'no';
}

function getAimlApiKey() {
  // Accept AIMLAPI_KEY (preferred) or legacy SEEDANCE_API_KEY alias
  return String(process.env.AIMLAPI_KEY || process.env.SEEDANCE_API_KEY || '').trim();
}

function getKlingKey() {
  return String(process.env.KLING_API_KEY || '').trim();
}

function getKlingLegacyAccessKey() {
  return String(process.env.KLING_ACCESS_KEY || '').trim();
}

function getKlingLegacySecretKey() {
  return String(process.env.KLING_SECRET_KEY || '').trim();
}

function createJwtToken(header, payload, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const encodedHeader = encode(header);
  const encodedPayload = encode(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function getKlingAuthHeaders() {
  const accessKey = getKlingLegacyAccessKey();
  const secretKey = getKlingLegacySecretKey();
  if (accessKey && secretKey) {
    const now = Math.floor(Date.now() / 1000);
    const token = createJwtToken({ alg: 'HS256', typ: 'JWT' }, { iss: accessKey, exp: now + 300, iat: now }, secretKey);
    return { Authorization: 'Bearer ' + token };
  }
  const apiKey = getKlingKey();
  if (apiKey) return { Authorization: 'Bearer ' + apiKey };
  return {};
}

function resolveProvider() {
  if (!isCinematicEnabled()) return 'passthrough';
  if (getAimlApiKey()) return 'seedance';
  if (getKlingKey() || (getKlingLegacyAccessKey() && getKlingLegacySecretKey())) return 'kling';
  return 'passthrough';
}

// ─── SEEDANCE via AIML API ────────────────────────────────────────────────────
// Verified endpoints (research confirmed 2026-07):
//   POST GET https://api.aimlapi.com/v2/video/generations
//   Status values: "queued" | "generating" | "completed" | "error" | "succeeded" (1.0 models)
//   Output field:  response.video.url

async function aimlApiFetch(path, options = {}) {
  const key = getAimlApiKey();
  const url = AIMLAPI_BASE_URL + path;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${key}`,
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
  const text = await response.text().catch(() => '');
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 800) }; }
  if (!response.ok) {
    const msg = payload?.message || payload?.error?.message || payload?.error || `AIML API HTTP ${response.status}`;
    const err = new Error(msg);
    err.statusCode = response.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

/**
 * Submit a Seedance image-to-video job via AIML API.
 *
 * Seedance does NOT support structured camera parameters — all camera motion
 * is driven by natural-language text in the `prompt` field.
 *
 * @param {string} imageUrl       — product mockup image URL (first frame anchor)
 * @param {string[]} cameraMoves  — EVICS camera move names to translate to prompt phrases
 * @param {number} intensity      — 1–3 (maps to prompt weight: subtle/standard/dramatic)
 * @param {string} motionPrompt   — extra cinematic direction text
 * @param {string} aspectRatio    — '9:16' | '16:9' | '1:1'
 * @param {string} tier           — 'fast' | 'pro'
 */
async function startSeedanceJob({ imageUrl, videoUrl, cameraMoves = [], intensity = 2, motionPrompt = '', aspectRatio = '9:16', tier = 'fast' }) {
  // Build camera motion prompt from EVICS move names
  const movePrompts = (cameraMoves || [])
    .map(m => CAMERA_MOVE_MAP[String(m).toLowerCase()]?.prompt)
    .filter(Boolean);

  const intensityAdverb = intensity >= 3 ? 'dramatic' : intensity <= 1 ? 'subtle' : 'smooth';
  const cameraLine = movePrompts.length
    ? `Camera movement: ${movePrompts.join(', then ')}.`
    : `${intensityAdverb.charAt(0).toUpperCase() + intensityAdverb.slice(1)} cinematic camera motion — zoom and pan.`;

  const fullPrompt = [
    motionPrompt,
    cameraLine,
    'Cinematic product commercial, professional lighting, depth of field,',
    'natural presenter body movement, product clearly visible throughout,',
    'elite social media video quality.'
  ].filter(Boolean).join(' ').trim();

  const model = tier === 'pro' ? SEEDANCE_MODEL_PRO : SEEDANCE_MODEL_FAST;

  // Use imageUrl (product mockup) as the visual anchor for I2V.
  // If only a videoUrl was provided (legacy call), skip Seedance submission.
  const primaryImageUrl = imageUrl || null;
  if (!primaryImageUrl) {
    throw new Error('Seedance I2V requires an imageUrl (product mockup). Use Kling for video-to-video.');
  }

  const body = {
    model,
    prompt: fullPrompt,
    image_url: primaryImageUrl,
    aspect_ratio: aspectRatio,
    resolution: tier === 'pro' ? '1080p' : '720p',
    duration: 8,
    generate_audio: false,
    watermark: false
  };

  console.log(`[Seedance] Submitting I2V job — model: ${model}, moves: ${cameraMoves.join(',') || 'auto'}`);
  const response = await aimlApiFetch('/v2/video/generations', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  const jobId = response?.id || response?.generation_id || null;
  if (!jobId) {
    const err = new Error('AIML API accepted the request but did not return an id.');
    err.payload = response;
    throw err;
  }

  return { job_id: jobId, status: 'queued', provider: 'seedance', model };
}

async function getSeedanceJobStatus(jobId) {
  const response = await aimlApiFetch(`/v2/video/generations?generation_id=${encodeURIComponent(jobId)}`, { method: 'GET' });
  const rawStatus = String(response?.status || 'generating').toLowerCase();
  // AIML API returns 'completed'; older 1.0 models may return 'succeeded'
  const videoUrl = response?.video?.url || null;
  const normalizedStatus =
    (rawStatus === 'completed' || rawStatus === 'succeeded' || rawStatus === 'success') ? 'completed' :
    (rawStatus === 'error'     || rawStatus === 'failed') ? 'failed' : 'processing';
  return { status: normalizedStatus, video_url: videoUrl, raw: response };
}

async function pollSeedanceJob(jobId, { timeoutMs = DEFAULT_POLL_TIMEOUT_MS, intervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
  const startedAt = Date.now();
  let backoff = intervalMs;
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    await sleep(backoff);
    last = await getSeedanceJobStatus(jobId);
    if (last.status === 'completed' || last.status === 'failed') return last;
    backoff = Math.min(backoff * 1.4, MAX_POLL_BACKOFF_MS);
  }
  const err = new Error(`Seedance job ${jobId} timed out after ${Math.round(timeoutMs / 1000)}s.`);
  err.code = 'SEEDANCE_TIMEOUT';
  err.lastStatus = last;
  throw err;
}

// ─── KLING AI (v2v with structured camera control) ───────────────────────────
// Kling exposes `advanced_camera_control.movement_type` + `movement_value`
// as proper API fields — the only provider with true structured camera params.
// Kling v2 model: kling-v2-master
// Endpoint: POST /v1/videos/video2video  Poll: GET /v1/videos/video2video/{task_id}

async function klingFetch(path, options = {}) {
  const url = KLING_BASE_URL + path;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  const authHeaders = getKlingAuthHeaders();
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders,
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
  const text = await response.text().catch(() => '');
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text.slice(0, 800) }; }
  if (!response.ok) {
    const detail = payload?.message
      || payload?.error?.message
      || payload?.error
      || payload?.raw
      || text.slice(0, 500)
      || `Kling HTTP ${response.status}`;
    const err = new Error(`Kling HTTP ${response.status}: ${String(detail).slice(0, 500)}`);
    err.statusCode = response.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function startKlingJob({ videoUrl, cameraMoves = [], intensity = 2, motionPrompt = '', aspectRatio = '9:16' }) {
  const motionStrength = INTENSITY_TO_STRENGTH[Math.max(1, Math.min(3, Number(intensity) || 2))] || 0.65;

  // Kling supports structured camera control — map EVICS names to Kling movement_type
  const klingMoves = (cameraMoves || [])
    .map(m => CAMERA_MOVE_MAP[String(m).toLowerCase()])
    .filter(Boolean)
    .map(entry => entry.kling)
    .filter(Boolean);

  const primaryMove = klingMoves[0] || 'zoom_in';

  const prompt = [
    motionPrompt,
    'Product-first commercial, natural presenter body movement,',
    'product mockup stays prominent, restrained cinematic grade, elite social media quality.'
  ].filter(Boolean).join(' ').trim();

  const body = {
    model_name: 'kling-v2-master',
    video_url: videoUrl,
    prompt,
    motion_strength: motionStrength,
    aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
    duration: 5,
    // Structured camera control — Kling v2 native field
    advanced_camera_control: {
      movement_type: primaryMove,
      movement_value: Math.round(motionStrength * 10) // scale 0–10
    }
  };

  console.log(`[Kling] Submitting v2v job — camera: ${primaryMove}, strength: ${motionStrength}`);
  const response = await klingFetch('/v1/videos/video2video', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  const jobId = response?.data?.task_id || response?.task_id || null;
  if (!jobId) {
    const err = new Error('Kling accepted the request but did not return a task_id.');
    err.payload = response;
    throw err;
  }

  return { job_id: jobId, status: 'processing', provider: 'kling' };
}

async function getKlingJobStatus(jobId) {
  const response = await klingFetch(`/v1/videos/video2video/${encodeURIComponent(jobId)}`, { method: 'GET' });
  const data = response?.data || response;
  const status = String(data?.task_status || data?.status || 'processing').toLowerCase();
  const videoUrl = data?.task_result?.videos?.[0]?.url || data?.video_url || null;
  const normalizedStatus =
    (status === 'succeed' || status === 'completed') ? 'completed' :
    (status === 'failed') ? 'failed' : 'processing';
  return { status: normalizedStatus, video_url: videoUrl, raw: response };
}

async function pollKlingJob(jobId, { timeoutMs = DEFAULT_POLL_TIMEOUT_MS, intervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
  const startedAt = Date.now();
  let backoff = intervalMs;
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    await sleep(backoff);
    last = await getKlingJobStatus(jobId);
    if (last.status === 'completed' || last.status === 'failed') return last;
    backoff = Math.min(backoff * 1.4, MAX_POLL_BACKOFF_MS);
  }
  const err = new Error(`Kling job ${jobId} timed out after ${Math.round(timeoutMs / 1000)}s.`);
  err.code = 'KLING_TIMEOUT';
  err.lastStatus = last;
  throw err;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Apply a cinematic enhancement pass to a completed HeyGen video.
 *
 * If AIMLAPI_KEY is set:
 *   Uses Seedance (I2V) — generates a cinematic product B-roll from the
 *   product mockup image. `productImageUrl` is required for this path.
 *
 * If KLING_API_KEY is set (fallback):
 *   Uses Kling v2 (V2V) — applies structured camera movement to the HeyGen
 *   avatar video directly via `advanced_camera_control` API field.
 *
 * @param {string} heygenVideoUrl   — completed HeyGen video URL (HTTPS, MP4)
 * @param {object} options
 * @param {string}   options.productImageUrl  — product mockup image URL (required for Seedance I2V)
 * @param {string[]} options.cameraMoves      — e.g. ['zoom-in','pan-right']
 * @param {number}   options.intensity        — 1 (subtle) | 2 (standard) | 3 (dramatic)
 * @param {string}   options.motionPrompt     — optional extra cinematic direction text
 * @param {string}   options.aspectRatio      — '9:16' | '16:9' | '1:1'
 * @param {string}   options.tier             — 'fast' (default) | 'pro'
 * @param {string}   options.jobId            — caller-supplied ID for logging
 * @param {number}   options.timeoutMs        — max wait ms (default 8 min)
 * @returns {{ success: boolean, videoUrl: string, provider: string, seedanceJobId?: string, klingJobId?: string, passthrough?: boolean }}
 */
async function applyCinematicLayer(heygenVideoUrl, {
  productImageUrl = null,
  cameraMoves   = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'],
  intensity     = 2,
  motionPrompt  = '',
  aspectRatio   = '9:16',
  tier          = 'fast',
  jobId         = null,
  timeoutMs     = DEFAULT_POLL_TIMEOUT_MS
} = {}) {
  const provider = resolveProvider();
  const logPrefix = `[CinematicLayer${jobId ? ':' + jobId : ''}]`;

  if (provider === 'passthrough') {
    console.log(`${logPrefix} No cinematic provider configured — passing through HeyGen video.`);
    return {
      success: true,
      videoUrl: heygenVideoUrl,
      provider: 'passthrough',
      passthrough: true,
      reason: 'Set AIMLAPI_KEY (for Seedance) or KLING_API_KEY (for Kling) to enable cinematic enhancement.'
    };
  }

  if (!heygenVideoUrl || !String(heygenVideoUrl).startsWith('http')) {
    throw new Error('applyCinematicLayer: heygenVideoUrl must be a valid HTTPS URL.');
  }

  try {
    if (provider === 'seedance') {
      if (!productImageUrl) {
        console.warn(`${logPrefix} Seedance I2V requires productImageUrl — falling back to Kling V2V if available, else passthrough.`);
        if (!getKlingKey()) {
          return { success: true, videoUrl: heygenVideoUrl, provider: 'passthrough', passthrough: true,
            reason: 'productImageUrl required for Seedance; no Kling fallback configured.' };
        }
        // Fall through to Kling below
      } else {
        console.log(`${logPrefix} Submitting to Seedance (AIML API) I2V…`);
        const job = await startSeedanceJob({ imageUrl: productImageUrl, cameraMoves, intensity, motionPrompt, aspectRatio, tier });
        console.log(`${logPrefix} Seedance job ${job.job_id} submitted, polling (model: ${job.model})…`);
        const result = await pollSeedanceJob(job.job_id, { timeoutMs });
        if (result.status !== 'completed' || !result.video_url) {
          throw new Error(`Seedance job ${job.job_id} did not complete successfully (status: ${result.status}).`);
        }
        console.log(`${logPrefix} Seedance completed: ${result.video_url.substring(0, 80)}…`);
        return { success: true, videoUrl: result.video_url, provider: 'seedance', seedanceJobId: job.job_id, model: job.model };
      }
    }

    if (provider === 'kling' || (provider === 'seedance' && !productImageUrl && getKlingKey())) {
      console.log(`${logPrefix} Submitting to Kling AI V2V (structured camera control)…`);
      const job = await startKlingJob({ videoUrl: heygenVideoUrl, cameraMoves, intensity, motionPrompt, aspectRatio });
      console.log(`${logPrefix} Kling job ${job.job_id} submitted, polling…`);
      const result = await pollKlingJob(job.job_id, { timeoutMs });
      if (result.status !== 'completed' || !result.video_url) {
        throw new Error(`Kling job ${job.job_id} did not complete successfully (status: ${result.status}).`);
      }
      console.log(`${logPrefix} Kling completed: ${result.video_url.substring(0, 80)}…`);
      return { success: true, videoUrl: result.video_url, provider: 'kling', klingJobId: job.job_id };
    }

    // Should never reach here
    return { success: true, videoUrl: heygenVideoUrl, provider: 'passthrough', passthrough: true };

  } catch (err) {
    // On any failure: log warning and fall back to HeyGen video — never hard-fail the pipeline
    console.error(`${logPrefix} Cinematic layer failed (${provider}): ${err.message}. Falling back to HeyGen video.`);
    return {
      success: false,
      videoUrl: heygenVideoUrl,
      provider: 'passthrough',
      passthrough: true,
      fallback: true,
      error: err.message
    };
  }
}

/**
 * Quick health-check — confirms which provider is active and its configuration status.
 */
function getCinematicLayerStatus() {
  const provider = resolveProvider();
  return {
    enabled: isCinematicEnabled(),
    provider,
    seedanceConfigured: Boolean(getAimlApiKey()),
    klingConfigured:    Boolean(getKlingKey() || (getKlingLegacyAccessKey() && getKlingLegacySecretKey())),
    aimlApiBaseUrl:     AIMLAPI_BASE_URL,
    requiredEnvVars: {
      AIMLAPI_KEY:       getAimlApiKey() ? 'set' : 'missing',
      KLING_API_KEY:     getKlingKey()   ? 'set' : 'missing',
      KLING_ACCESS_KEY:  getKlingLegacyAccessKey() ? 'set' : 'missing',
      KLING_SECRET_KEY:  getKlingLegacySecretKey() ? 'set' : 'missing',
      CINEMATIC_ENABLED: process.env.CINEMATIC_ENABLED || 'true (default)'
    },
    notes: {
      seedance: 'Seedance via AIML API (aimlapi.com). Model: bytedance/seedance-2-0-fast (I2V). Requires productImageUrl per render.',
      kling:    'Kling AI v2 (klingai.com). True video-to-video with structured camera control on avatar video.',
      legacy:   'SEEDANCE_API_KEY is accepted as alias for AIMLAPI_KEY for backward compatibility.'
    }
  };
}

module.exports = {
  applyCinematicLayer,
  getCinematicLayerStatus,
  resolveProvider,
  // Exposed for testing / direct use
  startSeedanceJob,
  getSeedanceJobStatus,
  pollSeedanceJob,
  startKlingJob,
  getKlingJobStatus,
  pollKlingJob,
  CAMERA_MOVE_MAP,
  INTENSITY_TO_STRENGTH
};
