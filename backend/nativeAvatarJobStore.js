'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'generated', 'native_avatar_jobs.json');

const JOB_STATUS = Object.freeze({
  QUEUED: 'queued',
  PREPROCESSING: 'preprocessing',
  RENDERING: 'rendering',
  POSTPROCESSING: 'postprocessing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

const TERMINAL_STATUSES = new Set([JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED]);

const ALLOWED_TRANSITIONS = new Map([
  [JOB_STATUS.QUEUED, new Set([JOB_STATUS.PREPROCESSING, JOB_STATUS.CANCELLED, JOB_STATUS.FAILED])],
  [JOB_STATUS.PREPROCESSING, new Set([JOB_STATUS.RENDERING, JOB_STATUS.CANCELLED, JOB_STATUS.FAILED])],
  [JOB_STATUS.RENDERING, new Set([JOB_STATUS.POSTPROCESSING, JOB_STATUS.CANCELLED, JOB_STATUS.FAILED])],
  [JOB_STATUS.POSTPROCESSING, new Set([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED, JOB_STATUS.FAILED])],
  [JOB_STATUS.COMPLETED, new Set([])],
  [JOB_STATUS.FAILED, new Set([])],
  [JOB_STATUS.CANCELLED, new Set([])],
]);

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeWriteJson(filePath, value) {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, JSON.stringify(Array.isArray(value) ? value : [], null, 2), 'utf8');
}

function makeJobId() {
  if (typeof crypto.randomUUID === 'function') {
    return `nav_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  }
  return `nav_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createNativeAvatarJobStore(options = {}) {
  const filePath = String(options.filePath || DEFAULT_STORE_PATH);
  let records = safeReadJson(filePath);

  function flush() {
    safeWriteJson(filePath, records);
  }

  function findIndex(jobId) {
    return records.findIndex((job) => String(job.id || '') === String(jobId || ''));
  }

  function createJob(payload = {}) {
    const id = payload.id || makeJobId();
    const createdAt = nowIso();
    const job = {
      id,
      idempotencyKey: payload.idempotencyKey || null,
      correlationId: payload.correlationId || null,
      provider: payload.provider || 'heygen',
      affiliateCode: payload.affiliateCode || null,
      status: JOB_STATUS.QUEUED,
      input: payload.input || {},
      metadata: payload.metadata || {},
      attempts: 0,
      createdAt,
      updatedAt: createdAt,
      events: [
        {
          type: 'job_created',
          status: JOB_STATUS.QUEUED,
          timestamp: createdAt,
          detail: 'Job accepted and queued.',
        },
      ],
      result: null,
      error: null,
    };
    records.unshift(job);
    records = records.slice(0, 2000);
    flush();
    return job;
  }

  function getById(jobId) {
    const idx = findIndex(jobId);
    return idx === -1 ? null : records[idx];
  }

  function getByIdempotencyKey(idempotencyKey, affiliateCode) {
    const key = String(idempotencyKey || '').trim();
    if (!key) return null;
    return records.find((job) => (
      String(job.idempotencyKey || '') === key
      && String(job.affiliateCode || '') === String(affiliateCode || '')
    )) || null;
  }

  function assertTransition(currentStatus, nextStatus) {
    const allowed = ALLOWED_TRANSITIONS.get(currentStatus);
    if (!allowed || !allowed.has(nextStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} -> ${nextStatus}`);
    }
  }

  function transition(jobId, nextStatus, patch = {}) {
    const idx = findIndex(jobId);
    if (idx === -1) return null;
    const current = records[idx];
    const normalized = String(nextStatus || '').trim().toLowerCase();
    if (!ALLOWED_TRANSITIONS.has(normalized)) {
      throw new Error(`Unknown status: ${nextStatus}`);
    }
    assertTransition(current.status, normalized);
    const updatedAt = nowIso();
    const attempts = Number.isFinite(patch.attempts) ? patch.attempts : current.attempts;
    const merged = {
      ...current,
      ...patch,
      attempts,
      status: normalized,
      updatedAt,
      completedAt: TERMINAL_STATUSES.has(normalized) ? (patch.completedAt || updatedAt) : (current.completedAt || null),
    };
    merged.events = Array.isArray(current.events) ? current.events.slice() : [];
    merged.events.push({
      type: 'status_transition',
      status: normalized,
      timestamp: updatedAt,
      detail: patch.eventDetail || `Transitioned to ${normalized}`,
    });
    records[idx] = merged;
    flush();
    return merged;
  }

  function appendEvent(jobId, eventType, detail, extra = {}) {
    const idx = findIndex(jobId);
    if (idx === -1) return null;
    const job = records[idx];
    const event = {
      type: String(eventType || 'event'),
      timestamp: nowIso(),
      detail: String(detail || ''),
      ...extra,
    };
    const nextEvents = Array.isArray(job.events) ? job.events.concat(event) : [event];
    const updated = { ...job, events: nextEvents, updatedAt: nowIso() };
    records[idx] = updated;
    flush();
    return updated;
  }

  function listByAffiliate(affiliateCode, limit = 20) {
    const normalized = String(affiliateCode || '').trim().toUpperCase();
    if (!normalized) return [];
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    return records
      .filter((job) => String(job.affiliateCode || '').toUpperCase() === normalized)
      .slice(0, safeLimit);
  }

  function listByStatus(status, limit = 20) {
    const normalized = String(status || '').trim().toLowerCase();
    if (!normalized || !ALLOWED_TRANSITIONS.has(normalized)) return [];
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
    return records
      .filter((job) => String(job.status || '').toLowerCase() === normalized)
      .slice(0, safeLimit);
  }

  function patchJob(jobId, patch = {}) {
    const idx = findIndex(jobId);
    if (idx === -1) return null;
    const current = records[idx];
    const updated = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
    };
    records[idx] = updated;
    flush();
    return updated;
  }

  // Mark PREPROCESSING/RENDERING/POSTPROCESSING jobs as FAILED if they have been
  // stuck in a non-terminal state for longer than timeoutMinutes. Also handles
  // restart recovery: any job still in an active processing state when the
  // server starts up is considered stalled.
  function recoverStalledJobs(timeoutMinutes = 15) {
    const active = [JOB_STATUS.PREPROCESSING, JOB_STATUS.RENDERING, JOB_STATUS.POSTPROCESSING];
    const cutoff = Date.now() - timeoutMinutes * 60 * 1000;
    let count = 0;
    for (const job of records) {
      if (!active.includes(job.status)) continue;
      const updatedMs = new Date(job.updatedAt || job.createdAt || 0).getTime();
      if (updatedMs < cutoff) {
        try {
          jobStore.transition(job.id, JOB_STATUS.FAILED, {
            error: `Job timed out after ${timeoutMinutes} minutes while in "${job.status}" status. The provider did not return a result in time. Please try creating your avatar again.`,
            eventDetail: `Auto-failed by timeout sweep (${timeoutMinutes} min limit)`,
          });
          count += 1;
        } catch (_err) {
          // Already terminal or invalid transition — ignore.
        }
      }
    }
    if (count > 0) {
      console.log(`[NativeAvatarJobStore] Auto-failed ${count} stalled job(s) older than ${timeoutMinutes} minutes.`);
    }
    return count;
  }

  const jobStore = {
    JOB_STATUS,
    TERMINAL_STATUSES,
    createJob,
    getById,
    getByIdempotencyKey,
    transition,
    appendEvent,
    listByAffiliate,
    listByStatus,
    patchJob,
    recoverStalledJobs,
  };
  return jobStore;
}

module.exports = {
  JOB_STATUS,
  createNativeAvatarJobStore,
};
