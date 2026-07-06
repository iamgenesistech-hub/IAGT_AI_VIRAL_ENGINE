# Phase 1 Implementation Checklist: Cloud Tasks Queue System

**Status:** Code Complete ✓  
**Next:** Integration & Deployment  

---

## Files Created (Syntax Verified ✓)

### 1. `backend/videoQueueEngine.js`
- Cloud Tasks client initialization
- `enqueueRenderJob(jobId, renderPayload)` — enqueue tasks
- `getQueueStats()` — monitor queue depth
- `configureQueueRetryPolicy()` — setup exponential backoff
- `pauseQueue()` / `resumeQueue()` — maintenance ops
- `purgeQueue()` — emergency purge

**Size:** 6.2 KB | **Status:** ✓ Syntax OK

### 2. `backend/renderWorker.js`
- Express app listening on separate port (4176)
- `POST /api/internal/render-worker` — task handler
- Full render pipeline: validate → HeyGen call → poll → archive → update
- Governance checks on completion
- Cost tracking integration
- Worker metrics endpoint

**Size:** 11.3 KB | **Status:** ✓ Syntax OK

### 3. `backend/videoQueueRoutes.js`
- `POST /api/affiliate/product-video/generate-async` — enqueue (returns 202)
- `GET /api/affiliate/product-video/status/:jobId` — check status (lightweight)
- `GET /api/affiliate/product-video/list` — list affiliate's jobs
- `GET /api/admin/queue-stats` — queue health monitoring

**Size:** 9.3 KB | **Status:** ✓ Syntax OK

### 4. Updated `package.json`
- Added `@google-cloud/tasks: ^4.2.0`

**Status:** ✓ Updated

---

## Integration Steps (Next)

### Step 1: Install Dependency
```bash
npm install @google-cloud/tasks
```

### Step 2: Create Cloud Tasks Queue (GCP)
```bash
gcloud tasks queues create evics-render-queue \
  --location=us-central1 \
  --max-dispatches-per-second=1 \
  --max-concurrent-dispatches=10 \
  --max-retry-attempts=5 \
  --min-backoff=10s \
  --max-backoff=600s \
  --log-sampling-ratio=0.1
```

### Step 3: Update `backend/server.js`
Add these imports at top:
```javascript
const { registerVideoQueueRoutes } = require('./videoQueueRoutes');
```

Mount routes after other registrations:
```javascript
// After governance routes, billing routes, etc.
registerVideoQueueRoutes(app, { logger: console });
```

### Step 4: Create Render Worker Dockerfile
```dockerfile
# Dockerfile.worker
FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY backend/ ./backend/
COPY utils/ ./utils/
COPY .env .env

EXPOSE 4176

ENV NODE_ENV=production
CMD ["node", "backend/renderWorker.js"]
```

### Step 5: Configure Environment Variables
Add to `.env`:
```bash
# Cloud Tasks Configuration
GCP_PROJECT=your-gcp-project-id
QUEUE_REGION=us-central1
RENDER_HANDLER_URL=https://evics-render-worker-{hash}.run.app
RENDER_WORKER_SA=evics-render-worker@your-project.iam.gserviceaccount.com

# Render Worker Configuration
HEYGEN_POLL_INTERVAL=10000        # 10 seconds between polls
HEYGEN_MAX_POLL_ATTEMPTS=180      # Max 30 min (180 * 10s)
WORKER_NAME=render-worker-us-central1
```

### Step 6: Service Account Setup
Create service account for render worker:
```bash
# Create service account
gcloud iam service-accounts create evics-render-worker \
  --display-name="EVICS Render Worker" \
  --project=your-project-id

# Grant Cloud Tasks permissions (to dequeue)
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:evics-render-worker@your-project-id.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.taskDeleter"

# Grant Firestore permissions
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:evics-render-worker@your-project-id.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant GCS permissions
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:evics-render-worker@your-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"
```

### Step 7: Deploy Render Worker
```bash
# Build Docker image
docker build -f Dockerfile.worker -t gcr.io/your-project/evics-render-worker:latest .

# Push to Container Registry
docker push gcr.io/your-project/evics-render-worker:latest

# Deploy to Cloud Run
gcloud run deploy evics-render-worker \
  --image=gcr.io/your-project/evics-render-worker:latest \
  --platform=managed \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --max-instances=20 \
  --min-instances=2 \
  --set-env-vars="HEYGEN_POLL_INTERVAL=10000,GCP_PROJECT=your-project" \
  --service-account=evics-render-worker@your-project.iam.gserviceaccount.com \
  --no-allow-unauthenticated
```

**Important:** Note the deployed URL (e.g., `https://evics-render-worker-xyz.run.app`).  
Update `.env` with this URL as `RENDER_HANDLER_URL`.

### Step 8: Deploy Main API with Queue Routes
```bash
gcloud run deploy evics-api \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars="RENDER_HANDLER_URL=https://evics-render-worker-xyz.run.app,GCP_PROJECT=your-project" \
  --service-account=evics-api@your-project.iam.gserviceaccount.com
```

### Step 9: Update Phone App API Client
In `mobile/lib/api.ts`:
```typescript
export async function generateProductVideoAsync(
  affiliateCode: string,
  payload: any
): Promise<{ jobId: string; status: string; statusUrl: string }> {
  const res = await fetch(`${API_BASE}/api/affiliate/product-video/generate-async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ affiliateCode, ...payload })
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
  return res.json();
}

export async function checkVideoStatus(
  jobId: string,
  affiliateCode: string
): Promise<any> {
  const res = await fetch(
    `${API_BASE}/api/affiliate/product-video/status/${jobId}?affiliateCode=${affiliateCode}`
  );
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json();
}
```

### Step 10: Update Phone App UI
In `mobile/app/(tabs)/products.tsx`:
```typescript
async function handleGenerateVideo() {
  setIsGenerating(true);
  try {
    const response = await generateProductVideoAsync(activeAffiliateCode, {
      avatarId: selectedAvatar.id,
      productId: selectedProduct.id,
      script: scriptContent,
      backgroundUrl: selectedBackground
    });

    const { jobId, statusUrl } = response;
    setRenderJobId(jobId);
    setRenderStatus('QUEUED');

    // Poll status every 5 seconds
    const poller = setInterval(async () => {
      try {
        const status = await checkVideoStatus(jobId, activeAffiliateCode);
        setRenderStatus(status.status);

        if (status.status === 'COMPLETE') {
          clearInterval(poller);
          addVideoToGallery({
            id: jobId,
            url: status.videoUrl,
            title: selectedProduct.name,
            createdAt: status.completedAt
          });
          showToast('Video complete!');
          setIsGenerating(false);
        } else if (status.status === 'ERROR' || status.status === 'FAILED') {
          clearInterval(poller);
          showError(`Render failed: ${status.error}`);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error('Status check failed:', err);
      }
    }, 5000); // Poll every 5 sec

    // Timeout after 1 hour
    setTimeout(() => {
      clearInterval(poller);
      showError('Render timeout (1 hour exceeded)');
      setIsGenerating(false);
    }, 3600000);

  } catch (err) {
    showError(`Failed to start render: ${err.message}`);
    setIsGenerating(false);
  }
}
```

---

## Testing Checklist

- [ ] `npm install` completes without errors
- [ ] `node --check backend/videoQueueEngine.js` passes
- [ ] `node --check backend/renderWorker.js` passes
- [ ] `node --check backend/videoQueueRoutes.js` passes
- [ ] Cloud Tasks queue created with correct retry policy
- [ ] Render worker Docker image builds
- [ ] Render worker deployed to Cloud Run
- [ ] Render worker `/health` endpoint returns 200
- [ ] Main API deployed with queue routes mounted
- [ ] `POST /api/affiliate/product-video/generate-async` returns 202
- [ ] Job record appears in Firestore immediately after enqueue
- [ ] Task appears in Cloud Tasks queue
- [ ] Render worker receives task from queue
- [ ] Render worker calls HeyGen API
- [ ] HeyGen render completes and video archived to GCS
- [ ] Job record status updated to COMPLETE with videoUrl
- [ ] `GET /api/affiliate/product-video/status/{jobId}` returns COMPLETE
- [ ] `GET /api/admin/queue-stats` returns non-empty queue stats
- [ ] Phone app successfully polls job status and displays video
- [ ] Load test: 100 concurrent enqueue requests → all queued
- [ ] Load test: 100 concurrent status checks → all <50ms latency
- [ ] Failed renders trigger Cloud Tasks retry (verify in Cloud Tasks UI)

---

## Monitoring Setup

### Cloud Monitoring Dashboards
Create dashboard to track:
- Queue depth (tasks waiting)
- Task dispatch rate
- Render success/failure rate
- Avg render duration (ms)
- Render worker memory/CPU
- Render worker error rate

### Logs
Structured logs from renderWorker:
- `[Worker] Task received: {jobId}`
- `[Worker] HeyGen poll #N: {status}`
- `[Worker] ✓ Job complete: {jobId} ({renderDurationMs}ms)`
- `[Worker] ✗ Error rendering {jobId}: {error}`

### Alerts
Set up Cloud Monitoring alerts:
- Queue depth > 500 → alert
- Render failure rate > 5% → alert
- Render worker instance count > 10 → alert
- Worker memory > 90% → scale up
- HeyGen API errors > 10/min → page oncall

---

## Rollback Plan

If queue system causes issues:

1. **Stop accepting new renders:**
   ```bash
   curl -X POST https://evics-api.run.app/api/admin/queue/pause
   ```

2. **Pause Cloud Tasks queue:**
   ```bash
   gcloud tasks queues pause evics-render-queue --location=us-central1
   ```

3. **Scale down render worker:**
   ```bash
   gcloud run services update evics-render-worker \
     --max-instances=0 --region=us-central1
   ```

4. **Revert main API to old generate endpoint** (if kept alive as fallback)

5. **Investigate in logs:**
   ```bash
   gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=evics-render-worker" --limit=100
   ```

---

## Success Criteria

✓ Phase 1 Complete when:
- Queue system handling 100+ concurrent enqueue requests
- Render times still 1-3 min (no degradation)
- Latency of status checks < 50ms
- No cross-account data leaks
- Failure rate < 1%
- Admin can monitor queue depth from dashboard
- Load test passes with 500 concurrent users

**Estimated Timeline:**
- Integration & deployment: 1-2 days
- Testing & debugging: 1 day
- Production rollout: 1 day
- **Total: 3-4 days**

---

## Phase 2 (Next) Preview
Once Phase 1 is stable, begin Phase 2 (Redis cache):
- Reduces memory bloat from in-memory caches
- Enables horizontal scaling of main API
- Expected to support 2,500 concurrent users
- Timeline: 1-2 days

