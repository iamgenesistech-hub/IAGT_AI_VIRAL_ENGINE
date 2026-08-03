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
 * LAYOUT (portrait 9:16 == 720x1280 reference frame, scales cleanly to
 *          landscape 16:9 == 1920x1080):
 *
 *     +--------------------------+   ← top of frame
 *     |                          |
 *     |     [ avatar body ]      |
 *     |                          |
 *     |   ┌──────────────┐       |
 *     |   │ Sea Moss...  │       |  ← product-title strip (30, ih-560)
 *     |   └──────────────┘       |
 *     |   ┌────────────┐         |
 *     |   │   [PROD]   │         |  ← mockup cell 300x300 at (iw-330, ih-540)
 *     |   │   image    │         |
 *     |   └────────────┘         |
 *     |                          |
 *     |   [ Buy Now pill ]       |  ← CTA pill at (center, ih-180)
 *     |                          |
 *     +--------------------------+   ← bottom of frame
 *
 * FILENAME: every processed video's output filename embeds a UTC
 * YYYYMMDDTHHMMSSZ timestamp so operators can trace exactly when a given
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
  // text. Keep the button label SHORT so it fits any 9:16 or 16:9 frame
  // without horizontal clipping. Long product names live in the title strip
  // ABOVE the mockup, not on the button.
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
  // drawtext fontfile= must have any ':' path separator escaped so ffmpeg's
  // filter parser doesn't treat it as an option delimiter.
  const fontfileArg = fontFile.replace(/\\/g, '/').replace(/:/g, '\\:');

  // ---- LAYOUT CONSTANTS (portrait 9:16 reference) ----------------------
  // These are pixel offsets from the frame's right/bottom edges.
  const CELL_SIZE = 300;             // product mockup cell (square)
  const CELL_RIGHT_MARGIN = 30;      // gap from right edge to cell
  const CELL_BOTTOM_MARGIN = 240;    // gap from bottom edge to cell bottom
  const TITLE_STRIP_HEIGHT = 60;     // room for the product-title strip
  const TITLE_STRIP_GAP = 12;        // gap between title strip and mockup
  const CTA_BOTTOM_MARGIN = 90;      // gap from bottom edge to CTA pill bottom
  const CTA_FONT_SIZE = 56;
  const CTA_BOX_PADDING = 22;
  const TITLE_FONT_SIZE = 30;
  const TITLE_BOX_PADDING = 12;

  // ---- PRODUCT MOCKUP FILTER --------------------------------------------
  // Deterministic 300x300 RGBA cell. force_original_aspect_ratio=decrease
  // guarantees the source fits inside the cell without distortion; the pad
  // fills the rest with fully transparent pixels so the pedestal color
  // shows through around the product.
  //
  // NOTE: we DELIBERATELY drop the fade-in — it was making the mockup
  // invisible during the first ~0.55s, which is exactly the frame most
  // viewers see when the video autoplays.
  const productLayerFilter =
    `[1:v]scale=${CELL_SIZE}:${CELL_SIZE}:force_original_aspect_ratio=decrease,` +
    `pad=${CELL_SIZE}:${CELL_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,` +
    `format=rgba[prod]`;

  const gradeAndVignette = 'eq=contrast=1.08:saturation=1.12:brightness=-0.018,vignette=PI/5';

  // ---- PEDESTAL (dark card + gold border, EXACTLY the cell) --------------
  // drawbox does NOT support the W/H (main input) constants — only iw/ih.
  const pedestalX = `iw-${CELL_RIGHT_MARGIN}-${CELL_SIZE}`;
  const pedestalY = `ih-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}`;
  const pedestal =
    `drawbox=x=${pedestalX}:y=${pedestalY}:w=${CELL_SIZE}:h=${CELL_SIZE}:color=0x050505@0.55:t=fill,` +
    `drawbox=x=${pedestalX}:y=${pedestalY}:w=${CELL_SIZE}:h=${CELL_SIZE}:color=0xf4c96a@0.9:t=3`;

  // ---- PRODUCT OVERLAY (positioned to EXACTLY overlap the pedestal) -----
  // overlay filter's W/H = main video dims, w/h = overlay dims (both CELL_SIZE).
  const productOverlay =
    `overlay=x=W-${CELL_RIGHT_MARGIN}-${CELL_SIZE}:y=H-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}:format=auto`;

  // ---- PRODUCT-TITLE STRIP (above the mockup cell) -----------------------
  // Anchor to the SAME right-side column as the mockup so the strip and
  // mockup read as one unit. Left-align text inside a padded box.
  const titleStripX = `iw-${CELL_RIGHT_MARGIN}-${CELL_SIZE}`;
  const titleStripY = `ih-${CELL_BOTTOM_MARGIN}-${CELL_SIZE}-${TITLE_STRIP_GAP}-${TITLE_STRIP_HEIGHT}`;
  const productTitleFilter =
    `drawtext=fontfile='${fontfileArg}':text='${productName}':fontsize=${TITLE_FONT_SIZE}:` +
    `fontcolor=white:box=1:boxcolor=0x111722dd:boxborderw=${TITLE_BOX_PADDING}:` +
    `x=${titleStripX}+16:y=${titleStripY}+${Math.floor((TITLE_STRIP_HEIGHT - TITLE_FONT_SIZE) / 2)}`;

  // ---- BUY NOW CTA PILL (short label, guaranteed to fit) -----------------
  // Total drawn height ≈ CTA_FONT_SIZE + 2*CTA_BOX_PADDING = 56 + 44 = 100 px.
  // y = h - text_h - CTA_BOTTOM_MARGIN puts the text top at h-146; the box
  // extends CTA_BOX_PADDING further so its bottom lands at h - CTA_BOTTOM_MARGIN
  // + CTA_BOX_PADDING = h-68. Safe on every player.
  const buyPillFilter =
    `drawtext=fontfile='${fontfileArg}':text='${cta}':fontsize=${CTA_FONT_SIZE}:fontcolor=0x0a0a0a:borderw=0:` +
    `box=1:boxcolor=0xf4c96a@0.98:boxborderw=${CTA_BOX_PADDING}:` +
    `x=(w-text_w)/2:y=h-text_h-${CTA_BOTTOM_MARGIN}`;

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

  // Verify the product image exists on disk and is non-trivially sized.
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

  // Filter graph order:
  //   1. grade + vignette on main video
  //   2. draw pedestal card
  //   3. build product overlay layer
  //   4. composite product ONTO pedestal
  //   5. draw product-title strip above pedestal
  //   6. draw Buy Now pill at bottom
  const filterComplex =
    `[0:v]${gradeAndVignette},${pedestal}[graded];` +
    `${productLayerFilter};` +
    `[graded][prod]${productOverlay}[withprod];` +
    `[withprod]${productTitleFilter}[producttxt];` +
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
    productOverlayApplied,
    foregroundProductPresentation: productOverlayApplied,
    productHeroShotApplied: productOverlayApplied,
    productLabelReadable: productOverlayApplied,
    ctaTextApplied: true,
    ctaClickUrl: productPageUrl || null,
    ctaLabel: ctaText || 'BUY NOW',
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

module.exports = { postProcessVideo, downloadFile, resolveFontFile, utcStampForFilename };
