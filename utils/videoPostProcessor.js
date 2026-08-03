/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine
 *
 * After the base avatar/cinematic render, this adds:
 *   1. Foreground product presentation (bg-removed mockup, large + centered
 *      above the CTA)
 *   2. Product title label
 *   3. Buy Now CTA pill (raised into the safe zone so nothing clips)
 *   4. Final color grade/export
 *
 * ABSOLUTE CONTRACT:
 *   - If productImageLocalPath (or productImageUrl) cannot be composited into
 *     the final frame, this function returns success:false. Callers must
 *     treat that as a render failure and MUST NOT ship the raw video —
 *     videos without the product mockup and Buy Now pill are not allowed.
 *
 * FILENAME: every processed video's output filename embeds a UTC
 * YYYYMMDD_HHMMSS timestamp so operators can trace exactly when a given
 * asset was produced (e.g. `52_20260803T164210Z_final.mp4`).
 *
 * Uses ffmpeg (installed in the Docker container).
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MEDIA_CACHE_DIR = path.join(__dirname, '../media-cache');
const PROCESSED_DIR = path.join(__dirname, '../processed-videos');

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

// Resolve a real TTF font file on disk. Alpine + ttf-dejavu installs the
// DejaVu family; other distros may have Liberation or Freefont. Never rely on
// fontconfig lookup like "font=Sans" — Alpine's fontconfig config often can't
// resolve the alias, which causes drawtext to fail with an inscrutable error.
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
  // Always embed a UTC timestamp in the output filename so every render is
  // uniquely traceable to its production time — even reruns of the same row.
  const renderStamp = utcStampForFilename();
  const stampedId = `${videoId}_${renderStamp}`;

  const inputPath = path.join(MEDIA_CACHE_DIR, `${stampedId}_raw.mp4`);
  const outputPath = path.join(PROCESSED_DIR, `${stampedId}_final.mp4`);

  await downloadFile(videoUrl, inputPath);

  const inputs = ['-i', inputPath];

  const productName = escapeDrawtextValue(productTitle || 'Featured Product');
  // ABSOLUTE RULE: the CTA overlay must never render a URL as spoken/on-screen
  // text. The URL is the click target stored alongside the video; the
  // on-screen button always reads "Buy Now — Shop {product}".
  const cta = escapeDrawtextValue(ctaText || `Buy Now - Shop ${productTitle || 'Now'}`);

  const overlayPlacement = resolveFaceSafeTextPlacement(textOverlayPosition);
  const titleY = overlayPlacement.titleY;

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
  // drawtext fontfile= must have any ':' path separator escaped so ffmpeg's
  // filter parser doesn't treat it as an option delimiter.
  const fontfileArg = fontFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  const normalizedEffects = Array.isArray(specialEffects)
    ? specialEffects.map((effect) => String(effect || '').trim().toLowerCase())
    : [];
  const withProductEntranceFade = normalizedEffects.includes('product-entrance-fade');

  // Product mockup: scaled to ~460px wide (up from 320) and positioned in the
  // bottom-right hero zone, ABOVE the CTA pill. Force alpha=1 fully so a
  // partially transparent bg-removed PNG still reads at full opacity.
  const productLayerFilter = withProductEntranceFade
    ? '[1:v]scale=460:-1,format=rgba,fade=t=in:st=0:d=0.55:alpha=1[prod]'
    : '[1:v]scale=460:-1,format=rgba[prod]';

  const gradeAndVignette = 'eq=contrast=1.08:saturation=1.12:brightness=-0.018,vignette=PI/5';

  // Layout math (all measured from bottom of frame):
  //   CTA pill safe-zone bottom margin ...... 180 px  (was 40 → was clipping)
  //   Product mockup bottom edge above pill .. 300 px  (leaves ~120 px gap)
  //
  // drawbox does NOT support the W/H (main input) constants — only iw/ih.
  // overlay supports W/H (main) + w/h (overlay input), so its expression stays.
  const PEDESTAL_W = 520;
  const PEDESTAL_H = 520;
  const PEDESTAL_BOTTOM_MARGIN = 300;
  // Pedestal top-left: iw-PEDESTAL_W-30, ih-PEDESTAL_BOTTOM_MARGIN-PEDESTAL_H
  const pedestalX = `iw-${PEDESTAL_W}-30`;
  const pedestalY = `ih-${PEDESTAL_BOTTOM_MARGIN}-${PEDESTAL_H}`;
  const pedestal =
    `drawbox=x=${pedestalX}:y=${pedestalY}:w=${PEDESTAL_W}:h=${PEDESTAL_H}:color=0x050505@0.32:t=fill,` +
    `drawbox=x=${pedestalX}:y=${pedestalY}:w=${PEDESTAL_W}:h=${PEDESTAL_H}:color=0xf4c96a@0.28:t=4`;

  // Product overlay uses overlay-filter constants: W/H = main video dims,
  // w/h = product image dims after scale. Center product horizontally inside
  // the pedestal band and anchor its BOTTOM edge to PEDESTAL_BOTTOM_MARGIN.
  const productOverlay =
    `overlay=x=W-${PEDESTAL_W}-30+((${PEDESTAL_W}-w)/2):y=H-h-${PEDESTAL_BOTTOM_MARGIN}:format=auto`;

  // Buy Now pill: solid gold background with black text, centered horizontally
  // in the bottom safe zone. Total drawn height = fontsize (56) + 2*boxborderw
  // (36) = 128 px. Setting y = h-text_h-180 puts the box bottom at
  //   (h-text_h-180) + text_h + 18  = h-162
  // → ~162 px above the frame bottom, comfortably inside the safe area.
  const buyPillFilter =
    `drawtext=fontfile='${fontfileArg}':text='${cta}':fontsize=56:fontcolor=0x0a0a0a:borderw=0:` +
    `box=1:boxcolor=0xf4c96a@0.98:boxborderw=18:` +
    `x=(w-text_w)/2:y=h-text_h-180`;

  let productOverlayApplied = false;
  let productImageInputPath = null;

  // Prefer local bg-removed PNG when provided (avoids re-downloading a URL
  // that points back at our own /processed-images route).
  if (productImageLocalPath && fs.existsSync(productImageLocalPath)) {
    productImageInputPath = productImageLocalPath;
  } else if (productImageUrl) {
    const ext = productImageUrl.includes('.png') ? 'png' : 'jpg';
    const productPath = path.join(MEDIA_CACHE_DIR, `${stampedId}_product.${ext}`);
    try {
      await downloadFile(productImageUrl, productPath);
      productImageInputPath = productPath;
    } catch (err) {
      return {
        success: false,
        processedVideoPath: null,
        processedVideoUrl: null,
        productOverlayApplied: false,
        error: `Product mockup download failed before post-processing: ${err.message}`,
        code: 'PRODUCT_MOCKUP_UNAVAILABLE'
      };
    }
  } else {
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: 'productImageUrl (or productImageLocalPath) is required — videos without a product mockup are not allowed.',
      code: 'PRODUCT_MOCKUP_UNAVAILABLE'
    };
  }

  // Verify the product image exists on disk and is non-trivially sized. A
  // 0-byte or tiny file will silently vanish inside the overlay filter and
  // the operator will see "no mockup" without any error.
  try {
    const stat = fs.statSync(productImageInputPath);
    if (!stat || stat.size < 512) {
      return {
        success: false,
        processedVideoPath: null,
        processedVideoUrl: null,
        productOverlayApplied: false,
        error: `Product mockup file is missing or too small (${stat ? stat.size : 'null'} bytes) at ${productImageInputPath}.`,
        code: 'PRODUCT_MOCKUP_UNAVAILABLE'
      };
    }
  } catch (statErr) {
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: `Product mockup file could not be stat'd: ${statErr.message}`,
      code: 'PRODUCT_MOCKUP_UNAVAILABLE'
    };
  }

  inputs.push('-i', productImageInputPath);
  const filterComplex = `[0:v]${gradeAndVignette},${pedestal}[graded];${productLayerFilter};[graded][prod]${productOverlay}[withprod];` +
    `[withprod]drawtext=fontfile='${fontfileArg}':text='${productName}':fontsize=40:fontcolor=white:borderw=2:bordercolor=0x000000@0.8:box=1:boxcolor=0x111722bb:x=40:y=${titleY}[producttxt];` +
    `[producttxt]${buyPillFilter}[out]`;
  productOverlayApplied = true;

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
    // Capture the tail of stderr — ffmpeg puts the actual filter error at the
    // END of its output after a long banner, so slicing from the front loses
    // the diagnostic. Take the last 1500 chars instead.
    const stderrAll = err && err.stderr ? err.stderr.toString() : '';
    const stderrTail = stderrAll ? stderrAll.slice(-1500) : (err && err.message ? err.message : 'ffmpeg unknown error');
    console.error('[PostProcess] ffmpeg failed (tail):', stderrTail);
    // Do NOT return the raw video URL — that would ship a video without the
    // required product mockup + Buy Now overlays. Signal failure and let
    // the caller mark the render as failed.
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
      code: 'FFMPEG_COMPOSE_FAILED'
    };
  }

  // Verify the output actually exists and has non-zero size.
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
    productOverlayApplied,
    foregroundProductPresentation: productOverlayApplied,
    productHeroShotApplied: productOverlayApplied,
    productLabelReadable: productOverlayApplied,
    ctaTextApplied: true,
    ctaClickUrl: productPageUrl || null,
    ctaLabel: ctaText || `Buy Now - Shop ${productTitle || 'Now'}`,
    fontFile
  };
}

function escapeDrawtextValue(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}

function resolveFaceSafeTextPlacement(_textOverlayPosition) {
  // Product title strip sits directly ABOVE the pedestal that holds the
  // product mockup (mockup bottom is at h-300, pedestal top is at h-820).
  // Placing the title at h-text_h-830 puts it just above the pedestal, on
  // the darker side of the frame.
  return {
    x: '40',
    y: 'h-text_h-92',
    titleY: 'h-text_h-830'
  };
}

module.exports = { postProcessVideo, downloadFile, resolveFontFile, utcStampForFilename };
