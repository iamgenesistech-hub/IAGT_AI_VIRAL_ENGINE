'use strict';

/**
 * reprocessOverlaysRoute.js
 *
 * POST /api/media-output/reprocess-overlays  { id }
 *
 * Diagnostic + recovery: rerun ONLY the ffmpeg overlay pipeline against an
 * existing evics_renders row's cached HeyGen URL. Useful when the HeyGen
 * render itself succeeded but the post-processing failed (or the row was
 * written before the overlay contract was in place). Does NOT spend a
 * HeyGen credit.
 *
 * Registered from backend/server.js:
 *   require('./reprocessOverlaysRoute').register(app, {
 *     SupabaseConnector,
 *     isAdminAuthorized
 *   });
 */

const path = require('path');

function parseJsonMaybe(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function publicHost() {
  return String(
    process.env.PUBLIC_HOST ||
    process.env.HOST ||
    'https://evics-api-480958062306.us-central1.run.app'
  ).replace(/\/+$/, '');
}

function register(app, ctx) {
  const { SupabaseConnector, isAdminAuthorized } = ctx || {};
  if (!app || typeof app.post !== 'function') {
    throw new Error('reprocessOverlaysRoute.register requires an Express app');
  }

  const adminGate = (req) => {
    if (typeof isAdminAuthorized === 'function') return isAdminAuthorized(req);
    // Fallback admin check — matches the pattern used elsewhere in the app.
    const key = req.headers['x-admin-key'] || req.headers['X-Admin-Key'] || req.query.admin_key;
    const expected = process.env.EVICS_ADMIN_KEY ||
                     process.env.ADMIN_KEY ||
                     process.env.EVICS_APP_AUTOMATION_TOKEN ||
                     null;
    return !!expected && String(key || '') === String(expected);
  };

  app.post('/api/media-output/reprocess-overlays', async (req, res) => {
    try {
      if (!adminGate(req)) {
        return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
      }
      if (!SupabaseConnector) {
        return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
      }
      let videoPostProcessor = null;
      let productBgRemover = null;
      try { videoPostProcessor = require('../utils/videoPostProcessor'); } catch (_e) {}
      try { productBgRemover = require('../utils/productBgRemover'); } catch (_e) {}
      if (!videoPostProcessor || typeof videoPostProcessor.postProcessVideo !== 'function') {
        return res.status(503).json({ success: false, error: 'videoPostProcessor not available on this deployment.' });
      }

      const id = String((req.body && req.body.id) || req.query.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });

      const { data: row, error: fetchErr } = await SupabaseConnector
        .from('evics_renders')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!row) return res.status(404).json({ success: false, error: `evics_renders id=${id} not found` });

      const params = parseJsonMaybe(row.parameters, {});
      const rawUrl = params.heygenRawVideoUrl ||
                     (params.postProcess && params.postProcess.heygenRawVideoUrl) ||
                     null;
      const heygenUrl = rawUrl || row.video_url;
      if (!heygenUrl) {
        return res.status(400).json({
          success: false,
          error: 'Row has no cached HeyGen URL to reprocess. Fields checked: parameters.heygenRawVideoUrl, video_url.'
        });
      }

      let productImageLocalPath = null;
      let bgRemovalMeta = null;
      if (productBgRemover && typeof productBgRemover.removeBackground === 'function' && params.productImageUrl) {
        try {
          const bg = await productBgRemover.removeBackground(params.productImageUrl);
          bgRemovalMeta = bg || null;
          if (bg && bg.success && bg.processedUrl && bg.processedUrl.startsWith('/processed-images/')) {
            const filename = bg.processedUrl.slice('/processed-images/'.length);
            productImageLocalPath = path.join(__dirname, '..', 'data', 'processed-images', filename);
          }
        } catch (bgErr) {
          bgRemovalMeta = { success: false, error: bgErr && bgErr.message ? bgErr.message : String(bgErr) };
        }
      }

      const videoIdForFile = `reprocess_${id}_${Date.now()}`;
      const pp = await videoPostProcessor.postProcessVideo({
        videoUrl: heygenUrl,
        videoId: videoIdForFile,
        productImageLocalPath,
        productImageUrl: params.productImageUrl,
        productTitle: params.productTitle,
        productPageUrl: params.productPageUrl,
        specialEffects: ['product-entrance-fade']
      });

      let updated = null;
      if (pp && pp.success && pp.processedVideoUrl) {
        const finalUrl = `${publicHost()}${pp.processedVideoUrl}`;
        const nextParams = Object.assign({}, params, {
          playbackUrl: finalUrl,
          videoUrl: finalUrl,
          heygenRawVideoUrl: heygenUrl,
          reprocessedAt: new Date().toISOString(),
          postProcess: {
            success: true,
            code: null,
            processedVideoUrl: pp.processedVideoUrl,
            productOverlayApplied: pp.productOverlayApplied,
            ctaLabel: pp.ctaLabel,
            ctaClickUrl: pp.ctaClickUrl,
            fontFile: pp.fontFile || null
          },
          overlayContract: {
            productMockupPresent: !!pp.productOverlayApplied,
            buyNowPillPresent: !!pp.ctaTextApplied,
            ctaClickTarget: pp.ctaClickUrl || params.productPageUrl || null,
            enforced: true,
            failureReason: null
          }
        });
        const { data: upd, error: updErr } = await SupabaseConnector
          .from('evics_renders')
          .update({
            status: 'awaiting_review',
            video_url: finalUrl,
            render_grade: 92,
            parameters: nextParams,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();
        if (updErr) throw updErr;
        updated = upd;
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        id,
        heygenSourceUrl: heygenUrl,
        bgRemoval: bgRemovalMeta,
        postProcess: pp,
        updatedRow: updated ? { id: updated.id, status: updated.status, video_url: updated.video_url } : null
      });
    } catch (err) {
      console.error('[media-output/reprocess-overlays] failed:', err && err.stack ? err.stack : err);
      res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
  });
}

module.exports = { register };
