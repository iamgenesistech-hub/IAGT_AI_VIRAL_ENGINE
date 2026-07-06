# Phase 1: Cloud Tasks Queue System for Video Rendering
## Decouple video generation from HTTP request/response

**Objective:** Replace synchronous HeyGen render calls (blocking 1-3 min per request) with an async queue system. Video requests return immediately; renders complete in background; app polls lightweight status endpoint.

**Expected Result:**
- Video requests return 202 Accepted in <100ms.
- Platform can queue 10,000+ renders without blocking.
- HeyGen API rate limits isolated from HTTP layer.
- Failed renders can be retried without user resubmission.

---

## Architecture Diagram

```
Phone App / Dashboard
    ↓
    POST /api/affiliate/product-video/generate
    ├─ Validate request
    ├─ Create job record (status: QUEUED)
    ├─ Enqueue to Cloud Tasks
    └─ Return 202 { jobId, status: QUEUED }
    ↓
Cloud Tasks Queue
    ├─ Retry policy: 5x on 5xx
    ├─ Rate limit: 1 task/sec (HeyGen plan: 10-20 req/min)
    └─ Route to /api/internal/render-worker
    ↓
Render Worker (Cloud Run service)
    ├─ Long-running, high-memory instance
    ├─ Pull job from task
    ├─ Call HeyGen API (1-3 min)
    ├─ Poll HeyGen until complete
    ├─ Download video to GCS
    ├─ Update job record (status: COMPLETE)
    └─ Acknowledge task (auto-delete from queue)
    ↓
Phone App / Dashboard
    ├─ Poll GET /api/affiliate/product-video/status/{jobId}
    ├─ Returns { status: COMPLETE, videoUrl, ... }
    └─ Display video in gallery
```

---

## Files to Create / Modify

### 1. `backend/videoQueueEngine.js` (NEW)
Cloud Tasks client, enqueue/dequeue helpers, job state management.

```javascript
const { CloudTasksClient } = require('@google-cloud/tasks');
const path = require('path');

const client = new CloudTasksClient();
const PROJECT = process.env.GCP_PROJECT || 'your-project-id';
const QUEUE = 'evics-render-queue';
const REGION = 'us-central1';
const HANDLER_URL = process.env.RENDER_HANDLER_URL || 'https://evics-render-worker-{hash}.run.app';

/**
 * Enqueue a video render job to Cloud Tasks.
 * @param {string} jobId - unique job ID
 * @param {object} renderPayload - { affiliateCode, avatarId, productId, script, ... }
 * @returns {Promise<{ taskName, taskId }>}
 */
async function enqueueRenderJob(jobId, renderPayload) {
  const parent = client.queuePath(PROJECT, REGION, QUEUE);
  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${HANDLER_URL}/api/internal/render-worker`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({
        jobId,
        ...renderPayload,
        enqueuedAt: new Date().toISOString()
      })).toString('base64'),
      oidcToken: { serviceAccountEmail: 'evics-render-worker@your-project.iam.gserviceaccount.com' }
    }
  };
  
  const [response] = await client.createTask({ parent, task });
  console.log(`[Queue] Enqueued render job: ${jobId} → ${response.name}`);
  return { taskName: response.name, taskId: jobId };
}

/**
 * Get queue stats (depth, age of oldest task, etc.).
 * @returns {Promise<{ queueSize, oldestTaskAge, ... }>}
 */
async function getQueueStats() {
  const parent = client.queuePath(PROJECT, REGION, QUEUE);
  try {
    const [queue] = await client.getQueue({ name: parent });
    return {
      queueSize: queue.stats?.tasksCount || 0,
      oldestTaskAge: queue.stats?.oldestTaskLeaseExpireTime || null,
      rateLimitPerSecond: queue.rateLimits?.maxDispatchesPerSecond || 100
    };
  } catch (err) {
    console.error('[Queue] Failed to fetch stats:', err.message);
    return { queueSize: 0, oldestTaskAge: null };
  }
}

/**
 * Configure retry policy for queue (exponential backoff, max 5 retries).
 * Call once at startup.
 */
async function configureQueueRetryPolicy() {
  const parent = client.queuePath(PROJECT, REGION, QUEUE);
  const queue = {
    retryConfig: {
      maxAttempts: 5,
      minBackoff: { seconds: 10 },
      maxBackoff: { seconds: 600 }, // 10 min
      maxDoublings: 4
    }
  };
  try {
    await client.updateQueue({ queue });
    console.log('[Queue] Configured retry policy.');
  } catch (err) {
    console.error('[Queue] Failed to configure retry:', err.message);
  }
}

module.exports = {
  enqueueRenderJob,
  getQueueStats,
  configureQueueRetryPolicy,
  PROJECT,
  QUEUE,
  REGION
};
```

---

### 2. `backend/renderWorker.js` (NEW)
Long-running background worker that pulls jobs from Cloud Tasks and executes renders.

```javascript
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const { startHeyGenRender, pollHeyGenVideo } = require('./internalVideoRenderer');
const persistenceEngine = require('./persistenceEngine');
const costTracker = require('./costTrackingEngine');
const governance = require('./sacredIntelligenceGovernance');

const app = express();
app.use(express.json());

// ── Worker endpoint: receives task from Cloud Tasks ──
app.post('/api/internal/render-worker', async (req, res) => {
  // Cloud Tasks sends base64 body; express.json decodes it.
  const {
    jobId,
    affiliateCode,
    avatarId,
    productId,
    script,
    backgroundUrl,
    enqueuedAt
  } = req.body;

  console.log(`[Worker] Starting render job ${jobId} for ${affiliateCode}`);

  try {
    // 1. Validate job still exists and is in QUEUED state
    const jobRecord = await persistenceEngine.getVideoJob(jobId, affiliateCode);
    if (!jobRecord) {
      console.warn(`[Worker] Job ${jobId} not found; skipping (may have been cancelled)`);
      return res.status(404).json({ error: 'Job not found' });
    }
    if (jobRecord.status !== 'QUEUED') {
      console.warn(`[Worker] Job ${jobId} status is ${jobRecord.status}; skipping`);
      return res.status(409).json({ error: `Job status is ${jobRecord.status}` });
    }

    // 2. Mark job as IN_PROGRESS
    await persistenceEngine.updateVideoJob(jobId, affiliateCode, { status: 'IN_PROGRESS' });
    console.log(`[Worker] Job ${jobId} marked IN_PROGRESS`);

    // 3. Call HeyGen to start render
    const renderResult = await startHeyGenRender({
      avatarId,
      script,
      backgroundUrl
    });
    const { videoJobId: heygenJobId, videoUrl } = renderResult;

    // 4. Update job record with HeyGen job ID
    await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
      heygenJobId,
      status: 'RENDERING'
    });
    console.log(`[Worker] HeyGen job started: ${heygenJobId}`);

    // 5. Log cost (HeyGen API call for rendering)
    await costTracker.logCost({
      affiliateCode,
      jobId,
      operation: 'heyGen_video_render',
      minutesRendered: 1, // Will update on completion
      costUSD: 0.01 // Placeholder; HeyGen charges at completion
    });

    // 6. Poll HeyGen until complete (may take 1-3 min)
    let attempts = 0;
    const maxAttempts = 180; // 3 min at 1 sec intervals, or 10 sec intervals = 30 min
    let pollInterval = process.env.HEYGEN_POLL_INTERVAL || 10000; // 10 sec

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, pollInterval));
      const status = await pollHeyGenVideo(heygenJobId);
      console.log(`[Worker] HeyGen poll #${attempts + 1}: ${status.status}`);

      if (status.status === 'completed') {
        // 7. Download video to GCS
        const gcsUrl = await persistenceEngine.archiveHeyGenVideo(
          affiliateCode,
          jobId,
          status.videoUrl
        );
        console.log(`[Worker] Video archived to GCS: ${gcsUrl}`);

        // 8. Update job record with final status
        await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
          status: 'COMPLETE',
          videoUrl: gcsUrl,
          completedAt: new Date().toISOString(),
          renderDurationMs: (Date.now() - new Date(enqueuedAt).getTime())
        });

        // 9. Log final cost
        await costTracker.logCost({
          affiliateCode,
          jobId,
          operation: 'heyGen_video_complete',
          costUSD: 0.10 // Actual HeyGen charge
        });

        // 10. Governance check on completed video (metadata, transcript, etc.)
        const governanceResult = await governance.evaluateOutput({
          type: 'video_render_complete',
          affiliateCode,
          jobId,
          videoMetadata: {
            script,
            avatarId,
            productId
          }
        });
        if (!governanceResult.approved) {
          console.warn(`[Worker] Governance check failed for job ${jobId}:`, governanceResult.reason);
          await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
            status: 'GOVERNANCE_REVIEW',
            governanceFeedback: governanceResult.reason
          });
        }

        console.log(`[Worker] Job ${jobId} COMPLETE`);
        return res.json({ success: true, jobId, videoUrl: gcsUrl });
      }

      if (status.status === 'failed') {
        console.error(`[Worker] HeyGen job failed: ${status.error}`);
        await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
          status: 'FAILED',
          error: status.error,
          failedAt: new Date().toISOString()
        });
        return res.status(500).json({ error: 'Render failed' });
      }

      attempts++;
    }

    // Timeout after max attempts
    throw new Error(`Render timeout after ${maxAttempts} polls (${maxAttempts * pollInterval / 1000}s)`);

  } catch (err) {
    console.error(`[Worker] Error rendering job ${jobId}:`, err.message);
    try {
      await persistenceEngine.updateVideoJob(jobId, affiliateCode, {
        status: 'ERROR',
        error: err.message,
        failedAt: new Date().toISOString()
      });
    } catch (updateErr) {
      console.error(`[Worker] Failed to update error status:`, updateErr.message);
    }

    // Return 500 so Cloud Tasks will retry (up to max attempts configured in queue)
    return res.status(500).json({ error: err.message });
  }
});

// ── Health check for Cloud Run ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4176;
app.listen(PORT, () => {
  console.log(`[Worker] Render worker listening on port ${PORT}`);
});
```

---

### 3. `backend/videoQueueRoutes.js` (NEW)
Routes for enqueueing renders and checking job status.

```javascript
const { enqueueRenderJob, getQueueStats } = require('./videoQueueEngine');
const persistenceEngine = require('./persistenceEngine');

async function registerVideoQueueRoutes(app, deps) {
  /**
   * POST /api/affiliate/product-video/generate-async
   * Enqueue a video render job (returns 202 immediately).
   */
  app.post('/api/affiliate/product-video/generate-async', async (req, res) => {
    try {
      const {
        affiliateCode,
        avatarId,
        productId,
        script,
        backgroundUrl
      } = req.body;

      if (!affiliateCode || !avatarId || !script) {
        return res.status(400).json({ error: 'Missing required fields: affiliateCode, avatarId, script' });
      }

      // 1. Create job record in QUEUED state
      const jobId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await persistenceEngine.createVideoJob({
        jobId,
        affiliateCode,
        avatarId,
        productId,
        script,
        backgroundUrl,
        status: 'QUEUED',
        createdAt: new Date().toISOString()
      });

      // 2. Enqueue to Cloud Tasks
      await enqueueRenderJob(jobId, {
        affiliateCode,
        avatarId,
        productId,
        script,
        backgroundUrl
      });

      // 3. Return 202 Accepted
      return res.status(202).json({
        success: true,
        jobId,
        status: 'QUEUED',
        statusUrl: `/api/affiliate/product-video/status/${jobId}?affiliateCode=${affiliateCode}`,
        message: 'Render job queued. Poll status URL to track progress.'
      });
    } catch (err) {
      console.error('[Queue API] Enqueue failed:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/affiliate/product-video/status/{jobId}
   * Check render job status (lightweight, <10ms).
   */
  app.get('/api/affiliate/product-video/status/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { affiliateCode } = req.query;

      if (!affiliateCode) {
        return res.status(400).json({ error: 'Missing affiliateCode' });
      }

      const job = await persistenceEngine.getVideoJob(jobId, affiliateCode);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.json({
        jobId,
        status: job.status,
        videoUrl: job.videoUrl || null,
        error: job.error || null,
        createdAt: job.createdAt,
        completedAt: job.completedAt || null,
        renderDurationMs: job.renderDurationMs || null
      });
    } catch (err) {
      console.error('[Queue API] Status check failed:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/queue-stats
   * Queue depth and health metrics.
   */
  app.get('/api/admin/queue-stats', async (req, res) => {
    try {
      const stats = await getQueueStats();
      return res.json(stats);
    } catch (err) {
      console.error('[Queue API] Stats failed:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerVideoQueueRoutes };
```

---

## Deployment Steps

### 1. Add Dependencies to `package.json`
```json
{
  "dependencies": {
    "@google-cloud/tasks": "^4.2.0"
  }
}
```

### 2. Create Cloud Tasks Queue (GCP Console or CLI)
```bash
gcloud tasks queues create evics-render-queue \
  --location=us-central1 \
  --max-dispatches-per-second=1 \
  --max-concurrent-dispatches=10 \
  --max-retry-attempts=5 \
  --min-backoff=10s \
  --max-backoff=600s
```

### 3. Deploy Render Worker as Separate Cloud Run Service
```bash
# Build render worker Docker image
docker build -f Dockerfile.worker -t gcr.io/your-project/evics-render-worker:latest .

# Push to Container Registry
docker push gcr.io/your-project/evics-render-worker:latest

# Deploy to Cloud Run
gcloud run deploy evics-render-worker \
  --image=gcr.io/your-project/evics-render-worker:latest \
  --platform=managed \
  --region=us-central1 \
  --memory=2Gi \
  --timeout=3600 \
  --max-instances=20 \
  --set-env-vars="HEYGEN_POLL_INTERVAL=10000,GCP_PROJECT=your-project" \
  --service-account=evics-render-worker@your-project.iam.gserviceaccount.com

# Note the service URL (e.g., https://evics-render-worker-xyz.run.app)
# Add to .env as RENDER_HANDLER_URL
```

### 4. Update `backend/server.js`
Remove synchronous `/api/affiliate/product-video/generate` or mark as deprecated.  
Mount queue routes:
```javascript
const { registerVideoQueueRoutes } = require('./videoQueueRoutes');
registerVideoQueueRoutes(app, deps);
```

### 5. Deploy Main App
```bash
gcloud run deploy evics-api \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --memory=1Gi \
  --set-env-vars="RENDER_HANDLER_URL=https://evics-render-worker-xyz.run.app"
```

### 6. Update Phone App to Use New Async Endpoint
```typescript
// mobile/lib/api.ts
export async function generateProductVideoAsync(affiliateCode: string, payload: any) {
  const res = await fetch(`${API_BASE}/api/affiliate/product-video/generate-async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ affiliateCode, ...payload })
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
  return res.json(); // { jobId, status: 'QUEUED', statusUrl }
}

// Start polling
const job = await generateProductVideoAsync(affiliateCode, {...});
let pollCount = 0;
const poller = setInterval(async () => {
  const status = await fetch(`${API_BASE}${job.statusUrl}`).then(r => r.json());
  if (status.status === 'COMPLETE') {
    clearInterval(poller);
    updateVideoGallery(status.videoUrl);
  } else if (status.status === 'ERROR' || status.status === 'FAILED') {
    clearInterval(poller);
    showError(status.error);
  }
  pollCount++;
  if (pollCount > 1800) { // 30 min timeout
    clearInterval(poller);
    showError('Render timeout');
  }
}, 5000); // Poll every 5 sec
```

---

## Testing Checklist

- [ ] Cloud Tasks queue created with correct retry policy.
- [ ] Render worker service deployed and responding to `/health`.
- [ ] Render worker can call HeyGen API and poll until complete.
- [ ] Job records created/updated in Firestore.
- [ ] `POST /api/affiliate/product-video/generate-async` returns 202.
- [ ] `GET /api/affiliate/product-video/status/{jobId}` returns QUEUED → IN_PROGRESS → COMPLETE.
- [ ] Video archived to GCS during render completion.
- [ ] Failed renders trigger retries (Cloud Tasks retry policy).
- [ ] Queue stats endpoint shows queue depth.
- [ ] Phone app polls status and updates gallery on completion.
- [ ] Load test: 100 concurrent video requests → all queue successfully, no blocking.

---

## Expected Impact

- **HTTP Response Time:** <100ms (was 1-3 min blocking).
- **Concurrent Users:** 100 → 1,000 (HeyGen API rate limit becomes the bottleneck, not platform).
- **Memory Per Instance:** Stays constant (no pending promises hoarding memory).
- **Cost:** Slight increase (Cloud Tasks $0.40/million ops; negligible).
- **Reliability:** Retries automatic; failed renders don't lose work.

