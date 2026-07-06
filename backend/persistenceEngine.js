// backend/persistenceEngine.js
// GCS-backed persistence for EVICS — stores affiliate avatar requests and product
// video records in Cloud Storage so state survives Cloud Run redeploys.
// Uses the GCP metadata server for auth (no credentials needed on Cloud Run).
'use strict';

const GCS_BUCKET = process.env.GCS_BUCKET || 'evics-storage-evics-api';

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

module.exports = { gcsRead, gcsWrite, gcsDownloadUrl };
