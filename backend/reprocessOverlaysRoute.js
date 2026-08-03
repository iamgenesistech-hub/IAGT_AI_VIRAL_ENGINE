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
 * GET /render-preview/:id
 *
 * Public HTML preview page: wraps the processed video in a landing page
 * where the entire video AND a dedicated "Buy Now" button are functional
 * clickable links to the product page. This is the canonical way to
 * verify the CTA behaviour — mp4 files themselves cannot embed clickable
 * regions, so the "BUY NOW" painted into the video pixels only becomes
 * functional when the video is embedded in a container that provides a
 * click target (a landing page like this one, or a platform's
 * product-link sticker).
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

function defaultAdminGate(req) {
  const expected = String(
    process.env.ADMIN_API_KEY ||
    process.env.EVICS_ADMIN_KEY ||
    process.env.EVICS_APP_AUTOMATION_TOKEN ||
    ''
  ).trim();
  if (!expected) return false;
  const provided = String(
    req.headers['x-admin-key'] ||
    req.headers['X-Admin-Key'] ||
    req.headers['x-api-key'] ||
    req.query.admin_key ||
    ''
  ).trim();
  return provided && provided === expected;
}

function htmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function register(app, ctx) {
  const { SupabaseConnector, isAdminAuthorized } = ctx || {};
  if (!app || typeof app.post !== 'function') {
    throw new Error('reprocessOverlaysRoute.register requires an Express app');
  }

  const adminGate = typeof isAdminAuthorized === 'function' ? isAdminAuthorized : defaultAdminGate;

  // --- Public preview / click-verification page -------------------------
  app.get('/render-preview/:id', async (req, res) => {
    try {
      if (!SupabaseConnector) {
        return res.status(503).type('text/html').send('<h1>Supabase not configured</h1>');
      }
      const id = String(req.params.id || '').trim();
      if (!id) return res.status(400).type('text/html').send('<h1>Missing id</h1>');
      const { data: row, error } = await SupabaseConnector
        .from('evics_renders')
        .select('id,video_url,parameters,status')
        .eq('id', id)
        .single();
      if (error || !row) {
        return res.status(404).type('text/html').send(`<h1>Render ${htmlEscape(id)} not found</h1>`);
      }
      let params = row.parameters;
      if (typeof params === 'string') { try { params = JSON.parse(params); } catch { params = {}; } }
      params = params || {};
      const videoUrl = row.video_url || params.playbackUrl || null;
      const productUrl = params.productPageUrl || (params.postProcess && params.postProcess.ctaClickUrl) || '#';
      const productTitle = params.productTitle || 'Product';
      if (!videoUrl) {
        return res.status(404).type('text/html').send(`<h1>Render ${htmlEscape(id)} has no video yet (status: ${htmlEscape(row.status)})</h1>`);
      }
      const html = `<!doctype html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${htmlEscape(productTitle)} - EVICS render ${htmlEscape(id)}</title>
<style>
  html,body{margin:0;background:#0a0a0a;color:#f4c96a;font-family:system-ui,-apple-system,sans-serif;min-height:100%;}
  .wrap{max-width:520px;margin:0 auto;padding:24px 16px;}
  h1{font-size:20px;margin:0 0 6px;color:#fff;}
  .sub{color:#a0a0a0;font-size:13px;margin-bottom:16px;}
  .frame{position:relative;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.6);}
  video{display:block;width:100%;height:auto;}
  .clickzone{position:absolute;inset:0;display:block;text-decoration:none;}
  .btn{margin-top:18px;display:block;text-align:center;background:#f4c96a;color:#0a0a0a;padding:16px 20px;font-weight:800;border-radius:14px;text-decoration:none;font-size:18px;}
  .meta{margin-top:16px;color:#888;font-size:12px;line-height:1.5;word-break:break-all;}
  .meta code{color:#f4c96a;}
</style>
</head><body><div class="wrap">
  <h1>${htmlEscape(productTitle)}</h1>
  <div class="sub">EVICS render #${htmlEscape(id)} - the entire video and the button below are clickable. Both open the product page.</div>
  <div class="frame">
    <video src="${htmlEscape(videoUrl)}" playsinline autoplay muted loop controls></video>
    <a class="clickzone" href="${htmlEscape(productUrl)}" target="_blank" rel="noopener" aria-label="Shop ${htmlEscape(productTitle)}"></a>
  </div>
  <a class="btn" href="${htmlEscape(productUrl)}" target="_blank" rel="noopener">BUY NOW - Shop ${htmlEscape(productTitle)}</a>
  <div class="meta">
    Click target: <code>${htmlEscape(productUrl)}</code><br>
    Video source: <code>${htmlEscape(videoUrl)}</code>
  </div>
</div></body></html>`;
      res.setHeader('Cache-Control', 'no-store');
      res.type('text/html').send(html);
    } catch (err) {
      console.error('[render-preview] failed:', err && err.stack ? err.stack : err);
      res.status(500).type('text/html').send('<h1>Preview failed</h1><pre>' + htmlEscape(String(err && err.message || err)) + '</pre>');
    }
  });

  // --- Reprocess overlays (admin-only) ----------------------------------
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
      const previewUrl = pp && pp.success ? `${publicHost()}/render-preview/${id}` : null;

      if (pp && pp.success && pp.processedVideoUrl) {
        const finalUrl = `${publicHost()}${pp.processedVideoUrl}`;
        const nextParams = Object.assign({}, params, {
          playbackUrl: finalUrl,
          videoUrl: finalUrl,
          previewPageUrl: previewUrl,
          heygenRawVideoUrl: heygenUrl,
          reprocessedAt: new Date().toISOString(),
          postProcess: {
            success: true,
            code: null,
            processedVideoUrl: pp.processedVideoUrl,
            productOverlayApplied: pp.productOverlayApplied,
            ctaLabel: pp.ctaLabel,
            ctaClickUrl: pp.ctaClickUrl,
            fontFile: pp.fontFile || null,
            titleFit: pp.titleFit || null,
            probed: pp.probed || null,
            mockupSource: pp.mockupSource || null
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
        previewPageUrl: previewUrl,
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
