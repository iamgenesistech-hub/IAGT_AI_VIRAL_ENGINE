'use strict';

/**
 * durableVideoStorage.js
 *
 * Push a locally-rendered mp4 to Supabase Storage so the public URL
 * survives Cloud Run instance recycling / redeploys (the container's
 * /app/processed-videos directory is ephemeral tmpfs — every new
 * revision wipes it and any previously-published link 404s).
 *
 * Bucket name is DURABLE_VIDEO_STORAGE_BUCKET (default: evics-renders).
 * Bucket must be public-read; the helper attempts to create it public
 * on first use if it doesn't exist.
 *
 * Returns { publicUrl, storagePath, bucket } on success,
 *         { error, code } on failure.
 * Callers should fall back to the local URL on error and log the reason.
 */

const fs = require('fs');
const path = require('path');
const supabase = require('./SupabaseConnector');

const DEFAULT_BUCKET = process.env.DURABLE_VIDEO_STORAGE_BUCKET || 'evics-renders';

async function ensureBucket(bucketName) {
  try {
    if (!supabase || !supabase.storage) return { ok: false, code: 'STORAGE_UNAVAILABLE' };
    const { data: list, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      // listBuckets requires service role; if unavailable, assume caller pre-created it
      console.warn('[durableVideoStorage] listBuckets failed (assuming bucket exists):', listErr.message);
      return { ok: true, precreated: true };
    }
    const exists = Array.isArray(list) && list.some((b) => b.name === bucketName);
    if (exists) return { ok: true };
    const { error: createErr } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 500 * 1024 * 1024
    });
    if (createErr) {
      console.warn('[durableVideoStorage] createBucket failed:', createErr.message);
      // Bucket may already exist under a different owner or was just created concurrently
      return { ok: true, note: `createBucket warning: ${createErr.message}` };
    }
    return { ok: true, created: true };
  } catch (e) {
    return { ok: false, code: 'ENSURE_BUCKET_EXCEPTION', error: e.message };
  }
}

async function uploadProcessedVideo({ localPath, renderId, videoId, bucket }) {
  if (!supabase || !supabase.storage) {
    return { error: 'Supabase storage client unavailable', code: 'STORAGE_UNAVAILABLE' };
  }
  if (!localPath || !fs.existsSync(localPath)) {
    return { error: `Local file missing: ${localPath}`, code: 'LOCAL_FILE_MISSING' };
  }
  const bucketName = bucket || DEFAULT_BUCKET;
  const ensured = await ensureBucket(bucketName);
  if (!ensured.ok) {
    return { error: `Bucket unavailable: ${ensured.code}`, code: ensured.code };
  }

  const filename = path.basename(localPath);
  const rawName = videoId || filename;
  // Always end with .mp4 so browsers, download prompts, and CDNs pick the
  // right handler. pp.stampedVideoId is passed in without an extension.
  const safeName = /\.mp4$/i.test(rawName) ? rawName : `${rawName}.mp4`;
  const storagePath = renderId
    ? `renders/${renderId}/${safeName}`
    : `renders/anonymous/${safeName}`;

  try {
    const buffer = fs.readFileSync(localPath);
    const { error: upErr } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: 'video/mp4',
        cacheControl: '31536000',
        upsert: true
      });
    if (upErr) {
      return { error: `Upload failed: ${upErr.message}`, code: 'UPLOAD_FAILED' };
    }
    const { data: pub } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
    if (!pub || !pub.publicUrl) {
      return { error: 'getPublicUrl returned empty URL', code: 'PUBLIC_URL_EMPTY' };
    }
    return {
      publicUrl: pub.publicUrl,
      storagePath,
      bucket: bucketName,
      bytes: buffer.length
    };
  } catch (e) {
    return { error: e.message || String(e), code: 'UPLOAD_EXCEPTION' };
  }
}

module.exports = { uploadProcessedVideo, ensureBucket, DEFAULT_BUCKET };
