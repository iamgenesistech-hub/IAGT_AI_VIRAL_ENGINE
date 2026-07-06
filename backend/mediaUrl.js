'use strict';

const DEFAULT_GCS_BUCKET = process.env.GCS_BUCKET || 'evics-storage-evics-api';

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getMediaPublicBaseUrl() {
  return normalizeBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL ||
      process.env.MEDIA_CDN_BASE_URL ||
      process.env.GCS_PUBLIC_BASE_URL ||
      process.env.MEDIA_ASSET_BASE_URL ||
      ''
  );
}

function encodeObjectPath(objectPath) {
  return String(objectPath || '')
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function parseStorageReference(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  if (text.startsWith('gs://')) {
    const withoutScheme = text.slice(5);
    const slashIndex = withoutScheme.indexOf('/');
    const bucket = slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex);
    const objectPath = slashIndex === -1 ? '' : withoutScheme.slice(slashIndex + 1);
    return { bucket, objectPath };
  }

  try {
    const url = new URL(text);
    if (url.hostname === 'storage.googleapis.com') {
      const parts = url.pathname.replace(/^\/+/, '').split('/');
      const bucket = parts.shift() || DEFAULT_GCS_BUCKET;
      const objectPath = parts.join('/');
      return { bucket, objectPath };
    }

    if (url.hostname.endsWith('.storage.googleapis.com')) {
      const bucket = url.hostname.replace(/\.storage\.googleapis\.com$/, '');
      return { bucket, objectPath: url.pathname.replace(/^\/+/, '') };
    }
  } catch {
    // Not a URL — caller can treat this as a raw object path.
  }

  return null;
}

function buildPublicMediaUrlFromReference(value, options = {}) {
  const text = String(value || '').trim();
  if (!text) return null;

  if (/^https?:\/\//i.test(text) && !/storage(\.cloud)?\.googleapis\.com/i.test(text)) {
    return text;
  }

  const reference = parseStorageReference(text);
  if (!reference) {
    const bucket = String(options.bucket || DEFAULT_GCS_BUCKET).trim() || DEFAULT_GCS_BUCKET;
    const base = getMediaPublicBaseUrl();
    if (base) {
      return `${base}/${bucket}/${encodeObjectPath(text)}`;
    }
    return options.proxyUrl || text;
  }

  const bucket = String(reference.bucket || options.bucket || DEFAULT_GCS_BUCKET).trim() || DEFAULT_GCS_BUCKET;
  const objectPath = encodeObjectPath(reference.objectPath);
  const base = getMediaPublicBaseUrl();

  if (base) {
    return objectPath ? `${base}/${bucket}/${objectPath}` : `${base}/${bucket}`;
  }

  if (options.proxyUrl) {
    return options.proxyUrl;
  }

  return objectPath
    ? `https://storage.googleapis.com/${bucket}/${objectPath}`
    : `https://storage.googleapis.com/${bucket}`;
}

function buildPublicMediaUrlFromObjectPath(objectPath, options = {}) {
  const bucket = String(options.bucket || DEFAULT_GCS_BUCKET).trim() || DEFAULT_GCS_BUCKET;
  const reference = objectPath ? `gs://${bucket}/${String(objectPath).replace(/^\/+/, '')}` : `gs://${bucket}`;
  return buildPublicMediaUrlFromReference(reference, options);
}

module.exports = {
  buildPublicMediaUrlFromReference,
  buildPublicMediaUrlFromObjectPath,
  getMediaPublicBaseUrl,
  parseStorageReference,
};
