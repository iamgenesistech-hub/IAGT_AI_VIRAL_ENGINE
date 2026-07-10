// backend/persistenceEngine.js
// GCS-backed persistence for EVICS — stores affiliate avatar requests and product
// video records in Cloud Storage so state survives Cloud Run redeploys.
// Uses the GCP metadata server for auth (no credentials needed on Cloud Run).
'use strict';

const fs = require('fs');
const path = require('path');
const cacheEngine = require('./cacheEngine');

const GCS_BUCKET = process.env.GCS_BUCKET || 'evics-storage-evics-api';
const VIDEO_JOBS_GCS_PATH = 'evics-data/video_jobs.json';
const LOCAL_VIDEO_JOBS_PATH = path.join(__dirname, '..', 'generated', 'local_video_jobs.json');
const VIDEO_JOB_TTL_SECONDS = 24 * 60 * 60;
const _jobStore = new Map();
let _localLoaded = false;
let _cacheInitPromise = null;

function normalizeAffiliateCode(value) {
  return String(value || '').trim().toUpperCase();
}

function jobKey(jobId, affiliateCode) {
  return `${normalizeAffiliateCode(affiliateCode)}::${String(jobId || '').trim()}`;
}

function videoJobCacheKey(jobId, affiliateCode) {
  const owner = normalizeAffiliateCode(affiliateCode);
  const id = String(jobId || '').trim();
  return `video-job:${owner}:${id}`;
}

function videoJobIndexCacheKey(affiliateCode) {
  return `video-job-index:${normalizeAffiliateCode(affiliateCode)}`;
}

async function ensureCacheReady() {
  if (_cacheInitPromise) return _cacheInitPromise;
  _cacheInitPromise = cacheEngine.initCacheEngine().catch((err) => {
    console.warn(`[Persist] Cache init warning: ${err.message}`);
  });
  return _cacheInitPromise;
}

async function cacheVideoJobRecord(record) {
  const affiliateCode = normalizeAffiliateCode(record?.affiliateCode);
  const jobId = String(record?.jobId || '').trim();
  if (!affiliateCode || !jobId) return;

  await ensureCacheReady();
  const cacheKey = videoJobCacheKey(jobId, affiliateCode);
  await cacheEngine.setJson(cacheKey, { ...record }, VIDEO_JOB_TTL_SECONDS);

  const indexKey = videoJobIndexCacheKey(affiliateCode);
  const currentIndex = await cacheEngine.getJson(indexKey).catch(() => null);
  const nextIndex = Array.isArray(currentIndex) ? currentIndex.filter((id) => id !== jobId) : [];
  nextIndex.unshift(jobId);
  await cacheEngine.setJson(indexKey, nextIndex.slice(0, 1000), VIDEO_JOB_TTL_SECONDS);
}

function ensureLocalDir() {
  const dir = path.dirname(LOCAL_VIDEO_JOBS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadLocalJobs() {
  if (_localLoaded) return;
  _localLoaded = true;
  try {
    if (!fs.existsSync(LOCAL_VIDEO_JOBS_PATH)) return;
    const raw = fs.readFileSync(LOCAL_VIDEO_JOBS_PATH, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return;
    for (const row of parsed) {
      const owner = normalizeAffiliateCode(row?.affiliateCode);
      const id = String(row?.jobId || '').trim();
      if (!owner || !id) continue;
      _jobStore.set(jobKey(id, owner), { ...row, affiliateCode: owner, jobId: id });
    }
  } catch (err) {
    console.warn(`[Persist] Failed loading local jobs: ${err.message}`);
  }
}

function writeLocalJobs() {
  try {
    ensureLocalDir();
    const rows = Array.from(_jobStore.values()).sort((a, b) =>
      String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
    );
    fs.writeFileSync(LOCAL_VIDEO_JOBS_PATH, JSON.stringify(rows, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[Persist] Failed writing local jobs: ${err.message}`);
  }
}

async function syncJobsFromGcs() {
  const rows = await gcsRead(VIDEO_JOBS_GCS_PATH);
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const owner = normalizeAffiliateCode(row?.affiliateCode);
    const id = String(row?.jobId || '').trim();
    if (!owner || !id) continue;
    const key = jobKey(id, owner);
    if (!_jobStore.has(key)) {
      const normalized = { ...row, affiliateCode: owner, jobId: id };
      _jobStore.set(key, normalized);
      await cacheVideoJobRecord(normalized);
    }
  }
  writeLocalJobs();
}

async function flushJobsToGcs() {
  const rows = Array.from(_jobStore.values());
  await gcsWrite(VIDEO_JOBS_GCS_PATH, rows);
}

async function _getToken() {
  try {
    const resp = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.access_token || null;
  } catch {
    return null; // Not on Cloud Run or no network
  }
}

/**
 * Read a JSON object from GCS.
 * Returns the parsed value or null if the object doesn't exist or on any error.
 */
async function gcsRead(gcsPath) {
  const token = await _getToken();
  if (!token) return null;
  try {
    const url = `https://storage.googleapis.com/download/storage/v1/b/${encodeURIComponent(GCS_BUCKET)}/o/${encodeURIComponent(gcsPath)}?alt=media`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000)
    });
    if (resp.status === 404) return null;
    if (!resp.ok) {
      console.warn(`[Persist] GCS read failed ${gcsPath} (${resp.status})`);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.warn(`[Persist] GCS read error ${gcsPath}: ${e.message}`);
    return null;
  }
}

/**
 * Write a JSON object to GCS.
 * Safe to fire-and-forget: catches all errors internally.
 */
async function gcsWrite(gcsPath, data) {
  const token = await _getToken();
  if (!token) return;
  try {
    const body = JSON.stringify(data);
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(GCS_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(gcsPath)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body, 'utf8'))
      },
      body,
      signal: AbortSignal.timeout(10000)
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      console.warn(`[Persist] GCS write failed ${gcsPath} (${resp.status}): ${err.substring(0, 120)}`);
    }
  } catch (e) {
    console.warn(`[Persist] GCS write error ${gcsPath}: ${e.message}`);
  }
}

/**
 * Download a remote URL and upload the content to GCS.
 * Used to archive HeyGen videos (7-day expiry) to permanent GCS storage.
 * Returns "gs://{bucket}/{destGcsPath}" on success, null on any failure.
 */
async function gcsDownloadUrl(sourceUrl, destGcsPath, contentType = 'video/mp4') {
  const token = await _getToken();
  if (!token) return null;
  try {
    const srcResp = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'EVICS-Archiver/1.0' },
      signal: AbortSignal.timeout(120000) // 2-min timeout for large video files
    });
    if (!srcResp.ok) {
      console.warn(`[Persist] Archive download failed ${sourceUrl} (${srcResp.status})`);
      return null;
    }
    const buffer = Buffer.from(await srcResp.arrayBuffer());

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(GCS_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(destGcsPath)}`;
    const upResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': String(buffer.length)
      },
      body: buffer,
      signal: AbortSignal.timeout(120000)
    });
    if (!upResp.ok) {
      const err = await upResp.text().catch(() => '');
      console.warn(`[Persist] Archive upload failed ${destGcsPath} (${upResp.status}): ${err.substring(0, 120)}`);
      return null;
    }
    console.log(`[Persist] GCS archived ${destGcsPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
    return `gs://${GCS_BUCKET}/${destGcsPath}`;
  } catch (e) {
    console.warn(`[Persist] Archive error for ${destGcsPath}: ${e.message}`);
    return null;
  }
}

async function createVideoJob(jobRecord) {
  loadLocalJobs();
  const affiliateCode = normalizeAffiliateCode(jobRecord?.affiliateCode);
  const jobId = String(jobRecord?.jobId || '').trim();
  if (!affiliateCode) throw new Error('createVideoJob requires affiliateCode');
  if (!jobId) throw new Error('createVideoJob requires jobId');

  const nowIso = new Date().toISOString();
  const next = {
    ...jobRecord,
    affiliateCode,
    jobId,
    createdAt: jobRecord.createdAt || nowIso,
    updatedAt: nowIso,
  };
  _jobStore.set(jobKey(jobId, affiliateCode), next);
  await cacheVideoJobRecord(next);
  writeLocalJobs();
  await flushJobsToGcs();
  return next;
}

async function getVideoJob(jobId, affiliateCode) {
  loadLocalJobs();
  const owner = normalizeAffiliateCode(affiliateCode);
  const id = String(jobId || '').trim();
  if (!owner || !id) return null;

  const key = jobKey(id, owner);
  const inMemory = _jobStore.get(key);
  if (inMemory) return { ...inMemory };

  await ensureCacheReady();
  const cached = await cacheEngine.getJson(videoJobCacheKey(id, owner)).catch(() => null);
  if (cached) {
    _jobStore.set(key, { ...cached, affiliateCode: owner, jobId: id });
    return { ...cached, affiliateCode: owner, jobId: id };
  }

  await syncJobsFromGcs();
  const fromCloud = _jobStore.get(key);
  return fromCloud ? { ...fromCloud } : null;
}

async function updateVideoJob(jobId, affiliateCode, patch) {
  const current = await getVideoJob(jobId, affiliateCode);
  if (!current) {
    throw new Error(`Video job not found: ${jobId} (${normalizeAffiliateCode(affiliateCode)})`);
  }
  const nowIso = new Date().toISOString();
  const next = {
    ...current,
    ...(patch || {}),
    jobId: current.jobId,
    affiliateCode: current.affiliateCode,
    updatedAt: nowIso,
  };
  _jobStore.set(jobKey(current.jobId, current.affiliateCode), next);
  await cacheVideoJobRecord(next);
  writeLocalJobs();
  await flushJobsToGcs();
  return next;
}

async function listVideoJobsByAffiliate(affiliateCode, limit = 20, offset = 0) {
  loadLocalJobs();
  const owner = normalizeAffiliateCode(affiliateCode);
  if (!owner) return [];

  await syncJobsFromGcs();
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  await ensureCacheReady();
  const cachedIndex = await cacheEngine.getJson(videoJobIndexCacheKey(owner)).catch(() => null);
  if (Array.isArray(cachedIndex) && cachedIndex.length) {
    const cachedRows = [];
    for (const jobId of cachedIndex) {
      const row = await cacheEngine.getJson(videoJobCacheKey(jobId, owner)).catch(() => null);
      if (!row) continue;
      cachedRows.push({ ...row, affiliateCode: owner, jobId: String(jobId).trim() });
      if (cachedRows.length >= (safeOffset + safeLimit)) break;
    }
    if (cachedRows.length > safeOffset) {
      return cachedRows.slice(safeOffset, safeOffset + safeLimit);
    }
  }

  const rows = Array.from(_jobStore.values())
    .filter((row) => normalizeAffiliateCode(row.affiliateCode) === owner)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  for (const row of rows.slice(0, 1000)) {
    await cacheVideoJobRecord(row);
  }

  return rows.slice(safeOffset, safeOffset + safeLimit).map((row) => ({ ...row }));
}

async function archiveHeyGenVideo(affiliateCode, jobId, sourceUrl) {
  const owner = normalizeAffiliateCode(affiliateCode);
  const id = String(jobId || '').trim();
  if (!owner) throw new Error('archiveHeyGenVideo requires affiliateCode');
  if (!id) throw new Error('archiveHeyGenVideo requires jobId');
  if (!sourceUrl) throw new Error('archiveHeyGenVideo requires sourceUrl');
  return gcsDownloadUrl(sourceUrl, `evics-videos/${owner}/${id}.mp4`, 'video/mp4');
}

/**
 * Delete a GCS object by path.
 * Used to permanently remove archived video files when an affiliate deletes a render.
 * Returns true on success, false if not found or on any error.
 */
async function gcsDelete(gcsPath) {
  const token = await _getToken();
  if (!token) return false;
  try {
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(GCS_BUCKET)}/o/${encodeURIComponent(gcsPath)}`;
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000)
    });
    if (resp.status === 404) {
      console.warn(`[Persist] GCS delete: object not found (${gcsPath}) — skipping.`);
      return false;
    }
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      console.warn(`[Persist] GCS delete failed ${gcsPath} (${resp.status}): ${err.substring(0, 120)}`);
      return false;
    }
    console.log(`[Persist] GCS deleted: ${gcsPath}`);
    return true;
  } catch (e) {
    console.warn(`[Persist] GCS delete error ${gcsPath}: ${e.message}`);
    return false;
  }
}

module.exports = {
  gcsRead,
  gcsWrite,
  gcsDelete,
  gcsDownloadUrl,
  createVideoJob,
  getVideoJob,
  updateVideoJob,
  listVideoJobsByAffiliate,
  archiveHeyGenVideo,
};
