const crypto = require('crypto');

const HEYGEN_API_BASE = 'https://api.heygen.com';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_INITIAL_BACKOFF_MS = 10 * 1000;
const DEFAULT_MAX_BACKOFF_MS = 120 * 1000;
const TRANSIENT_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createIdempotencyKey({ script, avatar_id, voice_id, config = {} }) {
  const explicit = config.idempotency_key || config.idempotencyKey;
  if (explicit) return String(explicit);

  const stablePayload = JSON.stringify({
    script: String(script || '').trim(),
    avatar_id,
    voice_id,
    dimension: config.dimension || null,
    avatar_style: config.avatar_style || config.avatarStyle || 'normal',
    background: config.background || null,
    caption: Boolean(config.caption),
    test: Boolean(config.test)
  });

  return crypto.createHash('sha256').update(stablePayload).digest('hex');
}

function normalizeDimension(config = {}) {
  if (config.dimension && Number(config.dimension.width) && Number(config.dimension.height)) {
    return { width: Number(config.dimension.width), height: Number(config.dimension.height) };
  }

  const aspect = config.aspect || config.aspect_ratio || '16:9';
  if (aspect === '9:16') return { width: 1080, height: 1920 };
  if (aspect === '1:1') return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

function normalizeHeyGenStatus(payload = {}, fallbackVideoId = null) {
  const data = payload.data || payload;
  const status = data.status || payload.status || 'unknown';
  return {
    video_id: data.id || data.video_id || payload.video_id || fallbackVideoId,
    status,
    video_url: data.video_url || data.video_url_caption || null,
    thumbnail_url: data.thumbnail_url || null,
    duration: data.duration === undefined || data.duration === null ? null : data.duration,
    error: data.error || payload.error || null,
    raw: payload
  };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text.slice(0, 1000) };
  }
}

function getHeyGenApiKey() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    const error = new Error('HEYGEN_API_KEY is not configured.');
    error.code = 'HEYGEN_API_KEY_MISSING';
    throw error;
  }
  return apiKey;
}

async function heygenFetch(path, options = {}, attempt = 1) {
  const response = await fetch(HEYGEN_API_BASE + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': getHeyGenApiKey(),
      ...(options.headers || {})
    }
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || payload?.error || payload?.raw || ('HeyGen request failed with HTTP ' + response.status);
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;

    if (TRANSIENT_STATUS_CODES.has(response.status) && attempt < 3) {
      await sleep(Math.min(1000 * (2 ** (attempt - 1)), 5000));
      return heygenFetch(path, options, attempt + 1);
    }

    throw error;
  }

  return payload;
}

async function startHeyGenRender({ script, avatar_id, voice_id, config = {} }) {
  const cleanScript = String(script || '').trim();
  if (!cleanScript) throw new Error('script is required.');
  if (!avatar_id) throw new Error('avatar_id is required.');
  if (!voice_id) throw new Error('voice_id is required.');

  const idempotencyKey = createIdempotencyKey({ script: cleanScript, avatar_id, voice_id, config });
  const payload = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id,
        avatar_style: config.avatar_style || config.avatarStyle || 'normal'
      },
      voice: {
        type: 'text',
        input_text: cleanScript,
        voice_id
      },
      background: config.background || { type: 'color', value: '#ffffff' }
    }],
    dimension: normalizeDimension(config),
    caption: Boolean(config.caption),
    test: Boolean(config.test)
  };

  const response = await heygenFetch('/v2/video/generate', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload)
  });

  const videoId = response?.data?.video_id || response?.video_id || null;
  if (!videoId) {
    const error = new Error('HeyGen accepted the request but did not return data.video_id.');
    error.payload = response;
    throw error;
  }

  return {
    video_id: videoId,
    status: 'rendering',
    video_url: null,
    thumbnail_url: null,
    duration: null,
    error: null,
    idempotency_key: idempotencyKey,
    raw: response
  };
}

async function getHeyGenVideoStatus(videoId) {
  if (!videoId) throw new Error('video_id is required.');
  const response = await heygenFetch('/v1/video_status.get?video_id=' + encodeURIComponent(videoId), { method: 'GET' });
  return normalizeHeyGenStatus(response, videoId);
}

async function pollHeyGenVideo({ video_id, timeoutMs = DEFAULT_TIMEOUT_MS, initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS, maxBackoffMs = DEFAULT_MAX_BACKOFF_MS }) {
  const startedAt = Date.now();
  let delay = initialBackoffMs;
  let lastStatus = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastStatus = await getHeyGenVideoStatus(video_id);
    if (lastStatus.status === 'completed' || lastStatus.status === 'failed') {
      return lastStatus;
    }

    await sleep(delay);
    delay = Math.min(delay * 2, maxBackoffMs);
  }

  const error = new Error('Timed out waiting for HeyGen video ' + video_id + ' after ' + Math.round(timeoutMs / 1000) + ' seconds.');
  error.code = 'HEYGEN_RENDER_TIMEOUT';
  error.lastStatus = lastStatus;
  throw error;
}

async function renderInternalVideo({ script, avatar_id, voice_id, config = {} }) {
  const started = await startHeyGenRender({ script, avatar_id, voice_id, config });
  const finalStatus = await pollHeyGenVideo({
    video_id: started.video_id,
    timeoutMs: config.timeoutMs || DEFAULT_TIMEOUT_MS,
    initialBackoffMs: config.initialBackoffMs || DEFAULT_INITIAL_BACKOFF_MS,
    maxBackoffMs: config.maxBackoffMs || DEFAULT_MAX_BACKOFF_MS
  });

  return {
    video_id: started.video_id,
    status: finalStatus.status,
    video_url: finalStatus.video_url,
    thumbnail_url: finalStatus.thumbnail_url,
    duration: finalStatus.duration,
    error: finalStatus.error || null,
    idempotency_key: started.idempotency_key
  };
}

module.exports = {
  renderInternalVideo,
  startHeyGenRender,
  getHeyGenVideoStatus,
  pollHeyGenVideo,
  createIdempotencyKey
};
