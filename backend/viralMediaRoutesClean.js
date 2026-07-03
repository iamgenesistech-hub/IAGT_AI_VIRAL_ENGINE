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
  normalizeProductRecord,
  computeSummary
} = require('../utils/viralMediaEngine');

function createViralMediaRouter() {
  const router = express.Router();

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

  // ========== DASHBOARD ==========
  router.get('/dashboard', (_req, res) => {
    try {
      const state = readViralMediaState();
      const snapshot = getDashboardSnapshot(state);
      return sendJson(res, 200, {
        success: true,
        dashboard: snapshot,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== PRODUCTS ==========
  router.get('/products', async (req, res) => {
    try {
      const limit = Number(req.query.limit || 25);
      const products = await fetchBestSellingProducts(limit);
      const state = readViralMediaState();
      
      return sendJson(res, 200, {
        success: true,
        count: products.length,
        products: products.map(p => normalizeProductRecord(p, state)),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== GENERATE BRIEFS ==========
  router.post('/briefs', async (req, res) => {
    try {
      const { productId, productData } = req.body;
      if (!productId || !productData) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing productId or productData'
        });
      }

      const brief = generateCreativeBrief(productData);
      const state = updateViralMediaState(s => {
        if (!s.briefs) s.briefs = [];
        s.briefs = s.briefs.filter(b => b.productId !== productId);
        s.briefs.push({
          id: `brief_${productId}_${Date.now()}`,
          productId,
          brief,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        brief,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== GENERATE JORDAN SCRIPTS ==========
  router.post('/scripts/jordan', async (req, res) => {
    try {
      const { productId, productData, brief } = req.body;
      if (!productId || !productData) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing productId or productData'
        });
      }

      const script = generateJordanTrustScript(productData, brief);
      const state = updateViralMediaState(s => {
        if (!s.scripts) s.scripts = [];
        s.scripts = s.scripts.filter(sc => sc.productId !== productId || sc.videoType !== 'jordan_avatar');
        s.scripts.push({
          id: `script_jordan_${productId}_${Date.now()}`,
          productId,
          videoType: 'jordan_avatar',
          script,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        script,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== GENERATE AI CONCEPTS ==========
  router.post('/concepts/ai-commercial', async (req, res) => {
    try {
      const { productId, productData, brief } = req.body;
      if (!productId || !productData) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing productId or productData'
        });
      }

      const concept = generateAICinematicConcept(productData, brief);
      const state = updateViralMediaState(s => {
        if (!s.concepts) s.concepts = [];
        s.concepts = s.concepts.filter(c => c.productId !== productId || c.videoType !== 'ai_cinematic');
        s.concepts.push({
          id: `concept_ai_${productId}_${Date.now()}`,
          productId,
          videoType: 'ai_cinematic',
          concept,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        concept,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== SCORE CREATIVE ==========
  router.post('/score', async (req, res) => {
    try {
      const { videoType, asset } = req.body;
      if (!videoType || !asset) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing videoType or asset'
        });
      }

      const score = scoreCreativeAsset(asset, videoType);
      const state = updateViralMediaState(s => {
        if (!s.scores) s.scores = [];
        s.scores.push({
          id: `score_${Date.now()}`,
          videoType,
          score,
          asset: asset.id || asset.productId,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 200, {
        success: true,
        score,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== RENDER QUEUE ==========
  router.get('/render-queue', (_req, res) => {
    try {
      const state = readViralMediaState();
      const queue = state.mediaGenerationJobs || [];
      
      return sendJson(res, 200, {
        success: true,
        queueLength: queue.length,
        jobs: queue.filter(j => j.status !== 'completed').slice(0, 50),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== EXPORTS ==========
  router.post('/exports', async (req, res) => {
    try {
      const { productId, videoType, formats } = req.body;
      if (!productId || !videoType) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing productId or videoType'
        });
      }

      const matrix = buildExportMatrix(productId, videoType, formats);
      const state = updateViralMediaState(s => {
        if (!s.exports) s.exports = [];
        s.exports.push({
          id: `export_${productId}_${videoType}_${Date.now()}`,
          productId,
          videoType,
          matrix,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        exports: matrix,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== PUBLISHING PLAN ==========
  router.post('/publishing-plan', async (req, res) => {
    try {
      const { productId, videoType } = req.body;
      if (!productId || !videoType) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing productId or videoType'
        });
      }

      const plan = buildPublishingPlan(productId, videoType);
      const state = updateViralMediaState(s => {
        if (!s.publishing) s.publishing = [];
        s.publishing.push({
          id: `plan_${productId}_${videoType}_${Date.now()}`,
          productId,
          videoType,
          plan,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        publishingPlan: plan,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== BOARD REVIEW ==========
  router.post('/board-review', async (req, res) => {
    try {
      const { videoId, asset, videoType } = req.body;
      if (!videoId || !asset) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing videoId or asset'
        });
      }

      const review = buildBoardReview(asset, videoType);
      const state = updateViralMediaState(s => {
        if (!s.boardReviews) s.boardReviews = [];
        s.boardReviews.push({
          id: `review_${videoId}_${Date.now()}`,
          videoId,
          review,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        review,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== LEARNING LOOP ==========
  router.post('/learning-loop', async (req, res) => {
    try {
      const { videoId, metrics, performance } = req.body;
      if (!videoId) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing videoId'
        });
      }

      const insight = buildLearningLoopInsight(metrics || {}, performance || {});
      const state = updateViralMediaState(s => {
        if (!s.learningLoop) s.learningLoop = [];
        s.learningLoop.push({
          id: `insight_${videoId}_${Date.now()}`,
          videoId,
          insight,
          createdAt: new Date().toISOString()
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        insight,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== REGENERATION QUEUE ==========
  router.get('/regeneration', (_req, res) => {
    try {
      const state = readViralMediaState();
      const queue = state.regenerationQueue || [];
      
      return sendJson(res, 200, {
        success: true,
        queueLength: queue.length,
        items: queue.slice(0, 50),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  router.post('/regeneration', async (req, res) => {
    try {
      const { videoId, reason } = req.body;
      if (!videoId) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing videoId'
        });
      }

      const state = updateViralMediaState(s => {
        if (!s.regenerationQueue) s.regenerationQueue = [];
        s.regenerationQueue.push({
          id: `regen_${videoId}_${Date.now()}`,
          videoId,
          reason: reason || 'Manual regeneration requested',
          requestedAt: new Date().toISOString(),
          status: 'pending'
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        message: 'Video queued for regeneration',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== BATCH BUILDER ==========
  router.post('/batch-builder', async (req, res) => {
    try {
      const { productIds, count } = req.body;
      if (!count && (!productIds || productIds.length === 0)) {
        return sendJson(res, 400, {
          success: false,
          error: 'Provide either count or specific productIds'
        });
      }

      const limit = count || productIds.length;
      const products = await fetchBestSellingProducts(limit);
      const campaigns = buildBatchCampaigns(products);

      const state = updateViralMediaState(s => {
        if (!s.videoCampaigns) s.videoCampaigns = [];
        campaigns.forEach(campaign => {
          s.videoCampaigns.push({
            id: `campaign_${campaign.productId}_${Date.now()}`,
            ...campaign,
            createdAt: new Date().toISOString(),
            status: 'brief_generated'
          });
        });
        return s;
      });

      return sendJson(res, 201, {
        success: true,
        campaignsCreated: campaigns.length,
        campaigns: campaigns.slice(0, 10),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== MEDIA LIBRARY ==========
  router.get('/media-library', (req, res) => {
    try {
      const state = readViralMediaState();
      const library = buildMediaLibraryItems(state);
      
      const filters = {
        videoType: req.query.videoType,
        status: req.query.status,
        platform: req.query.platform
      };

      let filtered = library;
      if (filters.videoType) filtered = filtered.filter(l => l.videoType === filters.videoType);
      if (filters.status) filtered = filtered.filter(l => l.status === filters.status);
      if (filters.platform) filtered = filtered.filter(l => l.platforms && l.platforms.includes(filters.platform));

      return sendJson(res, 200, {
        success: true,
        count: filtered.length,
        items: filtered.slice(0, 50),
        filters,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  // ========== JORDAN AVATAR CHECK ==========
  router.get('/jordan-avatar/check', (_req, res) => {
    try {
      const state = readViralMediaState();
      return sendJson(res, 200, {
        success: true,
        jordanAvatar: state.jordanAvatar || {
          available: false,
          status: 'not_configured',
          message: 'Jordan avatar not configured'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  router.post('/jordan-avatar/configure', (req, res) => {
    try {
      const { avatarId, voiceId, name } = req.body;
      if (!avatarId || !voiceId) {
        return sendJson(res, 400, {
          success: false,
          error: 'Missing avatarId or voiceId'
        });
      }

      const state = updateViralMediaState(s => {
        s.jordanAvatar = {
          avatarId,
          voiceId,
          name: name || 'Jordan',
          available: true,
          status: 'configured',
          configuredAt: new Date().toISOString()
        };
        return s;
      });

      return sendJson(res, 200, {
        success: true,
        message: 'Jordan avatar configured',
        jordanAvatar: state.jordanAvatar,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

module.exports = {
  createViralMediaRouter
};
