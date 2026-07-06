/**
 * renderWorker.js — Background Render Worker for Cloud Run
 * 
 * Long-running service that:
 * 1. Receives tasks from Cloud Tasks queue
 * 2. Calls HeyGen API to render videos (1-3 min per video)
 * 3. Archives completed videos to GCS
 * 4. Updates job records with status
 * 5. Handles failures with exponential backoff (Cloud Tasks retries)
 * 
 * Deploy as separate Cloud Run service (not main API).
 * Run: node backend/renderWorker.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const persistenceEngine = require('./persistenceEngine');
const costTracker = require('./costTrackingEngine');
const governance = require('./sacredIntelligenceGovernance');

// HeyGen API calls
const {
  startHeyGenRender,
  pollHeyGenVideo
} = require('./internalVideoRenderer');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ── Worker Configuration ──
const HEYGEN_POLL_INTERVAL = parseInt(process.env.HEYGEN_POLL_INTERVAL || '10000', 10);
const HEYGEN_MAX_POLL_ATTEMPTS = parseInt(process.env.HEYGEN_MAX_POLL_ATTEMPTS || '180', 10);
const WORKER_NAME = process.env.WORKER_NAME || 'render-worker-default';

console.log(`[Worker] Started: ${WORKER_NAME}`);
console.log(`[Worker] HeyGen poll interval: ${HEYGEN_POLL_INTERVAL}ms`);
console.log(`[Worker] HeyGen max attempts: ${HEYGEN_MAX_POLL_ATTEMPTS}`);

// ── Worker Metrics (for monitoring) ──
let workerMetrics = {
  jobsStarted: 0,
  jobsCompleted: 0,
  jobsFailed: 0,
  totalRenderTimeMs: 0,
  lastJobCompletedAt: null
};

/**
 * POST /api/internal/render-worker
 * 
 * Receives a video render task from Cloud Tasks.
 * Cloud Tasks sends the task body base64-encoded; express.json decodes it.
 * 
 * Request body:
 * {
 *   jobId: string,
 *   affiliateCode: string,
 *   avatarId: string,
 *   productId: string,
 *   script: string (what avatar says),
 *   backgroundUrl: string (optional),
 *   enqueuedAt: string (ISO 8601)
 * }
 */
app.post('/api/internal/render-worker', async (req, res) => {
  const startTime = Date.now();
  const {
    jobId,
    affiliateCode,
    avatarId,
    productId,
    script,
    backgroundUrl,
    enqueuedAt
  } = req.body;

  console.log(
    `[Worker] Task received: ${jobId} for ${affiliateCode}`,
    `(queued ${Math.round((Date.now() - new Date(enqueuedAt).getTime()) / 1000)}s ago)`
  );

  try {
    // ── 1. Validate and load job record ──
    let jobRecord;
    try {
      jobRecord = await persistenceEngine.getVideoJob(jobId, affiliateCode);
    } catch (err) {
      console.error(`[Worker] Failed to fetch job ${jobId}:`, err.message);
      // Retry via Cloud Tasks
      return res.status(500).json({ error: 'Failed to fetch job from persistence' });
    }

    if (!jobRecord) {
      console.warn(`[Worker] Job ${jobId} not found (may have been cancelled)`);
      // 404 = don't retry; task is acknowledged
      return res.status(404).json({ error: 'Job not found' });
    }

    if (jobRecord.status !== 'QUEUED') {
      console.warn(
        `[Worker] Job ${jobId} status is ${jobRecord.status} (expected QUEUED); skipping`
      );
      // Idempotency: if already processed, ack and return success
      if (['IN_PROGRESS', 'RENDERING', 'COMPLETE'].includes(jobRecord.status)) {
        return res.status(200).json({ message: 'Job already processed', jobId });
      }
      // Otherwise conflict
      return res.status(409).json({ error: `Job status is ${jobRecord.status}` });
    }

    // ── 2. Mark job as IN_PROGRESS ──
    await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
      status: 'IN_PROGRESS',
      workerName: WORKER_NAME,
      workerStartedAt: new Date().toISOString()
    });
    console.log(`[Worker] Job ${jobId} marked IN_PROGRESS`);

    // ── 3. Call HeyGen API to start render ──
    let renderResult;
    try {
      renderResult = await startHeyGenRender({
        avatarId,
        script,
        backgroundUrl,
        captionEnabled: true // Captions boost SEO/retention
      });
    } catch (err) {
      console.error(`[Worker] HeyGen render start failed:`, err.message);
      await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
        status: 'ERROR',
        error: `HeyGen API error: ${err.message}`,
        failedAt: new Date().toISOString()
      });
      // Retry via Cloud Tasks
      return res.status(500).json({ error: 'HeyGen API error' });
    }

    const { videoJobId: heygenJobId, videoUrl } = renderResult;
    console.log(`[Worker] HeyGen render started: ${heygenJobId}`);

    // ── 4. Update job with HeyGen job ID ──
    await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
      heygenJobId,
      status: 'RENDERING',
      heygenStartedAt: new Date().toISOString()
    });

    // ── 5. Log cost for HeyGen render initiation ──
    await costTracker.logCost({
      affiliateCode,
      jobId,
      operation: 'heygen_video_render_start',
      unitCount: 1,
      costUSD: 0 // Cost tracked on completion
    });

    // ── 6. Poll HeyGen until complete (may take 1-3 minutes) ──
    let pollAttempt = 0;
    let heygenStatus = null;

    while (pollAttempt < HEYGEN_MAX_POLL_ATTEMPTS) {
      // Wait before polling (don't hammer HeyGen API)
      await new Promise(resolve => setTimeout(resolve, HEYGEN_POLL_INTERVAL));

      try {
        heygenStatus = await pollHeyGenVideo(heygenJobId);
      } catch (err) {
        console.error(`[Worker] HeyGen poll failed (attempt ${pollAttempt + 1}):`, err.message);
        pollAttempt++;
        // Continue retrying; HeyGen API may be temporarily down
        continue;
      }

      console.log(
        `[Worker] HeyGen poll #${pollAttempt + 1}: ${heygenStatus.status}`,
        `(${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
      );

      if (heygenStatus.status === 'completed') {
        // ── RENDER COMPLETE ──
        break;
      }

      if (heygenStatus.status === 'failed') {
        // ── RENDER FAILED ──
        throw new Error(`HeyGen render failed: ${heygenStatus.error || 'unknown'}`);
      }

      pollAttempt++;
    }

    if (heygenStatus?.status !== 'completed') {
      throw new Error(
        `Render timeout: ${HEYGEN_MAX_POLL_ATTEMPTS} polls × ${HEYGEN_POLL_INTERVAL}ms ` +
        `= ${Math.round((HEYGEN_MAX_POLL_ATTEMPTS * HEYGEN_POLL_INTERVAL) / 1000)}s`
      );
    }

    console.log(
      `[Worker] Render complete in ${Math.round((Date.now() - startTime) / 1000)}s`,
      `HeyGen video: ${heygenStatus.videoUrl}`
    );

    // ── 7. Archive video to GCS before 7-day HeyGen CDN expiry ──
    let gcsUrl;
    try {
      gcsUrl = await persistenceEngine.archiveHeyGenVideo(
        affiliateCode,
        jobId,
        heygenStatus.videoUrl
      );
      console.log(`[Worker] Video archived to GCS: ${gcsUrl}`);
    } catch (err) {
      console.error(`[Worker] GCS archive failed:`, err.message);
      // Non-fatal; HeyGen URL still valid for 7 days
      gcsUrl = heygenStatus.videoUrl;
    }

    // ── 8. Update job to COMPLETE ──
    const renderDurationMs = Date.now() - startTime;
    await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
      status: 'COMPLETE',
      videoUrl: gcsUrl,
      heygenVideoUrl: heygenStatus.videoUrl,
      completedAt: new Date().toISOString(),
      renderDurationMs,
      renderAttempts: pollAttempt + 1
    });
    console.log(`[Worker] Job ${jobId} marked COMPLETE (${renderDurationMs}ms)`);

    // ── 9. Log final cost ──
    const durationMinutes = renderDurationMs / 60000;
    await costTracker.logCost({
      affiliateCode,
      jobId,
      operation: 'heygen_video_complete',
      durationMinutes,
      costUSD: durationMinutes * 0.1 // HeyGen charges ~$0.10/min (adjust per plan)
    });

    // ── 10. Governance check on completed video ──
    // (Metadata, script appropriateness, product claims, etc.)
    let governanceResult = { approved: true };
    try {
      governanceResult = await governance.evaluateOutput({
        type: 'video_render_complete',
        affiliateCode,
        jobId,
        videoMetadata: {
          script,
          avatarId,
          productId,
          renderDurationMs
        }
      });

      if (!governanceResult.approved) {
        console.warn(
          `[Worker] Governance check FLAGGED for job ${jobId}:`,
          governanceResult.reason
        );
        await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
          status: 'GOVERNANCE_REVIEW',
          governanceFeedback: governanceResult.reason,
          governanceScores: governanceResult.scores
        });
      }
    } catch (govErr) {
      console.error('[Worker] Governance evaluation error (non-fatal):', govErr.message);
      // Don't fail job if governance service is down
    }

    // ── Success ──
    workerMetrics.jobsCompleted++;
    workerMetrics.totalRenderTimeMs += renderDurationMs;
    workerMetrics.lastJobCompletedAt = new Date().toISOString();

    console.log(`[Worker] ✓ Job complete: ${jobId} (${renderDurationMs}ms)`);
    return res.json({
      success: true,
      jobId,
      videoUrl: gcsUrl,
      renderDurationMs,
      governance: governanceResult
    });

  } catch (err) {
    // ── Error Handling ──
    console.error(`[Worker] ✗ Error rendering ${jobId}:`, err.message);

    workerMetrics.jobsFailed++;

    try {
      await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
        status: 'ERROR',
        error: err.message,
        failedAt: new Date().toISOString(),
        errorStack: err.stack
      });
    } catch (updateErr) {
      console.error(`[Worker] Failed to update error status:`, updateErr.message);
    }

    // Return 500 so Cloud Tasks will retry
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health
 * Health check for Cloud Run.
 */
app.get('/health', (req, res) => {
  return res.json({
    status: 'healthy',
    worker: WORKER_NAME,
    uptime: Math.round(process.uptime()),
    metrics: workerMetrics
  });
});

/**
 * GET /api/internal/metrics
 * Worker metrics for monitoring.
 */
app.get('/api/internal/metrics', (req, res) => {
  const avgRenderTime = workerMetrics.jobsCompleted > 0
    ? Math.round(workerMetrics.totalRenderTimeMs / workerMetrics.jobsCompleted)
    : 0;

  return res.json({
    worker: WORKER_NAME,
    jobsStarted: workerMetrics.jobsStarted,
    jobsCompleted: workerMetrics.jobsCompleted,
    jobsFailed: workerMetrics.jobsFailed,
    avgRenderTimeMs: avgRenderTime,
    lastJobCompletedAt: workerMetrics.lastJobCompletedAt
  });
});

// ── Server startup ──
const PORT = process.env.PORT || 4176;
app.listen(PORT, () => {
  console.log(`[Worker] Listening on port ${PORT}`);
  console.log(`[Worker] Ready to receive render tasks from Cloud Tasks`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received; gracefully shutting down');
  process.exit(0);
});
