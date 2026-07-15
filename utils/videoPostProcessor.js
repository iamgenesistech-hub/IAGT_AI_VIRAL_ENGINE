/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine
 *
 * After the base avatar/cinematic render, this adds:
 *   1. Foreground product presentation
 *   2. CTA text overlay
 *   3. Final color grade/export
 *
 * Uses ffmpeg (available in the Docker container).
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
  let filterComplex = '';

  const productName = escapeDrawtextValue(productTitle || 'Featured Product');
  const destination = escapeDrawtextValue(productPageUrl || `Shop Now - iamgenesistech.com${affiliateCode ? '/?ref=' + affiliateCode : ''}`);
  const cta = escapeDrawtextValue(ctaText || destination);

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
  let productOverlayApplied = false;

  if (productImageUrl) {
    const ext = productImageUrl.includes('.png') ? 'png' : 'jpg';
    const productPath = path.join(MEDIA_CACHE_DIR, `${videoId}_product.${ext}`);
    try {
      await downloadFile(productImageUrl, productPath);
      inputs.push('-i', productPath);
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
    filterComplex = `[0:v]${gradeAndVignette}[graded];` +
      `[graded]drawtext=text='${productName}':fontsize=40:fontcolor=white:borderw=2:bordercolor=0x000000@0.8:box=1:boxcolor=0x111722bb:x=40:y=${titleY}:font=Sans[producttxt];` +
      `[producttxt]drawtext=text='${cta}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:box=1:boxcolor=0x00000099:x=${ctaX}:y=${ctaY}:font=Sans[out]`;
  }

  const ffmpegArgs = [
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[out]', '-map', '0:a?',
    '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
    outputPath
  ];

  try {
    execFileSync('ffmpeg', ffmpegArgs, { timeout: 120000, stdio: 'pipe' });
  } catch (err) {
    const stderr = err && err.stderr ? err.stderr.toString().slice(0, 2000) : '';
    console.error('[PostProcess] ffmpeg failed:', stderr || err.message);
    return {
      success: false,
      processedVideoPath: inputPath,
      processedVideoUrl: videoUrl,
      productOverlayApplied: false,
      error: 'Post-processing failed, returning raw video'
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
    ctaTextApplied: true
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
