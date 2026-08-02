'use strict';

/**
 * mediaRenderCreator.js
 *
 * End-to-end pipeline that produces a REAL product video render:
 *   1. Resolve product info (from caller or Shopify defaults)
 *   2. Generate / validate / auto-upgrade the presenter script to A+
 *   3. Submit to HeyGen via internalVideoRenderer.renderInternalVideo (real API)
 *   4. Grade the finished render with renderQualityValidator.gradeCompletedRender
 *   5. Persist a REAL row to Supabase `evics_renders` with proper
 *      video_url / thumbnail_url / duration / render_grade / parameters
 *   6. If tier === 'A+' AND AUTO_APPROVE_APLUS=true -> mark 'approved' and
 *      push to publishing_queue; else 'awaiting_review'
 *
 * This is the missing link that was removed during the
 * "test recovery" refactor. Without this file, `evics_renders`
 * never receives real renders and the Media Review UI has nothing
 * playable to review.
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

async function createProductVideoRender(opts, SupabaseConnector, logger) {
  const log = logger || console;
  if (!internalVideoRenderer || typeof internalVideoRenderer.renderInternalVideo !== 'function') {
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
    process.env.HEYGEN_AVATAR_ID ||
    internalVideoRenderer.JORDAN_AVATAR_ID;
  const voiceId = opts.voiceId ||
    process.env.HEYGEN_VOICE_ID ||
    internalVideoRenderer.JORDAN_VOICE_ID;
  const aspect = opts.aspect || '9:16';
  const test = opts.test === true;
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 4 * 60 * 1000;

  log.log(`[mediaRenderCreator] Submitting render -> product="${ctx.productTitle}" avatar=${avatarId} voice=${voiceId} aspect=${aspect} test=${test}`);

  let renderResult;
  try {
    renderResult = await internalVideoRenderer.renderInternalVideo({
      script,
      avatar_id: avatarId,
      voice_id: voiceId,
      config: { aspect, test, timeoutMs }
    });
  } catch (err) {
    log.error('[mediaRenderCreator] HeyGen render failed:', err && err.message ? err.message : err);
    const error = new Error(`HeyGen render failed: ${err && err.message ? err.message : 'unknown error'}`);
    error.code = err && err.code ? err.code : 'HEYGEN_RENDER_FAILED';
    error.detail = err && err.payload ? err.payload : null;
    throw error;
  }

  const videoUrl = renderResult.video_url || null;
  const thumbnailUrl = renderResult.thumbnail_url || null;
  const duration = Number(renderResult.duration) || null;

  const grade = renderQualityValidator && typeof renderQualityValidator.gradeCompletedRender === 'function'
    ? renderQualityValidator.gradeCompletedRender({
        videoUrl,
        thumbnailUrl,
        duration,
        scriptQuality
      })
    : { score: 0, tier: 'needs-review', approvedForPublishing: false, minimum: A_PLUS_RENDER_MINIMUM, evidence: {} };

  const failed = renderResult.status === 'failed' || !videoUrl;
  const autoApprove = autoApproveEnabled() && grade.tier === 'A+' && !failed;
  const status = failed
    ? 'failed'
    : autoApprove ? 'approved' : 'awaiting_review';

  const nowIso = new Date().toISOString();
  const parameters = {
    tier: grade.tier,
    tierLabel: grade.tier === 'A+' ? 'A+ Elite' : grade.tier,
    gradeEvidence: grade.evidence,
    aPlusMinimum: A_PLUS_RENDER_MINIMUM,
    autonomyMode: autoApproveEnabled() ? 'auto-approve-a-plus' : 'manual',
    approvedState: status === 'approved' ? 'approved' : status === 'failed' ? 'rejected' : 'pending',
    scriptQuality: scriptQuality || null,
    script,
    productTitle: ctx.productTitle,
    productPageUrl: ctx.productPageUrl,
    productImageUrl: ctx.productImageUrl,
    productHandle: ctx.productHandle,
    companyLabel: ctx.companyLabel,
    avatarId,
    voiceId,
    aspect,
    heygenVideoId: renderResult.video_id || null,
    heygenIdempotencyKey: renderResult.idempotency_key || null,
    heygenTrustedUrl: isTrustedHeyGenUrl(videoUrl),
    testMode: test,
    renderedAt: nowIso,
    createdBy: opts.actor || 'api'
  };

  const row = {
    platform: 'heygen',
    status,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    duration,
    render_grade: grade.score,
    render_name: `${ctx.productTitle} - Jordan Trust`,
    product_name: ctx.productTitle,
    product_url: ctx.productPageUrl,
    media_type: 'video',
    script,
    parameters: JSON.stringify(parameters),
    source: 'evics-media-renderer',
    job_id: renderResult.video_id ? `heygen_${renderResult.video_id}` : null,
    created_at: nowIso,
    updated_at: nowIso
  };

  let inserted = null;
  try {
    const { data, error } = await SupabaseConnector
      .from('evics_renders')
      .insert([row])
      .select('*')
      .single();
    if (error) throw error;
    inserted = data;
  } catch (err) {
    log.error('[mediaRenderCreator] Supabase insert failed:', err && err.message ? err.message : err);
    const error = new Error(`Supabase insert failed: ${err && err.message ? err.message : 'unknown error'}`);
    error.code = 'SUPABASE_INSERT_FAILED';
    error.renderResult = renderResult;
    throw error;
  }

  let publishing = { queued: false };
  if (autoApprove) {
    publishing = await pushToPublishingQueue(SupabaseConnector, {
      id: inserted.id,
      productTitle: ctx.productTitle,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl
    }, log);
  }

  log.log(`[mediaRenderCreator] Persisted evics_renders id=${inserted.id} status=${status} grade=${grade.score} tier=${grade.tier} autoApproved=${autoApprove} queued=${publishing.queued}`);

  return {
    id: inserted.id,
    row: inserted,
    grade,
    status,
    autoApproved: autoApprove,
    publishing,
    heygen: {
      video_id: renderResult.video_id,
      status: renderResult.status,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration
    },
    scriptQuality,
    script,
    product: ctx
  };
}

module.exports = {
  createProductVideoRender,
  resolveProductContext,
  prepareScript,
  buildDefaultTrustScript,
  A_PLUS_RENDER_MINIMUM
};
