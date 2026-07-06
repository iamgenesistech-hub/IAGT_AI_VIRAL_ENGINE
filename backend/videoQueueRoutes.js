/**
 * videoQueueRoutes.js — REST API for Queue Operations
 * 
 * Exposes endpoints for:
 * - Enqueueing render jobs
 * - Checking job status (lightweight, non-blocking)
 * - Monitoring queue depth and health
 */

const { enqueueRenderJob, getQueueStats } = require('./videoQueueEngine');
const persistenceEngine = require('./persistenceEngine');
const costTracker = require('./costTrackingEngine');

/**
 * Register video queue routes on Express app.
 * 
 * @param {express.Application} app
 * @param {object} deps - dependencies (logger, auth middleware, etc.)
 */
async function registerVideoQueueRoutes(app, deps = {}) {
  /**
   * POST /api/affiliate/product-video/generate-async
   * 
   * Enqueue a product video render job.
   * Returns 202 Accepted immediately; video renders in background.
   * 
   * Request body:
   * {
   *   affiliateCode: string,
   *   avatarId: string,
   *   productId: string,
   *   script: string,
   *   backgroundUrl: string (optional)
   * }
   * 
   * Response: 202
   * {
   *   success: true,
   *   jobId: string,
   *   status: "QUEUED",
   *   statusUrl: string,
   *   message: string
   * }
   */
  app.post('/api/affiliate/product-video/generate-async', async (req, res) => {
    try {
      const {
        affiliateCode,
        avatarId,
        productId,
        script,
        backgroundUrl,
        voiceId
      } = req.body;

      // Validate required fields
      if (!affiliateCode || !avatarId || !script) {
        return res.status(400).json({
          error: 'Missing required fields: affiliateCode, avatarId, script'
        });
      }

      // Validate affiliate exists (optional; depends on your auth model)
      // const affiliate = await persistenceEngine.getAffiliateProfile(affiliateCode);
      // if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });

      console.log(
        `[QueueAPI] Enqueue request: ${affiliateCode}/${avatarId}/${productId}`
      );

      // ── 1. Create job record in QUEUED state ──
      const jobId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const jobRecord = {
        jobId,
        affiliateCode,
        avatarId,
        productId,
        script,
        voiceId: voiceId || null,
        backgroundUrl: backgroundUrl || null,
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
        queuedAt: new Date().toISOString()
      };

      try {
        await persistenceEngine.createVideoJob(jobRecord);
        console.log(`[QueueAPI] Job record created: ${jobId}`);
      } catch (err) {
        console.error(`[QueueAPI] Failed to create job record:`, err.message);
        return res.status(500).json({ error: 'Failed to create job record' });
      }

      // ── 2. Enqueue to Cloud Tasks ──
      let taskInfo;
      try {
        taskInfo = await enqueueRenderJob(jobId, {
          affiliateCode,
          avatarId,
          productId,
          script,
          backgroundUrl,
          voiceId: voiceId || undefined
        });
        console.log(`[QueueAPI] Job enqueued to Cloud Tasks: ${taskInfo.taskName}`);
      } catch (err) {
        console.error(`[QueueAPI] Failed to enqueue:`, err.message);
        // Mark job as FAILED since we couldn't queue it
        await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
          status: 'ENQUEUE_FAILED',
          error: err.message
        }).catch(e => console.error('Update failed:', e.message));
        return res.status(500).json({ error: 'Failed to enqueue render job' });
      }

      // ── 3. Log event ──
      await costTracker.logCost({
        affiliateCode,
        jobId,
        operation: 'video_render_enqueued',
        unitCount: 1,
        costUSD: 0 // Cost tracked on completion
      }).catch(err => console.error('Cost log failed (non-fatal):', err.message));

      // ── 4. Return 202 Accepted ──
      return res.status(202).json({
        success: true,
        jobId,
        status: 'QUEUED',
        statusUrl: `/api/affiliate/product-video/status/${jobId}?affiliateCode=${affiliateCode}`,
        message: 'Render job queued. Poll status URL to track progress.'
      });

    } catch (err) {
      console.error('[QueueAPI] Unexpected error in enqueue:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/affiliate/product-video/status/:jobId
   * 
   * Check the status of a render job (lightweight, non-blocking).
   * Returns 10ms or faster (sub-millisecond cache hit if job cached).
   * 
   * Query params:
   * - affiliateCode: required (prevents cross-account access)
   * 
   * Response: 200
   * {
   *   jobId: string,
   *   status: "QUEUED" | "IN_PROGRESS" | "RENDERING" | "COMPLETE" | "ERROR" | "FAILED",
   *   videoUrl: string | null,
   *   error: string | null,
   *   createdAt: string (ISO 8601),
   *   completedAt: string | null,
   *   renderDurationMs: number | null
   * }
   */
  app.get('/api/affiliate/product-video/status/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { affiliateCode } = req.query;

      // Require affiliate code (isolation guard)
      if (!affiliateCode) {
        return res.status(400).json({ error: 'Missing affiliateCode query parameter' });
      }

      // Fetch job (will be cached in Redis if available)
      let job;
      try {
        job = await persistenceEngine.getVideoJob(jobId, affiliateCode);
      } catch (err) {
        console.error(`[QueueAPI] Failed to fetch job ${jobId}:`, err.message);
        return res.status(500).json({ error: 'Failed to fetch job status' });
      }

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Return job status (safe to expose: affiliate owns it via affiliateCode check)
      return res.json({
        jobId,
        status: job.status,
        videoUrl: job.videoUrl || null,
        heygenVideoUrl: job.heygenVideoUrl || null,
        error: job.error || null,
        createdAt: job.createdAt,
        queuedAt: job.queuedAt || null,
        completedAt: job.completedAt || null,
        renderDurationMs: job.renderDurationMs || null,
        renderAttempts: job.renderAttempts || null,
        governance: job.governance || null
      });

    } catch (err) {
      console.error('[QueueAPI] Error in status check:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/queue-stats
   * 
   * Queue health and monitoring (admin only).
   * 
   * Response: 200
   * {
   *   queueSize: number (tasks waiting),
   *   rateLimitPerSecond: number,
   *   maxConcurrentDispatches: number,
   *   oldestTaskLeaseExpireTime: string | null
   * }
   */
  app.get('/api/admin/queue-stats', async (req, res) => {
    try {
      // TODO: Add admin auth check here
      // if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const stats = await getQueueStats();
      return res.json({
        ...stats,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('[QueueAPI] Stats error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/affiliate/product-video/list
   * 
   * List all render jobs for an affiliate (paginated).
   * 
   * Query params:
   * - affiliateCode: required
   * - limit: number (default 20, max 100)
   * - offset: number (default 0)
   * 
   * Response: 200
   * {
   *   jobs: [
   *     { jobId, status, createdAt, completedAt, ... }
   *   ],
   *   total: number,
   *   limit: number,
   *   offset: number
   * }
   */
  app.get('/api/affiliate/product-video/list', async (req, res) => {
    try {
      const { affiliateCode } = req.query;
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
      const offset = parseInt(req.query.offset || '0', 10);

      if (!affiliateCode) {
        return res.status(400).json({ error: 'Missing affiliateCode' });
      }

      // Fetch affiliate's render jobs
      let jobs;
      try {
        jobs = await persistenceEngine.listVideoJobsByAffiliate(
          affiliateCode,
          limit,
          offset
        );
      } catch (err) {
        console.error(`[QueueAPI] Failed to list jobs:`, err.message);
        return res.status(500).json({ error: 'Failed to list jobs' });
      }

      return res.json({
        jobs: jobs || [],
        total: (jobs || []).length, // TODO: get real count
        limit,
        offset
      });

    } catch (err) {
      console.error('[QueueAPI] Error in list:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  console.log('[QueueAPI] Routes registered:');
  console.log('  POST   /api/affiliate/product-video/generate-async');
  console.log('  GET    /api/affiliate/product-video/status/:jobId');
  console.log('  GET    /api/affiliate/product-video/list');
  console.log('  GET    /api/admin/queue-stats');
}

module.exports = { registerVideoQueueRoutes };
