'use strict';

/**
 * EVICS Scraper Job Store
 * Persistent (JSON-file) storage for scrape jobs.
 * Job lifecycle: queued → running → completed | failed | cancelled
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'generated', 'scraper_jobs.json');

const JOB_STATUS = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

const TERMINAL = new Set([JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED]);

const ALLOWED_TRANSITIONS = new Map([
  [JOB_STATUS.QUEUED,     new Set([JOB_STATUS.RUNNING, JOB_STATUS.CANCELLED, JOB_STATUS.FAILED])],
  [JOB_STATUS.RUNNING,    new Set([JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED])],
  [JOB_STATUS.COMPLETED,  new Set([])],
  [JOB_STATUS.FAILED,     new Set([])],
  [JOB_STATUS.CANCELLED,  new Set([])],
]);

// Source allowlist — only approved domains can be scraped
const ALLOWED_SOURCE_DOMAINS = new Set([
  'amazon.com', 'www.amazon.com',
  'tiktok.com', 'www.tiktok.com',
  'instagram.com', 'www.instagram.com',
  'facebook.com', 'www.facebook.com',
  'youtube.com', 'www.youtube.com',
  'shopify.com',
  'iamgenesistech.myshopify.com',
  'pinterest.com', 'www.pinterest.com',
  'reddit.com', 'www.reddit.com',
]);

function isAllowedDomain(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_SOURCE_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

function makeJobId() {
  if (typeof crypto.randomUUID === 'function') {
    return `scrape_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }
  return `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() { return new Date().toISOString(); }

function safeRead(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function safeWrite(filePath, value) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(Array.isArray(value) ? value : [], null, 2), 'utf8');
}

function createEvicsScraperJobStore(options = {}) {
  const filePath = String(options.filePath || DEFAULT_STORE_PATH);
  let records = safeRead(filePath);

  function flush() { safeWrite(filePath, records); }
  function findIdx(jobId) { return records.findIndex((j) => j.id === String(jobId || '')); }

  function createJob(input = {}) {
    const url = String(input.url || '').trim();
    if (!url) throw Object.assign(new Error('url is required'), { status: 400 });
    if (!isAllowedDomain(url)) {
      throw Object.assign(
        new Error(`Domain not on EVICS scraper allowlist. Only approved sources may be scraped.`),
        { status: 403 },
      );
    }
    const idempotencyKey = String(input.idempotencyKey || '').trim().slice(0, 128);
    if (idempotencyKey) {
      const existing = records.find((j) => j.idempotencyKey === idempotencyKey);
      if (existing) return { job: existing, replayed: true };
    }
    const id = makeJobId();
    const now = nowIso();
    const job = {
      id,
      idempotencyKey: idempotencyKey || null,
      url,
      source: String(input.source || 'manual').trim(),
      category: String(input.category || 'general').trim(), // competitor | trending | product | general
      affiliateCode: String(input.affiliateCode || '').trim().toUpperCase() || null,
      priority: Number.isFinite(input.priority) ? Math.max(0, Math.min(10, input.priority)) : 5,
      status: JOB_STATUS.QUEUED,
      attempts: 0,
      maxAttempts: Math.max(1, Math.min(5, Number(input.maxAttempts || 3))),
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    records.unshift(job);
    records = records.slice(0, 5000);
    flush();
    return { job, replayed: false };
  }

  function getById(jobId) {
    const idx = findIdx(jobId);
    return idx === -1 ? null : records[idx];
  }

  function transition(jobId, nextStatus, patch = {}) {
    const idx = findIdx(jobId);
    if (idx === -1) return null;
    const current = records[idx];
    const allowed = ALLOWED_TRANSITIONS.get(current.status);
    if (!allowed || !allowed.has(nextStatus)) {
      throw new Error(`Invalid scraper job transition: ${current.status} → ${nextStatus}`);
    }
    const now = nowIso();
    records[idx] = {
      ...current,
      ...patch,
      status: nextStatus,
      updatedAt: now,
      completedAt: TERMINAL.has(nextStatus) ? (patch.completedAt || now) : (current.completedAt || null),
      attempts: Number.isFinite(patch.attempts) ? patch.attempts : current.attempts,
    };
    flush();
    return records[idx];
  }

  function listQueued(limit = 10) {
    const safe = Math.max(1, Math.min(100, Number(limit) || 10));
    return records
      .filter((j) => j.status === JOB_STATUS.QUEUED)
      .sort((a, b) => (b.priority || 5) - (a.priority || 5))
      .slice(0, safe);
  }

  function listByStatus(status, limit = 50) {
    const safe = Math.max(1, Math.min(200, Number(limit) || 50));
    return records.filter((j) => j.status === String(status || '').toLowerCase()).slice(0, safe);
  }

  function listAll(limit = 100) {
    return records.slice(0, Math.max(1, Math.min(500, Number(limit) || 100)));
  }

  // Fail stuck RUNNING jobs older than timeoutMinutes
  function recoverStalledJobs(timeoutMinutes = 10) {
    const cutoff = Date.now() - timeoutMinutes * 60 * 1000;
    let count = 0;
    for (const job of records) {
      if (job.status !== JOB_STATUS.RUNNING) continue;
      if (new Date(job.updatedAt || job.createdAt || 0).getTime() < cutoff) {
        try {
          transition(job.id, JOB_STATUS.FAILED, {
            error: `Scrape job timed out after ${timeoutMinutes} minutes in RUNNING state.`,
            attempts: job.attempts,
          });
          count += 1;
        } catch { /* ignore */ }
      }
    }
    if (count > 0) console.log(`[ScraperJobStore] Auto-failed ${count} stalled scrape job(s).`);
    return count;
  }

  return {
    JOB_STATUS,
    TERMINAL,
    ALLOWED_SOURCE_DOMAINS,
    isAllowedDomain,
    createJob,
    getById,
    transition,
    listQueued,
    listByStatus,
    listAll,
    recoverStalledJobs,
  };
}

module.exports = { createEvicsScraperJobStore, JOB_STATUS: Object.freeze(JOB_STATUS) };
