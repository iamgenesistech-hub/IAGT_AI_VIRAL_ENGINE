'use strict';

/**
 * mediaRenderCreator.js
 *
 * Async render pipeline for the EVICS Workspace Renderer:
 *   1. Resolve product info (from caller or defaults)
 *   2. Prepare / auto-upgrade the presenter script to A+
 *   3. SUBMIT to HeyGen and return immediately (do NOT block the request)
 *   4. Insert a placeholder row in `evics_renders` with status='rendering'
 *   5. Fire a best-effort background poll that updates the row when HeyGen
 *      completes; also expose pollPendingRenders() for on-demand catch-up
 *   6. When the render completes, grade it, promote status to
 *      awaiting_review, and (if A+ AND AUTO_APPROVE_APLUS) auto-approve +
 *      push to publishing_queue.
 *
 * IMPORTANT: HeyGen renders routinely take 2-5 minutes. Cloud Run's request
 * timeout is 300s, so we cannot afford to poll to completion inside the
 * request handler. This module therefore:
 *   - inserts the row synchronously (so the UI sees a "rendering" card
 *     right away)
 *   - fires an unawaited background poll for a best-effort short-lived
 *     Cloud Run container
 *   - additionally provides pollPendingRenders() so a periodic UI refresh
 *     or scheduler can catch up any renders whose background poller was
 *     killed by a cold-shutdown of the container
 *
 * Avatar defaults for the WORKSPACE RENDERER use stock AI avatars
 * (Abigail_expressive_2024112501). The Jordan avatar is reserved for the
 * Affiliate Hub and phone app — do NOT default to it here.
 */

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

// ── Workspace-renderer defaults ─────────────────────────────────────────
const WORKSPACE_DEFAULT_AVATAR_ID = 'Abigail_expressive_2024112501';
const WORKSPACE_DEFAULT_VOICE_ID  = 'fd407cedebcc4f29bdbd75ba45c01ea7';

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

function resolveProductContext(input = {}) {
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
  return {
    productTitle: String(title).trim(),
    productPageUrl: String(url).trim(),
    productImageUrl: String(imageUrl).trim(),
    productHandle: handle ? String(handle).trim() : null,
    companyLabel: String(companyLabel).trim()
  };
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

/**
 * Retry a Supabase insert progressively dropping columns that the
 * remote schema does not know about. Supabase's error text for a
 * missing column looks like:
 *   "Could not find the 'foo' column of 'evics_renders' in the schema cache"
 * We parse the column name, fold that column's value into `parameters`,
 * drop it from the insert row, and retry — up to a few rounds.
 */
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
    if (col === 'parameters' || col === 'status') throw error; // don't drop essentials
    droppedColumns.push(col);
    // fold value into parameters JSON so we still have it downstream
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

/**
 * Given a row that is currently `status='rendering'` and has
 * parameters.heygenVideoId, poll HeyGen for the current status. If it's
 * finished (or failed), update the row with real video_url + thumbnail +
 * duration + grade + final status. Best-effort; safe to call repeatedly.
 */
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
    // Mirror onto parameters so the UI can render even when the row
    // itself lacks certain columns.
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
    // Fall back: if the update fails because of missing columns, retry
    // with the offending columns dropped from the patch. Everything of
    // value is already mirrored into `parameters` above.
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

/**
 * Fetch all rows with status='rendering' and try to progress each one.
 * Safe to call periodically or on user-triggered refresh.
 */
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

/**
 * Fire the async render:
 *   - prepare script
 *   - submit to HeyGen (fast — returns video_id in ~1-2s)
 *   - insert placeholder row with status='rendering'
 *   - kick off a best-effort background poll (unawaited)
 *   - return immediately with the placeholder row + heygen video_id
 */
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
  const { script, scriptQuality } = prepareScript(opts.script, ctx);

  const avatarId = opts.avatarId ||
    process.env.EVICS_DEFAULT_AVATAR_ID ||
    process.env.HEYGEN_AVATAR_ID ||
    WORKSPACE_DEFAULT_AVATAR_ID;
  const voiceId = opts.voiceId ||
    process.env.EVICS_DEFAULT_VOICE_ID ||
    process.env.HEYGEN_VOICE_ID ||
    WORKSPACE_DEFAULT_VOICE_ID;
  const aspect = opts.aspect || '9:16';
  const test = opts.test === true;

  log.log(`[mediaRenderCreator] Submitting async render -> product="${ctx.productTitle}" avatar=${avatarId} voice=${voiceId} aspect=${aspect} test=${test}`);

  // ── Step 1: submit to HeyGen (fast) ─────────────────────────────────────
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
    avatarId,
    voiceId,
    aspect,
    heygenVideoId: started.video_id || null,
    heygenIdempotencyKey: started.idempotency_key || null,
    testMode: test,
    submittedAt: nowIso,
    createdBy: opts.actor || 'api'
  };

  // ── Step 2: insert placeholder row ──────────────────────────────────────
  // Only include columns we're confident exist. Anything the schema
  // doesn't have will get folded into `parameters` by
  // insertRenderRowWithFallback().
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

  // ── Step 3: fire best-effort background poll (unawaited) ────────────────
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
  A_PLUS_RENDER_MINIMUM,
  WORKSPACE_DEFAULT_AVATAR_ID,
  WORKSPACE_DEFAULT_VOICE_ID
};
