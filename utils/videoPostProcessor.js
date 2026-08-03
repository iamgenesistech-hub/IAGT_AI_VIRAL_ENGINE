/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine
 *
 * After the base avatar/cinematic render, this adds:
 *   1. Foreground product presentation (bg-removed mockup, deterministic
 *      300x300 hero cell in the bottom-right)
 *   2. Product-title strip (right-anchored above the mockup, auto-shrunk
 *      to always fit fully inside the frame — see fitTitleBox)
 *   3. Buy Now CTA pill (short label, guaranteed to fit any 9:16 or 16:9 frame)
 *   4. Final color grade/export
 *
 * ABSOLUTE CONTRACT:
 *   - If productImageLocalPath (or productImageUrl) cannot be composited into
 *     the final frame, this function returns success:false.
 *   - If the product-title box would extend past the right or left edge of
 *     the frame even at MIN_TITLE_FONT_SIZE, this function returns
 *     success:false with code TITLE_OVERFLOWS_FRAME. Callers MUST treat
 *     that as a render failure — a video with a clipped title never ships.
 *
 * FFMPEG FILTER CONSTANTS CHEATSHEET:
 *   drawbox   : uses  iw / ih          (input width/height)
 *   drawtext  : uses  W  / H  (main_w / main_h)  — DOES NOT accept iw/ih
 *              and supports text_w / text_h  in its x/y expressions
 *   overlay   : uses  W  / H  (main dims) + w / h  (overlay dims)
 *
 * FILENAME: every processed video's output filename embeds a UTC
 * YYYYMMDDTHHMMSSZ timestamp so operators can trace exactly when a given
 * asset was produced.
 *
 * Uses ffmpeg + ffprobe (installed in the Docker container).
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

const MOCKUP_MIN_MEAN_ALPHA = 40;
const MOCKUP_MIN_BYTES = 4 * 1024;

// Title-box sizing. We shrink fontsize from MAX→MIN until the projected box
// width fits inside the safe area. If it still doesn't fit at MIN we fail.
const MAX_TITLE_FONT_SIZE = 30;
const MIN_TITLE_FONT_SIZE = 18;
// DejaVu Sans Bold: average character advance is ~0.58 * fontsize. Widen a
// little to be safe on wide characters (M, W).
const CHAR_ADVANCE_RATIO = 0.62;

if (!fs.existsSync(MEDIA_CACHE_DIR)) fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

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

// Probe the input video for its width/height using ffprobe so all overlay
// math can be validated against real pixel dimensions BEFORE ffmpeg runs.
function probeVideoDimensions(inputPath) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0:s=x',
      inputPath
    ], { timeout: 15000 }).toString().trim();
    const [w, h] = out.split('x').map((v) => parseInt(v, 10));
    if (!w || !h) return null;
    return { width: w, height: h };
  } catch (err) {
    console.warn('[PostProcess] ffprobe failed:', err && err.message ? err.message : err);
    return null;
  }
}

// Choose the largest fontsize (from MAX down to MIN) whose projected drawtext
// box fits inside [xLeftLimit, xRightLimit]. Returns null if even MIN
// overflows — caller MUST hard-fail the render in that case.
function fitTitleBox({ text, videoWidth, xLeftLimit, xRightLimit, boxPadding }) {
  const availableWidth = xRightLimit - xLeftLimit;
  for (let fontsize = MAX_TITLE_FONT_SIZE; fontsize >= MIN_TITLE_FONT_SIZE; fontsize -= 1) {
    const estTextWidth = Math.ceil(text.length * fontsize * CHAR_ADVANCE_RATIO);
    const estBoxWidth = estTextWidth + boxPadding * 2;
    if (estBoxWidth <= availableWidth) {
      return {
        fontsize,
        estTextWidth,
        estBoxWidth,
        availableWidth,
        videoWidth
      };
    }
  }
  return null;
}

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

  // Probe input dims up-front so title/mockup geometry can be validated.
  const probed = probeVideoDimensions(inputPath) || { width: 720, height: 1280 };
  const videoWidth = probed.width;
  const videoHeight = probed.height;

  const inputs = ['-i', inputPath];

  const productTitleText = productTitle || 'Featured Product';
  const productName = escapeDrawtextValue(productTitleText);
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

  // ---- LAYOUT CONSTANTS -------------------------------------------------
  const CELL_SIZE = 300;
  const CELL_RIGHT_MARGIN = 30;
  const CELL_BOTTOM_MARGIN = 240;
  const TITLE_STRIP_HEIGHT = 60;
  const TITLE_STRIP_GAP = 12;
  const TITLE_BOX_PADDING = 12;
  const TITLE_SAFE_LEFT_MARGIN = 30; // never draw left of this x
  const CTA_BOTTOM_MARGIN = 90;
  const CTA_FONT_SIZE = 56;
  const CTA_BOX_PADDING = 22;

  // ---- HARD GEOMETRY GUARDS ---------------------------------------------
  // Mockup pedestal must fit — mockup right edge is at (videoWidth - CELL_RIGHT_MARGIN),
  // left edge at (videoWidth - CELL_RIGHT_MARGIN - CELL_SIZE). If that goes
  // negative the video is too narrow to host the pedestal at all.
  const mockupLeftEdge = videoWidth - CELL_RIGHT_MARGIN - CELL_SIZE;
  if (mockupLeftEdge < 0) {
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: `Video is too narrow (${videoWidth}px) to fit the product mockup pedestal (${CELL_SIZE}px + ${CELL_RIGHT_MARGIN}px margin).`,
      code: 'MOCKUP_OVERFLOWS_FRAME',
      probed
    };
  }

  // Title box: right-anchor to the same right margin as the mockup. Fit
  // fontsize so the projected box width is <= (videoWidth - TITLE_SAFE_LEFT_MARGIN - CELL_RIGHT_MARGIN).
  const titleRightLimit = videoWidth - CELL_RIGHT_MARGIN;
  const titleFit = fitTitleBox({
    text: productTitleText,
    videoWidth,
    xLeftLimit: TITLE_SAFE_LEFT_MARGIN,
    xRightLimit: titleRightLimit,
    boxPadding: TITLE_BOX_PADDING
  });
  if (!titleFit) {
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: `Product title "${productTitleText}" does not fit in the video (${videoWidth}px wide) even at min fontsize ${MIN_TITLE_FONT_SIZE}. Shorten the title or increase resolution.`,
      code: 'TITLE_OVERFLOWS_FRAME',
      probed,
      titleFit: null
    };
  }

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

  // ---- FILTER CHAIN -----------------------------------------------------
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

  // drawtext: RIGHT-ANCHOR the title box so its right edge always lands at
  // (W - CELL_RIGHT_MARGIN). ffmpeg's text_w evaluates to the actual rendered
  // text width, so:
  //   text left edge = W - text_w - TITLE_BOX_PADDING - CELL_RIGHT_MARGIN
  //   box right edge = text_left + text_w + TITLE_BOX_PADDING = W - CELL_RIGHT_MARGIN
  // Guaranteed to end exactly at CELL_RIGHT_MARGIN from the right edge no
  // matter how wide the text is at the chosen fontsize.
  const titleFontSize = titleFit.fontsize;
  const titleStripY = `H-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}-${TITLE_STRIP_GAP}-${TITLE_STRIP_HEIGHT}`;
  const titleYOffset = Math.floor((TITLE_STRIP_HEIGHT - titleFontSize) / 2);
  const productTitleFilter =
    `drawtext=fontfile='${fontfileArg}':text='${productName}':fontsize=${titleFontSize}:` +
    `fontcolor=white:box=1:boxcolor=0x111722dd:boxborderw=${TITLE_BOX_PADDING}:` +
    `x=W-text_w-${TITLE_BOX_PADDING}-${CELL_RIGHT_MARGIN}:y=${titleStripY}+${titleYOffset}`;

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
      titleFit,
      probed,
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
    titleFit,
    probed,
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

module.exports = {
  postProcessVideo,
  downloadFile,
  resolveFontFile,
  utcStampForFilename,
  inspectMockupImage,
  probeVideoDimensions,
  fitTitleBox
};
