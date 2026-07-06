/**
 * videoQueueEngine.js — Cloud Tasks Queue for Video Rendering
 * 
 * Decouples video rendering from HTTP request/response by using Google Cloud Tasks.
 * Video requests enqueue jobs and return 202 Accepted immediately.
 * Background worker pulls jobs and executes HeyGen renders.
 */

const { CloudTasksClient } = require('@google-cloud/tasks');

// ── Configuration ──
const PROJECT = process.env.GCP_PROJECT || 'your-project-id';
const QUEUE_NAME = 'evics-render-queue';
const QUEUE_REGION = process.env.QUEUE_REGION || 'us-central1';
const RENDER_HANDLER_URL = process.env.RENDER_HANDLER_URL || 
  'https://evics-render-worker-default.run.app';

// ── Cloud Tasks Client ──
let _tasksClient = null;

function getTasksClient() {
  if (!_tasksClient) {
    _tasksClient = new CloudTasksClient();
  }
  return _tasksClient;
}

/**
 * Enqueue a video render job to Cloud Tasks.
 * 
 * @param {string} jobId - unique job identifier
 * @param {object} renderPayload - render parameters
 *   - affiliateCode: string
 *   - avatarId: string
 *   - productId: string
 *   - script: string (what avatar will say)
 *   - backgroundUrl: string (optional)
 * @returns {Promise<{taskName: string, taskId: string}>}
 */
async function enqueueRenderJob(jobId, renderPayload) {
  try {
    const client = getTasksClient();
    const parent = client.queuePath(PROJECT, QUEUE_REGION, QUEUE_NAME);

    // Payload to send to render worker
    const taskPayload = {
      jobId,
      ...renderPayload,
      enqueuedAt: new Date().toISOString()
    };

    // Create task
    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url: `${RENDER_HANDLER_URL}/api/internal/render-worker`,
        headers: { 'Content-Type': 'application/json' },
        // Cloud Tasks sends body as base64; worker expects JSON
        body: Buffer.from(JSON.stringify(taskPayload)).toString('base64'),
        // Use OIDC token so render worker can verify request authenticity
        oidcToken: {
          serviceAccountEmail: process.env.RENDER_WORKER_SA ||
            'evics-render-worker@your-project.iam.gserviceaccount.com'
        }
      }
    };

    // Create the task
    const [response] = await client.createTask({ parent, task });

    console.log(
      `[VideoQueue] Enqueued render job: ${jobId}`,
      `Task: ${response.name}`
    );

    return {
      taskName: response.name,
      taskId: jobId
    };
  } catch (err) {
    console.error('[VideoQueue] Enqueue failed:', err.message);
    throw err;
  }
}

/**
 * Get queue statistics (depth, age of oldest task, rate limits).
 * Used for monitoring and admin dashboard.
 * 
 * @returns {Promise<{queueSize: number, oldestTaskAge: string|null, ...}>}
 */
async function getQueueStats() {
  try {
    const client = getTasksClient();
    const parent = client.queuePath(PROJECT, QUEUE_REGION, QUEUE_NAME);

    const [queue] = await client.getQueue({ name: parent });

    return {
      queueSize: queue.stats?.tasksCount || 0,
      oldestTaskLeaseExpireTime: queue.stats?.oldestTaskLeaseExpireTime || null,
      rateLimitPerSecond: queue.rateLimits?.maxDispatchesPerSecond || 100,
      maxConcurrentDispatches: queue.rateLimits?.maxConcurrentDispatches || 10
    };
  } catch (err) {
    console.error('[VideoQueue] Failed to fetch stats:', err.message);
    // Return safe defaults if Cloud Tasks is unavailable
    return {
      queueSize: 0,
      oldestTaskLeaseExpireTime: null,
      rateLimitPerSecond: 0,
      error: err.message
    };
  }
}

/**
 * Configure queue retry policy (called once at startup).
 * Sets up exponential backoff: 10s → 100s → 1000s (max 600s),
 * with up to 5 retry attempts.
 * 
 * @returns {Promise<void>}
 */
async function configureQueueRetryPolicy() {
  try {
    const client = getTasksClient();
    const parent = client.queuePath(PROJECT, QUEUE_REGION, QUEUE_NAME);

    const queue = {
      name: parent,
      retryConfig: {
        maxAttempts: 5,
        minBackoff: { seconds: 10 },
        maxBackoff: { seconds: 600 }, // 10 minutes
        maxDoublings: 4
      }
    };

    await client.updateQueue({ queue });
    console.log('[VideoQueue] Configured retry policy (5x, 10s→600s backoff)');
  } catch (err) {
    console.error('[VideoQueue] Failed to configure retry:', err.message);
    // Non-fatal; queue may already have correct config
  }
}

/**
 * Pause the queue (during maintenance, high API errors, etc.).
 * Tasks remain queued but are not dispatched.
 * 
 * @returns {Promise<void>}
 */
async function pauseQueue() {
  try {
    const client = getTasksClient();
    const name = client.queuePath(PROJECT, QUEUE_REGION, QUEUE_NAME);
    await client.pauseQueue({ name });
    console.log('[VideoQueue] Queue paused');
  } catch (err) {
    console.error('[VideoQueue] Pause failed:', err.message);
    throw err;
  }
}

/**
 * Resume the queue after pause.
 * 
 * @returns {Promise<void>}
 */
async function resumeQueue() {
  try {
    const client = getTasksClient();
    const name = client.queuePath(PROJECT, QUEUE_REGION, QUEUE_NAME);
    await client.resumeQueue({ name });
    console.log('[VideoQueue] Queue resumed');
  } catch (err) {
    console.error('[VideoQueue] Resume failed:', err.message);
    throw err;
  }
}

/**
 * Purge all tasks from the queue (DESTRUCTIVE — use with caution).
 * Used during testing or emergency situations.
 * 
 * @returns {Promise<void>}
 */
async function purgeQueue() {
  try {
    const client = getTasksClient();
    const name = client.queuePath(PROJECT, QUEUE_REGION, QUEUE_NAME);
    await client.purgeQueue({ name });
    console.warn('[VideoQueue] Queue purged (all tasks deleted)');
  } catch (err) {
    console.error('[VideoQueue] Purge failed:', err.message);
    throw err;
  }
}

module.exports = {
  enqueueRenderJob,
  getQueueStats,
  configureQueueRetryPolicy,
  pauseQueue,
  resumeQueue,
  purgeQueue,
  // Configuration exports
  PROJECT,
  QUEUE_NAME,
  QUEUE_REGION,
  RENDER_HANDLER_URL
};
