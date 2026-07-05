'use strict';

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
  console.log('[EVICS ViralMedia] Starting route registration...');
  
  const routes = [];
  const originalGet = app.get.bind(app);
  const originalPost = app.post.bind(app);
  
  app.get = function(path, ...args) {
    routes.push(`GET ${Array.isArray(path) ? path[0] : path}`);
    return originalGet(path, ...args);
  };
  
  app.post = function(path, ...args) {
    routes.push(`POST ${path}`);
    return originalPost(path, ...args);
  };
  
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
  }

  function currentSnapshot() {
    return getDashboardSnapshot(readViralMediaState());
  }

  app.get('/api/viral-media/state', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/state called');
    return sendJson(res, 200, currentSnapshot());
  });

  app.get('/api/viral-media/dashboard', function (_req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/dashboard called');
    return sendJson(res, 200, currentSnapshot());
  });

  app.get('/api/viral-media/products', async function (req, res) {
    console.log('[EVICS ViralMedia] GET /api/viral-media/products called');
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

  app.post('/api/viral-media/briefs', async function (req, res) {
    try {
      const body = req.body || {};
      const limit = Number(body.limit || 1);
      const videoType = String(body.videoType || 'Jordan Avatar Trust Video');
      const products = body.products && Array.isArray(body.products) && body.products.length
        ? body.products.map(function (product) { return normalizeProductRecord(product, product.bestSellerRank || 1); })
        : [await resolveSingleProduct(body, limit)];
      const briefs = products.filter(Boolean).map(function (product, index) {
        return generateCreativeBrief(product, product.bestSellerRank || index + 1, { videoType: videoType });
      });
      updateViralMediaState(function (state) {
        mergeRecords(state, 'briefs', briefs);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        count: briefs.length,
        briefs: briefs
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/scripts/jordan', async function (req, res) {
    try {
      const body = req.body || {};
      const limit = Number(body.limit || 1);
      const product = await resolveSingleProduct(body, limit);
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for Jordan script generation.' });
      }
      const brief = generateCreativeBrief(product, product.bestSellerRank || 1, { videoType: 'Jordan Avatar Trust Video' });
      const script = generateJordanTrustScript(product, brief, body);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'briefs', [brief]);
        mergeRecords(state, 'scripts', [script]);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        script: script
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/concepts/ai-commercial', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for AI concept generation.' });
      }
      const brief = generateCreativeBrief(product, product.bestSellerRank || 1, { videoType: 'AI Cinematic Viral Commercial' });
      const concept = generateAICinematicConcept(product, brief, body);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'briefs', [brief]);
        mergeRecords(state, 'concepts', [concept]);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        concept: concept
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/score', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for scoring.' });
      }
      const brief = body.brief && typeof body.brief === 'object'
        ? body.brief
        : generateCreativeBrief(product, product.bestSellerRank || 1, { videoType: body.videoType || 'Jordan Avatar Trust Video' });
      const scores = scoreCreativeAsset({
        brief: brief,
        product: product,
        videoType: body.videoType || brief.videoType || 'Jordan Avatar Trust Video',
        platform: body.platform || '',
        selectedHook: body.selectedHook || body.hook || brief.suggestedHook,
        selectedCta: body.selectedCta || body.cta || brief.suggestedCTA,
        spokenScript: body.spokenScript || body.script || '',
        concept: body.concept || null
      });
      const scoreRow = Object.assign({
        id: 'score-' + slugify(product.productHandle || product.productName) + '-' + slugify(body.videoType || 'trust'),
        campaignId: 'vmc-' + slugify(product.productHandle || product.productName),
        productId: product.id,
        productHandle: product.productHandle,
        productName: product.productName,
        sku: product.sku || '',
        videoType: body.videoType || 'Jordan Avatar Trust Video',
        status: 'Needs Review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, scores);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'scores', [scoreRow]);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        score: scoreRow
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/viral-media/render-queue', function (_req, res) {
    const state = readViralMediaState();
    return sendJson(res, 200, {
      success: true,
      count: state.mediaGenerationJobs.length,
      jobs: state.mediaGenerationJobs
    });
  });

  app.post('/api/viral-media/render-queue', async function (req, res) {
    try {
      const body = req.body || {};
      const limit = Number(body.limit || 1);
      const jordanAvatarAvailable = body.jordanAvatarAvailable === true;
      const launchRendering = body.launchRendering === true;
      const products = body.products && Array.isArray(body.products) && body.products.length
        ? body.products.map(function (product) { return normalizeProductRecord(product, product.bestSellerRank || 1); })
        : [await resolveSingleProduct(body, limit)];
      const jobs = [];
      products.filter(Boolean).forEach(function (product) {
        const brief = generateCreativeBrief(product, product.bestSellerRank || 1, { videoType: 'Jordan Avatar Trust Video' });
        const jordanScript = generateJordanTrustScript(product, brief, body);
        const aiConcept = generateAICinematicConcept(product, brief, body);
        const renderJobs = buildRenderJobs(product, brief.campaignId, jordanScript, aiConcept, {}, {
          jordanAvailable: jordanAvatarAvailable,
          launchRendering: launchRendering
        });
        renderJobs.forEach(function (job) {
          jobs.push(job);
        });
      });
      updateViralMediaState(function (state) {
        mergeRecords(state, 'renders', jobs);
        mergeRecords(state, 'mediaGenerationJobs', jobs);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        count: jobs.length,
        jobs: jobs
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/exports', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for export planning.' });
      }
      const campaignId = 'vmc-' + slugify(product.productHandle || product.productName);
      const exports = buildExportMatrix(product, campaignId);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'exports', exports);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        count: exports.length,
        exports: exports
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/publishing-plan', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for publishing planning.' });
      }
      const videoType = String(body.videoType || 'Jordan Avatar Trust Video');
      const campaignId = 'vmc-' + slugify(product.productHandle || product.productName);
      const publishing = buildPublishingPlan(product, campaignId, videoType);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'publishing', publishing);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        count: publishing.length,
        publishing: publishing
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/board-review', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for board review.' });
      }
      const videoType = String(body.videoType || 'Jordan Avatar Trust Video');
      const brief = generateCreativeBrief(product, product.bestSellerRank || 1, { videoType: videoType });
      const scores = body.scores && typeof body.scores === 'object'
        ? body.scores
        : scoreCreativeAsset({
          brief: brief,
          product: product,
          videoType: videoType,
          platform: body.platform || '',
          selectedHook: body.selectedHook || brief.suggestedHook,
          selectedCta: body.selectedCta || brief.suggestedCTA,
          spokenScript: body.spokenScript || '',
          concept: body.concept || null
        });
      const review = buildBoardReview(product, videoType, scores, body);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'boardReviews', [review]);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        boardReview: review
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/learning-loop', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for learning loop generation.' });
      }
      const brief = generateCreativeBrief(product, product.bestSellerRank || 1, { videoType: body.videoType || 'Jordan Avatar Trust Video' });
      const scores = body.scores && typeof body.scores === 'object'
        ? body.scores
        : scoreCreativeAsset({
          brief: brief,
          product: product,
          videoType: body.videoType || 'Jordan Avatar Trust Video',
          platform: body.platform || '',
          selectedHook: body.selectedHook || brief.suggestedHook,
          selectedCta: body.selectedCta || brief.suggestedCTA,
          spokenScript: body.spokenScript || '',
          concept: body.concept || null
        });
      const review = buildBoardReview(product, body.videoType || 'Jordan Avatar Trust Video', scores, body);
      const insight = buildLearningLoopInsight(product, 'vmc-' + slugify(product.productHandle || product.productName), body.videoType || 'Jordan Avatar Trust Video', scores, review);
      updateViralMediaState(function (state) {
        mergeRecords(state, 'learningLoop', [insight]);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        learningLoop: insight
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/regeneration', async function (req, res) {
    try {
      const body = req.body || {};
      const product = await resolveSingleProduct(body, Number(body.limit || 1));
      if (!product) {
        return sendJson(res, 404, { success: false, error: 'No product found for regeneration queue.' });
      }
      const queueItem = {
        id: 'regen-' + slugify(product.productHandle || product.productName) + '-' + slugify(body.reason || 'regeneration'),
        campaignId: 'vmc-' + slugify(product.productHandle || product.productName),
        productId: product.id,
        productHandle: product.productHandle,
        productName: product.productName,
        sku: product.sku || '',
        reason: String(body.reason || 'Needs regeneration'),
        regenerationFocus: String(body.regenerationFocus || body.focus || 'Hook and concept'),
        priority: Number(body.priority || 80),
        retryCount: Number(body.retryCount || 0),
        status: 'Needs Regeneration',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updateViralMediaState(function (state) {
        mergeRecords(state, 'regenerationQueue', [queueItem]);
        return state;
      });
      return sendJson(res, 200, {
        success: true,
        regeneration: queueItem
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/viral-media/batch-builder', async function (req, res) {
    try {
      const body = req.body || {};
      const limit = Number(body.limit || 25);
      const jordanAvatarAvailable = body.jordanAvatarAvailable === true
        ? true
        : readViralMediaState().jordanAvatar.available === true;
      const launchRendering = body.launchRendering === true;
      const result = await buildBatchCampaigns(limit, {
        jordanAvailable: jordanAvatarAvailable,
        launchRendering: launchRendering
      });
      return sendJson(res, 200, {
        success: true,
        message: 'Generated ' + result.count + ' Viral Product Media campaigns.',
        result: result,
        dashboard: currentSnapshot()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/viral-media/media-library', function (_req, res) {
    const state = readViralMediaState();
    return sendJson(res, 200, {
      success: true,
      count: buildMediaLibraryItems(state).length,
      items: buildMediaLibraryItems(state)
    });
  });

  app.get('/api/viral-media/jordan-avatar', function (_req, res) {
    const state = readViralMediaState();
    return sendJson(res, 200, {
      success: true,
      jordanAvatar: state.jordanAvatar
    });
  });

  app.post('/api/viral-media/jordan-avatar/check', async function (_req, res) {
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

  console.log('[EVICS ViralMedia] Route registration complete - 19 routes registered');
  console.log('[EVICS ViralMedia] Routes registered:', routes);
  
  // RESTORE ORIGINAL METHODS
  app.get = originalGet;
  app.post = originalPost;
}

module.exports = {
  registerViralMediaRoutes
};
