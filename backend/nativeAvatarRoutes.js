'use strict';

const { createNativeAvatarJobStore, JOB_STATUS } = require('./nativeAvatarJobStore');
const { buildProviderRouter } = require('./nativeAvatarProviders');

function makeCorrelationId(req) {
  const headerId = String(req.headers['x-correlation-id'] || '').trim();
  if (headerId) return headerId.slice(0, 128);
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAffiliateCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);
}

function requiredString(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    const error = new Error(`${fieldName} is required`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function logEvent(level, message, context = {}) {
  const payload = {
    ts: new Date().toISOString(),
    subsystem: 'native-avatar',
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function registerNativeAvatarRoutes(app, deps = {}) {
  const jobStore = deps.jobStore || createNativeAvatarJobStore();
  const providerRouter = deps.providerRouter || buildProviderRouter({
    createHeyGenJob: deps.createHeyGenJob,
    createEvicsNativeJob: deps.createEvicsNativeJob,
  });
  const enqueueJob = typeof deps.enqueueJob === 'function' ? deps.enqueueJob : null;
  const getWorkerStats = typeof deps.getWorkerStats === 'function' ? deps.getWorkerStats : (() => null);

  async function submitJob(input = {}, correlationId = null) {
    const affiliateCode = normalizeAffiliateCode(requiredString(input.affiliateCode, 'affiliateCode'));
    const idempotencyKey = String(input.idempotencyKey || '').trim().slice(0, 128);
    const provider = String(input.provider || '').trim().toLowerCase() || 'auto';
    const photoUrl = requiredString(input.photoUrl, 'photoUrl');
    const voiceFileUrl = requiredString(input.voiceFileUrl, 'voiceFileUrl');
    const correlation = String(correlationId || input.correlationId || '').trim() || `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    if (idempotencyKey) {
      const existing = jobStore.getByIdempotencyKey(idempotencyKey, affiliateCode);
      // Only replay jobs that are still active (queued/processing). If the prior job is
      // terminal (completed/failed/cancelled) treat this as a fresh creation — the user
      // may have uploaded new photo, voice, or attire and expects a brand-new avatar.
      if (existing && !TERMINAL_STATUSES.has(existing.status)) {
        return { replayed: true, job: existing, correlationId: correlation };
      }
    }

    const created = jobStore.createJob({
      idempotencyKey: idempotencyKey || null,
      correlationId: correlation,
      affiliateCode,
      provider,
      input: {
        name: String(input.name || '').trim() || 'EVICS Affiliate Avatar',
        photoUrl,
        voiceFileUrl,
        voiceCloneId: String(input.voiceCloneId || '').trim() || null,
        voiceId: String(input.voiceId || '').trim() || null,
        attire: input.attire && typeof input.attire === 'object' ? input.attire : null,
      },
      metadata: {
        requestedBy: String(input.requestedBy || '').trim() || 'phone-app',
        source: String(input.source || '').trim() || 'evics',
        requestId: String(input.requestId || '').trim() || null,
      },
    });

    const providerRun = await providerRouter.submit({
      id: created.id,
      affiliateCode,
      provider,
      input: created.input,
      metadata: created.metadata,
      correlationId: correlation,
    });

    const next = jobStore.transition(created.id, JOB_STATUS.PREPROCESSING, {
      provider: providerRun.provider,
      providerRun: {
        runId: providerRun.runId || null,
        externalReference: providerRun.externalReference || null,
        acceptedAt: new Date().toISOString(),
        message: providerRun.message || null,
      },
      attempts: 1,
      eventDetail: `Provider accepted via ${providerRun.provider}`,
    });

    if (enqueueJob) enqueueJob(next.id);

    return { replayed: false, job: next, correlationId: correlation };
  }

  app.post('/api/native-avatar/jobs', async (req, res) => {
    const correlationId = makeCorrelationId(req);
    try {
      const submission = await submitJob({
        ...(req.body || {}),
      }, correlationId);

      if (submission.replayed) {
        const existing = submission.job;
        logEvent('info', 'Idempotent native-avatar job replayed', {
          correlationId,
          affiliateCode: existing.affiliateCode,
          jobId: existing.id,
          provider: existing.provider,
        });
        return res.status(200).json({
          success: true,
          replayed: true,
          job: existing,
          correlationId,
        });
      }

      logEvent('info', 'Native-avatar job accepted', {
        correlationId,
        affiliateCode: submission.job.affiliateCode,
        jobId: submission.job.id,
        provider: submission.job.provider,
      });

      return res.status(202).json({
        success: true,
        jobId: submission.job.id,
        correlationId,
        status: submission.job.status,
        provider: submission.job.provider,
        statusUrl: `/api/native-avatar/jobs/${encodeURIComponent(submission.job.id)}?affiliateCode=${encodeURIComponent(submission.job.affiliateCode)}`,
        cancelUrl: `/api/native-avatar/jobs/${encodeURIComponent(submission.job.id)}/cancel`,
      });
    } catch (error) {
      logEvent('error', 'Native-avatar job create failed', {
        correlationId,
        error: error.message,
      });
      return res.status(error.status || 500).json({ success: false, error: error.message, correlationId });
    }
  });

  app.get('/api/native-avatar/jobs/:jobId', (req, res) => {
    const correlationId = makeCorrelationId(req);
    try {
      const affiliateCode = normalizeAffiliateCode(requiredString(req.query.affiliateCode, 'affiliateCode'));
      const job = jobStore.getById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found', correlationId });
      if (String(job.affiliateCode || '') !== affiliateCode) {
        return res.status(403).json({ success: false, error: 'Job belongs to a different affiliate account', correlationId });
      }
      return res.json({ success: true, job, correlationId });
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, error: error.message, correlationId });
    }
  });

  app.get('/api/native-avatar/jobs/:jobId/result', (req, res) => {
    const correlationId = makeCorrelationId(req);
    try {
      const affiliateCode = normalizeAffiliateCode(requiredString(req.query.affiliateCode, 'affiliateCode'));
      const job = jobStore.getById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found', correlationId });
      if (String(job.affiliateCode || '') !== affiliateCode) {
        return res.status(403).json({ success: false, error: 'Job belongs to a different affiliate account', correlationId });
      }
      if (!job.result) {
        return res.status(409).json({
          success: false,
          error: `Job result is unavailable while status is "${job.status}"`,
          status: job.status,
          correlationId,
        });
      }
      return res.json({ success: true, result: job.result, status: job.status, correlationId });
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, error: error.message, correlationId });
    }
  });

  app.post('/api/native-avatar/jobs/:jobId/cancel', (req, res) => {
    const correlationId = makeCorrelationId(req);
    try {
      const affiliateCode = normalizeAffiliateCode(requiredString(req.body && req.body.affiliateCode, 'affiliateCode'));
      const job = jobStore.getById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found', correlationId });
      if (String(job.affiliateCode || '') !== affiliateCode) {
        return res.status(403).json({ success: false, error: 'Job belongs to a different affiliate account', correlationId });
      }
      if (job.status === JOB_STATUS.COMPLETED || job.status === JOB_STATUS.FAILED || job.status === JOB_STATUS.CANCELLED) {
        return res.status(409).json({ success: false, error: `Cannot cancel terminal job (${job.status})`, correlationId });
      }
      const updated = jobStore.transition(job.id, JOB_STATUS.CANCELLED, {
        eventDetail: 'Cancelled by affiliate request',
      });
      return res.json({ success: true, job: updated, correlationId });
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, error: error.message, correlationId });
    }
  });

  // Internal callback endpoint for provider workers/webhooks.
  app.post('/api/native-avatar/jobs/:jobId/events/provider-complete', (req, res) => {
    const correlationId = makeCorrelationId(req);
    try {
      const requiredToken = String(process.env.NATIVE_AVATAR_WEBHOOK_TOKEN || '').trim();
      const providedToken = String(req.headers['x-evics-webhook-token'] || '').trim();
      if (requiredToken && providedToken !== requiredToken) {
        return res.status(401).json({ success: false, error: 'Invalid webhook token', correlationId });
      }

      const job = jobStore.getById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found', correlationId });
      if (job.status === JOB_STATUS.CANCELLED) {
        return res.status(409).json({ success: false, error: 'Cancelled job cannot be completed', correlationId });
      }

      const body = req.body || {};
      const outcome = String(body.outcome || '').trim().toLowerCase() || 'completed';
      if (outcome === 'failed') {
        const failed = jobStore.transition(job.id, JOB_STATUS.FAILED, {
          error: String(body.error || 'Provider execution failed').trim(),
          eventDetail: 'Provider callback marked job as failed',
        });
        return res.json({ success: true, job: failed, correlationId });
      }

      let progressed = job;
      if (progressed.status === JOB_STATUS.PREPROCESSING) {
        progressed = jobStore.transition(job.id, JOB_STATUS.RENDERING, {
          eventDetail: 'Provider callback advanced job to rendering',
        });
      }
      if (progressed.status === JOB_STATUS.RENDERING) {
        progressed = jobStore.transition(job.id, JOB_STATUS.POSTPROCESSING, {
          eventDetail: 'Provider callback advanced job to postprocessing',
        });
      }
      const completed = jobStore.transition(job.id, JOB_STATUS.COMPLETED, {
        result: {
          avatarId: String(body.avatarId || '').trim() || null,
          previewVideoUrl: String(body.previewVideoUrl || '').trim() || null,
          avatarPreviewImageUrl: String(body.avatarPreviewImageUrl || '').trim() || null,
          providerPayload: body.providerPayload && typeof body.providerPayload === 'object' ? body.providerPayload : null,
        },
        error: null,
        eventDetail: 'Provider callback marked job as completed',
      });
      return res.json({ success: true, job: completed, correlationId });
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, error: error.message, correlationId });
    }
  });

  app.get('/api/native-avatar/jobs', (req, res) => {
    const correlationId = makeCorrelationId(req);
    try {
      const affiliateCode = normalizeAffiliateCode(requiredString(req.query.affiliateCode, 'affiliateCode'));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const jobs = jobStore.listByAffiliate(affiliateCode, limit);
      return res.json({ success: true, jobs, count: jobs.length, correlationId });
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, error: error.message, correlationId });
    }
  });

  app.get('/api/native-avatar/worker/stats', (_req, res) => {
    const stats = getWorkerStats();
    res.json({ success: true, stats });
  });

  console.log('✅ [EVICS] Native avatar side-build routes registered at /api/native-avatar/*');

  return {
    jobStore,
    providerRouter,
    submitJob,
  };
}

module.exports = {
  registerNativeAvatarRoutes,
};

