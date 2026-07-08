'use strict';

const { JOB_STATUS } = require('./nativeAvatarJobStore');

function createNativeAvatarWorker(options = {}) {
  const {
    jobStore,
    processJob,
    pollIntervalMs = 800,
    maxConcurrency = 1,
    logger = console,
  } = options;

  if (!jobStore || typeof jobStore.listByStatus !== 'function' || typeof jobStore.transition !== 'function') {
    throw new Error('createNativeAvatarWorker requires a compatible jobStore.');
  }
  if (typeof processJob !== 'function') {
    throw new Error('createNativeAvatarWorker requires processJob(job).');
  }

  const activeJobs = new Set();
  let timer = null;
  let running = false;
  let sweepTick = 0;

  async function execute(jobId) {
    if (activeJobs.has(jobId)) return;
    activeJobs.add(jobId);
    try {
      let job = jobStore.getById(jobId);
      if (!job || job.status !== JOB_STATUS.PREPROCESSING) return;

      job = jobStore.transition(jobId, JOB_STATUS.RENDERING, {
        eventDetail: 'Worker started provider execution',
      });

      const result = await processJob(job);

      job = jobStore.transition(jobId, JOB_STATUS.POSTPROCESSING, {
        eventDetail: 'Worker completed provider execution, finalizing result',
      });

      jobStore.transition(jobId, JOB_STATUS.COMPLETED, {
        result: result || null,
        error: null,
        eventDetail: 'Worker finalized completed avatar job',
      });
    } catch (error) {
      try {
        const current = jobStore.getById(jobId);
        if (current && current.status !== JOB_STATUS.CANCELLED && current.status !== JOB_STATUS.FAILED) {
          jobStore.transition(jobId, JOB_STATUS.FAILED, {
            error: error.message,
            eventDetail: 'Worker failed during provider execution',
          });
        }
      } catch (transitionErr) {
        logger.error('[NativeAvatarWorker] Failed to transition errored job', transitionErr && transitionErr.message ? transitionErr.message : transitionErr);
      }
      logger.error('[NativeAvatarWorker] Job execution failed', error && error.message ? error.message : error);
    } finally {
      activeJobs.delete(jobId);
    }
  }

  async function tick() {
    if (!running) return;
    sweepTick += 1;
    // Run stalled-job sweep every 60 ticks (~48 s at 800 ms interval)
    if (sweepTick % 60 === 0 && typeof jobStore.recoverStalledJobs === 'function') {
      jobStore.recoverStalledJobs(15);
    }
    if (activeJobs.size >= maxConcurrency) return;
    const capacity = Math.max(0, maxConcurrency - activeJobs.size);
    if (capacity <= 0) return;
    const candidates = jobStore.listByStatus(JOB_STATUS.PREPROCESSING, capacity);
    for (const candidate of candidates) {
      execute(candidate.id);
    }
  }

  function start() {
    if (running) return;
    running = true;
    // Restart recovery: immediately fail jobs that were stuck in processing states
    // from before this server instance started.
    if (typeof jobStore.recoverStalledJobs === 'function') {
      try {
        jobStore.recoverStalledJobs(15);
      } catch (err) {
        logger.error('[NativeAvatarWorker] Startup recovery sweep failed', err && err.message ? err.message : err);
      }
    }
    timer = setInterval(() => {
      tick().catch((err) => {
        logger.error('[NativeAvatarWorker] Tick failed', err && err.message ? err.message : err);
      });
    }, Math.max(250, Number(pollIntervalMs) || 800));
    if (timer && typeof timer.unref === 'function') timer.unref();
    logger.log(`[NativeAvatarWorker] Started (interval=${pollIntervalMs}ms, concurrency=${maxConcurrency})`);
  }

  function stop() {
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
  }

  function getStats() {
    return {
      running,
      activeJobs: activeJobs.size,
      maxConcurrency,
    };
  }

  return {
    start,
    stop,
    tick,
    getStats,
  };
}

module.exports = {
  createNativeAvatarWorker,
};

