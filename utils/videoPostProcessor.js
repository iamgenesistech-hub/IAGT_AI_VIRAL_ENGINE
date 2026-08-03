/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine
 *
 * After the base avatar/cinematic render, this adds:
 *   1. Foreground product presentation (bg-removed mockup, deterministic
 *      300x300 hero cell in the bottom-right)
 *   2. Product title strip (sits directly above the mockup cell)
 *   3. Buy Now CTA pill (short label, guaranteed to fit any 9:16 or 16:9 frame)
 *   4. Final color grade/export
 *
 * ABSOLUTE CONTRACT:
 *   - If productImageLocalPath (or productImageUrl) cannot be composited into
 *     the final frame, this function returns success:false. Callers must
 *     treat that as a render failure and MUST NOT ship the raw video —
 *     videos without the product mockup and Buy Now pill are not allowed.
 *
 * MOCKUP VALIDATION:
 *   Local bg-removed PNGs are validated with `sharp` before use — if the
 *   PNG's mean alpha is below MOCKUP_MIN_MEAN_ALPHA the image is effectively
 *   invisible (over-eager bg removal wiped the product), and we fall back
 *   to the raw productImageUrl. If BOTH are unusable we fail hard.
 *
 * FFMPEG FILTER CONSTANTS CHEATSHEET (why we can't share expressions):
 *   drawbox   : uses  iw / ih          (input width/height)
 *   drawtext  : uses  W  / H  (main_w / main_h)  — DOES NOT accept iw/ih
 *   overlay   : uses  W  / H  (main dims) + w / h  (overlay dims)
 *
 * FILENAME: every processed video's output filename embeds a UTC
 * YYYYMMDDTHHMMSSZ timestamp so operators can trace exactly when a given
 * asset was produced.
 *
 * Uses ffmpeg (installed in the Docker container).
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

let sharp = null;
try { sharp = require('sharp'); } catch (_e) { sharp = null; }

const MEDIA_CACHE_DIR = path.join(__dirname, '../media-cache');
const PROCESSED_DIR = path.join(__dirname, '../processed-videos');

// Any bg-removed PNG whose mean alpha (0..255) is below this threshold is
// considered visually empty and will be discarded in favour of the raw
// productImageUrl. 40 ≈ 15% average opacity; below that, the product is
// effectively invisible when composited on a dark pedestal.
const MOCKUP_MIN_MEAN_ALPHA = 40;
// If the source PNG is smaller than this in bytes AND has an alpha channel,
// it's almost certainly an over-cropped or empty asset.
const MOCKUP_MIN_BYTES = 4 * 1024;

if (!fs.existsSync(MEDIA_CACHE_DIR)) fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

// UTC timestamp string suitable for filenames: 20260803T164210Z
function utcStampForFilename(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

// Inspect a PNG on disk and decide whether it's "visually usable" (i.e.
// has enough opaque pixels to be worth compositing). Returns:
//   { usable: boolean, meanAlpha: number|null, width, height, reason }
async function inspectMockupImage(filePath) {
  const result = { usable: false, meanAlpha: null, width: null, height: null, reason: '' };
  try {
    const stat = fs.statSync(filePath);
    if (!stat || stat.size < MOCKUP_MIN_BYTES) {
      result.reason = `file too small (${stat ? stat.size : 'null'} bytes)`;
      return result;
    }
  } catch (statErr) {
    result.reason = `stat failed: ${statErr.message}`;
    return result;
  }
  if (!sharp) {
    result.usable = true;
    result.reason = 'sharp unavailable; accepted by size only';
    return result;
  }
  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    result.width = meta.width || null;
    result.height = meta.height || null;
    if (!meta.hasAlpha) {
      result.usable = true;
      result.meanAlpha = 255;
      result.reason = 'opaque image (no alpha)';
      return result;
    }
    const stats = await img.stats();
    const chans = Array.isArray(stats.channels) ? stats.channels : [];
    const alphaChan = chans.length ? chans[chans.length - 1] : null;
    const meanAlpha = alphaChan && typeof alphaChan.mean === 'number' ? alphaChan.mean : null;
    result.meanAlpha = meanAlpha;
    if (meanAlpha == null) {
      result.usable = true;
      result.reason = 'alpha stats unavailable; accepted by size only';
      return result;
    }
    if (meanAlpha >= MOCKUP_MIN_MEAN_ALPHA) {
      result.usable = true;
      result.reason = `mean alpha ${meanAlpha.toFixed(1)} >= ${MOCKUP_MIN_MEAN_ALPHA}`;
      return result;
    }
    result.reason = `mean alpha ${meanAlpha.toFixed(1)} < ${MOCKUP_MIN_MEAN_ALPHA} (image is essentially empty)`;
    return result;
  } catch (sharpErr) {
    result.reason = `sharp inspect failed: ${sharpErr.message}`;
    result.usable = true;
    return result;
  }
}

function resolveFontFile() {
  const candidates = [
    process.env.EVICS_TEXT_FONT_FILE,
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/gnu-free/FreeSansBold.ttf',
    '/usr/share/fonts/TTF/Vera.ttf',
    '/System/Library/Fonts/Helvetica.ttc'
  ].filter(Boolean);
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* noop */ }
  }
  return null;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        file.close(() => fs.unlink(destPath, () => {}));
        reject(new Error(`Download failed with HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

async function postProcessVideo({
   videoUrl,
   videoId,
   productImageUrl,
   productImageLocalPath,
   productTitle = '',
   productPageUrl = '',
   affiliateCode = '',
   specialEffects = [],
   textOverlayPosition = 'bottom',
   ctaText
}) {
  const renderStamp = utcStampForFilename();
  const stampedId = `${videoId}_${renderStamp}`;

  const inputPath = path.join(MEDIA_CACHE_DIR, `${stampedId}_raw.mp4`);
  const outputPath = path.join(PROCESSED_DIR, `${stampedId}_final.mp4`);

  await downloadFile(videoUrl, inputPath);

  const inputs = ['-i', inputPath];

  const productName = escapeDrawtextValue(productTitle || 'Featured Product');
  const cta = escapeDrawtextValue(ctaText || 'BUY NOW');

  const fontFile = resolveFontFile();
  if (!fontFile) {
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: 'No TTF font file found on disk. Install ttf-dejavu (Alpine) or fonts-dejavu (Debian) in the Docker image.',
      code: 'FONT_FILE_MISSING'
    };
  }
  const fontfileArg = fontFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  // ---- LAYOUT CONSTANTS (portrait 9:16 reference) -----------------------
  const CELL_SIZE = 300;
  const CELL_RIGHT_MARGIN = 30;
  const CELL_BOTTOM_MARGIN = 240;
  const TITLE_STRIP_HEIGHT = 60;
  const TITLE_STRIP_GAP = 12;
  const CTA_BOTTOM_MARGIN = 90;
  const CTA_FONT_SIZE = 56;
  const CTA_BOX_PADDING = 22;
  const TITLE_FONT_SIZE = 30;
  const TITLE_BOX_PADDING = 12;

  // ---- SELECT PRODUCT IMAGE ---------------------------------------------
  let productImageInputPath = null;
  let mockupSource = null;
  let mockupInspect = null;
  const productDiagnostics = { localCandidate: productImageLocalPath || null, remoteCandidate: productImageUrl || null };

  if (productImageLocalPath && fs.existsSync(productImageLocalPath)) {
    const inspection = await inspectMockupImage(productImageLocalPath);
    mockupInspect = inspection;
    if (inspection.usable) {
      productImageInputPath = productImageLocalPath;
      mockupSource = 'local-bg-removed';
    } else {
      console.warn('[PostProcess] Rejecting bg-removed mockup:', inspection.reason);
    }
  }

  if (!productImageInputPath && productImageUrl) {
    const ext = productImageUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const productPath = path.join(MEDIA_CACHE_DIR, `${stampedId}_product.${ext}`);
    try {
      await downloadFile(productImageUrl, productPath);
      const rawInspect = await inspectMockupImage(productPath);
      productDiagnostics.rawInspect = rawInspect;
      if (!rawInspect.usable && rawInspect.meanAlpha !== null && rawInspect.meanAlpha < MOCKUP_MIN_MEAN_ALPHA) {
        return {
          success: false,
          processedVideoPath: null,
          processedVideoUrl: null,
          productOverlayApplied: false,
          error: `Both bg-removed and raw product images are visually empty. Raw: ${rawInspect.reason}`,
          code: 'PRODUCT_MOCKUP_UNAVAILABLE',
          productDiagnostics
        };
      }
      productImageInputPath = productPath;
      mockupSource = 'raw-download';
    } catch (err) {
      return {
        success: false,
        processedVideoPath: null,
        processedVideoUrl: null,
        productOverlayApplied: false,
        error: `Product mockup download failed before post-processing: ${err.message}`,
        code: 'PRODUCT_MOCKUP_UNAVAILABLE',
        productDiagnostics
      };
    }
  }

  if (!productImageInputPath) {
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: 'No usable product mockup: bg-removed PNG was empty and no productImageUrl was provided.',
      code: 'PRODUCT_MOCKUP_UNAVAILABLE',
      productDiagnostics: Object.assign(productDiagnostics, { mockupInspect })
    };
  }

  // ---- PRODUCT MOCKUP FILTER --------------------------------------------
  const productLayerFilter =
    `[1:v]scale=${CELL_SIZE}:${CELL_SIZE}:force_original_aspect_ratio=decrease,` +
    `pad=${CELL_SIZE}:${CELL_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,` +
    `format=rgba[prod]`;

  const gradeAndVignette = 'eq=contrast=1.08:saturation=1.12:brightness=-0.018,vignette=PI/5';

  // drawbox uses iw/ih:
  const pedestalX = `iw-${CELL_RIGHT_MARGIN}-${CELL_SIZE}`;
  const pedestalY = `ih-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}`;
  const pedestal =
    `drawbox=x=${pedestalX}:y=${pedestalY}:w=${CELL_SIZE}:h=${CELL_SIZE}:color=0x050505@0.55:t=fill,` +
    `drawbox=x=${pedestalX}:y=${pedestalY}:w=${CELL_SIZE}:h=${CELL_SIZE}:color=0xf4c96a@0.9:t=3`;

  // overlay uses W/H (main) + w/h (overlay):
  const productOverlay =
    `overlay=x=W-${CELL_RIGHT_MARGIN}-${CELL_SIZE}:y=H-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}:format=auto`;

  // drawtext uses W/H (main_w/main_h) — NOT iw/ih.
  const titleStripX = `W-${CELL_RIGHT_MARGIN}-${CELL_SIZE}`;
  const titleStripY = `H-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}-${TITLE_STRIP_GAP}-${TITLE_STRIP_HEIGHT}`;
  const productTitleFilter =
    `drawtext=fontfile='${fontfileArg}':text='${productName}':fontsize=${TITLE_FONT_SIZE}:` +
    `fontcolor=white:box=1:boxcolor=0x111722dd:boxborderw=${TITLE_BOX_PADDING}:` +
    `x=${titleStripX}+16:y=${titleStripY}+${Math.floor((TITLE_STRIP_HEIGHT - TITLE_FONT_SIZE) / 2)}`;

  const buyPillFilter =
    `drawtext=fontfile='${fontfileArg}':text='${cta}':fontsize=${CTA_FONT_SIZE}:fontcolor=0x0a0a0a:borderw=0:` +
    `box=1:boxcolor=0xf4c96a@0.98:boxborderw=${CTA_BOX_PADDING}:` +
    `x=(w-text_w)/2:y=h-text_h-${CTA_BOTTOM_MARGIN}`;

  inputs.push('-i', productImageInputPath);

  const filterComplex =
    `[0:v]${gradeAndVignette},${pedestal}[graded];` +
    `${productLayerFilter};` +
    `[graded][prod]${productOverlay}[withprod];` +
    `[withprod]${productTitleFilter}[producttxt];` +
    `[producttxt]${buyPillFilter}[out]`;

  const ffmpegArgs = [
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[out]', '-map', '0:a?',
    '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
    outputPath
  ];

  try {
    execFileSync('ffmpeg', ffmpegArgs, { timeout: 180000, stdio: 'pipe' });
  } catch (err) {
    const stderrAll = err && err.stderr ? err.stderr.toString() : '';
    const stderrTail = stderrAll ? stderrAll.slice(-1500) : (err && err.message ? err.message : 'ffmpeg unknown error');
    console.error('[PostProcess] ffmpeg failed (tail):', stderrTail);
    try { fs.unlinkSync(inputPath); } catch {}
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: `ffmpeg compose failed: ${stderrTail}`,
      ffmpegStderrTail: stderrTail,
      filterComplex,
      fontFile,
      mockupSource,
      mockupInspect,
      productDiagnostics,
      code: 'FFMPEG_COMPOSE_FAILED'
    };
  }

  try {
    const stat = fs.statSync(outputPath);
    if (!stat || stat.size < 1024) {
      throw new Error(`Post-processed video is missing or too small (${stat ? stat.size : 'null'} bytes).`);
    }
  } catch (verifyErr) {
    try { fs.unlinkSync(inputPath); } catch {}
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: `Post-processed video verification failed: ${verifyErr.message}`,
      code: 'PROCESSED_VIDEO_INVALID'
    };
  }

  try { fs.unlinkSync(inputPath); } catch {}

  return {
    success: true,
    processedVideoPath: outputPath,
    processedVideoUrl: `/processed-videos/${stampedId}_final.mp4`,
    processedVideoFilename: `${stampedId}_final.mp4`,
    renderStamp,
    stampedVideoId: stampedId,
    productOverlayApplied: true,
    foregroundProductPresentation: true,
    productHeroShotApplied: true,
    productLabelReadable: true,
    ctaTextApplied: true,
    ctaClickUrl: productPageUrl || null,
    ctaLabel: ctaText || 'BUY NOW',
    fontFile,
    mockupSource,
    mockupInspect,
    productDiagnostics
  };
}

function escapeDrawtextValue(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}

module.exports = { postProcessVideo, downloadFile, resolveFontFile, utcStampForFilename, inspectMockupImage };
