/**
 * productBgRemover.js — EVICS Product Background Removal Engine
 *
 * Removes white/solid backgrounds from Shopify product images before video render.
 * Results are cached permanently in data/processed-images/manifest.json so each
 * product is only processed once across all ad creations.
 *
 * Priority order:
 *   0. Local Sharp    → instant, zero-cost, works for white/solid-bg product mockups
 *   1. REMOVE_BG_API_KEY  → remove.bg (50 free/month, then paid)
 *   2. CLIPDROP_API_KEY   → ClipDrop by Stability AI
 *   3. Passthrough        → original URL returned (cached so it skips on next call)
 *
 * Add REMOVE_BG_API_KEY to Secret Manager for complex/photo backgrounds.
 * Sharp handles the majority of Shopify product mockups (white bg) automatically.
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const https  = require('https');
const http   = require('http');

const CACHE_DIR      = path.join(__dirname, '../data/processed-images');
const CACHE_MANIFEST = path.join(CACHE_DIR, 'manifest.json');
const PROCESSED_URL_PREFIX = '/processed-images'; // served by Express as static

// ── helpers ──────────────────────────────────────────────────────────────────

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

// Raw HTTP download → Buffer (no axios dependency)
function downloadToBuffer(imageUrl, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const proto = imageUrl.startsWith('https') ? https : http;
    const req = proto.get(imageUrl, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadToBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`Download failed: ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
    req.on('error', reject);
  });
}

// Multipart form-data POST without form-data package dependency
function postMultipart(url, fields, fileField, fileBuffer, filename, mimeType, headers = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const boundary = '----EVICSBoundary' + Date.now();
    const parts = [];

    // Text fields
    for (const [k, v] of Object.entries(fields)) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
      );
    }

    // File field
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(parts.join('')),
      Buffer.from(fileHeader),
      fileBuffer,
      Buffer.from(fileFooter)
    ]);

    const urlObj = new URL(url);
    const proto  = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port:     urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path:     urlObj.pathname + urlObj.search,
      method:   'POST',
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      timeout: timeoutMs
    };

    const req = proto.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
      res.on('error', reject);
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── core background removal ───────────────────────────────────────────────────

/**
 * Priority 0 — Local sharp-based white/solid background removal.
 * Works instantly for nearly all Shopify product mockups (white, light-grey, or
 * single-colour backgrounds). Luminance-threshold: pixels with R>240 G>240 B>240
 * become fully transparent. Falls back gracefully if sharp is not installed.
 */
async function tryLocalSharpRemoval(imageUrl, hash) {
  let sharp;
  try { sharp = require('sharp'); } catch { return null; } // sharp not installed → skip

  try {
    const imgBuf = await downloadToBuffer(imageUrl);

    const image = sharp(imgBuf);
    const meta  = await image.metadata();

    // Work in raw RGBA so we can walk every pixel
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels   = new Uint8ClampedArray(data);
    const channels = info.channels; // always 4 after ensureAlpha

    // --- pass 1: mark near-white pixels transparent -------------------------
    // Threshold 240/255 — tight enough to preserve product colours, loose enough
    // to catch grey/cream backgrounds.
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (r > 240 && g > 240 && b > 240) pixels[i + 3] = 0;
    }

    // --- pass 2: feather hard edges (1-px semi-transparent ring) ------------
    const W = info.width, H = info.height;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const idx = (y * W + x) * channels;
        if (pixels[idx + 3] === 255) {
          // Check if any neighbour is transparent
          const n = ((y - 1) * W + x) * channels;
          const s = ((y + 1) * W + x) * channels;
          const e = (y * W + (x + 1)) * channels;
          const w = (y * W + (x - 1)) * channels;
          if (pixels[n + 3] === 0 || pixels[s + 3] === 0 || pixels[e + 3] === 0 || pixels[w + 3] === 0) {
            pixels[idx + 3] = 128; // semi-transparent edge
          }
        }
      }
    }

    const resultBuf = await sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels }
    }).png().toBuffer();

    const filename = `${hash}.png`;
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, filename), resultBuf);
    console.log(`[BgRemover] Local sharp removal OK: ${filename}`);
    return { processedUrl: `${PROCESSED_URL_PREFIX}/${filename}`, method: 'local-sharp' };
  } catch (e) {
    console.warn('[BgRemover] Local sharp removal failed:', e.message);
    return null;
  }
}


  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) return null;

  try {
    const imgBuf = await downloadToBuffer(imageUrl);
    const ext = 'png';
    const result = await postMultipart(
      'https://api.remove.bg/v1.0/removebg',
      { size: 'auto', format: 'png' },
      'image_file',
      imgBuf,
      `product.jpg`,
      'image/jpeg',
      { 'X-Api-Key': apiKey }
    );

    if (result.status !== 200) {
      console.warn(`[BgRemover] remove.bg HTTP ${result.status}:`, result.buffer.toString().slice(0, 200));
      return null;
    }

    const filename = `${hash}.${ext}`;
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, filename), result.buffer);
    return { processedUrl: `${PROCESSED_URL_PREFIX}/${filename}`, method: 'remove.bg' };
  } catch (e) {
    console.warn('[BgRemover] remove.bg error:', e.message);
    return null;
  }
}

async function tryClipDrop(imageUrl, hash) {
  const apiKey = process.env.CLIPDROP_API_KEY;
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
    return { processedUrl: `${PROCESSED_URL_PREFIX}/${filename}`, method: 'clipdrop' };
  } catch (e) {
    console.warn('[BgRemover] ClipDrop error:', e.message);
    return null;
  }
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Remove background from a product image URL.
 * Returns cached result immediately if already processed.
 * @returns {{ success:boolean, processedUrl:string, method:string, fromCache:boolean }}
 */
async function removeBackground(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { success: false, error: 'No image URL provided', processedUrl: null };
  }

  ensureCacheDir();
  const manifest = loadManifest();
  const hash = urlHash(imageUrl);

  // Return from cache if already processed
  if (manifest[hash]) {
    return {
      success: true,
      processedUrl: manifest[hash].processedUrl,
      method: manifest[hash].method,
      fromCache: true
    };
  }

  // Try each provider in priority order
  let result = await tryLocalSharpRemoval(imageUrl, hash);
  if (!result) result = await tryRemoveBg(imageUrl, hash);
  if (!result) result = await tryClipDrop(imageUrl, hash);

  // Passthrough fallback (still cache it so next call is instant)
  if (!result) {
    result = { processedUrl: imageUrl, method: 'passthrough' };
  }

  manifest[hash] = {
    originalUrl:  imageUrl,
    processedUrl: result.processedUrl,
    method:       result.method,
    processedAt:  new Date().toISOString()
  };
  saveManifest(manifest);

  return { success: true, processedUrl: result.processedUrl, method: result.method, fromCache: false };
}

/**
 * Batch pre-process all products from an array.
 * Skips already-cached entries. Rate-limited to avoid API throttling.
 * @param {Array} products — array of product objects with imageUrl/image_url field
 * @returns {Array} results per product
 */
async function batchPreprocessProducts(products = []) {
  const results = [];
  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  for (const product of products) {
    const imageUrl = product.imageUrl || product.image_url || product.image || product.thumbnail;
    if (!imageUrl) { skipped++; results.push({ id: product.id, skipped: true, reason: 'no image url' }); continue; }

    try {
      const r = await removeBackground(imageUrl);
      if (r.fromCache) skipped++;
      else processed++;
      results.push({ id: product.id, title: product.title, ...r });
    } catch (e) {
      errors++;
      results.push({ id: product.id, error: e.message });
    }

    // Rate limit: 300ms between calls when actually processing (not cached)
    if (!results[results.length - 1]?.fromCache) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`[BgRemover] Batch done: ${processed} processed, ${skipped} skipped/cached, ${errors} errors`);
  return results;
}

/**
 * Return the full manifest of processed images.
 */
function getCacheManifest() {
  return loadManifest();
}

/**
 * Get processed URL for a single imageUrl synchronously from cache.
 * Returns null if not cached.
 */
function getCachedUrl(imageUrl) {
  if (!imageUrl) return null;
  const manifest = loadManifest();
  const entry = manifest[urlHash(imageUrl)];
  return entry ? entry.processedUrl : null;
}

/**
 * Stats summary for dashboard display
 */
function getCacheStats() {
  const manifest = loadManifest();
  const entries  = Object.values(manifest);
  const byMethod = {};
  for (const e of entries) {
    byMethod[e.method] = (byMethod[e.method] || 0) + 1;
  }
  return {
    total:    entries.length,
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
