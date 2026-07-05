'use strict';

const express = require('express');
const {
  readViralMediaState,
  writeViralMediaState,
  updateViralMediaState,
  getDashboardSnapshot,
  fetchBestSellingProducts,
  generateCreativeBrief,
  generateJordanTrustScript,
  generateAICinematicConcept,
  scoreCreativeAsset,
  buildExportMatrix,
  buildPublishingPlan,
  buildBoardReview,
  buildLearningLoopInsight,
  buildRenderJobs,
  buildCampaignFromProduct,
  buildBatchCampaigns,
  buildMediaLibraryItems,
  normalizeProductRecord
} = require('../utils/viralMediaEngine');

const { validateJordanAvatar } = require('./internalVideoRenderer');

function registerViralMediaRoutes(app) {
  console.log('[EVICS ViralMedia] Starting route registration with Express Router...');
  
  // Create a new Express Router
  const router = express.Router();
  
  const routes = [];
  
  function noStore(res) {
    res.setHeader('Cache-Control', 'no-store');
  }

  function sendJson(res, status, payload) {
    noStore(res);
    return res.status(status).json(payload);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function upsertById(list, item) {
    const index = list.findIndex(function (entry) {
      return entry && item && entry.id === item.id;
    });
    if (index === -1) {
      list.push(item);
      return list;
    }
    list[index] = item;
    return list;
  }

  async function resolveCatalog(limit) {
    const max = Number(limit || 25);
    const catalog = await fetchBestSellingProducts(Math.max(max, 25));
    return catalog.slice(0, max);
  }

  async function resolveSingleProduct(body, fallbackLimit) {
    const limit = Number(body && body.limit ? body.limit : fallbackLimit || 1);
    const catalog = await resolveCatalog(Math.max(limit, 5));
    const handle = String(body && (body.productHandle || body.handle || body.product_handle) || '').toLowerCase();
    const productId = String(body && (body.productId || body.product_id || body.id) || '').toLowerCase();
    const name = String(body && (body.productName || body.product_name || body.title) || '').toLowerCase();
    let product = null;
    if (handle) {
      product = catalog.find(function (item) { return String(item.productHandle || '').toLowerCase() === handle; }) || null;
    }
    if (!product && productId) {
      product = catalog.find(function (item) {
        return String(item.id || '').toLowerCase() === productId || String(item.shopifyProductId || '').toLowerCase() === productId;
      }) || null;
    }
    if (!product && name) {
      product = catalog.find(function (item) { return String(item.productName || '').toLowerCase() === name; }) || null;
    }
    if (!product) {
      product = catalog[0] || null;
    }
    if (!product && body && body.product) {
      product = normalizeProductRecord(body.product, 1);
    }
    return product;
  }

  function mergeRecords(state, key, records) {
    const next = Array.isArray(state[key]) ? state[key].slice() : [];
    records.forEach(function (record) {
      upsertById(next, record);
    });
    state[key] = next;
    return state;
  }

  function currentSnapshot() {
    try {
      return getDashboardSnapshot();
    } catch (error) {
      return { error: error.message, success: false };
    }
  }

  // ===== ROUTES USING ROUTER =====

  router.get('/state', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/state called');
    routes.push('GET /api/viral-media/state');
    return sendJson(res, 200, currentSnapshot());
  });

  router.get('/dashboard', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/dashboard called');
    routes.push('GET /api/viral-media/dashboard');
    return sendJson(res, 200, currentSnapshot());
  });

  router.get('/products', async function (req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/products called');
    routes.push('GET /api/viral-media/products');
    try {
      const limit = Number(req.query.limit || 25);
      const catalog = await resolveCatalog(limit);
      const state = readViralMediaState();
      const byHandle = new Map(state.products.map(function (item) { return [String(item.productHandle || '').toLowerCase(), item]; }));
      const merged = catalog.map(function (product) {
        const status = byHandle.get(String(product.productHandle || '').toLowerCase());
        return Object.assign({}, product, status || {});
      });
      return sendJson(res, 200, {
        success: true,
        count: merged.length,
        products: merged,
        summary: state.summary,
        publishingMode: state.publishingMode,
        jordanAvatar: state.jordanAvatar
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  router.post('/briefs', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/briefs called');
    routes.push('POST /api/viral-media/briefs');
    try {
      const product = await resolveSingleProduct(req.body);
      if (!product) return sendJson(res, 400, { success: false, error: 'Product not found' });
      const brief = await generateCreativeBrief(product);
      updateViralMediaState(function (state) {
        state.briefs = upsertById(state.briefs, brief);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Brief generated', brief: brief });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/scripts/jordan', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/scripts/jordan called');
    routes.push('POST /api/viral-media/scripts/jordan');
    try {
      const product = await resolveSingleProduct(req.body);
      if (!product) return sendJson(res, 400, { success: false, error: 'Product not found' });
      const script = await generateJordanTrustScript(product);
      updateViralMediaState(function (state) {
        state.scripts = upsertById(state.scripts, script);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Jordan script generated', script: script });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/concepts/ai-commercial', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/concepts/ai-commercial called');
    routes.push('POST /api/viral-media/concepts/ai-commercial');
    try {
      const product = await resolveSingleProduct(req.body);
      if (!product) return sendJson(res, 400, { success: false, error: 'Product not found' });
      const concept = await generateAICinematicConcept(product);
      updateViralMediaState(function (state) {
        state.concepts = upsertById(state.concepts, concept);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'AI cinematic concept generated', concept: concept });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/score', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/score called');
    routes.push('POST /api/viral-media/score');
    try {
      const { assetId, assetType, videoMetadata } = req.body || {};
      if (!assetId || !assetType) return sendJson(res, 400, { success: false, error: 'assetId and assetType required' });
      const score = await scoreCreativeAsset({ id: assetId, type: assetType }, videoMetadata || {});
      updateViralMediaState(function (state) {
        state.scores = upsertById(state.scores, score);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Asset scored', score: score });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.get('/render-queue', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/render-queue called');
    routes.push('GET /api/viral-media/render-queue');
    const state = readViralMediaState();
    return sendJson(res, 200, { success: true, renderQueue: state.renderQueue || [] });
  });

  router.post('/render-queue', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/render-queue called');
    routes.push('POST /api/viral-media/render-queue');
    try {
      const product = await resolveSingleProduct(req.body);
      if (!product) return sendJson(res, 400, { success: false, error: 'Product not found' });
      const jobs = await buildRenderJobs(product);
      updateViralMediaState(function (state) {
        state.renderQueue = state.renderQueue.concat(jobs);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Render jobs queued', jobs: jobs });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/exports', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/exports called');
    routes.push('POST /api/viral-media/exports');
    try {
      const { videoId, videoType } = req.body || {};
      if (!videoId) return sendJson(res, 400, { success: false, error: 'videoId required' });
      const exports = await buildExportMatrix({ id: videoId, type: videoType || 'jordan' });
      updateViralMediaState(function (state) {
        state.exports = upsertById(state.exports, exports);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Export matrix built', exports: exports });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/publishing-plan', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/publishing-plan called');
    routes.push('POST /api/viral-media/publishing-plan');
    try {
      const { videoId, videoType, product } = req.body || {};
      if (!videoId) return sendJson(res, 400, { success: false, error: 'videoId required' });
      const plan = await buildPublishingPlan({ id: videoId, type: videoType || 'jordan' }, product || null);
      updateViralMediaState(function (state) {
        state.publishingPlans = upsertById(state.publishingPlans, plan);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Publishing plan created', plan: plan });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/board-review', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/board-review called');
    routes.push('POST /api/viral-media/board-review');
    try {
      const { videoId, videoType, product } = req.body || {};
      if (!videoId) return sendJson(res, 400, { success: false, error: 'videoId required' });
      const review = await buildBoardReview({ id: videoId, type: videoType || 'jordan' }, product || null);
      updateViralMediaState(function (state) {
        state.boardReviews = upsertById(state.boardReviews, review);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Board review created', review: review });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/learning-loop', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/learning-loop called');
    routes.push('POST /api/viral-media/learning-loop');
    try {
      const { videoId, performanceData } = req.body || {};
      if (!videoId) return sendJson(res, 400, { success: false, error: 'videoId required' });
      const insight = await buildLearningLoopInsight({ id: videoId }, performanceData || {});
      updateViralMediaState(function (state) {
        state.learningLoopInsights = upsertById(state.learningLoopInsights, insight);
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Learning loop insight recorded', insight: insight });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/regeneration', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/regeneration called');
    routes.push('POST /api/viral-media/regeneration');
    try {
      const { videoId, reason } = req.body || {};
      if (!videoId) return sendJson(res, 400, { success: false, error: 'videoId required' });
      updateViralMediaState(function (state) {
        state.regenerationQueue = state.regenerationQueue || [];
        state.regenerationQueue.push({ id: videoId, reason: reason || 'Manual regeneration', queuedAt: new Date().toISOString() });
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Video queued for regeneration', videoId: videoId });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.post('/batch-builder', async function (req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/batch-builder called');
    routes.push('POST /api/viral-media/batch-builder');
    try {
      const { count, selectedProducts } = req.body || {};
      const numProducts = Number(count || 25);
      const campaigns = await buildBatchCampaigns(selectedProducts || [], numProducts);
      updateViralMediaState(function (state) {
        state.batchCampaigns = campaigns;
        state.lastBatchGeneratedAt = new Date().toISOString();
        return state;
      });
      return sendJson(res, 200, { success: true, status: 'Batch campaigns generated', campaigns: campaigns.slice(0, 5), total: campaigns.length });
    } catch (error) {
      return sendJson(res, 500, { success: false, error: error.message });
    }
  });

  router.get('/media-library', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/media-library called');
    routes.push('GET /api/viral-media/media-library');
    const state = readViralMediaState();
    const library = buildMediaLibraryItems(state.scripts, state.concepts, state.exports);
    return sendJson(res, 200, { success: true, library: library, total: library.length });
  });

  router.get('/jordan-avatar', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/jordan-avatar called');
    routes.push('GET /api/viral-media/jordan-avatar');
    const state = readViralMediaState();
    return sendJson(res, 200, { success: true, jordanAvatar: state.jordanAvatar });
  });

  router.post('/jordan-avatar/check', async function (_req, res) {
    console.log('[EVICS ViralMedia] POST /api/viral-media/jordan-avatar/check called');
    routes.push('POST /api/viral-media/jordan-avatar/check');
    try {
      const result = await validateJordanAvatar();
      updateViralMediaState(function (state) {
        state.jordanAvatar = {
          requestedAvatarId: result.avatar_id || state.jordanAvatar.requestedAvatarId,
          voiceId: state.jordanAvatar.voiceId,
          available: Boolean(result.valid),
          status: result.valid ? 'available' : 'missing',
          lastCheckedAt: new Date().toISOString(),
          lastError: result.error || ''
        };
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        result: result,
        jordanAvatar: readViralMediaState().jordanAvatar
      });
    } catch (error) {
      updateViralMediaState(function (state) {
        state.jordanAvatar.lastCheckedAt = new Date().toISOString();
        state.jordanAvatar.available = false;
        state.jordanAvatar.status = 'error';
        state.jordanAvatar.lastError = error.message;
        return state;
      });
      return sendJson(res, 503, {
        success: false,
        error: error.message
      });
    }
  });

  // Register the router on the app instance at /api/viral-media
  app.use('/api/viral-media', router);
  
  console.log('[EVICS ViralMedia] Router registered at /api/viral-media');
  console.log('[EVICS ViralMedia] Routes registered:', routes);
  console.log('[EVICS ViralMedia] Route registration complete - ' + routes.length + ' routes registered');
}

module.exports = {
  registerViralMediaRoutes
};
