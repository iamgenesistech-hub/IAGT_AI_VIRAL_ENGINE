'use strict';

/**
 * EVICS Scraper Control Plane
 * HTTP API + background runner for the EVICS scraper pipeline.
 *
 * Endpoints:
 *   POST /api/scraper/jobs               — submit a new scrape job
 *   GET  /api/scraper/jobs               — list recent jobs (admin)
 *   GET  /api/scraper/jobs/:jobId        — get job status + result
 *   POST /api/scraper/jobs/:jobId/cancel — cancel a queued job
 *   GET  /api/scraper/results            — normalized intelligence records
 *   GET  /api/scraper/intelligence       — scored + ranked opportunities
 *   GET  /api/scraper/allowed-domains    — list scraping-allowed domains
 */

const { createEvicsScraperJobStore } = require('./evicsScraperJobStore');
const { executeScraperJob } = require('./evicsScraperWorker');
const { normalizeScraperResult } = require('./evicsScraperNormalizer');
const { rankOpportunities, buildCompetitorAlerts } = require('./evicsIntelligenceScoring');

const RESULTS_STORE = []; // In-memory normalized results (max 2000, GCS-backed via caller)
const MAX_RESULTS = 2000;

function createEvicsScraperControlPlane(options = {}) {
  const jobStore = options.jobStore || createEvicsScraperJobStore();
  const logger = options.logger || console;
  const onResult = typeof options.onResult === 'function' ? options.onResult : null;

  // ── Background Runner ────────────────────────────────────────────────────
  let runnerActive = false;
  let runnerTimer = null;

  async function processNextJob() {
    const candidates = jobStore.listQueued(1);
    if (!candidates.length) return;
    const job = candidates[0];

    let running = null;
    try {
      running = jobStore.transition(job.id, jobStore.JOB_STATUS.RUNNING, {
        attempts: job.attempts + 1,
      });
      if (!running) return;

      const raw = await executeScraperJob(running);
      const normalized = normalizeScraperResult(raw);

      RESULTS_STORE.unshift({ jobId: running.id, ...normalized });
      while (RESULTS_STORE.length > MAX_RESULTS) RESULTS_STORE.pop();

      jobStore.transition(running.id, jobStore.JOB_STATUS.COMPLETED, { result: normalized });

      if (onResult) {
        try { await onResult(normalized, running); } catch (e) {
          logger.warn('[ScraperRunner] onResult callback error:', e.message);
        }
      }

      logger.log(`[ScraperRunner] ✅ Job ${running.id} completed — signalQuality=${normalized.signalQuality} category=${normalized.category}`);
    } catch (err) {
      if (running) {
        const shouldRetry = running.attempts < running.maxAttempts;
        if (shouldRetry) {
          // Requeue: transition back to queued by lowering priority
          try {
            jobStore.transition(running.id, jobStore.JOB_STATUS.FAILED, { error: err.message });
          } catch { /* already terminal */ }
          logger.warn(`[ScraperRunner] Job ${running.id} failed (attempt ${running.attempts}/${running.maxAttempts}): ${err.message}`);
        } else {
          try {
            jobStore.transition(running.id, jobStore.JOB_STATUS.FAILED, {
              error: `Scrape failed after ${running.attempts} attempt(s): ${err.message}`,
            });
          } catch { /* already terminal */ }
          logger.warn(`[ScraperRunner] Job ${running.id} permanently failed: ${err.message}`);
        }
      }
    }
  }

  function startRunner(intervalMs = 3000) {
    if (runnerActive) return;
    runnerActive = true;
    jobStore.recoverStalledJobs(10);
    runnerTimer = setInterval(() => {
      processNextJob().catch((e) => logger.error('[ScraperRunner] Tick error:', e.message));
    }, Math.max(1000, Number(intervalMs) || 3000));
    if (runnerTimer && typeof runnerTimer.unref === 'function') runnerTimer.unref();
    logger.log('[ScraperRunner] Started — processing queued scrape jobs every', intervalMs, 'ms');
  }

  function stopRunner() {
    runnerActive = false;
    if (runnerTimer) clearInterval(runnerTimer);
    runnerTimer = null;
  }

  // ── Route Registration ────────────────────────────────────────────────────
  function registerRoutes(app) {
    // POST /api/scraper/jobs — submit a scrape job
    app.post('/api/scraper/jobs', (req, res) => {
      try {
        const { url, source, category, affiliateCode, priority, idempotencyKey, maxAttempts } = req.body || {};
        const { job, replayed } = jobStore.createJob({ url, source, category, affiliateCode, priority, idempotencyKey, maxAttempts });
        return res.status(replayed ? 200 : 202).json({
          success: true,
          replayed,
          jobId: job.id,
          status: job.status,
          statusUrl: `/api/scraper/jobs/${encodeURIComponent(job.id)}`,
        });
      } catch (err) {
        return res.status(err.status || 500).json({ success: false, error: err.message });
      }
    });

    // GET /api/scraper/jobs — list recent jobs
    app.get('/api/scraper/jobs', (req, res) => {
      try {
        const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
        const status = String(req.query.status || '').trim().toLowerCase() || null;
        const jobs = status ? jobStore.listByStatus(status, limit) : jobStore.listAll(limit);
        return res.json({ success: true, jobs, count: jobs.length });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    // GET /api/scraper/jobs/:jobId — get job by ID
    app.get('/api/scraper/jobs/:jobId', (req, res) => {
      const job = jobStore.getById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
      return res.json({ success: true, job });
    });

    // POST /api/scraper/jobs/:jobId/cancel — cancel a queued job
    app.post('/api/scraper/jobs/:jobId/cancel', (req, res) => {
      try {
        const job = jobStore.getById(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
        if (jobStore.TERMINAL.has(job.status)) {
          return res.status(409).json({ success: false, error: `Cannot cancel terminal job (${job.status})` });
        }
        const updated = jobStore.transition(job.id, jobStore.JOB_STATUS.CANCELLED, { eventDetail: 'Cancelled via API' });
        return res.json({ success: true, job: updated });
      } catch (err) {
        return res.status(err.status || 500).json({ success: false, error: err.message });
      }
    });

    // GET /api/scraper/results — normalized intelligence records
    app.get('/api/scraper/results', (req, res) => {
      const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 50));
      const category = String(req.query.category || '').trim().toLowerCase() || null;
      let results = RESULTS_STORE;
      if (category) results = results.filter((r) => String(r.category || '').toLowerCase() === category);
      return res.json({ success: true, results: results.slice(0, limit), count: results.length });
    });

    // GET /api/scraper/intelligence — scored + ranked opportunities with competitor alerts
    app.get('/api/scraper/intelligence', (req, res) => {
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const minScore = Math.max(0, Math.min(100, parseInt(req.query.minScore, 10) || 0));
      const category = String(req.query.category || '').trim().toLowerCase() || null;
      const ranked = rankOpportunities(RESULTS_STORE, { limit, minScore, category });
      const competitorAlerts = buildCompetitorAlerts(ranked, 50);
      return res.json({
        success: true,
        ranked,
        competitorAlerts,
        topScore: ranked[0]?.scores?.composite || null,
        topTier: ranked[0]?.tier || null,
        count: ranked.length,
      });
    });

    // GET /api/scraper/allowed-domains — list allowlisted domains
    app.get('/api/scraper/allowed-domains', (_req, res) => {
      return res.json({ success: true, domains: [...jobStore.ALLOWED_SOURCE_DOMAINS].sort() });
    });

    // GET /api/scraper/runner/stats — runner health
    app.get('/api/scraper/runner/stats', (_req, res) => {
      return res.json({
        success: true,
        runnerActive,
        queuedJobs: jobStore.listQueued(200).length,
        recentResultsCount: RESULTS_STORE.length,
      });
    });

    logger.log('✅ [EVICS] Scraper control-plane routes registered at /api/scraper/*');
  }

  return {
    jobStore,
    startRunner,
    stopRunner,
    registerRoutes,
    getResults: () => RESULTS_STORE.slice(),
  };
}

module.exports = { createEvicsScraperControlPlane };
