/**
 * productBgRemover.js — EVICS Product Background Removal Engine
 *
 * Removes white/solid backgrounds from Shopify product images before video render.
 * Successful results are cached in data/processed-images/manifest.json.
 * Passthrough results are deliberately not cached because provider availability can change.
 *
 * Priority order:
 *   0. Local Sharp        — instant, zero-cost, works for white/solid mockups
 *   1. REMOVE_BG_API_KEY  — remove.bg
 *   2. CLIPDROP_API_KEY   — ClipDrop
 *   3. Passthrough        — original URL returned for this request only
 */

'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const CACHE_DIR = path.join(__dirname, '../data/processed-images');
const CACHE_MANIFEST = path.join(CACHE_DIR, 'manifest.json');
const PROCESSED_URL_PREFIX = '/processed-images';

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(CACHE_MANIFEST, 'utf8')); } catch { return {}; }
}

function saveManifest(manifest) {
  ensureCacheDir();
  fs.writeFileSync(CACHE_MANIFEST, JSON.stringify(manifest, null, 2));
}

function urlHash(url) {
  return crypto.createHash('md5').update(String(url || '')).digest('hex');
}

function downloadToBuffer(imageUrl, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const proto = imageUrl.startsWith('https') ? https : http;
    const req = proto.get(imageUrl, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadToBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`Download failed: ${res.statusCode}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
    req.on('error', reject);
  });
}

function postMultipart(url, fields, fileField, fileBuffer, filename, mimeType, headers = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const boundary = '----EVICSBoundary' + Date.now();
    const parts = [];
    for (const [key, value] of Object.entries(fields)) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`);
    }

    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(parts.join('')),
      Buffer.from(fileHeader),
      fileBuffer,
      Buffer.from(fileFooter)
    ]);

    const urlObj = new URL(url);
    const proto = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      timeout: timeoutMs
    };

    const req = proto.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function tryLocalSharpRemoval(imageUrl, hash) {
  let sharp;
  try { sharp = require('sharp'); } catch { return null; }

  try {
    const imgBuf = await downloadToBuffer(imageUrl);
    const image = sharp(imgBuf);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data);
    const channels = info.channels;
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (r > 240 && g > 240 && b > 240) pixels[i + 3] = 0;
    }

    const width = info.width;
    const height = info.height;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * channels;
        if (pixels[idx + 3] !== 255) continue;
        const north = ((y - 1) * width + x) * channels;
        const south = ((y + 1) * width + x) * channels;
        const east = (y * width + (x + 1)) * channels;
        const west = (y * width + (x - 1)) * channels;
        if (pixels[north + 3] === 0 || pixels[south + 3] === 0 || pixels[east + 3] === 0 || pixels[west + 3] === 0) {
          pixels[idx + 3] = 128;
        }
      }
    }

    const resultBuf = await sharp(Buffer.from(pixels), {
      raw: { width, height, channels }
    }).png().toBuffer();

    const filename = `${hash}.png`;
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, filename), resultBuf);
    console.log(`[BgRemover] Local sharp removal OK: ${filename}`);
    return { processedUrl: `${PROCESSED_URL_PREFIX}/${filename}`, method: 'local-sharp' };
  } catch (error) {
    console.warn('[BgRemover] Local sharp removal failed:', error.message);
    return null;
  }
}

async function tryRemoveBg(imageUrl, hash) {
  const apiKey = String(process.env.REMOVE_BG_API_KEY || '').trim();
  if (!apiKey) return null;

  try {
    const imgBuf = await downloadToBuffer(imageUrl);
    const result = await postMultipart(
      'https://api.remove.bg/v1.0/removebg',
      { size: 'auto', format: 'png' },
      'image_file',
      imgBuf,
      'product.jpg',
      'image/jpeg',
      { 'X-Api-Key': apiKey }
    );

    if (result.status !== 200) {
      console.warn(`[BgRemover] remove.bg HTTP ${result.status}:`, result.buffer.toString().slice(0, 200));
      return null;
    }

    const filename = `${hash}.png`;
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, filename), result.buffer);
    console.log(`[BgRemover] remove.bg removal OK: ${filename}`);
    return { processedUrl: `${PROCESSED_URL_PREFIX}/${filename}`, method: 'remove.bg' };
  } catch (error) {
    console.warn('[BgRemover] remove.bg error:', error.message);
    return null;
  }
}

async function tryClipDrop(imageUrl, hash) {
  const apiKey = String(process.env.CLIPDROP_API_KEY || '').trim();
  if (!apiKey) return null;

  try {
    const imgBuf = await downloadToBuffer(imageUrl);
    const result = await postMultipart(
      'https://clipdrop-api.co/remove-background/v1',
      {},
      'image_file',
      imgBuf,
      'product.jpg',
      'image/jpeg',
      { 'x-api-key': apiKey }
    );

    if (result.status !== 200) {
      console.warn(`[BgRemover] ClipDrop HTTP ${result.status}:`, result.buffer.toString().slice(0, 200));
      return null;
    }

    const filename = `${hash}.png`;
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, filename), result.buffer);
    console.log(`[BgRemover] ClipDrop removal OK: ${filename}`);
    return { processedUrl: `${PROCESSED_URL_PREFIX}/${filename}`, method: 'clipdrop' };
  } catch (error) {
    console.warn('[BgRemover] ClipDrop error:', error.message);
    return null;
  }
}

function isUsableCachedResult(entry) {
  if (!entry || entry.method === 'passthrough' || !entry.processedUrl) return false;
  if (!String(entry.processedUrl).startsWith(`${PROCESSED_URL_PREFIX}/`)) return true;
  const filename = path.basename(entry.processedUrl);
  return fs.existsSync(path.join(CACHE_DIR, filename));
}

async function removeBackground(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { success: false, error: 'No image URL provided', processedUrl: null };
  }

  ensureCacheDir();
  const manifest = loadManifest();
  const hash = urlHash(imageUrl);
  const cached = manifest[hash];

  if (isUsableCachedResult(cached)) {
    return {
      success: true,
      processedUrl: cached.processedUrl,
      method: cached.method,
      fromCache: true
    };
  }

  if (cached) {
    delete manifest[hash];
    saveManifest(manifest);
  }

  let result = await tryLocalSharpRemoval(imageUrl, hash);
  if (!result) result = await tryRemoveBg(imageUrl, hash);
  if (!result) result = await tryClipDrop(imageUrl, hash);

  if (!result) {
    console.warn(`[BgRemover] All providers failed for ${imageUrl}; returning uncached passthrough.`);
    return {
      success: true,
      processedUrl: imageUrl,
      method: 'passthrough',
      fromCache: false
    };
  }

  manifest[hash] = {
    originalUrl: imageUrl,
    processedUrl: result.processedUrl,
    method: result.method,
    processedAt: new Date().toISOString()
  };
  saveManifest(manifest);

  return { success: true, processedUrl: result.processedUrl, method: result.method, fromCache: false };
}

async function batchPreprocessProducts(products = []) {
  const results = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    const imageUrl = product.imageUrl || product.image_url || product.image || product.thumbnail;
    if (!imageUrl) {
      skipped++;
      results.push({ id: product.id, skipped: true, reason: 'no image url' });
      continue;
    }

    try {
      const result = await removeBackground(imageUrl);
      if (result.fromCache) skipped++;
      else processed++;
      results.push({ id: product.id, title: product.title, ...result });
    } catch (error) {
      errors++;
      results.push({ id: product.id, error: error.message });
    }

    if (!results[results.length - 1]?.fromCache) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`[BgRemover] Batch done: ${processed} processed, ${skipped} skipped/cached, ${errors} errors`);
  return results;
}

function getCacheManifest() {
  return loadManifest();
}

function getCachedUrl(imageUrl) {
  if (!imageUrl) return null;
  const entry = loadManifest()[urlHash(imageUrl)];
  return isUsableCachedResult(entry) ? entry.processedUrl : null;
}

function getCacheStats() {
  const entries = Object.values(loadManifest());
  const byMethod = {};
  for (const entry of entries) {
    byMethod[entry.method] = (byMethod[entry.method] || 0) + 1;
  }
  return {
    total: entries.length,
    byMethod,
    cacheDir: CACHE_DIR
  };
}

module.exports = {
  removeBackground,
  batchPreprocessProducts,
  getCacheManifest,
  getCachedUrl,
  getCacheStats,
  CACHE_DIR,
  PROCESSED_URL_PREFIX
};
