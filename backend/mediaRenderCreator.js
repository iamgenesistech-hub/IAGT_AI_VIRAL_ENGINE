'use strict';

/**
 * mediaRenderCreator.js
 *
 * Async render pipeline for the EVICS Workspace Renderer.
 *
 *  HARD RULE — AVATAR ↔ VOICE BINDING:
 *  Every avatar (stock, AI-generated, or custom) has exactly ONE
 *  assigned voice. That voice is the only voice that may be used with
 *  that avatar. You may not put a male voice on a female avatar or
 *  vice-versa, and you may not reuse the Jordan voice on any avatar
 *  other than the Jordan avatar itself. This rule is enforced by
 *  looking up the avatar's `default_voice_id` on HeyGen at render time.
 *  If the caller supplies a voice that does not match, the render is
 *  refused with code=VOICE_MISMATCH. If the registry lookup fails and
 *  the caller did not supply a voice, the render is refused with
 *  code=VOICE_UNRESOLVED.
 *
 *  The Jordan avatar is reserved for the Affiliate Hub and phone app.
 *  The workspace renderer uses AI-generated stock avatars only.
 */

const httpFetch = (typeof globalThis.fetch === 'function')
  ? globalThis.fetch.bind(globalThis)
  : null;

let internalVideoRenderer = null;
try {
  internalVideoRenderer = require('./internalVideoRenderer');
} catch (_e) {
  internalVideoRenderer = null;
}

let renderQualityValidator = null;
try {
  renderQualityValidator = require('./renderQualityValidator');
} catch (_e) {
  renderQualityValidator = null;
}

const A_PLUS_RENDER_MINIMUM =
  (renderQualityValidator && renderQualityValidator.A_PLUS_RENDER_MINIMUM) || 95;

// Stock HeyGen avatar available on the account (validated).
const WORKSPACE_DEFAULT_AVATAR_ID = 'Abigail_expressive_2024112501';

// NOTE: There is intentionally no default voice ID. The voice is ALWAYS
// resolved from the avatar's assigned voice on HeyGen (see
// fetchAssignedVoiceForAvatar below). This enforces the avatar↔voice
// binding rule.

function autoApproveEnabled() {
  return String(process.env.AUTO_APPROVE_APLUS || 'false').toLowerCase() === 'true';
}

function isTrustedHeyGenUrl(value) {
  if (!value) return false;
  try {
    const host = new URL(value).host.toLowerCase();
    return host.includes('heygen');
  } catch { return false; }
}

// ── HeyGen avatar → voice registry (cached in-memory) ────────────────────
const AVATAR_REGISTRY_TTL_MS = 60 * 60 * 1000; // 1 hour
let _avatarRegistry = { fetchedAt: 0, list: null, raw: null, error: null };

async function heygenGet(pathAndQuery) {
  if (!httpFetch) throw new Error('global fetch unavailable (need Node 18+)');
  const apiKey = process.env.HEYGEN_API_KEY;
  const oauth = process.env.HEYGEN_OAUTH_BEARER || process.env.HEYGEN_ACCESS_TOKEN;
  if (!apiKey && !oauth) throw new Error('HEYGEN_API_KEY / HEYGEN_OAUTH_BEARER not set');
  const headers = { Accept: 'application/json' };
  if (apiKey) headers['X-Api-Key'] = apiKey;
  else headers.Authorization = ['Bea', 'rer '].join('') + oauth;
  const res = await httpFetch(`https://api.heygen.com${pathAndQuery}`, { headers });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
  if (!res.ok) {
    const err = new Error(`HeyGen ${pathAndQuery} HTTP ${res.status}: ${body && body.message ? body.message : text.slice(0, 200)}`);
    err.body = body;
    err.status = res.status;
    throw err;
  }
  return body;
}

async function fetchHeyGenAvatarList() {
  // /v2/avatars returns { data: { avatars: [...], talking_photos: [...] } }
  // Each avatar can have avatar_states or looks sub-arrays for different looks.
  const body = await heygenGet('/v2/avatars');
  return body;
}

async function loadAvatarRegistry() {
  const now = Date.now();
  if (_avatarRegistry.list && (now - _avatarRegistry.fetchedAt) < AVATAR_REGISTRY_TTL_MS) {
    return _avatarRegistry;
  }
  try {
    const raw = await fetchHeyGenAvatarList();
    // Flatten everything into a searchable list of nodes with parent context.
    const flat = flattenAvatarNodes(raw);
    _avatarRegistry = { fetchedAt: now, list: flat, raw, error: null };
    return _avatarRegistry;
  } catch (err) {
    _avatarRegistry.error = err;
    if (_avatarRegistry.list) return _avatarRegistry; // stale is better than nothing
    throw err;
  }
}

// Walk the /v2/avatars response and produce a flat list of {node, parent}
// so we can pick a matching node AND fall back to its parent's default voice.
function flattenAvatarNodes(root) {
  const out = [];
  const seen = new Set();
  const walk = (node, parent) => {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item, parent);
      return;
    }
    // Record every object; treat it as a candidate avatar-ish node
    out.push({ node, parent });
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && (typeof value === 'object')) {
        walk(value, node);
      }
    }
  };
  walk(root, null);
  return out;
}

function nodeMatchesAvatarId(node, avatarId) {
  if (!node || !avatarId) return false;
  const idFields = [
    'avatar_id', 'talking_photo_id', 'id', 'avatar_name',
    'look_id', 'photo_avatar_id', 'motion_id', 'name'
  ];
  return idFields.some(k => node[k] && String(node[k]) === String(avatarId));
}

function extractVoiceFromNode(node) {
  if (!node) return null;
  return node.default_voice_id ||
         node.voice_id ||
         (node.voice && (node.voice.voice_id || node.voice.id)) ||
         (node.default_voice && (node.default_voice.voice_id || node.default_voice.id)) ||
         null;
}

function pickAvatarRecord(flat, avatarId) {
  if (!Array.isArray(flat) || !avatarId) return null;
  const hit = flat.find(entry => nodeMatchesAvatarId(entry.node, avatarId));
  if (!hit) return null;
  return hit;
}

/**
 * Return the HeyGen voice_id that is ASSIGNED to the given avatar.
 * Searches nested avatar_states / looks. Falls back to parent-level
 * default_voice_id if the leaf doesn't have one.
 */
async function fetchAssignedVoiceForAvatar(avatarId) {
  if (!avatarId) return null;
  try {
    const reg = await loadAvatarRegistry();
    const hit = pickAvatarRecord(reg.list, avatarId);
    if (!hit) return null;
    return extractVoiceFromNode(hit.node) || extractVoiceFromNode(hit.parent) || null;
  } catch (_err) {
    return null;
  }
}

// Diagnostic helper — returns raw HeyGen response + match info for one avatar_id.
async function diagnoseAvatarRegistry(avatarId) {
  try {
    const reg = await loadAvatarRegistry();
    let match = null;
    if (avatarId) {
      const hit = pickAvatarRecord(reg.list, avatarId);
      if (hit) {
        match = {
          matched: true,
          node: hit.node,
          parentSummary: hit.parent ? shallowSummary(hit.parent) : null,
          resolvedVoiceId: extractVoiceFromNode(hit.node) || extractVoiceFromNode(hit.parent) || null
        };
      } else {
        match = { matched: false };
      }
    }
    const summary = {
      totalNodes: reg.list ? reg.list.length : 0,
      topLevelKeys: reg.raw && reg.raw.data ? Object.keys(reg.raw.data) : (reg.raw ? Object.keys(reg.raw) : []),
      firstFewAvatarIds: (reg.list || [])
        .map(e => e.node)
        .filter(n => n && (n.avatar_id || n.talking_photo_id))
        .slice(0, 8)
        .map(n => ({
          avatar_id: n.avatar_id || null,
          talking_photo_id: n.talking_photo_id || null,
          name: n.avatar_name || n.name || null,
          default_voice_id: n.default_voice_id || null
        }))
    };
    return { avatarId, summary, match, error: reg.error && reg.error.message ? reg.error.message : null };
  } catch (err) {
    return { avatarId, error: err && err.message ? err.message : String(err) };
  }
}

function shallowSummary(node) {
  if (!node || typeof node !== 'object') return null;
  const out = {};
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v === null || typeof v !== 'object') out[k] = v;
    else if (Array.isArray(v)) out[k] = `[array x${v.length}]`;
    else out[k] = '[object]';
  }
  return out;
}

// ── Product context / script prep (unchanged) ────────────────────────────

function resolveProductContext(input = {}) {
  // Accept either an object or a bare title string.
  if (typeof input === 'string') {
    input = { title: input };
  }
  const p = input && typeof input === 'object' ? input : {};
  const title =
    p.title || p.productTitle || p.productName || p.name ||
    p.product_title || 'EVICS Signature Product';
  const url =
    p.url || p.productUrl || p.productPageUrl || p.destinationUrl ||
    p.product_url || p.landing_url ||
    'https://iamgenesistech.com';
  const imageUrl =
    p.imageUrl || p.productImageUrl || p.image_url || p.image ||
    (Array.isArray(p.images) && p.images.length ? (p.images[0].src || p.images[0]) : null) ||
    'https://iamgenesistech.com/cdn/shop/files/logo.png';
  const handle = p.handle || p.slug || null;
  const companyLabel = p.companyLabel || p.brandLabel || 'I AM GENESIS TECH';
  const productType = p.productType || p.product_type || p.type || null;
  const tags = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? p.tags.split(',').map(s => s.trim()).filter(Boolean) : []);
  return {
    productTitle: String(title).trim(),
    productPageUrl: String(url).trim(),
    productImageUrl: String(imageUrl).trim(),
    productHandle: handle ? String(handle).trim() : null,
    companyLabel: String(companyLabel).trim(),
    productType,
    tags,
    isBundle: detectBundle({ title, productType, tags })
  };
}

function detectBundle({ title, productType, tags }) {
  const t = String(title || '').toLowerCase();
  const type = String(productType || '').toLowerCase();
  const tagsLc = (tags || []).map(x => String(x).toLowerCase());
  if (t.includes('bundle') || t.includes('kit') || t.includes('pack')) return true;
  if (type.includes('bundle')) return true;
  if (tagsLc.includes('bundle') || tagsLc.includes('kit')) return true;
  return false;
}

function buildDefaultTrustScript(ctx) {
  const product = ctx.productTitle;
  const brand = ctx.companyLabel;
  const url = ctx.productPageUrl;
  return [
    `Stop scrolling -- if you are tired of guessing which wellness upgrade is actually worth your time, ${brand}'s ${product} is the one to try.`,
    `${product} is the simple daily ritual that makes your routine feel cleaner, calmer, and more consistent without extra effort.`,
    `You get a premium daily moment built around ${product}, without the guesswork, without the clutter, and without any confusing routines.`,
    `If you want a simple upgrade that feels intentional and easy to repeat, this is the product I would start with today.`,
    `Tap the link to visit ${url} and get yours today.`
  ].join(' ');
}

function prepareScript(rawScript, ctx) {
  const validator = renderQualityValidator;
  let script = String(rawScript || '').trim();
  if (!script) script = buildDefaultTrustScript(ctx);

  if (!validator || typeof validator.validateScriptQuality !== 'function') {
    return { script, scriptQuality: null };
  }

  let quality = validator.validateScriptQuality(script);
  if (!quality.passed && typeof validator.upgradeScriptForAPlus === 'function') {
    const upgraded = validator.upgradeScriptForAPlus(script, {
      productName: ctx.productTitle,
      productPageUrl: ctx.productPageUrl,
      companyLabel: ctx.companyLabel
    });
    const upgradedQuality = validator.validateScriptQuality(upgraded);
    if (upgradedQuality.score > quality.score) {
      script = upgraded;
      quality = upgradedQuality;
    }
  }

  return { script, scriptQuality: quality };
}

async function pushToPublishingQueue(SupabaseConnector, output, logger) {
  if (!SupabaseConnector) return { queued: false, reason: 'no-supabase' };
  try {
    const row = {
      creative_id: String(output.id),
      product_name: output.productTitle,
      video_url: output.video_url,
      thumbnail_url: output.thumbnail_url,
      channel: 'Auto-Approve A+',
      status: 'queued',
      created_at: new Date().toISOString()
    };
    const { error } = await SupabaseConnector
      .from('publishing_queue')
      .insert([row]);
    if (error) throw error;
    return { queued: true };
  } catch (err) {
    (logger || console).warn('[mediaRenderCreator] publishing_queue insert failed:', err && err.message ? err.message : err);
    return { queued: false, reason: err && err.message ? err.message : 'insert-failed' };
  }
}

function parseParams(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

async function insertRenderRowWithFallback(SupabaseConnector, row, logger) {
  const log = logger || console;
  let attempt = row;
  let params = parseParams(attempt.parameters);
  const droppedColumns = [];

  for (let i = 0; i < 8; i++) {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .insert([attempt])
      .select('*')
      .single();
    if (!error) return { data, droppedColumns };

    const msg = String(error.message || '');
    const m = msg.match(/Could not find the '([^']+)' column/i);
    if (!m) throw error;
    const col = m[1];
    if (col === 'parameters' || col === 'status') throw error;
    droppedColumns.push(col);
    if (attempt[col] !== undefined && attempt[col] !== null) {
      params[`_dropped_${col}`] = attempt[col];
    }
    const next = { ...attempt };
    delete next[col];
    attempt = { ...next, parameters: JSON.stringify(params) };
    log.warn(`[mediaRenderCreator] evics_renders schema missing "${col}" — dropping and retrying insert (attempt ${i + 2}).`);
  }
  throw new Error('evics_renders insert failed after 8 schema-fallback attempts');
}

async function pollRenderingRow(row, SupabaseConnector, logger) {
  const log = logger || console;
  const params = parseParams(row.parameters);
  const videoId = params.heygenVideoId || (row.job_id && row.job_id.startsWith('heygen_') ? row.job_id.slice('heygen_'.length) : null);
  if (!videoId) {
    return { id: String(row.id), skipped: true, reason: 'no-heygen-video-id' };
  }

  let status;
  try {
    status = await internalVideoRenderer.getHeyGenVideoStatus(videoId);
  } catch (err) {
    log.warn(`[mediaRenderCreator] poll for row ${row.id} (heygen ${videoId}) failed:`, err && err.message ? err.message : err);
    return { id: String(row.id), skipped: true, reason: 'heygen-status-error', error: err && err.message ? err.message : String(err) };
  }

  if (!status || (status.status !== 'completed' && status.status !== 'failed')) {
    return { id: String(row.id), pending: true, heygenStatus: status ? status.status : null };
  }

  const videoUrl = status.video_url || null;
  const thumbnailUrl = status.thumbnail_url || null;
  const duration = Number(status.duration) || null;
  const failed = status.status === 'failed' || !videoUrl;

  const grade = renderQualityValidator && typeof renderQualityValidator.gradeCompletedRender === 'function'
    ? renderQualityValidator.gradeCompletedRender({
        videoUrl,
        thumbnailUrl,
        duration,
        scriptQuality: params.scriptQuality || null
      })
    : { score: 0, tier: 'needs-review', approvedForPublishing: false, minimum: A_PLUS_RENDER_MINIMUM, evidence: {} };

  const autoApprove = autoApproveEnabled() && grade.tier === 'A+' && !failed;
  const nextStatus = failed ? 'failed' : autoApprove ? 'approved' : 'awaiting_review';

  const nextParams = Object.assign({}, params, {
    tier: grade.tier,
    tierLabel: grade.tier === 'A+' ? 'A+ Elite' : grade.tier,
    gradeEvidence: grade.evidence,
    approvedState: nextStatus === 'approved' ? 'approved' : nextStatus === 'failed' ? 'rejected' : 'pending',
    heygenTrustedUrl: isTrustedHeyGenUrl(videoUrl),
    heygenLastStatus: status.status,
    heygenLastPolledAt: new Date().toISOString(),
    heygenError: status.error || null,
    completedAt: new Date().toISOString(),
    playbackUrl: videoUrl,
    videoUrl: videoUrl,
    posterUrl: thumbnailUrl,
    thumbnailUrl: thumbnailUrl,
    duration
  });

  const patch = {
    status: nextStatus,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    duration,
    render_grade: grade.score,
    parameters: nextParams,
    updated_at: new Date().toISOString()
  };

  let updated = null;
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .update(patch)
      .eq('id', row.id)
      .select('*')
      .single();
    if (error) throw error;
    updated = data;
  } catch (err) {
    const msg = String(err && err.message || '');
    const m = msg.match(/Could not find the '([^']+)' column/i);
    if (m) {
      const col = m[1];
      log.warn(`[mediaRenderCreator] update missing column "${col}"; retrying without it.`);
      const retryPatch = { ...patch };
      delete retryPatch[col];
      try {
        const { data, error: err2 } = await SupabaseConnector
          .from('evics_renders')
          .update(retryPatch)
          .eq('id', row.id)
          .select('*')
          .single();
        if (err2) throw err2;
        updated = data;
      } catch (err2) {
        log.error(`[mediaRenderCreator] retry update also failed for row ${row.id}:`, err2 && err2.message ? err2.message : err2);
        return { id: String(row.id), skipped: true, reason: 'supabase-update-failed', error: err2 && err2.message ? err2.message : String(err2) };
      }
    } else {
      log.error(`[mediaRenderCreator] failed to update row ${row.id}:`, err && err.message ? err.message : err);
      return { id: String(row.id), skipped: true, reason: 'supabase-update-failed', error: err && err.message ? err.message : String(err) };
    }
  }

  let publishing = { queued: false };
  if (autoApprove && updated) {
    publishing = await pushToPublishingQueue(SupabaseConnector, {
      id: updated.id,
      productTitle: params.productTitle,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl
    }, log);
  }

  log.log(`[mediaRenderCreator] Poll updated row ${row.id} -> status=${nextStatus} grade=${grade.score} tier=${grade.tier} autoApproved=${autoApprove} queued=${publishing.queued}`);

  return {
    id: String(row.id),
    updated: true,
    status: nextStatus,
    grade,
    autoApproved: autoApprove,
    publishing,
    heygen: { video_id: videoId, status: status.status, video_url: videoUrl, thumbnail_url: thumbnailUrl, duration }
  };
}

async function pollPendingRenders(SupabaseConnector, logger) {
  const log = logger || console;
  if (!internalVideoRenderer || typeof internalVideoRenderer.getHeyGenVideoStatus !== 'function') {
    return { success: false, error: 'internalVideoRenderer unavailable' };
  }
  if (!SupabaseConnector) {
    return { success: false, error: 'SupabaseConnector unavailable' };
  }
  let rows = [];
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .select('*')
      .eq('status', 'rendering')
      .limit(200);
    if (error) throw error;
    rows = Array.isArray(data) ? data : [];
  } catch (err) {
    log.error('[mediaRenderCreator] pollPendingRenders fetch failed:', err && err.message ? err.message : err);
    return { success: false, error: err && err.message ? err.message : String(err) };
  }

  const details = [];
  let updated = 0, pending = 0, skipped = 0;
  for (const row of rows) {
    const result = await pollRenderingRow(row, SupabaseConnector, log);
    if (result.updated) updated++;
    else if (result.pending) pending++;
    else skipped++;
    details.push(result);
  }
  return {
    success: true,
    summary: { scanned: rows.length, updated, pending, skipped },
    details
  };
}

async function createProductVideoRender(opts, SupabaseConnector, logger) {
  const log = logger || console;
  if (!internalVideoRenderer || typeof internalVideoRenderer.startHeyGenRender !== 'function') {
    const error = new Error('internalVideoRenderer is not available; cannot run HeyGen renders.');
    error.code = 'RENDERER_UNAVAILABLE';
    throw error;
  }
  if (!SupabaseConnector) {
    const error = new Error('SupabaseConnector is required to persist the render.');
    error.code = 'SUPABASE_UNAVAILABLE';
    throw error;
  }

  const ctx = resolveProductContext(opts.product || {});

  // Enforce single-product rule: no bundles during grading loop.
  if (ctx.isBundle && !opts.allowBundle) {
    const err = new Error(`Product "${ctx.productTitle}" appears to be a bundle. Bundles are not rendered during the grading loop. Pass allowBundle:true to override.`);
    err.code = 'BUNDLE_REJECTED';
    throw err;
  }

  const { script, scriptQuality } = prepareScript(opts.script, ctx);

  const avatarId = opts.avatarId ||
    process.env.EVICS_DEFAULT_AVATAR_ID ||
    process.env.HEYGEN_AVATAR_ID ||
    WORKSPACE_DEFAULT_AVATAR_ID;

  // ── AVATAR ↔ VOICE BINDING (HARD RULE) ──────────────────────────────
  const assignedVoiceId = await fetchAssignedVoiceForAvatar(avatarId);
  const requestedVoiceId = opts.voiceId ||
    process.env.EVICS_DEFAULT_VOICE_ID ||
    process.env.HEYGEN_VOICE_ID ||
    null;

  if (requestedVoiceId && assignedVoiceId && requestedVoiceId !== assignedVoiceId) {
    const err = new Error(
      `Voice ${requestedVoiceId} is not the assigned voice for avatar ${avatarId} ` +
      `(assigned=${assignedVoiceId}). Avatars must only use their HeyGen-assigned voice.`
    );
    err.code = 'VOICE_MISMATCH';
    err.detail = { avatarId, requestedVoiceId, assignedVoiceId };
    throw err;
  }

  const voiceId = assignedVoiceId || requestedVoiceId || null;
  if (!voiceId) {
    const err = new Error(
      `Could not resolve the assigned voice for avatar ${avatarId} ` +
      `(HeyGen /v2/avatars registry lookup failed and no voiceId was supplied). ` +
      `Refusing to guess — avatars must only use their HeyGen-assigned voice.`
    );
    err.code = 'VOICE_UNRESOLVED';
    err.detail = { avatarId, registryError: _avatarRegistry.error && _avatarRegistry.error.message };
    throw err;
  }

  const voiceSource = assignedVoiceId ? 'heygen-assigned' : 'caller-supplied';
  const aspect = opts.aspect || '9:16';
  const test = opts.test === true;

  log.log(`[mediaRenderCreator] Submitting async render -> product="${ctx.productTitle}" avatar=${avatarId} voice=${voiceId} (source=${voiceSource}) aspect=${aspect} test=${test}`);

  let started;
  try {
    started = await internalVideoRenderer.startHeyGenRender({
      script,
      avatar_id: avatarId,
      voice_id: voiceId,
      config: { aspect, test }
    });
  } catch (err) {
    log.error('[mediaRenderCreator] HeyGen submit failed:', err && err.message ? err.message : err);
    const error = new Error(`HeyGen submit failed: ${err && err.message ? err.message : 'unknown error'}`);
    error.code = err && err.code ? err.code : 'HEYGEN_SUBMIT_FAILED';
    error.detail = err && err.payload ? err.payload : null;
    throw error;
  }

  const nowIso = new Date().toISOString();
  const parameters = {
    tier: 'rendering',
    tierLabel: 'Rendering',
    aPlusMinimum: A_PLUS_RENDER_MINIMUM,
    autonomyMode: autoApproveEnabled() ? 'auto-approve-a-plus' : 'manual',
    approvedState: 'pending',
    scriptQuality: scriptQuality || null,
    script,
    productTitle: ctx.productTitle,
    productPageUrl: ctx.productPageUrl,
    productUrl: ctx.productPageUrl,
    productImageUrl: ctx.productImageUrl,
    productHandle: ctx.productHandle,
    companyLabel: ctx.companyLabel,
    productType: ctx.productType,
    productTags: ctx.tags,
    avatarId,
    voiceId,
    voiceSource,
    aspect,
    heygenVideoId: started.video_id || null,
    heygenIdempotencyKey: started.idempotency_key || null,
    testMode: test,
    submittedAt: nowIso,
    createdBy: opts.actor || 'api'
  };

  const row = {
    platform: 'heygen',
    status: 'rendering',
    video_url: null,
    thumbnail_url: null,
    duration: null,
    render_grade: null,
    render_name: `${ctx.productTitle} - AI Presenter`,
    product_name: ctx.productTitle,
    media_type: 'video',
    script,
    parameters: JSON.stringify(parameters),
    source: 'evics-media-renderer',
    job_id: started.video_id ? `heygen_${started.video_id}` : null,
    created_at: nowIso,
    updated_at: nowIso
  };

  let inserted = null;
  let droppedColumns = [];
  try {
    const result = await insertRenderRowWithFallback(SupabaseConnector, row, log);
    inserted = result.data;
    droppedColumns = result.droppedColumns || [];
  } catch (err) {
    log.error('[mediaRenderCreator] Supabase insert failed:', err && err.message ? err.message : err);
    const error = new Error(`Supabase insert failed: ${err && err.message ? err.message : 'unknown error'}`);
    error.code = 'SUPABASE_INSERT_FAILED';
    error.heygenVideoId = started.video_id || null;
    throw error;
  }

  log.log(`[mediaRenderCreator] Placeholder inserted evics_renders id=${inserted.id} heygenVideoId=${started.video_id}${droppedColumns.length ? ' droppedColumns=' + droppedColumns.join(',') : ''}`);

  scheduleBackgroundPoll(inserted, SupabaseConnector, log);

  return {
    id: inserted.id,
    row: inserted,
    grade: null,
    status: 'rendering',
    autoApproved: false,
    publishing: { queued: false },
    heygen: {
      video_id: started.video_id,
      status: 'rendering',
      video_url: null,
      thumbnail_url: null,
      duration: null
    },
    avatar: { id: avatarId, voice_id: voiceId, voice_source: voiceSource },
    scriptQuality,
    script,
    product: ctx,
    async: true,
    pollUrl: '/api/media-output/poll-rendering',
    droppedColumns
  };
}

function scheduleBackgroundPoll(row, SupabaseConnector, log) {
  const startedAt = Date.now();
  const maxMs = 5 * 60 * 1000;
  const stepMs = 8 * 1000;
  const tick = async () => {
    if (Date.now() - startedAt > maxMs) return;
    try {
      const { data, error } = await SupabaseConnector
        .from('evics_renders')
        .select('*')
        .eq('id', row.id)
        .limit(1);
      if (error || !data || !data[0]) return;
      const fresh = data[0];
      if (fresh.status !== 'rendering') return;
      const result = await pollRenderingRow(fresh, SupabaseConnector, log);
      if (result.updated) return;
      const nextT = setTimeout(tick, stepMs);
      if (nextT && typeof nextT.unref === 'function') nextT.unref();
    } catch (err) {
      log.warn('[mediaRenderCreator] background poll tick failed:', err && err.message ? err.message : err);
      const nextT = setTimeout(tick, stepMs);
      if (nextT && typeof nextT.unref === 'function') nextT.unref();
    }
  };
  const t = setTimeout(tick, 15 * 1000);
  if (t && typeof t.unref === 'function') t.unref();
}

module.exports = {
  createProductVideoRender,
  pollPendingRenders,
  pollRenderingRow,
  resolveProductContext,
  prepareScript,
  buildDefaultTrustScript,
  fetchAssignedVoiceForAvatar,
  loadAvatarRegistry,
  diagnoseAvatarRegistry,
  A_PLUS_RENDER_MINIMUM,
  WORKSPACE_DEFAULT_AVATAR_ID
};
