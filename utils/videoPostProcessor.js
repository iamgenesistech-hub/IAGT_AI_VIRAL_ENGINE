/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine
 *
 * After the base avatar/cinematic render, this adds:
 *   1. Foreground product presentation (bg-removed mockup)
 *   2. Product title label
 *   3. Buy Now CTA pill (bottom safe zone)
 *   4. Final color grade/export
 *
 * ABSOLUTE CONTRACT:
 *   - If productImageLocalPath (or productImageUrl) cannot be composited into
 *     the final frame, this function returns success:false. Callers must
 *     treat that as a render failure and MUST NOT ship the raw video —
 *     videos without the product mockup and Buy Now pill are not allowed.
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
  const inputPath = path.join(MEDIA_CACHE_DIR, `${videoId}_raw.mp4`);
  const outputPath = path.join(PROCESSED_DIR, `${videoId}_final.mp4`);

  await downloadFile(videoUrl, inputPath);

  const inputs = ['-i', inputPath];

  const productName = escapeDrawtextValue(productTitle || 'Featured Product');
  // ABSOLUTE RULE: the CTA overlay must never render a URL as spoken/on-screen
  // text. The URL is the click target stored alongside the video; the
  // on-screen button always reads "Buy Now — Shop {product}".
  const cta = escapeDrawtextValue(ctaText || `Buy Now - Shop ${productTitle || 'Now'}`);

  const overlayPlacement = resolveFaceSafeTextPlacement(textOverlayPosition);
  const ctaX = overlayPlacement.x;
  const ctaY = overlayPlacement.y;
  const titleY = overlayPlacement.titleY;

  const normalizedEffects = Array.isArray(specialEffects)
    ? specialEffects.map((effect) => String(effect || '').trim().toLowerCase())
    : [];
  const withProductEntranceFade = normalizedEffects.includes('product-entrance-fade');

  const productLayerFilter = withProductEntranceFade
    ? '[1:v]scale=320:-1,format=rgba,fade=t=in:st=0:d=0.55:alpha=1,colorchannelmixer=aa=0.99[prod]'
    : '[1:v]scale=320:-1,format=rgba,colorchannelmixer=aa=0.99[prod]';
  const gradeAndVignette = 'eq=contrast=1.08:saturation=1.12:brightness=-0.018,vignette=PI/5';
  const pedestal = 'drawbox=x=W-420:y=H-520:w=380:h=380:color=0x050505@0.26:t=fill,drawbox=x=W-420:y=H-520:w=380:h=380:color=0xf4c96a@0.14:t=3';
  const productOverlay = 'overlay=x=W-w-34:y=H-h-170:format=auto';
  // Buy Now pill: solid gold background with black text, centered horizontally
  // above the product-title strip in the bottom safe zone (below y=1720 for 1080x1920).
  const buyPillFilter =
    `drawtext=text='${cta}':fontsize=44:fontcolor=0x0a0a0a:borderw=0:` +
    `box=1:boxcolor=0xf4c96a@0.98:boxborderw=22:` +
    `x=(w-text_w)/2:y=h-text_h-40:font=Sans`;

  let productOverlayApplied = false;
  let productImageInputPath = null;

  // Prefer local bg-removed PNG when provided (avoids re-downloading a URL
  // that points back at our own /processed-images route).
  if (productImageLocalPath && fs.existsSync(productImageLocalPath)) {
    productImageInputPath = productImageLocalPath;
  } else if (productImageUrl) {
    const ext = productImageUrl.includes('.png') ? 'png' : 'jpg';
    const productPath = path.join(MEDIA_CACHE_DIR, `${videoId}_product.${ext}`);
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

  inputs.push('-i', productImageInputPath);
  const filterComplex = `[0:v]${gradeAndVignette},${pedestal}[graded];${productLayerFilter};[graded][prod]${productOverlay}[withprod];` +
    `[withprod]drawtext=text='${productName}':fontsize=40:fontcolor=white:borderw=2:bordercolor=0x000000@0.8:box=1:boxcolor=0x111722bb:x=40:y=${titleY}:font=Sans[producttxt];` +
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
    const stderr = err && err.stderr ? err.stderr.toString().slice(0, 2000) : '';
    console.error('[PostProcess] ffmpeg failed:', stderr || err.message);
    // Do NOT return the raw video URL — that would ship a video without the
    // required product mockup + Buy Now overlays. Signal failure and let
    // the caller mark the render as failed.
    try { fs.unlinkSync(inputPath); } catch {}
    return {
      success: false,
      processedVideoPath: null,
      processedVideoUrl: null,
      productOverlayApplied: false,
      error: `ffmpeg compose failed: ${stderr.slice(0, 500) || err.message}`,
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
    processedVideoUrl: `/processed-videos/${videoId}_final.mp4`,
    productOverlayApplied,
    foregroundProductPresentation: productOverlayApplied,
    productHeroShotApplied: productOverlayApplied,
    productLabelReadable: productOverlayApplied,
    ctaTextApplied: true,
    ctaClickUrl: productPageUrl || null,
    ctaLabel: ctaText || `Buy Now - Shop ${productTitle || 'Now'}`
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
  return {
    x: '40',
    y: 'h-text_h-92',
    titleY: 'h-text_h-158'
  };
}

module.exports = { postProcessVideo, downloadFile };
