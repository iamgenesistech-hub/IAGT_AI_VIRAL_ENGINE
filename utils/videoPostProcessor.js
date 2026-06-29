/**
 * videoPostProcessor.js — EVICS Video Post-Processing Engine
 *
 * After HeyGen renders the base avatar video, this adds:
 *   1. Product mockup overlay (bottom-right corner)
 *   2. CTA text overlay ("Shop Now — iamgenesistech.com")
 *   3. Affiliate link watermark
 *
 * Uses ffmpeg (available in the Docker container).
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
  affiliateCode = '',
  ctaText
}) {
  const inputPath = path.join(MEDIA_CACHE_DIR, `${videoId}_raw.mp4`);
  const outputPath = path.join(PROCESSED_DIR, `${videoId}_final.mp4`);

  // Download the raw video
  await downloadFile(videoUrl, inputPath);

  // Build ffmpeg filter chain
  const filters = [];
  const inputs = ['-i', inputPath];
  let filterComplex = '';

  const cta = ctaText || `Shop Now — iamgenesistech.com${affiliateCode ? '/?ref=' + affiliateCode : ''}`;

  if (productImageUrl) {
    // Download product image
    const ext = productImageUrl.includes('.png') ? 'png' : 'jpg';
    const productPath = path.join(MEDIA_CACHE_DIR, `${videoId}_product.${ext}`);
    try {
      await downloadFile(productImageUrl, productPath);
      inputs.push('-i', productPath);
      // Overlay product image at bottom-right, scaled to 20% of video width
      // Video is 1080x1920 (9:16), so product = ~200px wide
      filterComplex = `[1:v]scale=200:-1[prod];[0:v][prod]overlay=W-w-40:H-h-280[withprod];[withprod]drawtext=text='${escapeFFmpegText(cta)}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-80:font=Sans[out]`;
    } catch {
      // If product download fails, just add CTA text
      filterComplex = `[0:v]drawtext=text='${escapeFFmpegText(cta)}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-80:font=Sans[out]`;
    }
  } else {
    // No product image — just add CTA text overlay
    filterComplex = `[0:v]drawtext=text='${escapeFFmpegText(cta)}':fontsize=32:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-80:font=Sans[out]`;
  }

  // Run ffmpeg
  const cmd = [
    'ffmpeg', '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[out]', '-map', '0:a',
    '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    outputPath
  ].map(s => `"${s}"`).join(' ');

  try {
    execSync(cmd, { timeout: 120000, stdio: 'pipe' });
  } catch (err) {
    console.error('[PostProcess] ffmpeg failed:', err.message);
    // Return raw video if post-processing fails
    return {
      success: false,
      processedVideoPath: inputPath,
      processedVideoUrl: videoUrl,
      error: 'Post-processing failed, returning raw video'
    };
  }

  // Clean up raw input
  try { fs.unlinkSync(inputPath); } catch {}

  return {
    success: true,
    processedVideoPath: outputPath,
    processedVideoUrl: `/processed-videos/${videoId}_final.mp4`
  };
}

function escapeFFmpegText(text) {
  return text.replace(/'/g, "'\\''").replace(/:/g, '\\:').replace(/\\/g, '\\\\');
}

module.exports = { postProcessVideo, downloadFile };
