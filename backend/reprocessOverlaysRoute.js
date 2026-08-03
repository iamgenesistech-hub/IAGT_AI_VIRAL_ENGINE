'use strict';

/**
 * reprocessOverlaysRoute.js
 *
 * POST /api/media-output/reprocess-overlays
 *   Body: { id, productPageUrl? }
 *   Rerun ONLY the ffmpeg overlay pipeline against an existing row's cached
 *   HeyGen URL. Auto-resolves the Buy Now CTA target from the Shopify
 *   catalog if productPageUrl is not provided.
 *
 * POST /api/media-output/set-cta-url
 *   Body: { id, productPageUrl? }
 *   Update the Buy Now click target without re-rendering. If productPageUrl
 *   is omitted the endpoint auto-resolves from the Shopify catalog.
 *
 * POST /api/media-output/resolve-cta
 *   Body: { id }
 *   Dry-run: return what URL would be picked (and where it came from) without
 *   mutating anything. Useful for debugging why a Buy Now target is wrong.
 *
 * GET /render-preview/:id
 *   Public HTML page that wraps the processed video in a clickable landing
 *   page (both the whole video and the Buy Now button are functional links).
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

function checkoutHost() {
  const raw = process.env.SHOPIFY_CHECKOUT_HOST ||
              process.env.SHOPIFY_STORE_DOMAIN ||
              process.env.SHOPIFY_STORE ||
              process.env.SHOPIFY_SHOP ||
              'iamgenesistech.myshopify.com';
  return String(raw).replace(/^https?:\/\//, '').replace(/\/+$/, '');
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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Non-purchasable hosts: pointing a Buy Now here would break the funnel.
const BLOCKED_CTA_HOSTS = new Set([
  'iamgenesistech.com',
  'www.iamgenesistech.com'
]);

// Purchasable hosts we trust for a Buy Now. Anything else is only accepted
// when the user explicitly overrides.
const PURCHASE_HOST_ALLOWLIST = [
  /\.myshopify\.com$/i,
  /^shop\./i
];

function isPurchasableHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  if (BLOCKED_CTA_HOSTS.has(h)) return false;
  if (PURCHASE_HOST_ALLOWLIST.some((rx) => rx.test(h))) return true;
  return h === checkoutHost().toLowerCase();
}

function normalizeCtaUrl(raw) {
  if (!raw) return { ok: false, reason: 'empty' };
  let url;
  try { url = new URL(String(raw).trim()); }
  catch { return { ok: false, reason: 'invalid_url' }; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'unsupported_protocol' };
  }
  if (BLOCKED_CTA_HOSTS.has(url.hostname.toLowerCase())) {
    return {
      ok: false,
      reason: 'blocked_host',
      message: `${url.hostname} is not a purchasable checkout host. Use ${checkoutHost()}/products/{handle}.`
    };
  }
  return { ok: true, url: url.toString(), host: url.hostname.toLowerCase() };
}

/**
 * Resolve the canonical Buy Now URL for a render row by consulting:
 *  1. Stored productPageUrl if it's on a purchasable host
 *  2. Shopify live catalog (title / handle / shopify_id match)
 *  3. Explicit handle field on the row → https://{checkoutHost}/products/{handle}
 *  4. Slugified title fallback → https://{checkoutHost}/products/{slug}
 *
 * Returns { url, source, matchedProduct? } or { url:null, source:'none' }.
 */
async function resolveCtaUrlFromRow(row, params) {
  const stored = params.productPageUrl || (params.postProcess && params.postProcess.ctaClickUrl);
  if (stored) {
    const check = normalizeCtaUrl(stored);
    if (check.ok && isPurchasableHost(check.host)) {
      return { url: check.url, source: 'stored', matchedProduct: null };
    }
  }

  const titleGuess = params.productTitle || row.product_name || row.product || params.productName || params.providerPackage || null;
  const handleGuess = params.productHandle || row.handle || row.product_handle || params.handle || null;
  const shopifyIdGuess = params.shopifyProductId || params.productId || row.shopify_id || row.product_id || null;

  try {
    const connector = require('../utils/shopifyLiveConnector');
    if (connector && typeof connector.fetchShopifyProducts === 'function') {
      const products = await connector.fetchShopifyProducts();
      if (Array.isArray(products) && products.length) {
        const normTitle = (titleGuess || '').toLowerCase().trim();
        const normHandle = (handleGuess || '').toLowerCase().trim();
        const normSid = String(shopifyIdGuess || '').trim();
        const match = products.find((p) => {
          if (normSid && (String(p.id) === normSid || String(p.shopify_id) === normSid)) return true;
          if (normHandle && p.handle && p.handle.toLowerCase() === normHandle) return true;
          if (normTitle && p.title && p.title.toLowerCase() === normTitle) return true;
          return false;
        }) || (normTitle ? products.find((p) => p.title && p.title.toLowerCase().includes(normTitle)) : null);
        if (match) {
          const productUrl = match.productUrl || `https://${checkoutHost()}/products/${match.handle}`;
          const check = normalizeCtaUrl(productUrl);
          if (check.ok) {
            return { url: check.url, source: 'shopify_catalog', matchedProduct: { id: match.id, title: match.title, handle: match.handle } };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[resolveCtaUrlFromRow] catalog lookup failed:', e && e.message);
  }

  if (handleGuess) {
    const url = `https://${checkoutHost()}/products/${handleGuess}`;
    return { url, source: 'explicit_handle', matchedProduct: null };
  }
  if (titleGuess) {
    const slug = slugify(titleGuess);
    if (slug) {
      const url = `https://${checkoutHost()}/products/${slug}`;
      return { url, source: 'slugified_title', matchedProduct: null };
    }
  }
  return { url: null, source: 'none', matchedProduct: null };
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
        .select('*')
        .eq('id', id)
        .single();
      if (error || !row) {
        return res.status(404).type('text/html').send(`<h1>Render ${htmlEscape(id)} not found</h1>`);
      }
      const params = parseJsonMaybe(row.parameters, {});
      const videoUrl = row.video_url || params.playbackUrl || null;
      // Preview page also auto-resolves so it never falls back to a broken URL
      let productUrl = params.productPageUrl || (params.postProcess && params.postProcess.ctaClickUrl);
      if (!productUrl || BLOCKED_CTA_HOSTS.has(new URL(productUrl).hostname.toLowerCase())) {
        const resolved = await resolveCtaUrlFromRow(row, params);
        productUrl = resolved.url || productUrl || '#';
      }
      const productTitle = params.productTitle || row.product_name || 'Product';
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

  // --- Dry-run resolver (no side effects) ------------------------------
  app.post('/api/media-output/resolve-cta', async (req, res) => {
    try {
      if (!adminGate(req)) return res.status(401).json({ success: false, error: 'Admin key required.' });
      if (!SupabaseConnector) return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
      const id = String((req.body && req.body.id) || req.query.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const { data: row, error } = await SupabaseConnector.from('evics_renders').select('*').eq('id', id).single();
      if (error) throw error;
      if (!row) return res.status(404).json({ success: false, error: `evics_renders id=${id} not found` });
      const params = parseJsonMaybe(row.parameters, {});
      const resolved = await resolveCtaUrlFromRow(row, params);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        id,
        resolved,
        stored: {
          productPageUrl: params.productPageUrl || null,
          ctaClickUrl: (params.postProcess && params.postProcess.ctaClickUrl) || null,
          productTitle: params.productTitle || null,
          productHandle: params.productHandle || null,
          shopifyProductId: params.shopifyProductId || params.productId || null
        }
      });
    } catch (err) {
      console.error('[resolve-cta] failed:', err && err.stack ? err.stack : err);
      res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
  });

  // --- Fast CTA-URL patch (no re-render) --------------------------------
  app.post('/api/media-output/set-cta-url', async (req, res) => {
    try {
      if (!adminGate(req)) return res.status(401).json({ success: false, error: 'Admin key required.' });
      if (!SupabaseConnector) return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
      const id = String((req.body && req.body.id) || req.query.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });

      const { data: row, error: fetchErr } = await SupabaseConnector.from('evics_renders').select('*').eq('id', id).single();
      if (fetchErr) throw fetchErr;
      if (!row) return res.status(404).json({ success: false, error: `evics_renders id=${id} not found` });
      const params = parseJsonMaybe(row.parameters, {});

      const raw = (req.body && req.body.productPageUrl) || req.query.productPageUrl;
      let finalUrl = null;
      let source = null;
      let matchedProduct = null;
      if (raw) {
        const check = normalizeCtaUrl(String(raw));
        if (!check.ok) return res.status(400).json({ success: false, error: check.message || `productPageUrl invalid (${check.reason})` });
        finalUrl = check.url;
        source = 'explicit_override';
      } else {
        const resolved = await resolveCtaUrlFromRow(row, params);
        finalUrl = resolved.url;
        source = resolved.source;
        matchedProduct = resolved.matchedProduct;
        if (!finalUrl) {
          return res.status(422).json({
            success: false,
            error: 'Could not auto-resolve a Buy Now URL: no productTitle / productHandle / shopifyProductId on the row and no override provided.'
          });
        }
      }

      const nextParams = Object.assign({}, params, {
        productPageUrl: finalUrl,
        previewPageUrl: `${publicHost()}/render-preview/${id}`,
        postProcess: Object.assign({}, params.postProcess || {}, { ctaClickUrl: finalUrl }),
        overlayContract: Object.assign({}, params.overlayContract || {}, { ctaClickTarget: finalUrl, ctaResolutionSource: source })
      });

      const { data: upd, error: updErr } = await SupabaseConnector
        .from('evics_renders')
        .update({ parameters: nextParams, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, video_url, parameters')
        .single();
      if (updErr) throw updErr;

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        id,
        productPageUrl: finalUrl,
        ctaResolutionSource: source,
        matchedProduct,
        previewPageUrl: `${publicHost()}/render-preview/${id}`,
        updatedRow: { id: upd.id, video_url: upd.video_url }
      });
    } catch (err) {
      console.error('[set-cta-url] failed:', err && err.stack ? err.stack : err);
      res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
  });

  // --- Reprocess overlays (admin-only) ----------------------------------
  app.post('/api/media-output/reprocess-overlays', async (req, res) => {
    try {
      if (!adminGate(req)) return res.status(401).json({ success: false, error: 'Admin key required.' });
      if (!SupabaseConnector) return res.status(503).json({ success: false, error: 'Supabase is not configured.' });
      let videoPostProcessor = null;
      let productBgRemover = null;
      try { videoPostProcessor = require('../utils/videoPostProcessor'); } catch (_e) {}
      try { productBgRemover = require('../utils/productBgRemover'); } catch (_e) {}
      if (!videoPostProcessor || typeof videoPostProcessor.postProcessVideo !== 'function') {
        return res.status(503).json({ success: false, error: 'videoPostProcessor not available on this deployment.' });
      }

      const id = String((req.body && req.body.id) || req.query.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });

      const { data: row, error: fetchErr } = await SupabaseConnector.from('evics_renders').select('*').eq('id', id).single();
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

      const rawOverride = (req.body && req.body.productPageUrl) || req.query.productPageUrl;
      let productPageUrl = null;
      let ctaResolutionSource = null;
      let matchedProduct = null;
      if (rawOverride) {
        const check = normalizeCtaUrl(String(rawOverride));
        if (!check.ok) return res.status(400).json({ success: false, error: check.message || `productPageUrl invalid (${check.reason})` });
        productPageUrl = check.url;
        ctaResolutionSource = 'explicit_override';
      } else {
        const resolved = await resolveCtaUrlFromRow(row, params);
        productPageUrl = resolved.url;
        ctaResolutionSource = resolved.source;
        matchedProduct = resolved.matchedProduct;
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
        productPageUrl,
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
          productPageUrl: productPageUrl || params.productPageUrl,
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
            ctaClickTarget: pp.ctaClickUrl || productPageUrl || params.productPageUrl || null,
            ctaResolutionSource,
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
        productPageUrl,
        ctaResolutionSource,
        matchedProduct,
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

module.exports = { register, resolveCtaUrlFromRow, normalizeCtaUrl, slugify };
