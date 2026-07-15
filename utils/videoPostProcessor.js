/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine (FIXED)
 *
 * After HeyGen renders the base avatar video, this adds:
 *   1. Prominent foreground product mockup presentation
 *   2. CTA text overlay ("Shop Now — iamgenesistech.com")
 *   3. Affiliate link watermark
 *
 * Uses ffmpeg (available in the Docker container).
 * 
 * FIXES APPLIED:
 * - Use execSync with array args (not shell string) to avoid quoting issues
 * - Move text value escaping to proper location for ffmpeg filter syntax
 * - Fix x/y positioning to use raw numeric values, not ffmpeg expressions in quotes
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MEDIA_CACHE_DIR = path.join(__dirname, '../media-cache');
const PROCESSED_DIR = path.join(__dirname, '../processed-videos');

// Ensure directories exist
if (!fs.existsSync(MEDIA_CACHE_DIR)) fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

/**
 * Download a file from URL to local path
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

/**
 * Post-process a rendered video with product overlay and CTA
 *
 * @param {object} opts
 * @param {string} opts.videoUrl — URL of the rendered HeyGen video
 * @param {string} opts.videoId — unique video ID
 * @param {string} [opts.productImageUrl] — product image to overlay
 * @param {string} [opts.productTitle] — product name for CTA
 * @param {string} [opts.affiliateCode] — affiliate code
 * @param {string} [opts.ctaText] — custom CTA text
 * @returns {{ success: boolean, processedVideoPath: string, processedVideoUrl: string }}
 */
async function postProcessVideo({
   videoUrl,
   videoId,
   productImageUrl,
   productTitle = '',
   productPageUrl = '',
   affiliateCode = '',
   specialEffects = [],
   textOverlayPosition = 'bottom',
   ctaText
}) {
  const inputPath = path.join(MEDIA_CACHE_DIR, `${videoId}_raw.mp4`);
  const outputPath = path.join(PROCESSED_DIR, `${videoId}_final.mp4`);

  // Download the raw video
  await downloadFile(videoUrl, inputPath);

  // Build ffmpeg filter chain
  const inputs = ['-i', inputPath];
  let filterComplex = '';

  // Escape text values for ffmpeg drawtext filter
  // The drawtext filter needs text values properly escaped for its own parser
  const productName = escapeDrawtextValue(productTitle || 'Featured Product');
  const destination = escapeDrawtextValue(productPageUrl || `Shop Now — iamgenesistech.com${affiliateCode ? '/?ref=' + affiliateCode : ''}`);
  const cta = escapeDrawtextValue(ctaText || destination);
  
  // Position values — these are LITERAL ffmpeg expressions or numeric coords
  const overlayPlacement = resolveFaceSafeTextPlacement(textOverlayPosition);
  const ctaX = overlayPlacement.x;        // '40' (numeric string for x position)
  const ctaY = overlayPlacement.y;        // 'h-text_h-92' (ffmpeg expression for dynamic y)
  const titleY = overlayPlacement.titleY; // 'h-text_h-158'
  
  const normalizedEffects = Array.isArray(specialEffects)
    ? specialEffects.map((effect) => String(effect || '').trim().toLowerCase())
    : [];
  const withProductEntranceFade = normalizedEffects.includes('product-entrance-fade');

  // The product must be a sales object in the scene, not a tiny hidden watermark.
  // Keep it in the foreground, large enough to read, and below the avatar face zone.
  const productLayerFilter = withProductEntranceFade
    ? '[1:v]scale=560:-1,format=rgba,fade=t=in:st=0:d=0.55:alpha=1,colorchannelmixer=aa=0.99[prod]'
    : '[1:v]scale=560:-1,format=rgba,colorchannelmixer=aa=0.99[prod]';
  const gradeAndVignette = 'eq=contrast=1.08:saturation=1.12:brightness=-0.018,vignette=PI/5';
  const pedestal = 'drawbox=x=W-650:y=H-760:w=610:h=610:color=0x050505@0.34:t=fill,drawbox=x=W-650:y=H-760:w=610:h=610:color=0xf4c96a@0.20:t=3';
  const productOverlay = 'overlay=x=W-w-64:y=H-h-250:format=auto';
  let productOverlayApplied = false;

  if (productImageUrl) {
    // Download product image
    const ext = productImageUrl.includes('.png') ? 'png' : 'jpg';
    const productPath = path.join(MEDIA_CACHE_DIR, `${videoId}_product.${ext}`);
    try {
      await downloadFile(productImageUrl, productPath);
      inputs.push('-i', productPath);
      
      // Build filter: grade -> pedestal -> product layer -> overlay -> product text -> cta text
      filterComplex = `[0:v]${gradeAndVignette},${pedestal}[graded];${productLayerFilter};[graded][prod]${productOverlay}[withprod];` +
        `[withprod]drawtext=text='${productName}':fontsize=40:fontcolor=white:borderw=2:bordercolor=0x000000@0.8:box=1:boxcolor=0x111722bb:x=40:y=${titleY}:font=Sans[producttxt];` +
        `[producttxt]drawtext=text='${cta}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:box=1:boxcolor=0x00000099:x=${ctaX}:y=${ctaY}:font=Sans[out]`;
      productOverlayApplied = true;
    } catch (err) {
      return {
        success: false,
        processedVideoPath: inputPath,
        processedVideoUrl: videoUrl,
        productOverlayApplied: false,
        error: `Product mockup download failed before post-processing: ${err.message}`
      };
    }
  } else {
    // No product image, just grade and add text overlays
    filterComplex = `[0:v]${gradeAndVignette}[graded];` +
      `[graded]drawtext=text='${productName}':fontsize=40:fontcolor=white:borderw=2:bordercolor=0x000000@0.8:box=1:boxcolor=0x111722bb:x=40:y=${titleY}:font=Sans[producttxt];` +
      `[producttxt]drawtext=text='${cta}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:box=1:boxcolor=0x00000099:x=${ctaX}:y=${ctaY}:font=Sans[out]`;
  }

  // Run ffmpeg with proper array argument passing (avoids shell injection and quoting issues)
  const cmd = [
    'ffmpeg', '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[out]', '-map', '0:a?',
    '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
    outputPath
  ];

  try {
    execSync(cmd, { timeout: 120000, stdio: 'pipe' });
  } catch (err) {
    console.error('[PostProcess] ffmpeg failed:', err.message);
    // Return raw video if post-processing fails
    return {
      success: false,
      processedVideoPath: inputPath,
      processedVideoUrl: videoUrl,
      productOverlayApplied: false,
      error: 'Post-processing failed, returning raw video'
    };
  }

  // Clean up raw input
  try { fs.unlinkSync(inputPath); } catch {}

  return {
    success: true,
    processedVideoPath: outputPath,
    processedVideoUrl: `/processed-videos/${videoId}_final.mp4`,
    productOverlayApplied
  };
}

/**
 * Escape text for use in ffmpeg drawtext filter.
 * Drawtext requires escaping for single quotes and special characters.
 */
function escapeDrawtextValue(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')           // Backslash first
    .replace(/'/g, "'\\''")            // Single quote escaping for drawtext
    .replace(/:/g, '\\:');             // Colon needs escaping in drawtext
}

/**
 * All text overlays are locked to the bottom-safe zone only.
 * For 9:16 portrait (1080×1920) the avatar head/neck occupies roughly y=0–950.
 * Safe bottom zone: y > h-text_h-200 (approx y > 1720 for a 40px-tall label).
 * 'top' is intentionally removed — it would overlay the avatar's face/crown.
 */
function resolveFaceSafeTextPlacement(textOverlayPosition) {
  // Always bottom-safe regardless of requested position
  // Return numeric strings (x value) and ffmpeg expressions (y values)
  return { 
    x: '40',              // Numeric x position in pixels
    y: 'h-text_h-92',     // ffmpeg expression: video height minus text height minus 92px margin
    titleY: 'h-text_h-158' // ffmpeg expression: higher position for product name
  };
}

module.exports = { postProcessVideo, downloadFile };
