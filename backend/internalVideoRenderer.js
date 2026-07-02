const crypto = require('crypto');

const HEYGEN_API_BASE = 'https://api.heygen.com';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_INITIAL_BACKOFF_MS = 3 * 1000;
const DEFAULT_MAX_BACKOFF_MS = 30 * 1000;
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

function normalizeAspectRatio(value) {
  const text = String(value || '').trim();
  if (!text) return 'auto';
  if (['16:9', '9:16', '4:5', '5:4', '1:1', 'auto'].includes(text)) return text;
  if (text === 'square') return '1:1';
  return 'auto';
}

function normalizeHeyGenAgentSession(payload = {}, fallbackSessionId = null) {
  const data = payload.data || payload;
  return {
    session_id: data.session_id || data.id || fallbackSessionId,
    status: data.status || 'unknown',
    video_id: data.video_id || null,
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
  if (apiKey) {
    return { mode: 'cli_api_key', headers: { 'X-Api-Key': apiKey } };
  }
  const oauthBearer = process.env.HEYGEN_OAUTH_BEARER || process.env.HEYGEN_ACCESS_TOKEN;
  if (oauthBearer) {
    return { mode: 'oauth_bearer', headers: { Authorization: 'Bearer ' + oauthBearer } };
  }
  const error = new Error('HeyGen authentication is not configured. Provide HEYGEN_API_KEY or HEYGEN_OAUTH_BEARER.');
  error.code = 'HEYGEN_AUTH_MISSING';
  throw error;
}

async function heygenFetch(path, options = {}, attempt = 1) {
  const auth = getHeyGenApiKey();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(HEYGEN_API_BASE + path, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...auth.headers,
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }

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
  // Strip ALL stage directions (brackets) from script — avatar speaks only pure dialogue
  const cleanScript = String(script || '').trim().replace(/\[.*?\]/g, '').replace(/\s{2,}/g, ' ').trim();
  if (!cleanScript) throw new Error('script is required.');
  if (!avatar_id) throw new Error('avatar_id is required.');
  if (!voice_id) throw new Error('voice_id is required.');

  const idempotencyKey = createIdempotencyKey({ script: cleanScript, avatar_id, voice_id, config });
  const v3Payload = {
    type: 'avatar',
    avatar_id,
    voice_id,
    script: cleanScript,
    aspect_ratio: normalizeAspectRatio(config.aspect || config.aspect_ratio),
    resolution: '1080p',
    background: config.background || { type: 'color', value: '#ffffff' }
  };
  if (typeof config.callback_url === 'string' && config.callback_url.trim()) {
    v3Payload.callback_url = config.callback_url.trim();
  }
  if (typeof config.callback_id === 'string' && config.callback_id.trim()) {
    v3Payload.callback_id = config.callback_id.trim();
  }

  const response = await heygenFetch('/v3/videos', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(v3Payload)
  });

  const videoId = response?.data?.video_id || response?.data?.id || response?.video_id || response?.id || null;
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
  const response = await heygenFetch('/v3/videos/' + encodeURIComponent(videoId), { method: 'GET' });
  return normalizeHeyGenStatus(response, videoId);
}

async function getHeyGenCurrentUser() {
  const response = await heygenFetch('/v3/users/me', { method: 'GET' });
  return response && response.data ? response.data : response;
}

async function startHeyGenVideoAgent({ prompt, config = {} }) {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('prompt is required.');

  const payload = {
    prompt: cleanPrompt,
    orientation: config.orientation || 'portrait'
  };
  if (Array.isArray(config.files) && config.files.length) {
    payload.files = config.files.slice(0, 20);
  }
  if (typeof config.style_id === 'string' && config.style_id.trim()) {
    payload.style_id = config.style_id.trim();
  }
  if (typeof config.avatar_id === 'string' && config.avatar_id.trim()) {
    payload.avatar_id = config.avatar_id.trim();
  }
  if (typeof config.voice_id === 'string' && config.voice_id.trim()) {
    payload.voice_id = config.voice_id.trim();
  }
  if (typeof config.callback_url === 'string' && config.callback_url.trim()) {
    payload.callback_url = config.callback_url.trim();
  }
  if (typeof config.callback_id === 'string' && config.callback_id.trim()) {
    payload.callback_id = config.callback_id.trim();
  }

  const response = await heygenFetch('/v3/video-agents', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const session = normalizeHeyGenAgentSession(response);
  if (!session.session_id) {
    const error = new Error('HeyGen accepted the request but did not return data.session_id.');
    error.payload = response;
    throw error;
  }
  return session;
}

async function getHeyGenVideoAgentSession(sessionId) {
  if (!sessionId) throw new Error('session_id is required.');
  const response = await heygenFetch('/v3/video-agents/' + encodeURIComponent(sessionId), { method: 'GET' });
  return normalizeHeyGenAgentSession(response, sessionId);
}

async function listHeyGenVideoAgentSessions({ limit = 20, token = null } = {}) {
  const params = new URLSearchParams();
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  params.set('limit', String(parsedLimit));
  if (token) params.set('token', String(token));
  const response = await heygenFetch('/v3/video-agents?' + params.toString(), { method: 'GET' });
  return {
    sessions: Array.isArray(response?.data) ? response.data : [],
    has_more: Boolean(response?.has_more),
    next_token: response?.next_token || null,
    raw: response
  };
}

async function pollHeyGenVideoAgentSession({
  session_id,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  initialBackoffMs = DEFAULT_INITIAL_BACKOFF_MS,
  maxBackoffMs = DEFAULT_MAX_BACKOFF_MS
}) {
  const startedAt = Date.now();
  let delay = initialBackoffMs;
  let lastSession = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSession = await getHeyGenVideoAgentSession(session_id);
    if (lastSession.video_id || lastSession.status === 'failed') {
      return lastSession;
    }

    await sleep(delay);
    delay = Math.min(Math.ceil(delay * 1.5), maxBackoffMs);
  }

  const error = new Error('Timed out waiting for HeyGen video-agent session ' + session_id + ' after ' + Math.round(timeoutMs / 1000) + ' seconds.');
  error.code = 'HEYGEN_VIDEO_AGENT_TIMEOUT';
  error.lastSession = lastSession;
  throw error;
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
    delay = Math.min(Math.ceil(delay * 1.5), maxBackoffMs);
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
  startHeyGenVideoAgent,
  getHeyGenVideoAgentSession,
  listHeyGenVideoAgentSessions,
  getHeyGenVideoStatus,
  getHeyGenCurrentUser,
  pollHeyGenVideoAgentSession,
  pollHeyGenVideo,
  createIdempotencyKey
};
